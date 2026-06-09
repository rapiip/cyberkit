import { create } from 'zustand';
import type { ScanHistoryEntry, SavedReport } from '../tools/types';

// ══════════ History Store ══════════

interface HistoryStore {
  entries: ScanHistoryEntry[];
  addEntry: (entry: Omit<ScanHistoryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  loadFromStorage: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  addEntry: (entry) => {
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const entries = [newEntry, ...get().entries].slice(0, 200);
    set({ entries });
    if (typeof window !== 'undefined') localStorage.setItem('cyberkit-history', JSON.stringify(entries));
  },
  removeEntry: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    set({ entries });
    if (typeof window !== 'undefined') localStorage.setItem('cyberkit-history', JSON.stringify(entries));
  },
  clearHistory: () => {
    set({ entries: [] });
    if (typeof window !== 'undefined') localStorage.removeItem('cyberkit-history');
  },
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cyberkit-history');
      if (stored) set({ entries: JSON.parse(stored) });
    } catch { /* ignore */ }
  },
}));

// ══════════ Favorites Store ══════════

interface FavoritesStore {
  favorites: string[];
  toggleFavorite: (toolId: string) => void;
  isFavorite: (toolId: string) => boolean;
  loadFromStorage: () => void;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],
  toggleFavorite: (toolId) => {
    const favs = get().favorites;
    const next = favs.includes(toolId) ? favs.filter((f) => f !== toolId) : [...favs, toolId];
    set({ favorites: next });
    if (typeof window !== 'undefined') localStorage.setItem('cyberkit-favorites', JSON.stringify(next));
  },
  isFavorite: (toolId) => get().favorites.includes(toolId),
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cyberkit-favorites');
      if (stored) set({ favorites: JSON.parse(stored) });
    } catch { /* ignore */ }
  },
}));

// ══════════ Reports Store ══════════

interface ReportsStore {
  reports: SavedReport[];
  addReport: (report: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeReport: (id: string) => void;
  clearReports: () => void;
  loadFromStorage: () => void;
}

export const useReportsStore = create<ReportsStore>((set, get) => ({
  reports: [],
  addReport: (report) => {
    const now = new Date().toISOString();
    const newReport: SavedReport = { ...report, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    const reports = [newReport, ...get().reports].slice(0, 100);
    set({ reports });
    if (typeof window !== 'undefined') localStorage.setItem('cyberkit-reports', JSON.stringify(reports));
  },
  removeReport: (id) => {
    const reports = get().reports.filter((r) => r.id !== id);
    set({ reports });
    if (typeof window !== 'undefined') localStorage.setItem('cyberkit-reports', JSON.stringify(reports));
  },
  clearReports: () => {
    set({ reports: [] });
    if (typeof window !== 'undefined') localStorage.removeItem('cyberkit-reports');
  },
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cyberkit-reports');
      if (stored) set({ reports: JSON.parse(stored) });
    } catch { /* ignore */ }
  },
}));
