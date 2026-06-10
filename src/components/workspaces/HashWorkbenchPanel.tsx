'use client';

import { useState } from 'react';
import { CheckCheck, FileDigit, Fingerprint, ShieldAlert } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';
import { compareHashValues, hashFileWithProgress, hashText, type HashAlgorithm } from '@/lib/security/hash';

const hashAlgorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

export default function HashWorkbenchPanel() {
  const [textInput, setTextInput] = useState('');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [expectedHash, setExpectedHash] = useState('');
  const [textResult, setTextResult] = useState<{ hash: string; expected?: boolean } | null>(null);
  const [compareLeft, setCompareLeft] = useState('');
  const [compareRight, setCompareRight] = useState('');
  const [compareResult, setCompareResult] = useState<{ match: boolean; actual: string; expected: string } | null>(null);
  const [fileResult, setFileResult] = useState<Awaited<ReturnType<typeof hashFileWithProgress>> | null>(null);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');

  const runTextHash = async () => {
    setError('');
    try {
      const hash = await hashText(algorithm, textInput);
      const verification = expectedHash.trim()
        ? compareHashValues(hash, expectedHash)
        : null;
      setTextResult({ hash, expected: verification?.match });
    } catch (hashError) {
      setTextResult(null);
      setError(hashError instanceof Error ? hashError.message : 'Text hash failed.');
    }
  };

  const runCompare = () => {
    setError('');
    try {
      setCompareResult(compareHashValues(compareLeft, compareRight));
    } catch (compareError) {
      setCompareResult(null);
      setError(compareError instanceof Error ? compareError.message : 'Hash comparison failed.');
    }
  };

  const runFileHash = async (file: File | null) => {
    if (!file) return;
    setError('');
    setProgressLabel('');
    try {
      const result = await hashFileWithProgress(file, (progress) => setProgressLabel(progress.label));
      setFileResult(result);
    } catch (fileError) {
      setFileResult(null);
      setError(fileError instanceof Error ? fileError.message : 'File hashing failed.');
    } finally {
      setProgressLabel('');
    }
  };

  return (
    <section className="glass-card p-5" aria-labelledby="hash-workbench-heading">
      <div className="mb-4">
        <h2 id="hash-workbench-heading" className="text-lg font-semibold">Hash &amp; Crypto Workbench</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hash text or files, compare checksums, and verify expected values. MD5 and SHA-1 are marked legacy and should not be treated as strong security primitives.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-status-fail/20 bg-status-fail/10 p-3 text-sm text-status-fail">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Fingerprint size={16} /> Text Hash + Expected Verification
          </div>
          <textarea
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            rows={5}
            className="input-cyber font-mono text-sm"
            placeholder="Enter text to hash..."
          />
          <div className="mt-3 grid grid-cols-1 gap-3">
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}
              className="input-cyber text-sm"
            >
              {hashAlgorithms.map((candidate) => (
                <option key={candidate} value={candidate}>{candidate}</option>
              ))}
            </select>
            <input
              value={expectedHash}
              onChange={(event) => setExpectedHash(event.target.value)}
              className="input-cyber text-sm"
              placeholder="Optional expected hash"
            />
            <button type="button" onClick={runTextHash} className="btn-cyber btn-primary btn-sm">
              Run text hash
            </button>
          </div>
          {textResult ? (
            <div className="mt-3 space-y-2 text-xs">
              <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono">{textResult.hash}</pre>
              {expectedHash.trim() && (
                <p className={textResult.expected ? 'text-status-pass' : 'text-status-fail'}>
                  {textResult.expected ? 'Expected hash matched.' : 'Expected hash did not match.'}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCheck size={16} /> Checksum Comparison
          </div>
          <input
            value={compareLeft}
            onChange={(event) => setCompareLeft(event.target.value)}
            className="input-cyber text-sm"
            placeholder="First hash value"
          />
          <input
            value={compareRight}
            onChange={(event) => setCompareRight(event.target.value)}
            className="input-cyber mt-3 text-sm"
            placeholder="Second hash value"
          />
          <button type="button" onClick={runCompare} className="btn-cyber btn-secondary btn-sm mt-3">
            Compare hashes
          </button>
          {compareResult ? (
            <div className="mt-3 text-sm">
              <p className={compareResult.match ? 'text-status-pass' : 'text-status-fail'}>
                {compareResult.match ? 'Hashes match.' : 'Hashes differ.'}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {compareResult.actual}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FileDigit size={16} /> File Hashing
          </div>
          <input
            type="file"
            className="input-cyber text-sm"
            onChange={(event) => void runFileHash(event.target.files?.[0] || null)}
          />
          {progressLabel && <p className="mt-3 text-xs text-muted-foreground">{progressLabel}</p>}
          {fileResult ? (
            <div className="mt-3 space-y-2 text-xs">
              <p className="text-muted-foreground">Chunked read path used: {fileResult.chunkCount} chunk(s)</p>
              <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono">
{`SHA-256: ${fileResult.sha256}
SHA-1 (legacy): ${fileResult.sha1}
SHA-512: ${fileResult.sha512}
MD5 (legacy): ${fileResult.md5}`}
              </pre>
            </div>
          ) : (
            <StatePanel
              icon={<ShieldAlert size={18} />}
              title="No file hash yet"
              description="Choose a file to compute hashes with progress-friendly chunked reads."
            />
          )}
        </div>
      </div>
    </section>
  );
}
