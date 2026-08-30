import { RESULT_SCHEMA_VERSION, type Finding, type FindingSeverity } from './types';
import { containsPersistenceRestrictedTool } from '@/lib/security/privacy';
import type { WorkspaceSessionEntry } from '@/lib/store/workspace-session';
import type { WorkspaceDefinition } from './workspaces';

/**
 * Builds one report from several capability runs inside a workspace.
 *
 * Until now only the unified `/audit` flow could produce a report, so a domain
 * investigation that combined DNS, RDAP, IP and TLS panels left the analyst
 * copying panels by hand. This assembles those runs into a single Markdown or
 * JSON artefact with a merged findings table.
 */

const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

export interface WorkspaceReportFindingRow extends Finding {
  toolId: string;
  toolName: string;
}

export interface WorkspaceReport {
  schemaVersion: string;
  generatedAt: string;
  workspace: { id: string; name: string; maturity: string };
  target: string;
  title: string;
  toolsUsed: string[];
  severityCounts: Record<FindingSeverity, number>;
  runs: Array<{
    toolId: string;
    toolName: string;
    inputSummary: string;
    target: string;
    status: string;
    success: boolean;
    summary: string;
    items: Array<{ label: string; value: string; status?: string; details?: string }>;
    findings: Finding[];
    rawOutput?: string;
    createdAt: string;
  }>;
  findings: WorkspaceReportFindingRow[];
}

function emptySeverityCounts(): Record<FindingSeverity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

/**
 * Picks the report target. Entries usually share one target (the domain under
 * investigation); when they do not, the most frequent one wins so the title
 * still describes the bulk of the work.
 */
export function deriveReportTarget(entries: WorkspaceSessionEntry[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const target = entry.target.trim();
    if (!target) continue;
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  if (counts.size === 0) return 'Multiple inputs';
  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return counts.size === 1 ? sorted[0][0] : `${sorted[0][0]} (+${counts.size - 1} more)`;
}

export function buildWorkspaceReport(
  workspace: Pick<WorkspaceDefinition, 'id' | 'name' | 'maturity'>,
  entries: WorkspaceSessionEntry[]
): WorkspaceReport {
  if (entries.length === 0) throw new Error('Select at least one capability result to include in the report.');

  // Defence in depth: the session store already refuses restricted tools, but a
  // report is an export path so the invariant is asserted here too.
  const toolsUsed = Array.from(new Set(entries.map((entry) => entry.toolId)));
  if (containsPersistenceRestrictedTool(toolsUsed)) {
    throw new Error('This report includes a privacy-restricted panel and cannot be generated.');
  }

  const ordered = [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const severityCounts = emptySeverityCounts();
  const findings: WorkspaceReportFindingRow[] = [];

  for (const entry of ordered) {
    for (const finding of entry.result.findings) {
      severityCounts[finding.severity] += 1;
      findings.push({ ...finding, toolId: entry.toolId, toolName: entry.toolName });
    }
  }

  findings.sort(
    (left, right) =>
      SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity) ||
      left.toolName.localeCompare(right.toolName) ||
      left.title.localeCompare(right.title)
  );

  const target = deriveReportTarget(ordered);

  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    workspace: { id: workspace.id, name: workspace.name, maturity: workspace.maturity },
    target,
    title: `${workspace.name} — ${target}`,
    toolsUsed,
    severityCounts,
    runs: ordered.map((entry) => ({
      toolId: entry.toolId,
      toolName: entry.toolName,
      inputSummary: entry.inputSummary,
      target: entry.target,
      status: entry.result.status,
      success: entry.result.success,
      summary: entry.result.summary ?? '',
      items: entry.result.items ?? [],
      findings: entry.result.findings,
      rawOutput: entry.result.rawOutput,
      createdAt: entry.createdAt,
    })),
    findings,
  };
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderWorkspaceReportMarkdown(report: WorkspaceReport): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push('## Report Metadata');
  lines.push('');
  lines.push(`- Workspace: ${report.workspace.name} (${report.workspace.maturity})`);
  lines.push(`- Target: ${report.target}`);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Capabilities executed: ${report.runs.length}`);
  lines.push(`- Schema version: ${report.schemaVersion}`);
  lines.push('');

  lines.push('## Severity Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('| --- | --- |');
  for (const severity of SEVERITY_ORDER) {
    lines.push(`| ${severity} | ${report.severityCounts[severity]} |`);
  }
  lines.push('');

  if (report.findings.length > 0) {
    lines.push('## Findings');
    lines.push('');
    for (const finding of report.findings) {
      lines.push(`### [${finding.severity.toUpperCase()}] ${finding.title}`);
      lines.push('');
      lines.push(`- Source panel: ${finding.toolName}`);
      lines.push(`- Confidence: ${finding.confidence}`);
      lines.push(`- Evidence: ${finding.evidence}`);
      lines.push(`- Remediation: ${finding.remediation}`);
      if (finding.references.length > 0) {
        lines.push(`- References: ${finding.references.join(', ')}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## Findings');
    lines.push('');
    lines.push('No structured findings were produced by the included capabilities.');
    lines.push('');
  }

  lines.push('## Capability Results');
  lines.push('');
  for (const run of report.runs) {
    lines.push(`### ${run.toolName}`);
    lines.push('');
    lines.push(`- Status: ${run.status}`);
    lines.push(`- Input: ${run.inputSummary}`);
    lines.push(`- Executed: ${run.createdAt}`);
    if (run.summary) lines.push(`- Summary: ${run.summary}`);
    lines.push('');
    if (run.items.length > 0) {
      lines.push('| Check | Value | Status |');
      lines.push('| --- | --- | --- |');
      for (const item of run.items) {
        lines.push(
          `| ${escapeTableCell(item.label)} | ${escapeTableCell(item.value)} | ${item.status ?? 'info'} |`
        );
      }
      lines.push('');
    }
  }

  lines.push('## Disclaimer');
  lines.push('');
  lines.push(
    'Results reflect the state observed at generation time. Heuristic checks and third-party provider verdicts are indicative, not conclusive. Only test systems you own or are explicitly authorised to assess.'
  );
  lines.push('');

  return lines.join('\n');
}
