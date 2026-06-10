import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLoadedExecutorWorkspaces,
  loadToolExecutor,
  validateRegistrySync,
} from '../src/lib/tools/registry';
import { allToolMetadata } from '../src/lib/tools/metadata';
import { pwnedPasswordTool } from '../src/lib/tools/hashing';
import { sha1RangeParts } from '../src/lib/security/password';

test('metadata import does not eagerly invoke workspace executor loaders', () => {
  assert.deepEqual(getLoadedExecutorWorkspaces(), []);
});

test('tool executor loads only its owning workspace on demand', async () => {
  const tool = await loadToolExecutor('base64');
  assert.ok(tool);
  assert.equal(tool.slug, 'base64');
  assert.deepEqual(getLoadedExecutorWorkspaces(), ['data-transformation']);
});

test('tool registry has unique ids and slugs', () => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const tool of allToolMetadata) {
    assert.equal(ids.has(tool.id), false, `Duplicate tool id: ${tool.id}`);
    assert.equal(slugs.has(tool.slug), false, `Duplicate tool slug: ${tool.slug}`);
    ids.add(tool.id);
    slugs.add(tool.slug);
  }
});

test('tool inputs have valid defaults and option values', () => {
  for (const tool of allToolMetadata) {
    const inputIds = new Set<string>();
    for (const input of tool.inputs) {
      assert.equal(inputIds.has(input.id), false, `Duplicate input id ${input.id} in ${tool.id}`);
      inputIds.add(input.id);

      if (input.type === 'select') {
        assert.ok(input.options?.length, `Select input ${input.id} in ${tool.id} must define options`);
        const values = new Set(input.options.map((option) => option.value));
        if (input.defaultValue !== undefined) {
          assert.equal(values.has(String(input.defaultValue)), true, `Invalid default for ${input.id} in ${tool.id}`);
        }
      }

      if (input.type === 'checkbox' && input.defaultValue !== undefined) {
        assert.equal(typeof input.defaultValue, 'boolean', `Checkbox default must be boolean for ${input.id} in ${tool.id}`);
      }
    }
  }
});

test('tool metadata includes architecture and privacy fields', () => {
  for (const metadata of allToolMetadata) {
    assert.ok(metadata.workspaceId);
    assert.ok(metadata.capabilities.length > 0);
    assert.ok(['core', 'utility', 'experimental'].includes(metadata.maturity));
    assert.ok(['local', 'sensitive-local', 'server-proxied', 'external-provider'].includes(metadata.privacyLevel));
    assert.ok(metadata.providers.length > 0);
    assert.equal(metadata.expectedInputs.length, metadata.inputs.length);
    assert.ok(metadata.limitations.length > 0);
    assert.ok(metadata.testCoverage.status);
  }
});

test('tool metadata stays in sync with lazy executors', async () => {
  await validateRegistrySync();
});

test('pwned password tool sends only the five-character hash prefix', async () => {
  const originalFetch = globalThis.fetch;
  let body = '';
  const { suffix } = await sha1RangeParts('password');
  globalThis.fetch = async (_input, init) => {
    body = String(init?.body || '');
    return Response.json({
      success: true,
      provider: 'test',
      hashPrefix: '5BAA6',
      range: [{ suffix, count: 42 }],
    });
  };

  try {
    const result = await pwnedPasswordTool.execute({ password: 'password' });
    assert.equal(result.success, true);
    assert.equal(body.includes('password'), false);
    const payload = JSON.parse(body) as { hashPrefix: string };
    assert.deepEqual(Object.keys(payload), ['hashPrefix']);
    assert.equal(payload.hashPrefix, '5BAA6');
    assert.equal(result.data.breachCount, 42);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
