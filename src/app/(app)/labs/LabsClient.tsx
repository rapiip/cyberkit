'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, AlertTriangle, Code, ArrowRight } from 'lucide-react';
import { securityLabs as labs } from '@/lib/labs';


export default function LabsPage() {
  return (
    <div className="page-shell-tight max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical size={24} className="text-cyber-cyan" /> Security Labs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contained simulation environments for learning common security failures without leaving the local workspace.
        </p>
      </motion.div>

      <div className="glass-card flex items-start gap-3 border-status-warn/20 p-4" role="alert">
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
                  <span className="badge badge-amber text-xs">{lab.difficulty}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{lab.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {lab.topics.map((topic) => (
                  <span key={topic} className="badge border border-border bg-[color:var(--panel-subtle)] text-xs text-muted-foreground">{topic}</span>
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
