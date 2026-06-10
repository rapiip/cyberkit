import { NextResponse } from 'next/server';
import dns from 'dns';
import {
  assertPublicHostname,
  cachedJson,
  consumeRateLimit,
  errorResponse,
  fetchWithRetry,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  readJsonResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

const dnsPromises = dns.promises;
const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CAA'] as const;
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
    const response = await fetchWithRetry(
      url,
      { headers: { Accept: 'application/dns-json' } },
      TIMEOUTS.dnsRdapMs
    );
    if (!response.ok) throw new Error(`Google DoH returned HTTP ${response.status}`);
    const data = await readJsonResponse<GoogleDohResponse>(response);
    return {
      provider: 'Google Public DNS over HTTPS',
      timestamp: new Date().toISOString(),
      type,
      status: data.Status,
      dnssecAuthenticated: data.AD,
      truncated: data.TC,
      recursionAvailable: data.RA,
      confidence: data.Status === 0 ? 'high' : 'low',
      answers: data.Answer || [],
      comment: data.Comment || '',
      unavailable: false,
    };
  }).catch((error: unknown) => ({
    provider: 'Google Public DNS over HTTPS',
    timestamp: new Date().toISOString(),
    type,
    status: -1,
    dnssecAuthenticated: false,
    truncated: false,
    recursionAvailable: false,
    confidence: 'low',
    answers: [],
    comment: error instanceof Error ? error.message : 'DoH lookup failed',
    unavailable: true,
  }));
}

async function queryLocal(hostname: string, type: DnsType) {
  try {
    const values = await (async () => {
      switch (type) {
        case 'A':
          return dnsPromises.resolve4(hostname, { ttl: true });
        case 'AAAA':
          return dnsPromises.resolve6(hostname, { ttl: true });
        case 'MX':
          return dnsPromises.resolveMx(hostname);
        case 'TXT':
          return dnsPromises.resolveTxt(hostname);
        case 'NS':
          return dnsPromises.resolveNs(hostname);
        case 'CAA':
          return dnsPromises.resolveCaa(hostname);
      }
    })();
    return {
      provider: 'Node.js resolver',
      timestamp: new Date().toISOString(),
      type,
      confidence: 'medium',
      unavailable: false,
      values: Array.isArray(values) ? values.map((value) => Array.isArray(value) ? value.join(' ') : value) : [],
    };
  } catch (error) {
    return {
      provider: 'Node.js resolver',
      timestamp: new Date().toISOString(),
      type,
      confidence: 'low',
      unavailable: true,
      values: [],
      error: error instanceof Error ? error.message : 'Local resolver failed',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown; type?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return errorResponse('Invalid hostname provided', 400, 'INVALID_HOSTNAME');
    }

    const hostname = await assertPublicHostname(body.hostname);
    const rate = await consumeRateLimit(request, hostname, {
      endpoint: 'doh',
      ipLimit: 45,
      targetLimit: 15,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const types = isDnsType(body.type) ? [body.type.toUpperCase() as DnsType] : DNS_TYPES;
    const comparisons = await Promise.all(
      types.map(async (type) => ({
        type,
        local: await queryLocal(hostname, type),
        doh: await queryGoogleDoh(hostname, type),
      }))
    );

    return NextResponse.json({
      success: true,
      hostname,
      provider: 'Resolver comparison',
      timestamp: new Date().toISOString(),
      partial: comparisons.some((item) => item.local.unavailable || item.doh.unavailable),
      comparisons,
    });
  } catch (error) {
    return jsonError(error);
  }
}
