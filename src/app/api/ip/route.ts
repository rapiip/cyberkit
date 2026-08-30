import { NextResponse } from 'next/server';
import net from 'net';
import {
  assertPublicHostname,
  cachedJson,
  consumeRateLimit,
  errorResponse,
  envHeader,
  fetchWithRetry,
  jsonError,
  normalizeHostname,
  parseJsonBody,
  rateLimitResponse,
  readJsonResponse,
  resolveAndBlockPrivateIp,
  TIMEOUTS,
} from '@/lib/server/scanner';
import { logger } from '@/lib/server/logger';

/**
 * ipwho.is response subset.
 *
 * The previous provider (ip-api.com) refuses HTTPS on its free tier — it answers
 * `403 SSL unavailable for this endpoint` — so the IP or domain under
 * investigation travelled to the provider in cleartext. For a tool whose whole
 * purpose is investigating targets, that leaks the investigation itself to any
 * observer on the path. ipwho.is serves the same fields over HTTPS without a key.
 */
interface GeolocationResponse {
  success?: boolean;
  message?: string;
  ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
  connection?: {
    asn?: number;
    org?: string;
    isp?: string;
    domain?: string;
  };
}

async function optionalJson(url: string, init: RequestInit, timeoutMs = TIMEOUTS.httpMs) {
  const response = await fetchWithRetry(url, init, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return readJsonResponse(response);
}

async function getThreatIntel(ip: string, hostname: string) {
  const providers: Record<string, unknown> = {};
  const configuredProviders: string[] = [];

  const abuseKey = process.env.ABUSEIPDB_API_KEY;
  if (abuseKey) {
    configuredProviders.push('AbuseIPDB');
    providers.abuseIpDb = await optionalJson(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      { headers: { Accept: 'application/json', Key: abuseKey } }
    ).catch((error: unknown) => {
      logger.warn('AbuseIPDB lookup failed', { provider: 'abuseipdb', errorCategory: 'PROVIDER_ERROR' }, error);
      return { error: error instanceof Error ? error.message : 'AbuseIPDB lookup failed' };
    });
  }

  const shodanKey = process.env.SHODAN_API_KEY;
  if (shodanKey) {
    configuredProviders.push('Shodan');
    providers.shodan = await optionalJson(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(shodanKey)}`,
      { headers: { Accept: 'application/json' } }
    ).catch((error: unknown) => {
      logger.warn('Shodan lookup failed', { provider: 'shodan', errorCategory: 'PROVIDER_ERROR' }, error);
      return { error: error instanceof Error ? error.message : 'Shodan lookup failed' };
    });
  }

  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  if (vtKey) {
    configuredProviders.push('VirusTotal');
    const vtType = net.isIP(hostname) ? 'ip_addresses' : 'domains';
    const vtId = vtType === 'ip_addresses' ? ip : hostname;
    providers.virusTotal = await optionalJson(
      `https://www.virustotal.com/api/v3/${vtType}/${encodeURIComponent(vtId)}`,
      { headers: { Accept: 'application/json', ...envHeader('VIRUSTOTAL_API_KEY', 'x-apikey') } }
    ).catch((error: unknown) => {
      logger.warn('VirusTotal lookup failed', { provider: 'virustotal', errorCategory: 'PROVIDER_ERROR' }, error);
      return { error: error instanceof Error ? error.message : 'VirusTotal lookup failed' };
    });
  }

  const urlhausKey = process.env.URLHAUS_AUTH_KEY;
  if (urlhausKey && !net.isIP(hostname)) {
    configuredProviders.push('URLhaus');
    providers.urlhaus = await optionalJson(
      'https://urlhaus-api.abuse.ch/v1/host/',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Auth-Key': urlhausKey,
        },
        body: new URLSearchParams({ host: hostname }),
      }
    ).catch((error: unknown) => {
      logger.warn('URLhaus lookup failed', { provider: 'urlhaus', errorCategory: 'PROVIDER_ERROR' }, error);
      return { error: error instanceof Error ? error.message : 'URLhaus lookup failed' };
    });
  }

  return { configuredProviders, providers };
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ ipOrDomain?: unknown }>(request);
    if (typeof body.ipOrDomain !== 'string' || !body.ipOrDomain.trim()) {
      return errorResponse('Invalid IP or Domain provided', 400, 'INVALID_IP_OR_DOMAIN');
    }

    const query = normalizeHostname(body.ipOrDomain);
    const resolvedAddresses = net.isIP(query) ? await resolveAndBlockPrivateIp(query) : await resolveAndBlockPrivateIp(await assertPublicHostname(query));
    const resolvedIp = resolvedAddresses[0];

    const rate = await consumeRateLimit(request, query, {
      endpoint: 'ip',
      ipLimit: 35,
      targetLimit: 10,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const data = await cachedJson(`geo:ipwhois:${resolvedIp}`, 10 * 60_000, async () => {
      const response = await fetchWithRetry(
        `https://ipwho.is/${encodeURIComponent(resolvedIp)}`,
        { headers: { Accept: 'application/json', 'User-Agent': 'CyberKit/1.0' } },
        TIMEOUTS.httpMs
      );
      return await readJsonResponse<GeolocationResponse>(response);
    });

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'GEOLOCATION_LOOKUP_FAILED',
          message: data.message || 'Failed to retrieve geolocation data',
          details: data.message,
          retryable: true,
          error: data.message || 'Failed to retrieve geolocation data',
        },
        { status: 502 }
      );
    }

    const threatIntel = await getThreatIntel(resolvedIp, query);

    return NextResponse.json({
      success: true,
      provider: 'ipwho.is',
      timestamp: new Date().toISOString(),
      confidence: 'medium',
      input: query,
      ip: resolvedIp,
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      zip: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      isp: data.connection?.isp,
      organization: data.connection?.org,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
      precisionDisclaimer: 'IP geolocation is approximate and must not be treated as a precise physical location.',
      threatIntel,
    });
  } catch (error) {
    return jsonError(error);
  }
}
