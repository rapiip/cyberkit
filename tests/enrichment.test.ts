import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as enrichGet, POST as enrichPost } from '../src/app/api/enrich/route';
import {
  MAX_ENRICHMENT_INDICATORS,
  aggregateVerdict,
  configuredProviderNames,
  isEnrichmentConfigured,
  normalizeIndicator,
  type EnrichmentSource,
} from '../src/lib/server/enrichment';
import { resetScannerState } from '../src/lib/server/scanner';
import { selectEnrichableIocs, verdictStatus } from '../src/lib/tools/enrichment-client';
import type { IocEntry } from '../src/lib/security/local-analysis';

/**
 * Enrichment is the only deliberate data-egress path in CyberKit, so these tests
 * focus on the gates: consent, provider configuration, indicator validation, and
 * the batch cap.
 */

const PROVIDER_ENV_KEYS = ['VIRUSTOTAL_API_KEY', 'ABUSEIPDB_API_KEY', 'URLHAUS_AUTH_KEY'] as const;

function withProviderEnv(values: Partial<Record<(typeof PROVIDER_ENV_KEYS)[number], string>>) {
  const previous = new Map<string, string | undefined>();
  for (const key of PROVIDER_ENV_KEYS) {
    previous.set(key, process.env[key]);
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ══════════ Indicator validation ══════════

test('normalizeIndicator accepts well-formed indicators and canonicalizes them', () => {
  assert.deepEqual(normalizeIndicator('ip', ' 8.8.8.8 '), { ok: true, value: '8.8.8.8' });
  assert.deepEqual(normalizeIndicator('domain', 'Evil.Example.COM'), { ok: true, value: 'evil.example.com' });
  assert.deepEqual(normalizeIndicator('hash', 'D41D8CD98F00B204E9800998ECF8427E'), {
    ok: true,
    value: 'd41d8cd98f00b204e9800998ecf8427e',
  });

  const url = normalizeIndicator('url', 'https://user:secret@evil.example/path?a=1');
  assert.equal(url.ok, true);
  // Credentials must never be forwarded to a third party.
  assert.equal(url.ok && url.value.includes('secret'), false);
  assert.equal(url.ok && url.value.includes('user'), false);
  assert.equal(url.ok && url.value.startsWith('https://evil.example/path'), true);
});

test('normalizeIndicator rejects malformed or unsupported values', () => {
  assert.equal(normalizeIndicator('ip', 'not-an-ip').ok, false);
  assert.equal(normalizeIndicator('ip', '999.1.1.1').ok, false);
  assert.equal(normalizeIndicator('domain', 'no-dot').ok, false);
  assert.equal(normalizeIndicator('domain', '-leading.example').ok, false);
  assert.equal(normalizeIndicator('hash', 'abc123').ok, false);
  assert.equal(normalizeIndicator('url', 'file:///etc/passwd').ok, false);
  assert.equal(normalizeIndicator('url', 'javascript:alert(1)').ok, false);
  assert.equal(normalizeIndicator('domain', '').ok, false);
  assert.equal(normalizeIndicator('domain', `${'a'.repeat(3000)}.example`).ok, false);
});

test('aggregateVerdict escalates to the most severe provider opinion', () => {
  const source = (verdict: EnrichmentSource['verdict']): EnrichmentSource => ({
    provider: 'p',
    verdict,
    detail: 'd',
  });
  assert.equal(aggregateVerdict([]), 'unknown');
  assert.equal(aggregateVerdict([source('harmless'), source('unknown')]), 'harmless');
  assert.equal(aggregateVerdict([source('harmless'), source('suspicious')]), 'suspicious');
  assert.equal(aggregateVerdict([source('suspicious'), source('malicious')]), 'malicious');
  assert.equal(aggregateVerdict([source('malicious'), source('harmless')]), 'malicious');
});

test('verdictStatus maps verdicts onto result statuses', () => {
  assert.equal(verdictStatus('malicious'), 'fail');
  assert.equal(verdictStatus('suspicious'), 'warn');
  assert.equal(verdictStatus('harmless'), 'pass');
  assert.equal(verdictStatus('unknown'), 'info');
});

// ══════════ Client-side selection ══════════

test('selectEnrichableIocs forwards only validated, supported, deduplicated indicators', () => {
  const entry = (over: Partial<IocEntry>): IocEntry => ({
    type: 'ip',
    value: '1.1.1.1',
    normalized: '1.1.1.1',
    defanged: false,
    valid: true,
    confidence: 'high',
    source: 'test',
    ...over,
  });

  const selected = selectEnrichableIocs([
    entry({}),
    entry({}), // duplicate
    entry({ type: 'domain', normalized: 'Evil.Example', value: 'Evil.Example' }),
    entry({ type: 'domain', normalized: 'evil.example', value: 'evil.example' }), // case-duplicate
    entry({ type: 'email', normalized: 'ops@example.com', value: 'ops@example.com' }),
    entry({ type: 'url', normalized: 'https://evil.example/a', value: 'https://evil.example/a' }),
    entry({ type: 'hash', normalized: 'd41d8cd98f00b204e9800998ecf8427e', value: 'x' }),
    entry({ type: 'ip', normalized: '2.2.2.2', value: '2.2.2.2', valid: false }), // not validated
  ]);

  const types: string[] = selected.map((item) => item.type);
  assert.equal(types.includes('email'), false, 'emails cannot be enriched and must not be sent');
  assert.equal(selected.some((item) => item.value === '2.2.2.2'), false, 'unvalidated indicators must not be sent');
  assert.equal(selected.filter((item) => item.type === 'ip').length, 1, 'duplicates must collapse');
  assert.equal(selected.filter((item) => item.type === 'domain').length, 1, 'case duplicates must collapse');
  assert.deepEqual(
    [...new Set(types)].sort(),
    ['domain', 'hash', 'ip', 'url']
  );
});

// ══════════ Route behaviour ══════════

test('enrich GET reports provider availability without contacting anything', async () => {
  const restore = withProviderEnv({});
  try {
    const response = await enrichGet();
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.configured, false);
    assert.deepEqual(data.configuredProviders, []);
    assert.equal(data.maxIndicators, MAX_ENRICHMENT_INDICATORS);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  } finally {
    restore();
  }

  const restoreConfigured = withProviderEnv({ VIRUSTOTAL_API_KEY: 'test-key' });
  try {
    const response = await enrichGet();
    const data = await response.json();
    assert.equal(data.configured, true);
    assert.deepEqual(data.configuredProviders, ['VirusTotal']);
  } finally {
    restoreConfigured();
  }
});

test('enrich POST refuses to run when no provider is configured', async () => {
  const restore = withProviderEnv({});
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = (async () => {
    outbound += 1;
    throw new Error('no outbound request expected');
  }) as typeof fetch;

  try {
    const response = await enrichPost(jsonRequest({ indicators: [{ type: 'ip', value: '8.8.8.8' }] }));
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.success, false);
    assert.equal(data.errorCode, 'ENRICHMENT_NOT_CONFIGURED');
    assert.equal(outbound, 0, 'nothing may be sent when enrichment is unconfigured');
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('enrich POST validates the request shape', async () => {
  const restore = withProviderEnv({ VIRUSTOTAL_API_KEY: 'test-key' });
  try {
    const empty = await enrichPost(jsonRequest({ indicators: [] }));
    assert.equal(empty.status, 400);
    assert.equal((await empty.json()).errorCode, 'INVALID_INDICATORS');

    const malformed = await enrichPost(jsonRequest({ indicators: [{ type: 'ip' }] }));
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).errorCode, 'INVALID_INDICATORS');

    const tooMany = await enrichPost(
      jsonRequest({
        indicators: Array.from({ length: MAX_ENRICHMENT_INDICATORS + 1 }, () => ({ type: 'ip', value: '8.8.8.8' })),
      })
    );
    assert.equal(tooMany.status, 400);
    assert.equal((await tooMany.json()).errorCode, 'TOO_MANY_INDICATORS');
  } finally {
    restore();
  }
});

test('enrich POST queries VirusTotal and AbuseIPDB and aggregates the verdict', async () => {
  resetScannerState();
  const restore = withProviderEnv({ VIRUSTOTAL_API_KEY: 'vt-key', ABUSEIPDB_API_KEY: 'abuse-key' });
  const originalFetch = globalThis.fetch;
  const seen: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push(url);

    if (url.includes('virustotal.com')) {
      assert.equal((init?.headers as Record<string, string>)['x-apikey'], 'vt-key');
      return Response.json({
        data: { attributes: { last_analysis_stats: { malicious: 4, suspicious: 1, harmless: 60, undetected: 5 } } },
      });
    }
    if (url.includes('abuseipdb.com')) {
      assert.equal((init?.headers as Record<string, string>).Key, 'abuse-key');
      return Response.json({ data: { abuseConfidenceScore: 92, totalReports: 41, countryCode: 'NL' } });
    }
    throw new Error(`Unexpected provider call: ${url}`);
  }) as typeof fetch;

  try {
    const response = await enrichPost(jsonRequest({ indicators: [{ type: 'ip', value: '198.51.100.7' }] }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.enriched, 1);
    assert.deepEqual(data.configuredProviders, ['VirusTotal', 'AbuseIPDB']);

    const [result] = data.results;
    assert.equal(result.type, 'ip');
    assert.equal(result.value, '198.51.100.7');
    assert.equal(result.verdict, 'malicious');

    const providers = (result.sources as EnrichmentSource[]).map((source) => source.provider).sort();
    assert.deepEqual(providers, ['AbuseIPDB', 'VirusTotal']);
    assert.ok(seen.some((url) => url.includes('ip_addresses/198.51.100.7')));
    assert.ok(seen.some((url) => url.includes('ipAddress=198.51.100.7')));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('enrich POST reports rejections without echoing the offending value', async () => {
  resetScannerState();
  const restore = withProviderEnv({ VIRUSTOTAL_API_KEY: 'vt-key' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({ data: { attributes: { last_analysis_stats: { harmless: 70 } } } })) as typeof fetch;

  try {
    const response = await enrichPost(
      jsonRequest({
        indicators: [
          { type: 'domain', value: 'good.example.com' },
          { type: 'ip', value: 'definitely-not-an-ip' },
          { type: 'email', value: 'ops@example.com' },
        ],
      })
    );
    const data = await response.json();
    assert.equal(data.success, true);
    assert.equal(data.enriched, 1);
    assert.equal(data.rejected.length, 2);

    const serialized = JSON.stringify(data.rejected);
    assert.equal(serialized.includes('definitely-not-an-ip'), false, 'rejections must not reflect the raw value');
    assert.equal(serialized.includes('ops@example.com'), false);
    assert.ok(data.rejected.some((item: { reason: string }) => /not a valid ip/i.test(item.reason)));
    assert.ok(data.rejected.some((item: { reason: string }) => /cannot be enriched/i.test(item.reason)));
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('enrich POST degrades when a provider fails', async () => {
  resetScannerState();
  const restore = withProviderEnv({ VIRUSTOTAL_API_KEY: 'vt-key' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('provider offline');
  }) as typeof fetch;

  try {
    const response = await enrichPost(jsonRequest({ indicators: [{ type: 'domain', value: 'fails.example.com' }] }));
    const data = await response.json();
    // A provider outage must not fail the whole request.
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    const [result] = data.results;
    assert.equal(result.verdict, 'unknown');
    assert.equal(result.sources[0].provider, 'VirusTotal');
    assert.ok(result.sources[0].error);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('URLhaus listings escalate a domain to malicious', async () => {
  resetScannerState();
  const restore = withProviderEnv({ URLHAUS_AUTH_KEY: 'urlhaus-key' });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.match(String(input), /urlhaus-api\.abuse\.ch\/v1\/host\//);
    return Response.json({
      query_status: 'ok',
      urls: [{ url: 'http://malware.example/a' }, { url: 'http://malware.example/b' }],
      threat: 'malware_download',
    });
  }) as typeof fetch;

  try {
    const response = await enrichPost(jsonRequest({ indicators: [{ type: 'domain', value: 'malware.example' }] }));
    const data = await response.json();
    assert.equal(data.results[0].verdict, 'malicious');
    assert.match(data.results[0].sources[0].detail, /malware_download/);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('provider helpers reflect the configured environment', () => {
  const restore = withProviderEnv({ ABUSEIPDB_API_KEY: 'k', URLHAUS_AUTH_KEY: 'k' });
  try {
    assert.equal(isEnrichmentConfigured(), true);
    assert.deepEqual(configuredProviderNames(), ['AbuseIPDB', 'URLhaus']);
  } finally {
    restore();
  }

  const restoreEmpty = withProviderEnv({});
  try {
    assert.equal(isEnrichmentConfigured(), false);
    assert.deepEqual(configuredProviderNames(), []);
  } finally {
    restoreEmpty();
  }
});
