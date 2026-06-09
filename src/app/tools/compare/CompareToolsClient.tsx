'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { getToolsByCategory } from '@/lib/tools/registry';
import type { ToolDefinition } from '@/lib/tools/types';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred';
}

export default function CompareToolsPage() {
  // Combine encoding and hashing tools for comparison dropdowns
  const compareTools: ToolDefinition[] = [
    ...getToolsByCategory('encoding'),
    ...getToolsByCategory('hashing'),
  ];

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
      const result = await leftTool.execute({
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
      const result = await rightTool.execute({
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
          <ArrowLeftRight className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          Compare Tools Workspace
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Open two data transformation tools side-by-side. Pipe outputs directly to inputs to decode, solve multi-layered ciphers, and inspect CTF payloads in real-time.
        </p>
      </motion.div>

      {/* Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= LEFT SIDE WORKSPACE ================= */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace Panel Left</span>
              
              {/* Tool Selector */}
              <select
                value={leftToolId}
                onChange={(e) => {
                  setLeftToolId(e.target.value);
                  setLeftOutput('');
                  setLeftSuccess(false);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-400"
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
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5">Mode</label>
                    <select
                      value={leftMode}
                      onChange={(e) => setLeftMode(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-400"
                    >
                      {leftTool.inputs.find(i => i.id === 'mode')?.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Input Textarea */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5">Input Text</label>
                  <textarea
                    value={leftInput}
                    onChange={(e) => setLeftInput(e.target.value)}
                    placeholder="Type or paste text..."
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Run Button */}
                <button
                  onClick={runLeft}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold rounded-lg px-4 py-2 text-xs transition-all hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                >
                  Execute Left
                </button>
              </div>
            )}
          </div>

          {/* Results Output Block Left */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Output Results</span>
              {leftOutput && (
                <button
                  onClick={sendLeftToRight}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-950"
                  title="Pipe output to right panel input"
                >
                  Pipe Right <ArrowRight size={12} />
                </button>
              )}
            </div>

            {leftError && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/15 text-rose-400 text-xs rounded-lg">
                {leftError}
              </div>
            )}

            {leftSuccess ? (
              <pre className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto min-h-[100px] max-h-[180px]">
                {leftOutput || 'No output.'}
              </pre>
            ) : (
              <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-600 text-xs font-mono py-12">
                Execute tool above to compute results.
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE WORKSPACE ================= */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace Panel Right</span>
              
              {/* Tool Selector */}
              <select
                value={rightToolId}
                onChange={(e) => {
                  setRightToolId(e.target.value);
                  setRightOutput('');
                  setRightSuccess(false);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-400"
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
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5">Mode</label>
                    <select
                      value={rightMode}
                      onChange={(e) => setRightMode(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-400"
                    >
                      {rightTool.inputs.find(i => i.id === 'mode')?.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Input Textarea */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1.5">Input Text</label>
                  <textarea
                    value={rightInput}
                    onChange={(e) => setRightInput(e.target.value)}
                    placeholder="Type or paste text..."
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Run Button */}
                <button
                  onClick={runRight}
                  className="bg-cyan-500/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-500/30 font-semibold rounded-lg px-4 py-2 text-xs transition-all hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                >
                  Execute Right
                </button>
              </div>
            )}
          </div>

          {/* Results Output Block Right */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Output Results</span>
              {rightOutput && (
                <button
                  onClick={sendRightToLeft}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-950"
                  title="Pipe output to left panel input"
                >
                  <ArrowLeftRight size={12} /> Pipe Left
                </button>
              )}
            </div>

            {rightError && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/15 text-rose-400 text-xs rounded-lg">
                {rightError}
              </div>
            )}

            {rightSuccess ? (
              <pre className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto min-h-[100px] max-h-[180px]">
                {rightOutput || 'No output.'}
              </pre>
            ) : (
              <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-600 text-xs font-mono py-12">
                Execute tool above to compute results.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
