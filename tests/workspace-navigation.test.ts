import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import nextConfig from '../next.config';
import { primaryNavigation } from '../src/lib/navigation';
import {
  nextSelectionIndex,
  priorityWorkspaces,
  searchWorkspaceNavigation,
} from '../src/lib/tools/workspace-navigation';
import { legacyRouteMappings, workspaceRegistry } from '../src/lib/tools/workspaces';

test('navigation prioritizes seven core workflows without flat tool routes', () => {
  assert.deepEqual(
    priorityWorkspaces.map((workspace) => workspace.id),
    [
      'website-security-audit',
      'domain-ip-intelligence',
      'jwt-inspector',
      'password-security',
      'file-triage-ioc',
      'secret-scanner',
      'cve-kev-intelligence',
    ]
  );
  assert.equal(primaryNavigation.some((item) => item.href.startsWith('/tools')), false);
  assert.equal(primaryNavigation.some((item) => item.href === '/workspaces'), true);
});

test('workspace search resolves utility capabilities inside their workspace', () => {
  const result = searchWorkspaceNavigation('base64').find((item) => item.id === 'base64');
  assert.ok(result);
  assert.equal(result.kind, 'tool');
  assert.equal(result.href, '/workspaces/data-transformation?tool=base64');
  assert.deepEqual(searchWorkspaceNavigation('definitely-no-match'), []);
});

test('keyboard selection stays within available search results', () => {
  assert.equal(nextSelectionIndex(0, 'previous', 5), 0);
  assert.equal(nextSelectionIndex(0, 'next', 5), 1);
  assert.equal(nextSelectionIndex(4, 'next', 5), 4);
  assert.equal(nextSelectionIndex(3, 'previous', 5), 2);
  assert.equal(nextSelectionIndex(0, 'next', 0), 0);
});

test('Next redirects cover the catalog, compare route, and every legacy tool URL', async () => {
  assert.equal(typeof nextConfig.redirects, 'function');
  const redirects = await nextConfig.redirects!();
  assert.equal(redirects.length, legacyRouteMappings.length + 2);

  for (const mapping of legacyRouteMappings) {
    const redirect = redirects.find((item) => item.source === mapping.source);
    assert.ok(redirect, `Missing redirect for ${mapping.source}`);
    assert.equal(redirect.destination, mapping.destination);
    assert.equal(redirect.permanent, true);
  }
});

test('workspace registry keeps generators and CTF decoders in utility workflows', () => {
  assert.equal(workspaceRegistry.length, 11);
  const transformation = workspaceRegistry.find((workspace) => workspace.id === 'data-transformation');
  const ctf = workspaceRegistry.find((workspace) => workspace.id === 'ctf-decoder-workbench');
  assert.ok(transformation);
  assert.ok(ctf);
  assert.equal(transformation.toolIds.includes('uuid-generator'), true);
  assert.equal(transformation.toolIds.includes('random-string'), true);
  assert.equal(ctf.maturity, 'utility');
});

test('catalog and homepage do not statically import executor registry', async () => {
  const files = await Promise.all([
    readFile('src/app/(app)/dashboard/DashboardClient.tsx', 'utf8'),
    readFile('src/app/(app)/workspaces/page.tsx', 'utf8'),
    readFile('src/components/layout/CommandPalette.tsx', 'utf8'),
  ]);
  for (const source of files) {
    assert.equal(source.includes("from '@/lib/tools/registry'"), false);
    assert.equal(source.includes('from "@/lib/tools/registry"'), false);
  }
});

test('a single root layout owns the html and body elements', async () => {
  // Comments legitimately mention <html>/<body>, so compare against source with
  // comments stripped to assert on real JSX only.
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const [rootLayout, appLayout, landingLayout] = (
    await Promise.all([
      readFile('src/app/layout.tsx', 'utf8'),
      readFile('src/app/(app)/layout.tsx', 'utf8'),
      readFile('src/app/(landing)/layout.tsx', 'utf8'),
    ])
  ).map(stripComments);

  // Next.js only supports multiple root layouts when there is no top-level
  // layout.tsx. Because src/app/layout.tsx exists, nested layouts must not
  // render their own document elements or the markup ends up with nested
  // <html>/<body> pairs and hydration mismatches.
  assert.match(rootLayout, /<html/);
  assert.match(rootLayout, /<body/);
  assert.equal(appLayout.includes('<html'), false);
  assert.equal(appLayout.includes('<body'), false);
  assert.equal(landingLayout.includes('<html'), false);
  assert.equal(landingLayout.includes('<body'), false);

  // The console shell lives in the (app) group so the landing route stays free
  // of the sidebar and command palette.
  assert.match(appLayout, /Sidebar/);
  assert.match(appLayout, /CommandPalette/);
  assert.match(appLayout, /id="main-content"/);
  assert.equal(rootLayout.includes('Sidebar'), false);
  assert.equal(landingLayout.includes('Sidebar'), false);
});

test('workspace shell exposes mobile, keyboard, loading, empty, and error states', async () => {
  const [sidebar, palette, workspace, loading, error, pipeline, hashPanel] = await Promise.all([
    readFile('src/components/layout/Sidebar.tsx', 'utf8'),
    readFile('src/components/layout/CommandPalette.tsx', 'utf8'),
    readFile('src/app/(app)/workspaces/[workspace]/WorkspaceClient.tsx', 'utf8'),
    readFile('src/app/(app)/workspaces/[workspace]/loading.tsx', 'utf8'),
    readFile('src/app/(app)/workspaces/[workspace]/error.tsx', 'utf8'),
    readFile('src/components/workspaces/TransformationPipeline.tsx', 'utf8'),
    readFile('src/components/workspaces/HashWorkbenchPanel.tsx', 'utf8'),
  ]);

  assert.match(sidebar, /aria-label="Mobile navigation"/);
  assert.match(sidebar, /event\.key === 'Escape'/);
  assert.match(palette, /event\.key === 'ArrowDown'/);
  assert.match(palette, /event\.key === 'ArrowUp'/);
  assert.match(workspace, /No capability panels available/);
  assert.match(workspace, /TransformationPipeline/);
  assert.match(loading, /aria-label="Loading workspace"/);
  assert.match(error, /Workspace could not be loaded/);
  assert.match(error, /unstable_retry/);
  assert.match(pipeline, /Save recipe/);
  assert.match(pipeline, /Undo/);
  assert.match(pipeline, /Input encoding/);
  assert.match(pipeline, /Output encoding/);
  assert.match(hashPanel, /Checksum Comparison/);
  assert.match(hashPanel, /Expected hash matched|Expected hash did not match/);
});
