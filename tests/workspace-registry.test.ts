import test from 'node:test';
import assert from 'node:assert/strict';
import { allToolMetadata } from '../src/lib/tools/metadata';
import {
  legacyRouteMappings,
  resolveLegacyToolRoute,
  toolWorkspaceAssignments,
  workspaceRegistry,
} from '../src/lib/tools/workspaces';

test('workspace registry stays within the phase-one product limit', () => {
  assert.equal(workspaceRegistry.length, 11);
  assert.equal(new Set(workspaceRegistry.map((workspace) => workspace.id)).size, workspaceRegistry.length);
});

test('every tool belongs to exactly one workspace', () => {
  assert.equal(Object.keys(toolWorkspaceAssignments).length, allToolMetadata.length);
  for (const tool of allToolMetadata) {
    const owners = workspaceRegistry.filter((workspace) => workspace.toolIds.includes(tool.id));
    assert.equal(owners.length, 1, `${tool.id} must have exactly one workspace owner`);
    assert.equal(owners[0].id, tool.workspaceId);
  }
});

test('legacy route plan redirects every current tool route to its owning workspace', () => {
  assert.equal(legacyRouteMappings.length, allToolMetadata.length);
  for (const tool of allToolMetadata) {
    const source = `/tools/${tool.slug}`;
    const mapping = resolveLegacyToolRoute(source);
    assert.ok(mapping, `Missing legacy mapping for ${source}`);
    assert.equal(mapping.toolId, tool.id);
    assert.equal(mapping.active, true);
    assert.equal(mapping.destination.startsWith('/workspaces/'), true);
    assert.equal(mapping.destination.endsWith(`?tool=${tool.id}`), true);
  }
});
