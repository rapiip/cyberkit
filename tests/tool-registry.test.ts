import test from 'node:test';
import assert from 'node:assert/strict';
import { allTools } from '../src/lib/tools/registry';
import { allToolMetadata } from '../src/lib/tools/metadata';
import { pwnedPasswordTool } from '../src/lib/tools/hashing';

test('tool registry has unique ids and slugs', () => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const tool of allTools) {
    assert.equal(ids.has(tool.id), false, `Duplicate tool id: ${tool.id}`);
    assert.equal(slugs.has(tool.slug), false, `Duplicate tool slug: ${tool.slug}`);
    ids.add(tool.id);
    slugs.add(tool.slug);
  }
});

test('tool inputs have valid defaults and option values', () => {
  for (const tool of allTools) {
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

test('tool metadata stays in sync with executable registry', () => {
  assert.deepEqual(
    allToolMetadata.map((tool) => tool.slug).sort(),
    allTools.map((tool) => tool.slug).sort()
  );
  for (const metadata of allToolMetadata) {
    const tool = allTools.find((item) => item.slug === metadata.slug);
    assert.ok(tool, `Missing executable tool for ${metadata.slug}`);
    assert.equal(metadata.name, tool.name);
    assert.equal(metadata.category, tool.category);
    assert.deepEqual(metadata.inputs, tool.inputs);
  }
});

test('pwned password tool sends only hash range data to backend', async () => {
  const originalFetch = globalThis.fetch;
  let body = '';
  globalThis.fetch = async (_input, init) => {
    body = String(init?.body || '');
    return Response.json({
      success: true,
      provider: 'test',
      pwned: false,
      breachCount: 0,
      hashPrefix: '5BAA6',
    });
  };

  try {
    const result = await pwnedPasswordTool.execute({ password: 'password' });
    assert.equal(result.success, true);
    assert.equal(body.includes('password'), false);
    const payload = JSON.parse(body) as { hashPrefix: string; hashSuffix: string };
    assert.equal(payload.hashPrefix, '5BAA6');
    assert.equal(payload.hashSuffix.length, 35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
