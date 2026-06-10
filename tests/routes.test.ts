import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as dnsPost } from '../src/app/api/dns/route';
import { POST as auditPost } from '../src/app/api/audit/route';
import { POST as pwnedPasswordPost } from '../src/app/api/pwned-password/route';
import { POST as syncPost, PUT as syncPut } from '../src/app/api/sync/route';
import type { EncryptedSyncEnvelope } from '../src/lib/security/cloud-sync';

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
  assert.equal(data.errorCode, 'INVALID_HASH_PREFIX');
});

test('pwned password route rejects SHA-1 suffixes', async () => {
  const response = await pwnedPasswordPost(
    jsonRequest({
      hashPrefix: 'ABCDE',
      hashSuffix: '1234567890ABCDEF1234567890ABCDEF123',
    })
  );
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.errorCode, 'INVALID_HASH_PREFIX');
});

test('pwned password route returns a parsed HIBP range without matching suffixes', async () => {
  const originalFetch = globalThis.fetch;
  const hashPrefix = 'ABCDE';
  const hashSuffix = '1234567890ABCDEF1234567890ABCDEF123';

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), `https://api.pwnedpasswords.com/range/${hashPrefix}`);
    return new Response(`${hashSuffix}:42\n00000000000000000000000000000000000:1`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }) as typeof fetch;

  try {
    const response = await pwnedPasswordPost(jsonRequest({ hashPrefix }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'Have I Been Pwned Pwned Passwords');
    assert.equal(data.hashPrefix, hashPrefix);
    assert.deepEqual(data.range, [
      { suffix: hashSuffix, count: 42 },
      { suffix: '00000000000000000000000000000000000', count: 1 },
    ]);
    assert.equal('pwned' in data, false);
    assert.equal('breachCount' in data, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sync route reports missing cloud storage configuration', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const response = await syncPost(jsonRequest({ syncId: 'device-backup' }));
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

test('sync route stores only the encrypted envelope with retention TTL', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousRetention = process.env.CLOUD_SYNC_RETENTION_DAYS;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.CLOUD_SYNC_RETENTION_DAYS = '7';
  const envelope: EncryptedSyncEnvelope = {
    version: 1,
    ciphertext: 'A'.repeat(32),
    iv: 'A'.repeat(16),
    salt: 'A'.repeat(22) + '==',
    timestamp: new Date(0).toISOString(),
  };
  let redisCommand: unknown[] = [];
  globalThis.fetch = (async (_input, init) => {
    const pipeline = JSON.parse(String(init?.body)) as unknown[][];
    if (pipeline.length === 3 && pipeline[0]?.[0] === 'INCR') {
      return Response.json([{ result: 1 }, { result: 1 }, { result: 60_000 }]);
    }
    redisCommand = pipeline[0];
    return Response.json([{ result: 'OK' }]);
  }) as typeof fetch;

  try {
    const response = await syncPut(jsonRequest({ syncId: 'device-backup', envelope }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.version, 1);
    assert.equal(redisCommand[0], 'SET');
    assert.equal(redisCommand[3], 'EX');
    assert.equal(redisCommand[4], 7 * 86_400);
    const stored = JSON.parse(String(redisCommand[2])) as Record<string, unknown>;
    assert.deepEqual(Object.keys(stored).sort(), ['ciphertext', 'iv', 'salt', 'timestamp', 'version']);
    assert.equal(JSON.stringify(redisCommand).includes('passphrase'), false);
    assert.equal(JSON.stringify(redisCommand).includes('"history"'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    if (previousRetention === undefined) delete process.env.CLOUD_SYNC_RETENTION_DAYS;
    else process.env.CLOUD_SYNC_RETENTION_DAYS = previousRetention;
  }
});

test('sync route rejects plaintext and passphrase fields', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  try {
    const response = await syncPut(
      jsonRequest({ syncId: 'device-backup', passphrase: 'never-send-this', data: { history: [] } })
    );
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.errorCode, 'INVALID_SYNC_REQUEST');
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test('sync restore returns only the encrypted envelope', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const envelope: EncryptedSyncEnvelope = {
    version: 1,
    ciphertext: 'A'.repeat(32),
    iv: 'A'.repeat(16),
    salt: 'A'.repeat(22) + '==',
    timestamp: new Date().toISOString(),
  };
  globalThis.fetch = (async (_input, init) => {
    const pipeline = JSON.parse(String(init?.body)) as unknown[][];
    if (pipeline.length === 3) {
      return Response.json([{ result: 1 }, { result: 1 }, { result: 60_000 }]);
    }
    return Response.json([{ result: JSON.stringify(envelope) }]);
  }) as typeof fetch;
  try {
    const response = await syncPost(jsonRequest({ syncId: 'device-restore' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.found, true);
    assert.deepEqual(data.envelope, envelope);
    assert.equal('data' in data, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
