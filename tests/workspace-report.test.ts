import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  MAX_SESSION_ENTRIES_PER_WORKSPACE,
  canCollectToolResult,
  selectWorkspaceEntries,
  useWorkspaceSessionStore,
  type WorkspaceSessionEntry,
} from '../src/lib/store/workspace-session';
import {
  buildWorkspaceReport,
  deriveReportTarget,
  renderWorkspaceReportMarkdown,
} from '../src/lib/tools/workspace-report';
import { PERSISTENCE_RESTRICTED_TOOL_IDS } from '../src/lib/security/privacy';
import { getWorkspaceById } from '../src/lib/tools/workspaces';
import { normalizeToolResult } from '../src/lib/tools/result-model';
import type { Finding, ToolResult } from '../src/lib/tools/types';

/**
 * Cross-tool workspace reporting. The critical property is that the collection
 * feeding an export can never contain a privacy-restricted panel.
 */

function fakeResult(over: Partial<ToolResult> = {}): ToolResult {
  return normalizeToolResult({
    success: true,
    summary: 'ok',
    data: { value: 1 },
    rawOutput: 'raw output',
    items: [{ label: 'Check', value: 'Value', status: 'pass' }],
    ...over,
  });
}

function finding(over: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    title: 'Example finding',
    severity: 'high',
    confidence: 'high',
    evidence: 'evidence',
    remediation: 'remediate',
    source: 'https://example.com',
    references: ['https://example.com/ref'],
    ...over,
  };
}

function entry(over: Partial<WorkspaceSessionEntry> = {}): WorkspaceSessionEntry {
  return {
    id: over.id ?? 'e1',
    workspaceId: 'domain-ip-intelligence',
    toolId: 'dns-lookup',
    toolName: 'DNS Lookup',
    inputSummary: 'hostname: example.com',
    target: 'example.com',
    result: fakeResult(),
    createdAt: '2026-08-30T00:00:00.000Z',
    ...over,
  };
}

test.beforeEach(() => {
  useWorkspaceSessionStore.getState().clearAll();
});

// ══════════ Session store ══════════

test('session store collects results per workspace', () => {
  const store = useWorkspaceSessionStore.getState();
  store.recordResult({
    workspaceId: 'domain-ip-intelligence',
    toolId: 'dns-lookup',
    toolName: 'DNS Lookup',
    inputSummary: 'hostname: example.com',
    target: 'example.com',
    result: fakeResult(),
  });
  store.recordResult({
    workspaceId: 'website-security-audit',
    toolId: 'http-header-checker',
    toolName: 'HTTP Header Checker',
    inputSummary: 'url: example.com',
    target: 'example.com',
    result: fakeResult(),
  });

  const entries = useWorkspaceSessionStore.getState().entries;
  assert.equal(entries.length, 2);
  assert.equal(selectWorkspaceEntries(entries, 'domain-ip-intelligence').length, 1);
  assert.equal(selectWorkspaceEntries(entries, 'website-security-audit').length, 1);
  assert.equal(selectWorkspaceEntries(entries, 'secret-scanner').length, 0);
});

test('re-running the same panel for the same target replaces the previous run', () => {
  const store = useWorkspaceSessionStore.getState();
  const record = (summary: string) =>
    useWorkspaceSessionStore.getState().recordResult({
      workspaceId: 'domain-ip-intelligence',
      toolId: 'dns-lookup',
      toolName: 'DNS Lookup',
      inputSummary: 'hostname: example.com',
      target: 'example.com',
      result: fakeResult({ summary }),
    });

  record('first');
  record('second');

  const entries = useWorkspaceSessionStore.getState().entries;
  assert.equal(entries.length, 1);
  assert.equal(entries[0].result.summary, 'second');

  // A different target is a separate run.
  store.recordResult({
    workspaceId: 'domain-ip-intelligence',
    toolId: 'dns-lookup',
    toolName: 'DNS Lookup',
    inputSummary: 'hostname: other.example',
    target: 'other.example',
    result: fakeResult(),
  });
  assert.equal(useWorkspaceSessionStore.getState().entries.length, 2);
});

test('session store refuses every privacy-restricted tool', () => {
  for (const toolId of PERSISTENCE_RESTRICTED_TOOL_IDS) {
    assert.equal(canCollectToolResult(toolId), false, `${toolId} must not be collectable`);
    useWorkspaceSessionStore.getState().recordResult({
      workspaceId: 'file-triage-ioc',
      toolId,
      toolName: toolId,
      inputSummary: 'secret-bearing input',
      target: 'local file',
      result: fakeResult({ rawOutput: 'ghp_shouldNeverBeCollected' }),
    });
  }

  const entries = useWorkspaceSessionStore.getState().entries;
  assert.deepEqual(entries, [], 'restricted panels must not enter the session collection');
  assert.equal(JSON.stringify(entries).includes('ghp_'), false);
});

test('session store bounds the number of retained runs per workspace', () => {
  for (let index = 0; index < MAX_SESSION_ENTRIES_PER_WORKSPACE + 10; index += 1) {
    useWorkspaceSessionStore.getState().recordResult({
      workspaceId: 'network-workbench',
      toolId: 'cidr-calculator',
      toolName: 'CIDR Calculator',
      inputSummary: `cidr: 10.${index}.0.0/24`,
      target: `10.${index}.0.0/24`,
      result: fakeResult(),
    });
  }

  const entries = selectWorkspaceEntries(useWorkspaceSessionStore.getState().entries, 'network-workbench');
  assert.equal(entries.length, MAX_SESSION_ENTRIES_PER_WORKSPACE);
});

test('clearWorkspace only removes the targeted workspace', () => {
  const record = (workspaceId: 'network-workbench' | 'hash-crypto-workbench') =>
    useWorkspaceSessionStore.getState().recordResult({
      workspaceId,
      toolId: 'cidr-calculator',
      toolName: 'CIDR Calculator',
      inputSummary: 'cidr: 10.0.0.0/24',
      target: '10.0.0.0/24',
      result: fakeResult(),
    });

  record('network-workbench');
  record('hash-crypto-workbench');
  useWorkspaceSessionStore.getState().clearWorkspace('network-workbench');

  const entries = useWorkspaceSessionStore.getState().entries;
  assert.equal(selectWorkspaceEntries(entries, 'network-workbench').length, 0);
  assert.equal(selectWorkspaceEntries(entries, 'hash-crypto-workbench').length, 1);
});

// ══════════ Report builder ══════════

test('deriveReportTarget picks the dominant target and flags mixed batches', () => {
  assert.equal(deriveReportTarget([]), 'Multiple inputs');
  assert.equal(deriveReportTarget([entry(), entry({ id: 'e2' })]), 'example.com');
  assert.match(
    deriveReportTarget([entry(), entry({ id: 'e2' }), entry({ id: 'e3', target: 'other.example' })]),
    /^example\.com \(\+1 more\)$/
  );
});

test('buildWorkspaceReport merges runs, findings, and severity counts', () => {
  const workspace = getWorkspaceById('domain-ip-intelligence');
  assert.ok(workspace);

  const report = buildWorkspaceReport(workspace, [
    entry({
      id: 'e1',
      toolId: 'dns-lookup',
      toolName: 'DNS Lookup',
      createdAt: '2026-08-30T00:00:01.000Z',
      result: fakeResult({ findings: [finding({ id: 'dns-1', severity: 'low' })] }),
    }),
    entry({
      id: 'e2',
      toolId: 'ip-lookup',
      toolName: 'IP Geolocation & ASN',
      createdAt: '2026-08-30T00:00:00.000Z',
      result: fakeResult({
        findings: [finding({ id: 'ip-1', severity: 'critical' }), finding({ id: 'ip-2', severity: 'medium' })],
      }),
    }),
  ]);

  assert.equal(report.workspace.id, 'domain-ip-intelligence');
  assert.equal(report.target, 'example.com');
  assert.equal(report.title, 'Domain & IP Intelligence — example.com');
  assert.deepEqual(report.toolsUsed.sort(), ['dns-lookup', 'ip-lookup']);
  assert.equal(report.runs.length, 2);

  // Runs are ordered chronologically.
  assert.equal(report.runs[0].toolId, 'ip-lookup');
  assert.equal(report.runs[1].toolId, 'dns-lookup');

  // Findings are ordered by severity and attributed to their source panel.
  assert.deepEqual(
    report.findings.map((item) => item.severity),
    ['critical', 'medium', 'low']
  );
  assert.equal(report.findings[0].toolName, 'IP Geolocation & ASN');
  assert.equal(report.severityCounts.critical, 1);
  assert.equal(report.severityCounts.medium, 1);
  assert.equal(report.severityCounts.low, 1);
  assert.equal(report.severityCounts.high, 0);
  assert.equal(typeof report.schemaVersion, 'string');
});

test('buildWorkspaceReport rejects an empty selection', () => {
  const workspace = getWorkspaceById('domain-ip-intelligence');
  assert.ok(workspace);
  assert.throws(() => buildWorkspaceReport(workspace, []), /at least one/i);
});

test('buildWorkspaceReport refuses privacy-restricted panels even if forced', () => {
  const workspace = getWorkspaceById('file-triage-ioc');
  assert.ok(workspace);

  // Bypasses the store guard on purpose: the export path must defend itself.
  assert.throws(
    () =>
      buildWorkspaceReport(workspace, [
        entry({ workspaceId: 'file-triage-ioc', toolId: 'ioc-extractor', toolName: 'IOC Extractor' }),
      ]),
    /privacy-restricted/i
  );
});

test('renderWorkspaceReportMarkdown produces a complete, escaped document', () => {
  const workspace = getWorkspaceById('website-security-audit');
  assert.ok(workspace);

  const report = buildWorkspaceReport(workspace, [
    entry({
      workspaceId: 'website-security-audit',
      toolId: 'http-header-checker',
      toolName: 'HTTP Header Checker',
      target: 'example.com',
      result: fakeResult({
        summary: 'Score 50/100',
        items: [{ label: 'CSP | pipe', value: 'MISSING\nsecond line', status: 'fail' }],
        findings: [finding({ id: 'csp', title: 'CSP missing', severity: 'high' })],
      }),
    }),
  ]);

  const markdown = renderWorkspaceReportMarkdown(report);

  assert.match(markdown, /^# Website Security Audit — example\.com$/m);
  assert.match(markdown, /## Report Metadata/);
  assert.match(markdown, /## Severity Summary/);
  assert.match(markdown, /\| high \| 1 \|/);
  assert.match(markdown, /### \[HIGH\] CSP missing/);
  assert.match(markdown, /Source panel: HTTP Header Checker/);
  assert.match(markdown, /## Capability Results/);
  assert.match(markdown, /## Disclaimer/);

  // Pipes are escaped and newlines flattened so the table stays valid.
  assert.match(markdown, /CSP \\\| pipe/);
  assert.equal(markdown.includes('MISSING\nsecond line'), false);
  assert.match(markdown, /MISSING second line/);
});

test('report raw output is opt-in from the panel', async () => {
  const source = await readFile('src/components/workspaces/WorkspaceReportPanel.tsx', 'utf8');
  // Raw output can be large and may echo full responses, so it must default off.
  assert.match(source, /useState\(false\)/);
  assert.match(source, /includeRawOutput/);
  assert.match(source, /rawOutput: undefined/);
});

test('the report panel distinguishes empty collections from non-reportable workspaces', async () => {
  const source = await readFile('src/components/workspaces/WorkspaceReportPanel.tsx', 'utf8');
  assert.match(source, /Reporting is disabled for this workspace/);
  assert.match(source, /No results collected yet/);
  assert.match(source, /canCollectToolResult/);

  // File Triage, Secret Scanner, Password Security and JWT Inspector are made
  // entirely of restricted panels, so they can never produce a report.
  for (const workspaceId of ['file-triage-ioc', 'secret-scanner', 'password-security', 'jwt-inspector'] as const) {
    const workspace = getWorkspaceById(workspaceId);
    assert.ok(workspace, workspaceId);
    const anyReportable = workspace.toolIds.some((toolId) => canCollectToolResult(toolId));
    if (workspaceId === 'file-triage-ioc') {
      // email-format is not restricted, so this workspace can still report.
      assert.equal(anyReportable, true);
    } else {
      assert.equal(anyReportable, false, `${workspaceId} should have no reportable panel`);
    }
  }

  // Workspaces built from analysis panels must be reportable.
  for (const workspaceId of ['domain-ip-intelligence', 'website-security-audit', 'cve-kev-intelligence'] as const) {
    const workspace = getWorkspaceById(workspaceId);
    assert.ok(workspace);
    assert.equal(
      workspace.toolIds.some((toolId) => canCollectToolResult(toolId)),
      true,
      `${workspaceId} should be reportable`
    );
  }
});

test('the workspace shell wires the report panel and passes the workspace id', async () => {
  const [shell, runner] = await Promise.all([
    readFile('src/app/(app)/workspaces/[workspace]/WorkspaceClient.tsx', 'utf8'),
    readFile('src/components/workspaces/ToolRunner.tsx', 'utf8'),
  ]);

  assert.match(shell, /WorkspaceReportPanel/);
  assert.match(shell, /workspaceId=\{workspace\.id\}/);
  assert.match(runner, /recordResult\(/);
  // Only successful runs are collected.
  assert.match(runner, /workspaceId && nextResult\.success/);
});
