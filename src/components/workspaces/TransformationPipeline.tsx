'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2, WandSparkles } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';
import {
  executeTransformPipelineWithEncodings,
  listTransformEncodings,
  listTransformOperations,
  suggestTransformOperations,
  type TransformEncoding,
  type TransformOperationId,
  type TransformStep,
} from '@/lib/tools/transforms/engine';

const STORAGE_PREFIX = 'cyberkit:pipeline-recipes:';

interface SavedRecipe {
  id: string;
  name: string;
  steps: TransformStep[];
}

interface TransformationPipelineProps {
  workspaceId: 'data-transformation' | 'ctf-decoder-workbench';
}

const dataTransformationOperations = new Set<TransformOperationId>([
  'base64-encode',
  'base64-decode',
  'base64url-encode',
  'base64url-decode',
  'url-encode',
  'url-decode',
  'url-encode-component',
  'url-decode-component',
  'html-encode',
  'html-decode',
  'hex-encode',
  'hex-decode',
  'binary-encode',
  'binary-decode',
  'unicode-encode',
  'unicode-decode',
]);

const ctfOperations = new Set<TransformOperationId>([
  'rot13',
  'caesar-encrypt',
  'caesar-decrypt',
  'morse-encode',
  'morse-decode',
  'xor-text',
  'xor-hex',
  'base64-decode',
  'hex-decode',
  'binary-decode',
  'unicode-decode',
]);

function createStep(operationId: TransformOperationId): TransformStep {
  return {
    id: crypto.randomUUID(),
    operationId,
    enabled: true,
    options: {
      shift: 3,
      separator: ' ',
      xorKey: '0x41',
      xorInputFormat: 'text',
    },
  };
}

export default function TransformationPipeline({ workspaceId }: TransformationPipelineProps) {
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState<TransformStep[]>([]);
  const [history, setHistory] = useState<TransformStep[][]>([]);
  const [recipes, setRecipes] = useState<SavedRecipe[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${workspaceId}`);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored) as SavedRecipe[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem(`${STORAGE_PREFIX}${workspaceId}`);
      return [];
    }
  });
  const [selectedOperation, setSelectedOperation] = useState<TransformOperationId>('base64-decode');
  const [inputEncoding, setInputEncoding] = useState<TransformEncoding>('utf8');
  const [outputEncoding, setOutputEncoding] = useState<TransformEncoding>('utf8');
  const [result, setResult] = useState<{ output: string; history: Array<{ step: TransformStep; output: string }> } | null>(null);
  const [error, setError] = useState('');

  const operations = useMemo(() => {
    const allowed = workspaceId === 'data-transformation' ? dataTransformationOperations : ctfOperations;
    return listTransformOperations().filter((operation) => allowed.has(operation.id));
  }, [workspaceId]);

  const suggestions = useMemo(
    () => suggestTransformOperations(input).filter((suggestion) =>
      operations.some((operation) => operation.id === suggestion.operationId)
    ),
    [input, operations]
  );
  const encodings = listTransformEncodings();

  const pushHistory = (nextSteps: TransformStep[]) => {
    setHistory((current) => [...current.slice(-19), steps]);
    setSteps(nextSteps);
  };

  const runPipeline = () => {
    setError('');
    try {
      setResult(executeTransformPipelineWithEncodings(input, steps, inputEncoding, outputEncoding));
    } catch (pipelineError) {
      setResult(null);
      setError(pipelineError instanceof Error ? pipelineError.message : 'Pipeline execution failed.');
    }
  };

  const saveRecipe = () => {
    const name = window.prompt('Recipe name');
    if (!name) return;
    const nextRecipes = [...recipes, { id: crypto.randomUUID(), name, steps }];
    setRecipes(nextRecipes);
    localStorage.setItem(`${STORAGE_PREFIX}${workspaceId}`, JSON.stringify(nextRecipes));
  };

  return (
    <section className="glass-card p-5" aria-labelledby={`${workspaceId}-pipeline-heading`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${workspaceId}-pipeline-heading`} className="text-lg font-semibold">
            {workspaceId === 'data-transformation' ? 'Transformation Pipeline' : 'CTF Pipeline'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build multi-step recipes with reorder, enable or disable, undo, and saved recipes. Suggestions are heuristic only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runPipeline} className="btn-cyber btn-primary btn-sm">
            <WandSparkles size={14} /> Run pipeline
          </button>
          <button type="button" onClick={saveRecipe} className="btn-cyber btn-ghost btn-sm" disabled={!steps.length}>
            <Save size={14} /> Save recipe
          </button>
          <button
            type="button"
            onClick={() => {
              const previous = history.at(-1);
              if (!previous) return;
              setHistory((current) => current.slice(0, -1));
              setSteps(previous);
            }}
            className="btn-cyber btn-ghost btn-sm"
            disabled={!history.length}
          >
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Input</label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={6}
              className="input-cyber font-mono text-sm"
              placeholder="Paste payload, bytes, or encoded text..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Input encoding</label>
              <select
                value={inputEncoding}
                onChange={(event) => setInputEncoding(event.target.value as TransformEncoding)}
                className="input-cyber text-sm"
              >
                {encodings.map((encoding) => (
                  <option key={encoding.id} value={encoding.id}>
                    {encoding.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Output encoding</label>
              <select
                value={outputEncoding}
                onChange={(event) => setOutputEncoding(event.target.value as TransformEncoding)}
                className="input-cyber text-sm"
              >
                {encodings.map((encoding) => (
                  <option key={encoding.id} value={encoding.id}>
                    {encoding.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-lg border border-cyber-cyan/20 bg-cyber-cyan/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyber-cyan">Suggestions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.operationId}-${suggestion.reason}`}
                    type="button"
                    onClick={() => pushHistory([...steps, createStep(suggestion.operationId)])}
                    className="rounded-full border border-cyber-cyan/20 bg-surface px-3 py-1 text-xs"
                  >
                    {suggestion.operationId} ({suggestion.confidence})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-xs text-muted-foreground">Add step</label>
                <select
                  value={selectedOperation}
                  onChange={(event) => setSelectedOperation(event.target.value as TransformOperationId)}
                  className="input-cyber text-sm"
                >
                  {operations.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      {operation.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => pushHistory([...steps, createStep(selectedOperation)])}
                className="btn-cyber btn-secondary btn-sm"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {steps.length === 0 ? (
              <StatePanel
                icon={<WandSparkles size={18} />}
                title="No pipeline steps"
                description="Add one or more operations to compose a workflow."
              />
            ) : (
              steps.map((step, index) => (
                <div key={step.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{index + 1}. {step.operationId}</p>
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={step.enabled}
                          onChange={(event) =>
                            pushHistory(steps.map((candidate) =>
                              candidate.id === step.id ? { ...candidate, enabled: event.target.checked } : candidate
                            ))
                          }
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => index > 0 && pushHistory(steps.map((item, itemIndex, list) => {
                          if (itemIndex === index) return list[index - 1];
                          if (itemIndex === index - 1) return list[index];
                          return item;
                        }))}
                        className="btn-cyber btn-ghost btn-sm"
                        aria-label={`Move step ${index + 1} up`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => index < steps.length - 1 && pushHistory(steps.map((item, itemIndex, list) => {
                          if (itemIndex === index) return list[index + 1];
                          if (itemIndex === index + 1) return list[index];
                          return item;
                        }))}
                        className="btn-cyber btn-ghost btn-sm"
                        aria-label={`Move step ${index + 1} down`}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => pushHistory(steps.filter((candidate) => candidate.id !== step.id))}
                        className="btn-cyber btn-ghost btn-sm"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {(step.operationId === 'caesar-encrypt' || step.operationId === 'caesar-decrypt') && (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs text-muted-foreground">Shift</label>
                      <input
                        type="number"
                        className="input-cyber text-sm"
                        value={step.options?.shift ?? 3}
                        onChange={(event) =>
                          pushHistory(steps.map((candidate) =>
                            candidate.id === step.id
                              ? { ...candidate, options: { ...candidate.options, shift: Number(event.target.value) || 3 } }
                              : candidate
                          ))
                        }
                      />
                    </div>
                  )}

                  {(step.operationId === 'xor-text' || step.operationId === 'xor-hex') && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">XOR key</label>
                        <input
                          type="text"
                          className="input-cyber text-sm"
                          value={step.options?.xorKey ?? '0x41'}
                          onChange={(event) =>
                            pushHistory(steps.map((candidate) =>
                              candidate.id === step.id
                                ? { ...candidate, options: { ...candidate.options, xorKey: event.target.value } }
                                : candidate
                            ))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">Input format</label>
                        <select
                          className="input-cyber text-sm"
                          value={step.options?.xorInputFormat ?? 'text'}
                          onChange={(event) =>
                            pushHistory(steps.map((candidate) =>
                              candidate.id === step.id
                                ? { ...candidate, options: { ...candidate.options, xorInputFormat: event.target.value as 'text' | 'hex' } }
                                : candidate
                            ))
                          }
                        >
                          <option value="text">Text</option>
                          <option value="hex">Hex</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output</p>
            {error ? (
              <p className="mt-3 text-sm text-status-fail">{error}</p>
            ) : (
              <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap font-mono text-xs">
                {result?.output || 'Run the pipeline to compute output.'}
              </pre>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step history</p>
            <div className="mt-3 space-y-2">
              {result?.history.length ? result.history.map((entry, index) => (
                <div key={`${entry.step.id}-${index}`} className="rounded-lg bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">{index + 1}. {entry.step.operationId}</p>
                  <pre className="mt-1 max-h-[120px] overflow-auto whitespace-pre-wrap font-mono text-xs">{entry.output}</pre>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No execution history yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved recipes</p>
            <div className="mt-3 space-y-2">
              {recipes.length ? recipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2">
                  <div>
                    <p className="text-sm">{recipe.name}</p>
                    <p className="text-xs text-muted-foreground">{recipe.steps.length} step(s)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistory((current) => [...current.slice(-19), steps]);
                      setSteps(recipe.steps.map((step) => ({ ...step, id: crypto.randomUUID() })));
                    }}
                    className="btn-cyber btn-ghost btn-sm"
                  >
                    Load
                  </button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No saved recipes for this workspace.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
