'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, Download, Copy, Clock, FileDown, Search, X, Eye } from 'lucide-react';
import { useReportsStore } from '@/lib/store';
import { exportAuditToPDF } from '@/lib/utils/export';
import type { SavedReport } from '@/lib/tools/types';

function renderMarkdown(content: string) {
  return content.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    const text = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
    if (trimmed.startsWith('# ')) return <h2 key={index} className="text-lg font-semibold text-foreground mt-2">{text.replace(/^#\s*/, '')}</h2>;
    if (trimmed.startsWith('## ')) return <h3 key={index} className="text-sm font-semibold text-cyber-cyan mt-4">{text.replace(/^##\s*/, '')}</h3>;
    if (trimmed.startsWith('### ')) return <h4 key={index} className="text-xs font-semibold text-foreground mt-3">{text.replace(/^###\s*/, '')}</h4>;
    if (trimmed === '---') return <hr key={index} className="border-border my-3" />;
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      return <p key={index} className="text-xs text-muted-foreground pl-3 leading-relaxed">{text.replace(/^[-*]\s*/, '- ')}</p>;
    }
    return <p key={index} className="text-xs text-muted-foreground leading-relaxed">{text}</p>;
  });
}

export default function ReportsPage() {
  const { reports, removeReport, clearReports, loadFromStorage } = useReportsStore();
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [targetFilter, setTargetFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

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
    const body = format === 'json' ? JSON.stringify(report, null, 2) : report.content;
    const blob = new Blob([body], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={24} className="text-muted-foreground" /> Saved Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{reports.length} reports saved locally</p>
        </div>
        {reports.length > 0 && (
          <button onClick={clearReports} className="btn-cyber btn-danger btn-sm"><Trash2 size={12} /> Clear All</button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
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
        <div className="glass-card p-12 text-center text-muted-foreground">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No saved reports yet. Run a security audit to generate your first report.</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-sm">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.target}</p>
                </div>
                 <div className="flex items-center gap-1">
                  <button onClick={() => setSelectedReport(report)} className="btn-cyber btn-ghost btn-sm p-1" title="View Report"><Eye size={12} /></button>
                  <button onClick={() => handleCopy(report.content)} className="btn-cyber btn-ghost btn-sm p-1" title="Copy to Clipboard"><Copy size={12} /></button>
                  <button onClick={() => handleExport(report, 'markdown')} className="btn-cyber btn-ghost btn-sm p-1" title="Download Markdown"><Download size={12} /></button>
                  <button onClick={() => handleExport(report, 'json')} className="btn-cyber btn-ghost btn-sm p-1" title="Download JSON">JSON</button>
                  <button onClick={() => exportAuditToPDF(report.title, report.target, report.content)} className="btn-cyber btn-ghost btn-sm p-1 text-cyan-400 hover:bg-cyan-500/10" title="Export to PDF"><FileDown size={12} /></button>
                  <button onClick={() => removeReport(report.id)} className="btn-cyber btn-ghost btn-sm p-1 text-muted-foreground hover:text-cyber-red" title="Delete Report"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock size={10} />
                <span>{new Date(report.createdAt).toLocaleString()}</span>
                <span className="badge badge-cyan text-[9px]">{report.format}</span>
                <span>{report.toolsUsed.length} tool(s) used</span>
              </div>
              <pre className="mt-3 text-xs font-mono p-3 rounded-lg bg-surface max-h-32 overflow-auto text-muted-foreground">
                {report.content.substring(0, 500)}{report.content.length > 500 ? '...' : ''}
              </pre>
            </motion.div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-sm">{selectedReport.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 break-all">{selectedReport.target}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="btn-cyber btn-ghost btn-sm p-1" title="Close">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-1">
              {renderMarkdown(selectedReport.content)}
            </div>
            <div className="px-5 py-3 border-t border-border flex flex-wrap gap-2 justify-end">
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
