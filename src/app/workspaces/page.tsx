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

function getMonogram(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function WorkspacesPage() {
  const coreWorkspaces = workspaceRegistry.filter((workspace) => workspace.maturity === 'core');
  const utilityWorkspaces = workspaceRegistry.filter((workspace) => workspace.maturity === 'utility');
  const featuredWorkspace = coreWorkspaces.find((workspace) => workspace.priority) ?? coreWorkspaces[0];
  const remainingCore = coreWorkspaces.filter((workspace) => workspace.id !== featuredWorkspace.id);

  return (
    <div className="page-shell space-y-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <div className="badge badge-cyan">11 focused workspaces</div>
          <h1 className="text-3xl font-bold md:text-5xl">Choose a security workflow</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            CyberKit groups related capabilities around outcomes instead of forcing a flat utility
            catalog. The page below uses one featured workflow, dense operational rows, and compact
            utility lanes rather than repeating the same card structure everywhere.
          </p>
        </div>

        <aside className="glass-card space-y-4 p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            How to read this page
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Start with the featured workflow if you want the strongest outcome-driven path.</p>
            <p>Use core workflow rows when you already know the investigation family.</p>
            <p>Drop into utilities only when you need smaller workbenches or transformations.</p>
          </div>
        </aside>
      </header>

      <section aria-labelledby="core-workspaces" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="core-workspaces" className="text-xl font-semibold">Core</h2>
            <p className="mt-1 text-sm text-muted-foreground">{maturityCopy.core}</p>
          </div>
          <span className="text-xs text-muted-foreground">{coreWorkspaces.length} workspaces</span>
        </div>

        <Link
          href={featuredWorkspace.canonicalPath}
          className="glass-card group block overflow-hidden p-6 transition-colors hover:border-[color:var(--accent-border)]"
        >
          <div className="grid gap-6 lg:grid-cols-[88px_minmax(0,1fr)_auto] lg:items-end">
            <div className="font-mono text-4xl font-semibold text-cyber-cyan/85">
              {getMonogram(featuredWorkspace.name)}
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {featuredWorkspace.priority && <span className="badge badge-green">Priority workflow</span>}
                <span className="badge badge-cyan capitalize">{featuredWorkspace.maturity}</span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight group-hover:text-foreground">
                {featuredWorkspace.name}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {featuredWorkspace.description}
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {featuredWorkspace.toolIds.length} capabilities
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm text-cyber-cyan">
                Open workspace <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </Link>

        <div className="glass-card overflow-hidden">
          {remainingCore.map((workspace, index) => (
            <Link
              key={workspace.id}
              href={workspace.canonicalPath}
              className={`group grid gap-3 px-5 py-4 transition-colors hover:bg-surface-hover/50 md:grid-cols-[minmax(0,1fr)_160px_120px] md:items-center ${
                index > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-cyber-cyan">
                    <WorkspaceIcon name={workspace.icon} size={16} />
                  </span>
                  <span className="truncate text-sm font-medium">{workspace.name}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{workspace.description}</p>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {workspace.goal}
              </div>
              <div className="text-left text-xs text-cyber-cyan md:text-right">
                {workspace.toolIds.length} capabilities
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="utility-workspaces" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="utility-workspaces" className="text-xl font-semibold">Utility</h2>
            <p className="mt-1 text-sm text-muted-foreground">{maturityCopy.utility}</p>
          </div>
          <span className="text-xs text-muted-foreground">{utilityWorkspaces.length} workspaces</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
          <div className="glass-card p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Utility readout
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Utility workspaces are smaller benches. They are meant for transformation, reference,
              planning, or specialist tasks that support the main investigation rather than replace it.
            </p>
          </div>

          <div className="space-y-3">
            {utilityWorkspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={workspace.canonicalPath}
                className="glass-card group grid gap-4 p-4 transition-colors hover:border-[color:var(--accent-border)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center"
              >
                <div className="font-mono text-lg uppercase tracking-[0.18em] text-muted-foreground">
                  {getMonogram(workspace.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">{workspace.name}</h3>
                    <span className="badge badge-cyan capitalize">{workspace.maturity}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{workspace.description}</p>
                </div>
                <div className="text-xs text-cyber-cyan">{workspace.toolIds.length} panels</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="experimental-workspaces" className="space-y-4">
        <div>
          <h2 id="experimental-workspaces" className="text-xl font-semibold">Experimental</h2>
          <p className="mt-1 text-sm text-muted-foreground">{maturityCopy.experimental}</p>
        </div>
        <Link
          href="/labs"
          className="glass-card group grid gap-4 p-5 transition-colors hover:border-border-bright md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
        >
          <FlaskConical size={22} className="text-cyber-purple" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Security Labs</h3>
              <span className="badge badge-purple">Experimental</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Practice isolated vulnerability scenarios. Labs are separated from operational analysis
              workflows and do not count toward the 11 workspace limit.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-cyber-purple">
            Open labs <Layers3 size={13} />
          </span>
        </Link>
      </section>
    </div>
  );
}
