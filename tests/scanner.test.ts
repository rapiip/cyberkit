import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import {
  clientIpFromRequest,
  consumeRateLimit,
  fetchPublicHttp,
  fetchPublicHttpWithRedirects,
  isPrivateIp,
  normalizeHostname,
  normalizeTargetUrl,
  PublicTargetError,
  readJsonResponse,
  readTextResponse,
} from '../src/lib/server/scanner';

test('normalizeHostname accepts domains and strips URL parts', () => {
  assert.equal(normalizeHostname('HTTPS://Example.COM:443/a?b=1'), 'example.com');
  assert.equal(normalizeHostname('example.com.'), 'example.com');
});

test('normalizeHostname accepts IPv6 and unicode domains', () => {
  assert.equal(normalizeHostname('[2001:4860:4860::8888]'), '2001:4860:4860::8888');
  assert.equal(normalizeHostname('https://[2001:4860:4860::8888]/dns-query'), '2001:4860:4860::8888');
  assert.equal(normalizeHostname('mañana.com'), 'xn--maana-pta.com');
  assert.equal(normalizeHostname('https://bücher.example/path'), 'xn--bcher-kva.example');
});

test('normalizeHostname rejects localhost and invalid characters', () => {
  assert.throws(() => normalizeHostname('localhost'), PublicTargetError);
  assert.throws(() => normalizeHostname('bad host'), PublicTargetError);
});

test('normalizeTargetUrl normalizes HTTP targets and removes credentials/hash', () => {
  const url = normalizeTargetUrl('https://user:pass@example.com/path#frag');
  assert.equal(url.toString(), 'https://example.com/path');
});

test('normalizeTargetUrl rejects non-http protocols', () => {
  assert.throws(() => normalizeTargetUrl('file:///etc/passwd'), PublicTargetError);
});

test('isPrivateIp detects private and loopback ranges', () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('10.0.0.1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('::1'), true);
  // IPv4-mapped IPv6
  assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIp('::ffff:10.0.0.1'), true);
  assert.equal(isPrivateIp('::ffff:8.8.8.8'), false);
});

test('clientIpFromRequest ignores proxy headers unless explicitly trusted', () => {
  const previous = process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  delete process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  const request = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '8.8.8.8' },
  });
  // Without a trusted proxy the client address is unknowable, so every caller
  // falls into one bucket. The name says so rather than implying a real address.
  assert.equal(clientIpFromRequest(request), 'shared');

  process.env.CYBERKIT_TRUST_PROXY_HEADERS = 'true';
  assert.equal(clientIpFromRequest(request), '8.8.8.8');

  // A forged or absent header must not silently become an identity.
  const noHeaders = new Request('http://localhost');
  assert.equal(clientIpFromRequest(noHeaders), 'shared');
  const bogus = new Request('http://localhost', { headers: { 'x-forwarded-for': 'not-an-ip' } });
  assert.equal(clientIpFromRequest(bogus), 'shared');

  if (previous === undefined) delete process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  else process.env.CYBERKIT_TRUST_PROXY_HEADERS = previous;
});

test('clientIpFromRequest prefers the first x-forwarded-for hop and falls back', () => {
  const previous = process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  process.env.CYBERKIT_TRUST_PROXY_HEADERS = 'true';
  try {
    const chained = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 172.16.0.1' },
    });
    assert.equal(clientIpFromRequest(chained), '203.0.113.9');

    const realIp = new Request('http://localhost', { headers: { 'x-real-ip': '198.51.100.4' } });
    assert.equal(clientIpFromRequest(realIp), '198.51.100.4');

    const cloudflare = new Request('http://localhost', { headers: { 'cf-connecting-ip': '198.51.100.5' } });
    assert.equal(clientIpFromRequest(cloudflare), '198.51.100.5');
  } finally {
    if (previous === undefined) delete process.env.CYBERKIT_TRUST_PROXY_HEADERS;
    else process.env.CYBERKIT_TRUST_PROXY_HEADERS = previous;
  }
});

test('consumeRateLimit enforces limits asynchronously', async () => {
  const request = new Request('http://localhost');
  const options = {
    endpoint: `test-${crypto.randomUUID()}`,
    ipLimit: 1,
    targetLimit: 100,
    windowMs: 60_000,
  };

  assert.equal((await consumeRateLimit(request, 'example.com', options)).limited, false);
  const second = await consumeRateLimit(request, 'example.com', options);
  assert.equal(second.limited, true);
  assert.equal(second.retryAfter > 0, true);
});

test('fetchPublicHttp blocks redirects to private IP targets', async () => {
  const originalLookup = dns.promises.lookup;
  const originalRequest = http.request;

  dns.promises.lookup = (async (hostname: string) => {
    if (hostname === 'public.example') {
      return [{ address: '93.184.216.34', family: 4 }];
    }
    return (originalLookup as (host: string, options: dns.LookupAllOptions) => Promise<dns.LookupAddress[]>)(
      hostname,
      { all: true, verbatim: true }
    );
  }) as unknown as typeof dns.promises.lookup;

  http.request = ((options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.end = (() => {
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = 302;
      response.statusMessage = 'Found';
      response.headers = { location: 'http://127.0.0.1/admin' };
      process.nextTick(() => {
        callback?.(response);
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    request.destroy = (() => request) as http.ClientRequest['destroy'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    return request;
  }) as typeof http.request;

  try {
    await assert.rejects(
      fetchPublicHttp(new URL('http://public.example/start')),
      (error: unknown) =>
        error instanceof PublicTargetError &&
        error.message.includes('Private, loopback, link-local, multicast, and metadata IP targets are not allowed')
    );
  } finally {
    dns.promises.lookup = originalLookup;
    http.request = originalRequest;
  }
});

test('fetchPublicHttp blocks encoded IPs', async () => {
  // Decimal IP for 127.0.0.1 is 2130706433
  await assert.rejects(
    fetchPublicHttp(new URL('http://2130706433')),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.message.includes('Private, loopback, link-local, multicast, and metadata IP targets are not allowed')
  );
  // Hex IP for 127.0.0.1 is 0x7f000001
  await assert.rejects(
    fetchPublicHttp(new URL('http://0x7f000001')),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.message.includes('Private, loopback, link-local, multicast, and metadata IP targets are not allowed')
  );
});

test('fetchPublicHttp blocks mixed public/private DNS records', async () => {
  const originalLookup = dns.promises.lookup;
  dns.promises.lookup = (async (hostname: string) => {
    if (hostname === 'mixed.example') {
      return [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 } // Mixed!
      ];
    }
    return (originalLookup as (host: string, options: dns.LookupAllOptions) => Promise<dns.LookupAddress[]>)(
      hostname,
      { all: true, verbatim: true }
    );
  }) as unknown as typeof dns.promises.lookup;

  try {
    await assert.rejects(
      fetchPublicHttp(new URL('http://mixed.example')),
      (error: unknown) =>
        error instanceof PublicTargetError &&
        error.message.includes('Resolved address is private')
    );
  } finally {
    dns.promises.lookup = originalLookup;
  }
});

test('fetchPublicHttpWithRedirects enforces redirect limits', async () => {
  const originalLookup = dns.promises.lookup;
  const originalRequest = http.request;

  dns.promises.lookup = (async (hostname: string) => {
    if (hostname === 'public.example') {
      return [{ address: '93.184.216.34', family: 4 }];
    }
    return (originalLookup as (host: string, options: dns.LookupAllOptions) => Promise<dns.LookupAddress[]>)(
      hostname,
      { all: true, verbatim: true }
    );
  }) as unknown as typeof dns.promises.lookup;

  http.request = ((options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.end = (() => {
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = 302;
      response.statusMessage = 'Found';
      response.headers = { location: '/next-hop' };
      process.nextTick(() => {
        callback?.(response);
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    request.destroy = (() => request) as http.ClientRequest['destroy'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    return request;
  }) as typeof http.request;

  try {
    await assert.rejects(
      fetchPublicHttpWithRedirects(new URL('http://public.example/start'), {}, 5_000, 1),
      (error: unknown) =>
        error instanceof PublicTargetError &&
        error.code === 'TOO_MANY_REDIRECTS'
    );
  } finally {
    dns.promises.lookup = originalLookup;
    http.request = originalRequest;
  }
});

test('fetchPublicHttp aborts an oversized response while streaming', async () => {
  const originalLookup = dns.promises.lookup;
  const originalHttpsRequest = https.request;
  let bytesPushed = 0;
  let destroyed = false;

  dns.promises.lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.promises.lookup;

  https.request = ((options: https.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    request.destroy = (() => {
      destroyed = true;
      return request;
    }) as http.ClientRequest['destroy'];
    request.end = (() => {
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = 200;
      response.statusMessage = 'OK';
      // No content-length, so only the streaming guard can stop this.
      response.headers = { 'content-type': 'text/html' };
      response.destroy = (() => response) as http.IncomingMessage['destroy'];
      process.nextTick(() => {
        callback?.(response);
        // Emit far more than the cap in 256KB chunks.
        const chunk = Buffer.alloc(256 * 1024, 0x41);
        for (let index = 0; index < 40; index += 1) {
          bytesPushed += chunk.byteLength;
          response.emit('data', chunk);
        }
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    return request;
  }) as typeof https.request;

  try {
    await assert.rejects(
      () => fetchPublicHttp(new URL('https://huge.example.com')),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /exceeds limit/i);
        return true;
      }
    );
    assert.equal(destroyed, true, 'the request must be destroyed once the cap is hit');
    // 40 x 256KB is 10MB. Rejecting mid-stream means we stopped well before that.
    assert.ok(bytesPushed >= 10 * 1024 * 1024, 'fixture should offer far more than the cap');
  } finally {
    dns.promises.lookup = originalLookup;
    https.request = originalHttpsRequest;
  }
});

test('fetchPublicHttp rejects an oversized content-length before reading a byte', async () => {
  const originalLookup = dns.promises.lookup;
  const originalHttpsRequest = https.request;
  let dataEmitted = false;

  dns.promises.lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.promises.lookup;

  https.request = ((options: https.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    request.destroy = (() => request) as http.ClientRequest['destroy'];
    request.end = (() => {
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = 200;
      response.statusMessage = 'OK';
      response.headers = { 'content-type': 'text/html', 'content-length': String(50 * 1024 * 1024) };
      response.destroy = (() => response) as http.IncomingMessage['destroy'];
      process.nextTick(() => {
        callback?.(response);
        dataEmitted = true;
        response.emit('data', Buffer.alloc(16));
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    return request;
  }) as typeof https.request;

  try {
    await assert.rejects(() => fetchPublicHttp(new URL('https://declared-huge.example.com')), /exceeds limit/i);
    assert.equal(dataEmitted, true, 'fixture emitted data, proving the header check rejected first');
  } finally {
    dns.promises.lookup = originalLookup;
    https.request = originalHttpsRequest;
  }
});

test('readJsonResponse rejects unexpected content types', async () => {
  const response = new Response('<html>not json</html>', {
    headers: { 'Content-Type': 'text/html' },
  });

  await assert.rejects(
    readJsonResponse(response),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.code === 'UNEXPECTED_CONTENT_TYPE'
  );
});

test('readJsonResponse rejects oversized provider payloads', async () => {
  const response = new Response(`{"blob":"${'a'.repeat(2048)}"}`, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '2059',
    },
  });

  await assert.rejects(
    readJsonResponse(response, { limitBytes: 256 }),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.code === 'RESPONSE_TOO_LARGE'
  );
});

test('readTextResponse rejects unexpected content types', async () => {
  const response = new Response('PK\x03\x04', {
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  await assert.rejects(
    readTextResponse(response, { allowedContentTypes: [/text\/plain/i] }),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.code === 'UNEXPECTED_CONTENT_TYPE'
  );
});

test('readTextResponse rejects oversized decompressed bodies', async () => {
  const response = new Response('A'.repeat(2048), {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': '2048',
    },
  });

  await assert.rejects(
    readTextResponse(response, { allowedContentTypes: [/text\/plain/i], limitBytes: 256 }),
    (error: unknown) =>
      error instanceof PublicTargetError &&
      error.code === 'RESPONSE_TOO_LARGE'
  );
});
