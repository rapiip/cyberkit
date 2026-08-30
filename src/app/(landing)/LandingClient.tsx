'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  Bug,
  Cpu,
  FileSearch,
  Globe2,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
  Eye,
  Hash,
  Network,
  Fingerprint,
} from 'lucide-react';
import AnimatedBackground from '@/components/landing/AnimatedBackground';
import { Reveal, StaggerGroup, StaggerItem, Parallax } from '@/components/landing/ScrollReveal';
import type { CatalogStats } from '@/lib/tools/catalog-stats';

const features = [
  {
    icon: ShieldCheck,
    title: 'Website Security Audit',
    desc: 'TLS, headers, CORS, cookies, robots.txt, and security.txt in one unified workflow.',
    href: '/workspaces/website-security-audit',
    accent: 'text-cyber-cyan',
  },
  {
    icon: Radar,
    title: 'Domain & IP Intelligence',
    desc: 'Correlate DNS, DoH, RDAP, ASN, geolocation, and reputation context.',
    href: '/workspaces/domain-ip-intelligence',
    accent: 'text-cyber-blue',
  },
  {
    icon: FileSearch,
    title: 'File Triage & IOCs',
    desc: 'Inspect metadata, signatures, strings, hashes, and indicators locally.',
    href: '/workspaces/file-triage-ioc',
    accent: 'text-cyber-pink',
  },
  {
    icon: LockKeyhole,
    title: 'Password & JWT',
    desc: 'Strength estimation, breach checks, and JWT claim inspection.',
    href: '/workspaces/password-security',
    accent: 'text-cyber-amber',
  },
  {
    icon: Hash,
    title: 'Hash & Crypto',
    desc: 'MD5, SHA, HMAC, file checksums, and hash format identification.',
    href: '/workspaces/hash-crypto-workbench',
    accent: 'text-cyber-amber',
  },
  {
    icon: TerminalSquare,
    title: 'CTF Decoder',
    desc: 'Classical ciphers, Morse, XOR, and regex utilities for decoding payloads.',
    href: '/workspaces/ctf-decoder-workbench',
    accent: 'text-cyber-purple',
  },
];

const techTags = [
  'Web Security', 'DNS Lookup', 'WHOIS', 'SSL/TLS', 'CORS', 'JWT',
  'Hashing', 'Base64', 'Regex', 'XOR', 'Ciphers', 'EXIF',
  'Magic Bytes', 'IOC', 'CVE', 'CIDR', 'Subnet', 'UUID',
];

const statCards = [
  { key: 'workspaces', label: 'Workspaces', icon: Globe2 },
  { key: 'tools', label: 'Security Tools', icon: Zap },
  { key: 'categories', label: 'Categories', icon: Cpu },
  { key: 'labs', label: 'Learning Labs', icon: Bug },
] as const satisfies ReadonlyArray<{ key: keyof CatalogStats; label: string; icon: typeof Globe2 }>;

const principles = [
  { icon: LockKeyhole, title: 'Client-side first', desc: 'Execution stays in your browser for privacy by default.' },
  { icon: Eye, title: 'No login required', desc: 'Guest mode — jump straight into analysis with zero setup.' },
  { icon: Network, title: 'Unified workflows', desc: 'Related tools grouped around outcomes, not flat lists.' },
  { icon: Fingerprint, title: 'History & reports', desc: 'Track activity and export results as text, JSON, or PDF.' },
];

const terminalLines = [
  { prompt: '$', text: 'cyberkit audit https://example.com', color: 'text-cyber-cyan' },
  { prompt: '›', text: 'TLS handshake verified · grade A', color: 'text-cyber-green' },
  { prompt: '›', text: 'Strict-Transport-Security: max-age=63072000', color: 'text-muted-foreground' },
  { prompt: '›', text: 'CORS: locked down to origin', color: 'text-cyber-green' },
  { prompt: '›', text: 'security.txt: present', color: 'text-cyber-green' },
  { prompt: '✓', text: 'Audit complete · 0 critical · 2 informational', color: 'text-cyber-amber' },
];

export default function LandingClient({ stats }: { stats: CatalogStats }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);

  return (
    <>
      <AnimatedBackground />

      {/* ═══════ Hero ═══════ */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center px-6">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-cyber-cyan/20 bg-cyber-cyan/8 px-4 py-1.5 text-xs text-cyber-cyan backdrop-blur-sm"
          >
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-cyber-green" />
            Stealth Console · analyst-first security toolkit
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="hero-title text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            Your quiet command center
            <br />
            for security analysis
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg"
          >
            CyberKit unifies web audits, DNS intelligence, hashing, file triage, and learning labs
            into focused workflows — all running locally in your browser.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/dashboard" className="btn-cyber btn-primary btn-lg group">
              Launch console
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/workspaces" className="btn-cyber btn-secondary btn-lg">
              Browse workspaces
            </Link>
          </motion.div>

          {/* Terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="glass-card mx-auto mt-14 max-w-xl overflow-hidden text-left"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyber-red/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyber-amber/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyber-green/60" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">cyberkit — zsh</span>
            </div>
            <div className="space-y-1.5 p-4 font-mono text-xs md:text-sm">
              {terminalLines.map((line, i) => (
                <div
                  key={i}
                  className="terminal-line flex gap-2"
                  style={{ animationDelay: `${0.8 + i * 0.25}s` }}
                >
                  <span className="text-muted-foreground">{line.prompt}</span>
                  <span className={line.color}>{line.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-cyber-cyan/30 p-1">
            <span className="h-2 w-1 rounded-full bg-cyber-cyan/70" />
          </div>
        </motion.div>
      </section>

      {/* ═══════ Tech marquee ═══════ */}
      <div className="relative overflow-hidden border-y border-border/60 py-5">
        <div className="marquee-track">
          {[...techTags, ...techTags].map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground"
            >
              <span className="h-1 w-1 rounded-full bg-cyber-cyan/50" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════ Stats ═══════ */}
      <section className="px-6 py-24">
        <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {statCards.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="text-center">
                <stat.icon size={24} className="mx-auto mb-3 text-cyber-cyan" />
                <div className="stat-glow text-4xl font-bold md:text-5xl">{stats[stat.key]}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ═══════ Features grid ═══════ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-cyber-cyan">
              <Sparkles size={14} /> Capabilities
            </div>
            <h2 className="text-3xl font-bold md:text-4xl">
              Every tool you need, <span className="gradient-text">organized by outcome</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start from the task, not a flat menu. Each workspace bundles the relevant tools
              around a single security goal.
            </p>
          </Reveal>

          <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <Link href={feature.href} className="feature-card group block h-full p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyber-cyan/14 bg-cyber-cyan/8">
                    <feature.icon size={22} className={feature.accent} />
                  </div>
                  <h3 className="text-lg font-semibold transition-colors group-hover:text-cyber-cyan">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-cyber-cyan opacity-0 transition-opacity group-hover:opacity-100">
                    Open workspace <ArrowRight size={12} />
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <div className="section-line mx-auto max-w-5xl" />

      {/* ═══════ Principles ═══════ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-14 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Built for focused analysis</h2>
            <p className="mt-4 text-muted-foreground">Privacy, speed, and clarity by design.</p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur-sm">
                  <p.icon size={22} className="mb-4 text-cyber-cyan" />
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Parallax CTA ═══════ */}
      <Parallax distance={40} className="px-6 py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="glass-card glow-cyan p-12 md:p-16">
            <h2 className="text-3xl font-bold md:text-4xl">
              Start investigating in <span className="gradient-text">seconds</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No account, no setup. Open the console and run your first security audit right now.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="btn-cyber btn-primary btn-lg group">
                Launch CyberKit
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/about" className="btn-cyber btn-secondary btn-lg">
                Learn more
              </Link>
            </div>
          </div>
        </Reveal>
      </Parallax>

      {/* ═══════ Footer ═══════ */}
      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyber-cyan/16 bg-cyber-cyan/10 text-xs font-bold text-cyber-cyan">
              CK
            </div>
            <span>CyberKit — Stealth Console</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link href="/workspaces" className="hover:text-foreground">Workspaces</Link>
            <Link href="/labs" className="hover:text-foreground">Labs</Link>
            <Link href="/about" className="hover:text-foreground">About</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
