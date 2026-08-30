import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  errorResponse,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
} from '@/lib/server/scanner';
import {
  ENRICHABLE_TYPES,
  MAX_ENRICHMENT_INDICATORS,
  configuredProviderNames,
  enrichIndicators,
  isEnrichmentConfigured,
  providerAvailability,
  type EnrichableIndicatorType,
  type EnrichmentRequestItem,
} from '@/lib/server/enrichment';

/**
 * Indicator reputation enrichment.
 *
 * GET reports which providers are configured so the UI can tell the user what
 * would happen before any indicator leaves the browser.
 *
 * POST forwards validated indicators to the configured providers. This is an
 * explicit data-egress operation: the caller must opt in, and the response is
 * marked no-store so intermediaries do not retain verdicts.
 */

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

export async function GET() {
  const availability = providerAvailability();
  return NextResponse.json(
    {
      success: true,
      configured: isEnrichmentConfigured(availability),
      providers: availability,
      configuredProviders: configuredProviderNames(availability),
      supportedTypes: ENRICHABLE_TYPES,
      maxIndicators: MAX_ENRICHMENT_INDICATORS,
    },
    { headers: NO_STORE }
  );
}

export async function POST(request: Request) {
  try {
    const availability = providerAvailability();
    if (!isEnrichmentConfigured(availability)) {
      return errorResponse(
        'No enrichment provider is configured on this deployment.',
        503,
        'ENRICHMENT_NOT_CONFIGURED',
        false,
        'Set VIRUSTOTAL_API_KEY, ABUSEIPDB_API_KEY, or URLHAUS_AUTH_KEY to enable enrichment.'
      );
    }

    const body = await parseJsonBody<{ indicators?: unknown }>(request);
    if (!Array.isArray(body.indicators) || body.indicators.length === 0) {
      return errorResponse('Provide a non-empty indicators array.', 400, 'INVALID_INDICATORS');
    }
    if (body.indicators.length > MAX_ENRICHMENT_INDICATORS) {
      return errorResponse(
        `At most ${MAX_ENRICHMENT_INDICATORS} indicators can be enriched per request.`,
        400,
        'TOO_MANY_INDICATORS'
      );
    }

    const items: EnrichmentRequestItem[] = [];
    for (const candidate of body.indicators) {
      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate) ||
        typeof (candidate as { type?: unknown }).type !== 'string' ||
        typeof (candidate as { value?: unknown }).value !== 'string'
      ) {
        return errorResponse('Each indicator needs a string type and value.', 400, 'INVALID_INDICATORS');
      }
      items.push({
        type: (candidate as { type: string }).type as EnrichableIndicatorType,
        value: (candidate as { value: string }).value,
      });
    }

    // Keyed on the batch size rather than an indicator so no value reaches a
    // rate-limit key, which is what the counters are stored under.
    const rate = await consumeRateLimit(request, `batch:${items.length}`, {
      endpoint: 'enrich',
      ipLimit: 12,
      targetLimit: 12,
      windowMs: 60_000,
      cooldownMs: 3_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const { results, rejected } = await enrichIndicators(items);

    return NextResponse.json(
      {
        success: true,
        configuredProviders: configuredProviderNames(availability),
        requested: items.length,
        enriched: results.length,
        results,
        rejected,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return jsonError(error);
  }
}
