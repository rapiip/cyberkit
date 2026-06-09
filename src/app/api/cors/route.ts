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

interface CorsProbeResult {
  originTested: string;
  status?: number;
  allowOrigin?: string | null;
  allowCredentials?: boolean;
  allowMethods?: string | null;
  allowHeaders?: string | null;
  exposeHeaders?: string | null;
  note?: string;
  error?: string;
}

async function checkOrigin(targetUrl: URL, origin: string): Promise<CorsProbeResult> {
  try {
    const response = await fetchPublicHttp(
      targetUrl,
      {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type',
          'User-Agent': 'CyberKitCORSAnalyzer/1.0',
        },
      },
      TIMEOUTS.httpMs
    );

    return {
      originTested: origin,
      status: response.status,
      allowOrigin: response.headers.get('access-control-allow-origin'),
      allowCredentials: response.headers.get('access-control-allow-credentials') === 'true',
      allowMethods: response.headers.get('access-control-allow-methods'),
      allowHeaders: response.headers.get('access-control-allow-headers'),
      exposeHeaders: response.headers.get('access-control-expose-headers'),
    };
  } catch {
    try {
      const response = await fetchPublicHttp(
        targetUrl,
        {
          method: 'GET',
          headers: {
            Origin: origin,
            'User-Agent': 'CyberKitCORSAnalyzer/1.0',
          },
        },
        TIMEOUTS.httpMs
      );

      return {
        originTested: origin,
        status: response.status,
        allowOrigin: response.headers.get('access-control-allow-origin'),
        allowCredentials: response.headers.get('access-control-allow-credentials') === 'true',
        allowMethods: null,
        allowHeaders: null,
        exposeHeaders: null,
        note: 'OPTIONS preflight failed, fell back to GET request',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Host connection failed';
      return { originTested: origin, error: message };
    }
  }
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
      endpoint: 'cors',
      ipLimit: 30,
      targetLimit: 10,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const [maliciousOriginResult, wildcardResult] = await Promise.all([
      checkOrigin(targetUrl, 'https://evil.example.com'),
      checkOrigin(targetUrl, '*'),
    ]);

    const findings: string[] = [];
    let vulnerabilityLevel: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';

    if (maliciousOriginResult.allowOrigin) {
      if (
        maliciousOriginResult.allowOrigin === 'https://evil.example.com' ||
        maliciousOriginResult.allowOrigin === '*'
      ) {
        findings.push(`Vulnerability: CORS policy reflects origin or allows arbitrary origins: ${maliciousOriginResult.allowOrigin}`);
        vulnerabilityLevel = 'high';

        if (maliciousOriginResult.allowCredentials) {
          findings.push('CRITICAL VULNERABILITY: arbitrary CORS origin is allowed with credentials enabled.');
          vulnerabilityLevel = 'critical';
        }
      }
    }

    if (wildcardResult.allowOrigin === '*') {
      findings.push('CORS policy sets Access-Control-Allow-Origin to wildcard (*).');
      if (vulnerabilityLevel !== 'critical' && vulnerabilityLevel !== 'high') vulnerabilityLevel = 'medium';
    }

    if (findings.length === 0) {
      findings.push('CORS policy is secure. Requests from untrusted origins are blocked or restricted.');
    }

    return NextResponse.json({
      success: true,
      url: targetUrl.toString(),
      maliciousOriginTest: maliciousOriginResult,
      wildcardTest: wildcardResult,
      findings,
      vulnerabilityLevel,
    });
  } catch (error) {
    return jsonError(error);
  }
}
