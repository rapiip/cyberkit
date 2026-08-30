import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublicHttp } from '../../src/lib/server/scanner';

/**
 * Live network checks. These reach real third-party endpoints, so they are kept
 * out of the default suite (`npm test`) and out of CI, where an offline runner
 * or a change on the remote host would produce a false failure.
 *
 * Run explicitly with: npm run test:network
 *
 * The offline equivalents live in tests/hardening.test.ts, which asserts the
 * same TLS trust behaviour against a mocked transport.
 */

test('fetchPublicHttp rejects an expired certificate from a live host', async () => {
  await assert.rejects(
    () => fetchPublicHttp(new URL('https://expired.badssl.com')),
    /expired|ECONNRESET|CERT_/i
  );
});

test('fetchPublicHttp accepts an expired certificate only with explicit opt-in', async () => {
  const response = await fetchPublicHttp(new URL('https://expired.badssl.com'), {
    allowUntrustedCerts: true,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-CyberKit-Untrusted-Cert'), 'true');
});

test('fetchPublicHttp reaches a valid public host', async () => {
  const response = await fetchPublicHttp(new URL('https://example.com'));
  assert.ok(response.status >= 200 && response.status < 400, `unexpected status ${response.status}`);
});
