'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, AlertTriangle, Play, Shield, Code, ChevronRight, CheckCircle, Terminal } from 'lucide-react';
import Link from 'next/link';

const challenges = [
  { 
    level: 1, 
    title: "Basic Script Injection", 
    hint: 'Study how raw script-like markup is handled by unsafe rendering.', 
    payload: '<script>alert("XSS")</script>' 
  },
  { 
    level: 2, 
    title: "Event Handler Injection", 
    hint: 'Study how event attributes become dangerous when user HTML is trusted.', 
    payload: '<img src=x onerror=alert("XSS")>' 
  },
  { 
    level: 3, 
    title: "SVG-based XSS", 
    hint: 'Study why embedded SVG and load handlers require strict sanitization.', 
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
          message: 'Pattern not detected. Review how raw script-like markup differs from escaped text.',
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
          message: 'Pattern not detected. Review why event-handler attributes must never be trusted from user input.',
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
          message: 'Pattern not detected. Review why SVG content should be sanitized before rendering.',
          output: payload,
          escapedOutput: escaped,
          triggered: false,
        });
      }
    }
  };

  return (
    <div className="page-shell-tight max-w-6xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/labs" className="hover:text-foreground">Labs</Link>
        <ChevronRight size={12} />
        <span className="text-foreground">XSS Lab</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="text-cyber-amber" /> 
          Cross-Site Scripting (XSS) Lab
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore unsafe HTML rendering in a sandbox and learn the controls that prevent client-side script execution.
        </p>
      </motion.div>

      <div className="rounded-xl border border-status-warn/20 bg-[color:var(--panel-subtle)] p-4 flex items-start gap-3 text-xs">
        <AlertTriangle size={16} className="text-cyber-amber shrink-0 mt-0.5" />
        <span className="text-muted-foreground">
          <strong className="text-cyber-amber">Safe Sandbox.</strong> No scripts are actually executed against your machine. Celah XSS dianalisis secara sandboxed.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Challenges list */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Challenge Tasks</h2>
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveChallenge(i);
                  setResult(null);
                  setInput('');
                }}
                className={`w-full text-left bg-surface border rounded-xl p-4 transition-all ${
                  activeChallenge === i 
                    ? 'border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]' 
                    : 'border-border hover:border-border-bright'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    activeChallenge === i ? 'border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-amber' : 'bg-muted text-muted-foreground'
                  }`}>
                    Level {c.level}
                  </span>
                  <span className="text-sm font-medium text-foreground">{c.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive vulnerable form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-5 flex items-center gap-2 text-foreground">
              <Code size={16} className="text-cyber-amber" /> Vulnerable Input Field
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">HTML Training Input</label>
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  placeholder="Paste sandbox training markup..." 
                  rows={3}
                  className="input-cyber p-3 text-xs font-mono" 
                />
              </div>
              
              <button 
                onClick={handleSubmit} 
                className="btn-cyber btn-secondary w-full text-sm text-cyber-amber"
              >
                <Play size={14} fill="currentColor" /> Submit Input Form
              </button>
            </div>

            {/* Simulation Results */}
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
                      ? 'bg-status-fail/10 text-status-fail border-status-fail/25' 
                      : 'bg-status-pass/10 text-status-pass border-status-pass/25'
                  }`}>
                    {result.success ? <AlertTriangle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle size={20} className="shrink-0 mt-0.5" />}
                    <div className="text-xs space-y-1">
                      <strong className="text-sm font-semibold">{result.success ? 'XSS Payload Active!' : 'Payload Secure'}</strong>
                      <p className="text-foreground">{result.message}</p>
                    </div>
                  </div>

                  {/* Escaped vs Unescaped output comparisons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Vulnerable Output (Renders raw html)</span>
                      <pre className="p-3 bg-status-fail/10 border border-status-fail/20 text-status-fail text-xs font-mono rounded-lg overflow-x-auto min-h-[60px]">
                        {result.output}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Secured Output (HTML Encoded)</span>
                      <pre className="p-3 bg-status-pass/10 border border-status-pass/20 text-status-pass text-xs font-mono rounded-lg overflow-x-auto min-h-[60px]">
                        {result.escapedOutput}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secure fix comparison info */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Shield size={16} className="text-status-pass" /> Secure Fix Comparison
              </h2>
              <button 
                onClick={() => setShowSecure(!showSecure)} 
                className="text-xs text-cyber-cyan hover:text-foreground font-semibold"
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
                  <pre className="text-xs font-mono p-4 rounded-lg bg-background border border-status-pass/20 overflow-x-auto text-status-pass">
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
                  <div className="text-xs text-muted-foreground space-y-2 pl-2 border-l border-status-pass/30">
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
            className="fixed inset-0 z-50 bg-background/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-cyber-amber font-mono text-sm border-b border-border pb-2">
                <Terminal size={18} />
                <span>localhost:3000 says</span>
              </div>
              <p className="text-sm font-semibold text-foreground text-center py-2">
                &quot;XSS&quot;
              </p>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowMockAlert(false)}
                  className="btn-cyber btn-secondary btn-sm text-cyber-amber font-mono"
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
