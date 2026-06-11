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
import {
  decryptSyncData,
  encryptSyncData,
  type EncryptedSyncEnvelope,
} from '@/lib/security/cloud-sync';

const LAST_SYNCED_STORAGE_KEY = 'cyberkit:lastSyncedAt';

export default function SettingsPage() {
  const [syncId, setSyncId] = useState('');
  const [syncPassphrase, setSyncPassphrase] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncAction, setSyncAction] = useState<'push' | 'pull' | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [dangerAction, setDangerAction] = useState<'history' | 'favorites' | 'reports' | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(LAST_SYNCED_STORAGE_KEY)
  );
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

  const syncing = syncAction !== null;

  const rememberLastSyncedAt = (value: string) => {
    localStorage.setItem(LAST_SYNCED_STORAGE_KEY, value);
    setLastSyncedAt(value);
  };

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
    setImportStatus('');
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
        loadHistory();
        loadFavorites();
        loadReports();
        setImportStatus(`Imported ${data.history.length} history entries, ${data.favorites.length} favorites, and ${data.reports.length} reports.`);
      } catch (error) {
        setImportStatus(error instanceof Error ? error.message : 'Invalid file format');
      }
    };
    input.click();
  };

  const pushCloudSync = async () => {
    setSyncAction('push');
    setSyncStatus('');
    try {
      const envelope = await encryptSyncData(buildExportData(), syncPassphrase);
      const response = await fetch('/api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, envelope }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Cloud sync failed');
      const syncedAt = typeof data.syncedAt === 'string' ? data.syncedAt : new Date().toISOString();
      rememberLastSyncedAt(syncedAt);
      const expiry = typeof data.expiresAt === 'string' ? `; expires ${new Date(data.expiresAt).toLocaleString()}` : '';
      setSyncStatus(`Encrypted backup synced at ${new Date(syncedAt).toLocaleString()}${expiry}`);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Cloud sync failed');
    } finally {
      setSyncAction(null);
    }
  };

  const pullCloudSync = async () => {
    setSyncAction('pull');
    setSyncStatus('');
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Cloud restore failed');
      if (data.expired) {
        throw new Error(
          typeof data.expiresAt === 'string'
            ? `Cloud backup expired at ${new Date(data.expiresAt).toLocaleString()}.`
            : 'Cloud backup has expired.'
        );
      }
      if (!data.found || !data.envelope) throw new Error('No cloud data found for this Sync ID');
      const decrypted = await decryptSyncData<unknown>(
        data.envelope as EncryptedSyncEnvelope,
        syncPassphrase
      );
      const imported = validateImportedCyberKitData(decrypted);
      importCyberKitData(imported);
      loadHistory();
      loadFavorites();
      loadReports();
      rememberLastSyncedAt(new Date().toISOString());
      setSyncStatus(`Cloud restore completed with ${imported.history.length} history entries, ${imported.favorites.length} favorites, and ${imported.reports.length} reports.`);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : 'Cloud restore failed');
    } finally {
      setSyncAction(null);
    }
  };

  return (
    <div className="page-shell-tight max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings size={24} className="text-muted-foreground" /> Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Manage local data, encrypted sync behavior, and destructive actions from one quieter control surface.
        </p>
      </motion.div>

      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Info size={14} /> Data Summary</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3">
            <div className="text-lg font-bold">{historyEntries.length}</div>
            <div className="text-xs text-muted-foreground">History Entries</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3">
            <div className="text-lg font-bold">{favoriteTools.length}</div>
            <div className="text-xs text-muted-foreground">Favorite Tools</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3">
            <div className="text-lg font-bold">{savedReports.length}</div>
            <div className="text-xs text-muted-foreground">Saved Reports</div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="btn-cyber btn-secondary flex-1"><Download size={14} /> Export All Data</button>
          <button onClick={importData} className="btn-cyber btn-secondary flex-1"><Upload size={14} /> Import Data</button>
        </div>
        {importStatus && <p className="text-sm text-muted-foreground">{importStatus}</p>}
      </div>

      {/* Cloud Sync */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Cloud size={14} /> Cloud Sync</h2>
        <label className="block text-xs text-muted-foreground" htmlFor="cloud-sync-id">Sync ID</label>
        <input
          id="cloud-sync-id"
          value={syncId}
          onChange={(event) => setSyncId(event.target.value)}
          className="input-cyber text-sm"
          type="text"
          placeholder="team-device-backup"
          minLength={8}
          maxLength={128}
          autoComplete="off"
        />
        <label className="block text-xs text-muted-foreground" htmlFor="cloud-sync-passphrase">Encryption passphrase</label>
        <input
          id="cloud-sync-passphrase"
          value={syncPassphrase}
          onChange={(event) => setSyncPassphrase(event.target.value)}
          className="input-cyber text-sm"
          type="password"
          placeholder="At least 16 characters"
          minLength={16}
          maxLength={256}
          autoComplete="new-password"
        />
        <div className="rounded-xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-3 text-xs leading-5 text-muted-foreground">
          Your browser encrypts exports with AES-256-GCM. The key is derived locally with
          PBKDF2-SHA-256 and a random salt. The server receives only the Sync ID plus
          ciphertext, IV, salt, format version, and timestamp. The passphrase and plaintext
          are never sent or stored. Integrity is validated during restore, wrong-passphrase
          failures are explicit, and backups expire automatically.
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={pushCloudSync}
            disabled={syncing || syncId.trim().length < 8 || syncPassphrase.length < 16}
            className="btn-cyber btn-secondary flex-1 disabled:opacity-50"
          >
            {syncAction === 'push' ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudUpload size={14} />
            )}
            {syncAction === 'push' ? 'Pushing...' : 'Push Backup'}
          </button>
          <button
            onClick={pullCloudSync}
            disabled={syncing || syncId.trim().length < 8 || syncPassphrase.length < 16}
            className="btn-cyber btn-secondary flex-1 disabled:opacity-50"
          >
            {syncAction === 'pull' ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudDownload size={14} />
            )}
            {syncAction === 'pull' ? 'Pulling...' : 'Pull Restore'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Last synced at: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
        </p>
        {syncStatus && <p className="rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] px-3 py-2 text-xs text-muted-foreground">{syncStatus}</p>}
      </div>

      <div className="glass-card space-y-4 border-status-fail/20 p-5">
        <h2 className="font-semibold text-sm text-cyber-red">Danger Zone</h2>
        <div className="space-y-3">
          <button onClick={() => {
            if (dangerAction === 'history') {
              clearHistory();
              setDangerAction(null);
              return;
            }
            setDangerAction('history');
          }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> {dangerAction === 'history' ? 'Confirm clear history' : `Clear Scan History (${historyEntries.length} entries)`}
          </button>
          <button onClick={() => {
            if (dangerAction === 'favorites') {
              favoriteTools.forEach((favorite) => toggleFavorite(favorite));
              setDangerAction(null);
              return;
            }
            setDangerAction('favorites');
          }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> {dangerAction === 'favorites' ? 'Confirm clear favorites' : `Clear Favorites (${favoriteTools.length} items)`}
          </button>
          <button onClick={() => {
            if (dangerAction === 'reports') {
              clearReports();
              setDangerAction(null);
              return;
            }
            setDangerAction('reports');
          }} className="btn-cyber btn-danger w-full text-sm">
            <Trash2 size={14} /> {dangerAction === 'reports' ? 'Confirm clear reports' : `Clear All Reports (${savedReports.length} reports)`}
          </button>
          {dangerAction && (
            <button onClick={() => setDangerAction(null)} className="btn-cyber btn-ghost w-full text-sm">
              Cancel destructive action
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        History, favorites, and saved reports are stored locally in your browser. Password and JWT
        panels never write inputs or results to history, reports, analytics, or localStorage. Pwned
        Password sends only a five-character SHA-1 prefix. Cloud Sync sends only a versioned,
        encrypted envelope.
      </div>
    </div>
  );
}
