'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ArrowLeft, Shield, AlertTriangle, Code, DollarSign, Send } from 'lucide-react';
import Link from 'next/link';

export default function CSRFLab() {
  const [balance, setBalance] = useState(5000);
  const [activeTab, setActiveTab] = useState<'interactive' | 'vulnerable' | 'secure'>('interactive');
  const [history, setHistory] = useState<string[]>(['Initial balance credited: $5,000']);
  const [csrfExploited, setCsrfExploited] = useState(false);
  const [maliciousActionTriggered, setMaliciousActionTriggered] = useState(false);

  const handleManualTransfer = (amount: number, recipient: string) => {
    if (balance >= amount) {
      setBalance(prev => prev - amount);
      setHistory(prev => [`Transferred $${amount} to ${recipient} (authorized)`, ...prev]);
    }
  };

  // Simulate CSRF risk in this local-only training screen.
  const triggerCSRFExploit = () => {
    setMaliciousActionTriggered(true);
    setTimeout(() => {
      if (balance >= 4500) {
        setBalance(prev => prev - 4500);
        setHistory(prev => ['CRITICAL: Unauthorized training transfer of $4,500 in CSRF simulation', ...prev]);
        setCsrfExploited(true);
      }
    }, 1500);
  };

  const resetLab = () => {
    setBalance(5000);
    setHistory(['Initial balance credited: $5,000']);
    setCsrfExploited(false);
    setMaliciousActionTriggered(false);
  };

  return (
    <div className="page-shell-tight max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/labs" className="btn-cyber btn-ghost btn-sm p-1.5 rounded-lg" title="Back to labs" aria-label="Back to labs">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical size={24} className="text-cyber-cyan" /> CSRF Concept Demo Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Understand Cross-Site Request Forgery (CSRF) by seeing how a malicious site can hijack authenticated browser sessions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('interactive')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'interactive' ? 'border-[color:var(--accent-border)] text-cyber-cyan' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Interactive Simulation
        </button>
        <button
          onClick={() => setActiveTab('vulnerable')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'vulnerable' ? 'border-cyber-red text-cyber-red' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vulnerable Concept (Standard Form)
        </button>
        <button
          onClick={() => setActiveTab('secure')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'secure' ? 'border-status-pass text-status-pass' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          CSRF Protection (Tokens)
        </button>
      </div>

      {/* Interactive Simulation Tab */}
      {activeTab === 'interactive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Screen: Vulnerable Bank App */}
            <div className="lg:col-span-6 bg-surface border border-border rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.28)] flex flex-col justify-between min-h-[420px]">
              <div className="bg-surface px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-status-pass rounded-full animate-pulse" />
                  SecureBank Portal (Logged In)
                </span>
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">JohnDoe</span>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {/* Balance display */}
                <div className="p-4 bg-surface border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Account Balance</span>
                    <div className="text-3xl font-extrabold text-foreground flex items-center mt-0.5">
                      <DollarSign size={24} className="text-status-pass" /> {balance.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Authentication</span>
                    <span className="block text-status-pass text-xs font-semibold mt-1">Session Cookie Active</span>
                  </div>
                </div>

                {/* Transfer simulator */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Transfer</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleManualTransfer(500, 'Sister (Family)')}
                      disabled={balance < 500 || maliciousActionTriggered}
                      className="flex-1 bg-surface-hover hover:bg-muted border border-border rounded-lg py-2 text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <Send size={12} /> Transfer $500
                    </button>
                    <button
                      onClick={() => handleManualTransfer(100, 'Utility Company')}
                      disabled={balance < 100 || maliciousActionTriggered}
                      className="flex-1 bg-surface-hover hover:bg-muted border border-border rounded-lg py-2 text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <Send size={12} /> Pay Bill $100
                    </button>
                  </div>
                </div>

                {/* Account history */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity History</span>
                  <div className="bg-surface border border-border rounded-lg p-3 max-h-24 overflow-y-auto font-mono text-[10px] divide-y divide-border">
                    {history.map((log, idx) => (
                      <div
                        key={idx}
                        className={`py-1 ${
                          log.startsWith('CRITICAL') ? 'text-status-fail font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Screen: External training page */}
            <div className="lg:col-span-6 bg-surface border border-border rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.28)] flex flex-col justify-between min-h-[420px]">
              <div className="bg-status-fail/10 px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-status-fail uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} /> External Training Page
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">sandbox.example/blog</span>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-status-fail/10 rounded-full flex items-center justify-center border border-status-fail/20 text-status-fail mb-2">
                    🙀
                  </div>
                  <h3 className="text-md font-semibold text-foreground">Win Free Cash Rewards & Cat Pictures!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Welcome to the cutest kitten blog! We are giving away $1,000 cash prizes to visitors today. Click the button below to see the cutest cat pictures and claim your reward instantly.
                  </p>
                </div>

                <div className="space-y-3">
                  {maliciousActionTriggered ? (
                    <div className="p-3 bg-status-fail/10 border border-status-fail/20 text-status-fail text-xs rounded-lg flex gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-status-fail border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                      <div>
                        <strong>Running simulation:</strong> Emulating a hidden state-changing request inside the local lab...
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={triggerCSRFExploit}
                      className="btn-cyber btn-danger w-full text-xs"
                    >
                      Click here to claim $1,000 Prize & Cats!
                    </button>
                  )}

                  <div className="p-3 bg-surface border border-border rounded-lg text-[10px] text-muted-foreground">
                    <strong>Defensive Insight:</strong> When JohnDoe clicks this button, a vulnerable app would rely only on ambient cookies. The fix is to require a per-request CSRF token and strict cookie policy.
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* CSRF simulation results */}
          <AnimatePresence>
            {csrfExploited && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-status-fail/10 border border-status-fail/25 p-5 rounded-xl flex items-start gap-4"
              >
                <AlertTriangle size={24} className="text-cyber-red shrink-0 mt-1" />
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-semibold text-status-fail">CSRF Simulation Triggered</strong>
                    <button onClick={resetLab} className="text-[10px] text-muted-foreground hover:text-foreground underline font-mono">Reset Scenario</button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This local simulation shows the CSRF risk: because JohnDoe was authenticated, the browser would automatically include cookies with a state-changing request. Real applications should require anti-CSRF tokens, strict SameSite cookies, and request-origin validation.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Vulnerable Form Tab */}
      {activeTab === 'vulnerable' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-cyber-red" />
            <h2 className="text-sm font-semibold text-status-fail">Vulnerable Transfer Endpoint (Direct GET/POST)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            A site is vulnerable to CSRF when endpoints that mutate data (like transferring money, changing passwords) can be requested strictly with browser cookies and do not require additional custom values.
          </p>
          <pre className="p-4 bg-background border border-border rounded-lg font-mono text-xs text-status-fail overflow-x-auto">
{`<!-- Unsafe pattern shown for local training only -->
<form id="trainingForm" action="/api/state-changing-action" method="POST">
  <input type="hidden" name="amount" value="[training amount]" />
  <input type="hidden" name="recipient" value="[training recipient]" />
</form>

<script>
  // Unsafe: state changes rely only on ambient cookies.
  document.getElementById('trainingForm').submit();
</script>`}
          </pre>
        </div>
      )}

      {/* Secure Fix (Tokens) Tab */}
      {activeTab === 'secure' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-status-pass" />
            <h2 className="text-sm font-semibold text-status-pass">CSRF Protection (Anti-CSRF Tokens)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Secure your endpoints by implementing **Anti-CSRF Tokens** (Synchronizer Tokens) or using strict cookies attributes like **SameSite=Strict** or **SameSite=Lax**.
          </p>
          <pre className="p-4 bg-background border border-border rounded-lg font-mono text-xs text-status-pass overflow-x-auto">
{`// Secured Database transfer endpoint with token validation
app.post('/api/transfer', (req, res) => {
  const { amount, recipient, csrfToken } = req.body;
  const sessionToken = req.session.csrfToken;

  // SECURE VALIDATION: Compare request token with session token
  if (!csrfToken || csrfToken !== sessionToken) {
    return res.status(403).send('CSRF validation failed! Request blocked.');
  }

  // Execute transfer safely
  db.executeTransfer(amount, recipient);
  res.json({ success: true });
});`}
          </pre>
        </div>
      )}
    </div>
  );
}
