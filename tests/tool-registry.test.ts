import test from 'node:test';
import assert from 'node:assert/strict';
import { allTools } from '../src/lib/tools/registry';

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
