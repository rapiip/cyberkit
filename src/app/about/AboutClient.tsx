'use client';

import { motion } from 'framer-motion';
import { Shield, ExternalLink, Globe, Code, Wrench, FlaskConical, FileText } from 'lucide-react';
import { allToolMetadata } from '@/lib/tools/metadata';
import { categories } from '@/lib/tools/categories';
import Link from 'next/link';

const techStack = [
  { name: 'Next.js 16', desc: 'App Router framework' },
  { name: 'TypeScript', desc: 'Type safety' },
  { name: 'Tailwind CSS v4', desc: 'Styling' },
  { name: 'Framer Motion', desc: 'Animations' },
  { name: 'Zustand', desc: 'State management' },
  { name: 'Lucide Icons', desc: 'Icon system' },
  { name: 'Web Crypto API', desc: 'Hashing & crypto' },
  { name: 'Vercel', desc: 'Deployment' },
];

const productSignals = [
  { icon: Wrench, value: allToolMetadata.length, label: 'Tools' },
  { icon: Shield, value: categories.length, label: 'Categories' },
  { icon: FlaskConical, value: 4, label: 'Labs' },
  { icon: FileText, value: '∞', label: 'Reports' },
];

export default function AboutPage() {
  return (
    <div className="page-shell-tight max-w-6xl space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"
      >
        <div className="space-y-5">
          <div className="inline-flex items-center gap-3">
            <span className="font-mono text-4xl font-semibold text-cyber-cyan">CK</span>
            <div className="rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-3 py-1 text-xs text-cyber-cyan">
              Stealth Console profile
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">CyberKit</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              A focused cybersecurity workspace for web checks, DNS analysis, encoding, hashing,
              file inspection, and contained learning labs. The interface is intentionally quieter,
              denser where needed, and shaped around analyst tasks rather than generic SaaS blocks.
            </p>
          </div>
        </div>

        <aside className="glass-card p-5">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Product signals
          </div>
          <div className="space-y-4">
            {productSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div key={signal.label} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-cyber-cyan" />
                    <span className="text-sm text-muted-foreground">{signal.label}</span>
                  </div>
                  <span className="font-mono text-xl font-semibold text-foreground">{signal.value}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="glass-card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-semibold">
            <Code size={18} />
            Tech Stack
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {techStack.map((item, index) => (
              <div key={item.name} className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] px-4 py-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  0{index + 1}
                </div>
                <div className="mt-3 text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card flex flex-col justify-between p-6">
          <div>
            <h2 className="mb-4 font-semibold">Key Features</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              {[
                'Real working tools, not just links',
                'Client-side execution for privacy',
                'Command palette and local history',
                'Interactive security labs with mitigations',
                'Exportable outputs in text, JSON, and PDF',
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-cyan" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-cyber btn-secondary">
              <ExternalLink size={16} /> GitHub
            </a>
            <Link href="/tools" className="btn-cyber btn-primary">
              <Globe size={16} /> Explore Tools
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
