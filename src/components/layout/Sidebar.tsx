'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpenCheck,
  Bug,
  ChevronLeft,
  ChevronRight,
  FileScan,
  FlaskConical,
  Grid2X2,
  History,
  Home,
  Menu,
  Radar,
  ScanSearch,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  primaryNavigation,
  secondaryNavigation,
  type NavigationItem,
} from '@/lib/navigation';

const iconMap = {
  home: Home,
  grid: Grid2X2,
  shield: ShieldCheck,
  radar: Radar,
  file: FileScan,
  scanner: ScanSearch,
  cve: Bug,
  labs: FlaskConical,
  report: BookOpenCheck,
  history: History,
  settings: Settings,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        openButtonRef.current?.focus();
      }
    };
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = mobileDialogRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('keydown', trapFocus);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('keydown', trapFocus);
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/workspaces') return pathname === '/workspaces';
    return pathname.startsWith(href);
  };

  const renderNavigation = (items: NavigationItem[], isCollapsed: boolean) =>
    items.map((item) => {
      const Icon = iconMap[item.icon];
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          aria-current={active ? 'page' : undefined}
          title={isCollapsed ? item.label : undefined}
          className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active ? 'text-cyber-cyan' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          {active && (
            <motion.span
              layoutId={isCollapsed ? 'desktopNavIndicator' : undefined}
              className="absolute inset-0 rounded-lg border-l-[3px] border-cyber-cyan bg-cyber-cyan/10"
            />
          )}
          <Icon size={18} className="relative z-10 shrink-0" aria-hidden="true" />
          {!isCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
        </Link>
      );
    });

  const sidebarContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-green text-sm font-bold text-[#06080f]">
          CK
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="block text-sm font-bold gradient-text">CyberKit</span>
            <span className="block text-xs text-muted-foreground">Task-first security workspace</span>
          </div>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {renderNavigation(primaryNavigation, isCollapsed)}
        <div className="my-3 border-t border-border" />
        {!isCollapsed && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick access</p>}
        {renderNavigation(secondaryNavigation, isCollapsed)}
      </nav>

      <div className="hidden shrink-0 border-t border-border px-2 py-3 md:flex">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="btn-ghost flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        className="fixed left-3 top-3 z-50 rounded-lg border border-border bg-surface/95 p-2 transition-all hover:border-cyber-cyan/35 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              ref={mobileDialogRef}
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="h-full w-72 border-r border-border bg-surface"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                ref={closeButtonRef}
                type="button"
                className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setMobileOpen(false);
                  openButtonRef.current?.focus();
                }}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
              {sidebarContent(false)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-border bg-surface md:flex"
      >
        {sidebarContent(collapsed)}
      </motion.aside>
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="hidden shrink-0 md:block"
      />
    </>
  );
}
