'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Binary,
  FileScan,
  Hash,
  KeyRound,
  LockKeyhole,
  Network,
  Puzzle,
  Radar,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import ToolRunner from '@/components/workspaces/ToolRunner';
import HashWorkbenchPanel from '@/components/workspaces/HashWorkbenchPanel';
import TransformationPipeline from '@/components/workspaces/TransformationPipeline';
import StatePanel from '@/components/ui/StatePanel';
import type { ToolMetadata } from '@/lib/tools/metadata';
import type { WorkspaceDefinition } from '@/lib/tools/workspaces';

const iconMap = {
  ShieldCheck,
  Radar,
  Network,
  Workflow,
  KeyRound,
  Puzzle,
  Hash,
  LockKeyhole,
  FileScan,
  ScanSearch,
  ShieldAlert,
  Binary,
} as const;

interface WorkspaceClientProps {
  workspace: WorkspaceDefinition;
  tools: ToolMetadata[];
  initialToolId?: string;
}

export default function WorkspaceClient({
  workspace,
  tools,
  initialToolId,
}: WorkspaceClientProps) {
  const initialTool =
    tools.find((tool) => tool.id === initialToolId) ??
    tools.find((tool) => workspace.primaryToolIds.includes(tool.id)) ??
    tools[0];
  const [activeToolId, setActiveToolId] = useState(initialTool?.id ?? '');
  const activeTool = tools.find((tool) => tool.id === activeToolId);
  const Icon = iconMap[workspace.icon as keyof typeof iconMap] ?? Workflow;

  const primaryTools = useMemo(
    () => workspace.primaryToolIds
      .map((toolId) => tools.find((tool) => tool.id === toolId))
      .filter((tool): tool is ToolMetadata => tool !== undefined),
    [tools, workspace.primaryToolIds]
  );

  const selectTool = (toolId: string) => {
    setActiveToolId(toolId);
    window.history.replaceState(null, '', `${workspace.canonicalPath}?tool=${encodeURIComponent(toolId)}`);
  };

  return (
    <div className="page-shell space-y-6">
      <header className="glass-card relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[color:var(--accent-soft)] to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan">
              <Icon size={24} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`badge ${
                  workspace.maturity === 'core'
                    ? 'badge-green'
                    : workspace.maturity === 'utility'
                      ? 'badge-cyan'
                      : 'badge-purple'
                }`}>
                  {workspace.maturity}
                </span>
                {workspace.priority && <span className="badge badge-amber">Priority workflow</span>}
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">{workspace.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {workspace.description}
              </p>
            </div>
          </div>

          {workspace.primaryAction && (
            <Link
              href={workspace.primaryAction.href}
              className="btn-cyber btn-primary shrink-0 self-start"
            >
              {workspace.primaryAction.label} <ArrowRight size={15} />
            </Link>
          )}
        </div>
        {workspace.primaryAction && (
          <p className="relative mt-4 max-w-3xl text-xs text-muted-foreground">
            {workspace.primaryAction.description}
          </p>
        )}
      </header>

      {(
        workspace.id === 'password-security' ||
        workspace.id === 'jwt-inspector' ||
        workspace.id === 'secret-scanner' ||
        workspace.id === 'file-triage-ioc'
      ) && (
        <aside className="rounded-2xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-4 text-sm text-muted-foreground">
          {workspace.id === 'password-security'
            ? 'Password inputs and generated values remain in browser memory and are excluded from history, reports, analytics, localStorage, exports, and Cloud Sync. Optional HIBP checks send only a five-character SHA-1 prefix, receive a parsed range, and keep suffix matching local.'
            : workspace.id === 'jwt-inspector'
              ? 'JWT tokens, verification secrets, public keys, and JWKS material are processed locally and excluded from history, reports, analytics, localStorage, exports, and Cloud Sync. Decoding alone never establishes authenticity, and sensitive claims are redacted by default.'
              : workspace.id === 'secret-scanner'
                ? 'Secret scanning runs locally by default. Findings are redacted, excluded from history, reports, analytics, localStorage, exports, and Cloud Sync, and can ignore comments or fixture paths to reduce false positives.'
                : 'File triage and IOC extraction run locally by default. Uploaded files, extracted strings, metadata, hashes, and IOC results are excluded from history, reports, analytics, localStorage, exports, and Cloud Sync. Provider enrichment is never performed unless you explicitly request it.'}
        </aside>
      )}

      {tools.length === 0 ? (
        <StatePanel
          icon={<Workflow size={24} />}
          title="No capability panels available"
          description="This workspace is registered, but no executable capability is currently assigned."
          action={<Link href="/workspaces" className="text-sm text-cyber-cyan hover:text-foreground">Back to workspaces</Link>}
        />
      ) : (
        <>
          <section className="glass-card p-4" aria-labelledby="capability-panels-heading">
            <div className="mb-3">
              <h2 id="capability-panels-heading" className="text-sm font-semibold">
                Capability panels
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch panels without loading executor code until you run the selected capability.
              </p>
            </div>

            {primaryTools.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workflow
                </p>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={`${workspace.name} workflow panels`}>
                  {primaryTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      role="tab"
                      aria-selected={activeToolId === tool.id}
                      onClick={() => selectTool(tool.id)}
                      className={`tab-item border ${
                        activeToolId === tool.id
                          ? 'active border-[color:var(--accent-border)]'
                          : 'border-transparent bg-surface'
                      }`}
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {workspace.utilityGroups.map((group) => {
              const groupTools = group.toolIds
                .map((toolId) => tools.find((tool) => tool.id === toolId))
                .filter((tool): tool is ToolMetadata => tool !== undefined);
              if (!groupTools.length) return null;
              return (
                <div key={group.id} className="border-t border-border py-4 last:pb-0">
                  <p className="text-xs font-semibold text-foreground">{group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={group.name}>
                    {groupTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        role="tab"
                        aria-selected={activeToolId === tool.id}
                        onClick={() => selectTool(tool.id)}
                        className={`tab-item border ${
                          activeToolId === tool.id
                            ? 'active border-[color:var(--accent-border)]'
                            : 'border-transparent bg-surface'
                        }`}
                      >
                        {tool.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {activeTool ? (
            <section aria-labelledby="active-panel-heading">
              {(workspace.id === 'data-transformation' || workspace.id === 'ctf-decoder-workbench') && (
                <div className="mb-6">
                  <TransformationPipeline workspaceId={workspace.id} />
                </div>
              )}
              {workspace.id === 'hash-crypto-workbench' && (
                <div className="mb-6">
                  <HashWorkbenchPanel />
                </div>
              )}
              <div className="mb-4">
                <h2 id="active-panel-heading" className="text-xl font-semibold">
                  {activeTool.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeTool.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-cyan">{activeTool.privacyLevel}</span>
                  <span className="badge badge-purple">{activeTool.executionType}-side</span>
                  <span className="badge badge-green">{activeTool.testCoverage.status} tests</span>
                </div>
              </div>
              <ToolRunner key={activeTool.id} tool={activeTool} />
            </section>
          ) : (
            <StatePanel
              icon={<Workflow size={24} />}
              title="Select a capability panel"
              description="Choose a workflow or utility panel above to begin."
            />
          )}
        </>
      )}
    </div>
  );
}
