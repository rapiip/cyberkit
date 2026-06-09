'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, AlertTriangle, Play, Shield, Code, ChevronRight, CheckCircle, Terminal } from 'lucide-react';
import Link from 'next/link';

const challenges = [
  { 
    level: 1, 
    title: "Basic Script Injection", 
    hint: "Try injecting a standard <script> tag to prompt an alert.", 
    payload: '<script>alert("XSS")</script>' 
  },
  { 
    level: 2, 
    title: "Event Handler Injection", 
    hint: "Inject an image tag with a broken source and an onerror trigger.", 
    payload: '<img src=x onerror=alert("XSS")>' 
  },
  { 
    level: 3, 
    title: "SVG-based XSS", 
    hint: "SVG graphics can load script codes directly. Try using svg onload.", 
    payload: '<svg onload=alert("XSS")>' 
  },
];

export default function XSSLab() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    output: string;
    escapedOutput: string;
    triggered: boolean;
  } | null>(null);
  const [activeChallenge, setActiveChallenge] = useState(0);
  const [showSecure, setShowSecure] = useState(false);
  const [showMockAlert, setShowMockAlert] = useState(false);

  const handleSubmit = () => {
    const payload = input.trim();
    const escaped = payload
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    if (activeChallenge === 0) {
      // Challenge 1: <script> tag XSS
      const hasScript = /<script.*?>.*?<\/script>/i.test(payload) || /<script/i.test(payload);
      if (hasScript) {
        setResult({
          success: true,
          message: '🎉 Level 1 Solved! Basic Script tag injection discovered! The browser parsed the input directly as HTML and prepared script execution.',
          output: payload,
          escapedOutput: escaped,
          triggered: true,
        });
        setShowMockAlert(true);
      } else {
        setResult({
          success: false,
          message: '❌ Exploit Failed. Try injecting a standard <script>alert("XSS")</script> tag payload.',
          output: payload,
          escapedOutput: escaped,
          triggered: false,
        });
      }
    } else if (activeChallenge === 1) {
      // Challenge 2: onerror event handler
      const hasOnerror = /<img.*?onerror\s*=\s*/i.test(payload) || /onerror\s*=/i.test(payload);
      if (hasOnerror) {
        setResult({
          success: true,
          message: '🎉 Level 2 Solved! Event Handler Injection Successful! The image failed to load, triggering the onerror event code.',
          output: payload,
          escapedOutput: escaped,
          triggered: true,
        });
        setShowMockAlert(true);
      } else {
        setResult({
          success: false,
          message: '❌ Exploit Failed. Use a broken image source and the onerror attribute to trigger execution.',
          output: payload,
          escapedOutput: escaped,
          triggered: false,
        });
      }
    } else if (activeChallenge === 2) {
      // Challenge 3: SVG onload
      const hasSvg = /<svg.*?onload\s*=\s*/i.test(payload) || /<svg/i.test(payload);
      if (hasSvg) {
        setResult({
          success: true,
          message: '🎉 Level 3 Solved! SVG onload injection successful! Modern browsers parse inline SVG elements and execute embedded onload triggers.',
          output: payload,
          escapedOutput: escaped,
          triggered: true,
        });
        setShowMockAlert(true);
      } else {
        setResult({
          success: false,
          message: '❌ Exploit Failed. Inject an SVG tag with an onload attribute to execute code.',
          output: payload,
          escapedOutput: escaped,
          triggered: false,
        });
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/labs" className="hover:text-zinc-300">Labs</Link>
        <ChevronRight size={12} />
        <span className="text-zinc-300">XSS Lab</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> 
          Cross-Site Scripting (XSS) Lab
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Explore and master HTML payload injection to prompt arbitrary client-side script execution.
        </p>
      </motion.div>

      <div className="bg-zinc-950 p-4 flex items-start gap-3 rounded-lg border border-amber-500/20 text-xs">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <span className="text-zinc-400">
          <strong className="text-amber-500">Safe Sandbox.</strong> No scripts are actually executed against your machine. Celah XSS dianalisis secara sandboxed.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Challenges list */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Challenge Tasks</h2>
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveChallenge(i);
                  setResult(null);
                  setInput('');
                }}
                className={`w-full text-left bg-zinc-900/40 border rounded-xl p-4 transition-all ${
                  activeChallenge === i 
                    ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    activeChallenge === i ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    Level {c.level}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{c.title}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive vulnerable form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2 text-zinc-200">
              <Code size={16} className="text-amber-500" /> Vulnerable Input Field
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">HTML Payload Input</label>
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  placeholder='e.g. <script>alert("XSS")</script>' 
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-amber-400 transition-all" 
                />
              </div>
              
              <button 
                onClick={handleSubmit} 
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg w-full py-2.5 text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                <Play size={14} fill="currentColor" /> Submit Input Form
              </button>
            </div>

            {/* Exploit Results */}
            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className={`p-4 rounded-lg flex gap-3 border ${
                    result.success 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {result.success ? <AlertTriangle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle size={20} className="shrink-0 mt-0.5" />}
                    <div className="text-xs space-y-1">
                      <strong className="text-sm font-semibold">{result.success ? 'XSS Payload Active!' : 'Payload Secure'}</strong>
                      <p className="text-zinc-300">{result.message}</p>
                    </div>
                  </div>

                  {/* Escaped vs Unescaped output comparisons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 block">Vulnerable Output (Renders raw html)</span>
                      <pre className="p-3 bg-rose-950/15 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-lg overflow-x-auto min-h-[60px]">
                        {result.output}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 block">Secured Output (HTML Encoded)</span>
                      <pre className="p-3 bg-emerald-950/15 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded-lg overflow-x-auto min-h-[60px]">
                        {result.escapedOutput}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secure fix comparison info */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                <Shield size={16} className="text-emerald-400" /> Secure Fix Comparison
              </h2>
              <button 
                onClick={() => setShowSecure(!showSecure)} 
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {showSecure ? 'Hide Details' : 'Show Secure Code'}
              </button>
            </div>
            
            <AnimatePresence>
              {showSecure && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <pre className="text-xs font-mono p-4 rounded-lg bg-black border border-emerald-500/20 overflow-x-auto text-emerald-400">
{`// ❌ Vulnerable (setting raw innerHTML)
element.innerHTML = userInput;

// ✅ Secure (setting safe textContent)
element.textContent = userInput;

// ✅ Secure (Manual entity escaping)
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}`}
                  </pre>
                  <div className="text-xs text-zinc-400 space-y-2 pl-2 border-l border-emerald-500/30">
                    <p>• <strong>HTML Entity Encoding</strong> neutralizes script tags, angle brackets, and quotes, transforming them into safe literal strings that cannot execute.</p>
                    <p>• <strong>SameSite & HttpOnly</strong> session cookies prevent attackers from accessing credential cookies even if a minor script is injected.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Simulated Alert Dialog Overlay Popup */}
      <AnimatePresence>
        {showMockAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400 font-mono text-sm border-b border-zinc-800 pb-2">
                <Terminal size={18} />
                <span>localhost:3000 says</span>
              </div>
              <p className="text-sm font-semibold text-zinc-200 text-center py-2">
                &quot;XSS&quot;
              </p>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowMockAlert(false)}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded px-4 py-2 transition-colors font-mono"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
