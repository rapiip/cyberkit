'use client';

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Code,
  Copy,
  Download,
  FileText,
  Info,
  Play,
  Upload,
} from 'lucide-react';
import { useHistoryStore } from '@/lib/store';
import { createToolResultExport, normalizeToolResult } from '@/lib/tools/result-model';
import type { ToolMetadata } from '@/lib/tools/metadata';
import type { ToolInput, ToolResult } from '@/lib/tools/types';

interface ToolRunnerProps {
  tool: ToolMetadata;
}

export default function ToolRunner({ tool }: ToolRunnerProps) {
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
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'raw' | 'explanation'>('summary');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const addEntry = useHistoryStore((state) => state.addEntry);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { loadToolExecutor } = await import('@/lib/tools/registry');
      const executableTool = await loadToolExecutor(tool.slug);
      if (!executableTool) throw new Error('Tool executor is unavailable.');
      const nextResult = await executableTool.execute(formValues);
      setResult(nextResult);
      setActiveResultTab('summary');

      const inputSummary =
        Object.entries(formValues)
          .filter(([, value]) => typeof value === 'string' && value)
          .map(([key, value]) => `${key}: ${(value as string).substring(0, 50)}`)
          .join(', ') || 'file input';

      if (tool.persistHistory !== false) {
        addEntry({
          toolId: tool.id,
          toolName: tool.name,
          input: inputSummary,
          resultSummary: nextResult.summary || '',
          rawResult: nextResult.rawOutput || '',
          status: nextResult.success ? 'success' : 'error',
        });
      }
    } catch (error) {
      setResult(
        normalizeToolResult({
          success: false,
          summary: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
          data: {},
        })
      );
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.rawOutput) return;
    await navigator.clipboard.writeText(result.rawOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!result) return;
    const exported = createToolResultExport(tool, result);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${tool.slug}-result.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (input: ToolInput, value: unknown) => {
    setFormValues((current) => ({ ...current, [input.id]: value }));
  };

  const renderInput = (input: ToolInput) => {
    const inputId = `${tool.id}-${input.id}`;
    switch (input.type) {
      case 'textarea':
        return (
          <textarea
            id={inputId}
            value={(formValues[input.id] as string) || ''}
            onChange={(event) => handleInputChange(input, event.target.value)}
            placeholder={input.placeholder}
            className="input-cyber font-mono text-sm"
            rows={5}
          />
        );
      case 'select':
        return (
          <select
            id={inputId}
            value={(formValues[input.id] as string) || ''}
            onChange={(event) => handleInputChange(input, event.target.value)}
            className="input-cyber text-sm"
          >
            {input.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            id={inputId}
            type="number"
            value={(formValues[input.id] as number) ?? ''}
            onChange={(event) =>
              handleInputChange(input, event.target.value ? Number(event.target.value) : '')
            }
            placeholder={input.placeholder}
            className="input-cyber text-sm"
          />
        );
      case 'checkbox':
        return (
          <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2">
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(formValues[input.id])}
              onChange={(event) => handleInputChange(input, event.target.checked)}
              className="h-4 w-4 rounded border-border accent-cyber-cyan"
            />
            <span className="text-sm text-muted-foreground">{input.label}</span>
          </label>
        );
      case 'file':
        return (
          <div>
            <input
              id={inputId}
              ref={(element) => {
                fileInputRefs.current[input.id] = element;
              }}
              type="file"
              onChange={(event) => handleInputChange(input, event.target.files?.[0] || null)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[input.id]?.click()}
              className="btn-cyber btn-secondary w-full text-sm"
            >
              <Upload size={15} />
              {formValues[input.id] ? (formValues[input.id] as File).name : 'Choose file'}
            </button>
          </div>
        );
      default:
        return (
          <input
            id={inputId}
            type={input.type === 'url' ? 'url' : input.type === 'password' ? 'password' : 'text'}
            value={(formValues[input.id] as string) || ''}
            onChange={(event) => handleInputChange(input, event.target.value)}
            placeholder={input.placeholder}
            autoComplete={input.type === 'password' ? 'new-password' : undefined}
            spellCheck={input.type === 'password' ? false : undefined}
            className="input-cyber text-sm"
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="glass-card p-5" aria-labelledby={`${tool.id}-input-heading`}>
        <h3 id={`${tool.id}-input-heading`} className="flex items-center gap-2 text-sm font-semibold">
          <FileText size={14} /> Input
        </h3>
        <div className="mt-4 space-y-4">
          {tool.persistHistory === false && (
            <div className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/5 px-3 py-2 text-xs text-muted-foreground">
              Privacy mode: inputs and results from this panel are not written to history,
              reports, analytics, or localStorage.
            </div>
          )}
          {tool.inputs.map((input) => (
            <div key={input.id}>
              {input.type !== 'checkbox' && (
                <label
                  htmlFor={`${tool.id}-${input.id}`}
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  {input.label}
                  {input.required && <span className="ml-1 text-cyber-red">*</span>}
                </label>
              )}
              {renderInput(input)}
              {input.helperText && (
                <p className="mt-1 text-[11px] text-muted-foreground">{input.helperText}</p>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="btn-cyber btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <Play size={16} /> Run {tool.name}
              </>
            )}
          </button>
        </div>
      </section>

      <section className="glass-card flex min-h-[400px] flex-col p-5" aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Code size={14} /> Result
          </h3>
          {result && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="btn-cyber btn-ghost btn-sm"
                aria-label="Copy raw output"
              >
                {copied ? <Check size={14} className="text-cyber-green" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {tool.persistHistory !== false && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="btn-cyber btn-ghost btn-sm"
                  aria-label="Export structured JSON result"
                >
                  <Download size={14} /> Export
                </button>
              )}
            </div>
          )}
        </div>

        {!result ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <div className="space-y-2 text-center">
              <Play size={32} className="mx-auto opacity-30" />
              <p>No result yet. Complete the input and run this panel.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                result.success
                  ? 'border-status-pass/20 bg-status-pass/10 text-status-pass'
                  : 'border-status-fail/20 bg-status-fail/10 text-status-fail'
              }`}
            >
              {result.success ? <Check size={16} /> : <AlertTriangle size={16} />}
              {result.summary || result.status}
            </div>

            <div className="tab-bar mb-4" role="tablist" aria-label="Result views">
              {(['summary', 'raw', 'explanation'] as const).map((tab) => {
                if (tab === 'explanation' && !result.explanation) return null;
                const label = tab === 'raw' ? 'Raw output' : `${tab[0].toUpperCase()}${tab.slice(1)}`;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeResultTab === tab}
                    className={`tab-item ${activeResultTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveResultTab(tab)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-auto">
              {activeResultTab === 'summary' && (
                <div className="space-y-2">
                  {result.items?.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="max-w-[300px] truncate text-right font-mono text-xs">
                        {item.value}
                      </span>
                    </div>
                  ))}
                  {!result.items?.length && (
                    <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 font-mono text-xs text-muted-foreground">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {activeResultTab === 'raw' && (
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-4 font-mono text-xs">
                  {result.rawOutput || 'No raw output'}
                </pre>
              )}
              {activeResultTab === 'explanation' && result.explanation && (
                <div className="whitespace-pre-wrap rounded-lg bg-surface p-4 text-sm text-muted-foreground">
                  <Info size={14} className="mr-2 inline text-cyber-cyan" />
                  {result.explanation}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
