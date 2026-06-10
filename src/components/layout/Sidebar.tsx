'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wrench, Shield, FlaskConical, FileText,
  History, Settings, ChevronLeft, ChevronRight, X, Menu, ArrowLeftRight,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tools', label: 'All Tools', icon: Wrench },
  { href: '/tools/compare', label: 'Compare Tools', icon: ArrowLeftRight },
  { href: '/audit', label: 'Website Audit', icon: Shield },
  { href: '/labs', label: 'Security Labs', icon: FlaskConical },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #00f0ff, #00ff88)' }}>
          <span style={{ color: '#06080f' }}>CK</span>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-bold gradient-text text-glow-cyan">CyberKit</span>
              <span className="text-[10px] text-muted-foreground">Security Toolkit</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                active
                  ? 'text-cyber-cyan'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {/* Floating Slide Active Indicator */}
              {active && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 rounded-lg bg-cyber-cyan/10 border-l-[3px] border-cyber-cyan"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon 
                size={18} 
                className={`relative z-10 transition-transform duration-200 group-hover:scale-110 ${
                  active ? 'text-cyber-cyan' : 'text-muted-foreground group-hover:text-foreground'
                }`} 
              />
              
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle (Desktop) */}
      <div className="hidden md:flex border-t border-border px-2 py-3 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-surface border border-border cursor-pointer hover:border-cyber-cyan/35 transition-all"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={() => setMobileOpen(false)}>
          <aside
            className="w-64 h-full bg-surface border-r border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar (Animated Spring transitions) */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen bg-surface border-r border-border z-30"
      >
        {sidebarContent}
      </motion.aside>

      {/* Spacer matching sidebar size dynamically */}
      <motion.div 
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="hidden md:block shrink-0" 
      />
    </>
  );
}
