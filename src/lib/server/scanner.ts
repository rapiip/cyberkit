import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import { NextResponse } from 'next/server';
import { domainToASCII } from 'url';

const dnsPromises = dns.promises;

export const TIMEOUTS = {
  httpMs: 7000,
  tlsMs: 5000,
  cveKevMs: 10000,
  dnsRdapMs: 8000,
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const memoryCounters = new Map<string, CacheEntry<number>>();
const MEMORY_MAX_KEYS = 2_000;

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

export async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, timeoutMs = TIMEOUTS.httpMs) {
  const timeout = withTimeoutSignal(timeoutMs);
  try {
    return await fetch(input, { ...init, signal: timeout.signal });
  } finally {
    timeout.clear();
  }
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

export async function fetchPublicHttp(url: URL, init: RequestInit = {}, timeoutMs = TIMEOUTS.httpMs, maxRedirects = 4) {
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

function responseHeadersFromNode(headers: http.IncomingHttpHeaders) {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => result.append(key, item));
    else if (value !== undefined) result.set(key, String(value));
  }
  return result;
}

async function requestPublicHttp(targetUrl: URL, init: RequestInit, timeoutMs: number) {
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
    options.rejectUnauthorized = false;
  }

  const body =
    typeof init.body === 'string' || init.body instanceof Buffer
      ? init.body
      : init.body instanceof URLSearchParams
        ? init.body.toString()
        : undefined;

  return new Promise<Response>((resolve, reject) => {
    const transport = isHttps ? https : http;
    const req = transport.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const response = new Response(Buffer.concat(chunks), {
          status: res.statusCode || 0,
          statusText: res.statusMessage,
          headers: responseHeadersFromNode(res.headers),
        });
        Object.defineProperty(response, 'url', { value: targetUrl.toString() });
        resolve(response);
      });
    });

    req.on('timeout', () => {
      req.destroy(new PublicTargetError('HTTP request timed out', 504, 'HTTP_TIMEOUT', true));
    });
    req.on('error', reject);
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

export function clientIpFromRequest(request: Request) {
  if (process.env.CYBERKIT_TRUST_PROXY_HEADERS === 'true') {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const proxyIp = forwarded || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
    if (proxyIp && net.isIP(proxyIp)) return proxyIp;
  }
  return 'local';
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
