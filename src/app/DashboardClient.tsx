'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bug,
  FileSearch,
  Globe2,
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

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-4 pt-20 md:p-8">
      <motion.header {...fadeUp} transition={{ duration: 0.4 }} className="space-y-5 py-4 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-cyber-cyan/20 bg-cyber-cyan/5 px-3 py-1 text-xs text-cyber-cyan">
          <Sparkles size={13} />
          Outcome-driven security workflows
        </div>
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">
            Start with the <span className="gradient-text">security outcome</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            CyberKit combines related checks into focused workspaces. Utility tools remain available
            inside each workflow without crowding the primary navigation.
          </p>
        </div>

        <div className="relative mx-auto max-w-xl text-left">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 150)}
            placeholder="Search workflows or capabilities"
            aria-label="Search workflows or capabilities"
            className="input-cyber py-3 pl-11 pr-4 text-sm"
          />
          {showSearch && (
            <div className="glass-card absolute z-20 mt-2 w-full overflow-hidden py-2">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                    onClick={() => router.push(result.href)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{result.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.kind === 'tool' ? `In ${result.workspaceName}` : result.description}
                      </span>
                    </span>
                    <span className="badge badge-cyan capitalize">{result.kind}</span>
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
      </motion.header>

      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.08 }} aria-labelledby="goal-entry-points">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="goal-entry-points" className="text-xl font-semibold">What do you need to do?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seven common workflows, each with a clear starting point.</p>
          </div>
          <Link href="/workspaces" className="flex items-center gap-1 text-xs text-cyber-cyan">
            Browse all workspaces <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goalEntries.map((goal) => {
            const Icon = goal.icon;
            return (
              <article key={goal.title} className="glass-card flex min-h-52 flex-col p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/10 text-cyber-cyan">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold">{goal.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{goal.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={goal.href} className="btn-primary text-xs">
                    {goal.action} <ArrowRight size={13} />
                  </Link>
                  {goal.secondary && (
                    <Link href={goal.secondary.href} className="text-xs text-muted-foreground hover:text-cyber-cyan">
                      {goal.secondary.label}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </motion.section>

      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.14 }} aria-labelledby="priority-workspaces">
        <div className="mb-4">
          <h2 id="priority-workspaces" className="text-xl font-semibold">Priority workspaces</h2>
          <p className="mt-1 text-sm text-muted-foreground">Core workflows surfaced for routine security work.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {priorityWorkspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={workspace.canonicalPath}
              className="glass-card group flex items-center gap-3 p-4 transition-all hover:border-cyber-cyan/35"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyber-cyan/10 text-cyber-cyan">
                <WorkspaceIcon name={workspace.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium group-hover:text-cyber-cyan">{workspace.name}</span>
                <span className="text-xs text-muted-foreground">{workspace.goal}</span>
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {entries.length > 0 && (
        <section aria-labelledby="recent-activity">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent-activity" className="text-lg font-semibold">Recent activity</h2>
            <Link href="/history" className="text-xs text-muted-foreground hover:text-cyber-cyan">View history</Link>
          </div>
          <div className="glass-card divide-y divide-border">
            {entries.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Globe2 size={15} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.toolName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
