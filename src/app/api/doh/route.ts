import { NextResponse } from 'next/server';
import {
  assertPublicHostname,
  cachedJson,
  consumeRateLimit,
  errorResponse,
  envHeader,
  fetchWithTimeout,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'CAA'] as const;
type DnsType = (typeof DNS_TYPES)[number];

interface GoogleDohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface GoogleDohResponse {
  Status: number;
  TC: boolean;
  RA: boolean;
  AD: boolean;
  Answer?: GoogleDohAnswer[];
  Comment?: string;
}

const isDnsType = (value: unknown): value is DnsType =>
  typeof value === 'string' && DNS_TYPES.includes(value.toUpperCase() as DnsType);

async function queryGoogleDoh(hostname: string, type: DnsType) {
  return cachedJson(`doh:google:${hostname}:${type}`, 5 * 60_000, async () => {
    const url = new URL('https://dns.google/resolve');
    url.searchParams.set('name', hostname);
    url.searchParams.set('type', type);
    url.searchParams.set('do', '1');

    const response = await fetchWithTimeout(
      url,
      { headers: { Accept: 'application/dns-json' } },
      TIMEOUTS.dnsRdapMs
    );
    if (!response.ok) throw new Error(`Google DoH returned HTTP ${response.status}`);

    const data = (await response.json()) as GoogleDohResponse;
    return {
      type,
      status: data.Status,
      dnssecAuthenticated: data.AD,
      truncated: data.TC,
      recursionAvailable: data.RA,
      answers: data.Answer || [],
      comment: data.Comment || '',
    };
  });
}

async function querySecurityTrails(hostname: string) {
  if (!process.env.SECURITYTRAILS_API_KEY) return null;
  return cachedJson(`securitytrails:dns:${hostname}`, 10 * 60_000, async () => {
    const response = await fetchWithTimeout(
      `https://api.securitytrails.com/v1/domain/${encodeURIComponent(hostname)}/dns`,
      { headers: { Accept: 'application/json', ...envHeader('SECURITYTRAILS_API_KEY', 'APIKEY') } },
      TIMEOUTS.dnsRdapMs
    );
    if (!response.ok) throw new Error(`SecurityTrails returned HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  }).catch((error: unknown) => ({ error: error instanceof Error ? error.message : 'SecurityTrails lookup failed' }));
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown; type?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return errorResponse('Invalid hostname provided', 400, 'INVALID_HOSTNAME');
    }

    const hostname = await assertPublicHostname(body.hostname);
    const rate = consumeRateLimit(request, hostname, {
      endpoint: 'doh',
      ipLimit: 45,
      targetLimit: 15,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const types = isDnsType(body.type) ? [body.type.toUpperCase() as DnsType] : DNS_TYPES;
    const results = await Promise.all(types.map((type) => queryGoogleDoh(hostname, type)));
    const securityTrails = await querySecurityTrails(hostname);

    return NextResponse.json({
      success: true,
      provider: 'Google Public DNS over HTTPS',
      hostname,
      results,
      securityTrails,
    });
  } catch (error) {
    return jsonError(error);
  }
}
