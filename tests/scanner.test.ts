import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clientIpFromRequest,
  consumeRateLimit,
  isPrivateIp,
  normalizeHostname,
  normalizeTargetUrl,
  PublicTargetError,
} from '../src/lib/server/scanner';

test('normalizeHostname accepts domains and strips URL parts', () => {
  assert.equal(normalizeHostname('HTTPS://Example.COM:443/a?b=1'), 'example.com');
  assert.equal(normalizeHostname('example.com.'), 'example.com');
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
});

test('clientIpFromRequest ignores proxy headers unless explicitly trusted', () => {
  const previous = process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  delete process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  const request = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '8.8.8.8' },
  });
  assert.equal(clientIpFromRequest(request), 'local');

  process.env.CYBERKIT_TRUST_PROXY_HEADERS = 'true';
  assert.equal(clientIpFromRequest(request), '8.8.8.8');
  if (previous === undefined) delete process.env.CYBERKIT_TRUST_PROXY_HEADERS;
  else process.env.CYBERKIT_TRUST_PROXY_HEADERS = previous;
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
