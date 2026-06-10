'use client';

import { motion } from 'framer-motion';
import { Shield, ExternalLink, Globe, Code, Wrench, FlaskConical, FileText } from 'lucide-react';
import { allToolMetadata } from '@/lib/tools/metadata';
import { categories } from '@/lib/tools/categories';
import Link from 'next/link';

const techStack = [
  { name: 'Next.js 15', desc: 'React framework' },
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #00f0ff, #00ff88)' }}>
          <span style={{ color: '#06080f' }}>CK</span>
        </div>
        <h1 className="text-3xl font-bold gradient-text">CyberKit</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A fast, unified cybersecurity toolkit for web security checks, DNS analysis, encoding, hashing, file inspection, and security learning labs.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Wrench size={20} />, value: allToolMetadata.length, label: 'Tools' },
          { icon: <Shield size={20} />, value: categories.length, label: 'Categories' },
          { icon: <FlaskConical size={20} />, value: 2, label: 'Labs' },
          { icon: <FileText size={20} />, value: '∞', label: 'Reports' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-4 text-center">
            <div className="text-cyber-cyan mx-auto mb-2 flex justify-center">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tech Stack */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Code size={18} /> Tech Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {techStack.map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-surface text-center">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Key Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
              <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
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
