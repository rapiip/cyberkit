'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, Copy, Download, Check, ArrowLeft, Cpu, AlertTriangle,
  ChevronRight, FileText, Code, Info,
} from 'lucide-react';
import { useHistoryStore } from '@/lib/store';
import type { ToolResult, ToolInput } from '@/lib/tools/types';
import type { ToolMetadata } from '@/lib/tools/metadata';

export default function ToolClient({
  tool,
  relatedTools,
  categoryName,
}: {
  tool: ToolMetadata;
  relatedTools: ToolMetadata[];
  categoryName: string;
}) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    tool.inputs.forEach((input) => {
      if (input.defaultValue !== undefined) defaults[input.id] = input.defaultValue;
      else if (input.type === 'checkbox') defaults[input.id] = false;
      else defaults[input.id] = '';
    });
    return defaults;
  });
  const [result, setResult] = useState<ToolResult | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'raw' | 'explanation'>('summary');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { addEntry } = useHistoryStore();

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { getToolBySlug } = await import('@/lib/tools/registry');
      const executableTool = getToolBySlug(tool.slug);
      if (!executableTool) throw new Error('Tool executor is unavailable.');
      const res = await executableTool.execute(formValues);
      setResult(res);
      setActiveTab('summary');
      // Save to history
      const inputSummary = Object.entries(formValues)
        .filter(([, v]) => typeof v === 'string' && v)
        .map(([k, v]) => `${k}: ${(v as string).substring(0, 50)}`)
        .join(', ') || 'file input';
      addEntry({
        toolId: tool.id,
        toolName: tool.name,
        input: inputSummary,
        resultSummary: res.summary || '',
        rawResult: res.rawOutput || '',
        status: res.success ? 'success' : 'error',
      });
    } catch (err) {
      setResult({
        success: false,
        summary: `Error: ${(err as Error).message}`,
        data: {},
        rawOutput: `Error: ${(err as Error).message}`,
      });
    }
    setRunning(false);
  };

  const handleCopy = async () => {
    if (!result?.rawOutput) return;
    await navigator.clipboard.writeText(result.rawOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!result?.rawOutput) return;
    const blob = new Blob([result.rawOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.slug}-result.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (input: ToolInput, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [input.id]: value }));
  };

  const renderInput = (input: ToolInput) => {
    switch (input.type) {
      case 'textarea':
        return (
          <textarea
            value={(formValues[input.id] as string) || ''}
            onChange={(e) => handleInputChange(input, e.target.value)}
            placeholder={input.placeholder}
            className="input-cyber font-mono text-sm"
            rows={5}
          />
        );
      case 'select':
        return (
          <select
            value={(formValues[input.id] as string) || ''}
            onChange={(e) => handleInputChange(input, e.target.value)}
            className="input-cyber text-sm"
          >
            {input.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={(formValues[input.id] as number) ?? ''}
            onChange={(e) => handleInputChange(input, e.target.value ? Number(e.target.value) : '')}
            placeholder={input.placeholder}
            className="input-cyber text-sm"
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formValues[input.id]}
              onChange={(e) => handleInputChange(input, e.target.checked)}
              className="w-4 h-4 rounded border-border accent-cyber-cyan"
            />
            <span className="text-sm text-muted-foreground">{input.label}</span>
          </label>
        );
      case 'file':
        return (
          <div>
            <input
              ref={(el) => { fileInputRefs.current[input.id] = el; }}
              type="file"
              onChange={(e) => handleInputChange(input, e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRefs.current[input.id]?.click()}
              className="btn-cyber btn-secondary w-full text-sm"
            >
              {formValues[input.id] ? `📁 ${(formValues[input.id] as File).name}` : '📂 Choose File'}
            </button>
          </div>
        );
      default:
        return (
          <input
            type={input.type === 'url' ? 'url' : 'text'}
            value={(formValues[input.id] as string) || ''}
            onChange={(e) => handleInputChange(input, e.target.value)}
            placeholder={input.placeholder}
            className="input-cyber text-sm"
          />
        );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/tools" className="hover:text-foreground">Tools</Link>
        <ChevronRight size={12} />
        <span className="text-foreground">{tool.name}</span>
      </div>

      {/* Tool Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Link href="/tools" className="btn-cyber btn-ghost p-2 rounded-lg" title="Back to tools" aria-label="Back to tools">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{tool.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="badge badge-cyan">{tool.category}</span>
              <span className="badge badge-purple">{tool.difficulty}</span>
              <span className="badge badge-green">
                <Cpu size={10} className="mr-1" />
                {tool.executionType}-side
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content: Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={14} /> Input
            </h2>

            {tool.inputs.map((input) => (
              <div key={input.id}>
                {input.type !== 'checkbox' && (
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {input.label}
                    {input.required && <span className="text-cyber-red ml-1">*</span>}
                  </label>
                )}
                {renderInput(input)}
                {input.helperText && (
                  <p className="text-[11px] text-muted-foreground mt-1">{input.helperText}</p>
                )}
              </div>
            ))}

            <button
              onClick={handleRun}
              disabled={running}
              className="btn-cyber btn-primary w-full btn-lg"
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play size={16} /> Run Tool
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right: Result */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card p-5 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Code size={14} /> Result
              </h2>
              {result && (
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy} className="btn-cyber btn-ghost btn-sm" title="Copy raw output" aria-label="Copy raw output">
                    {copied ? <Check size={14} className="text-cyber-green" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleExport} className="btn-cyber btn-ghost btn-sm" title="Export raw output" aria-label="Export raw output">
                    <Download size={14} /> Export
                  </button>
                </div>
              )}
            </div>

            {!result ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center space-y-2">
                  <Play size={32} className="mx-auto opacity-30" />
                  <p>Enter input and click &quot;Run Tool&quot; to see results</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Status Banner */}
                <div className={`rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2 text-sm ${
                  result.success ? 'bg-status-pass/10 text-status-pass border border-status-pass/20' : 'bg-status-fail/10 text-status-fail border border-status-fail/20'
                }`}>
                  {result.success ? <Check size={16} /> : <AlertTriangle size={16} />}
                  {result.summary}
                </div>

                {/* Tabs */}
                <div className="tab-bar mb-4">
                  <button className={`tab-item ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button>
                  <button className={`tab-item ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>Raw Output</button>
                  {result.explanation && (
                    <button className={`tab-item ${activeTab === 'explanation' ? 'active' : ''}`} onClick={() => setActiveTab('explanation')}>Explanation</button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto">
                  {activeTab === 'summary' && (
                    <div className="space-y-2">
                      {result.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs max-w-[300px] truncate text-right">{item.value}</span>
                            {item.status && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                item.status === 'pass' ? 'bg-status-pass' : item.status === 'fail' ? 'bg-status-fail' : item.status === 'warn' ? 'bg-status-warn' : 'bg-cyber-blue'
                              }`} />
                            )}
                          </div>
                        </div>
                      ))}
                      {!result.items?.length && result.data && (
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-surface overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {activeTab === 'raw' && (
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap p-4 rounded-lg bg-surface overflow-auto max-h-[400px]">
                      {result.rawOutput || 'No raw output'}
                    </pre>
                  )}

                  {activeTab === 'explanation' && result.explanation && (
                    <div className="p-4 rounded-lg bg-surface text-sm text-muted-foreground whitespace-pre-wrap">
                      <Info size={14} className="inline mr-2 text-cyber-cyan" />
                      {result.explanation}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Related Tools */}
      {relatedTools.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            More {categoryName} Tools
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {relatedTools.map((t) => (
              <Link key={t.id} href={`/tools/${t.slug}`} className="glass-card p-3 hover:border-cyber-cyan/30 transition-all">
                <h4 className="text-xs font-medium hover:text-cyber-cyan">{t.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-1">{t.shortDescription}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
