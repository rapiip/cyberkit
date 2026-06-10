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
    const body = await parseJsonBody<{ hashPrefix?: unknown; hashSuffix?: unknown }>(request);
    const hashPrefix = typeof body.hashPrefix === 'string' ? body.hashPrefix.trim().toUpperCase() : '';
    const hashSuffix = typeof body.hashSuffix === 'string' ? body.hashSuffix.trim().toUpperCase() : '';

    if (!/^[A-F0-9]{5}$/.test(hashPrefix) || !/^[A-F0-9]{35}$/.test(hashSuffix)) {
      return errorResponse('Invalid SHA-1 hash range provided.', 400, 'INVALID_HASH_RANGE');
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

    const text = await response.text();
    const line = text
      .split('\n')
      .map((row) => row.trim())
      .find((row) => row.startsWith(`${hashSuffix}:`));
    const breachCount = line ? Number(line.split(':')[1]) || 0 : 0;

    return NextResponse.json({
      success: true,
      provider: 'Have I Been Pwned Pwned Passwords',
      pwned: breachCount > 0,
      breachCount,
      hashPrefix,
    });
  } catch (error) {
    return jsonError(error);
  }
}
