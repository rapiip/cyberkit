import { createHash } from 'crypto';
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

function sha1Hex(value: string) {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ password?: unknown }>(request);
    const password = body.password;

    if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
      return errorResponse('Invalid password provided. Use 1-1024 characters.', 400, 'INVALID_PASSWORD');
    }

    const rate = consumeRateLimit(request, 'pwned-password', {
      endpoint: 'pwned-password',
      ipLimit: 30,
      targetLimit: 30,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const hash = sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetchWithTimeout(
      `https://api.pwnedpasswords.com/range/${prefix}`,
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
      .find((row) => row.startsWith(`${suffix}:`));
    const breachCount = line ? Number(line.split(':')[1]) || 0 : 0;

    return NextResponse.json({
      success: true,
      provider: 'Have I Been Pwned Pwned Passwords',
      pwned: breachCount > 0,
      breachCount,
      hashPrefix: prefix,
    });
  } catch (error) {
    return jsonError(error);
  }
}
