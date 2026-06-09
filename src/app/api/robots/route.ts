import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  fetchPublicHttp,
  jsonError,
  normalizeTargetUrl,
  parseJsonBody,
  rateLimitResponse,
  resolveAndBlockPrivateIp,
  TIMEOUTS,
} from '@/lib/server/scanner';

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ url?: unknown }>(request);
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return NextResponse.json({ success: false, error: 'Invalid URL provided' }, { status: 400 });
    }

    const targetUrl = normalizeTargetUrl(body.url);
    await resolveAndBlockPrivateIp(targetUrl.hostname);

    const rate = consumeRateLimit(request, targetUrl.hostname, {
      endpoint: 'robots',
      ipLimit: 40,
      targetLimit: 12,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const robotsUrl = new URL('/robots.txt', `${targetUrl.protocol}//${targetUrl.host}`);
    const response = await fetchPublicHttp(
      robotsUrl,
      {
        headers: {
          'User-Agent': 'CyberKitRobotsTxtViewer/1.0',
        },
      },
      TIMEOUTS.httpMs
    );

    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        found: false,
        content: 'No robots.txt found (HTTP 404 Not Found)',
        status: response.status,
      });
    }

    const content = await response.text();
    return NextResponse.json({
      success: true,
      found: response.ok,
      content: content.slice(0, 100000),
      status: response.status,
    });
  } catch (error) {
    return jsonError(error);
  }
}
