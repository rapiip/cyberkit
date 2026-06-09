import { NextResponse } from 'next/server';
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

type HeaderSeverity = 'critical' | 'high' | 'medium' | 'low';

const securityHeaders: {
  name: string;
  key: string;
  description: string;
  severity: HeaderSeverity;
}[] = [
  {
    name: 'Content-Security-Policy',
    key: 'content-security-policy',
    description: 'Helps prevent XSS and data injection attacks by restricting resources that can be loaded.',
    severity: 'critical',
  },
  {
    name: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    description: 'Enforces secure HTTPS connections and helps prevent SSL stripping attacks.',
    severity: 'high',
  },
  {
    name: 'X-Frame-Options',
    key: 'x-frame-options',
    description: 'Protects against clickjacking by controlling whether the site can be embedded in iframes.',
    severity: 'high',
  },
  {
    name: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    description: 'Prevents browsers from MIME-sniffing a response away from the declared content type.',
    severity: 'medium',
  },
  {
    name: 'Referrer-Policy',
    key: 'referrer-policy',
    description: 'Controls how much referrer information is passed along with requests.',
    severity: 'low',
  },
  {
    name: 'Permissions-Policy',
    key: 'permissions-policy',
    description: 'Restricts use of browser features such as camera, microphone, and geolocation.',
    severity: 'low',
  },
];

function recommendationFor(key: string, name: string) {
  if (key === 'content-security-policy') return "Add a restrictive Content Security Policy, e.g. default-src 'self'.";
  if (key === 'strict-transport-security') return 'Enable HSTS by setting: max-age=31536000; includeSubDomains.';
  if (key === 'x-frame-options') return 'Set X-Frame-Options to DENY or SAMEORIGIN.';
  if (key === 'x-content-type-options') return 'Set X-Content-Type-Options to nosniff.';
  if (key === 'referrer-policy') return 'Set Referrer-Policy to strict-origin-when-cross-origin.';
  return `Enable the ${name} header to strengthen security.`;
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ url?: unknown }>(request);
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return errorResponse('Invalid URL provided', 400, 'INVALID_URL');
    }

    const targetUrl = normalizeTargetUrl(body.url);
    await resolveAndBlockPrivateIp(targetUrl.hostname);

    const rate = consumeRateLimit(request, targetUrl.hostname, {
      endpoint: 'headers',
      ipLimit: 40,
      targetLimit: 12,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const response = await fetchPublicHttp(
      targetUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'CyberKitSecurityAnalyzer/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      TIMEOUTS.httpMs
    );

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const analysis = securityHeaders.map((header) => {
      const value = headers[header.key] || null;
      const isPresent = Boolean(value);
      return {
        name: header.name,
        key: header.key,
        isPresent,
        value,
        description: header.description,
        severity: header.severity,
        recommendation: isPresent ? '' : recommendationFor(header.key, header.name),
      };
    });

    const passedCount = analysis.filter((item) => item.isPresent).length;
    const totalCount = analysis.length;

    return NextResponse.json({
      success: true,
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers,
      securityHeadersAnalysis: analysis,
      summary: {
        score: Math.round((passedCount / totalCount) * 100),
        passedCount,
        failedCount: totalCount - passedCount,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
