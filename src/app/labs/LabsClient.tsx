'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, AlertTriangle, Code, ArrowRight } from 'lucide-react';

const labs = [
  {
    id: 'sql-injection',
    name: 'SQL Injection Lab',
    description: 'Study why unsafe query construction breaks authentication in a contained simulator, then compare it with parameterized query defenses.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-red/30 bg-cyber-red/10 text-cyber-red',
    topics: ['Authentication Bypass', 'UNION-based', 'Error-based', 'Parameterized Queries'],
  },
  {
    id: 'xss',
    name: 'XSS Lab',
    description: 'Study how unsafe output rendering creates client-side risk in a sandbox, with emphasis on encoding, CSP, and cookie hardening.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber',
    topics: ['Reflected XSS', 'DOM-based XSS', 'Input Sanitization', 'Content Security Policy'],
  },
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass Lab',
    description: 'Review authentication logic flaws in a local-only simulation and learn how prepared statements keep credential checks intact.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan',
    topics: ['Authentication Bypass', 'Login Flaws', 'Prepared Statements'],
  },
  {
    id: 'csrf',
    name: 'CSRF Concept Demo',
    description: 'Visualize how cookie-only state-changing requests can fail without CSRF tokens, SameSite cookies, and request verification.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-pink/30 bg-cyber-pink/10 text-cyber-pink',
    topics: ['Cross-Site Request Forgery', 'SameSite Cookies', 'Anti-CSRF Tokens'],
  },
];


export default function LabsPage() {
  return (
    <div className="page-shell-tight max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical size={24} className="text-cyber-cyan" /> Security Labs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contained simulation environments for learning common security failures without leaving the local workspace.
        </p>
      </motion.div>

      <div className="glass-card flex items-start gap-3 border-status-warn/20 p-4">
        <AlertTriangle size={18} className="text-cyber-amber shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-cyber-amber">Sandbox-only education.</strong> These labs run against local simulated targets only. Do not point these concepts at external systems; focus on the mitigation panels before applying changes in real applications.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {labs.map((lab, i) => (
          <motion.div
            key={lab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/labs/${lab.id}`} className="glass-card interactive-card group flex h-full flex-col p-6 transition-all hover:border-[color:var(--accent-border)]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${lab.accentClass}`}>
                  <Code size={20} />
                </div>
                <div>
                  <h2 className="font-semibold transition-colors group-hover:text-foreground">{lab.name}</h2>
                  <span className="badge badge-amber text-[10px]">{lab.difficulty}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{lab.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {lab.topics.map((topic) => (
                  <span key={topic} className="badge border border-border bg-[color:var(--panel-subtle)] text-[10px] text-muted-foreground">{topic}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-4 text-xs text-cyber-cyan">
                Start Lab <ArrowRight size={12} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
