import net from 'net';
import {
  TIMEOUTS,
  cachedJson,
  fetchWithRetry,
  readJsonResponse,
} from './scanner';
import { logger } from './logger';

/**
 * Indicator enrichment against optional third-party reputation providers.
 *
 * This is the only place in CyberKit that deliberately sends user-supplied
 * indicators to an external service, so it is gated three ways:
 *
 *  1. the caller must explicitly opt in (the IOC panel checkbox),
 *  2. a provider API key must be configured, and
 *  3. only validated indicators of a supported type are forwarded.
 *
 * Indicator values are never logged; `logger` strips url/hostname/target/ip and
 * this module only ever logs the provider name and an error category.
 */

export type EnrichableIndicatorType = 'ip' | 'domain' | 'url' | 'hash';

export const ENRICHABLE_TYPES: readonly EnrichableIndicatorType[] = ['ip', 'domain', 'url', 'hash'];

/** Hard cap so one paste cannot fan out into hundreds of provider calls. */
export const MAX_ENRICHMENT_INDICATORS = 25;

export type EnrichmentVerdict = 'malicious' | 'suspicious' | 'harmless' | 'unknown';

export interface EnrichmentSource {
  provider: string;
  verdict: EnrichmentVerdict;
  /** Short human-readable summary. Never contains the indicator itself. */
  detail: string;
  /** Provider-native score when one exists (e.g. AbuseIPDB confidence 0-100). */
  score?: number;
  reference?: string;
  error?: string;
}

export interface EnrichmentResult {
  type: EnrichableIndicatorType;
  value: string;
  verdict: EnrichmentVerdict;
  sources: EnrichmentSource[];
}

export interface ProviderAvailability {
  virusTotal: boolean;
  abuseIpDb: boolean;
  urlhaus: boolean;
}

export function providerAvailability(): ProviderAvailability {
  return {
    virusTotal: Boolean(process.env.VIRUSTOTAL_API_KEY),
    abuseIpDb: Boolean(process.env.ABUSEIPDB_API_KEY),
    urlhaus: Boolean(process.env.URLHAUS_AUTH_KEY),
  };
}

export function configuredProviderNames(availability = providerAvailability()): string[] {
  const names: string[] = [];
  if (availability.virusTotal) names.push('VirusTotal');
  if (availability.abuseIpDb) names.push('AbuseIPDB');
  if (availability.urlhaus) names.push('URLhaus');
  return names;
}

export function isEnrichmentConfigured(availability = providerAvailability()): boolean {
  return availability.virusTotal || availability.abuseIpDb || availability.urlhaus;
}

// ══════════ Indicator validation ══════════

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/;
const HASH_PATTERN = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/;

/**
 * Rejects anything that is not a well-formed indicator of the claimed type.
 * Returns the canonical form that will be sent to the provider.
 */
export function normalizeIndicator(
  type: EnrichableIndicatorType,
  value: string
): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: 'Indicator is empty' };
  if (trimmed.length > 2048) return { ok: false, reason: 'Indicator is too long' };

  switch (type) {
    case 'ip': {
      if (net.isIP(trimmed) === 0) return { ok: false, reason: 'Not a valid IP address' };
      return { ok: true, value: trimmed };
    }
    case 'domain': {
      const lowered = trimmed.toLowerCase();
      if (!DOMAIN_PATTERN.test(lowered)) return { ok: false, reason: 'Not a valid domain' };
      return { ok: true, value: lowered };
    }
    case 'hash': {
      const lowered = trimmed.toLowerCase();
      if (!HASH_PATTERN.test(lowered)) return { ok: false, reason: 'Not an MD5, SHA-1, or SHA-256 hash' };
      return { ok: true, value: lowered };
    }
    case 'url': {
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        return { ok: false, reason: 'Not a valid URL' };
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, reason: 'Only http and https URLs can be enriched' };
      }
      // Credentials must never be forwarded to a third party.
      parsed.username = '';
      parsed.password = '';
      return { ok: true, value: parsed.toString() };
    }
  }
}

// ══════════ Provider calls ══════════

async function providerJson(url: string, init: RequestInit, timeoutMs = TIMEOUTS.httpMs) {
  const response = await fetchWithRetry(url, init, timeoutMs);
  if (response.status === 404) return { notFound: true as const };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { notFound: false as const, data: await readJsonResponse<Record<string, unknown>>(response) };
}

interface VirusTotalStats {
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
}

function verdictFromVirusTotalStats(stats: VirusTotalStats): EnrichmentVerdict {
  if ((stats.malicious ?? 0) > 0) return 'malicious';
  if ((stats.suspicious ?? 0) > 0) return 'suspicious';
  if ((stats.harmless ?? 0) > 0 || (stats.undetected ?? 0) > 0) return 'harmless';
  return 'unknown';
}

/** VirusTotal identifies URLs by unpadded base64url of the URL itself. */
function virusTotalUrlId(url: string) {
  return Buffer.from(url).toString('base64url').replace(/=+$/, '');
}

function virusTotalEndpoint(type: EnrichableIndicatorType, value: string) {
  switch (type) {
    case 'ip':
      return { path: `ip_addresses/${encodeURIComponent(value)}`, ui: `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(value)}` };
    case 'domain':
      return { path: `domains/${encodeURIComponent(value)}`, ui: `https://www.virustotal.com/gui/domain/${encodeURIComponent(value)}` };
    case 'hash':
      return { path: `files/${encodeURIComponent(value)}`, ui: `https://www.virustotal.com/gui/file/${encodeURIComponent(value)}` };
    case 'url': {
      const id = virusTotalUrlId(value);
      return { path: `urls/${id}`, ui: `https://www.virustotal.com/gui/url/${id}` };
    }
  }
}

async function virusTotalSource(
  type: EnrichableIndicatorType,
  value: string,
  apiKey: string
): Promise<EnrichmentSource> {
  const endpoint = virusTotalEndpoint(type, value);
  try {
    const result = await cachedJson(`enrich:vt:${type}:${value}`, 30 * 60_000, () =>
      providerJson(`https://www.virustotal.com/api/v3/${endpoint.path}`, {
        headers: { Accept: 'application/json', 'x-apikey': apiKey },
      })
    );

    if (result.notFound) {
      return {
        provider: 'VirusTotal',
        verdict: 'unknown',
        detail: 'Not present in the VirusTotal dataset.',
        reference: endpoint.ui,
      };
    }

    const attributes = (result.data?.data as { attributes?: Record<string, unknown> } | undefined)?.attributes ?? {};
    const stats = (attributes.last_analysis_stats ?? {}) as VirusTotalStats;
    const verdict = verdictFromVirusTotalStats(stats);
    const total =
      (stats.malicious ?? 0) + (stats.suspicious ?? 0) + (stats.harmless ?? 0) + (stats.undetected ?? 0);

    return {
      provider: 'VirusTotal',
      verdict,
      score: stats.malicious ?? 0,
      detail:
        total > 0
          ? `${stats.malicious ?? 0} malicious, ${stats.suspicious ?? 0} suspicious of ${total} engines.`
          : 'No analysis statistics returned.',
      reference: endpoint.ui,
    };
  } catch (error: unknown) {
    logger.warn('VirusTotal enrichment failed', { provider: 'virustotal', errorCategory: 'PROVIDER_ERROR' }, error);
    return {
      provider: 'VirusTotal',
      verdict: 'unknown',
      detail: 'Lookup failed.',
      error: error instanceof Error ? error.message : 'VirusTotal lookup failed',
    };
  }
}

async function abuseIpDbSource(value: string, apiKey: string): Promise<EnrichmentSource> {
  try {
    const result = await cachedJson(`enrich:abuseipdb:${value}`, 30 * 60_000, () =>
      providerJson(
        `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`,
        { headers: { Accept: 'application/json', Key: apiKey } }
      )
    );

    if (result.notFound) {
      return { provider: 'AbuseIPDB', verdict: 'unknown', detail: 'No record returned.' };
    }

    const data = (result.data?.data ?? {}) as {
      abuseConfidenceScore?: number;
      totalReports?: number;
      countryCode?: string;
      isWhitelisted?: boolean;
    };
    const score = data.abuseConfidenceScore ?? 0;
    const verdict: EnrichmentVerdict = score >= 50 ? 'malicious' : score > 0 ? 'suspicious' : 'harmless';

    return {
      provider: 'AbuseIPDB',
      verdict,
      score,
      detail: `Abuse confidence ${score}% from ${data.totalReports ?? 0} report(s) in the last 90 days.`,
      reference: `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`,
    };
  } catch (error: unknown) {
    logger.warn('AbuseIPDB enrichment failed', { provider: 'abuseipdb', errorCategory: 'PROVIDER_ERROR' }, error);
    return {
      provider: 'AbuseIPDB',
      verdict: 'unknown',
      detail: 'Lookup failed.',
      error: error instanceof Error ? error.message : 'AbuseIPDB lookup failed',
    };
  }
}

async function urlhausSource(
  type: 'domain' | 'ip' | 'url',
  value: string,
  authKey: string
): Promise<EnrichmentSource> {
  const isUrlLookup = type === 'url';
  const endpoint = isUrlLookup
    ? 'https://urlhaus-api.abuse.ch/v1/url/'
    : 'https://urlhaus-api.abuse.ch/v1/host/';
  const body = isUrlLookup ? new URLSearchParams({ url: value }) : new URLSearchParams({ host: value });

  try {
    const result = await cachedJson(`enrich:urlhaus:${type}:${value}`, 30 * 60_000, () =>
      providerJson(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Auth-Key': authKey,
        },
        body,
      })
    );

    if (result.notFound) {
      return { provider: 'URLhaus', verdict: 'unknown', detail: 'No record returned.' };
    }

    const data = result.data as {
      query_status?: string;
      url_status?: string;
      threat?: string;
      urls?: unknown[];
      blacklists?: Record<string, string>;
    };

    if (data.query_status === 'no_results') {
      return { provider: 'URLhaus', verdict: 'harmless', detail: 'Not listed in URLhaus.' };
    }
    if (data.query_status !== 'ok') {
      return {
        provider: 'URLhaus',
        verdict: 'unknown',
        detail: `URLhaus returned status "${data.query_status ?? 'unknown'}".`,
      };
    }

    const listedCount = Array.isArray(data.urls) ? data.urls.length : data.url_status ? 1 : 0;
    const online = data.url_status === 'online';
    return {
      provider: 'URLhaus',
      verdict: 'malicious',
      score: listedCount,
      detail: `Listed in URLhaus${data.threat ? ` as ${data.threat}` : ''}${
        listedCount ? ` with ${listedCount} known malicious URL(s)` : ''
      }${online ? ', currently online' : ''}.`,
      reference: 'https://urlhaus.abuse.ch/',
    };
  } catch (error: unknown) {
    logger.warn('URLhaus enrichment failed', { provider: 'urlhaus', errorCategory: 'PROVIDER_ERROR' }, error);
    return {
      provider: 'URLhaus',
      verdict: 'unknown',
      detail: 'Lookup failed.',
      error: error instanceof Error ? error.message : 'URLhaus lookup failed',
    };
  }
}

// ══════════ Aggregation ══════════

const VERDICT_RANK: Record<EnrichmentVerdict, number> = {
  malicious: 3,
  suspicious: 2,
  harmless: 1,
  unknown: 0,
};

/** The most severe provider verdict wins. */
export function aggregateVerdict(sources: EnrichmentSource[]): EnrichmentVerdict {
  return sources.reduce<EnrichmentVerdict>(
    (worst, source) => (VERDICT_RANK[source.verdict] > VERDICT_RANK[worst] ? source.verdict : worst),
    'unknown'
  );
}

export async function enrichIndicator(
  type: EnrichableIndicatorType,
  value: string
): Promise<EnrichmentResult> {
  const availability = providerAvailability();
  const lookups: Array<Promise<EnrichmentSource>> = [];

  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  if (availability.virusTotal && vtKey) {
    lookups.push(virusTotalSource(type, value, vtKey));
  }

  const abuseKey = process.env.ABUSEIPDB_API_KEY;
  if (availability.abuseIpDb && abuseKey && type === 'ip') {
    lookups.push(abuseIpDbSource(value, abuseKey));
  }

  const urlhausKey = process.env.URLHAUS_AUTH_KEY;
  if (availability.urlhaus && urlhausKey && (type === 'domain' || type === 'ip' || type === 'url')) {
    lookups.push(urlhausSource(type, value, urlhausKey));
  }

  const sources = await Promise.all(lookups);
  return { type, value, verdict: aggregateVerdict(sources), sources };
}

export interface EnrichmentRequestItem {
  type: EnrichableIndicatorType;
  value: string;
}

export interface EnrichmentRejection {
  type: string;
  reason: string;
}

/**
 * Validates and enriches a batch. Invalid or unsupported indicators are reported
 * back as rejections rather than silently dropped, and their values are not
 * echoed so a malformed paste cannot be reflected.
 */
export async function enrichIndicators(items: EnrichmentRequestItem[]) {
  const accepted: EnrichmentRequestItem[] = [];
  const rejected: EnrichmentRejection[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!ENRICHABLE_TYPES.includes(item.type)) {
      rejected.push({ type: String(item.type), reason: 'Type cannot be enriched by the configured providers' });
      continue;
    }
    const normalized = normalizeIndicator(item.type, item.value);
    if (!normalized.ok) {
      rejected.push({ type: item.type, reason: normalized.reason });
      continue;
    }
    const key = `${item.type}:${normalized.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    accepted.push({ type: item.type, value: normalized.value });
  }

  const results = await Promise.all(accepted.map((item) => enrichIndicator(item.type, item.value)));
  return { results, rejected };
}
