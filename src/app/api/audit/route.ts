import { NextResponse } from 'next/server';
import dns from 'dns';
import tls from 'tls';
import {
  consumeRateLimit,
  errorResponse,
  fetchPublicHttp,
  jsonError,
  normalizeTargetUrl,
  parseJsonBody,
  rateLimitResponse,
  resolveAndBlockPrivateIp,
  TIMEOUTS,
} from '@/lib/server/scanner';

const dnsPromises = dns.promises;

type CheckStatus = 'pass' | 'warn' | 'fail' | 'error';

interface AuditCheck {
  name: string;
  status: CheckStatus;
  message: string;
  details: string;
}

interface DnsAuditResult {
  success: boolean;
  ip?: string;
  recordsCount?: number;
  error?: string;
}

interface SslAuditResult {
  success: boolean;
  issuer?: string;
  validTo?: string;
  isExpired?: boolean;
  error?: string;
}

interface WebAuditResult {
  success: boolean;
  status?: number;
  headers?: Record<string, string>;
  error?: string;
}

interface FilesAuditResult {
  robotsFound: boolean;
  securityFound: boolean;
}

function certField(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

async function checkDNS(hostname: string): Promise<DnsAuditResult> {
  try {
    const addresses = await dnsPromises.resolve4(hostname);
    return {
      success: true,
      ip: addresses[0] || 'N/A',
      recordsCount: addresses.length,
    };
  } catch {
    return { success: false, error: 'DNS resolution failed' };
  }
}

function checkSSL(hostname: string, isHttps: boolean): Promise<SslAuditResult> {
  if (!isHttps) return Promise.resolve({ success: false, error: 'Not using HTTPS' });

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.destroy();

        if (!cert || Object.keys(cert).length === 0) {
          resolve({ success: false, error: 'No certificate returned' });
          return;
        }

        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const isExpired = validTo ? validTo.getTime() < Date.now() : true;
        resolve({
          success: !isExpired,
          issuer: certField(cert.issuer?.O) || certField(cert.issuer?.CN) || 'Unknown',
          validTo: validTo?.toISOString(),
          isExpired,
        });
      }
    );

    socket.setTimeout(TIMEOUTS.tlsMs);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'SSL connection timeout' });
    });
    socket.on('error', () => {
      socket.destroy();
      resolve({ success: false, error: 'SSL handshake error' });
    });
  });
}

async function checkWebHeaders(targetUrl: URL): Promise<WebAuditResult> {
  try {
    const response = await fetchPublicHttp(
      targetUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'CyberKitSecurityAuditAnalyzer/1.0',
        },
      },
      TIMEOUTS.httpMs
    );

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return { success: true, status: response.status, headers };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    return { success: false, error: message };
  }
}

async function checkFiles(targetUrl: URL): Promise<FilesAuditResult> {
  const base = `${targetUrl.protocol}//${targetUrl.host}`;
  const [robotsRes, securityRes] = await Promise.allSettled([
    fetchPublicHttp(new URL('/robots.txt', base), { headers: { 'User-Agent': 'CyberKitAudit/1.0' } }, TIMEOUTS.httpMs),
    fetchPublicHttp(new URL('/.well-known/security.txt', base), { headers: { 'User-Agent': 'CyberKitAudit/1.0' } }, TIMEOUTS.httpMs),
  ]);

  return {
    robotsFound: robotsRes.status === 'fulfilled' && robotsRes.value.status === 200,
    securityFound: securityRes.status === 'fulfilled' && securityRes.value.status === 200,
  };
}

function resultOrFallback<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function scoreToGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ url?: unknown }>(request);
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return errorResponse('Invalid URL provided', 400, 'INVALID_URL');
    }

    const targetUrl = normalizeTargetUrl(body.url);
    await resolveAndBlockPrivateIp(targetUrl.hostname);
    const hostname = targetUrl.hostname;
    const isHttps = targetUrl.protocol === 'https:';

    const rate = consumeRateLimit(request, hostname, {
      endpoint: 'audit',
      ipLimit: 20,
      targetLimit: 4,
      windowMs: 60_000,
      cooldownMs: 10_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const [dnsSettled, sslSettled, webSettled, filesSettled] = await Promise.allSettled([
      checkDNS(hostname),
      checkSSL(hostname, isHttps),
      checkWebHeaders(targetUrl),
      checkFiles(targetUrl),
    ]);

    const dnsResult = resultOrFallback<DnsAuditResult>(dnsSettled, { success: false, error: 'DNS checker failed' });
    const sslResult = resultOrFallback<SslAuditResult>(sslSettled, { success: false, error: 'SSL checker failed' });
    const webResult = resultOrFallback<WebAuditResult>(webSettled, { success: false, error: 'Header checker failed' });
    const filesResult = resultOrFallback<FilesAuditResult>(filesSettled, { robotsFound: false, securityFound: false });

    const checks: AuditCheck[] = [];
    let score = 0;

    if (dnsResult.success) {
      checks.push({
        name: 'URL Validation',
        status: 'pass',
        message: `Valid hostname resolved to IP: ${dnsResult.ip}`,
        details: `Domain: ${hostname}`,
      });
      score += 10;
    } else {
      checks.push({
        name: 'URL Validation',
        status: 'fail',
        message: 'Could not resolve domain name via DNS',
        details: 'Verify if the domain name is active and spelled correctly.',
      });
    }

    if (isHttps) {
      checks.push({
        name: 'HTTPS Check',
        status: 'pass',
        message: 'HTTPS is enforced.',
        details: 'Traffic is encrypted in transit.',
      });
      score += 10;
    } else {
      checks.push({
        name: 'HTTPS Check',
        status: 'fail',
        message: 'Not using HTTPS.',
        details: 'Critical: site transmits data over unencrypted HTTP protocol.',
      });
    }

    if (isHttps && sslResult.success) {
      checks.push({
        name: 'SSL/TLS Certificate',
        status: 'pass',
        message: `Valid certificate issued by: ${sslResult.issuer}`,
        details: sslResult.validTo ? `Expires: ${new Date(sslResult.validTo).toLocaleDateString()}` : 'Expiration unavailable',
      });
      score += 10;
    } else {
      checks.push({
        name: 'SSL/TLS Certificate',
        status: 'fail',
        message: `SSL Certificate Issue: ${sslResult.error || 'Expired or invalid certificate'}`,
        details: 'Browsers may display security warnings to users.',
      });
    }

    const hdrs = webResult.headers || {};
    if (webResult.success) {
      if (hdrs['content-security-policy']) {
        checks.push({ name: 'Content Security Policy (CSP)', status: 'pass', message: 'CSP header detected.', details: hdrs['content-security-policy'].slice(0, 100) });
        score += 15;
      } else {
        checks.push({ name: 'Content Security Policy (CSP)', status: 'warn', message: 'CSP header is missing.', details: 'Helps prevent Cross-Site Scripting attacks.' });
      }

      if (hdrs['strict-transport-security']) {
        checks.push({ name: 'HSTS Check', status: 'pass', message: 'HSTS header is present.', details: hdrs['strict-transport-security'] });
        score += 10;
      } else {
        checks.push({ name: 'HSTS Check', status: 'warn', message: 'Strict-Transport-Security is missing.', details: 'HSTS guarantees that connections are made only over HTTPS.' });
      }

      if (hdrs['x-frame-options']) {
        checks.push({ name: 'X-Frame-Options', status: 'pass', message: `Header active: ${hdrs['x-frame-options']}`, details: 'Protects against clickjacking.' });
        score += 10;
      } else {
        checks.push({ name: 'X-Frame-Options', status: 'fail', message: 'X-Frame-Options is missing.', details: 'The page can be embedded in iframe overlays.' });
      }

      if (hdrs['x-content-type-options']) {
        checks.push({ name: 'X-Content-Type-Options', status: 'pass', message: 'Header active: nosniff', details: 'Prevents MIME-type sniffing.' });
        score += 10;
      } else {
        checks.push({ name: 'X-Content-Type-Options', status: 'warn', message: 'X-Content-Type-Options is missing.', details: 'Allows browsers to interpret files differently from declared type.' });
      }

      if (hdrs['referrer-policy']) {
        checks.push({ name: 'Referrer Policy', status: 'pass', message: `Referrer policy set to: ${hdrs['referrer-policy']}`, details: 'Restricts leakage of referrer URLs.' });
        score += 10;
      } else {
        checks.push({ name: 'Referrer Policy', status: 'warn', message: 'Referrer-Policy is missing.', details: 'May leak sensitive path parameters in referrals.' });
      }

      const corsOrigin = hdrs['access-control-allow-origin'];
      const corsCreds = hdrs['access-control-allow-credentials'];
      if (corsOrigin === '*' && corsCreds === 'true') {
        checks.push({ name: 'CORS Policy Check', status: 'fail', message: 'Highly permissive CORS configuration detected.', details: 'Wildcard origin with credentials enabled is unsafe.' });
      } else if (corsOrigin === '*') {
        checks.push({ name: 'CORS Policy Check', status: 'warn', message: 'CORS allowed from all origins (*).', details: 'Safe if public, but risky for authenticated endpoints.' });
        score += 5;
      } else if (corsOrigin) {
        checks.push({ name: 'CORS Policy Check', status: 'pass', message: `CORS restricted to: ${corsOrigin}`, details: 'Safe origin isolation.' });
        score += 10;
      } else {
        checks.push({ name: 'CORS Policy Check', status: 'pass', message: 'No permissive CORS headers detected.', details: 'Default secure browser cross-origin blocking applies.' });
        score += 10;
      }

      const setCookie = hdrs['set-cookie'];
      if (setCookie && (!/httponly/i.test(setCookie) || !/secure/i.test(setCookie))) {
        checks.push({ name: 'Cookie Security Check', status: 'warn', message: 'Cookies issued lack HttpOnly or Secure attributes.', details: 'XSS can read cookies without HttpOnly; network attackers can steal cookies without Secure.' });
      } else {
        checks.push({ name: 'Cookie Security Check', status: 'pass', message: setCookie ? 'Session cookies use Secure and HttpOnly attributes.' : 'No session cookies set during audit request.', details: 'Cookie exposure risk is low for this request.' });
        score += 5;
      }
    } else {
      ['Content Security Policy (CSP)', 'HSTS Check', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer Policy', 'CORS Policy Check', 'Cookie Security Check'].forEach((name) => {
        checks.push({
          name,
          status: 'error',
          message: `Headers scan failed: ${webResult.error || 'Server unreachable'}`,
          details: 'Audit checker could not connect to resolve HTTP headers.',
        });
      });
    }

    if (filesResult.robotsFound || filesResult.securityFound) {
      score += 5;
      checks.push({
        name: 'robots.txt presence',
        status: 'pass',
        message: `robots.txt detected: ${filesResult.robotsFound ? 'Yes' : 'No'} | security.txt: ${filesResult.securityFound ? 'Yes' : 'No'}`,
        details: 'Assists indexing bots and security researchers.',
      });
    } else {
      checks.push({
        name: 'robots.txt presence',
        status: 'warn',
        message: 'Neither robots.txt nor security.txt was found.',
        details: 'Recommended for standard search index and security reporting.',
      });
    }

    const finalScore = Math.min(100, score);
    return NextResponse.json({
      success: true,
      hostname,
      url: targetUrl.toString(),
      score: finalScore,
      grade: scoreToGrade(finalScore),
      checks,
    });
  } catch (error) {
    return jsonError(error);
  }
}
