import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { allToolMetadata } from '../src/lib/tools/metadata';
import { loadToolExecutor } from '../src/lib/tools/registry';
import type { ToolResult } from '../src/lib/tools/types';

/**
 * End-to-end smoke coverage for every registered capability.
 *
 * The registry tests assert that metadata and executors stay in sync. This file
 * asserts the stronger property: every tool actually runs and produces a
 * normalized successful result for a representative input.
 */

const FIXTURE_TEXT = 'tests/fixtures/utility-workbenches/payload.txt';
const FIXTURE_IOC = 'tests/fixtures/ioc/sample.txt';

async function fixtureFile(path: string, name: string, type: string) {
  const bytes = await readFile(path);
  return new File([new Uint8Array(bytes)], name, { type });
}

async function pngFile() {
  // Minimal 1x1 PNG so magic-byte detection has a real signature to read.
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF+xQ8AAAAASUVORK5CYII=';
  return new File([Uint8Array.from(Buffer.from(base64, 'base64'))], 'pixel.png', { type: 'image/png' });
}

const SAMPLE_JWT = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkN5YmVyS2l0IiwiaWF0IjoxNzAwMDAwMDAwfQ',
  'gzSraSYS8EXBxLN_oWnFSRgCzcmJmMjLiuyu5CSpyHI',
].join('.');

/** Inputs for capabilities that execute entirely in the browser/runtime. */
const clientFixtures: Record<string, () => Promise<Record<string, unknown>> | Record<string, unknown>> = {
  'url-analyzer': () => ({ url: 'https://example.com/a/b?q=1&r=2#frag' }),
  'csp-generator': () => ({
    defaultSrc: "'self'",
    scriptSrc: "'self'",
    styleSrc: "'self' 'unsafe-inline'",
    imgSrc: "'self' data:",
    fontSrc: "'self'",
    connectSrc: "'self'",
    frameSrc: "'none'",
    objectSrc: "'none'",
    upgradeInsecure: true,
    blockMixed: true,
  }),
  'cidr-calculator': () => ({ cidr: '192.0.2.0/24' }),
  'subnet-calculator': () => ({ ip: '192.0.2.10', mask: '255.255.255.0' }),
  'common-ports': () => ({ search: 'ssh' }),
  base64: () => ({ input: 'CyberKit', mode: 'encode' }),
  'url-encoder': () => ({ input: 'a b&c=d', mode: 'encode' }),
  'html-entity': () => ({ input: '<script>alert(1)</script>', mode: 'encode' }),
  'hex-converter': () => ({ input: 'CyberKit', mode: 'encode', separator: ' ' }),
  'binary-converter': () => ({ input: 'Cy', mode: 'encode' }),
  'unicode-converter': () => ({ input: 'Cy', mode: 'encode' }),
  rot13: () => ({ input: 'CyberKit' }),
  'caesar-cipher': () => ({ input: 'CyberKit', shift: 3, mode: 'encrypt' }),
  'jwt-decoder': () => ({ token: SAMPLE_JWT, clockSkew: 60 }),
  'morse-code': () => ({ input: 'SOS', mode: 'encode' }),
  'md5-generator': () => ({ input: 'CyberKit' }),
  'sha1-generator': () => ({ input: 'CyberKit' }),
  'sha256-generator': () => ({ input: 'CyberKit' }),
  'sha512-generator': () => ({ input: 'CyberKit' }),
  'hmac-generator': () => ({ message: 'CyberKit', key: 'secret-key', algorithm: 'SHA-256' }),
  'uuid-generator': () => ({ count: 2, uppercase: false, noDashes: false }),
  'password-generator': () => ({
    mode: 'password',
    length: 20,
    count: 3,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  }),
  'password-strength': () => ({ password: 'correct horse battery staple 42!', checkBreach: false }),
  'hash-identifier': () => ({ hash: 'd41d8cd98f00b204e9800998ecf8427e' }),
  'file-hash': async () => ({ file: await fixtureFile(FIXTURE_TEXT, 'payload.txt', 'text/plain') }),
  'random-string': () => ({ length: 16, count: 3, charset: 'hex' }),
  'exif-viewer': async () => ({ file: await pngFile() }),
  'mime-checker': async () => ({ file: await pngFile() }),
  'magic-bytes': async () => ({ file: await pngFile() }),
  'string-extractor': async () => ({ file: await fixtureFile(FIXTURE_TEXT, 'payload.txt', 'text/plain') }),
  'ioc-extractor': async () => ({
    input: await readFile(FIXTURE_IOC, 'utf8'),
    enableEnrichment: false,
  }),
  'email-format': () => ({ email: 'analyst@example.com' }),
  'github-secret': () => ({
    input: 'const token = "ghp_0123456789abcdefghijklmnopqrstuvwxyzAB";',
    ignoreComments: true,
    ignoreFixtures: true,
    minEntropy: 3.2,
  }),
  'xor-helper': () => ({ input: 'CyberKit', key: 'key', inputFormat: 'text', outputFormat: 'hex' }),
  'regex-tester': () => ({ pattern: '\\d+', flags: 'g', input: 'a1 b22 c333' }),
};

interface ServerFixture {
  /** API path the executor is expected to call. */
  endpoint: string;
  inputs: Record<string, unknown>;
  /**
   * Successful provider payload the executor must render. Shapes mirror the real
   * route handlers so this doubles as an executor/route contract test.
   */
  response: Record<string, unknown>;
  /** Request body keys the executor must forward to the route. */
  expectedBodyKeys: string[];
  /** Substrings that must appear in the rendered raw output. */
  expectedOutput: string[];
}

const serverFixtures: Record<string, ServerFixture> = {
  'http-header-checker': {
    endpoint: '/api/headers',
    inputs: { url: 'example.com' },
    expectedBodyKeys: ['url'],
    expectedOutput: ['https://example.com', 'Content-Security-Policy'],
    response: {
      success: true,
      url: 'https://example.com',
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html' },
      securityHeadersAnalysis: [
        {
          name: 'Content-Security-Policy',
          isPresent: false,
          severity: 'high',
          recommendation: "default-src 'self'",
          description: 'Mitigates XSS',
        },
        {
          name: 'Strict-Transport-Security',
          isPresent: true,
          value: 'max-age=63072000',
          severity: 'high',
          recommendation: 'max-age=63072000',
          description: 'Forces HTTPS',
        },
      ],
      summary: { score: 50, passedCount: 1, failedCount: 1 },
    },
  },
  'ssl-checker': {
    endpoint: '/api/ssl',
    inputs: { hostname: 'example.com' },
    expectedBodyKeys: ['hostname'],
    expectedOutput: ['example.com', 'TLSv1.3'],
    response: {
      success: true,
      hostname: 'example.com',
      subject: { CN: 'example.com' },
      issuer: { O: 'Example CA', CN: 'Example Issuing CA' },
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2030-06-10T00:00:00.000Z',
      isExpired: false,
      daysRemaining: 1380,
      serialNumber: 'AB12CD34',
      fingerprint: 'AA:BB',
      fingerprint256: 'AA:BB:CC',
      bits: 2048,
      asn1Curve: null,
      nistCurve: null,
      protocol: 'TLSv1.3',
      cipher: { name: 'TLS_AES_256_GCM_SHA384', version: 'TLSv1.3', standardName: 'TLS_AES_256_GCM_SHA384' },
      sigalg: 'RSA-SHA256',
      authorized: true,
      authorizationError: null,
      isSelfSigned: false,
      ca: false,
      subjectaltname: 'DNS:example.com',
      ocspUrls: ['http://ocsp.example.com'],
      caIssuers: [],
      audit: {
        score: 100,
        grade: 'A',
        findings: [],
        safetyRatings: {
          protocol: 'pass',
          cipher: 'pass',
          key: 'pass',
          signature: 'pass',
          expiry: 'pass',
          trust: 'pass',
        },
      },
    },
  },
  'cors-checker': {
    endpoint: '/api/cors',
    inputs: { url: 'example.com' },
    expectedBodyKeys: ['url'],
    expectedOutput: ['https://evil.example.com'],
    response: {
      success: true,
      url: 'https://example.com',
      maliciousOriginTest: {
        originTested: 'https://evil.example.com',
        status: 204,
        allowOrigin: null,
        allowCredentials: false,
        allowMethods: null,
        allowHeaders: null,
        exposeHeaders: null,
      },
      wildcardTest: {
        originTested: '*',
        status: 204,
        allowOrigin: null,
        allowCredentials: false,
        allowMethods: null,
        allowHeaders: null,
        exposeHeaders: null,
      },
      findings: ['CORS policy is secure. Requests from untrusted origins are blocked or restricted.'],
      vulnerabilityLevel: 'info',
    },
  },
  'robots-txt-viewer': {
    endpoint: '/api/robots',
    inputs: { url: 'example.com' },
    expectedBodyKeys: ['url'],
    expectedOutput: ['Disallow: /admin'],
    response: {
      success: true,
      found: true,
      status: 200,
      content: 'User-agent: *\nDisallow: /admin\nSitemap: https://example.com/sitemap.xml',
    },
  },
  'security-txt-checker': {
    endpoint: '/api/security-txt',
    inputs: { url: 'example.com' },
    expectedBodyKeys: ['url'],
    expectedOutput: ['security@example.com'],
    response: {
      success: true,
      found: true,
      path: 'https://example.com/.well-known/security.txt',
      content: 'Contact: mailto:security@example.com\nExpires: 2030-01-01T00:00:00.000Z',
      directives: {
        contact: ['mailto:security@example.com'],
        expires: ['2030-01-01T00:00:00.000Z'],
      },
    },
  },
  'dns-lookup': {
    endpoint: '/api/dns',
    inputs: { hostname: 'example.com' },
    expectedBodyKeys: ['hostname'],
    expectedOutput: ['93.184.216.34', 'mail.example.com'],
    response: {
      success: true,
      hostname: 'example.com',
      provider: 'Node.js resolver',
      timestamp: '2026-08-30T00:00:00.000Z',
      partial: false,
      records: {
        A: { provider: 'Node.js resolver', confidence: 'high', ttl: 300, values: ['93.184.216.34'] },
        MX: {
          provider: 'Node.js resolver',
          confidence: 'high',
          ttl: null,
          values: [{ exchange: 'mail.example.com', priority: 10 }],
        },
      },
      helpers: {
        spf: { present: true, records: ['v=spf1 -all'] },
        dmarc: { present: true, records: ['v=DMARC1; p=reject'] },
        dkim: { selectorsFound: ['default'], records: [] },
      },
    },
  },
  'dns-over-https': {
    endpoint: '/api/doh',
    inputs: { hostname: 'example.com', type: 'A' },
    expectedBodyKeys: ['hostname', 'type'],
    expectedOutput: ['93.184.216.34', 'DNSSEC_AD=true'],
    response: {
      success: true,
      hostname: 'example.com',
      provider: 'Resolver comparison',
      timestamp: '2026-08-30T00:00:00.000Z',
      partial: false,
      comparisons: [
        {
          type: 'A',
          local: { values: ['93.184.216.34'], provider: 'Node.js resolver', unavailable: false },
          doh: {
            status: 0,
            dnssecAuthenticated: true,
            truncated: false,
            recursionAvailable: true,
            answers: [{ name: 'example.com.', type: 1, TTL: 120, data: '93.184.216.34' }],
            unavailable: false,
          },
        },
      ],
    },
  },
  'whois-lookup': {
    endpoint: '/api/rdap',
    inputs: { hostname: 'example.com' },
    expectedBodyKeys: ['hostname'],
    expectedOutput: ['Example Registrar'],
    response: {
      success: true,
      hostname: 'example.com',
      provider: 'rdap.org',
      registrar: 'Example Registrar',
      events: [{ eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' }],
      nameservers: ['a.iana-servers.net'],
      status: ['client transfer prohibited'],
      raw: {},
    },
  },
  'ip-lookup': {
    endpoint: '/api/ip',
    inputs: { ipOrDomain: '8.8.8.8' },
    expectedBodyKeys: ['ipOrDomain'],
    expectedOutput: ['8.8.8.8', 'AS15169', 'approximate'],
    response: {
      success: true,
      provider: 'IP-API',
      timestamp: '2026-08-30T00:00:00.000Z',
      confidence: 'medium',
      input: '8.8.8.8',
      ip: '8.8.8.8',
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      zip: '94035',
      latitude: 37.386,
      longitude: -122.0838,
      timezone: 'America/Los_Angeles',
      isp: 'Google LLC',
      organization: 'Google Public DNS',
      asn: 'AS15169 Google LLC',
      precisionDisclaimer:
        'IP geolocation is approximate and must not be treated as a precise physical location.',
      threatIntel: { configuredProviders: [], results: {} },
    },
  },
  'pwned-password': {
    endpoint: '/api/pwned-password',
    inputs: { password: 'this-password-is-not-in-the-mocked-range' },
    expectedBodyKeys: ['hashPrefix'],
    expectedOutput: [],
    response: { success: true, range: [{ suffix: '0'.repeat(35), count: 1 }] },
  },
  'cve-lookup': {
    endpoint: '/api/cve',
    inputs: { query: 'openssl', resultsPerPage: 5, startIndex: 0 },
    expectedBodyKeys: ['query'],
    expectedOutput: ['CVE-2026-0001'],
    response: {
      success: true,
      provider: 'NVD CVE API + CISA KEV Catalog',
      totalResults: 1,
      startIndex: 0,
      resultsPerPage: 5,
      nextStartIndex: null,
      filters: { severity: null, kevOnly: false, ransomwareOnly: false },
      kevCatalog: {
        title: 'CISA Catalog of Known Exploited Vulnerabilities',
        catalogVersion: '2026.08.30',
        count: 1,
      },
      vulnerabilities: [
        {
          id: 'CVE-2026-0001',
          description: 'Example OpenSSL issue used for contract testing.',
          published: '2026-01-01T00:00:00.000',
          lastModified: '2026-02-01T00:00:00.000',
          status: 'Analyzed',
          cvss: {
            version: '3.1',
            baseScore: 9.8,
            baseSeverity: 'CRITICAL',
            vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          },
          weaknesses: ['CWE-787'],
          references: [{ url: 'https://example.com/advisory' }],
          cisaKev: { cveID: 'CVE-2026-0001', dateAdded: '2026-01-15', knownRansomwareCampaignUse: 'Known' },
        },
      ],
    },
  },
};

function assertNormalized(toolId: string, result: ToolResult) {
  assert.equal(typeof result.schemaVersion, 'string', `${toolId} must carry a schema version`);
  assert.ok(Array.isArray(result.findings), `${toolId} must expose a findings array`);
  assert.ok(result.data && typeof result.data === 'object', `${toolId} must return a data object`);
}

test('every registered tool has an execution fixture', () => {
  const covered = new Set([...Object.keys(clientFixtures), ...Object.keys(serverFixtures)]);
  const missing = allToolMetadata.map((tool) => tool.id).filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `Tools without an execution fixture: ${missing.join(', ')}`);

  const unknown = [...covered].filter((id) => !allToolMetadata.some((tool) => tool.id === id));
  assert.deepEqual(unknown, [], `Fixtures for unknown tools: ${unknown.join(', ')}`);

  assert.equal(covered.size, allToolMetadata.length);
});

test('every client-side tool executes successfully', async () => {
  const failures: string[] = [];

  for (const [toolId, buildInputs] of Object.entries(clientFixtures)) {
    const metadata = allToolMetadata.find((tool) => tool.id === toolId);
    assert.ok(metadata, `Unknown tool fixture: ${toolId}`);

    const executor = await loadToolExecutor(metadata.slug);
    assert.ok(executor, `Executor missing for ${toolId}`);

    const inputs = await buildInputs();
    let result: ToolResult;
    try {
      result = await executor.execute(inputs);
    } catch (error) {
      failures.push(`${toolId} threw: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (!result.success) {
      failures.push(`${toolId} returned success=false: ${result.summary ?? 'no summary'}`);
      continue;
    }
    if (result.status !== 'success' && result.status !== 'partial') {
      failures.push(`${toolId} returned status=${result.status}`);
      continue;
    }
    if (!result.rawOutput || result.rawOutput.trim().length === 0) {
      failures.push(`${toolId} produced no raw output`);
      continue;
    }
    assertNormalized(toolId, result);
  }

  assert.deepEqual(failures, [], `Client tool execution failures:\n${failures.join('\n')}`);
});

test('every server-side tool calls its route and renders the response', async () => {
  const originalFetch = globalThis.fetch;
  const failures: string[] = [];

  try {
    for (const [toolId, fixture] of Object.entries(serverFixtures)) {
      const metadata = allToolMetadata.find((tool) => tool.id === toolId);
      assert.ok(metadata, `Unknown tool fixture: ${toolId}`);

      const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        calls.push({
          path,
          body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
        });
        return Response.json(fixture.response);
      }) as typeof fetch;

      const executor = await loadToolExecutor(metadata.slug);
      assert.ok(executor, `Executor missing for ${toolId}`);

      let result: ToolResult;
      try {
        result = await executor.execute(fixture.inputs);
      } catch (error) {
        failures.push(`${toolId} threw: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      const routeCall = calls.find((call) => call.path === fixture.endpoint);
      if (!routeCall) {
        failures.push(`${toolId} did not call ${fixture.endpoint} (called: ${calls.map((c) => c.path).join(', ') || 'nothing'})`);
        continue;
      }
      for (const key of fixture.expectedBodyKeys) {
        if (!(key in routeCall.body)) {
          failures.push(`${toolId} omitted request body key "${key}"`);
        }
      }
      if (!result.success) {
        failures.push(`${toolId} returned success=false: ${result.summary ?? 'no summary'}`);
        continue;
      }
      if (!result.rawOutput || result.rawOutput.trim().length === 0) {
        failures.push(`${toolId} produced no raw output`);
        continue;
      }
      for (const expected of fixture.expectedOutput) {
        if (!result.rawOutput.includes(expected)) {
          failures.push(`${toolId} raw output is missing "${expected}"`);
        }
      }
      assertNormalized(toolId, result);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(failures, [], `Server tool execution failures:\n${failures.join('\n')}`);
});

test('server-side tools degrade gracefully when the route reports an error', async () => {
  const originalFetch = globalThis.fetch;
  const failures: string[] = [];

  try {
    for (const [toolId, fixture] of Object.entries(serverFixtures)) {
      const metadata = allToolMetadata.find((tool) => tool.id === toolId);
      assert.ok(metadata);

      globalThis.fetch = (async () =>
        Response.json(
          { success: false, errorCode: 'PROVIDER_UNAVAILABLE', error: 'Upstream provider unavailable', message: 'Upstream provider unavailable', retryable: true },
          { status: 502 }
        )) as typeof fetch;

      const executor = await loadToolExecutor(metadata.slug);
      assert.ok(executor);

      let result: ToolResult;
      try {
        result = await executor.execute(fixture.inputs);
      } catch (error) {
        failures.push(`${toolId} threw instead of returning a failure result: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      if (result.success) {
        failures.push(`${toolId} reported success for a failing provider response`);
        continue;
      }
      if (result.status === 'success') {
        failures.push(`${toolId} normalized a provider error to status=success`);
      }
      assertNormalized(toolId, result);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(failures, [], `Server tool degradation failures:\n${failures.join('\n')}`);
});

test('input validation rejects empty required values', async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['url-analyzer', { url: '' }],
    ['base64', { input: '', mode: 'encode' }],
    ['hmac-generator', { message: 'x', key: '' }],
    ['regex-tester', { pattern: '', flags: 'g', input: 'abc' }],
    ['cidr-calculator', { cidr: '' }],
    ['hash-identifier', { hash: '' }],
    ['email-format', { email: '' }],
  ];

  for (const [toolId, inputs] of cases) {
    const metadata = allToolMetadata.find((tool) => tool.id === toolId);
    assert.ok(metadata, `Unknown tool: ${toolId}`);
    const executor = await loadToolExecutor(metadata.slug);
    assert.ok(executor);

    let result: ToolResult | undefined;
    let threw = false;
    try {
      result = await executor.execute(inputs);
    } catch {
      threw = true;
    }

    assert.ok(
      threw || (result && result.success === false),
      `${toolId} accepted an empty required input instead of failing`
    );
  }
});
