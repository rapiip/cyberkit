'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Play, Check, X, AlertTriangle, Globe, FileDown } from 'lucide-react';
import { useReportsStore } from '@/lib/store';
import { exportAuditToPDF } from '@/lib/utils/export';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'API connection failed. Please try again.';
}

interface ApiErrorPayload {
  errorCode?: string;
  message?: string;
  details?: string;
  retryable?: boolean;
  error?: string;
}

interface AuditCheck {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'warn' | 'fail' | 'error';
  message: string;
  details?: string;
}

interface AuditFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  remediation: string;
  source: string;
  references: string[];
}

interface AuditComparison {
  scoreDelta: number;
  introducedCount: number;
  resolvedCount: number;
  regression: boolean;
}

interface AuditScoring {
  model: string;
  maxScore: number;
  documentedWeights: Record<string, number>;
}

interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

function scoreTone(score: number) {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'watch';
  return 'risk';
}

export default function AuditPage() {
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<AuditCheck[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [auditReport, setAuditReport] = useState('');
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const [scoring, setScoring] = useState<AuditScoring | null>(null);
  const [redirectChain, setRedirectChain] = useState<RedirectHop[]>([]);
  const [baseline, setBaseline] = useState<{ score: number; findings: Array<{ id: string }> } | null>(null);
  const { addReport } = useReportsStore();


  const auditCheckList = [
    'URL Validation',
    'HTTPS Check',
    'SSL/TLS Certificate',
    'Content Security Policy (CSP)',
    'HSTS Check',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer Policy',
    'CORS Policy Check',
    'Cookie Security Check',
    'robots.txt presence',
  ];


  const runAudit = async () => {
    if (!url.trim()) return;
    setErrorMsg('');
    setErrorCode('');
    setErrorRetryable(false);
    setScore(null);
    setGrade('');
    setChecks([]);
    setFindings([]);
    setComparison(null);
    setScoring(null);
    setRedirectChain([]);

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setRunning(true);

    // Initialize UI checks to pending
    const initialChecks: AuditCheck[] = auditCheckList.map((name) => ({
      name,
      status: 'pending',
      message: 'Queueing analysis...',
    }));
    setChecks(initialChecks);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

    try {
      // 1. Fire real parallel audits on Next.js backend
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          baseline: baseline ?? undefined,
        }),
        signal: controller.signal,
      });

      const resData = (await response.json()) as ApiErrorPayload & {
        success?: boolean;
        checks?: AuditCheck[];
        score?: number;
        grade?: string;
        url?: string;
        hostname?: string;
        findings?: AuditFinding[];
        comparison?: AuditComparison | null;
        scoring?: AuditScoring;
        redirectChain?: RedirectHop[];
      };

      if (!response.ok || !resData.success) {
        setErrorCode(resData.errorCode || `HTTP_${response.status}`);
        setErrorRetryable(resData.retryable ?? (response.status >= 500 || response.status === 429));
        throw new Error(resData.message || resData.error || 'Security audit request failed');
      }

      const realChecks: AuditCheck[] = resData.checks || [];

      const resolvedChecks = auditCheckList.map((name) => {
        const matchedReal = realChecks.find((rc) => rc.name === name);
        return matchedReal ?? {
          name,
          status: 'warn' as const,
          message: 'Metric absent',
          details: 'Could not obtain security metric detail.',
        };
      });
      setChecks(resolvedChecks);

      setScore(resData.score ?? 0);
      setGrade(resData.grade || 'F');
      setFindings(resData.findings || []);
      setComparison(resData.comparison ?? null);
      setScoring(resData.scoring ?? null);
      setRedirectChain(resData.redirectChain || []);
      setBaseline({
        score: resData.score ?? 0,
        findings: (resData.findings || []).map((finding) => ({ id: finding.id })),
      });

      // 3. Compile high-quality, professional Markdown Report
      const passedCount = realChecks.filter((c) => c.status === 'pass').length;
      const warnCount = realChecks.filter((c) => c.status === 'warn').length;
      const failedCount = realChecks.filter((c) => c.status === 'fail' || c.status === 'error').length;

      const reportContent = `# Website Security Audit Report

**Audit Target:** ${resData.url || targetUrl}
**Scan Timestamp:** ${new Date().toUTCString()}
**Overall Security Score:** ${resData.score ?? 0}/100 (Grade ${resData.grade || 'F'})

---

## Executive Summary
This professional vulnerability audit was generated by CyberKit Security. The scan evaluated active server protocols, TLS properties, and HTTP response headers to gauge exposure to XSS, Clickjacking, and Session Hijacking.

* **Passed Verifications**: ${passedCount}
* **Warnings / Recommendations**: ${warnCount}
* **Vulnerabilities / Failures**: ${failedCount}
* **Scoring Model**: ${resData.scoring?.model || 'weighted-subtractive-v1'}
${resData.comparison ? `* **Score Delta vs Baseline**: ${resData.comparison.scoreDelta >= 0 ? '+' : ''}${resData.comparison.scoreDelta}\n* **Introduced Findings**: ${resData.comparison.introducedCount}\n* **Resolved Findings**: ${resData.comparison.resolvedCount}\n* **Regression Detected**: ${resData.comparison.regression ? 'Yes' : 'No'}` : ''}

---

## Detailed Security Findings

${realChecks
  .map(
    (c) => `### [${c.status.toUpperCase()}] ${c.name}
* **Status**: ${c.status === 'pass' ? 'SAFE' : c.status === 'fail' ? 'FAIL' : 'WARNING'}
* **Details**: ${c.message}
${c.details ? `* **Technical context**: *${c.details}*` : ''}
`
  )
  .join('\n')}

## Weighted Findings

${(resData.findings || [])
  .map(
    (finding) => `### [${finding.severity.toUpperCase()} / ${finding.confidence.toUpperCase()}] ${finding.title}
* **Evidence**: ${finding.evidence}
* **Remediation**: ${finding.remediation}
* **Source**: ${finding.source}
* **References**: ${(finding.references || []).join(', ') || 'N/A'}
`
  )
  .join('\n') || 'No weighted findings were generated.'}

---
*Disclaimer: This report was compiled by automated checks. Implement parameters carefully in staging before pushing changes to production.*`;

      // Save report to Zustand Reports Store (persisted to localStorage)
      addReport({
        title: `Audit: ${resData.hostname || targetUrl}`,
        target: targetUrl,
        content: reportContent,
        format: 'markdown',
        toolsUsed: auditCheckList,
      });

      setAuditReport(reportContent);


    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorCode('CLIENT_TIMEOUT');
        setErrorRetryable(true);
        setErrorMsg('Audit request timed out after 12 seconds.');
      } else {
        setErrorMsg(getErrorMessage(err));
      }
      setChecks((current) =>
        current.length
          ? current.map((check) =>
              check.status === 'pending' || check.status === 'running'
                ? {
                    ...check,
                    status: 'error',
                    message: 'Audit step did not complete.',
                    details: 'Retry the audit or verify that the target is reachable.',
                  }
                : check
            )
          : []
      );
    } finally {
      window.clearTimeout(timeoutId);
      setRunning(false);
    }
  };

  const statusIcon = (status: AuditCheck['status']) => {
    switch (status) {
      case 'pass':
        return <Check size={16} className="text-status-pass" />;
      case 'fail':
        return <X size={16} className="text-status-fail" />;
      case 'warn':
        return <AlertTriangle size={16} className="text-status-warn" />;
      case 'running':
        return (
          <div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <div className="w-3.5 h-3.5 rounded-full bg-muted" />;
    }
  };

  const passedCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failedCount = checks.filter((c) => c.status === 'fail' || c.status === 'error').length;
  const topFindings = findings.slice(0, 3);
  const currentTone = score !== null ? scoreTone(score) : null;

  return (
    <div className="page-shell-tight max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
          <Shield size={32} className="text-cyber-cyan" /> 
          Website Security Audit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run a focused website audit for transport security, response headers, policy coverage, and obvious exposure.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          The scan performs outbound internet requests against the target, follows only bounded public redirects, and compares each new run against the last successful baseline in this browser session.
        </p>
      </motion.div>

      {/* URL Input Form */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. google.com or https://github.com"
              className="input-cyber pl-12 pr-4 py-3 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && runAudit()}
              disabled={running}
            />
          </div>
          <button
            onClick={runAudit}
            disabled={running || !url.trim()}
            className="btn-cyber btn-primary px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Start Security Audit
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-status-fail/10 border border-status-fail/20 text-status-fail text-xs rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="font-semibold">{errorMsg}</div>
              {errorCode && <div className="mt-1 text-xs font-mono text-status-fail/80">{errorCode}</div>}
            </div>
            {errorRetryable && (
              <button
                onClick={runAudit}
                disabled={running}
                className="btn-cyber btn-danger btn-sm self-start sm:self-center"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audit Score Output */}
      {score !== null && (
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 space-y-6"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`badge ${
                  currentTone === 'strong'
                    ? 'badge-green'
                    : currentTone === 'watch'
                      ? 'badge-amber'
                      : 'badge-red'
                }`}>
                  {currentTone === 'strong' ? 'Strong baseline' : currentTone === 'watch' ? 'Needs review' : 'Immediate attention'}
                </span>
                <span className="text-sm text-muted-foreground">Grade {grade}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Security summary</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Start with the failures and warnings first. The checklist and raw evidence below provide the technical detail for follow-up work.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-lg border border-status-pass/20 bg-status-pass/10 px-3 py-2 text-status-pass">{passedCount} passed</span>
                <span className="rounded-lg border border-status-warn/20 bg-status-warn/10 px-3 py-2 text-status-warn">{warnCount} warnings</span>
                <span className="rounded-lg border border-status-fail/20 bg-status-fail/10 px-3 py-2 text-status-fail">{failedCount} failed</span>
              </div>
            </div>

            <div className="flex items-center gap-6 self-start rounded-2xl border border-border bg-black/10 px-5 py-4">
              <div className="relative flex items-center justify-center">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle cx="48" cy="48" r="40" className="stroke-muted fill-none" strokeWidth="6" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    className={`fill-none transition-all duration-700 ${
                      grade === 'A' || grade === 'B'
                        ? 'stroke-status-pass'
                        : grade === 'C'
                          ? 'stroke-status-warn'
                          : 'stroke-status-fail'
                    }`}
                    strokeWidth="6"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * score) / 100}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-foreground">{score}</span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-extrabold font-mono ${
                    grade === 'A'
                      ? 'border-status-pass bg-status-pass/10 text-status-pass'
                      : grade === 'B'
                        ? 'border-status-pass bg-status-pass/10 text-status-pass'
                        : grade === 'C'
                          ? 'border-status-warn bg-status-warn/10 text-status-warn'
                          : 'border-status-fail bg-status-fail/10 text-status-fail'
                  }`}
                >
                  {grade}
                </div>
                <button
                  onClick={() => {
                    let targetUrl = url.trim();
                    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                      targetUrl = 'https://' + targetUrl;
                    }
                    try {
                      const host = new URL(targetUrl).hostname;
                      exportAuditToPDF(`Audit: ${host}`, targetUrl, auditReport);
                    } catch {
                      exportAuditToPDF(`Audit: ${targetUrl}`, targetUrl, auditReport);
                    }
                  }}
                  className="btn-cyber btn-secondary btn-sm w-full"
                >
                  <FileDown size={14} /> Export PDF
                </button>
              </div>
            </div>
          </div>

          {topFindings.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-3">
              {topFindings.map((finding) => (
                <div key={finding.id} className="rounded-xl border border-border bg-black/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                    <span className="badge badge-red">{finding.severity}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.evidence}</p>
                  <p className="mt-2 text-sm text-foreground">Next step: {finding.remediation}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {comparison && (
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Baseline Comparison</h2>
            <span
              className={`text-xs font-medium uppercase px-2 py-1 rounded border ${
                comparison.regression
                  ? 'bg-status-fail/5 border-status-fail/20 text-status-fail'
                  : 'bg-status-pass/5 border-status-pass/20 text-status-pass'
              }`}
            >
              {comparison.regression ? 'Regression' : 'No Regression'}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-sm text-muted-foreground">Score Delta</div>
              <div className={comparison.scoreDelta < 0 ? 'text-status-fail font-semibold' : 'text-status-pass font-semibold'}>
                {comparison.scoreDelta >= 0 ? '+' : ''}
                {comparison.scoreDelta}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-sm text-muted-foreground">Introduced</div>
              <div className="font-semibold text-foreground">{comparison.introducedCount}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-sm text-muted-foreground">Resolved</div>
              <div className="font-semibold text-foreground">{comparison.resolvedCount}</div>
            </div>
          </div>
        </div>
      )}

      {scoring && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Weighted Scoring</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Model `{scoring.model}` with a maximum score of {scoring.maxScore}. Missing or unsafe controls deduct the documented weight below.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(scoring.documentedWeights).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-mono text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic Check Results List */}
      {checks.length > 0 && (
        <div className="glass-card overflow-hidden divide-y divide-border">
          <div className="bg-surface px-6 py-4 flex items-center justify-between border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnostic Checklist</span>
            <span className="text-sm text-muted-foreground">
              {checks.filter((c) => c.status !== 'pending' && c.status !== 'running').length} / {checks.length} complete
            </span>
          </div>

          {checks.map((check, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-4 px-6 py-4 hover:bg-surface-hover/30 transition-colors ${
                check.status === 'pending' || check.status === 'running' ? 'animate-pulse' : ''
              }`}
            >
              <div className="mt-1 flex-shrink-0">{statusIcon(check.status)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{check.name}</span>
                  <span
                    className={`text-xs font-medium uppercase px-2 py-0.5 rounded border ${
                      check.status === 'pass'
                        ? 'bg-status-pass/5 border-status-pass/20 text-status-pass'
                        : check.status === 'fail'
                        ? 'bg-status-fail/5 border-status-fail/20 text-status-fail'
                        : check.status === 'warn'
                        ? 'bg-status-warn/5 border-status-warn/20 text-status-warn'
                        : check.status === 'running'
                        ? 'bg-cyber-cyan/5 border-cyber-cyan/20 text-cyber-cyan'
                        : 'bg-muted/30 border-border text-muted-foreground'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{check.message}</p>
                {check.details && (
                  <p className="text-xs font-mono text-muted-foreground mt-1 pl-2 border-l border-border">
                    {check.details}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <div className="glass-card overflow-hidden divide-y divide-border">
          <div className="bg-surface px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Findings & Evidence</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Findings include severity, confidence, evidence, remediation, and reference material from the audit engine.
            </p>
          </div>
          {findings.map((finding) => (
            <div key={finding.id} className="px-6 py-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                <span className="text-xs font-medium uppercase px-2 py-0.5 rounded border bg-status-fail/5 border-status-fail/20 text-status-fail">
                  {finding.severity}
                </span>
                <span className="text-xs font-medium uppercase px-2 py-0.5 rounded border bg-cyber-cyan/5 border-cyber-cyan/20 text-cyber-cyan">
                  {finding.confidence}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{finding.evidence}</p>
              <p className="text-sm text-foreground">Remediation: {finding.remediation}</p>
              <p className="text-xs font-mono text-muted-foreground">Source: {finding.source}</p>
              <p className="text-xs text-muted-foreground break-all">
                References: {finding.references.join(', ') || 'N/A'}
              </p>
            </div>
          ))}
        </div>
      )}

      {(redirectChain.length > 0 || score !== null) && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Request Path</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Only public HTTP(S) hops are followed. Redirect chains are capped and evaluated before the next request is sent.
            </p>
          </div>
          {redirectChain.length > 0 ? (
            <div className="space-y-2">
              {redirectChain.map((hop, index) => (
                <div key={`${hop.url}-${index}`} className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <div className="font-mono text-foreground">{hop.status} {hop.url}</div>
                  {hop.location && <div className="text-muted-foreground mt-1">Location: {hop.location}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No redirect hops were recorded for this scan.</p>
          )}
        </div>
      )}
    </div>
  );
}
