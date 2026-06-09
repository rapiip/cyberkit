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
    color: '#ef4444',
    topics: ['Authentication Bypass', 'UNION-based', 'Error-based', 'Parameterized Queries'],
  },
  {
    id: 'xss',
    name: 'XSS Lab',
    description: 'Study how unsafe output rendering creates client-side risk in a sandbox, with emphasis on encoding, CSP, and cookie hardening.',
    difficulty: 'Intermediate',
    color: '#f59e0b',
    topics: ['Reflected XSS', 'DOM-based XSS', 'Input Sanitization', 'Content Security Policy'],
  },
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass Lab',
    description: 'Review authentication logic flaws in a local-only simulation and learn how prepared statements keep credential checks intact.',
    difficulty: 'Intermediate',
    color: '#06b6d4',
    topics: ['Authentication Bypass', 'Login Flaws', 'Prepared Statements'],
  },
  {
    id: 'csrf',
    name: 'CSRF Concept Demo',
    description: 'Visualize how cookie-only state-changing requests can fail without CSRF tokens, SameSite cookies, and request verification.',
    difficulty: 'Intermediate',
    color: '#f43f5e',
    topics: ['Cross-Site Request Forgery', 'SameSite Cookies', 'Anti-CSRF Tokens'],
  },
];


export default function LabsPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical size={24} className="text-cyber-cyan" /> Security Labs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive learning environments to practice cybersecurity concepts safely.
        </p>
      </motion.div>

      <div className="glass-card p-4 flex items-start gap-3 border-cyber-amber/30">
        <AlertTriangle size={18} className="text-cyber-amber shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-cyber-amber">Sandbox-only education.</strong> These labs run against local simulated targets only. Do not point these concepts at external systems; focus on the mitigation panels before applying changes in real applications.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {labs.map((lab, i) => (
          <motion.div
            key={lab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/labs/${lab.id}`} className="glass-card p-6 flex flex-col h-full hover:border-cyber-cyan/30 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${lab.color}20`, border: `1px solid ${lab.color}40` }}>
                  <Code size={20} style={{ color: lab.color }} />
                </div>
                <div>
                  <h2 className="font-semibold group-hover:text-cyber-cyan transition-colors">{lab.name}</h2>
                  <span className="badge badge-amber text-[10px]">{lab.difficulty}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{lab.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {lab.topics.map((topic) => (
                  <span key={topic} className="badge bg-muted text-muted-foreground border border-border text-[10px]">{topic}</span>
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
