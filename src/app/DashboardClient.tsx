'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bug,
  Clock3,
  FileSearch,
  Fingerprint,
  LockKeyhole,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import WorkspaceIcon from '@/components/workspaces/WorkspaceIcon';
import { useHistoryStore } from '@/lib/store';
import {
  priorityWorkspaces,
  searchWorkspaceNavigation,
} from '@/lib/tools/workspace-navigation';

interface GoalEntry {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: ElementType;
  secondary?: { label: string; href: string };
}

const goalEntries: GoalEntry[] = [
  {
    title: 'Audit a website',
    description: 'Review TLS, headers, CORS, policies, robots.txt, and security.txt in one workflow.',
    href: '/workspaces/website-security-audit',
    action: 'Start website audit',
    icon: ShieldCheck,
  },
  {
    title: 'Investigate a domain or IP',
    description: 'Correlate DNS, DoH, registration, IP, ASN, and reputation context.',
    href: '/workspaces/domain-ip-intelligence',
    action: 'Start investigation',
    icon: Radar,
  },
  {
    title: 'Analyze a file or log',
    description: 'Inspect metadata, signatures, strings, hashes, and indicators locally.',
    href: '/workspaces/file-triage-ioc',
    action: 'Open file triage',
    icon: FileSearch,
  },
  {
    title: 'Find secrets or IOCs',
    description: 'Scan text and source material for exposed credentials and actionable indicators.',
    href: '/workspaces/secret-scanner',
    action: 'Scan for secrets',
    icon: Search,
    secondary: { label: 'Extract IOCs', href: '/workspaces/file-triage-ioc?tool=ioc-extractor' },
  },
  {
    title: 'Check CVE and KEV',
    description: 'Look up vulnerability records and known-exploitation context.',
    href: '/workspaces/cve-kev-intelligence',
    action: 'Check vulnerability',
    icon: Bug,
  },
  {
    title: 'Analyze a password or JWT',
    description: 'Assess password exposure and inspect token structure and claims.',
    href: '/workspaces/password-security',
    action: 'Analyze password',
    icon: LockKeyhole,
    secondary: { label: 'Inspect JWT', href: '/workspaces/jwt-inspector' },
  },
  {
    title: 'Decode a payload',
    description: 'Use transformation pipelines and focused CTF decoder utilities.',
    href: '/workspaces/ctf-decoder-workbench',
    action: 'Open decoder',
    icon: TerminalSquare,
    secondary: { label: 'Transform data', href: '/workspaces/data-transformation' },
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function getMonogram(title: string) {
  return title
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Dashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { entries, loadFromStorage } = useHistoryStore();
  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchWorkspaceNavigation(searchQuery).slice(0, 8) : []),
    [searchQuery]
  );
  const showSearch = isSearchFocused && searchQuery.trim().length > 0;
  const featuredGoal = goalEntries[0];
  const secondaryGoals = goalEntries.slice(1, 5);
  const compactGoals = goalEntries.slice(5);
  const FeaturedGoalIcon = featuredGoal.icon;

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="page-shell space-y-10">
      <motion.header
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]"
      >
        <section className="space-y-6 rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(25,31,36,0.9),rgba(16,20,24,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-3 py-1.5 text-cyber-cyan">
              <Sparkles size={13} />
              Stealth Console workspace system
            </span>
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Analyst board
            </span>
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Analyst-first <span className="gradient-text">security workspace</span>
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              A quieter interface for focused investigation, audit work, and local analysis.
              Start from the task, move into the right workflow, and keep recent operational
              context visible without opening another screen.
            </p>
          </div>

          <div className="relative max-w-2xl text-left">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 150)}
              placeholder="Jump to a workflow, workspace, or tool"
              aria-label="Jump to a workflow, workspace, or tool"
              className="input-cyber py-3 pl-12 pr-4 text-sm"
            />
            {showSearch && (
              <div className="glass-card absolute z-20 mt-2 w-full overflow-hidden border border-[color:var(--accent-border)] py-2 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={`${result.kind}-${result.id}`}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                      onClick={() => router.push(result.href)}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {result.kind}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{result.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.kind === 'tool' ? `In ${result.workspaceName}` : result.description}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No workspace or capability matched &quot;{searchQuery}&quot;.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 border-t border-border pt-5 md:grid-cols-3">
            {[
              { label: 'Focused workspaces', value: '11' },
              { label: 'Priority workflows', value: String(priorityWorkspaces.length) },
              { label: 'Local-first execution', value: 'Default' },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-foreground">{item.value}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-card flex flex-col justify-between p-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Analyst board</h2>
              <Fingerprint size={15} className="text-cyber-cyan" />
            </div>
            <div className="space-y-3">
              {secondaryGoals.map((goal, index) => {
                const Icon = goal.icon;
                return (
                  <Link
                    key={goal.title}
                    href={goal.href}
                    className="flex items-start gap-3 rounded-2xl border border-transparent px-1 py-2 transition-colors hover:border-border hover:bg-surface-hover/60"
                  >
                    <span className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon size={15} className="text-cyber-cyan" />
                        {goal.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {goal.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Recent activity
              </h3>
              <Link href="/history" className="text-xs text-cyber-cyan hover:text-foreground">
                View history
              </Link>
            </div>
            {entries.length > 0 ? (
              <div className="space-y-2">
                {entries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] px-3 py-2"
                  >
                    <Clock3 size={14} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{entry.toolName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No local activity yet. Run a workflow and this board becomes your quick context rail.
              </p>
            )}
          </div>
        </aside>
      </motion.header>

      <motion.section
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.08 }}
        aria-labelledby="operational-lanes"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="operational-lanes" className="text-xl font-semibold">
              Operational lanes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One featured workflow, several compact entry points, and less repeated card furniture.
            </p>
          </div>
          <Link href="/workspaces" className="flex items-center gap-1 text-xs text-cyber-cyan">
            Browse workspace catalog <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <article className="glass-card flex flex-col justify-between gap-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
              <div className="font-mono text-4xl font-semibold leading-none text-cyber-cyan/85">
                {getMonogram(featuredGoal.title)}
              </div>
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <FeaturedGoalIcon size={15} className="text-cyber-cyan" />
                  Featured mission
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">{featuredGoal.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  {featuredGoal.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Best when
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    You want one path for transport checks, response headers, policy coverage, and exposure review.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Adjacent lane
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Pair with domain intelligence if you need ownership, DNS, or IP-side context next.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={featuredGoal.href} className="btn-cyber btn-primary">
                  {featuredGoal.action} <ArrowRight size={14} />
                </Link>
                <Link href="/audit" className="text-sm text-cyber-cyan hover:text-foreground">
                  Run unified audit
                </Link>
              </div>
            </div>
          </article>

          <div className="glass-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Quick pivots</h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                dense mode
              </span>
            </div>
            <div className="space-y-2">
              {compactGoals.map((goal) => {
                const Icon = goal.icon;
                return (
                  <div
                    key={goal.title}
                    className="rounded-2xl border border-border/70 bg-[color:var(--panel-subtle)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon size={15} className="text-cyber-cyan" />
                          {goal.title}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {goal.description}
                        </p>
                      </div>
                      <Link href={goal.href} className="text-xs text-cyber-cyan hover:text-foreground">
                        Open
                      </Link>
                    </div>
                    {goal.secondary && (
                      <Link
                        href={goal.secondary.href}
                        className="mt-3 inline-flex text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                      >
                        {goal.secondary.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.14 }}
        aria-labelledby="priority-workspaces"
        className="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start">
          <div>
            <h2 id="priority-workspaces" className="text-xl font-semibold">
              Workflows in rotation
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              A denser read of priority workspaces, closer to an analyst queue than a marketing card grid.
            </p>
          </div>
          <div className="glass-card overflow-hidden">
            {priorityWorkspaces.map((workspace, index) => (
              <Link
                key={workspace.id}
                href={workspace.canonicalPath}
                className={`group grid gap-3 px-4 py-4 transition-colors hover:bg-surface-hover/60 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {workspace.goal}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-cyber-cyan">
                      <WorkspaceIcon name={workspace.icon} size={16} />
                    </span>
                    <span className="truncate text-sm font-medium group-hover:text-foreground">
                      {workspace.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{workspace.description}</p>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-cyan">
                  {workspace.toolIds.length} capabilities
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
