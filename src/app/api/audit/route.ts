import { NextResponse } from 'next/server';
import dns from 'dns';
import tls from 'tls';
import type { Finding } from '@/lib/tools/types';
import {
  consumeRateLimit,
  errorResponse,
  fetchPublicHttpWithRedirects,
  getHeaderValues,
  jsonError,
  normalizeTargetUrl,
  OUTBOUND_LIMITS,
  parseJsonBody,
  rateLimitResponse,
  readTextResponse,
  resolveAndBlockPrivateIp,
  TIMEOUTS,
} from '@/lib/server/scanner';

const dnsPromises = dns.promises;

type CheckStatus = 'pass' | 'warn' | 'fail' | 'error';
type Severity = Finding['severity'];
type Confidence = Finding['confidence'];

interface AuditCheck {
  name: string;
  status: CheckStatus;
  message: string;
  details: string;
}

interface AuditFinding extends Finding {
  weight: number;
}

interface BaselineInput {
  score?: number;
  findings?: Array<{ id?: string; severity?: string }>;
}

const SCORE_WEIGHTS = {
  https: 10,
  tls: 12,
  hsts: 8,
  csp: 10,
  clickjacking: 6,
  nosniff: 6,
  referrerPolicy: 4,
  permissionsPolicy: 4,
  crossOriginIsolation: 8,
  cors: 8,
  cookies: 8,
  securityTxt: 6,
  robots: 4,
  mixedContent: 6,
} as const;

function scoreToGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function makeFinding(
  id: string,
  title: string,
  severity: Severity,
  confidence: Confidence,
  evidence: string,
  remediation: string,
  source: string,
  references: string[],
  weight: number
): AuditFinding {
  return { id, title, severity, confidence, evidence, remediation, source, references, weight };
}

function certField(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

function cookieFlags(cookie: string) {
  return {
    secure: /;\s*secure\b/i.test(cookie),
    httpOnly: /;\s*httponly\b/i.test(cookie),
    sameSite: /;\s*samesite=(strict|lax|none)\b/i.exec(cookie)?.[1]?.toLowerCase() ?? null,
  };
}

function settledValues(result: PromiseSettledResult<string[]>) {
  return result.status === 'fulfilled' ? result.value : [];
}

async function checkDns(hostname: string) {
  try {
    const [a, aaaa] = await Promise.allSettled([
      dnsPromises.resolve4(hostname),
      dnsPromises.resolve6(hostname),
    ]);
    const addresses = [
      ...settledValues(a),
      ...settledValues(aaaa),
    ];
    return { success: addresses.length > 0, addresses };
  } catch {
    return { success: false, addresses: [] as string[] };
  }
}

async function checkTls(hostname: string, isHttps: boolean) {
  if (!isHttps) return { success: false, error: 'Not using HTTPS' };
  const [address] = await resolveAndBlockPrivateIp(hostname);
  return new Promise<{
    success: boolean;
    error?: string;
    protocol?: string;
    cipher?: { name?: string; version?: string; standardName?: string };
    validTo?: string;
    issuer?: string;
    subject?: string;
    authorized?: boolean;
    authorizationError?: string | null;
    certificateChain?: string[];
  }>((resolve) => {
    const socket = tls.connect(
      {
        host: address,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        const authorized = socket.authorized;
        const authorizationError = socket.authorizationError ? String(socket.authorizationError) : null;
        const chain: string[] = [];
        let current = cert;
        let depth = 0;
        while (current && Object.keys(current).length && depth < 6) {
          chain.push(certField(current.subject?.CN) || certField(current.subject?.O) || `certificate-${depth + 1}`);
          if (!current.issuerCertificate || current.issuerCertificate === current) break;
          current = current.issuerCertificate;
          depth += 1;
        }
        socket.destroy();
        if (!cert || Object.keys(cert).length === 0) {
          resolve({ success: false, error: 'No certificate returned' });
          return;
        }
        resolve({
          success: Boolean(authorized && protocol),
          protocol: protocol || '',
          cipher,
          validTo: cert.valid_to ? new Date(cert.valid_to).toISOString() : '',
          issuer: certField(cert.issuer?.O) || certField(cert.issuer?.CN) || 'Unknown issuer',
          subject: certField(cert.subject?.CN) || certField(cert.subject?.O) || hostname,
          authorized,
          authorizationError,
          certificateChain: chain,
        });
      }
    );
    socket.setTimeout(TIMEOUTS.tlsMs);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'TLS connection timeout' });
    });
    socket.on('error', () => {
      socket.destroy();
      resolve({ success: false, error: 'TLS handshake failed' });
    });
  });
}

async function fetchWebSnapshot(targetUrl: URL) {
  try {
    const { response, redirectChain, finalUrl } = await fetchPublicHttpWithRedirects(
      targetUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'CyberKitSecurityAuditAnalyzer/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      TIMEOUTS.httpMs,
      OUTBOUND_LIMITS.maxRedirects
    );
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const contentType = response.headers.get('content-type');
    const body = contentType && /text\/html|application\/xhtml\+xml/i.test(contentType)
      ? await readTextResponse(response, {
          allowedContentTypes: [/text\/html/i, /application\/xhtml\+xml/i],
          limitBytes: 200 * 1024,
        }).catch(() => '')
      : '';
    return {
      success: true,
      status: response.status,
      headers,
      body,
      finalUrl: finalUrl.toString(),
      redirectChain,
      setCookies: getHeaderValues(response.headers, 'set-cookie'),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HTTP fetch failed',
      status: 0,
      headers: {} as Record<string, string>,
      body: '',
      finalUrl: targetUrl.toString(),
      redirectChain: [] as Array<{ url: string; status: number; location?: string }>,
      setCookies: [] as string[],
    };
  }
}

async function checkSupportFiles(targetUrl: URL) {
  const origin = `${targetUrl.protocol}//${targetUrl.host}`;
  const checks = [
    { key: 'robots', url: new URL('/robots.txt', origin) },
    { key: 'security', url: new URL('/.well-known/security.txt', origin) },
  ] as const;
  const settled = await Promise.allSettled(
    checks.map(async (item) => {
      const { response } = await fetchPublicHttpWithRedirects(
        item.url,
        { headers: { 'User-Agent': 'CyberKitAudit/1.0', Accept: 'text/plain,*/*;q=0.1' } },
        TIMEOUTS.httpMs
      );
      const text = response.ok
        ? await readTextResponse(response, { allowedContentTypes: [/text\/plain/i, /text\//i], limitBytes: 64 * 1024 })
        : '';
      return { key: item.key, status: response.status, text };
    })
  );
  const map = Object.fromEntries(
    settled.map((result, index) => {
      const fallback = { key: checks[index].key, status: 0, text: '' };
      return [
        checks[index].key,
        result.status === 'fulfilled' ? result.value : fallback,
      ];
    })
  ) as Record<'robots' | 'security', { key: string; status: number; text: string }>;
  return map;
}

function compareWithBaseline(score: number, findings: AuditFinding[], baseline?: BaselineInput) {
  if (!baseline) return null;
  const previousIds = new Set((baseline.findings || []).map((item) => item.id).filter((value): value is string => Boolean(value)));
  const currentIds = new Set(findings.map((finding) => finding.id));
  const introduced = findings.filter((finding) => !previousIds.has(finding.id));
  const resolved = (baseline.findings || []).filter((finding) => finding.id && !currentIds.has(finding.id));
  return {
    scoreDelta: score - (baseline.score ?? 0),
    introducedCount: introduced.length,
    resolvedCount: resolved.length,
    regression: introduced.some((finding) => ['critical', 'high'].includes(finding.severity)),
    introduced,
    resolved,
  };
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ url?: unknown; baseline?: unknown }>(request);
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return errorResponse('Invalid URL provided', 400, 'INVALID_URL');
    }

    const targetUrl = normalizeTargetUrl(body.url);
    await resolveAndBlockPrivateIp(targetUrl.hostname);
    const hostname = targetUrl.hostname;
    const isHttps = targetUrl.protocol === 'https:';
    const baseline = body.baseline && typeof body.baseline === 'object' ? body.baseline as BaselineInput : undefined;

    const rate = await consumeRateLimit(request, hostname, {
      endpoint: 'audit',
      ipLimit: 20,
      targetLimit: 4,
      windowMs: 60_000,
      cooldownMs: 10_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const [dnsResult, tlsResult, webResult, fileResults] = await Promise.all([
      checkDns(hostname),
      checkTls(hostname, isHttps),
      fetchWebSnapshot(targetUrl),
      checkSupportFiles(targetUrl),
    ]);

    const findings: AuditFinding[] = [];
    const headers = webResult.headers || {};
    const checks: AuditCheck[] = [];

    if (!dnsResult.success) {
      findings.push(
        makeFinding(
          'dns-resolution-failed',
          'Hostname did not resolve publicly',
          'critical',
          'high',
          `No public A or AAAA record was resolved for ${hostname}.`,
          'Verify the hostname, DNS publication, and availability before re-running the audit.',
          'DNS resolution',
          ['https://www.rfc-editor.org/rfc/rfc1034'],
          0
        )
      );
    }

    if (!isHttps) {
      findings.push(
        makeFinding(
          'https-missing',
          'HTTPS is not enforced',
          'critical',
          'high',
          `The requested URL uses ${targetUrl.protocol}.`,
          'Redirect all browser traffic to HTTPS and preload HSTS once the HTTPS configuration is stable.',
          targetUrl.toString(),
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security'],
          SCORE_WEIGHTS.https
        )
      );
    }

    if (isHttps && !tlsResult.success) {
      findings.push(
        makeFinding(
          'tls-invalid',
          'TLS handshake or certificate validation failed',
          'high',
          'high',
          tlsResult.error || tlsResult.authorizationError || 'TLS session was not authorized.',
          'Serve a valid certificate chain, modern TLS configuration, and strong ciphers.',
          hostname,
          ['https://owasp.org/www-project-web-security-testing-guide/'],
          SCORE_WEIGHTS.tls
        )
      );
    }

    if (tlsResult.success && tlsResult.protocol && !/^TLSv1\.[23]$/.test(tlsResult.protocol)) {
      findings.push(
        makeFinding(
          'tls-legacy-protocol',
          'Legacy TLS protocol detected',
          'medium',
          'medium',
          `Negotiated protocol: ${tlsResult.protocol}.`,
          'Disable legacy TLS versions and prefer TLS 1.3 or TLS 1.2 with modern cipher suites.',
          hostname,
          ['https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html'],
          Math.round(SCORE_WEIGHTS.tls / 2)
        )
      );
    }

    if (!headers['content-security-policy']) {
      findings.push(
        makeFinding(
          'csp-missing',
          'Content-Security-Policy header is missing',
          'high',
          'high',
          'No Content-Security-Policy header was returned in the main response.',
          'Deploy a restrictive CSP that removes inline script execution and narrows allowed origins.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/CSP'],
          SCORE_WEIGHTS.csp
        )
      );
    }

    if (!headers['strict-transport-security']) {
      findings.push(
        makeFinding(
          'hsts-missing',
          'Strict-Transport-Security header is missing',
          'medium',
          'high',
          'No HSTS header was returned on the HTTPS response.',
          'Send Strict-Transport-Security with an appropriate max-age and includeSubDomains when safe.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security'],
          SCORE_WEIGHTS.hsts
        )
      );
    }

    if (!headers['x-frame-options'] && !/frame-ancestors/i.test(headers['content-security-policy'] || '')) {
      findings.push(
        makeFinding(
          'clickjacking-protection-missing',
          'Clickjacking protection is missing',
          'medium',
          'high',
          'Neither X-Frame-Options nor CSP frame-ancestors was present.',
          'Set X-Frame-Options or frame-ancestors in CSP to restrict framing.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Frame-Options'],
          SCORE_WEIGHTS.clickjacking
        )
      );
    }

    if (!headers['x-content-type-options']) {
      findings.push(
        makeFinding(
          'nosniff-missing',
          'X-Content-Type-Options header is missing',
          'medium',
          'high',
          'The response did not include X-Content-Type-Options: nosniff.',
          'Send X-Content-Type-Options: nosniff for script, style, and document responses.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Content-Type-Options'],
          SCORE_WEIGHTS.nosniff
        )
      );
    }

    if (!headers['permissions-policy']) {
      findings.push(
        makeFinding(
          'permissions-policy-missing',
          'Permissions-Policy header is missing',
          'low',
          'medium',
          'The response did not define any browser feature policy restrictions.',
          'Define Permissions-Policy to disable unneeded browser features such as camera, microphone, and geolocation.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy'],
          SCORE_WEIGHTS.permissionsPolicy
        )
      );
    }

    const coop = headers['cross-origin-opener-policy'];
    const coep = headers['cross-origin-embedder-policy'];
    const corp = headers['cross-origin-resource-policy'];
    if (!coop || !coep || !corp) {
      findings.push(
        makeFinding(
          'cross-origin-isolation-incomplete',
          'Cross-origin isolation headers are incomplete',
          'low',
          'medium',
          `COOP=${coop || 'missing'}, COEP=${coep || 'missing'}, CORP=${corp || 'missing'}.`,
          'Set COOP, COEP, and CORP deliberately if the site depends on cross-origin isolation or wants stricter embedding/resource controls.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy'],
          SCORE_WEIGHTS.crossOriginIsolation
        )
      );
    }

    const corsOrigin = headers['access-control-allow-origin'];
    const corsCreds = headers['access-control-allow-credentials'];
    if (corsOrigin === '*' && corsCreds === 'true') {
      findings.push(
        makeFinding(
          'cors-wildcard-credentials',
          'CORS allows wildcard origins with credentials',
          'critical',
          'high',
          `Access-Control-Allow-Origin=${corsOrigin}; Access-Control-Allow-Credentials=${corsCreds}.`,
          'Do not combine credentialed responses with wildcard origins. Restrict origins explicitly.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/CORS'],
          SCORE_WEIGHTS.cors
        )
      );
    }

    const insecureCookies = (webResult.setCookies || []).filter((cookie) => {
      const flags = cookieFlags(cookie);
      return !flags.secure || !flags.httpOnly || !flags.sameSite;
    });
    if (insecureCookies.length > 0) {
      findings.push(
        makeFinding(
          'cookie-flags-missing',
          'One or more cookies are missing Secure, HttpOnly, or SameSite',
          'medium',
          'high',
          insecureCookies.slice(0, 3).join(' | '),
          'Mark session cookies as Secure and HttpOnly, and set an intentional SameSite value.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie'],
          SCORE_WEIGHTS.cookies
        )
      );
    }

    const securityText = fileResults.security;
    if (securityText.status === 200) {
      if (!/^Contact:/mi.test(securityText.text) || !/^Expires:/mi.test(securityText.text)) {
        findings.push(
          makeFinding(
            'securitytxt-invalid',
            'security.txt is present but incomplete',
            'low',
            'medium',
            'security.txt did not include both Contact and Expires directives.',
            'Publish a valid RFC 9116 security.txt with at least Contact and Expires directives.',
            `${targetUrl.origin}/.well-known/security.txt`,
            ['https://www.rfc-editor.org/rfc/rfc9116'],
            SCORE_WEIGHTS.securityTxt
          )
        );
      }
    } else {
      findings.push(
        makeFinding(
          'securitytxt-missing',
          'security.txt is missing',
          'low',
          'medium',
          'No security.txt file was returned from /.well-known/security.txt.',
          'Publish a security.txt file for vulnerability disclosure contacts and expectations.',
          `${targetUrl.origin}/.well-known/security.txt`,
          ['https://www.rfc-editor.org/rfc/rfc9116'],
          SCORE_WEIGHTS.securityTxt
        )
      );
    }

    const robotsText = fileResults.robots;
    if (robotsText.status === 200) {
      if (/disallow:\s*\/(?:admin|backup|private|internal)/i.test(robotsText.text)) {
        findings.push(
          makeFinding(
            'robots-sensitive-paths',
            'robots.txt exposes sensitive path hints',
            'low',
            'medium',
            'robots.txt disallows paths that look administrative or private.',
            'Do not rely on robots.txt to hide sensitive paths. Protect or remove unnecessary disclosures.',
            `${targetUrl.origin}/robots.txt`,
            ['https://www.rfc-editor.org/rfc/rfc9309'],
            SCORE_WEIGHTS.robots
          )
        );
      }
    }

    if (isHttps && webResult.body && /\b(?:src|href)=["']http:\/\//i.test(webResult.body)) {
      findings.push(
        makeFinding(
          'mixed-content-signal',
          'Mixed-content references were detected in the HTML response',
          'medium',
          'medium',
          'The fetched HTML contained at least one explicit http:// asset or link reference.',
          'Remove insecure asset references or upgrade them to HTTPS to avoid mixed-content exposure.',
          webResult.finalUrl,
          ['https://developer.mozilla.org/docs/Web/Security/Mixed_content'],
          SCORE_WEIGHTS.mixedContent
        )
      );
    }

    const maxScore = Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);
    const deducted = findings.reduce((sum, finding) => sum + finding.weight, 0);
    const score = Math.max(0, Math.round((Math.max(0, maxScore - deducted) / maxScore) * 100));
    const grade = scoreToGrade(score);

    checks.push({
      name: 'URL Validation',
      status: dnsResult.success ? 'pass' : 'fail',
      message: dnsResult.success ? `Resolved publicly: ${dnsResult.addresses.slice(0, 2).join(', ')}` : 'Public DNS resolution failed',
      details: `Hostname: ${hostname}`,
    });
    checks.push({
      name: 'HTTPS Check',
      status: isHttps ? 'pass' : 'fail',
      message: isHttps ? 'HTTPS is used.' : 'HTTPS is not used.',
      details: targetUrl.toString(),
    });
    checks.push({
      name: 'SSL/TLS Certificate',
      status: tlsResult.success ? 'pass' : 'fail',
      message: tlsResult.success ? `${tlsResult.protocol} / ${tlsResult.cipher?.standardName || tlsResult.cipher?.name || 'cipher unavailable'}` : (tlsResult.error || tlsResult.authorizationError || 'TLS validation failed'),
      details: tlsResult.certificateChain?.join(' -> ') || 'No validated certificate chain',
    });
    checks.push({
      name: 'Content Security Policy (CSP)',
      status: headers['content-security-policy'] ? 'pass' : 'warn',
      message: headers['content-security-policy'] ? 'CSP header detected.' : 'CSP header is missing.',
      details: headers['content-security-policy'] || 'No Content-Security-Policy header',
    });
    checks.push({
      name: 'HSTS Check',
      status: headers['strict-transport-security'] ? 'pass' : 'warn',
      message: headers['strict-transport-security'] ? 'HSTS header detected.' : 'HSTS header is missing.',
      details: headers['strict-transport-security'] || 'No Strict-Transport-Security header',
    });
    checks.push({
      name: 'X-Frame-Options',
      status: headers['x-frame-options'] || /frame-ancestors/i.test(headers['content-security-policy'] || '') ? 'pass' : 'fail',
      message: headers['x-frame-options'] ? `Header active: ${headers['x-frame-options']}` : 'Header missing',
      details: 'frame-ancestors in CSP also satisfies this control.',
    });
    checks.push({
      name: 'X-Content-Type-Options',
      status: headers['x-content-type-options'] ? 'pass' : 'warn',
      message: headers['x-content-type-options'] ? 'nosniff is active.' : 'Header missing',
      details: headers['x-content-type-options'] || 'No X-Content-Type-Options header',
    });
    checks.push({
      name: 'Referrer Policy',
      status: headers['referrer-policy'] ? 'pass' : 'warn',
      message: headers['referrer-policy'] ? `Policy: ${headers['referrer-policy']}` : 'Header missing',
      details: headers['referrer-policy'] || 'No Referrer-Policy header',
    });
    checks.push({
      name: 'CORS Policy Check',
      status: corsOrigin === '*' && corsCreds === 'true' ? 'fail' : corsOrigin ? 'warn' : 'pass',
      message: corsOrigin ? `Access-Control-Allow-Origin: ${corsOrigin}` : 'No permissive CORS header detected.',
      details: corsCreds ? `Credentials: ${corsCreds}` : 'Credentials header absent',
    });
    checks.push({
      name: 'Cookie Security Check',
      status: insecureCookies.length ? 'warn' : 'pass',
      message: insecureCookies.length ? `${insecureCookies.length} cookie(s) missing one or more flags.` : 'Observed cookies use Secure, HttpOnly, and SameSite or no cookies were set.',
      details: insecureCookies[0] || 'No insecure cookie observed in this request.',
    });
    checks.push({
      name: 'robots.txt presence',
      status: robotsText.status === 200 || securityText.status === 200 ? 'pass' : 'warn',
      message: `robots.txt: ${robotsText.status === 200 ? 'present' : 'missing'} | security.txt: ${securityText.status === 200 ? 'present' : 'missing'}`,
      details: 'Presence alone is not sufficient; contents were validated separately.',
    });

    const comparison = compareWithBaseline(score, findings, baseline);

    return NextResponse.json({
      success: true,
      hostname,
      url: targetUrl.toString(),
      finalUrl: webResult.finalUrl,
      score,
      grade,
      checks,
      findings,
      scoring: {
        model: 'weighted-subtractive-v1',
        maxScore,
        documentedWeights: SCORE_WEIGHTS,
      },
      comparison,
      redirectChain: webResult.redirectChain,
      tls: {
        protocol: tlsResult.protocol || '',
        cipher: tlsResult.cipher || null,
        certificateChain: tlsResult.certificateChain || [],
        issuer: tlsResult.issuer || '',
        subject: tlsResult.subject || '',
        validTo: tlsResult.validTo || '',
      },
      cookies: (webResult.setCookies || []).map((cookie) => ({ raw: cookie, ...cookieFlags(cookie) })),
      headers,
      supportFiles: {
        robots: { status: robotsText.status, found: robotsText.status === 200 },
        securityTxt: { status: securityText.status, found: securityText.status === 200 },
      },
      partial: !webResult.success || !dnsResult.success,
    });
  } catch (error) {
    return jsonError(error);
  }
}
