import { NextResponse } from 'next/server';
import dns from 'dns';
import {
  assertPublicHostname,
  cachedJson,
  consumeRateLimit,
  errorResponse,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

const dnsPromises = dns.promises;
const DKIM_SELECTORS = ['default', 'selector1', 'selector2', 'google', 'k1', 'dkim'] as const;

type SupportedRecord = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CAA' | 'SOA' | 'PTR';

interface RecordResult {
  type: SupportedRecord;
  provider: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  ttl: number | null;
  unavailable: boolean;
  values: unknown[];
  error?: string;
}

function extractTtl(values: unknown): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const first = values[0];
  if (!first || typeof first !== 'object') return null;
  if (!('ttl' in first)) return null;
  const ttl = (first as { ttl?: unknown }).ttl;
  return typeof ttl === 'number' && Number.isFinite(ttl) ? ttl : null;
}

async function withDnsTimeout<T>(operation: Promise<T>) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('DNS query timed out')), TIMEOUTS.dnsRdapMs);
  });
  return Promise.race([operation, timeout]);
}

async function resolveRecord(hostname: string, type: SupportedRecord): Promise<RecordResult> {
  const timestamp = new Date().toISOString();
  try {
    const values = await cachedJson(`dns:${hostname}:${type}`, 60_000, async () => {
      switch (type) {
        case 'A':
          return await withDnsTimeout(dnsPromises.resolve4(hostname, { ttl: true }));
        case 'AAAA':
          return await withDnsTimeout(dnsPromises.resolve6(hostname, { ttl: true }));
        case 'MX':
          return await withDnsTimeout(dnsPromises.resolveMx(hostname));
        case 'TXT':
          return await withDnsTimeout(dnsPromises.resolveTxt(hostname));
        case 'NS':
          return await withDnsTimeout(dnsPromises.resolveNs(hostname));
        case 'CAA':
          return await withDnsTimeout(dnsPromises.resolveCaa(hostname));
        case 'SOA':
          return [await withDnsTimeout(dnsPromises.resolveSoa(hostname))];
        case 'PTR': {
          const lookup = await withDnsTimeout(dnsPromises.lookup(hostname));
          return await withDnsTimeout(dnsPromises.reverse(lookup.address));
        }
      }
    });

    const ttl = extractTtl(values);
    return {
      type,
      provider: 'Node.js resolver',
      timestamp,
      confidence: values && Array.isArray(values) && values.length ? 'high' : 'low',
      ttl,
      unavailable: false,
      values: Array.isArray(values)
        ? values.map((value) => Array.isArray(value) ? value.join(' ') : value)
        : [values],
    };
  } catch (error) {
    return {
      type,
      provider: 'Node.js resolver',
      timestamp,
      confidence: 'low',
      ttl: null,
      unavailable: true,
      values: [],
      error: error instanceof Error ? error.message : 'Lookup failed',
    };
  }
}

async function resolveEmailControls(hostname: string) {
  const [txt, dmarc, dkim] = await Promise.all([
    resolveRecord(hostname, 'TXT'),
    resolveRecord(`_dmarc.${hostname}`, 'TXT').catch(() => ({
      type: 'TXT',
      provider: 'Node.js resolver',
      timestamp: new Date().toISOString(),
      confidence: 'low' as const,
      ttl: null,
      unavailable: true,
      values: [],
    })),
    Promise.all(
      DKIM_SELECTORS.map(async (selector) => ({
        selector,
        result: await resolveRecord(`${selector}._domainkey.${hostname}`, 'TXT'),
      }))
    ),
  ]);

  const txtValues = txt.values.map((value) => String(value));
  const spf = txtValues.find((value) => value.toLowerCase().startsWith('v=spf1')) || null;
  const dmarcValue = dmarc.values.map((value) => String(value)).find((value) => value.toLowerCase().startsWith('v=dmarc1')) || null;
  const activeDkimSelectors = dkim
    .filter((entry) => entry.result.values.some((value) => String(value).includes('v=DKIM1')))
    .map((entry) => entry.selector);

  return {
    spf: { value: spf, present: Boolean(spf) },
    dmarc: { value: dmarcValue, present: Boolean(dmarcValue) },
    dkim: {
      selectorsChecked: Array.from(DKIM_SELECTORS),
      selectorsFound: activeDkimSelectors,
      present: activeDkimSelectors.length > 0,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return errorResponse('Invalid hostname provided', 400, 'INVALID_HOSTNAME');
    }

    const hostname = await assertPublicHostname(body.hostname);
    const rate = await consumeRateLimit(request, hostname, {
      endpoint: 'dns',
      ipLimit: 45,
      targetLimit: 15,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const recordTypes: SupportedRecord[] = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CAA', 'SOA', 'PTR'];
    const results = await Promise.all(recordTypes.map((type) => resolveRecord(hostname, type)));
    const controls = await resolveEmailControls(hostname);
    const partial = results.some((result) => result.unavailable);

    return NextResponse.json({
      success: true,
      provider: 'Node.js resolver',
      hostname,
      timestamp: new Date().toISOString(),
      partial,
      records: Object.fromEntries(results.map((result) => [result.type, result])),
      helpers: controls,
    });
  } catch (error) {
    return jsonError(error);
  }
}
