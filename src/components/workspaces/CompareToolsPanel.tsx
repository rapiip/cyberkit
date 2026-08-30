'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Play } from 'lucide-react';
import { allToolMetadata, type ToolMetadata } from '@/lib/tools/metadata';
import StatePanel from '@/components/ui/StatePanel';
import {
  QUICK_RUN_DEFAULTS,
  QUICK_RUN_PARAMETERIZED_TOOL_IDS,
  canQuickRunTransformTool,
  quickRunTransformTool,
} from '@/lib/tools/transforms/quick-run';
import type { WorkspaceId } from '@/lib/tools/workspaces';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred';
}

interface PanelState {
  toolId: string;
  input: string;
  mode: string;
  shift: number;
  xorKey: string;
  output: string;
  error: string;
  hasRun: boolean;
  running: boolean;
}

function createPanelState(toolId: string): PanelState {
  return {
    toolId,
    input: '',
    mode: 'encode',
    shift: QUICK_RUN_DEFAULTS.shift,
    xorKey: QUICK_RUN_DEFAULTS.xorKey,
    output: '',
    error: '',
    hasRun: false,
    running: false,
  };
}

/**
 * Runs a transform capability without going through the full ToolRunner. Simple
 * transforms use the shared quick runner; anything else falls back to the lazily
 * imported executor registry.
 */
async function runComparePanel(tool: ToolMetadata, state: PanelState) {
  if (canQuickRunTransformTool(tool.id)) {
    return {
      success: true as const,
      rawOutput: await quickRunTransformTool(tool, {
        input: state.input,
        mode: state.mode,
        shift: state.shift,
        xorKey: state.xorKey,
      }),
      summary: '',
    };
  }

  const { loadToolExecutor } = await import('@/lib/tools/registry');
  const executor = await loadToolExecutor(tool.slug);
  if (!executor) throw new Error('Tool executor is unavailable.');
  return executor.execute({
    input: state.input,
    token: state.input,
    mode: state.mode,
    shift: state.shift,
    xorKey: state.xorKey,
    separator: QUICK_RUN_DEFAULTS.separator,
  });
}

interface ComparePanelProps {
  side: 'left' | 'right';
  tools: ToolMetadata[];
  state: PanelState;
  onChange: (next: Partial<PanelState>) => void;
  onRun: () => void;
  onPipe: () => void;
}

function ComparePanel({ side, tools, state, onChange, onRun, onPipe }: ComparePanelProps) {
  const tool = tools.find((item) => item.id === state.toolId);
  const modeInput = tool?.inputs.find((input) => input.id === 'mode');
  const label = side === 'left' ? 'Panel A' : 'Panel B';
  const pipeLabel = side === 'left' ? 'Pipe to B' : 'Pipe to A';

  return (
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-border bg-[color:var(--panel-subtle)] p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <label className="sr-only" htmlFor={`compare-${side}-tool`}>
            {label} capability
          </label>
          <select
            id={`compare-${side}-tool`}
            value={state.toolId}
            onChange={(event) => onChange({ toolId: event.target.value, output: '', error: '', hasRun: false })}
            className="input-cyber py-1 text-xs"
          >
            {tools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {modeInput?.options?.length ? (
          <div>
            <label htmlFor={`compare-${side}-mode`} className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground">
              Mode
            </label>
            <select
              id={`compare-${side}-mode`}
              value={state.mode}
              onChange={(event) => onChange({ mode: event.target.value })}
              className="input-cyber py-1 text-xs"
            >
              {modeInput.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {state.toolId === QUICK_RUN_PARAMETERIZED_TOOL_IDS.shift && (
          <div>
            <label htmlFor={`compare-${side}-shift`} className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground">
              Shift
            </label>
            <input
              id={`compare-${side}-shift`}
              type="number"
              min={1}
              max={25}
              value={state.shift}
              onChange={(event) => onChange({ shift: Number(event.target.value) })}
              className="input-cyber py-1 text-xs"
            />
          </div>
        )}

        {state.toolId === QUICK_RUN_PARAMETERIZED_TOOL_IDS.xorKey && (
          <div>
            <label htmlFor={`compare-${side}-xor-key`} className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground">
              XOR key
            </label>
            <input
              id={`compare-${side}-xor-key`}
              type="text"
              value={state.xorKey}
              onChange={(event) => onChange({ xorKey: event.target.value })}
              className="input-cyber py-1 text-xs"
              spellCheck={false}
            />
          </div>
        )}

        <div>
          <label htmlFor={`compare-${side}-input`} className="mb-1.5 block font-mono text-xs uppercase text-muted-foreground">
            Input
          </label>
          <textarea
            id={`compare-${side}-input`}
            value={state.input}
            onChange={(event) => onChange({ input: event.target.value })}
            placeholder="Type or paste text..."
            rows={4}
            className="input-cyber p-3 text-xs"
            spellCheck={false}
          />
        </div>

        <button type="button" onClick={onRun} disabled={state.running} className="btn-cyber btn-secondary btn-sm">
          <Play size={12} /> {state.running ? 'Running…' : `Run ${label}`}
        </button>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Output</span>
          {state.output && (
            <button
              type="button"
              onClick={onPipe}
              className="flex items-center gap-1 rounded border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-cyber-cyan hover:text-foreground"
              title={pipeLabel}
            >
              {pipeLabel} <ArrowRight size={12} />
            </button>
          )}
        </div>

        <div aria-live="polite">
          {state.error ? (
            <StatePanel icon={<ArrowLeftRight size={20} />} title={`${label} failed`} description={state.error} tone="error" />
          ) : state.hasRun ? (
            <pre className="max-h-[180px] min-h-[100px] overflow-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs text-status-pass">
              {state.output || 'No output.'}
            </pre>
          ) : (
            <StatePanel
              icon={<ArrowLeftRight size={20} />}
              title="No output yet"
              description={`Run ${label} to compute a result.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface CompareToolsPanelProps {
  workspaceId: WorkspaceId;
}

/**
 * Side-by-side transform comparison. Replaces the retired `/tools/compare`
 * route and is mounted inside the workspace that owns the transform tools.
 */
export default function CompareToolsPanel({ workspaceId }: CompareToolsPanelProps) {
  const compareTools = useMemo(
    () =>
      allToolMetadata.filter(
        (tool) =>
          (tool.category === 'encoding' || tool.category === 'hashing' || tool.category === 'ctf') &&
          canQuickRunTransformTool(tool.id)
      ),
    []
  );

  const [left, setLeft] = useState(() => createPanelState(compareTools[0]?.id ?? ''));
  const [right, setRight] = useState(() => createPanelState(compareTools[1]?.id ?? compareTools[0]?.id ?? ''));

  const run = async (side: 'left' | 'right') => {
    const state = side === 'left' ? left : right;
    const setState = side === 'left' ? setLeft : setRight;
    const tool = compareTools.find((item) => item.id === state.toolId);
    if (!tool) return;

    setState((current) => ({ ...current, running: true, error: '', hasRun: false }));
    try {
      const result = await runComparePanel(tool, state);
      if (result.success) {
        setState((current) => ({ ...current, output: result.rawOutput || '', hasRun: true, running: false }));
      } else {
        setState((current) => ({ ...current, error: result.summary || 'Execution failed', running: false }));
      }
    } catch (error: unknown) {
      setState((current) => ({ ...current, error: getErrorMessage(error), running: false }));
    }
  };

  if (compareTools.length < 2) return null;

  return (
    <section className="glass-card p-5" aria-labelledby={`compare-heading-${workspaceId}`}>
      <div className="mb-4">
        <h2 id={`compare-heading-${workspaceId}`} className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight size={16} className="text-cyber-cyan" /> Side-by-side comparison
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Run two transforms next to each other and pipe one output into the other input to peel multi-layered
          encodings. Everything executes in this browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ComparePanel
          side="left"
          tools={compareTools}
          state={left}
          onChange={(next) => setLeft((current) => ({ ...current, ...next }))}
          onRun={() => run('left')}
          onPipe={() => setRight((current) => ({ ...current, input: left.output }))}
        />
        <ComparePanel
          side="right"
          tools={compareTools}
          state={right}
          onChange={(next) => setRight((current) => ({ ...current, ...next }))}
          onRun={() => run('right')}
          onPipe={() => setLeft((current) => ({ ...current, input: right.output }))}
        />
      </div>
    </section>
  );
}
