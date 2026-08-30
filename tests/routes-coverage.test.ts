import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { EventEmitter } from 'node:events';
import { POST as corsPost } from '../src/app/api/cors/route';
import { POST as cvePost } from '../src/app/api/cve/route';
import { POST as headersPost } from '../src/app/api/headers/route';
import { POST as robotsPost } from '../src/app/api/robots/route';
import { POST as securityTxtPost } from '../src/app/api/security-txt/route';
import { POST as sslPost } from '../src/app/api/ssl/route';
import { isNullBodyStatus, normalizeResponseStatus, resetScannerState } from '../src/lib/server/scanner';

/**
 * Route coverage for the scanner endpoints that routes.test.ts does not touch.
 * Every outbound dependency is mocked so the suite never reaches the network.
 *
 * Each test uses a distinct hostname because rate limiting and the per-endpoint
 * cooldown are keyed by `endpoint:ip:hostname` and persist across tests inside
 * the same process.
 */

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface MockHttpReply {
  statusCode?: number;
  statusMessage?: string;
  headers?: http.IncomingHttpHeaders;
  body?: string;
}

/** Installs deterministic dns/https mocks and records the outbound options. */
function installHttpMocks(reply: (options: https.RequestOptions) => MockHttpReply) {
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
      const spec = reply(options);
      const response = new EventEmitter() as http.IncomingMessage;
      response.statusCode = spec.statusCode ?? 200;
      response.statusMessage = spec.statusMessage ?? 'OK';
      response.headers = spec.headers ?? { 'content-type': 'text/plain; charset=utf-8' };
      process.nextTick(() => {
        callback?.(response);
        if (spec.body) response.emit('data', Buffer.from(spec.body));
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    return request;
  }) as typeof https.request;

  return {
    observed,
    restore() {
      dns.promises.lookup = originalLookup;
      https.request = originalHttpsRequest;
    },
  };
}

/** Reads a request header from the mocked outbound options, ignoring case. */
function outgoingHeader(options: https.RequestOptions, name: string) {
  const headers = options.headers;
  if (!headers || Array.isArray(headers)) return undefined;
  const entries = Object.entries(headers as http.OutgoingHttpHeaders);
  const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match ? String(match[1]) : undefined;
}

// ══════════ /api/headers ══════════

test('headers route rejects an empty target', async () => {
  const response = await headersPost(jsonRequest({ url: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_URL');
});

test('headers route scores present and missing security headers', async () => {
  const mocks = installHttpMocks(() => ({
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
      'x-content-type-options': 'nosniff',
    },
    body: '<html></html>',
  }));

  try {
    const response = await headersPost(jsonRequest({ url: 'headers-mixed.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.status, 200);

    const analysis = data.securityHeadersAnalysis as Array<{
      name: string;
      isPresent: boolean;
      recommendation: string;
    }>;
    const byName = new Map(analysis.map((entry) => [entry.name, entry]));

    assert.equal(byName.get('Strict-Transport-Security')?.isPresent, true);
    assert.equal(byName.get('X-Content-Type-Options')?.isPresent, true);
    assert.equal(byName.get('Content-Security-Policy')?.isPresent, false);
    assert.equal(typeof byName.get('Content-Security-Policy')?.recommendation, 'string');

    assert.ok(
      data.summary.score > 0 && data.summary.score < 100,
      `partial header coverage must score between 0 and 100, received ${data.summary.score}`
    );
    assert.equal(data.summary.passedCount + data.summary.failedCount, analysis.length);
  } finally {
    mocks.restore();
  }
});

// ══════════ /api/cors ══════════

test('cors route flags a reflected malicious origin with credentials', async () => {
  const mocks = installHttpMocks((options) => {
    const origin = outgoingHeader(options, 'origin');
    // Deliberately vulnerable target: reflects any origin and allows credentials.
    return {
      statusCode: 204,
      statusMessage: 'No Content',
      headers: {
        'access-control-allow-origin': origin ?? '*',
        'access-control-allow-credentials': 'true',
      },
    };
  });

  try {
    const response = await corsPost(jsonRequest({ url: 'cors-reflected.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.maliciousOriginTest.originTested, 'https://evil.example.com');
    assert.equal(data.maliciousOriginTest.allowOrigin, 'https://evil.example.com');
    assert.equal(data.maliciousOriginTest.allowCredentials, true);
    assert.equal(data.vulnerabilityLevel, 'critical');
    assert.ok(
      (data.findings as string[]).some((finding) => /CRITICAL/i.test(finding)),
      'reflected origin with credentials must be reported as critical'
    );
  } finally {
    mocks.restore();
  }
});

test('cors route reports a locked down target as informational', async () => {
  const mocks = installHttpMocks(() => ({
    statusCode: 204,
    statusMessage: 'No Content',
    headers: {},
  }));

  try {
    const response = await corsPost(jsonRequest({ url: 'cors-locked.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.maliciousOriginTest.allowOrigin, null);
    assert.equal(data.vulnerabilityLevel, 'info');
    assert.ok((data.findings as string[]).some((finding) => /secure/i.test(finding)));
  } finally {
    mocks.restore();
  }
});

// ══════════ /api/robots ══════════

test('robots route returns the raw robots.txt body', async () => {
  const content = [
    'User-agent: *',
    'Disallow: /admin',
    'Sitemap: https://example.com/sitemap.xml',
  ].join('\n');
  const mocks = installHttpMocks(() => ({ body: content }));

  try {
    const response = await robotsPost(jsonRequest({ url: 'robots-present.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.found, true);
    assert.equal(data.status, 200);
    assert.equal(data.content, content);
  } finally {
    mocks.restore();
  }
});

test('robots route reports a missing file without failing', async () => {
  const mocks = installHttpMocks(() => ({
    statusCode: 404,
    statusMessage: 'Not Found',
    body: 'not found',
  }));

  try {
    const response = await robotsPost(jsonRequest({ url: 'robots-absent.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.found, false);
    assert.equal(data.status, 404);
    assert.match(String(data.content), /404/);
  } finally {
    mocks.restore();
  }
});

test('robots route truncates oversized files', async () => {
  const mocks = installHttpMocks(() => ({ body: 'User-agent: *\n' + 'x'.repeat(150_000) }));

  try {
    const response = await robotsPost(jsonRequest({ url: 'robots-huge.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(String(data.content).length, 100_000);
  } finally {
    mocks.restore();
  }
});

// ══════════ /api/security-txt ══════════

test('security-txt route parses well-known directives', async () => {
  const mocks = installHttpMocks((options) => {
    if (String(options.path) === '/.well-known/security.txt') {
      return {
        body: [
          'Contact: mailto:security@example.com',
          'Contact: https://example.com/report',
          'Expires: 2030-01-01T00:00:00.000Z',
          'Policy: https://example.com/policy',
          '# a comment line that must be ignored',
        ].join('\n'),
      };
    }
    return { statusCode: 404, statusMessage: 'Not Found', body: '' };
  });

  try {
    const response = await securityTxtPost(jsonRequest({ url: 'sectxt-wellknown.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.found, true);
    assert.match(String(data.path), /\/\.well-known\/security\.txt$/);
    assert.deepEqual(data.directives.contact, ['mailto:security@example.com', 'https://example.com/report']);
    assert.deepEqual(data.directives.policy, ['https://example.com/policy']);
    assert.equal(data.directives['#'], undefined);
  } finally {
    mocks.restore();
  }
});

test('security-txt route falls back to the root path', async () => {
  const mocks = installHttpMocks((options) => {
    if (String(options.path) === '/security.txt') {
      return { body: 'Contact: mailto:root@example.com\n' };
    }
    return { statusCode: 404, statusMessage: 'Not Found', body: '' };
  });

  try {
    const response = await securityTxtPost(jsonRequest({ url: 'sectxt-root.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.found, true);
    assert.match(String(data.path), /\/security\.txt$/);
    assert.equal(String(data.path).includes('.well-known'), false);
  } finally {
    mocks.restore();
  }
});

test('security-txt route ignores a file without a contact directive', async () => {
  const mocks = installHttpMocks(() => ({ body: 'Policy: https://example.com/policy\n' }));

  try {
    const response = await securityTxtPost(jsonRequest({ url: 'sectxt-nocontact.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.found, false);
    assert.equal(typeof data.message, 'string');
  } finally {
    mocks.restore();
  }
});

// ══════════ /api/ssl ══════════

function installTlsMock(overrides: {
  protocol?: string;
  cipher?: string;
  authorized?: boolean;
  validTo?: string;
  bits?: number;
  sigalg?: string;
  selfSigned?: boolean;
}) {
  const originalLookup = dns.promises.lookup;
  const originalTlsConnect = tls.connect;

  dns.promises.lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.promises.lookup;

  tls.connect = ((options: tls.ConnectionOptions, callback?: () => void) => {
    const socket = new EventEmitter() as tls.TLSSocket;
    const subject = { CN: options.servername || 'example.com' };
    socket.authorized = overrides.authorized ?? true;
    socket.getCipher = (() => ({
      name: overrides.cipher ?? 'TLS_AES_256_GCM_SHA384',
      standardName: overrides.cipher ?? 'TLS_AES_256_GCM_SHA384',
      version: overrides.protocol ?? 'TLSv1.3',
    })) as tls.TLSSocket['getCipher'];
    socket.getProtocol = (() => overrides.protocol ?? 'TLSv1.3') as tls.TLSSocket['getProtocol'];
    socket.getPeerCertificate = ((() => ({
      subject,
      issuer: overrides.selfSigned ? subject : { O: 'Example CA', CN: 'Example Issuing CA' },
      valid_from: 'Jan 1 2026 GMT',
      valid_to: overrides.validTo ?? 'Jun 10 2030 GMT',
      serialNumber: 'AB12CD34',
      fingerprint: 'AA:BB',
      fingerprint256: 'AA:BB:CC',
      subjectaltname: 'DNS:example.com',
      bits: overrides.bits ?? 2048,
      sigalg: overrides.sigalg ?? 'RSA-SHA256',
      infoAccess: { OCSP: ['http://ocsp.example.com'] },
      ca: false,
      issuerCertificate: null,
    })) as unknown) as tls.TLSSocket['getPeerCertificate'];
    socket.setTimeout = (() => socket) as tls.TLSSocket['setTimeout'];
    socket.destroy = (() => socket) as tls.TLSSocket['destroy'];
    process.nextTick(() => callback?.());
    return socket;
  }) as typeof tls.connect;

  return () => {
    dns.promises.lookup = originalLookup;
    tls.connect = originalTlsConnect;
  };
}

test('ssl route rejects an empty hostname', async () => {
  const response = await sslPost(jsonRequest({ hostname: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.errorCode, 'INVALID_HOSTNAME');
});

test('ssl route grades a modern TLS configuration highly', async () => {
  const restore = installTlsMock({});
  try {
    const response = await sslPost(jsonRequest({ hostname: 'ssl-modern.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.protocol, 'TLSv1.3');
    assert.equal(data.authorized, true);
    assert.equal(data.isExpired, false);
    assert.equal(data.isSelfSigned, false);
    assert.equal(data.audit.score, 100);
    assert.equal(data.audit.grade, 'A');
    assert.deepEqual(data.audit.findings, []);
    assert.equal(data.audit.safetyRatings.protocol, 'pass');
    assert.equal(data.audit.safetyRatings.trust, 'pass');
    assert.deepEqual(data.ocspUrls, ['http://ocsp.example.com']);
  } finally {
    restore();
  }
});

test('ssl route penalizes legacy protocols, weak ciphers, and untrusted chains', async () => {
  const restore = installTlsMock({
    protocol: 'TLSv1',
    cipher: 'ECDHE-RSA-DES-CBC3-SHA',
    authorized: false,
    bits: 1024,
  });
  try {
    const response = await sslPost(jsonRequest({ hostname: 'ssl-legacy.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.protocol, 'TLSv1');
    assert.equal(data.authorized, false);

    const rules = (data.audit.findings as Array<{ rule: string }>).map((finding) => finding.rule);
    assert.ok(rules.includes('Deprecated TLS Protocol Version'), `missing protocol finding in ${rules.join(', ')}`);
    assert.ok(rules.includes('Weak Cipher Suite Detected'), `missing cipher finding in ${rules.join(', ')}`);
    assert.ok(rules.includes('Weak Public Key Length'), `missing key finding in ${rules.join(', ')}`);
    assert.ok(rules.includes('Certificate Trust Chain Error'), `missing trust finding in ${rules.join(', ')}`);

    // 100 - 30 - 25 - 20 - 40 clamps to zero.
    assert.equal(data.audit.score, 0);
    assert.equal(data.audit.grade, 'F');
  } finally {
    restore();
  }
});

test('ssl route flags an expired certificate', async () => {
  const restore = installTlsMock({ validTo: 'Jan 1 2020 GMT' });
  try {
    const response = await sslPost(jsonRequest({ hostname: 'ssl-expired.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.isExpired, true);
    // daysRemaining is clamped at zero rather than reported as negative.
    assert.equal(data.daysRemaining, 0);
    assert.equal(data.audit.score, 50);
    assert.equal(data.audit.safetyRatings.expiry, 'fail');
  } finally {
    restore();
  }
});

test('ssl route flags a self-signed certificate', async () => {
  const restore = installTlsMock({ selfSigned: true });
  try {
    const response = await sslPost(jsonRequest({ hostname: 'ssl-selfsigned.example.com' }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.isSelfSigned, true);
    const rules = (data.audit.findings as Array<{ rule: string }>).map((finding) => finding.rule);
    assert.ok(rules.includes('Self-Signed Certificate'));
    assert.equal(data.audit.safetyRatings.trust, 'fail');
  } finally {
    restore();
  }
});

test('ssl route surfaces a handshake failure as a provider error', async () => {
  const originalLookup = dns.promises.lookup;
  const originalTlsConnect = tls.connect;

  dns.promises.lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.promises.lookup;
  tls.connect = (() => {
    const socket = new EventEmitter() as tls.TLSSocket;
    socket.setTimeout = (() => socket) as tls.TLSSocket['setTimeout'];
    socket.destroy = (() => socket) as tls.TLSSocket['destroy'];
    process.nextTick(() => socket.emit('error', new Error('ECONNREFUSED')));
    return socket;
  }) as typeof tls.connect;

  try {
    const response = await sslPost(jsonRequest({ hostname: 'ssl-offline.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 502);
    assert.equal(data.success, false);
    assert.match(String(data.error), /TLS Connection failed/);
  } finally {
    dns.promises.lookup = originalLookup;
    tls.connect = originalTlsConnect;
  }
});

// ══════════ null-body status regression ══════════

test('null-body statuses are recognised', () => {
  for (const status of [204, 205, 304, 101, 103]) {
    assert.equal(isNullBodyStatus(status), true, `${status} must be treated as null-body`);
  }
  for (const status of [200, 301, 302, 400, 404, 500]) {
    assert.equal(isNullBodyStatus(status), false, `${status} must allow a body`);
  }
});

test('response status normalization keeps values inside the Response range', () => {
  assert.equal(normalizeResponseStatus(200), 200);
  assert.equal(normalizeResponseStatus(599), 599);
  assert.equal(normalizeResponseStatus(undefined), 502);
  assert.equal(normalizeResponseStatus(0), 502);
  assert.equal(normalizeResponseStatus(100), 502);
  assert.equal(normalizeResponseStatus(700), 502);
});

test('a 204 preflight no longer breaks the scanner response wrapper', async () => {
  // Regression: requestPublicHttp used to pass the response buffer for every
  // status, so a spec-compliant 204 preflight threw
  // "Invalid response status code 204" and failed the whole CORS scan.
  const mocks = installHttpMocks(() => ({
    statusCode: 204,
    statusMessage: 'No Content',
    headers: { 'access-control-allow-origin': 'https://evil.example.com' },
  }));

  try {
    const response = await corsPost(jsonRequest({ url: 'cors-204.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.maliciousOriginTest.status, 204);
    assert.equal(data.maliciousOriginTest.allowOrigin, 'https://evil.example.com');
  } finally {
    mocks.restore();
  }
});

test('a 304 response no longer breaks the header scanner', async () => {
  const mocks = installHttpMocks(() => ({
    statusCode: 304,
    statusMessage: 'Not Modified',
    headers: { 'x-content-type-options': 'nosniff' },
  }));

  try {
    const response = await headersPost(jsonRequest({ url: 'headers-304.example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.status, 304);
  } finally {
    mocks.restore();
  }
});

// ══════════ /api/cve ══════════

test('cve route validates the query length', async () => {
  const empty = await cvePost(jsonRequest({ query: '' }));
  assert.equal(empty.status, 400);
  const emptyData = await empty.json();
  assert.equal(emptyData.success, false);

  const tooLong = await cvePost(jsonRequest({ query: 'a'.repeat(200) }));
  assert.equal(tooLong.status, 400);
});

test('cve route merges NVD results with the CISA KEV catalog', async () => {
  const originalFetch = globalThis.fetch;
  const seen: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    seen.push(url);

    if (url.includes('services.nvd.nist.gov')) {
      return Response.json({
        totalResults: 1,
        vulnerabilities: [
          {
            cve: {
              id: 'CVE-2026-1234',
              published: '2026-01-01T00:00:00.000',
              lastModified: '2026-02-01T00:00:00.000',
              vulnStatus: 'Analyzed',
              descriptions: [{ lang: 'en', value: 'Example vulnerability for contract testing.' }],
              metrics: {
                cvssMetricV31: [
                  {
                    cvssData: {
                      version: '3.1',
                      baseScore: 9.8,
                      baseSeverity: 'CRITICAL',
                      vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                    },
                  },
                ],
              },
              weaknesses: [{ description: [{ lang: 'en', value: 'CWE-79' }] }],
              references: [{ url: 'https://example.com/advisory' }],
            },
          },
        ],
      });
    }

    if (url.includes('cisa.gov')) {
      return Response.json({
        title: 'CISA Catalog of Known Exploited Vulnerabilities',
        catalogVersion: '2026.08.30',
        vulnerabilities: [
          {
            cveID: 'CVE-2026-1234',
            dateAdded: '2026-01-15',
            knownRansomwareCampaignUse: 'Known',
          },
        ],
      });
    }

    throw new Error(`Unexpected outbound request: ${url}`);
  }) as typeof fetch;

  try {
    const response = await cvePost(jsonRequest({ query: 'cve-merge-fixture', resultsPerPage: 5 }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.totalResults, 1);
    assert.equal(data.vulnerabilities.length, 1);

    const [vulnerability] = data.vulnerabilities;
    assert.equal(vulnerability.id, 'CVE-2026-1234');
    assert.equal(vulnerability.cvss.baseSeverity, 'CRITICAL');
    assert.equal(vulnerability.cvss.baseScore, 9.8);
    assert.deepEqual(vulnerability.weaknesses, ['CWE-79']);
    assert.equal(vulnerability.cisaKev.knownRansomwareCampaignUse, 'Known');
    assert.equal(data.kevCatalog.catalogVersion, '2026.08.30');

    assert.ok(seen.some((url) => url.includes('services.nvd.nist.gov')));
    assert.ok(seen.some((url) => url.includes('cisa.gov')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cve route applies the KEV-only filter', async () => {
  const originalFetch = globalThis.fetch;
  // The KEV catalog is cached under a single key, so a prior test's catalog would
  // otherwise decide which CVEs count as listed.
  resetScannerState();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('services.nvd.nist.gov')) {
      return Response.json({
        totalResults: 2,
        vulnerabilities: [
          {
            cve: {
              id: 'CVE-2026-1111',
              published: '2026-01-01T00:00:00.000',
              lastModified: '2026-01-02T00:00:00.000',
              descriptions: [{ lang: 'en', value: 'Listed in KEV.' }],
              metrics: {},
              references: [],
            },
          },
          {
            cve: {
              id: 'CVE-2026-2222',
              published: '2026-01-01T00:00:00.000',
              lastModified: '2026-01-02T00:00:00.000',
              descriptions: [{ lang: 'en', value: 'Not listed in KEV.' }],
              metrics: {},
              references: [],
            },
          },
        ],
      });
    }
    return Response.json({
      catalogVersion: '2026.08.30',
      vulnerabilities: [{ cveID: 'CVE-2026-1111', dateAdded: '2026-01-05' }],
    });
  }) as typeof fetch;

  try {
    const response = await cvePost(jsonRequest({ query: 'cve-kevonly-fixture', kevOnly: true }));
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.filters.kevOnly, true);
    assert.equal(data.vulnerabilities.length, 1);
    assert.equal(data.vulnerabilities[0].id, 'CVE-2026-1111');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cve route degrades when the KEV catalog is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  // Drop the cached catalog so the KEV fetch genuinely fails on this run.
  resetScannerState();
  let kevAttempts = 0;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('services.nvd.nist.gov')) {
      return Response.json({
        totalResults: 1,
        vulnerabilities: [
          {
            cve: {
              id: 'CVE-2026-5678',
              published: '2026-03-01T00:00:00.000',
              lastModified: '2026-03-02T00:00:00.000',
              descriptions: [{ lang: 'en', value: 'KEV degradation fixture.' }],
              metrics: {},
              references: [],
            },
          },
        ],
      });
    }
    kevAttempts += 1;
    throw new Error('KEV feed unavailable');
  }) as typeof fetch;

  try {
    const response = await cvePost(jsonRequest({ query: 'cve-degraded-fixture' }));
    const data = await response.json();
    // NVD is required; KEV enrichment is best effort and must not fail the request.
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.ok(kevAttempts > 0, 'the KEV feed must have been attempted');
    assert.equal(data.kevCatalog, null);
    assert.equal(data.vulnerabilities[0].cisaKev, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cve route fails when the required NVD provider is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  resetScannerState();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('services.nvd.nist.gov')) {
      throw new Error('NVD unavailable');
    }
    return Response.json({ catalogVersion: '2026.08.30', vulnerabilities: [] });
  }) as typeof fetch;

  try {
    const response = await cvePost(jsonRequest({ query: 'cve-nvd-down-fixture' }));
    const data = await response.json();
    assert.ok(response.status >= 400, `expected a failure status, received ${response.status}`);
    assert.equal(data.success, false);
    assert.equal(typeof data.errorCode, 'string');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
