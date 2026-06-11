'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Trash2, ExternalLink, Clock } from 'lucide-react';
import { useHistoryStore } from '@/lib/store';
import Link from 'next/link';
import { allToolMetadata } from '@/lib/tools/metadata';
import StatePanel from '@/components/ui/StatePanel';

export default function HistoryPage() {
  const { entries, removeEntry, clearHistory, loadFromStorage } = useHistoryStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  return (
    <div className="page-shell-tight space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><History size={24} className="text-muted-foreground" /> Scan History</h1>
          <p className="text-sm text-muted-foreground mt-1">{entries.length} entries saved locally</p>
        </div>
        {entries.length > 0 && (
          <button onClick={clearHistory} className="btn-cyber btn-danger btn-sm"><Trash2 size={12} /> Clear All</button>
        )}
      </div>

      {entries.length === 0 ? (
        <StatePanel
          icon={<Clock size={24} />}
          title="No scan history"
          description="Run a tool to save local execution history here."
          action={<Link href="/tools" className="text-cyber-cyan text-sm hover:underline">Browse Tools</Link>}
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const tool = allToolMetadata.find(t => t.id === entry.toolId);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="glass-card p-4"
              >
                <div className="flex gap-4">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-status-pass' : entry.status === 'error' ? 'bg-status-fail' : 'bg-status-warn'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{entry.toolName}</span>
                      <span className="badge badge-cyan text-xs">{tool?.category || 'unknown'}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground truncate">{entry.input}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.resultSummary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                      {tool && (
                        <Link href={`/tools/${tool.slug}`} className="btn-cyber btn-secondary btn-sm" title={`Open ${tool.name}`} aria-label={`Open ${tool.name}`}>
                          <ExternalLink size={12} /> Open tool
                        </Link>
                      )}
                      <button onClick={() => removeEntry(entry.id)} className="btn-cyber btn-ghost btn-sm text-muted-foreground hover:text-cyber-red" title="Delete history entry" aria-label={`Delete history entry for ${entry.toolName}`}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
