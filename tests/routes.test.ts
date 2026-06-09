import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as dnsPost } from '../src/app/api/dns/route';
import { POST as auditPost } from '../src/app/api/audit/route';

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
