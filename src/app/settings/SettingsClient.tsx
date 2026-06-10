'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Trash2, Download, Upload, Info, Cloud, CloudDownload, CloudUpload } from 'lucide-react';
import {
  importCyberKitData,
  useHistoryStore,
  useFavoritesStore,
  useReportsStore,
  validateImportedCyberKitData,
} from '@/lib/store';

export default function SettingsPage() {
  const [syncKey, setSyncKey] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const historyEntries = useHistoryStore((state) => state.entries);
  const loadHistory = useHistoryStore((state) => state.loadFromStorage);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const favoriteTools = useFavoritesStore((state) => state.favorites);
  const loadFavorites = useFavoritesStore((state) => state.loadFromStorage);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const savedReports = useReportsStore((state) => state.reports);
  const loadReports = useReportsStore((state) => state.loadFromStorage);
  const clearReports = useReportsStore((state) => state.clearReports);

  useEffect(() => {
    loadHistory();
    loadFavorites();
    loadReports();
  }, [loadFavorites, loadHistory, loadReports]);

  const exportData = () => {
    const data = buildExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberkit-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildExportData = () => ({
      version: 1,
      history: historyEntries,
      favorites: favoriteTools,
      reports: savedReports,
      exportedAt: new Date().toISOString(),
    } as const);

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = validateImportedCyberKitData(JSON.parse(text));
        importCyberKitData(data);
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Invalid file format');
      }
    };
    input.click();
  };

  const pushCloudSync = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const response = await fetch('/api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncKey, data: buildExportData() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Cloud sync failed');
      setSyncStatus(`Synced at ${new Date(data.syncedAt).toLocaleString()}`);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Cloud sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const pullCloudSync = async () => {
    setSyncing(true);
    setSyncStatus('');
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncKey }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Cloud restore failed');
      if (!data.found || !data.data) throw new Error('No cloud data found for this sync key');
      importCyberKitData(validateImportedCyberKitData(data.data));
      window.location.reload();
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Cloud restore failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings size={24} className="text-muted-foreground" /> Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your data and preferences.</p>
      </motion.div>

      {/* Data Summary */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Info size={14} /> Data Summary</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-surface">
            <div className="text-lg font-bold">{historyEntries.length}</div>
            <div className="text-xs text-muted-foreground">History Entries</div>
          </div>
          <div className="p-3 rounded-lg bg-surface">
            <div className="text-lg font-bold">{favoriteTools.length}</div>
            <div className="text-xs text-muted-foreground">Favorite Tools</div>
          </div>
          <div className="p-3 rounded-lg bg-surface">
            <div className="text-lg font-bold">{savedReports.length}</div>
            <div className="text-xs text-muted-foreground">Saved Reports</div>
          </div>
        </div>
      </div>

      {/* Export/Import */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="btn-cyber btn-secondary flex-1"><Download size={14} /> Export All Data</button>
          <button onClick={importData} className="btn-cyber btn-secondary flex-1"><Upload size={14} /> Import Data</button>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Cloud size={14} /> Cloud Sync</h2>
        <input
          value={syncKey}
          onChange={(event) => setSyncKey(event.target.value)}
          className="input-cyber text-sm"
          type="password"
          placeholder="Sync key"
          minLength={16}
          maxLength={128}
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={pushCloudSync}
            disabled={syncing || syncKey.trim().length < 16}
            className="btn-cyber btn-secondary flex-1 disabled:opacity-50"
          >
            <CloudUpload size={14} /> Push Backup
          </button>
          <button
            onClick={pullCloudSync}
            disabled={syncing || syncKey.trim().length < 16}
            className="btn-cyber btn-secondary flex-1 disabled:opacity-50"
          >
            <CloudDownload size={14} /> Pull Restore
          </button>
        </div>
        {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
      </div>

      {/* Clear Data */}
      <div className="glass-card p-5 space-y-4 border-cyber-red/20">
        <h2 className="font-semibold text-sm text-cyber-red">Danger Zone</h2>
        <div className="space-y-3">
          <button onClick={() => { clearHistory(); }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> Clear Scan History ({historyEntries.length} entries)
          </button>
          <button onClick={() => { favoriteTools.forEach((favorite) => toggleFavorite(favorite)); }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> Clear Favorites ({favoriteTools.length} items)
          </button>
          <button onClick={() => { clearReports(); }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> Clear All Reports ({savedReports.length} reports)
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        History, favorites, and saved reports are stored locally in your browser. Scanner tools may send the target domain, URL, IP, DNS query, CVE keyword, or password hash prefix to CyberKit backend routes and relevant external APIs such as DNS/RDAP, SSL, NVD/CISA, HIBP, or optional threat-intel providers.
      </div>
    </div>
  );
}
