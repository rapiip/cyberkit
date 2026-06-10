import { NextResponse } from 'next/server';
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

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapNameServer {
  ldhName?: string;
  unicodeName?: string;
}

interface RdapEntity {
  roles?: string[];
  fn?: string;
  vcardArray?: [string, unknown[]];
}

interface RdapDomainResponse {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: RdapEvent[];
  nameservers?: RdapNameServer[];
  entities?: RdapEntity[];
  port43?: string;
  rdapConformance?: string[];
  notices?: { title?: string; description?: string[] }[];
}

interface BootstrapResponse {
  services?: [string[], string[]][];
}

function getEntityName(entity: RdapEntity) {
  if (entity.fn) return entity.fn;
  const entries = entity.vcardArray?.[1];
  if (!Array.isArray(entries)) return '';

  const fn = entries.find((entry) => Array.isArray(entry) && entry[0] === 'fn') as
    | [string, unknown, unknown, string]
    | undefined;
  return typeof fn?.[3] === 'string' ? fn[3] : '';
}

function tldForDomain(domain: string) {
  const parts = domain.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

async function fetchRdapJson(url: string) {
  const response = await fetchWithRetry(
    url,
    { headers: { Accept: 'application/rdap+json, application/json' } },
    TIMEOUTS.dnsRdapMs
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`RDAP lookup failed with HTTP ${response.status}`);
  return await readJsonResponse<RdapDomainResponse>(response);
}

async function getBootstrapRdapBase(tld: string) {
  const bootstrap = await cachedJson('iana:rdap:dns-bootstrap', 24 * 60 * 60_000, async () => {
    const response = await fetchWithRetry(
      'https://data.iana.org/rdap/dns.json',
      { headers: { Accept: 'application/json' } },
      TIMEOUTS.dnsRdapMs
    );
    if (!response.ok) throw new Error(`IANA RDAP bootstrap returned HTTP ${response.status}`);
    return await readJsonResponse<BootstrapResponse>(response);
  });

  const service = bootstrap.services?.find(([tlds]) => tlds.map((item) => item.toLowerCase()).includes(tld));
  return service?.[1]?.[0] || null;
}

async function lookupRdap(domain: string) {
  return cachedJson(`rdap:domain:${domain}`, 60 * 60_000, async () => {
    const rdapOrg = await fetchRdapJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`).catch(() => null);
    if (rdapOrg) return { provider: 'RDAP.org', data: rdapOrg };

    const tld = tldForDomain(domain);
    if (!tld) throw new Error('TLD not supported: enter a fully-qualified domain name');

    const base = await getBootstrapRdapBase(tld);
    if (!base) throw new Error(`TLD not supported by IANA RDAP bootstrap: .${tld}`);

    const registryUrl = new URL(`domain/${encodeURIComponent(domain)}`, base.endsWith('/') ? base : `${base}/`);
    const registryData = await fetchRdapJson(registryUrl.toString());
    if (!registryData) throw new Error('RDAP record not found for this domain');
    return { provider: `IANA bootstrap (${new URL(base).hostname})`, data: registryData };
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return errorResponse('Invalid domain provided', 400, 'INVALID_DOMAIN');
    }

    const domain = await assertPublicHostname(body.hostname);
    const rate = await consumeRateLimit(request, domain, {
      endpoint: 'rdap',
      ipLimit: 25,
      targetLimit: 5,
      windowMs: 60_000,
      cooldownMs: 8_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const { provider, data } = await lookupRdap(domain);
    const events = data.events || [];
    const nameservers = (data.nameservers || [])
      .map((ns) => ns.ldhName || ns.unicodeName)
      .filter((ns): ns is string => Boolean(ns));
    const registrar = (data.entities || []).find((entity) => entity.roles?.includes('registrar'));

    return NextResponse.json({
      success: true,
      provider,
      timestamp: new Date().toISOString(),
      confidence: data.objectClassName === 'domain' ? 'high' : 'medium',
      partial: false,
      domain,
      domainName: data.ldhName || data.unicodeName || domain,
      status: data.status || [],
      registrar: registrar ? getEntityName(registrar) : '',
      events,
      nameservers,
      port43: data.port43 || '',
      rdapConformance: data.rdapConformance || [],
      notices: data.notices || [],
      raw: data,
    });
  } catch (error) {
    return jsonError(error);
  }
}
