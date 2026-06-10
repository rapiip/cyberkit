import type { ToolDefinition } from '../types';
import { assertFile, asString, errorResult, MAX_FILE_BYTES } from '../validation';
import {
  checkPwnedPassword,
  estimatePasswordStrength,
  generatePassphrase,
  generatePassword,
} from '@/lib/security/password';

const hashViaWebCrypto = async (algorithm: string, input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const md5GeneratorTool: ToolDefinition = {
  id: 'md5-generator',
  slug: 'md5-generator',
  name: 'MD5 Generator',
  category: 'hashing',
  description: 'Generate MD5 hash from text input. MD5 produces a 128-bit hash value. Note: MD5 is considered cryptographically broken and should not be used for security purposes.',
  shortDescription: 'Generate MD5 hash from text',
  tags: ['md5', 'hash', 'checksum', 'digest'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input Text', type: 'textarea', placeholder: 'Enter text to hash...', required: true },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input text');
    // Simple MD5 implementation (for client-side without crypto-js)
    const md5 = (s: string): string => {
      const K = [0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391];
      const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
      const add32 = (a: number, b: number) => (a + b) & 0xffffffff;
      const rotl = (v: number, n: number) => (v << n) | (v >>> (32 - n));
      const bytes = Array.from(unescape(encodeURIComponent(s))).map(c => c.charCodeAt(0));
      const len = bytes.length * 8;
      bytes.push(0x80);
      while (bytes.length % 64 !== 56) bytes.push(0);
      for (let i = 0; i < 8; i++) bytes.push((len >>> (i * 8)) & 0xff);
      let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
      for (let i = 0; i < bytes.length; i += 64) {
        const M: number[] = [];
        for (let j = 0; j < 16; j++) M.push(bytes[i+j*4] | (bytes[i+j*4+1]<<8) | (bytes[i+j*4+2]<<16) | (bytes[i+j*4+3]<<24));
        let A=a0,B=b0,C=c0,D=d0;
        for (let j = 0; j < 64; j++) {
          let F: number, g: number;
          if (j < 16) { F = (B & C) | (~B & D); g = j; }
          else if (j < 32) { F = (D & B) | (~D & C); g = (5*j+1)%16; }
          else if (j < 48) { F = B ^ C ^ D; g = (3*j+5)%16; }
          else { F = C ^ (B | ~D); g = (7*j)%16; }
          F = add32(add32(F, A), add32(K[j], M[g]));
          A = D; D = C; C = B; B = add32(B, rotl(F, S[j]));
        }
        a0=add32(a0,A); b0=add32(b0,B); c0=add32(c0,C); d0=add32(d0,D);
      }
      const hex = (n: number) => Array.from({length:4},(_,i)=>((n>>>(i*8))&0xff).toString(16).padStart(2,'0')).join('');
      return hex(a0)+hex(b0)+hex(c0)+hex(d0);
    };
    const result = md5(input);
    return { success: true, summary: `MD5: ${result}`, data: { hash: result, algorithm: 'MD5', length: '128-bit' }, rawOutput: result, explanation: 'MD5 produces a 128-bit (16-byte) hash value, typically rendered as a 32-character hexadecimal string. It is no longer recommended for cryptographic security.' };
  },
};

export const sha1GeneratorTool: ToolDefinition = {
  id: 'sha1-generator',
  slug: 'sha1-generator',
  name: 'SHA-1 Generator',
  category: 'hashing',
  description: 'Generate SHA-1 hash from text input. SHA-1 produces a 160-bit hash value. Note: SHA-1 is considered weak for cryptographic purposes.',
  shortDescription: 'Generate SHA-1 hash from text',
  tags: ['sha1', 'sha-1', 'hash', 'digest'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input Text', type: 'textarea', placeholder: 'Enter text to hash...', required: true },
  ],
  execute: async (inputs) => {
    const result = await hashViaWebCrypto('SHA-1', asString(inputs.input, 'Input text'));
    return { success: true, summary: `SHA-1: ${result}`, data: { hash: result, algorithm: 'SHA-1', length: '160-bit' }, rawOutput: result };
  },
};

export const sha256GeneratorTool: ToolDefinition = {
  id: 'sha256-generator',
  slug: 'sha256-generator',
  name: 'SHA-256 Generator',
  category: 'hashing',
  description: 'Generate SHA-256 hash from text input. SHA-256 is part of the SHA-2 family and produces a 256-bit hash value. It is widely used in security applications and protocols.',
  shortDescription: 'Generate SHA-256 hash from text',
  tags: ['sha256', 'sha-256', 'hash', 'sha2', 'digest'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: true,
  inputs: [
    { id: 'input', label: 'Input Text', type: 'textarea', placeholder: 'Enter text to hash...', required: true },
  ],
  execute: async (inputs) => {
    const result = await hashViaWebCrypto('SHA-256', asString(inputs.input, 'Input text'));
    return { success: true, summary: `SHA-256: ${result}`, data: { hash: result, algorithm: 'SHA-256', length: '256-bit' }, rawOutput: result };
  },
};

export const sha512GeneratorTool: ToolDefinition = {
  id: 'sha512-generator',
  slug: 'sha512-generator',
  name: 'SHA-512 Generator',
  category: 'hashing',
  description: 'Generate SHA-512 hash from text input. SHA-512 is part of the SHA-2 family and produces a 512-bit hash value, offering strong collision resistance.',
  shortDescription: 'Generate SHA-512 hash from text',
  tags: ['sha512', 'sha-512', 'hash', 'sha2', 'digest'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input Text', type: 'textarea', placeholder: 'Enter text to hash...', required: true },
  ],
  execute: async (inputs) => {
    const result = await hashViaWebCrypto('SHA-512', asString(inputs.input, 'Input text'));
    return { success: true, summary: `SHA-512: ${result}`, data: { hash: result, algorithm: 'SHA-512', length: '512-bit' }, rawOutput: result };
  },
};

export const hmacGeneratorTool: ToolDefinition = {
  id: 'hmac-generator',
  slug: 'hmac-generator',
  name: 'HMAC Generator',
  category: 'hashing',
  description: 'Generate Hash-based Message Authentication Code (HMAC) using a secret key. Supports SHA-256 and SHA-512 algorithms.',
  shortDescription: 'Generate HMAC with a secret key',
  tags: ['hmac', 'hash', 'mac', 'authentication', 'sha256'],
  difficulty: 'intermediate',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Enter message...', required: true },
    { id: 'key', label: 'Secret Key', type: 'text', placeholder: 'Enter secret key...', required: true },
    { id: 'algorithm', label: 'Algorithm', type: 'select', defaultValue: 'SHA-256', options: [{ label: 'SHA-256', value: 'SHA-256' }, { label: 'SHA-512', value: 'SHA-512' }] },
  ],
  execute: async (inputs) => {
    const message = asString(inputs.message, 'Message');
    const key = asString(inputs.key, 'Secret key', 4096);
    const algorithm = inputs.algorithm as string;
    try {
      const enc = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: algorithm }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
      const result = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      return { success: true, summary: `HMAC-${algorithm}: ${result.substring(0, 32)}...`, data: { hmac: result, algorithm }, rawOutput: result };
    } catch {
      return { success: false, summary: 'Error generating HMAC', data: {}, rawOutput: 'Error' };
    }
  },
};

export const uuidGeneratorTool: ToolDefinition = {
  id: 'uuid-generator',
  slug: 'uuid-generator',
  name: 'UUID Generator',
  category: 'hashing',
  description: 'Generate random UUID v4 (Universally Unique Identifier). Generate single or multiple UUIDs with various format options.',
  shortDescription: 'Generate random UUID v4',
  tags: ['uuid', 'guid', 'random', 'unique', 'identifier'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'count', label: 'Count', type: 'number', defaultValue: 1, helperText: 'Number of UUIDs (1-100)' },
    { id: 'uppercase', label: 'Uppercase', type: 'checkbox', defaultValue: false },
    { id: 'noDashes', label: 'No Dashes', type: 'checkbox', defaultValue: false },
  ],
  execute: async (inputs) => {
    const count = Math.min(Math.max(Number(inputs.count) || 1, 1), 100);
    const uppercase = inputs.uppercase as boolean;
    const noDashes = inputs.noDashes as boolean;
    const uuids = Array.from({ length: count }, () => {
      let uuid = crypto.randomUUID();
      if (noDashes) uuid = uuid.replace(/-/g, '');
      if (uppercase) uuid = uuid.toUpperCase();
      return uuid;
    });
    const result = uuids.join('\n');
    return { success: true, summary: `Generated ${count} UUID(s)`, data: { uuids, count }, rawOutput: result };
  },
};

export const passwordGeneratorTool: ToolDefinition = {
  id: 'password-generator',
  slug: 'password-generator',
  name: 'Password Generator',
  category: 'hashing',
  description: 'Generate cryptographically secure passwords or multi-word passphrases without modulo bias.',
  shortDescription: 'Generate secure passwords and passphrases',
  tags: ['password', 'passphrase', 'random', 'secure', 'generator'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: true,
  persistHistory: false,
  inputs: [
    {
      id: 'mode',
      label: 'Generator Mode',
      type: 'select',
      defaultValue: 'password',
      options: [
        { label: 'Random Password', value: 'password' },
        { label: 'Passphrase', value: 'passphrase' },
      ],
    },
    { id: 'length', label: 'Length', type: 'number', defaultValue: 16, helperText: 'Password length (8-128)' },
    { id: 'count', label: 'Count', type: 'number', defaultValue: 5, helperText: 'Number of passwords (1-20)' },
    { id: 'uppercase', label: 'Include Uppercase (A-Z)', type: 'checkbox', defaultValue: true },
    { id: 'lowercase', label: 'Include Lowercase (a-z)', type: 'checkbox', defaultValue: true },
    { id: 'numbers', label: 'Include Numbers (0-9)', type: 'checkbox', defaultValue: true },
    { id: 'symbols', label: 'Include Symbols (!@#$...)', type: 'checkbox', defaultValue: true },
    { id: 'wordCount', label: 'Passphrase Word Count', type: 'number', defaultValue: 5, helperText: 'Passphrase words (4-12)' },
    {
      id: 'separator',
      label: 'Passphrase Separator',
      type: 'select',
      defaultValue: '-',
      options: [
        { label: 'Hyphen (-)', value: '-' },
        { label: 'Space', value: ' ' },
        { label: 'Period (.)', value: '.' },
        { label: 'Underscore (_)', value: '_' },
      ],
    },
    { id: 'capitalizeWords', label: 'Capitalize Passphrase Words', type: 'checkbox', defaultValue: false },
    { id: 'includePassphraseNumber', label: 'Include Random Number', type: 'checkbox', defaultValue: true },
  ],
  execute: async (inputs) => {
    const mode = inputs.mode === 'passphrase' ? 'passphrase' : 'password';
    const count = Math.min(Math.max(Number(inputs.count) || 5, 1), 20);
    try {
      if (mode === 'passphrase') {
        const wordCount = Math.min(Math.max(Number(inputs.wordCount) || 5, 4), 12);
        const separator = typeof inputs.separator === 'string' ? inputs.separator : '-';
        const passphrases = Array.from({ length: count }, () =>
          generatePassphrase(
            wordCount,
            separator,
            Boolean(inputs.capitalizeWords),
            Boolean(inputs.includePassphraseNumber)
          )
        );
        return {
          success: true,
          summary: `Generated ${count} passphrase(s) with ${wordCount} words`,
          data: { passphrases, wordCount },
          rawOutput: passphrases.join('\n'),
          items: [
            { label: 'Mode', value: 'Passphrase', status: 'info' },
            { label: 'Word Count', value: String(wordCount), status: 'pass' },
          ],
        };
      }

      const length = Math.min(Math.max(Number(inputs.length) || 16, 8), 128);
      const categories = {
        uppercase: Boolean(inputs.uppercase),
        lowercase: Boolean(inputs.lowercase),
        numbers: Boolean(inputs.numbers),
        symbols: Boolean(inputs.symbols),
      };
      const passwords = Array.from({ length: count }, () => generatePassword(length, categories));
      return {
        success: true,
        summary: `Generated ${count} password(s) of length ${length}`,
        data: { passwords, length, selectedCategories: Object.keys(categories).filter((key) => categories[key as keyof typeof categories]) },
        rawOutput: passwords.join('\n'),
        items: [
          { label: 'Mode', value: 'Random password', status: 'info' },
          { label: 'Length', value: String(length), status: 'pass' },
          { label: 'Category Guarantee', value: 'Every selected category is present', status: 'pass' },
        ],
      };
    } catch (error) {
      return errorResult(error, 'Password generation failed');
    }
  },
};

export const passwordStrengthTool: ToolDefinition = {
  id: 'password-strength',
  slug: 'password-strength',
  name: 'Password Strength Checker',
  category: 'hashing',
  description: 'Estimate password resistance with zxcvbn-ts, pattern feedback, crack-time estimates, and optional HIBP breach status.',
  shortDescription: 'Estimate password strength and breach status',
  tags: ['password', 'strength', 'security', 'entropy', 'audit'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  persistHistory: false,
  inputs: [
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Enter password to analyze...', required: true },
    {
      id: 'checkBreach',
      label: 'Check HIBP breach status using prefix-only k-anonymity',
      type: 'checkbox',
      defaultValue: false,
      helperText: 'Optional. Only the first five SHA-1 characters leave the browser.',
    },
  ],
  execute: async (inputs) => {
    const password = asString(inputs.password, 'Password', 1024);
    const estimate = estimatePasswordStrength(password);
    const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const;
    const patternWarnings = Array.from(new Set(estimate.sequence.map((match) => match.pattern)));
    const recommendations = [
      ...estimate.feedback.suggestions,
      ...(estimate.score < 3 ? ['Use a longer, unique passphrase generated by a password manager.'] : []),
      'Do not reuse this password across services.',
    ];

    let breachStatus = 'Not checked';
    let breachCount = 0;
    if (inputs.checkBreach) {
      try {
        const breach = await checkPwnedPassword(password);
        breachCount = breach.breachCount;
        breachStatus = breach.pwned
          ? `Found ${breach.breachCount.toLocaleString()} time(s)`
          : 'Not found in HIBP range';
      } catch {
        breachStatus = 'Unavailable';
      }
    }

    const resultData = {
      score: estimate.score,
      strength: strengthLabels[estimate.score],
      crackTimes: estimate.crackTimesDisplay,
      warning: estimate.feedback.warning || 'No specific pattern warning.',
      feedback: estimate.feedback.suggestions,
      patterns: patternWarnings,
      breachStatus,
      breachCount,
      recommendations,
    };
    return {
      success: true,
      summary: `${strengthLabels[estimate.score]} (${estimate.score}/4); breach status: ${breachStatus}`,
      data: resultData,
      rawOutput: JSON.stringify(resultData, null, 2),
      severity: breachCount > 0 ? 'critical' : estimate.score < 2 ? 'high' : estimate.score < 3 ? 'medium' : 'info',
      items: [
        { label: 'zxcvbn-ts Score', value: `${estimate.score}/4`, status: estimate.score >= 3 ? 'pass' : estimate.score === 2 ? 'warn' : 'fail' },
        { label: 'Offline Fast Hash', value: estimate.crackTimesDisplay.offlineFastHashing1e10PerSecond, status: estimate.score >= 3 ? 'pass' : 'warn' },
        { label: 'Online Throttled', value: estimate.crackTimesDisplay.onlineThrottling100PerHour, status: estimate.score >= 2 ? 'pass' : 'warn' },
        { label: 'Pattern Warning', value: estimate.feedback.warning || 'None', status: estimate.feedback.warning ? 'warn' : 'pass' },
        { label: 'Patterns', value: patternWarnings.join(', ') || 'No common pattern detected', status: patternWarnings.length ? 'warn' : 'pass' },
        { label: 'Breach Status', value: breachStatus, status: breachCount > 0 ? 'fail' : breachStatus === 'Unavailable' ? 'warn' : 'pass' },
        { label: 'Recommendations', value: recommendations.join(' '), status: estimate.score >= 3 && breachCount === 0 ? 'info' : 'warn' },
      ],
    };
  },
};

export const pwnedPasswordTool: ToolDefinition = {
  id: 'pwned-password',
  slug: 'pwned-password',
  name: 'Pwned Password Checker',
  category: 'hashing',
  description: 'Check whether a password appears in the Have I Been Pwned Pwned Passwords corpus using k-anonymity. The plain password is hashed in the browser; CyberKit sends only the first 5 SHA-1 hash characters to HIBP.',
  shortDescription: 'Check password exposure via HIBP range API',
  tags: ['password', 'pwned', 'hibp', 'breach', 'leak', 'k-anonymity'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: true,
  persistHistory: false,
  inputs: [
    {
      id: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter password to check...',
      required: true,
      helperText: 'The password is SHA-1 hashed locally. Only the first five hash characters are sent; suffix matching stays in this browser.',
    },
  ],
  execute: async (inputs) => {
    const password = asString(inputs.password, 'Password', 1024);
    try {
      const resData = await checkPwnedPassword(password);

      const raw = `Provider: ${resData.provider}
Hash prefix sent: ${resData.hashPrefix}
Pwned: ${resData.pwned ? 'YES' : 'No'}
Seen count: ${resData.breachCount.toLocaleString()}
`;

      return {
        success: true,
        summary: resData.pwned
          ? `Password found ${resData.breachCount.toLocaleString()} time(s) in breach data`
          : 'Password was not found in the Pwned Passwords corpus',
        data: resData,
        rawOutput: raw,
        severity: resData.pwned ? 'critical' : 'info',
        explanation: 'The password and full SHA-1 digest remain in the browser. CyberKit sends only the first five SHA-1 characters, receives a parsed HIBP range, and performs suffix matching locally.',
        items: [
          { label: 'Pwned', value: resData.pwned ? 'YES' : 'No', status: resData.pwned ? 'fail' : 'pass' },
          { label: 'Seen Count', value: resData.breachCount.toLocaleString(), status: resData.pwned ? 'fail' : 'pass' },
          { label: 'Hash Prefix Sent', value: resData.hashPrefix, status: 'info' },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to query Pwned Passwords API',
        data: {},
        rawOutput: `Error: ${message}`,
      };
    }
  },
};

export const hashIdentifierTool: ToolDefinition = {
  id: 'hash-identifier',
  slug: 'hash-identifier',
  name: 'Hash Identifier',
  category: 'hashing',
  description: 'Identify the type of a hash based on its format, length, and character set. Supports MD5, SHA-1, SHA-256, SHA-512, bcrypt, and more.',
  shortDescription: 'Identify hash algorithm from hash string',
  tags: ['hash', 'identify', 'detect', 'algorithm', 'ctf'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'hash', label: 'Hash', type: 'text', placeholder: 'Enter hash to identify...', required: true },
  ],
  execute: async (inputs) => {
    const hash = asString(inputs.hash, 'Hash', 4096).trim();
    const results: string[] = [];
    if (/^[a-f0-9]{32}$/i.test(hash)) results.push('MD5', 'NTLM');
    if (/^[a-f0-9]{40}$/i.test(hash)) results.push('SHA-1', 'RIPEMD-160');
    if (/^[a-f0-9]{64}$/i.test(hash)) results.push('SHA-256', 'SHA3-256');
    if (/^[a-f0-9]{128}$/i.test(hash)) results.push('SHA-512', 'SHA3-512', 'Whirlpool');
    if (/^\$2[aby]?\$\d{2}\$/.test(hash)) results.push('bcrypt');
    if (/^\$argon2[id]{1,2}\$/.test(hash)) results.push('Argon2');
    if (/^\$6\$/.test(hash)) results.push('SHA-512 crypt');
    if (/^\$5\$/.test(hash)) results.push('SHA-256 crypt');
    if (/^\$1\$/.test(hash)) results.push('MD5 crypt');
    if (/^[a-f0-9]{96}$/i.test(hash)) results.push('SHA-384', 'SHA3-384');
    if (/^[a-f0-9]{56}$/i.test(hash)) results.push('SHA-224', 'SHA3-224');
    if (results.length === 0) results.push('Unknown hash type');
    return { success: true, summary: `Possible: ${results.join(', ')}`, data: { possibleTypes: results, hashLength: hash.length }, rawOutput: `Hash: ${hash}\nLength: ${hash.length} chars\nPossible types: ${results.join(', ')}` };
  },
};

export const fileHashTool: ToolDefinition = {
  id: 'file-hash',
  slug: 'file-hash',
  name: 'File Hash Calculator',
  category: 'hashing',
  description: 'Calculate cryptographic hashes (MD5, SHA-1, SHA-256, SHA-512) of uploaded files. Useful for verifying file integrity and detecting modifications.',
  shortDescription: 'Calculate hash checksums for files',
  tags: ['file', 'hash', 'checksum', 'sha256', 'integrity'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'file', label: 'File', type: 'file', required: true },
  ],
  execute: async (inputs) => {
    try {
      const file = assertFile(inputs.file, 'File', MAX_FILE_BYTES);
      const buffer = await file.arrayBuffer();
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))).map(b => b.toString(16).padStart(2, '0')).join('');
    const sha1 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', buffer))).map(b => b.toString(16).padStart(2, '0')).join('');
    const sha512 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-512', buffer))).map(b => b.toString(16).padStart(2, '0')).join('');
    const raw = `File: ${file.name}\nSize: ${file.size} bytes\n\nSHA-256: ${sha256}\nSHA-1: ${sha1}\nSHA-512: ${sha512}`;
      return {
        success: true, summary: `SHA-256: ${sha256.substring(0, 16)}...`, data: { fileName: file.name, fileSize: file.size, sha256, sha1, sha512 }, rawOutput: raw,
        items: [
          { label: 'File', value: file.name, status: 'info' },
          { label: 'Size', value: `${file.size} bytes`, status: 'info' },
          { label: 'SHA-256', value: sha256, status: 'info' },
          { label: 'SHA-1', value: sha1, status: 'info' },
          { label: 'SHA-512', value: sha512, status: 'info' },
        ],
      };
    } catch (error) {
      return errorResult(error, 'File hash failed');
    }
  },
};

export const randomStringTool: ToolDefinition = {
  id: 'random-string',
  slug: 'random-string',
  name: 'Random String Generator',
  category: 'hashing',
  description: 'Generate random strings with configurable length and character sets. Useful for API keys, tokens, and test data.',
  shortDescription: 'Generate random strings and tokens',
  tags: ['random', 'string', 'token', 'key', 'generator'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'length', label: 'Length', type: 'number', defaultValue: 32 },
    { id: 'count', label: 'Count', type: 'number', defaultValue: 5 },
    { id: 'charset', label: 'Character Set', type: 'select', defaultValue: 'alphanumeric', options: [
      { label: 'Alphanumeric', value: 'alphanumeric' },
      { label: 'Hex', value: 'hex' },
      { label: 'Alphabetic', value: 'alpha' },
      { label: 'Numeric', value: 'numeric' },
      { label: 'All printable', value: 'all' },
    ]},
  ],
  execute: async (inputs) => {
    const length = Math.min(Math.max(Number(inputs.length) || 32, 1), 1024);
    const count = Math.min(Math.max(Number(inputs.count) || 5, 1), 50);
    const charsets: Record<string, string> = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      hex: '0123456789abcdef',
      alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numeric: '0123456789',
      all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
    };
    const cs = charsets[inputs.charset as string] || charsets.alphanumeric;
    const gen = () => { const a = new Uint32Array(length); crypto.getRandomValues(a); return Array.from(a, v => cs[v % cs.length]).join(''); };
    const strings = Array.from({ length: count }, () => gen());
    return { success: true, summary: `Generated ${count} string(s) of length ${length}`, data: { strings }, rawOutput: strings.join('\n') };
  },
};

export const hashingTools: ToolDefinition[] = [
  md5GeneratorTool, sha1GeneratorTool, sha256GeneratorTool, sha512GeneratorTool,
  hmacGeneratorTool, uuidGeneratorTool, passwordGeneratorTool, passwordStrengthTool,
  pwnedPasswordTool, hashIdentifierTool, fileHashTool, randomStringTool,
];
