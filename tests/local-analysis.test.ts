import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractIocsFromText,
  scanSecretsInText,
  triageFile,
} from '../src/lib/security/local-analysis';
import { iocExtractorTool } from '../src/lib/tools/forensics';
import { githubSecretTool } from '../src/lib/tools/osint';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

test('secret scanning redacts findings and ignores fixture paths by default', () => {
  const positive = readFileSync(path.join(fixturesDir, 'secrets', 'positive.ts'), 'utf8');
  const negative = readFileSync(path.join(fixturesDir, 'secrets', 'negative.fixture.ts'), 'utf8');

  const findings = scanSecretsInText('src/example.ts', positive, {
    allowlist: [],
    ignoreComments: true,
    ignoreTestFixtures: true,
    minEntropy: 3,
  });
  assert.equal(findings.length > 0, true);
  assert.equal(findings.every((finding) => finding.maskedPreview.includes('***')), true);
  assert.equal(findings.every((finding) => !finding.maskedPreview.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD')), true);
  assert.equal(findings.every((finding) => finding.line > 0 && finding.column > 0), true);

  const ignoredFixture = scanSecretsInText('tests/fixtures/secrets/negative.fixture.ts', negative, {
    allowlist: [],
    ignoreComments: true,
    ignoreTestFixtures: true,
    minEntropy: 3,
  });
  assert.deepEqual(ignoredFixture, []);
});

test('github secret tool scans pasted text and multiple files without leaking raw secrets', async () => {
  const positive = readFileSync(path.join(fixturesDir, 'secrets', 'positive.ts'));
  const negative = readFileSync(path.join(fixturesDir, 'secrets', 'negative.fixture.ts'));
  const result = await githubSecretTool.execute(
    {
      input: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD";',
      files: [
        new File([positive], 'positive.ts', { type: 'text/plain' }),
        new File([negative], 'negative.fixture.ts', { type: 'text/plain' }),
      ],
      ignoreComments: true,
      ignoreFixtures: true,
      minEntropy: 3,
    },
    {
      onProgress: () => undefined,
    }
  );

  assert.equal(result.success, true);
  const findings = result.data.findings as Array<{ maskedPreview: string; location: string }>;
  assert.equal(findings.length > 0, true);
  assert.equal(result.rawOutput?.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD'), false);
  assert.equal(findings.some((finding) => finding.location.includes('positive.ts')), true);
  assert.equal(findings.some((finding) => finding.location.includes('negative.fixture.ts')), false);
});

test('file triage detects text masquerading as an image and extracts validated IOCs', async () => {
  const sample = readFileSync(path.join(fixturesDir, 'ioc', 'sample.txt'));
  const file = new File([sample], 'invoice.jpg', { type: 'image/jpeg' });
  const report = await triageFile(file);

  assert.equal(report.mimeMismatch, true);
  assert.equal(report.extensionMismatch, true);
  assert.equal(report.detectedMime, 'text/plain');
  assert.equal(typeof report.hashes.sha256, 'string');
  assert.equal(report.iocs.some((ioc) => ioc.normalized === 'https://evil.example/path' && ioc.valid), true);
  assert.equal(report.iocs.some((ioc) => ioc.normalized === 'ops@example.com' && ioc.valid), true);
});

test('IOC extraction supports defanged indicators and stays local without consent', async () => {
  const sample = readFileSync(path.join(fixturesDir, 'ioc', 'sample.txt'), 'utf8');
  const extracted = extractIocsFromText(sample, 'fixture');
  assert.equal(extracted.some((ioc) => ioc.defanged && ioc.normalized === 'https://evil.example/path'), true);
  assert.equal(extracted.some((ioc) => ioc.type === 'hash' && ioc.valid), true);

  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = (async () => {
    networkCalls += 1;
    throw new Error('Enrichment must not be contacted without consent');
  }) as typeof fetch;

  try {
    const result = await iocExtractorTool.execute({ input: sample, enableEnrichment: false });
    assert.equal(result.success, true);
    assert.equal(result.data.enrichmentRequested, false);
    assert.equal(result.data.enrichmentPerformed, false);
    assert.equal(networkCalls, 0, 'no request may be made when consent is withheld');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('IOC enrichment only sends validated, supported indicators after consent', async () => {
  const sample = readFileSync(path.join(fixturesDir, 'ioc', 'sample.txt'), 'utf8');
  const originalFetch = globalThis.fetch;
  const sent: Array<{ type: string; value: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), '/api/enrich');
    const body = JSON.parse(String(init?.body)) as { indicators: Array<{ type: string; value: string }> };
    sent.push(...body.indicators);
    return Response.json({
      success: true,
      configuredProviders: ['VirusTotal'],
      requested: body.indicators.length,
      enriched: body.indicators.length,
      results: body.indicators.map((indicator) => ({
        type: indicator.type,
        value: indicator.value,
        verdict: indicator.type === 'ip' ? 'malicious' : 'harmless',
        sources: [
          {
            provider: 'VirusTotal',
            verdict: indicator.type === 'ip' ? 'malicious' : 'harmless',
            detail: 'fixture verdict',
          },
        ],
      })),
      rejected: [],
    });
  }) as typeof fetch;

  try {
    const result = await iocExtractorTool.execute({ input: sample, enableEnrichment: true });
    assert.equal(result.success, true);
    assert.equal(result.data.enrichmentPerformed, true);
    assert.deepEqual(result.data.enrichmentProviders, ['VirusTotal']);

    // Only locally validated indicators of an enrichable type may be forwarded.
    assert.ok(sent.length > 0, 'expected indicators to be forwarded');
    for (const indicator of sent) {
      assert.ok(['ip', 'domain', 'url', 'hash'].includes(indicator.type), `unexpected type ${indicator.type}`);
    }
    // Emails are extracted locally but are not enrichable, so they must not leave.
    assert.equal(sent.some((indicator) => indicator.value.includes('@')), false);

    const counts = result.data.enrichmentVerdictCounts as Record<string, number>;
    assert.ok(counts.malicious >= 1, 'the fixture IP should be reported malicious');
    assert.match(String(result.rawOutput), /Provider enrichment/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('IOC enrichment degrades to local-only when no provider is configured', async () => {
  const sample = readFileSync(path.join(fixturesDir, 'ioc', 'sample.txt'), 'utf8');
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    Response.json(
      {
        success: false,
        errorCode: 'ENRICHMENT_NOT_CONFIGURED',
        message: 'No enrichment provider is configured on this deployment.',
        retryable: false,
      },
      { status: 503 }
    )) as typeof fetch;

  try {
    const result = await iocExtractorTool.execute({ input: sample, enableEnrichment: true });
    assert.equal(result.success, true);
    assert.equal(result.data.enrichmentPerformed, false);
    assert.match(String(result.data.enrichmentReason), /no enrichment provider is configured/i);
    assert.match(String(result.summary), /provider enrichment unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
