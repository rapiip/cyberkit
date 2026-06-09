'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, X, Terminal } from 'lucide-react';
import { searchTools } from '@/lib/tools/registry';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 350, 
      damping: 26 
    } 
  },
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = searchTools(query).slice(0, 10);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === 'Escape') closePalette();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') { 
      e.preventDefault(); 
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); 
    }
    if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      setSelectedIndex((i) => Math.max(i - 1, 0)); 
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(`/tools/${results[selectedIndex].slug}`);
      closePalette();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/75 backdrop-blur-md"
          onClick={closePalette}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="w-full max-w-xl glass-card overflow-hidden glow-cyan border border-cyber-cyan/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface/30">
              <Search size={18} className="text-cyber-cyan shrink-0 text-glow-cyan animate-pulse-glow" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search tools... (type to filter)"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground font-mono"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border">
                  ESC
                </kbd>
                <button onClick={closePalette} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1 hover:bg-surface-hover rounded">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Results Grid with staggered spring entry */}
            <div className="max-h-80 overflow-y-auto py-2 scrollbar-thin">
              {results.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="px-4 py-12 text-center text-sm text-muted-foreground font-mono"
                >
                  <Terminal size={24} className="mx-auto mb-2 opacity-35 text-cyber-cyan" />
                  No commands or tools matched &quot;{query}&quot;
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-0.5 px-2"
                >
                  {results.map((tool, i) => {
                    const active = i === selectedIndex;
                    return (
                      <motion.button
                        variants={itemVariants}
                        key={tool.id}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm relative overflow-hidden transition-colors cursor-pointer group ${
                          active ? 'text-cyber-cyan font-semibold' : 'text-foreground hover:bg-surface-hover/30'
                        }`}
                        onClick={() => {
                          router.push(`/tools/${tool.slug}`);
                          closePalette();
                        }}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        {/* Shifting Row Active Highlight */}
                        {active && (
                          <motion.div
                            layoutId="activeCommandRow"
                            className="absolute inset-0 rounded-lg bg-cyber-cyan/10 border-l-2 border-cyber-cyan"
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          />
                        )}

                        <div className="flex-1 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{tool.name}</span>
                            {active && (
                              <motion.span 
                                initial={{ opacity: 0, x: -5 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="text-[10px] text-cyber-cyan/60 font-mono"
                              >
                                &lt;ENTER&gt;
                              </motion.span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-sans line-clamp-1">{tool.shortDescription}</div>
                        </div>
                        
                        <span className={`badge shrink-0 relative z-10 text-[9px] ${
                          active ? 'badge-cyan text-cyber-cyan border-cyber-cyan/35' : 'badge-cyan'
                        }`}>
                          {tool.category}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Terminal Help Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground font-mono bg-surface/20 shrink-0 select-none">
              <span className="flex items-center gap-1"><span className="text-cyber-cyan">↑↓</span> Navigate</span>
              <span className="flex items-center gap-1"><span className="text-cyber-cyan">↵</span> Execute</span>
              <span className="flex items-center gap-1"><span className="text-cyber-cyan">ESC</span> Terminate</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted-foreground text-xs hover:border-cyber-cyan/30 hover:text-foreground transition-all cursor-pointer group"
    >
      <Search size={14} className="group-hover:text-cyber-cyan transition-colors" />
      <span className="font-mono">Audit command...</span>
      <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border select-none group-hover:border-cyber-cyan/25 transition-colors">
        <Command size={10} /> K
      </kbd>
    </button>
  );
}
