import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FlaskConical, Layers3 } from 'lucide-react';
import WorkspaceIcon from '@/components/workspaces/WorkspaceIcon';
import { workspaceRegistry, type WorkspaceDefinition } from '@/lib/tools/workspaces';

export const metadata: Metadata = {
  title: 'Security Workspaces',
  description: 'Start a focused CyberKit security workflow instead of navigating a flat list of utilities.',
  alternates: { canonical: '/workspaces' },
};

const maturityCopy: Record<WorkspaceDefinition['maturity'], string> = {
  core: 'Primary workflows maintained for routine security analysis.',
  utility: 'Supporting workbenches and focused transformation utilities.',
  experimental: 'Isolated learning and simulation experiences.',
};

export default function WorkspacesPage() {
  const groups = (['core', 'utility'] as const).map((maturity) => ({
    maturity,
    workspaces: workspaceRegistry.filter((workspace) => workspace.maturity === maturity),
  }));

  return (
    <div className="page-shell space-y-10">
      <header className="max-w-3xl space-y-3">
        <div className="badge badge-cyan">11 focused workspaces</div>
        <h1 className="text-3xl font-bold md:text-4xl">Choose a security workflow</h1>
        <p className="text-sm leading-6 text-muted-foreground md:text-base">
          CyberKit groups related capabilities around an outcome. Simple encoders, generators,
          references, and classical decoders remain available as utility panels inside each workspace.
        </p>
      </header>

      {groups.map(({ maturity, workspaces }) => (
        <section key={maturity} aria-labelledby={`${maturity}-workspaces`}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id={`${maturity}-workspaces`} className="text-xl font-semibold">
                {maturity === 'core' ? 'Core' : 'Utility'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{maturityCopy[maturity]}</p>
            </div>
            <span className="text-xs text-muted-foreground">{workspaces.length} workspaces</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={workspace.canonicalPath}
                className="glass-card interactive-card group flex min-h-52 flex-col p-5 transition-all hover:border-[color:var(--accent-border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan">
                    <WorkspaceIcon name={workspace.icon} />
                  </div>
                  <div className="flex gap-2">
                    {workspace.priority && <span className="badge badge-green">Priority</span>}
                    <span className="badge badge-cyan capitalize">{workspace.maturity}</span>
                  </div>
                </div>
                <h3 className="mt-5 font-semibold transition-colors group-hover:text-foreground">
                  {workspace.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {workspace.description}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                  <span className="text-muted-foreground">{workspace.toolIds.length} capabilities</span>
                  <span className="flex items-center gap-1 text-cyber-cyan">
                    Open workspace <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section aria-labelledby="experimental-workspaces">
        <div className="mb-4">
          <h2 id="experimental-workspaces" className="text-xl font-semibold">Experimental</h2>
          <p className="mt-1 text-sm text-muted-foreground">{maturityCopy.experimental}</p>
        </div>
        <Link
          href="/labs"
          className="glass-card interactive-card group flex max-w-2xl items-start gap-4 p-5 transition-all hover:border-border-bright"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[color:var(--panel-subtle)] text-cyber-purple">
            <FlaskConical size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold group-hover:text-foreground">Security Labs</h3>
              <span className="badge badge-purple">Experimental</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Practice isolated vulnerability scenarios. Labs are separated from operational
              analysis workflows and do not count toward the 11 workspace limit.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-cyber-purple">
              Open labs <Layers3 size={13} />
            </span>
          </div>
        </Link>
      </section>
    </div>
  );
}
