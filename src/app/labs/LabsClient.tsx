'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, AlertTriangle, ArrowRight } from 'lucide-react';

const labs = [
  {
    id: 'sql-injection',
    name: 'SQL Injection Lab',
    description: 'Study why unsafe query construction breaks authentication in a contained simulator, then compare it with parameterized query defenses.',
    difficulty: 'Intermediate',
    accentClass: 'text-cyber-red',
    topics: ['Authentication Bypass', 'UNION-based', 'Error-based', 'Parameterized Queries'],
  },
  {
    id: 'xss',
    name: 'XSS Lab',
    description: 'Study how unsafe output rendering creates client-side risk in a sandbox, with emphasis on encoding, CSP, and cookie hardening.',
    difficulty: 'Intermediate',
    accentClass: 'text-cyber-amber',
    topics: ['Reflected XSS', 'DOM-based XSS', 'Input Sanitization', 'Content Security Policy'],
  },
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass Lab',
    description: 'Review authentication logic flaws in a local-only simulation and learn how prepared statements keep credential checks intact.',
    difficulty: 'Intermediate',
    accentClass: 'text-cyber-cyan',
    topics: ['Authentication Bypass', 'Login Flaws', 'Prepared Statements'],
  },
  {
    id: 'csrf',
    name: 'CSRF Concept Demo',
    description: 'Visualize how cookie-only state-changing requests can fail without CSRF tokens, SameSite cookies, and request verification.',
    difficulty: 'Intermediate',
    accentClass: 'text-cyber-pink',
    topics: ['Cross-Site Request Forgery', 'SameSite Cookies', 'Anti-CSRF Tokens'],
  },
];

function getMonogram(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function LabsPage() {
  const featuredLab = labs[0];
  const remainingLabs = labs.slice(1);

  return (
    <div className="page-shell-tight max-w-6xl space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
      >
        <div>
          <div className="flex items-center gap-3">
            <FlaskConical size={24} className="text-cyber-cyan" />
            <h1 className="text-3xl font-bold">Security Labs</h1>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Contained simulation environments for learning common security failures without leaving
            the local workspace. This page now reads more like a mission board than another grid of
            identical cards.
          </p>
        </div>

        <div className="glass-card flex items-start gap-3 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-cyber-amber" />
          <div className="text-sm leading-6 text-muted-foreground">
            <strong className="text-cyber-amber">Sandbox-only education.</strong> These labs run
            against local simulated targets only. Focus on the mitigation panels before applying any
            concept in real applications.
          </div>
        </div>
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Link
          href={`/labs/${featuredLab.id}`}
          className="glass-card group block p-6 transition-colors hover:border-border-bright"
        >
          <div className="grid gap-6 md:grid-cols-[96px_minmax(0,1fr)]">
            <div className={`font-mono text-5xl font-semibold ${featuredLab.accentClass}`}>
              {getMonogram(featuredLab.name)}
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-amber text-[10px]">{featuredLab.difficulty}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Featured simulation
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">{featuredLab.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {featuredLab.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {featuredLab.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-1 text-sm text-cyber-cyan">
                Start lab <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </Link>

        <div className="glass-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Remaining simulations
          </div>
          <div className="space-y-2">
            {remainingLabs.map((lab) => (
              <Link
                key={lab.id}
                href={`/labs/${lab.id}`}
                className="block rounded-2xl border border-border/70 bg-[color:var(--panel-subtle)] px-4 py-4 transition-colors hover:border-border-bright hover:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm ${lab.accentClass}`}>{getMonogram(lab.name)}</span>
                      <h3 className="text-sm font-medium">{lab.name}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{lab.description}</p>
                  </div>
                  <span className="badge badge-amber text-[10px]">{lab.difficulty}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
