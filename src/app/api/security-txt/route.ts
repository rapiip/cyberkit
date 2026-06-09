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
      endpoint: 'security-txt',
      ipLimit: 40,
      targetLimit: 12,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const base = `${targetUrl.protocol}//${targetUrl.host}`;
    const paths = [
      new URL('/.well-known/security.txt', base),
      new URL('/security.txt', base),
    ];

    let foundContent = '';
    let foundPath = '';

    for (const path of paths) {
      try {
        const response = await fetchPublicHttp(
          path,
          {
            headers: {
              'User-Agent': 'CyberKitSecurityTxtChecker/1.0',
            },
          },
          TIMEOUTS.httpMs
        );
        if (response.status === 200) {
          const text = await response.text();
          if (text.toLowerCase().includes('contact:')) {
            foundContent = text;
            foundPath = path.toString();
            break;
          }
        }
      } catch {
        // Try the next standards-compliant path.
      }
    }

    if (!foundContent) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No security.txt file discovered at standard paths',
      });
    }

    const directives: Record<string, string[]> = {};
    foundContent.split('\n').forEach((line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
      if (!match) return;
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      directives[key] = [...(directives[key] || []), value];
    });

    return NextResponse.json({
      success: true,
      found: true,
      path: foundPath,
      content: foundContent.slice(0, 50000),
      directives,
    });
  } catch (error) {
    return jsonError(error);
  }
}
