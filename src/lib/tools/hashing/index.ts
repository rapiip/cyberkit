import type { ToolDefinition } from '../types';
import { assertFile, asString, errorResult, MAX_FILE_BYTES } from '../validation';
import { hashFileWithProgress, hashText } from '@/lib/security/hash';
import {
  checkPwnedPassword,
  estimatePasswordStrength,
  generatePassphrase,
  generatePassword,
  secureRandomInt,
} from '@/lib/security/password';

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
    const result = await hashText('MD5', input);
    return {
      success: true,
      summary: `MD5 (legacy): ${result}`,
      data: { hash: result, algorithm: 'MD5', length: '128-bit', trustedForSecurity: false },
      rawOutput: result,
      explanation: 'MD5 produces a 128-bit digest, but it is legacy and collision-prone. Use it only for compatibility or weak checksum workflows, not security decisions.',
    };
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
    const result = await hashText('SHA-1', asString(inputs.input, 'Input text'));
    return {
      success: true,
      summary: `SHA-1 (legacy): ${result}`,
      data: { hash: result, algorithm: 'SHA-1', length: '160-bit', trustedForSecurity: false },
      rawOutput: result,
      explanation: 'SHA-1 is retained for compatibility and checksum comparison, but should not be treated as collision-resistant for modern security use.',
    };
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
    const result = await hashText('SHA-256', asString(inputs.input, 'Input text'));
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
    const result = await hashText('SHA-512', asString(inputs.input, 'Input text'));
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
          { label: 'Feedback', value: estimate.feedback.suggestions.join(' ') || 'No additional feedback', status: estimate.feedback.suggestions.length ? 'warn' : 'info' },
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
    return {
      success: true,
      summary: `Candidate formats: ${results.join(', ')}`,
      data: { possibleTypes: results, hashLength: hash.length, confidence: results[0] === 'Unknown hash type' ? 'low' : 'medium' },
      rawOutput: `Hash: ${hash}\nLength: ${hash.length} chars\nCandidate formats only: ${results.join(', ')}\nWarning: length and prefix patterns cannot prove the original algorithm.`,
      explanation: 'Hash identification here is heuristic only. Length, prefix markers, and character sets can narrow candidates, but they do not prove the original algorithm or hash origin.',
      items: [
        { label: 'Length', value: `${hash.length} characters`, status: 'info' },
        { label: 'Candidates', value: results.join(', '), status: results[0] === 'Unknown hash type' ? 'warn' : 'info' },
        { label: 'Confidence', value: results[0] === 'Unknown hash type' ? 'Low' : 'Medium', status: 'warn' },
      ],
    };
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
  execute: async (inputs, context) => {
    try {
      const file = assertFile(inputs.file, 'File', MAX_FILE_BYTES);
      const hashes = await hashFileWithProgress(file, context?.onProgress);
      const raw = `File: ${file.name}\nSize: ${file.size} bytes\nRead in chunks: ${hashes.chunkCount}\n\nSHA-256: ${hashes.sha256}\nSHA-1 (legacy): ${hashes.sha1}\nSHA-512: ${hashes.sha512}\nMD5 (legacy): ${hashes.md5}`;
      return {
        success: true, summary: `SHA-256: ${hashes.sha256.substring(0, 16)}...`, data: { fileName: file.name, fileSize: file.size, ...hashes }, rawOutput: raw,
        items: [
          { label: 'File', value: file.name, status: 'info' },
          { label: 'Size', value: `${file.size} bytes`, status: 'info' },
          { label: 'Chunks Read', value: String(hashes.chunkCount), status: 'info' },
          { label: 'SHA-256', value: hashes.sha256, status: 'info' },
          { label: 'SHA-1', value: `${hashes.sha1} (legacy)`, status: 'warn' },
          { label: 'SHA-512', value: hashes.sha512, status: 'info' },
          { label: 'MD5', value: `${hashes.md5} (legacy)`, status: 'warn' },
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
    const gen = () => Array.from({ length }, () => cs[secureRandomInt(cs.length)]).join('');
    const strings = Array.from({ length: count }, () => gen());
    return {
      success: true,
      summary: `Generated ${count} string(s) of length ${length}`,
      data: { strings, charset: inputs.charset as string, moduloBiasAvoided: true },
      rawOutput: strings.join('\n'),
      explanation: 'Random character selection uses rejection sampling to avoid modulo bias when mapping cryptographic randomness into the selected charset.',
    };
  },
};

export const hashingTools: ToolDefinition[] = [
  md5GeneratorTool, sha1GeneratorTool, sha256GeneratorTool, sha512GeneratorTool,
  hmacGeneratorTool, uuidGeneratorTool, passwordGeneratorTool, passwordStrengthTool,
  pwnedPasswordTool, hashIdentifierTool, fileHashTool, randomStringTool,
];
