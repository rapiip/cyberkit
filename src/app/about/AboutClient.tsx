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

export default function AboutPage() {
  return (
    <div className="page-shell-tight max-w-4xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-2xl font-bold text-cyber-cyan">
          <span>CK</span>
        </div>
        <div className="mx-auto mb-3 w-fit rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-3 py-1 text-xs text-cyber-cyan">
          Stealth Console profile
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">CyberKit</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          A focused cybersecurity workspace for web checks, DNS analysis, encoding, hashing,
          file inspection, and contained learning labs with a quieter analyst-first interface.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: <Wrench size={20} />, value: allToolMetadata.length, label: 'Tools' },
          { icon: <Shield size={20} />, value: categories.length, label: 'Categories' },
          { icon: <FlaskConical size={20} />, value: 4, label: 'Labs' },
          { icon: <FileText size={20} />, value: '∞', label: 'Reports' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-4 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan">
              {stat.icon}
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Code size={18} /> Tech Stack</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {techStack.map((t) => (
            <div key={t.name} className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3 text-center">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Key Features</h2>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {[
            'Real working tools — not just links',
            'Client-side execution for privacy',
            'No login required (guest mode)',
            'Command palette (Ctrl+K)',
            'Scan history & saved reports',
            'Interactive security labs',
            'Export results as text/JSON/PDF',
            'Responsive design',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-cyan" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-cyber btn-secondary">
          <ExternalLink size={16} /> GitHub
        </a>
        <Link href="/tools" className="btn-cyber btn-primary">
          <Globe size={16} /> Explore Tools
        </Link>
      </div>
    </div>
  );
}
