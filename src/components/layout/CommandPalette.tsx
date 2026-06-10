'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Search, Terminal, X } from 'lucide-react';
import {
  nextSelectionIndex,
  searchWorkspaceNavigation,
} from '@/lib/tools/workspace-navigation';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const results = useMemo(() => searchWorkspaceNavigation(query).slice(0, 10), [query]);
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(results.length - 1, 0));

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === 'Escape') {
        closePalette();
      }

      if (open && event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, input, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [closePalette, open]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const navigate = (href: string) => {
    router.push(href);
    closePalette();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => nextSelectionIndex(index, 'next', results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => nextSelectionIndex(index, 'previous', results.length));
    } else if (event.key === 'Enter' && results[safeSelectedIndex]) {
      navigate(results[safeSelectedIndex].href);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-3 pt-[12vh] backdrop-blur-md"
          onClick={closePalette}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            className="glass-card w-full max-w-xl overflow-hidden border border-cyber-cyan/30"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <span id="command-palette-title" className="sr-only">Search CyberKit workspaces</span>
              <Search size={18} className="shrink-0 text-cyber-cyan" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search workflows or capabilities"
                aria-label="Search workflows or capabilities"
                aria-controls="command-palette-results"
                aria-activedescendant={results[safeSelectedIndex] ? `command-result-${safeSelectedIndex}` : undefined}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="button" onClick={closePalette} aria-label="Close command palette" className="p-1 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div id="command-palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
              {results.length > 0 ? (
                results.map((result, index) => {
                  const active = index === safeSelectedIndex;
                  return (
                    <button
                      key={`${result.kind}-${result.id}`}
                      id={`command-result-${index}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                        active ? 'bg-cyber-cyan/10 text-cyber-cyan' : 'hover:bg-surface-hover'
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => navigate(result.href)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{result.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.kind === 'tool' ? `Capability in ${result.workspaceName}` : result.description}
                        </span>
                      </span>
                      <span className="badge badge-cyan capitalize">{result.kind}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Terminal size={24} className="mx-auto mb-2 opacity-40" />
                  No workspace or capability matched &quot;{query}&quot;.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
              <span>Arrow keys: navigate</span>
              <span>Enter: open</span>
              <span>Esc: close</span>
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
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
      className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-cyber-cyan/30 sm:flex"
      aria-label="Open command palette"
    >
      <Search size={14} />
      <span>Search workflows</span>
      <kbd className="flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
        <Command size={10} /> K
      </kbd>
    </button>
  );
}
