import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createToolResultExport,
  createSavedReportExport,
  isFinding,
  isToolResult,
  normalizeToolResult,
} from '../src/lib/tools/result-model';
import { RESULT_SCHEMA_VERSION } from '../src/lib/tools/types';

test('result model normalizes legacy success and validation failures', () => {
  const success = normalizeToolResult({ success: true, data: { value: 'ok' } });
  const invalid = normalizeToolResult({
    success: false,
    summary: 'Input is required',
    data: {},
  });

  assert.equal(success.status, 'success');
  assert.equal(invalid.status, 'validation-error');
  assert.equal(success.schemaVersion, RESULT_SCHEMA_VERSION);
  assert.deepEqual(success.findings, []);
  assert.equal(isToolResult(success), true);
});

test('finding schema requires evidence, remediation, source, and references', () => {
  assert.equal(
    isFinding({
      id: 'finding-1',
      title: 'Missing policy',
      severity: 'medium',
      confidence: 'high',
      evidence: 'Header was absent',
      remediation: 'Add the header',
      source: 'header-check',
      references: ['https://example.com/reference'],
    }),
    true
  );
  assert.equal(isFinding({ id: 'incomplete' }), false);
});

test('structured JSON export carries a schema version and normalized result', () => {
  const result = normalizeToolResult({ success: true, data: { digest: 'abc' } });
  const exported = createToolResultExport(
    { id: 'sha256-generator', slug: 'sha256-generator', name: 'SHA-256 Generator' },
    result
  );

  assert.equal(exported.schemaVersion, RESULT_SCHEMA_VERSION);
  assert.equal(exported.tool.slug, 'sha256-generator');
  assert.equal(isToolResult(exported.result), true);
  assert.doesNotThrow(() => JSON.stringify(exported));
});

test('saved report JSON export carries a schema version', () => {
  const now = new Date().toISOString();
  const exported = createSavedReportExport({
    id: 'report-1',
    title: 'Audit',
    target: 'https://example.com',
    content: '# Audit',
    format: 'markdown',
    toolsUsed: ['audit'],
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(exported.schemaVersion, RESULT_SCHEMA_VERSION);
  assert.equal(exported.report.id, 'report-1');
});
