import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import { NextResponse } from 'next/server';
import { domainToASCII } from 'url';
import { logger } from './logger';

const dnsPromises = dns.promises;

export const TIMEOUTS = {
  httpMs: 7000,
  tlsMs: 5000,
  cveKevMs: 10000,
  dnsRdapMs: 8000,
};

export const OUTBOUND_LIMITS = {
  maxRedirects: 4,
  maxBodyBytes: 512 * 1024,
  maxDecompressedBytes: 1024 * 1024,
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const memoryCounters = new Map<string, CacheEntry<number>>();
const MEMORY_MAX_KEYS = 2_000;

/**
 * Clears the process-local cache and rate-limit counters.
 *
 * Only affects the in-memory fallback; Redis-backed state is untouched. Used by
 * tests to isolate cases that would otherwise share cached provider payloads or
 * rate-limit buckets across assertions.
 */
export function resetScannerState() {
  memoryCache.clear();
  memoryCounters.clear();
}

function boundedSet<T>(store: Map<string, CacheEntry<T>>, key: string, value: CacheEntry<T>) {
  if (store.size >= MEMORY_MAX_KEYS) {
    const now = Date.now();
    for (const [entryKey, entry] of store) {
      if (entry.expiresAt <= now || store.size >= MEMORY_MAX_KEYS) store.delete(entryKey);
      if (store.size < MEMORY_MAX_KEYS) break;
    }
  }
  store.set(key, value);
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function upstashCommand<T>(command: unknown[]) {
  const config = upstashConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  });

  if (!response.ok) throw new Error(`Upstash Redis returned HTTP ${response.status}`);
  const payload = (await response.json()) as [{ result?: T; error?: string }];
  if (payload[0]?.error) throw new Error(payload[0].error);
  return payload[0]?.result ?? null;
}

async function upstashPipeline(commands: unknown[][]) {
  const config = upstashConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) throw new Error(`Upstash Redis returned HTTP ${response.status}`);
  return (await response.json()) as { result?: unknown; error?: string }[];
}

function keyPart(value: string) {
  return Buffer.from(value).toString('base64url').slice(0, 160);
}

export class PublicTargetError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  details?: string;

  constructor(message: string, status = 400, code = 'INVALID_TARGET', retryable = false, details?: string) {
    super(message);
    this.name = 'PublicTargetError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function errorMessage(error: unknown, fallback = 'Internal Server Error') {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function jsonError(error: unknown, fallback = 'Internal Server Error') {
  const status = error instanceof PublicTargetError ? error.status : 500;
  const message = errorMessage(error, fallback);
  const errorCode = error instanceof PublicTargetError ? error.code : 'INTERNAL_ERROR';
  const retryable = error instanceof PublicTargetError ? error.retryable : status >= 500;
  const details = error instanceof PublicTargetError ? error.details : undefined;
  return NextResponse.json(
    {
      success: false,
      errorCode,
      message,
      details,
      retryable,
      error: message,
    },
    { status }
  );
}

export function errorResponse(
  message: string,
  status = 400,
  errorCode = 'BAD_REQUEST',
  retryable = false,
  details?: string
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      message,
      details,
      retryable,
      error: message,
    },
    { status }
  );
}

export async function cachedJson<T>(key: string, ttlMs: number, producer: () => Promise<T>) {
  const now = Date.now();
  const redisKey = `cyberkit:cache:${keyPart(key)}`;

  try {
    const external = await upstashCommand<string>(['GET', redisKey]);
    if (external) return JSON.parse(external) as T;
  } catch {
    // Local memory cache remains the fallback when Redis is unavailable.
  }

  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await producer();
  boundedSet(memoryCache, key, { value, expiresAt: now + ttlMs });
  try {
    await upstashCommand(['SET', redisKey, JSON.stringify(value), 'PX', ttlMs]);
  } catch {
    // Caching must never fail the user-facing lookup.
  }
  return value;
}

export function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

export interface CyberKitRequestInit extends RequestInit {
  allowUntrustedCerts?: boolean;
  /**
   * Hard cap on the bytes buffered from the target, enforced while streaming.
   * Defaults to OUTBOUND_LIMITS.maxDecompressedBytes.
   */
  maxResponseBytes?: number;
}

export async function fetchWithTimeout(input: string | URL, init: CyberKitRequestInit = {}, timeoutMs = TIMEOUTS.httpMs) {
  const timeout = withTimeoutSignal(timeoutMs);
  try {
    return await fetch(input, { redirect: 'manual', ...init, signal: timeout.signal });
  } finally {
    timeout.clear();
  }
}

export async function fetchWithRetry(
  input: string | URL,
  init: CyberKitRequestInit = {},
  timeoutMs = TIMEOUTS.httpMs,
  attempts = 2
) {
  let lastError: unknown;
  const startTime = Date.now();
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      if (response.status >= 500 && attempt < attempts) continue;
      logger.info('fetchWithRetry success', {
        provider: typeof input === 'string' ? new URL(input).hostname : input.hostname,
        latencyMs: Date.now() - startTime,
        status: response.status,
        retryCount: attempt - 1,
      });
      return response;
    } catch (error) {
      lastError = error;
      logger.warn('fetchWithRetry attempt failed', {
        provider: typeof input === 'string' ? new URL(input).hostname : input.hostname,
        errorCategory: 'NETWORK_ERROR',
        retryCount: attempt - 1,
      }, error);
      if (attempt === attempts) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export function isJsonLikeContentType(value: string | null) {
  return value ? /\bapplication\/(?:[\w.+-]*\+)?json\b/i.test(value) : false;
}

export function isTextLikeContentType(value: string | null) {
  return value ? /^(text\/|application\/xml\b|application\/javascript\b|application\/x-javascript\b|application\/rss\+xml\b|application\/atom\+xml\b)/i.test(value) : false;
}

async function readLimitedBody(response: Response, limitBytes: number) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > limitBytes) {
    throw new PublicTargetError(`Response exceeds limit of ${limitBytes} bytes`, 502, 'RESPONSE_TOO_LARGE');
  }

  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limitBytes) {
      reader.cancel().catch(() => undefined);
      throw new PublicTargetError(`Response exceeds limit of ${limitBytes} bytes`, 502, 'RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

export async function readJsonResponse<T>(response: Response, options?: { allowedContentTypes?: RegExp[]; limitBytes?: number }) {
  const allowed = options?.allowedContentTypes ?? [/\bjson\b/i];
  const contentType = response.headers.get('content-type');
  if (contentType && !allowed.some((pattern) => pattern.test(contentType))) {
    throw new PublicTargetError(`Unexpected content-type: ${contentType}`, 502, 'UNEXPECTED_CONTENT_TYPE');
  }
  const bytes = await readLimitedBody(response, options?.limitBytes ?? OUTBOUND_LIMITS.maxBodyBytes);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new PublicTargetError('Provider returned invalid JSON', 502, 'INVALID_PROVIDER_JSON');
  }
}

export async function readTextResponse(response: Response, options?: { allowedContentTypes?: RegExp[]; limitBytes?: number }) {
  const allowed = options?.allowedContentTypes;
  const contentType = response.headers.get('content-type');
  if (allowed && contentType && !allowed.some((pattern) => pattern.test(contentType))) {
    throw new PublicTargetError(`Unexpected content-type: ${contentType}`, 502, 'UNEXPECTED_CONTENT_TYPE');
  }
  const bytes = await readLimitedBody(response, options?.limitBytes ?? OUTBOUND_LIMITS.maxDecompressedBytes);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function normalizeHostname(input: string) {
  let host = input.trim();
  if (!host) throw new PublicTargetError('Hostname is required');

  if (/^https?:\/\//i.test(host)) {
    host = new URL(host).hostname;
  } else {
    host = host.split('/')[0].split('?')[0].split('#')[0];
    if (host.includes('@')) host = host.split('@').pop() || host;
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
    const portIndex = host.lastIndexOf(':');
    if (portIndex > -1 && net.isIP(host) === 0 && /^\d+$/.test(host.slice(portIndex + 1))) {
      host = host.slice(0, portIndex);
    }
  }

  host = host.replace(/\.$/, '').toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (net.isIP(host)) return host;

  const ascii = domainToASCII(host);
  if (!ascii || ascii.length > 253) throw new PublicTargetError('Invalid hostname');
  if (ascii === 'localhost' || ascii.endsWith('.localhost')) {
    throw new PublicTargetError('Localhost targets are not allowed');
  }
  if (/[^\w.-]/.test(ascii) && net.isIP(ascii) === 0) {
    throw new PublicTargetError('Invalid hostname characters');
  }
  if (ascii.includes('..') || ascii.startsWith('.') || ascii.endsWith('-')) {
    throw new PublicTargetError('Invalid hostname format');
  }
  return ascii;
}

export function normalizeTargetUrl(input: string, base?: URL) {
  const trimmed = input.trim();
  if (!trimmed) throw new PublicTargetError('URL is required');

  let candidate = trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate) && !/^https?:\/\//i.test(candidate)) {
    throw new PublicTargetError('Only HTTP and HTTPS URLs are supported', 400, 'UNSUPPORTED_PROTOCOL');
  }
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = base ? new URL(candidate, base).toString() : `https://${candidate}`;
  }

  const url = new URL(candidate);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new PublicTargetError('Only HTTP and HTTPS URLs are supported');
  }
  url.username = '';
  url.password = '';
  url.hash = '';
  normalizeHostname(url.hostname);
  return url;
}

function ipv4ToLong(ip: string) {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return ((parts[0] * 2 ** 24) + (parts[1] * 2 ** 16) + (parts[2] * 2 ** 8) + parts[3]) >>> 0;
}

function isPrivateIpv4(ip: string) {
  const value = ipv4ToLong(ip);
  if (value === null) return false;
  const ranges: [number, number][] = [
    [0x00000000, 0x00ffffff],
    [0x0a000000, 0x0affffff],
    [0x7f000000, 0x7fffffff],
    [0xa9fe0000, 0xa9feffff],
    [0xac100000, 0xac1fffff],
    [0xc0a80000, 0xc0a8ffff],
    [0x64400000, 0x647fffff],
    [0xc0000000, 0xc00000ff],
    [0xc0000200, 0xc00002ff],
    [0xc6336400, 0xc63364ff],
    [0xcb007100, 0xcb0071ff],
    [0xe0000000, 0xffffffff],
  ];
  return ranges.some(([start, end]) => value >= start && value <= end);
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:')) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export function isPrivateIp(ip: string) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
}

export async function resolveAndBlockPrivateIp(hostname: string, timeoutMs = TIMEOUTS.dnsRdapMs) {
  const host = normalizeHostname(hostname);
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new PublicTargetError('Private, loopback, link-local, multicast, and metadata IP targets are not allowed');
    return [host];
  }

  const lookup = dnsPromises.lookup(host, { all: true, verbatim: true });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new PublicTargetError('DNS resolution timed out', 504, 'DNS_TIMEOUT', true)), timeoutMs);
  });
  const records = await Promise.race([lookup, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
  const addresses = records.map((record) => record.address);
  if (!addresses.length) throw new PublicTargetError('Hostname did not resolve', 404);
  if (addresses.some(isPrivateIp)) {
    throw new PublicTargetError('Resolved address is private, loopback, link-local, multicast, or metadata IP');
  }
  return addresses;
}

export async function assertPublicHostname(hostname: string) {
  const host = normalizeHostname(hostname);
  await resolveAndBlockPrivateIp(host);
  return host;
}

export async function fetchPublicHttp(
  url: URL,
  init: CyberKitRequestInit = {},
  timeoutMs = TIMEOUTS.httpMs,
  maxRedirects = OUTBOUND_LIMITS.maxRedirects
) {
  let current = new URL(url);
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await requestPublicHttp(current, init, timeoutMs);

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    current = normalizeTargetUrl(location, current);
  }

  throw new PublicTargetError('Too many redirects from target', 508);
}

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export async function fetchPublicHttpWithRedirects(
  url: URL,
  init: CyberKitRequestInit = {},
  timeoutMs = TIMEOUTS.httpMs,
  maxRedirects = OUTBOUND_LIMITS.maxRedirects
) {
  let current = new URL(url);
  const redirectChain: RedirectHop[] = [];
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await requestPublicHttp(current, init, timeoutMs);
    const location = response.headers.get('location') || undefined;
    redirectChain.push({ url: current.toString(), status: response.status, location });
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      return { response, redirectChain, finalUrl: current };
    }
    current = normalizeTargetUrl(location, current);
  }
  throw new PublicTargetError('Too many redirects from target', 508, 'TOO_MANY_REDIRECTS');
}

function responseHeadersFromNode(headers: http.IncomingHttpHeaders) {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => result.append(key, item));
    else if (value !== undefined) result.set(key, String(value));
  }
  return result;
}

/**
 * Statuses the Fetch spec defines as null-body. Constructing a `Response` with a
 * body for any of these throws a TypeError.
 */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

export function isNullBodyStatus(status: number) {
  return NULL_BODY_STATUSES.has(status);
}

/**
 * The `Response` constructor only accepts 200-599. Node can report an undefined
 * status on a malformed reply, which previously produced status 0 and threw.
 */
export function normalizeResponseStatus(status: number | undefined) {
  if (typeof status !== 'number' || !Number.isFinite(status)) return 502;
  if (status < 200 || status > 599) return 502;
  return Math.trunc(status);
}

async function requestPublicHttp(targetUrl: URL, init: CyberKitRequestInit, timeoutMs: number) {
  const addresses = await resolveAndBlockPrivateIp(targetUrl.hostname);
  const address = addresses[0];
  const isHttps = targetUrl.protocol === 'https:';
  const port = Number(targetUrl.port || (isHttps ? 443 : 80));
  const method = init.method || 'GET';
  const requestHeaders = new Headers(init.headers);
  requestHeaders.set('Host', targetUrl.host);

  const options: http.RequestOptions & https.RequestOptions = {
    host: address,
    port,
    method,
    path: `${targetUrl.pathname}${targetUrl.search}`,
    headers: Object.fromEntries(requestHeaders.entries()),
    timeout: timeoutMs,
  };

  if (isHttps) {
    options.servername = targetUrl.hostname;
    if (init.allowUntrustedCerts) {
      options.rejectUnauthorized = false;
    }
  }

  const body =
    typeof init.body === 'string' || init.body instanceof Buffer
      ? init.body
      : init.body instanceof URLSearchParams
        ? init.body.toString()
        : undefined;

  const startTime = Date.now();
  // Enforced while streaming. OUTBOUND_LIMITS was previously only applied by
  // readJsonResponse/readTextResponse, which run after the entire body is already
  // buffered here, and routes that call response.text() directly skipped the check
  // altogether. A hostile or merely huge target could therefore make the server
  // accumulate unbounded memory before any limit was consulted.
  const maxResponseBytes = init.maxResponseBytes ?? OUTBOUND_LIMITS.maxDecompressedBytes;

  return new Promise<Response>((resolve, reject) => {
    const transport = isHttps ? https : http;
    const req = transport.request(options, (res) => {
      const declaredLength = Number(res.headers['content-length'] || 0);
      if (declaredLength > maxResponseBytes) {
        res.destroy();
        req.destroy();
        reject(
          new PublicTargetError(
            `Response exceeds limit of ${maxResponseBytes} bytes`,
            502,
            'RESPONSE_TOO_LARGE'
          )
        );
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      let aborted = false;

      res.on('data', (chunk: Buffer) => {
        if (aborted) return;
        received += chunk.byteLength;
        if (received > maxResponseBytes) {
          aborted = true;
          res.destroy();
          req.destroy();
          logger.warn('requestPublicHttp response too large', {
            provider: targetUrl.hostname,
            errorCategory: 'RESPONSE_TOO_LARGE',
          });
          reject(
            new PublicTargetError(
              `Response exceeds limit of ${maxResponseBytes} bytes`,
              502,
              'RESPONSE_TOO_LARGE'
            )
          );
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (aborted) return;
        const latencyMs = Date.now() - startTime;
        const responseHeaders = responseHeadersFromNode(res.headers);
        if (init.allowUntrustedCerts) {
          responseHeaders.set('X-CyberKit-Untrusted-Cert', 'true');
        }
        const payload = Buffer.concat(chunks);
        const status = normalizeResponseStatus(res.statusCode);
        const response = new Response(
          // The Fetch spec forbids a body on null-body statuses. A CORS preflight
          // answered correctly returns 204, so passing the buffer unconditionally
          // made the Response constructor throw and broke the whole scan.
          isNullBodyStatus(status) ? null : payload,
          {
            status,
            statusText: res.statusMessage,
            headers: responseHeaders,
          }
        );
        Object.defineProperty(response, 'url', { value: targetUrl.toString() });
        Object.defineProperty(response, 'cyberkitUpstreamStatus', { value: res.statusCode ?? null });
        logger.info('requestPublicHttp success', {
          provider: targetUrl.hostname,
          latencyMs,
          status: response.status,
        });
        resolve(response);
      });
    });

    req.on('timeout', () => {
      const latencyMs = Date.now() - startTime;
      logger.warn('requestPublicHttp timeout', {
        provider: targetUrl.hostname,
        latencyMs,
        errorCategory: 'NETWORK_ERROR',
        timeout: true,
      });
      req.destroy(new PublicTargetError('HTTP request timed out', 504, 'HTTP_TIMEOUT', true));
    });
    req.on('error', (err) => {
      const latencyMs = Date.now() - startTime;
      logger.error('requestPublicHttp error', {
        provider: targetUrl.hostname,
        latencyMs,
        errorCategory: 'NETWORK_ERROR',
      }, err);
      reject(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

interface RateLimitOptions {
  endpoint: string;
  ipLimit?: number;
  targetLimit?: number;
  windowMs?: number;
  cooldownMs?: number;
}

/** Emitted once per process so the warning does not flood the log. */
let warnedAboutSharedRateLimitBucket = false;

/**
 * Identifies the caller for rate limiting.
 *
 * A Route Handler only sees HTTP headers, so without a trusted proxy header the
 * real client address is genuinely unknowable. In that case every caller shares
 * the key `'shared'`, which means the per-IP budget behaves as a single global
 * budget: one busy user can exhaust it for everyone. The per-target budget still
 * applies per hostname and remains the meaningful control.
 *
 * Set `CYBERKIT_TRUST_PROXY_HEADERS=true` only when your deployment owns the
 * proxy chain that writes x-forwarded-for/x-real-ip/cf-connecting-ip. If those
 * headers can be supplied by the client they can also be forged to sidestep the
 * limit entirely.
 */
export function clientIpFromRequest(request: Request) {
  if (process.env.CYBERKIT_TRUST_PROXY_HEADERS === 'true') {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const proxyIp = forwarded || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
    if (proxyIp && net.isIP(proxyIp)) return proxyIp;
  }

  if (process.env.NODE_ENV === 'production' && !warnedAboutSharedRateLimitBucket) {
    warnedAboutSharedRateLimitBucket = true;
    logger.warn('Per-IP rate limiting is degraded to a single shared bucket', {
      errorCategory: 'SECURITY_EVENT',
      reason: 'CYBERKIT_TRUST_PROXY_HEADERS is not enabled, so the client address cannot be determined',
    });
  }

  return 'shared';
}

async function hitBucket(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const externalKey = `cyberkit:rate:${keyPart(key)}`;

  try {
    const results = await upstashPipeline([
      ['INCR', externalKey],
      ['PEXPIRE', externalKey, windowMs],
      ['PTTL', externalKey],
    ]);
    if (results) {
      const count = Number(results[0]?.result || 0);
      const ttl = Math.max(0, Number(results[2]?.result || windowMs));
      return count <= limit ? 0 : Math.ceil(ttl / 1000);
    }
  } catch {
    // Fall back to bounded in-memory counters for local development.
  }

  const entry = memoryCounters.get(key);
  const nextValue = entry && entry.expiresAt > now ? entry.value + 1 : 1;
  const expiresAt = entry && entry.expiresAt > now ? entry.expiresAt : now + windowMs;
  boundedSet(memoryCounters, key, { value: nextValue, expiresAt });
  return nextValue <= limit ? 0 : Math.ceil((expiresAt - now) / 1000);
}

export async function consumeRateLimit(request: Request, hostname: string, options: RateLimitOptions) {
  const now = Date.now();
  const ip = clientIpFromRequest(request);
  const windowMs = options.windowMs ?? 60_000;
  const ipRetry = await hitBucket(`${options.endpoint}:ip:${ip}`, options.ipLimit ?? 30, windowMs);
  if (ipRetry) return { limited: true, retryAfter: ipRetry };

  const targetKey = `${options.endpoint}:target:${ip}:${hostname}`;
  const targetRetry = await hitBucket(targetKey, options.targetLimit ?? 10, windowMs);
  if (targetRetry) return { limited: true, retryAfter: targetRetry };

  if (options.cooldownMs) {
    const cooldownKey = `${options.endpoint}:cooldown:${ip}:${hostname}`;
    const cooldown = memoryCounters.get(cooldownKey);
    const remaining = cooldown && cooldown.expiresAt > now ? cooldown.expiresAt - now : 0;
    if (remaining > 0) return { limited: true, retryAfter: Math.ceil(remaining / 1000) };
    await hitBucket(cooldownKey, 1, options.cooldownMs);
  }

  return { limited: false, retryAfter: 0 };
}

export function getHeaderValues(headers: Headers, name: string) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (name.toLowerCase() === 'set-cookie' && typeof getSetCookie === 'function') {
    return getSetCookie.call(headers);
  }
  const value = headers.get(name);
  return value ? [value] : [];
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      errorCode: 'RATE_LIMITED',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      details: `Retry after ${retryAfter} seconds.`,
      retryable: true,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function parseJsonBody<T extends Record<string, unknown>>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new PublicTargetError('Invalid JSON request body');
  }
}

export function envHeader(name: string, header: string) {
  const value = process.env[name];
  return value ? { [header]: value } : {};
}

export type SerializableRecord = Record<string, JsonValue>;
