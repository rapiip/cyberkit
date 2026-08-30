import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { logger } from '../src/lib/server/logger';
import { fetchPublicHttp } from '../src/lib/server/scanner';
import { GET as healthGet } from '../src/app/api/health/route';

test('logger strips sensitive fields and includes correct structure', () => {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(chunk);
    return true;
  }) as typeof process.stdout.write;

  try {
    logger.info('Test log', {
      latencyMs: 120,
      provider: 'test-provider',
      status: 200,
      password: 'super-secret',
      token: 'jwt-token',
      url: 'https://evil.com?apiKey=secret',
      ip: '192.168.1.1'
    });
    
    assert.equal(chunks.length, 1);
    const parsed = JSON.parse(chunks[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.message, 'Test log');
    assert.equal(parsed.latencyMs, 120);
    assert.equal(parsed.provider, 'test-provider');
    
    // Sensitive fields must be stripped
    assert.equal('password' in parsed, false);
    assert.equal('token' in parsed, false);
    assert.equal('url' in parsed, false);
    assert.equal('ip' in parsed, false);
  } finally {
    process.stdout.write = originalWrite;
  }
});

test('health route returns status ok even without providers', async () => {
  const previousRedis = process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  
  try {
    const response = await healthGet();
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.providers.redis, false);
  } finally {
    if (previousRedis) process.env.UPSTASH_REDIS_REST_URL = previousRedis;
  }
});

test('fetchPublicHttp only disables certificate validation when explicitly opted in', async () => {
  // Offline equivalent of the live badssl.com check in
  // tests/network/tls-trust.spec.ts. Asserting on the transport options keeps CI
  // deterministic while still pinning the security-relevant behaviour: TLS
  // validation must stay on unless the caller opts out, and an opted-out
  // response must be labelled.
  const originalLookup = dns.promises.lookup;
  const originalHttpsRequest = https.request;
  const observed: https.RequestOptions[] = [];

  dns.promises.lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.promises.lookup;

  https.request = ((options: https.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {
    observed.push(options);
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    request.destroy = (() => request) as http.ClientRequest['destroy'];
    request.end = (() => {
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = 200;
      response.statusMessage = 'OK';
      response.headers = { 'content-type': 'text/html' };
      process.nextTick(() => {
        callback?.(response);
        response.emit('data', Buffer.from('<html></html>'));
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    return request;
  }) as typeof https.request;

  try {
    const strict = await fetchPublicHttp(new URL('https://strict.example.com'));
    assert.equal(strict.status, 200);
    assert.equal(strict.headers.get('X-CyberKit-Untrusted-Cert'), null);
    // Absent means Node's default of rejectUnauthorized: true.
    assert.equal(observed.at(-1)?.rejectUnauthorized, undefined);

    const relaxed = await fetchPublicHttp(new URL('https://relaxed.example.com'), {
      allowUntrustedCerts: true,
    });
    assert.equal(relaxed.status, 200);
    assert.equal(relaxed.headers.get('X-CyberKit-Untrusted-Cert'), 'true');
    assert.equal(observed.at(-1)?.rejectUnauthorized, false);
    // SNI must still carry the real hostname even though the socket connects to
    // the pinned address.
    assert.equal(observed.at(-1)?.servername, 'relaxed.example.com');
    assert.equal(observed.at(-1)?.host, '93.184.216.34');
  } finally {
    dns.promises.lookup = originalLookup;
    https.request = originalHttpsRequest;
  }
});
