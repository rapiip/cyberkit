import type { IocEntry } from '@/lib/security/local-analysis';

/**
 * Browser-side client for `/api/enrich`.
 *
 * Enrichment is the one CyberKit operation that intentionally sends indicators
 * off the machine, so callers must have explicit user consent before invoking
 * these helpers. Only validated indicators of a supported type are forwarded.
 */

export type EnrichableIndicatorType = 'ip' | 'domain' | 'url' | 'hash';

export const ENRICHABLE_IOC_TYPES: readonly EnrichableIndicatorType[] = ['ip', 'domain', 'url', 'hash'];

/** Mirrors MAX_ENRICHMENT_INDICATORS on the server. */
export const MAX_ENRICHMENT_INDICATORS = 25;

export type EnrichmentVerdict = 'malicious' | 'suspicious' | 'harmless' | 'unknown';

export interface EnrichmentSource {
  provider: string;
  verdict: EnrichmentVerdict;
  detail: string;
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

export interface EnrichmentResponse {
  success: boolean;
  configuredProviders?: string[];
  requested?: number;
  enriched?: number;
  results?: EnrichmentResult[];
  rejected?: Array<{ type: string; reason: string }>;
  errorCode?: string;
  error?: string;
  message?: string;
}

export interface EnrichmentOutcome {
  performed: boolean;
  /** Reason enrichment did not run, suitable for display. */
  reason?: string;
  configuredProviders: string[];
  results: EnrichmentResult[];
  skipped: number;
}

/** Selects the locally validated indicators the providers can actually answer for. */
export function selectEnrichableIocs(iocs: IocEntry[]) {
  const seen = new Set<string>();
  const selected: Array<{ type: EnrichableIndicatorType; value: string }> = [];

  for (const ioc of iocs) {
    if (!ioc.valid) continue;
    if (!ENRICHABLE_IOC_TYPES.includes(ioc.type as EnrichableIndicatorType)) continue;
    const type = ioc.type as EnrichableIndicatorType;
    const key = `${type}:${ioc.normalized.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push({ type, value: ioc.normalized });
  }

  return selected;
}

export function verdictStatus(verdict: EnrichmentVerdict): 'pass' | 'warn' | 'fail' | 'info' {
  if (verdict === 'malicious') return 'fail';
  if (verdict === 'suspicious') return 'warn';
  if (verdict === 'harmless') return 'pass';
  return 'info';
}

export async function enrichIocs(iocs: IocEntry[], signal?: AbortSignal): Promise<EnrichmentOutcome> {
  const candidates = selectEnrichableIocs(iocs);
  if (candidates.length === 0) {
    return {
      performed: false,
      reason: 'No locally validated IP, domain, URL, or hash indicator was available to enrich.',
      configuredProviders: [],
      results: [],
      skipped: 0,
    };
  }

  const batch = candidates.slice(0, MAX_ENRICHMENT_INDICATORS);
  const skipped = candidates.length - batch.length;

  const response = await fetch('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicators: batch }),
    signal,
  });

  const data = (await response.json()) as EnrichmentResponse;
  if (!data.success) {
    return {
      performed: false,
      reason:
        data.errorCode === 'ENRICHMENT_NOT_CONFIGURED'
          ? 'No enrichment provider is configured on this deployment, so nothing left the browser.'
          : data.message || data.error || 'Enrichment request failed.',
      configuredProviders: [],
      results: [],
      skipped,
    };
  }

  return {
    performed: true,
    configuredProviders: data.configuredProviders ?? [],
    results: data.results ?? [],
    skipped,
  };
}
