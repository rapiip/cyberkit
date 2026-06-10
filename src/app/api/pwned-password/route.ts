import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  errorResponse,
  fetchWithTimeout,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hashPrefix?: unknown }>(request);
    const bodyKeys = Object.keys(body);
    const hashPrefix = typeof body.hashPrefix === 'string' ? body.hashPrefix.trim().toUpperCase() : '';

    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'hashPrefix' || !/^[A-F0-9]{5}$/.test(hashPrefix)) {
      return errorResponse(
        'Request must contain only a five-character SHA-1 prefix.',
        400,
        'INVALID_HASH_PREFIX'
      );
    }

    const rate = await consumeRateLimit(request, 'pwned-password', {
      endpoint: 'pwned-password',
      ipLimit: 30,
      targetLimit: 30,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const response = await fetchWithTimeout(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        headers: {
          'Add-Padding': 'true',
          'User-Agent': 'CyberKit/1.0',
        },
      },
      TIMEOUTS.dnsRdapMs
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'PWNED_PASSWORDS_LOOKUP_FAILED',
          message: `Pwned Passwords API returned HTTP ${response.status}`,
          details: `HTTP ${response.status}`,
          retryable: response.status >= 500 || response.status === 429,
          error: `Pwned Passwords API returned HTTP ${response.status}`,
        },
        { status: 502 }
      );
    }

    const range = (await response.text())
      .split('\n')
      .map((row) => row.trim())
      .map((row) => row.match(/^([A-F0-9]{35}):(\d+)$/i))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => ({
        suffix: match[1].toUpperCase(),
        count: Number(match[2]),
      }));

    return NextResponse.json(
      {
        success: true,
        provider: 'Have I Been Pwned Pwned Passwords',
        hashPrefix,
        range,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}
