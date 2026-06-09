import { create } from 'zustand';
import type { ScanHistoryEntry, SavedReport } from '../tools/types';

export const STORAGE_KEYS = {
  history: 'cyberkit-history:v1',
  historyLegacy: 'cyberkit-history',
  favorites: 'cyberkit-favorites:v1',
  favoritesLegacy: 'cyberkit-favorites',
  reports: 'cyberkit-reports:v1',
  reportsLegacy: 'cyberkit-reports',
} as const;

export interface CyberKitExportData {
  version: 1;
  history: ScanHistoryEntry[];
  favorites: string[];
  reports: SavedReport[];
  exportedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isScanHistoryEntry(value: unknown): value is ScanHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.toolId === 'string' &&
    typeof value.toolName === 'string' &&
    typeof value.input === 'string' &&
    typeof value.resultSummary === 'string' &&
    typeof value.rawResult === 'string' &&
    (value.status === 'success' || value.status === 'error' || value.status === 'warning') &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt))
  );
}

export function isSavedReport(value: unknown): value is SavedReport {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.target === 'string' &&
    typeof value.content === 'string' &&
    (value.format === 'markdown' || value.format === 'json') &&
    isStringArray(value.toolsUsed) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function parseArrayFromStorage<T>(
  key: string,
  validator: (value: unknown) => value is T,
  legacyKey?: string
) {
  if (typeof window === 'undefined') return [];

  const read = (storageKey: string) => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(validator)) {
      throw new Error(`Invalid data in ${storageKey}`);
    }
    return parsed;
  };

  try {
    const current = read(key);
    if (current) return current;
  } catch {
    localStorage.removeItem(key);
  }

  if (!legacyKey) return [];

  try {
    const legacy = read(legacyKey);
    if (!legacy) return [];
    localStorage.setItem(key, JSON.stringify(legacy));
    localStorage.removeItem(legacyKey);
    return legacy;
  } catch {
    localStorage.removeItem(legacyKey);
    return [];
  }
}

export function validateImportedCyberKitData(value: unknown): CyberKitExportData {
  if (!isRecord(value)) throw new Error('Import file must contain a JSON object.');

  const history = value.history === undefined ? [] : value.history;
  const favorites = value.favorites === undefined ? [] : value.favorites;
  const reports = value.reports === undefined ? [] : value.reports;

  if (!Array.isArray(history) || !history.every(isScanHistoryEntry)) {
    throw new Error('Import file has an invalid history shape.');
  }
  if (!isStringArray(favorites)) {
    throw new Error('Import file has an invalid favorites shape.');
  }
  if (!Array.isArray(reports) || !reports.every(isSavedReport)) {
    throw new Error('Import file has an invalid reports shape.');
  }

  return {
    version: 1,
    history: history.slice(0, 200),
    favorites: Array.from(new Set(favorites)),
    reports: reports.slice(0, 100),
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
  };
}

export function importCyberKitData(data: CyberKitExportData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(data.history));
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(data.favorites));
  localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(data.reports));
}

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
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries));
  },
  removeEntry: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    set({ entries });
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries));
  },
  clearHistory: () => {
    set({ entries: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.history);
      localStorage.removeItem(STORAGE_KEYS.historyLegacy);
    }
  },
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    set({ entries: parseArrayFromStorage(STORAGE_KEYS.history, isScanHistoryEntry, STORAGE_KEYS.historyLegacy) });
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
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(next));
  },
  isFavorite: (toolId) => get().favorites.includes(toolId),
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    set({ favorites: parseArrayFromStorage(STORAGE_KEYS.favorites, (value): value is string => typeof value === 'string', STORAGE_KEYS.favoritesLegacy) });
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
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
  },
  removeReport: (id) => {
    const reports = get().reports.filter((r) => r.id !== id);
    set({ reports });
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
  },
  clearReports: () => {
    set({ reports: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.reports);
      localStorage.removeItem(STORAGE_KEYS.reportsLegacy);
    }
  },
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    set({ reports: parseArrayFromStorage(STORAGE_KEYS.reports, isSavedReport, STORAGE_KEYS.reportsLegacy) });
  },
}));
