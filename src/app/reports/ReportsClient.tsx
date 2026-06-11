'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, Download, Copy, Clock, FileDown, Search, X, Eye } from 'lucide-react';
import { useReportsStore } from '@/lib/store';
import { exportAuditToPDF } from '@/lib/utils/export';
import StatePanel from '@/components/ui/StatePanel';
import type { SavedReport } from '@/lib/tools/types';
import { createSavedReportExport } from '@/lib/tools/result-model';

export default function ReportsPage() {
  const { reports, removeReport, clearReports, loadFromStorage } = useReportsStore();
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [targetFilter, setTargetFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const closePreviewRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!selectedReport) return;
    window.setTimeout(() => closePreviewRef.current?.focus(), 0);
  }, [selectedReport]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const targetMatches =
        !targetFilter.trim() ||
        report.target.toLowerCase().includes(targetFilter.toLowerCase()) ||
        report.title.toLowerCase().includes(targetFilter.toLowerCase());
      const dateMatches = !dateFilter || report.createdAt.startsWith(dateFilter);
      return targetMatches && dateMatches;
    });
  }, [dateFilter, reports, targetFilter]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const handleExport = (report: SavedReport, format: 'markdown' | 'json' = report.format) => {
    const body = format === 'json' ? JSON.stringify(createSavedReportExport(report), null, 2) : report.content;
    const blob = new Blob([body], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-shell-tight space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText size={24} className="text-muted-foreground" /> Saved Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review locally saved outputs, export clean artifacts, and reopen findings without rerunning a workflow.
          </p>
        </div>
        {reports.length > 0 && (
          <button onClick={clearReports} className="btn-cyber btn-danger btn-sm"><Trash2 size={12} /> Clear All</button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value)}
              placeholder="Filter by target or report title..."
              className="input-cyber pl-9 py-2 text-sm"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="input-cyber py-2 text-sm sm:w-44"
          />
        </div>
      )}

      {reports.length === 0 ? (
        <StatePanel
          icon={<FileText size={24} />}
          title="No saved reports"
          description="Run a security audit to generate your first local report."
        />
      ) : filteredReports.length === 0 ? (
        <StatePanel
          icon={<Search size={24} />}
          title="No matching reports"
          description="Adjust your search or date filter to show saved reports."
        />
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-sm">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.target}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={10} />
                <span>{new Date(report.createdAt).toLocaleString()}</span>
                <span className="badge badge-cyan text-[9px]">{report.format}</span>
                <span>{report.toolsUsed.length} tool(s) used</span>
              </div>
              <pre className="mt-3 max-h-32 overflow-auto rounded-xl border border-border/70 bg-[color:var(--panel-subtle)] p-3 font-mono text-xs text-muted-foreground">
                {report.content.substring(0, 500)}{report.content.length > 500 ? '...' : ''}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setSelectedReport(report)} className="btn-cyber btn-primary btn-sm" title="View report" aria-label={`View report ${report.title}`}><Eye size={12} /> Open report</button>
                <button onClick={() => handleCopy(report.content)} className="btn-cyber btn-secondary btn-sm" title="Copy report to clipboard" aria-label={`Copy report ${report.title} to clipboard`}><Copy size={12} /> Copy</button>
                <button onClick={() => handleExport(report, 'markdown')} className="btn-cyber btn-secondary btn-sm" title="Download Markdown" aria-label={`Download ${report.title} as Markdown`}><Download size={12} /> Markdown</button>
                <button onClick={() => handleExport(report, 'json')} className="btn-cyber btn-secondary btn-sm" title="Download JSON" aria-label={`Download ${report.title} as JSON`}>JSON</button>
                <button onClick={() => exportAuditToPDF(report.title, report.target, report.content)} className="btn-cyber btn-secondary btn-sm text-cyber-cyan hover:bg-[color:var(--accent-soft)]" title="Export to PDF" aria-label={`Export ${report.title} to PDF`}><FileDown size={12} /> PDF</button>
                <button onClick={() => removeReport(report.id)} className="btn-cyber btn-ghost btn-sm text-muted-foreground hover:text-cyber-red" title="Delete report" aria-label={`Delete report ${report.title}`}><Trash2 size={12} /> Remove</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050709]/80 p-4 backdrop-blur-md" onClick={() => setSelectedReport(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-preview-title" className="glass-card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden border border-[color:var(--accent-border)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 id="report-preview-title" className="font-semibold text-sm">{selectedReport.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 break-all">{selectedReport.target}</p>
              </div>
              <button ref={closePreviewRef} onClick={() => setSelectedReport(null)} className="btn-cyber btn-ghost btn-sm p-1" title="Close" aria-label="Close report preview">
                <X size={14} />
              </button>
            </div>
            <pre className="overflow-y-auto whitespace-pre-wrap break-words bg-[color:var(--panel-subtle)] p-5 text-xs leading-relaxed text-muted-foreground">
              {selectedReport.content}
            </pre>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
              <button onClick={() => handleCopy(selectedReport.content)} className="btn-cyber btn-secondary btn-sm"><Copy size={12} /> Copy</button>
              <button onClick={() => handleExport(selectedReport, 'markdown')} className="btn-cyber btn-secondary btn-sm"><Download size={12} /> Markdown</button>
              <button onClick={() => handleExport(selectedReport, 'json')} className="btn-cyber btn-secondary btn-sm">JSON</button>
              <button onClick={() => exportAuditToPDF(selectedReport.title, selectedReport.target, selectedReport.content)} className="btn-cyber btn-primary btn-sm"><FileDown size={12} /> PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
