'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { allToolMetadata } from '@/lib/tools/metadata';
import StatePanel from '@/components/ui/StatePanel';
import type { ToolMetadata } from '@/lib/tools/metadata';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred';
}

export default function CompareToolsPage() {
  // Combine encoding and hashing tools for comparison dropdowns
  const compareTools: ToolMetadata[] = allToolMetadata.filter(
    (tool) => tool.category === 'encoding' || tool.category === 'hashing'
  );

  // Left panel states
  const [leftToolId, setLeftToolId] = useState(compareTools[0]?.id || '');
  const [leftInput, setLeftInput] = useState('');
  const [leftMode, setLeftMode] = useState('encode');
  const [leftOutput, setLeftOutput] = useState('');
  const [leftError, setLeftError] = useState('');
  const [leftSuccess, setLeftSuccess] = useState(false);

  // Right panel states
  const [rightToolId, setRightToolId] = useState(compareTools[1]?.id || '');
  const [rightInput, setRightInput] = useState('');
  const [rightMode, setRightMode] = useState('encode');
  const [rightOutput, setRightOutput] = useState('');
  const [rightError, setRightError] = useState('');
  const [rightSuccess, setRightSuccess] = useState(false);

  const leftTool = compareTools.find(t => t.id === leftToolId);
  const rightTool = compareTools.find(t => t.id === rightToolId);

  // Run left tool
  const runLeft = async () => {
    if (!leftTool) return;
    setLeftError('');
    setLeftSuccess(false);

    try {
      const { loadToolExecutor } = await import('@/lib/tools/registry');
      const executor = await loadToolExecutor(leftTool.slug);
      if (!executor) throw new Error('Tool executor is unavailable.');
      const result = await executor.execute({
        input: leftInput,
        token: leftInput, // For JWT
        mode: leftMode,
        // Fallbacks for other hashing/crypto tools
        shift: 3,
        separator: ' ',
      });

      if (result.success) {
        setLeftOutput(result.rawOutput || '');
        setLeftSuccess(true);
      } else {
        setLeftError(result.summary || 'Execution failed');
      }
    } catch (err: unknown) {
      setLeftError(getErrorMessage(err));
    }
  };

  // Run right tool
  const runRight = async () => {
    if (!rightTool) return;
    setRightError('');
    setRightSuccess(false);

    try {
      const { loadToolExecutor } = await import('@/lib/tools/registry');
      const executor = await loadToolExecutor(rightTool.slug);
      if (!executor) throw new Error('Tool executor is unavailable.');
      const result = await executor.execute({
        input: rightInput,
        token: rightInput,
        mode: rightMode,
        shift: 3,
        separator: ' ',
      });

      if (result.success) {
        setRightOutput(result.rawOutput || '');
        setRightSuccess(true);
      } else {
        setRightError(result.summary || 'Execution failed');
      }
    } catch (err: unknown) {
      setRightError(getErrorMessage(err));
    }
  };

  // Quick action: send left output to right input
  const sendLeftToRight = () => {
    if (leftOutput) {
      setRightInput(leftOutput);
    }
  };

  // Quick action: send right output to left input
  const sendRightToLeft = () => {
    if (rightOutput) {
      setLeftInput(rightOutput);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArrowLeftRight className="text-cyber-cyan" />
          Compare Tools Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open two data transformation tools side-by-side. Pipe outputs directly to inputs to decode, solve multi-layered ciphers, and inspect CTF payloads in real-time.
        </p>
      </motion.div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= LEFT SIDE WORKSPACE ================= */}
        <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Panel Left</span>
              
              {/* Tool Selector */}
              <select
                value={leftToolId}
                onChange={(e) => {
                  setLeftToolId(e.target.value);
                  setLeftOutput('');
                  setLeftSuccess(false);
                }}
                className="input-cyber py-1 text-xs"
              >
                {compareTools.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {leftTool && (
              <div className="space-y-4">
                {/* Dynamic Mode option if tool supports it */}
                {leftTool.inputs.find(i => i.id === 'mode') && (
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1.5">Mode</label>
                    <select
                      value={leftMode}
                      onChange={(e) => setLeftMode(e.target.value)}
                      className="input-cyber py-1 text-xs"
                    >
                      {leftTool.inputs.find(i => i.id === 'mode')?.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Input Textarea */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1.5">Input Text</label>
                  <textarea
                    value={leftInput}
                    onChange={(e) => setLeftInput(e.target.value)}
                    placeholder="Type or paste text..."
                    rows={4}
                    className="input-cyber p-3 text-xs"
                  />
                </div>

                {/* Run Button */}
                <button
                  onClick={runLeft}
                  className="btn-cyber btn-secondary btn-sm text-cyber-cyan border-cyber-cyan/30"
                >
                  Execute Left
                </button>
              </div>
            )}
          </div>

          {/* Results Output Block Left */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Output Results</span>
              {leftOutput && (
                <button
                  onClick={sendLeftToRight}
                  className="text-xs text-cyber-cyan hover:text-foreground font-semibold flex items-center gap-1 bg-cyber-cyan/10 px-2 py-0.5 rounded border border-cyber-cyan/20"
                  title="Pipe output to right panel input"
                  aria-label="Pipe left output to right input"
                >
                  Pipe Right <ArrowRight size={12} />
                </button>
              )}
            </div>

            {leftError && (
              <StatePanel icon={<ArrowLeftRight size={20} />} title="Left execution failed" description={leftError} tone="error" />
            )}

            {leftSuccess ? (
              <pre className="p-4 bg-surface border border-border rounded-lg font-mono text-xs text-status-pass overflow-x-auto min-h-[100px] max-h-[180px]">
                {leftOutput || 'No output.'}
              </pre>
            ) : !leftError && (
              <StatePanel icon={<ArrowLeftRight size={20} />} title="No left output" description="Execute the left tool to compute results." />
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE WORKSPACE ================= */}
        <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Panel Right</span>
              
              {/* Tool Selector */}
              <select
                value={rightToolId}
                onChange={(e) => {
                  setRightToolId(e.target.value);
                  setRightOutput('');
                  setRightSuccess(false);
                }}
                className="input-cyber py-1 text-xs"
              >
                {compareTools.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {rightTool && (
              <div className="space-y-4">
                {/* Dynamic Mode option if tool supports it */}
                {rightTool.inputs.find(i => i.id === 'mode') && (
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1.5">Mode</label>
                    <select
                      value={rightMode}
                      onChange={(e) => setRightMode(e.target.value)}
                      className="input-cyber py-1 text-xs"
                    >
                      {rightTool.inputs.find(i => i.id === 'mode')?.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Input Textarea */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1.5">Input Text</label>
                  <textarea
                    value={rightInput}
                    onChange={(e) => setRightInput(e.target.value)}
                    placeholder="Type or paste text..."
                    rows={4}
                    className="input-cyber p-3 text-xs"
                  />
                </div>

                {/* Run Button */}
                <button
                  onClick={runRight}
                  className="btn-cyber btn-secondary btn-sm text-cyber-cyan border-cyber-cyan/30"
                >
                  Execute Right
                </button>
              </div>
            )}
          </div>

          {/* Results Output Block Right */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Output Results</span>
              {rightOutput && (
                <button
                  onClick={sendRightToLeft}
                  className="text-xs text-cyber-cyan hover:text-foreground font-semibold flex items-center gap-1 bg-cyber-cyan/10 px-2 py-0.5 rounded border border-cyber-cyan/20"
                  title="Pipe output to left panel input"
                  aria-label="Pipe right output to left input"
                >
                  <ArrowLeftRight size={12} /> Pipe Left
                </button>
              )}
            </div>

            {rightError && (
              <StatePanel icon={<ArrowLeftRight size={20} />} title="Right execution failed" description={rightError} tone="error" />
            )}

            {rightSuccess ? (
              <pre className="p-4 bg-surface border border-border rounded-lg font-mono text-xs text-status-pass overflow-x-auto min-h-[100px] max-h-[180px]">
                {rightOutput || 'No output.'}
              </pre>
            ) : !rightError && (
              <StatePanel icon={<ArrowLeftRight size={20} />} title="No right output" description="Execute the right tool to compute results." />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
