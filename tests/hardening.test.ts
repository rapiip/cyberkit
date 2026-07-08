import test from 'node:test';
import assert from 'node:assert/strict';
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

test('fetchPublicHttp blocks invalid certs unless explicit allowUntrustedCerts is true', async () => {
  // We use expired.badssl.com to test invalid certs
  await assert.rejects(
    () => fetchPublicHttp(new URL('https://expired.badssl.com')),
    /expired|ECONNRESET|CERT_/i
  );
  
  // If explicitly allowed, it should succeed and mark header
  const response = await fetchPublicHttp(
    new URL('https://expired.badssl.com'),
    { allowUntrustedCerts: true }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-CyberKit-Untrusted-Cert'), 'true');
});
