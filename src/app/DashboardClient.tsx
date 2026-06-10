'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search, Shield, Globe, Hash, Binary, FileSearch, Eye, Flag,
  FlaskConical, Network, ArrowRight, Zap, Command, Star, Clock,
} from 'lucide-react';
import { categories } from '@/lib/tools/categories';
import { allToolMetadata, getFeaturedToolMetadata, searchToolMetadata } from '@/lib/tools/metadata';
import { useHistoryStore } from '@/lib/store';

const categoryIcons: Record<string, React.ReactNode> = {
  'web-security': <Shield size={20} />,
  dns: <Globe size={20} />,
  network: <Network size={20} />,
  encoding: <Binary size={20} />,
  hashing: <Hash size={20} />,
  forensics: <FileSearch size={20} />,
  osint: <Eye size={20} />,
  ctf: <Flag size={20} />,
  labs: <FlaskConical size={20} />,
};

const quickActions = [
  { label: 'Decode JWT', href: '/tools/jwt-decoder', icon: '🔑' },
  { label: 'Generate Hash', href: '/tools/sha256-generator', icon: '🔐' },
  { label: 'Base64 Encode', href: '/tools/base64', icon: '📝' },
  { label: 'Password Gen', href: '/tools/password-generator', icon: '🛡️' },
  { label: 'URL Analyzer', href: '/tools/url-analyzer', icon: '🔗' },
  { label: 'IOC Extractor', href: '/tools/ioc-extractor', icon: '🎯' },
  { label: 'Regex Tester', href: '/tools/regex-tester', icon: '⚡' },
  { label: 'CIDR Calculator', href: '/tools/cidr-calculator', icon: '🌐' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const featured = getFeaturedToolMetadata();
  const { entries, loadFromStorage } = useHistoryStore();
  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchToolMetadata(searchQuery).slice(0, 8) : []),
    [searchQuery]
  );
  const showSearch = isSearchFocused && searchResults.length > 0;

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center space-y-4 py-6">
        <h1 className="text-3xl md:text-4xl font-bold">
          <span className="gradient-text">CyberKit</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          A fast, unified cybersecurity toolkit for web security, encoding, hashing, forensics, and security labs.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-lg mx-auto mt-6">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools... (or press Ctrl+K)"
              className="input-cyber pl-11 pr-20 py-3 text-sm"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-2 py-1 rounded bg-muted text-[10px] text-muted-foreground font-mono">
              <Command size={10} /> K
            </kbd>
          </div>

          {/* Search Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute w-full mt-2 glass-card py-2 z-20">
              {searchResults.map((tool) => (
                <button
                  key={tool.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-hover transition-colors"
                  onMouseDown={() => router.push(`/tools/${tool.slug}`)}
                >
                  <span className="flex-1 font-medium">{tool.name}</span>
                  <span className="badge badge-cyan text-[10px]">{tool.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap size={18} className="text-cyber-amber" /> Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="glass-card flex items-center gap-3 px-4 py-3 hover:border-cyber-cyan/30 transition-all group"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium group-hover:text-cyber-cyan transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Featured Tools */}
      <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star size={18} className="text-cyber-amber" /> Featured Tools
          </h2>
          <Link href="/tools" className="text-xs text-muted-foreground hover:text-cyber-cyan flex items-center gap-1">
            View All <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.slice(0, 6).map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="glass-card p-4 hover:border-cyber-cyan/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm group-hover:text-cyber-cyan transition-colors">{tool.name}</h3>
                <span className="badge badge-cyan text-[10px]">{tool.executionType}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{tool.shortDescription}</p>
              <div className="flex items-center gap-2">
                <span className="badge badge-green text-[10px]">{tool.category}</span>
                <span className="badge badge-purple text-[10px]">{tool.difficulty}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Categories */}
      <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tool Categories</h2>
          <span className="text-xs text-muted-foreground">{allToolMetadata.length} tools total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.filter(c => c.id !== 'labs').map((cat) => {
            const toolCount = allToolMetadata.filter((t) => t.category === cat.id).length;
            return (
              <Link
                key={cat.id}
                href={`/tools?category=${cat.id}`}
                className="glass-card p-4 hover:border-cyber-cyan/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${cat.gradient}`, opacity: 0.9 }}
                  >
                    <span className="text-white">{categoryIcons[cat.id]}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm group-hover:text-cyber-cyan transition-colors">{cat.name}</h3>
                    <span className="text-xs text-muted-foreground">{toolCount} tools</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* Recent Activity */}
      {entries.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={18} className="text-muted-foreground" /> Recent Activity
            </h2>
            <Link href="/history" className="text-xs text-muted-foreground hover:text-cyber-cyan flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="glass-card divide-y divide-border">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-status-pass' : entry.status === 'error' ? 'bg-status-fail' : 'bg-status-warn'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{entry.toolName}</span>
                  <span className="text-xs text-muted-foreground ml-2 truncate">{entry.input.substring(0, 40)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
