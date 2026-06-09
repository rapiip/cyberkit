import dns from 'dns';
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

export class PublicTargetError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PublicTargetError';
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback = 'Internal Server Error') {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function jsonError(error: unknown, fallback = 'Internal Server Error') {
  const status = error instanceof PublicTargetError ? error.status : 500;
  return NextResponse.json({ success: false, error: errorMessage(error, fallback) }, { status });
}

export async function cachedJson<T>(key: string, ttlMs: number, producer: () => Promise<T>) {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await producer();
  memoryCache.set(key, { value, expiresAt: now + ttlMs });
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
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new PublicTargetError('DNS resolution timed out', 504)), timeoutMs);
  });
  const records = await Promise.race([lookup, timeout]);
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
    await resolveAndBlockPrivateIp(current.hostname);
    const response = await fetchWithTimeout(
      current,
      {
        ...init,
        redirect: 'manual',
      },
      timeoutMs
    );

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    current = normalizeTargetUrl(location, current);
  }

  throw new PublicTargetError('Too many redirects from target', 508);
}

interface RateLimitOptions {
  endpoint: string;
  ipLimit?: number;
  targetLimit?: number;
  windowMs?: number;
  cooldownMs?: number;
}

const rateBuckets = new Map<string, number[]>();
const cooldownBuckets = new Map<string, number>();

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwarded ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  );
}

function hitBucket(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return bucket.length <= limit ? 0 : Math.ceil((windowMs - (now - bucket[0])) / 1000);
}

export function consumeRateLimit(request: Request, hostname: string, options: RateLimitOptions) {
  const now = Date.now();
  const ip = clientIpFromRequest(request);
  const windowMs = options.windowMs ?? 60_000;
  const ipRetry = hitBucket(`${options.endpoint}:ip:${ip}`, options.ipLimit ?? 30, windowMs);
  if (ipRetry) return { limited: true, retryAfter: ipRetry };

  const targetKey = `${options.endpoint}:target:${ip}:${hostname}`;
  const targetRetry = hitBucket(targetKey, options.targetLimit ?? 10, windowMs);
  if (targetRetry) return { limited: true, retryAfter: targetRetry };

  if (options.cooldownMs) {
    const cooldownKey = `${options.endpoint}:cooldown:${ip}:${hostname}`;
    const last = cooldownBuckets.get(cooldownKey) || 0;
    const remaining = options.cooldownMs - (now - last);
    if (remaining > 0) return { limited: true, retryAfter: Math.ceil(remaining / 1000) };
    cooldownBuckets.set(cooldownKey, now);
  }

  return { limited: false, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` },
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
