import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as dnsPost } from '../src/app/api/dns/route';
import { POST as auditPost } from '../src/app/api/audit/route';
import { POST as pwnedPasswordPost } from '../src/app/api/pwned-password/route';
import { POST as syncPost } from '../src/app/api/sync/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('dns route returns structured validation errors', async () => {
  const response = await dnsPost(jsonRequest({ hostname: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_HOSTNAME');
  assert.equal(typeof data.message, 'string');
  assert.equal(typeof data.retryable, 'boolean');
});

test('audit route returns structured validation errors', async () => {
  const response = await auditPost(jsonRequest({ url: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_URL');
  assert.equal(typeof data.message, 'string');
  assert.equal(typeof data.retryable, 'boolean');
});

test('pwned password route rejects plaintext password payloads', async () => {
  const response = await pwnedPasswordPost(jsonRequest({ password: 'password' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_HASH_RANGE');
});

test('sync route reports missing cloud storage configuration', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const response = await syncPost(jsonRequest({ syncKey: '1234567890abcdef' }));
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.success, false);
    assert.equal(data.errorCode, 'SYNC_NOT_CONFIGURED');
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
