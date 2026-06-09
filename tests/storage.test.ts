import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImportedCyberKitData } from '../src/lib/store';

const report = {
  id: 'r1',
  title: 'Audit',
  target: 'https://example.com',
  content: '# Report',
  format: 'markdown',
  toolsUsed: ['audit'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('validateImportedCyberKitData accepts valid export shape', () => {
  const data = validateImportedCyberKitData({
    history: [],
    favorites: ['base64'],
    reports: [report],
    exportedAt: new Date().toISOString(),
  });

  assert.equal(data.version, 1);
  assert.deepEqual(data.favorites, ['base64']);
  assert.equal(data.reports.length, 1);
});

test('validateImportedCyberKitData rejects malformed reports', () => {
  assert.throws(
    () =>
      validateImportedCyberKitData({
        history: [],
        favorites: [],
        reports: [{ ...report, toolsUsed: 'audit' }],
      }),
    /invalid reports/i
  );
});
