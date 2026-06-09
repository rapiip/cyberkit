'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, Download, Copy, Clock, FileDown } from 'lucide-react';
import { useReportsStore } from '@/lib/store';
import { exportAuditToPDF } from '@/lib/utils/export';

export default function ReportsPage() {
  const { reports, removeReport, clearReports, loadFromStorage } = useReportsStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const handleExport = (report: typeof reports[0]) => {
    const ext = report.format === 'json' ? 'json' : 'md';
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
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

      {reports.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No saved reports yet. Run a security audit to generate your first report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-sm">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.target}</p>
                </div>
                 <div className="flex items-center gap-1">
                  <button onClick={() => handleCopy(report.content)} className="btn-cyber btn-ghost btn-sm p-1" title="Copy to Clipboard"><Copy size={12} /></button>
                  <button onClick={() => handleExport(report)} className="btn-cyber btn-ghost btn-sm p-1" title="Download Markdown"><Download size={12} /></button>
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
    </div>
  );
}
