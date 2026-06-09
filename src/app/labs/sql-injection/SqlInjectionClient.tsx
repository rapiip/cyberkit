'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, AlertTriangle, Play, Shield, Code, ChevronRight, CheckCircle, Database } from 'lucide-react';
import Link from 'next/link';

const challenges = [
  { 
    level: 1, 
    title: "Basic Authentication Bypass", 
    hint: "Close the quotes and inject an OR clause that evaluates to TRUE.", 
    payload: "' OR '1'='1" 
  },
  { 
    level: 2, 
    title: "Comment-based Bypass", 
    hint: "SQL comments (--) ignore the rest of the query. Bypass password check.", 
    payload: "admin' --" 
  },
  { 
    level: 3, 
    title: "UNION-based Extraction", 
    hint: 'Observe how appended result sets can alter a vulnerable query shape.', 
    payload: "' UNION SELECT username, password FROM users --" 
  },
];

export default function SQLiLab() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    query: string;
    extractedData?: { col1: string; col2: string }[];
  } | null>(null);
  const [activeChallenge, setActiveChallenge] = useState(0);
  const [showSecure, setShowSecure] = useState(false);

  const simulateLogin = () => {
    const userVal = username.trim();
    const passVal = password.trim();
    const query = `SELECT * FROM accounts WHERE user = '${userVal}' AND pass = '${passVal}';`;

    if (activeChallenge === 0) {
      // Challenge 1: OR Bypass
      const hasOr = /'\s*OR\s*'\d+'\s*=\s*'\d+'/i.test(userVal) || /'\s*OR\s*\d+\s*=\s*\d+/i.test(userVal);
      if (hasOr) {
        setResult({
          success: true,
          message: '🎉 Level 1 Solved! SQL Authentication Bypass Successful! The OR condition made the WHERE clause evaluate to TRUE for every row.',
          query,
        });
      } else {
        setResult({
          success: false,
          message: 'Login failed. In the vulnerable pattern, a tautology can make the WHERE clause evaluate differently.',
          query,
        });
      }
    } else if (activeChallenge === 1) {
      // Challenge 2: Comment Bypass
      const hasComment = userVal.toLowerCase().startsWith("admin'") && (userVal.includes('--') || userVal.includes('/*'));
      if (hasComment) {
        setResult({
          success: true,
          message: '🎉 Level 2 Solved! Comment-based Bypass Successful! The -- comment truncated the remaining query, ignoring the password check.',
          query,
        });
      } else {
        setResult({
          success: false,
          message: 'Login failed. In the vulnerable pattern, comment syntax can remove the remaining password condition.',
          query,
        });
      }
    } else if (activeChallenge === 2) {
      // Challenge 3: UNION Extraction
      const hasUnion = /'\s*UNION\s+SELECT\s+/i.test(userVal);
      if (hasUnion) {
        // Simulate extracting database table details
        const extractedData = [
          { col1: 'admin', col2: '$2a$12$D7t9eR5yW4oP1qS2b3v4eOh7sJ8q9wK0...' },
          { col1: 'john_doe', col2: '$2a$12$J9x1eR5yW4oP1qS2b3v4eOh3sX1q2wZ9...' },
          { col1: 'sec_officer', col2: '$2a$12$K8y9eR5yW4oP1qS2b3v4eOh4sY8q9wA2...' },
        ];
        setResult({
          success: true,
          message: 'Level 3 solved. The vulnerable query accepted an appended result-set shape and exposed simulated records.',
          query,
          extractedData,
        });
      } else {
        setResult({
          success: false,
          message: 'Query error or no data. Review how appended result sets can change a vulnerable database response.',
          query,
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
        <span className="text-zinc-300">SQL Injection Lab</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> 
          SQL Injection Lab
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Study unsafe SQL query construction inside a simulated database login portal.
        </p>
      </motion.div>

      <div className="bg-zinc-950 p-4 flex items-start gap-3 rounded-lg border border-amber-500/20 text-xs">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <span className="text-zinc-400">
          <strong className="text-amber-500">Educational Sandbox.</strong> No real databases are impacted. Verify your SQL injection skills below.
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
                  setUsername('');
                  setPassword('');
                }}
                className={`w-full text-left bg-zinc-900/40 border rounded-xl p-4 transition-all ${
                  activeChallenge === i 
                    ? 'border-cyan-400/40 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    activeChallenge === i ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-zinc-800 text-zinc-400'
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
              <Code size={16} className="text-cyan-400" /> Simulated Portal Login
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Username</label>
                <input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter username..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 font-mono focus:outline-none focus:border-cyan-400 transition-all" 
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Password</label>
                <input 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Enter password..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 font-mono focus:outline-none focus:border-cyan-400 transition-all" 
                  disabled={activeChallenge === 1 && username.includes("'")} 
                />
              </div>
              
              <button 
                onClick={simulateLogin} 
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg w-full py-2.5 text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Play size={14} fill="currentColor" /> Execute Database Query
              </button>
            </div>

            {/* Query & Result Visuals */}
            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Generated Backend SQL Statement</label>
                    <pre className="text-xs font-mono p-4 rounded-lg bg-black border border-zinc-900 overflow-x-auto text-amber-400">
                      {result.query}
                    </pre>
                  </div>

                  <div className={`p-4 rounded-lg flex gap-3 border ${
                    result.success 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                  }`}>
                    {result.success ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
                    <div className="text-xs space-y-1">
                      <strong className="text-sm font-semibold">{result.success ? 'Success' : 'Failure'}</strong>
                      <p className="text-zinc-300">{result.message}</p>
                    </div>
                  </div>

                  {/* Extracted database records display for union levels */}
                  {result.extractedData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-3">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Database size={14} className="text-emerald-400" /> Extracted Database Records (Sensitive)
                      </span>
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
                        <div className="bg-zinc-900 px-4 py-2 flex justify-between border-b border-zinc-800 font-bold text-zinc-300">
                          <span>Extracted Column 1 (User)</span>
                          <span>Extracted Column 2 (Password Salt/Hash)</span>
                        </div>
                        {result.extractedData.map((data, index) => (
                          <div key={index} className="px-4 py-2 flex justify-between border-b border-zinc-900/50 hover:bg-zinc-900/10 text-emerald-400">
                            <span>{data.col1}</span>
                            <span className="text-zinc-500">{data.col2}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
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
{`// ❌ Vulnerable (direct string injection)
const query = \`SELECT * FROM accounts WHERE user = '\${username}' AND pass = '\${password}';\`;

// ✅ Secure (Prepared statement parameterized parameters)
const query = 'SELECT * FROM accounts WHERE user = ? AND pass = ?;';
db.execute(query, [username, password]);`}
                  </pre>
                  <div className="text-xs text-zinc-400 space-y-2 pl-2 border-l border-emerald-500/30">
                    <p>• <strong>Parameterized Queries</strong> ensure that database engines evaluate variables purely as data parameters, never as SQL instructions, preventing quotes from closing statements.</p>
                    <p>• <strong>Strong input checks</strong> and ORMs (like Prisma or Sequelize) prevent raw queries entirely.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
