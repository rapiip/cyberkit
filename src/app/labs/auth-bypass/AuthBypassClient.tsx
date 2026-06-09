'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ArrowLeft, Shield, AlertCircle, CheckCircle, Code } from 'lucide-react';
import Link from 'next/link';

export default function AuthBypassLab() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'interactive' | 'vulnerable' | 'secure'>('interactive');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userVal = username.trim().toLowerCase();

    // SQL Injection bypass patterns
    const hasCommentBypass = userVal.includes("'--") || userVal.includes("' --");
    const hasOrBypass = userVal.includes("' or '") || userVal.includes("' or 1=1") || userVal.includes("' or '1'='1");

    if (hasCommentBypass || hasOrBypass) {
      setLoginStatus('success');
    } else if (username === 'admin' && password === 'admin123') {
      setLoginStatus('success');
    } else {
      setLoginStatus('failed');
    }
  };

  const isBypassed = username.trim().toLowerCase().includes("'--") || username.trim().toLowerCase().includes("' --") || username.trim().toLowerCase().includes("' or '1'='1");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/labs" className="btn-cyber btn-ghost btn-sm p-1.5 rounded-lg">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical size={24} className="text-cyber-cyan" /> Authentication Bypass Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Learn how SQL Injection allows bypassing standard username/password authentication mechanisms.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab('interactive')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'interactive' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Interactive Simulation
        </button>
        <button
          onClick={() => setActiveTab('vulnerable')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'vulnerable' ? 'border-rose-500 text-rose-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Vulnerable Source Code
        </button>
        <button
          onClick={() => setActiveTab('secure')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'secure' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Secure Code Fix
        </button>
      </div>

      {/* Interactive Simulation Tab */}
      {activeTab === 'interactive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Login Form */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h2 className="text-md font-semibold text-zinc-200 flex items-center gap-2">
              <Shield size={18} className="text-cyan-400" /> Admin Portal
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., training username"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition-all font-mono"
                  disabled={username.includes("'--")}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg py-2.5 text-sm transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Log In
              </button>
            </form>

            {/* Hint alert */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                💡 Target Challenge Payload
              </span>
              <p className="text-[11px] text-zinc-400">
                This local simulator shows why string-concatenated queries are unsafe. Observe how the generated SQL changes, then review the prepared-statement fix below.
              </p>
            </div>
          </div>

          {/* Right panel: SQL backend query visualizer */}
          <div className="lg:col-span-7 bg-zinc-950/80 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Backend Database Query Analyzer</h2>
              
              <div className="p-4 bg-black border border-zinc-900 rounded-lg font-mono text-sm leading-relaxed overflow-x-auto text-zinc-400">
                <span className="text-purple-400">SELECT</span> * <span className="text-purple-400">FROM</span> users <span className="text-purple-400">WHERE</span> username = 
                <span className="text-emerald-400"> &apos;{username || 'INPUT_USERNAME'}&apos;</span> 
                {isBypassed ? (
                  <span className="text-zinc-600 line-through"> AND password = &apos;{password || 'INPUT_PASSWORD'}&apos;</span>
                ) : (
                  <> <span className="text-purple-400">AND</span> password = <span className="text-emerald-400">&apos;{password || 'INPUT_PASSWORD'}&apos;</span></>
                )}
                <span className="text-purple-400">;</span>
              </div>

              {isBypassed && (
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-xs rounded-lg flex gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Injection Triggered:</strong> The single quote closed the string parameter early, and the double dash (<code className="font-bold">--</code>) commented out the remaining password matching logic!
                  </div>
                </div>
              )}
            </div>

            {/* Login result status */}
            <div>
              {loginStatus === 'success' ? (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-start gap-3">
                  <CheckCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm font-semibold">LOGIN SUCCESSFUL!</strong>
                    <p className="text-xs text-zinc-400 mt-1">
                      You bypassed the password check and logged in as the Administrator! In a real application, the SQL engine processed this query and returned the first matched record without evaluating the password segment.
                    </p>
                  </div>
                </motion.div>
              ) : loginStatus === 'failed' ? (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm font-semibold">LOGIN FAILED!</strong>
                    <p className="text-xs text-zinc-400 mt-1">
                      Invalid credentials. The simulated query did not find a match. Review how unsafe input handling can change query control flow.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="p-4 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs py-8">
                  Fill in the login form and hit &quot;Log In&quot; to test query response.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vulnerable Source Code Tab */}
      {activeTab === 'vulnerable' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-rose-500" />
            <h2 className="text-sm font-semibold text-rose-400">Vulnerable Backend Code (SQL Concatenation)</h2>
          </div>
          <p className="text-xs text-zinc-400">
            This vulnerability occurs because user input is directly concatenated into the SQL statement as executable code without sanitization.
          </p>
          <pre className="p-4 bg-black border border-zinc-900 rounded-lg font-mono text-xs text-rose-400 overflow-x-auto">
{`// Vulnerable Node.js / PHP database handler
const express = require('express');
const app = express();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // CRITICAL VULNERABILITY: Direct string interpolation
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}';\`;

  db.query(query, (err, results) => {
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ success: false });
    }
  });
});`}
          </pre>
        </div>
      )}

      {/* Secure Fix Code Tab */}
      {activeTab === 'secure' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-emerald-400">Secure Backend Code (Parameterized Queries)</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Fix this vulnerability by using **Parameterized Queries** (Prepared Statements). The input parameters are handled strictly as literal values, never as executable SQL instructions.
          </p>
          <pre className="p-4 bg-black border border-zinc-900 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto">
{`// Secured Node.js database handler
const express = require('express');
const app = express();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // SECURE IMPLEMENTATION: Prepared statements using placeholders (?)
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?;';

  // The database engine parses the query FIRST, then binds the arguments safely
  db.query(query, [username, password], (err, results) => {
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ success: false });
    }
  });
});`}
          </pre>
        </div>
      )}
    </div>
  );
}
