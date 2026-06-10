'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Heart, Filter } from 'lucide-react';
import { allToolMetadata, searchToolMetadata } from '@/lib/tools/metadata';
import { categories } from '@/lib/tools/categories';
import { useFavoritesStore } from '@/lib/store';
import type { Difficulty, ExecutionType } from '@/lib/tools/types';

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading tools...</div>}>
      <ToolsPageInner />
    </Suspense>
  );
}

function ToolsPageInner() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedExecution, setSelectedExecution] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const { favorites, toggleFavorite, loadFromStorage } = useFavoritesStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const filteredTools = useMemo(() => {
    let tools = query ? searchToolMetadata(query) : allToolMetadata;
    if (selectedCategory) tools = tools.filter((t) => t.category === selectedCategory);
    if (selectedDifficulty) tools = tools.filter((t) => t.difficulty === selectedDifficulty);
    if (selectedExecution) tools = tools.filter((t) => t.executionType === selectedExecution);
    return tools;
  }, [query, selectedCategory, selectedDifficulty, selectedExecution]);

  const clearFilters = () => { setSelectedCategory(''); setSelectedDifficulty(''); setSelectedExecution(''); setQuery(''); };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">{allToolMetadata.length} cybersecurity tools available</p>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="input-cyber pl-10 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-cyber btn-secondary flex items-center gap-2 ${showFilters ? 'border-cyber-cyan/50' : ''}`}
        >
          <Filter size={14} /> Filters
          {(selectedCategory || selectedDifficulty || selectedExecution) && (
            <span className="w-2 h-2 rounded-full bg-cyber-cyan" />
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filters</span>
            <button onClick={clearFilters} className="text-xs text-cyber-cyan hover:underline">Clear all</button>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.filter(c => c.id !== 'labs').map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  className={`badge cursor-pointer transition-all ${selectedCategory === cat.id ? 'badge-cyan' : 'bg-muted text-muted-foreground border border-border hover:border-border-bright'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === d ? '' : d)}
                  className={`badge cursor-pointer transition-all ${selectedDifficulty === d ? 'badge-green' : 'bg-muted text-muted-foreground border border-border hover:border-border-bright'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Execution</label>
            <div className="flex gap-2">
              {(['client', 'server', 'api'] as ExecutionType[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setSelectedExecution(selectedExecution === e ? '' : e)}
                  className={`badge cursor-pointer transition-all ${selectedExecution === e ? 'badge-purple' : 'bg-muted text-muted-foreground border border-border hover:border-border-bright'}`}
                >
                  {e}-side
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tool Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
          >
            <div className="glass-card p-4 hover:border-cyber-cyan/30 transition-all group h-full flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <Link href={`/tools/${tool.slug}`} className="flex-1">
                  <h3 className="font-medium text-sm group-hover:text-cyber-cyan transition-colors">{tool.name}</h3>
                </Link>
                <button
                  onClick={() => toggleFavorite(tool.id)}
                  className="shrink-0 p-1 rounded hover:bg-surface-hover transition-colors"
                  title={favorites.includes(tool.id) ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={`${favorites.includes(tool.id) ? 'Remove' : 'Add'} ${tool.name} ${favorites.includes(tool.id) ? 'from' : 'to'} favorites`}
                >
                  <Heart
                    size={14}
                    className={favorites.includes(tool.id) ? 'fill-cyber-pink text-cyber-pink' : 'text-muted-foreground'}
                  />
                </button>
              </div>
              <Link href={`/tools/${tool.slug}`} className="flex-1">
                <p className="text-xs text-muted-foreground mb-3">{tool.shortDescription}</p>
              </Link>
              <div className="flex items-center gap-2 mt-auto">
                <span className="badge badge-cyan text-[10px]">{tool.category}</span>
                <span className="badge badge-purple text-[10px]">{tool.difficulty}</span>
                <span className="badge badge-green text-[10px]">{tool.executionType}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No tools found matching your criteria.</p>
          <button onClick={clearFilters} className="text-cyber-cyan text-sm mt-2 hover:underline">Clear filters</button>
        </div>
      )}
    </div>
  );
}
