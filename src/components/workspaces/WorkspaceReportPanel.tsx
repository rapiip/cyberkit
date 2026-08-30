'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Download, FileJson, FileText, Save, ShieldCheck, Trash2 } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';
import { useReportsStore } from '@/lib/store';
import {
  canCollectToolResult,
  selectWorkspaceEntries,
  useWorkspaceSessionStore,
  type WorkspaceSessionEntry,
} from '@/lib/store/workspace-session';
import {
  buildWorkspaceReport,
  renderWorkspaceReportMarkdown,
} from '@/lib/tools/workspace-report';
import type { WorkspaceDefinition } from '@/lib/tools/workspaces';

function downloadFile(name: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fileSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'report';
}

function statusTone(entry: WorkspaceSessionEntry) {
  if (!entry.result.success) return 'text-status-fail';
  if (entry.result.status === 'partial') return 'text-status-warn';
  return 'text-status-pass';
}

/**
 * Assembles a report from the capability runs collected in this workspace during
 * the current session.
 *
 * Only non-restricted panels reach the session store, so this panel can never
 * export password, JWT, secret-scanner or file-triage material.
 */
export default function WorkspaceReportPanel({ workspace }: { workspace: WorkspaceDefinition }) {
  const entries = useWorkspaceSessionStore((state) => state.entries);
  const removeEntry = useWorkspaceSessionStore((state) => state.removeEntry);
  const clearWorkspace = useWorkspaceSessionStore((state) => state.clearWorkspace);
  const addReport = useReportsStore((state) => state.addReport);

  const workspaceEntries = useMemo(
    () => selectWorkspaceEntries(entries, workspace.id),
    [entries, workspace.id]
  );

  /**
   * Workspaces made entirely of privacy-restricted panels can never contribute to
   * a report, so say so instead of implying the analyst has not run anything.
   */
  const reportable = useMemo(
    () => workspace.toolIds.some((toolId) => canCollectToolResult(toolId)),
    [workspace.toolIds]
  );

  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [includeRawOutput, setIncludeRawOutput] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');

  const selected = workspaceEntries.filter((entry) => !excludedIds.includes(entry.id));

  const toggle = (id: string) => {
    setSavedMessage('');
    setError('');
    setExcludedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const build = () => {
    const report = buildWorkspaceReport(workspace, selected);
    if (!includeRawOutput) {
      return { ...report, runs: report.runs.map((run) => ({ ...run, rawOutput: undefined })) };
    }
    return report;
  };

  const run = (action: () => void) => {
    setError('');
    setSavedMessage('');
    try {
      action();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Report generation failed.');
    }
  };

  const exportMarkdown = () =>
    run(() => {
      const report = build();
      downloadFile(
        `cyberkit-${fileSlug(workspace.name)}-${fileSlug(report.target)}.md`,
        renderWorkspaceReportMarkdown(report),
        'text/markdown;charset=utf-8'
      );
    });

  const exportJson = () =>
    run(() => {
      const report = build();
      downloadFile(
        `cyberkit-${fileSlug(workspace.name)}-${fileSlug(report.target)}.json`,
        JSON.stringify(report, null, 2),
        'application/json'
      );
    });

  const saveToReports = () =>
    run(() => {
      const report = build();
      addReport({
        title: report.title,
        target: report.target,
        content: renderWorkspaceReportMarkdown(report),
        format: 'markdown',
        toolsUsed: report.toolsUsed,
      });
      setSavedMessage('Saved to Reports. Open the Reports page to export it as Markdown, JSON, or PDF.');
    });

  if (workspaceEntries.length === 0) {
    return (
      <section className="glass-card p-5" aria-labelledby="workspace-report-heading">
        <h2 id="workspace-report-heading" className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList size={16} className="text-cyber-cyan" /> Workspace report
        </h2>
        <div className="mt-4">
          {reportable ? (
            <StatePanel
              icon={<ClipboardList size={22} />}
              title="No results collected yet"
              description="Run one or more capability panels in this workspace. Successful runs are collected here so you can assemble a single cross-tool report."
            />
          ) : (
            <StatePanel
              icon={<ShieldCheck size={22} />}
              title="Reporting is disabled for this workspace"
              description="Every panel here is privacy-restricted, so its inputs and results are never written to reports, exports, history, or Cloud Sync. Use the per-panel result view instead."
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card p-5" aria-labelledby="workspace-report-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="workspace-report-heading" className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList size={16} className="text-cyber-cyan" /> Workspace report
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {workspaceEntries.length} capability run(s) collected this session. Results stay in memory until you
            export or save them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearWorkspace(workspace.id);
            setExcludedIds([]);
            setSavedMessage('');
            setError('');
          }}
          className="btn-cyber btn-ghost btn-sm text-muted-foreground hover:text-cyber-red"
        >
          <Trash2 size={12} /> Clear collected
        </button>
      </div>

      <ul className="space-y-2">
        {workspaceEntries.map((entry) => {
          const included = !excludedIds.includes(entry.id);
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3"
            >
              <label className="flex flex-1 min-w-0 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => toggle(entry.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--color-cyber-cyan)]"
                  aria-label={`Include ${entry.toolName} in the report`}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{entry.toolName}</span>
                    <span className={`font-mono text-xs ${statusTone(entry)}`}>{entry.result.status}</span>
                    {entry.result.findings.length > 0 && (
                      <span className="badge badge-amber text-xs">{entry.result.findings.length} finding(s)</span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{entry.inputSummary}</span>
                  {entry.result.summary && (
                    <span className="mt-1 block text-xs text-muted-foreground">{entry.result.summary}</span>
                  )}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="btn-cyber btn-ghost btn-sm text-muted-foreground hover:text-cyber-red"
                aria-label={`Remove the collected ${entry.toolName} result`}
              >
                <Trash2 size={12} />
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={includeRawOutput}
          onChange={(event) => setIncludeRawOutput(event.target.checked)}
          className="h-4 w-4 accent-[color:var(--color-cyber-cyan)]"
        />
        Include raw output for each capability (larger report)
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={exportMarkdown} disabled={selected.length === 0} className="btn-cyber btn-secondary btn-sm">
          <FileText size={13} /> Export Markdown
        </button>
        <button type="button" onClick={exportJson} disabled={selected.length === 0} className="btn-cyber btn-secondary btn-sm">
          <FileJson size={13} /> Export JSON
        </button>
        <button type="button" onClick={saveToReports} disabled={selected.length === 0} className="btn-cyber btn-primary btn-sm">
          <Save size={13} /> Save to Reports
        </button>
        <span className="text-xs text-muted-foreground">
          <Download size={11} className="mr-1 inline" />
          {selected.length} of {workspaceEntries.length} included
        </span>
      </div>

      <div aria-live="polite" className="mt-3">
        {error && (
          <p role="alert" className="rounded-xl border border-status-fail/25 bg-status-fail/5 px-3 py-2 text-xs text-status-fail">
            {error}
          </p>
        )}
        {savedMessage && (
          <p className="rounded-xl border border-status-pass/25 bg-status-pass/5 px-3 py-2 text-xs text-status-pass">
            {savedMessage}
          </p>
        )}
      </div>
    </section>
  );
}
