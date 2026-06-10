import exifr from 'exifr';
import { fileTypeFromBuffer } from 'file-type';

export const LOCAL_ANALYSIS_MAX_FILE_BYTES = 15 * 1024 * 1024;

export interface SecretScanOptions {
  allowlist: string[];
  ignoreComments: boolean;
  ignoreTestFixtures: boolean;
  minEntropy: number;
}

export interface SecretFinding {
  type: string;
  fileName: string;
  location: string;
  line: number;
  column: number;
  confidence: 'high' | 'medium' | 'low';
  maskedPreview: string;
  ruleId: string;
}

export interface IocEntry {
  type: 'ip' | 'domain' | 'url' | 'email' | 'hash';
  value: string;
  normalized: string;
  defanged: boolean;
  valid: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface FileTriageReport {
  fileName: string;
  fileSize: number;
  declaredMime: string;
  extension: string;
  detectedMime: string;
  detectedExtension: string;
  magicBytes: string;
  mimeMismatch: boolean;
  extensionMismatch: boolean;
  hashes: { sha256: string; sha1: string; md5: string };
  entropy: number;
  printableStrings: string[];
  metadata: Record<string, unknown>;
  embeddedUrls: string[];
  iocs: IocEntry[];
}

interface SecretRule {
  id: string;
  type: string;
  regex: RegExp;
  entropyTarget?: 'full' | 'capture';
  minEntropy?: number;
  confidence: 'high' | 'medium' | 'low';
}

const SECRET_RULES: SecretRule[] = [
  { id: 'aws-access-key', type: 'AWS Access Key', regex: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g, entropyTarget: 'full', minEntropy: 2.8, confidence: 'high' },
  { id: 'aws-secret-key', type: 'AWS Secret Key', regex: /(?:aws_secret_access_key|aws_secret|secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi, entropyTarget: 'capture', minEntropy: 3.2, confidence: 'high' },
  { id: 'github-classic-token', type: 'GitHub Token', regex: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/g, entropyTarget: 'full', minEntropy: 3.2, confidence: 'high' },
  { id: 'github-fgpat', type: 'GitHub Fine-Grained PAT', regex: /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/g, entropyTarget: 'full', minEntropy: 3.2, confidence: 'high' },
  { id: 'slack-token', type: 'Slack Token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,200}\b/g, entropyTarget: 'full', minEntropy: 3, confidence: 'high' },
  { id: 'stripe-live-key', type: 'Stripe Live Key', regex: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/g, entropyTarget: 'full', minEntropy: 3, confidence: 'high' },
  { id: 'openai-key', type: 'OpenAI API Key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g, entropyTarget: 'full', minEntropy: 3.2, confidence: 'medium' },
  { id: 'private-key', type: 'Private Key Block', regex: /-----BEGIN(?: RSA| EC| DSA| OPENSSH)? PRIVATE KEY-----/g, confidence: 'high' },
  { id: 'jwt-bearer', type: 'JWT Bearer Token', regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9._-]{8,}\.[A-Za-z0-9._-]{8,}\b/g, entropyTarget: 'full', minEntropy: 3, confidence: 'medium' },
  { id: 'generic-api-key', type: 'Generic API Key', regex: /(?:api[_-]?key|api[_-]?secret|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?([A-Za-z0-9._\-\/+=]{12,})["']?/gi, entropyTarget: 'capture', minEntropy: 3.1, confidence: 'medium' },
  { id: 'generic-password', type: 'Generic Secret Assignment', regex: /(?:secret|password|passwd|pwd|token)\s*[:=]\s*["']?([^\s"'`]{8,})["']?/gi, entropyTarget: 'capture', minEntropy: 3.4, confidence: 'low' },
];

const COMMENT_PREFIXES = ['//', '#', ';', '*', '--', '<!--', '/*'];
const FIXTURE_PATH_PATTERN = /(^|[\\/])(?:__fixtures__|fixtures|tests?|specs?)([\\/]|$)|\.(?:test|spec|fixture)\./i;
const LOW_SIGNAL_VALUES = /^(?:example|sample|placeholder|changeme|dummy|test|testing|password|secret|token|abcdef|123456|ghp_example|sk_test|sk_live_example)$/i;

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) ?? '' : '';
}

export function shannonEntropy(value: string): number {
  if (!value.length) return 0;
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

export function maskSensitiveValue(value: string): string {
  if (value.length <= 6) return `${value[0] ?? '*'}***${value.at(-1) ?? '*'}`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function isCommentLine(line: string) {
  const trimmed = line.trim();
  return COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function isFixtureFile(fileName: string) {
  return FIXTURE_PATH_PATTERN.test(fileName);
}

function looksLikeFalsePositive(candidate: string) {
  return LOW_SIGNAL_VALUES.test(candidate) || /(.)\1{5,}/.test(candidate);
}

function withinAllowlist(text: string, allowlist: string[]) {
  const lowered = text.toLowerCase();
  return allowlist.some((term) => lowered.includes(term));
}

function pickSecretValue(match: RegExpExecArray, rule: SecretRule) {
  const candidate = rule.entropyTarget === 'capture'
    ? (match[1] ?? match[0]).trim()
    : match[0].trim();
  return candidate.replace(/^['"]|['"]$/g, '');
}

export function scanSecretsInText(
  fileName: string,
  text: string,
  options: SecretScanOptions
): SecretFinding[] {
  const findings = new Map<string, SecretFinding>();
  const lines = text.split(/\r?\n/);
  if (options.ignoreTestFixtures && isFixtureFile(fileName)) return [];

  lines.forEach((line, index) => {
    if (options.ignoreComments && isCommentLine(line)) return;
    if (withinAllowlist(line, options.allowlist)) return;

    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.regex.exec(line)) !== null) {
        const secretValue = pickSecretValue(match, rule);
        if (!secretValue || looksLikeFalsePositive(secretValue)) continue;
        const entropy = shannonEntropy(secretValue);
        if (rule.minEntropy !== undefined && entropy < Math.max(rule.minEntropy, options.minEntropy)) continue;
        const location = `${fileName}:${index + 1}:${match.index + 1}`;
        const dedupeKey = `${rule.id}:${secretValue}:${location}`;
        findings.set(dedupeKey, {
          type: rule.type,
          fileName,
          location,
          line: index + 1,
          column: match.index + 1,
          confidence: rule.confidence,
          maskedPreview: maskSensitiveValue(secretValue),
          ruleId: rule.id,
        });
      }
    }
  });

  return Array.from(findings.values()).sort((left, right) =>
    left.fileName.localeCompare(right.fileName) || left.line - right.line || left.column - right.column
  );
}

function normalizeDefanged(input: string) {
  return input
    .replace(/hxxps?:\/\//gi, (value) => (value.toLowerCase().startsWith('hxxps') ? 'https://' : 'http://'))
    .replace(/\[\.\]/g, '.')
    .replace(/\(\.\)/g, '.')
    .replace(/\[@\]/g, '@');
}

function validIpv4(value: string) {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function validDomain(value: string) {
  if (!/^[a-z0-9.-]+$/i.test(value) || !value.includes('.')) return false;
  return value.split('.').every((label) => label.length > 0 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-'));
}

function validEmail(value: string) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validHash(value: string) {
  return /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(value);
}

export function extractIocsFromText(text: string, source = 'local'): IocEntry[] {
  const candidates = new Map<string, IocEntry>();
  const patterns: Array<{ type: IocEntry['type']; regex: RegExp }> = [
    { type: 'url', regex: /\b(?:https?:\/\/|hxxps?:\/\/)[^\s<>"']+/gi },
    { type: 'email', regex: /\b[a-zA-Z0-9._%+-]+(?:@|\[@\])[a-zA-Z0-9.-]+(?:\.|\[\.\]|\(\.\))[A-Za-z]{2,}\b/g },
    { type: 'ip', regex: /\b(?:\d{1,3}(?:\[?\.\]?|\(\.\))){3}\d{1,3}\b/g },
    { type: 'domain', regex: /\b[a-z0-9-]+(?:\.|\[\.\]|\(\.\))[a-z0-9.-]+\b/gi },
    { type: 'hash', regex: /\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b/gi },
  ];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const original = match[0];
      const normalized = normalizeDefanged(original);
      const defanged = normalized !== original;
      let valid = false;
      let confidence: IocEntry['confidence'] = defanged ? 'medium' : 'high';

      switch (pattern.type) {
        case 'ip':
          valid = validIpv4(normalized);
          break;
        case 'domain':
          valid = validDomain(normalized.toLowerCase()) && !normalized.includes('@') && !normalized.startsWith('http');
          confidence = defanged ? 'medium' : 'low';
          break;
        case 'url':
          valid = validUrl(normalized);
          break;
        case 'email':
          valid = validEmail(normalized);
          break;
        case 'hash':
          valid = validHash(normalized);
          break;
      }

      const key = `${pattern.type}:${normalized.toLowerCase()}`;
      candidates.set(key, {
        type: pattern.type,
        value: original,
        normalized,
        defanged,
        valid,
        confidence: valid ? confidence : 'low',
        source,
      });
    }
  }

  return Array.from(candidates.values()).sort((left, right) =>
    left.type.localeCompare(right.type) || left.normalized.localeCompare(right.normalized)
  );
}

export async function readFileBytes(file: File, signal?: AbortSignal) {
  abortIfNeeded(signal);
  const buffer = await file.arrayBuffer();
  abortIfNeeded(signal);
  return new Uint8Array(buffer);
}

function bytesToHex(bytes: Uint8Array, limit = bytes.length) {
  return Array.from(bytes.slice(0, limit), (byte) => byte.toString(16).padStart(2, '0')).join(' ');
}

function detectPlainText(bytes: Uint8Array) {
  if (!bytes.length) return false;
  const sample = bytes.slice(0, Math.min(bytes.length, 2048));
  let printable = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)) printable += 1;
  }
  return printable / sample.length >= 0.9;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function digestHex(algorithm: AlgorithmIdentifier, bytes: Uint8Array) {
  if (algorithm === 'MD5') {
    return md5Hex(bytes);
  }
  const digest = await crypto.subtle.digest(
    algorithm,
    toArrayBuffer(bytes)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function md5Hex(bytes: Uint8Array): string {
  const K = [0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391];
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const add32 = (a: number, b: number) => (a + b) & 0xffffffff;
  const rotl = (v: number, n: number) => (v << n) | (v >>> (32 - n));
  const input = Array.from(bytes);
  const bitLength = input.length * 8;
  input.push(0x80);
  while (input.length % 64 !== 56) input.push(0);
  for (let index = 0; index < 8; index += 1) input.push((bitLength >>> (index * 8)) & 0xff);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  for (let offset = 0; offset < input.length; offset += 64) {
    const chunk: number[] = [];
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      chunk.push(input[position] | (input[position + 1] << 8) | (input[position + 2] << 16) | (input[position + 3] << 24));
    }
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let index = 0; index < 64; index += 1) {
      let F: number;
      let g: number;
      if (index < 16) { F = (B & C) | (~B & D); g = index; }
      else if (index < 32) { F = (D & B) | (~D & C); g = (5 * index + 1) % 16; }
      else if (index < 48) { F = B ^ C ^ D; g = (3 * index + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * index) % 16; }
      F = add32(add32(F, A), add32(K[index], chunk[g]));
      A = D;
      D = C;
      C = B;
      B = add32(B, rotl(F, S[index]));
    }
    a0 = add32(a0, A);
    b0 = add32(b0, B);
    c0 = add32(c0, C);
    d0 = add32(d0, D);
  }
  const toHex = (value: number) => Array.from({ length: 4 }, (_, index) => ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, '0')).join('');
  return `${toHex(a0)}${toHex(b0)}${toHex(c0)}${toHex(d0)}`;
}

export function extractPrintableStrings(bytes: Uint8Array, minLength = 4, maxResults = 250) {
  const strings: string[] = [];
  let current = '';
  for (const byte of bytes) {
    if (byte >= 32 && byte <= 126) current += String.fromCharCode(byte);
    else {
      if (current.length >= minLength) strings.push(current);
      current = '';
      if (strings.length >= maxResults) break;
    }
  }
  if (current.length >= minLength && strings.length < maxResults) strings.push(current);
  return strings;
}

function toMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).filter(([, value]) =>
      value !== undefined && value !== null && value !== ''
    )
  );
}

export async function triageFile(
  file: File,
  signal?: AbortSignal
): Promise<FileTriageReport> {
  abortIfNeeded(signal);
  const bytes = await readFileBytes(file, signal);
  const extension = getFileExtension(file.name);
  const detected = await fileTypeFromBuffer(bytes);
  abortIfNeeded(signal);

  const metadata = toMetadataRecord(await exifr.parse(toArrayBuffer(bytes)).catch(() => ({})));
  const strings = extractPrintableStrings(bytes);
  const embeddedUrls = Array.from(
    new Set(strings.flatMap((value) => extractIocsFromText(value, file.name).filter((ioc) => ioc.type === 'url').map((ioc) => ioc.normalized)))
  );
  const iocs = extractIocsFromText(`${strings.join('\n')}\n${JSON.stringify(metadata)}`, file.name);

  const declaredMime = file.type || 'unknown';
  const textFallback = !detected && detectPlainText(bytes)
    ? { mime: extension === 'json' ? 'application/json' : 'text/plain', ext: extension === 'json' ? 'json' : 'txt' }
    : null;
  const detectedMime = detected?.mime || textFallback?.mime || 'unknown';
  const detectedExtension = detected?.ext || textFallback?.ext || 'unknown';
  const hashes = {
    sha256: await digestHex('SHA-256', bytes),
    sha1: await digestHex('SHA-1', bytes),
    md5: await digestHex('MD5', bytes),
  };

  return {
    fileName: file.name,
    fileSize: file.size,
    declaredMime,
    extension,
    detectedMime,
    detectedExtension,
    magicBytes: bytesToHex(bytes, 16),
    mimeMismatch: declaredMime !== 'unknown' && detectedMime !== declaredMime,
    extensionMismatch: Boolean(extension) && detectedExtension !== extension,
    hashes,
    entropy: Number(shannonEntropy(Array.from(bytes.slice(0, Math.min(bytes.length, 4096)), (byte) => String.fromCharCode(byte)).join('')).toFixed(2)),
    printableStrings: strings,
    metadata,
    embeddedUrls,
    iocs,
  };
}
