import type { ToolDefinition } from '../types';
import { asString, errorResult, optionalString } from '../validation';
import { inspectJwt } from '@/lib/security/jwt';

export const base64Tool: ToolDefinition = {
  id: 'base64',
  slug: 'base64',
  name: 'Base64 Encoder/Decoder',
  category: 'encoding',
  description: 'Encode text to Base64 format or decode Base64 strings back to plain text. Base64 is commonly used in data transmission, email encoding, and embedding binary data in text-based formats like JSON and XML.',
  shortDescription: 'Encode and decode Base64 strings',
  tags: ['base64', 'encode', 'decode', 'encoding', 'ctf'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: true,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text to encode or Base64 to decode...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    try {
      const result = mode === 'encode' ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input)));
      return { success: true, summary: `${mode === 'encode' ? 'Encoded' : 'Decoded'} successfully (${result.length} chars)`, data: { result }, rawOutput: result, explanation: mode === 'encode' ? 'The input text was converted to Base64 by encoding each character into its binary representation, then grouping bits into 6-bit chunks mapped to the Base64 alphabet (A-Z, a-z, 0-9, +, /).' : 'The Base64 string was decoded by mapping each character back to its 6-bit value, reconstructing the original binary data, and converting it to text.' };
    } catch {
      return { success: false, summary: 'Invalid input for the selected mode', data: { error: 'Failed to process input' }, rawOutput: 'Error: Invalid input' };
    }
  },
};

export const urlEncoderTool: ToolDefinition = {
  id: 'url-encoder',
  slug: 'url-encoder',
  name: 'URL Encoder/Decoder',
  category: 'encoding',
  description: 'Encode special characters in URLs using percent-encoding or decode percent-encoded URLs back to readable text. Essential for handling query parameters and special characters in web development.',
  shortDescription: 'Encode and decode URL components',
  tags: ['url', 'encode', 'decode', 'percent-encoding', 'web'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter URL or text to encode/decode...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }, { label: 'Encode Component', value: 'encodeComponent' }, { label: 'Decode Component', value: 'decodeComponent' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    try {
      let result: string;
      switch (mode) {
        case 'encode': result = encodeURI(input); break;
        case 'decode': result = decodeURI(input); break;
        case 'encodeComponent': result = encodeURIComponent(input); break;
        case 'decodeComponent': result = decodeURIComponent(input); break;
        default: result = encodeURIComponent(input);
      }
      return { success: true, summary: `URL ${mode} completed`, data: { result }, rawOutput: result };
    } catch {
      return { success: false, summary: 'Invalid input', data: { error: 'Failed to process input' }, rawOutput: 'Error' };
    }
  },
};

export const htmlEntityTool: ToolDefinition = {
  id: 'html-entity',
  slug: 'html-entity',
  name: 'HTML Entity Encoder/Decoder',
  category: 'encoding',
  description: 'Convert special HTML characters to their entity equivalents or decode HTML entities back to readable characters. Important for XSS prevention and proper HTML rendering.',
  shortDescription: 'Encode and decode HTML entities',
  tags: ['html', 'entity', 'encode', 'decode', 'xss'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter HTML or text...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    const entityMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
    const reverseMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(entityMap)) reverseMap[v] = k;
    let result: string;
    if (mode === 'encode') {
      result = input.replace(/[&<>"'`=/]/g, (s) => entityMap[s] || s);
    } else {
      result = input.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g, (s) => reverseMap[s] || s);
    }
    return { success: true, summary: `HTML entities ${mode}d`, data: { result }, rawOutput: result };
  },
};

export const hexConverterTool: ToolDefinition = {
  id: 'hex-converter',
  slug: 'hex-converter',
  name: 'Hex Encoder/Decoder',
  category: 'encoding',
  description: 'Convert text to hexadecimal representation or decode hex strings back to text. Commonly used in binary analysis, cryptography, and low-level data inspection.',
  shortDescription: 'Convert between text and hexadecimal',
  tags: ['hex', 'hexadecimal', 'encode', 'decode', 'binary'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text or hex string...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Text → Hex', value: 'encode' }, { label: 'Hex → Text', value: 'decode' }] },
    { id: 'separator', label: 'Separator', type: 'select', defaultValue: ' ', options: [{ label: 'Space', value: ' ' }, { label: 'None', value: '' }, { label: 'Colon', value: ':' }, { label: '0x prefix', value: '0x' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    const sep = optionalString(inputs.separator, ' ');
    try {
      let result: string;
      if (mode === 'encode') {
        const hexArr = Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0'));
        result = sep === '0x' ? hexArr.map(h => '0x' + h).join(' ') : hexArr.join(sep);
      } else {
        const cleaned = input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
        if (!cleaned || cleaned.length % 2 !== 0 || /[^0-9a-fA-F]/.test(cleaned)) {
          throw new Error('Invalid hex input. Use complete byte pairs such as 48 65 6c 6c 6f.');
        }
        const pairs = cleaned.match(/.{1,2}/g) || [];
        result = pairs.map(h => String.fromCharCode(parseInt(h, 16))).join('');
      }
      return { success: true, summary: `Hex ${mode === 'encode' ? 'encoding' : 'decoding'} complete`, data: { result }, rawOutput: result };
    } catch (error) {
      return errorResult(error, 'Invalid input');
    }
  },
};

export const binaryConverterTool: ToolDefinition = {
  id: 'binary-converter',
  slug: 'binary-converter',
  name: 'Binary Encoder/Decoder',
  category: 'encoding',
  description: 'Convert text to binary (8-bit) representation or decode binary strings back to text. Useful for understanding data at the bit level.',
  shortDescription: 'Convert between text and binary',
  tags: ['binary', 'encode', 'decode', 'bits', 'ctf'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text or binary string...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Text → Binary', value: 'encode' }, { label: 'Binary → Text', value: 'decode' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    try {
      let result: string;
      if (mode === 'encode') {
        result = Array.from(input).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      } else {
        if (/[^01\s]/.test(input)) throw new Error('Invalid binary input. Only 0, 1, and whitespace are allowed.');
        const cleaned = input.replace(/\s/g, '');
        if (!cleaned || cleaned.length % 8 !== 0) throw new Error('Invalid binary input. Use complete 8-bit bytes.');
        const bytes = cleaned.match(/.{1,8}/g) || [];
        result = bytes.map(b => String.fromCharCode(parseInt(b, 2))).join('');
      }
      return { success: true, summary: `Binary ${mode === 'encode' ? 'encoding' : 'decoding'} complete`, data: { result }, rawOutput: result };
    } catch (error) {
      return errorResult(error, 'Error processing input');
    }
  },
};

export const unicodeConverterTool: ToolDefinition = {
  id: 'unicode-converter',
  slug: 'unicode-converter',
  name: 'Unicode Converter',
  category: 'encoding',
  description: 'Convert text to Unicode code points (U+XXXX format) or convert code points back to text characters.',
  shortDescription: 'Convert between text and Unicode code points',
  tags: ['unicode', 'codepoint', 'utf', 'convert'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text or Unicode code points (U+0041)...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Text → Unicode', value: 'encode' }, { label: 'Unicode → Text', value: 'decode' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    try {
      let result: string;
      if (mode === 'encode') {
        result = Array.from(input).map(c => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
      } else {
        const codePoints = input.match(/U\+([0-9A-Fa-f]+)/g) || [];
        result = codePoints.map(cp => String.fromCodePoint(parseInt(cp.replace('U+', ''), 16))).join('');
      }
      return { success: true, summary: `Unicode conversion complete`, data: { result }, rawOutput: result };
    } catch {
      return { success: false, summary: 'Invalid input', data: {}, rawOutput: 'Error' };
    }
  },
};

export const rot13Tool: ToolDefinition = {
  id: 'rot13',
  slug: 'rot13',
  name: 'ROT13',
  category: 'encoding',
  description: 'Apply ROT13 substitution cipher which rotates each letter 13 positions in the alphabet. ROT13 is its own inverse — applying it twice returns the original text. Commonly used in CTF challenges.',
  shortDescription: 'ROT13 substitution cipher',
  tags: ['rot13', 'cipher', 'ctf', 'substitution', 'rotate'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text to apply ROT13...', required: true },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const result = input.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
    return { success: true, summary: 'ROT13 applied', data: { result }, rawOutput: result, explanation: 'ROT13 replaces each letter with the letter 13 positions after it. Since the alphabet has 26 letters, applying ROT13 twice returns the original text.' };
  },
};

export const caesarCipherTool: ToolDefinition = {
  id: 'caesar-cipher',
  slug: 'caesar-cipher',
  name: 'Caesar Cipher',
  category: 'encoding',
  description: 'Encrypt or decrypt text using the Caesar cipher with a configurable shift value. The Caesar cipher is one of the oldest known ciphers, shifting each letter by a fixed number of positions.',
  shortDescription: 'Caesar cipher with variable shift',
  tags: ['caesar', 'cipher', 'shift', 'ctf', 'encrypt', 'decrypt'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text...', required: true },
    { id: 'shift', label: 'Shift', type: 'number', defaultValue: 3, helperText: 'Number of positions to shift (1-25)' },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encrypt', options: [{ label: 'Encrypt', value: 'encrypt' }, { label: 'Decrypt', value: 'decrypt' }, { label: 'Brute Force All', value: 'bruteforce' }] },
  ],
  execute: async (inputs) => {
    const input = asString(inputs.input, 'Input');
    const shift = Number(inputs.shift) || 3;
    const mode = optionalString(inputs.mode, 'encrypt');

    const caesarShift = (text: string, s: number) => text.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + s + 26) % 26) + base);
    });

    if (mode === 'bruteforce') {
      const results = Array.from({ length: 25 }, (_, i) => `Shift ${i + 1}: ${caesarShift(input, i + 1)}`).join('\n');
      return { success: true, summary: 'All 25 shifts computed', data: { results }, rawOutput: results };
    }

    const s = mode === 'decrypt' ? -shift : shift;
    const result = caesarShift(input, s);
    return { success: true, summary: `Caesar cipher ${mode}ed with shift ${shift}`, data: { result }, rawOutput: result };
  },
};

export const jwtDecoderTool: ToolDefinition = {
  id: 'jwt-decoder',
  slug: 'jwt-decoder',
  name: 'JWT Inspector',
  category: 'encoding',
  description: 'Strictly inspect JWT structure, claims, time boundaries, algorithm risks, and optional HS/RS signatures without treating decoded tokens as verified.',
  shortDescription: 'Inspect JWT claims and optional signatures',
  tags: ['jwt', 'token', 'decode', 'json', 'auth', 'bearer'],
  difficulty: 'intermediate',
  executionType: 'client',
  isFeatured: true,
  persistHistory: false,
  inputs: [
    { id: 'token', label: 'JWT Token', type: 'textarea', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', required: true },
    { id: 'clockSkew', label: 'Clock Skew (seconds)', type: 'number', defaultValue: 60, helperText: 'Allowed clock difference (0-3600 seconds)' },
    { id: 'secret', label: 'Optional HMAC Secret', type: 'password', placeholder: 'Used only for HS256/384/512 verification' },
    { id: 'publicKey', label: 'Optional RSA Public Key (SPKI PEM)', type: 'textarea', placeholder: '-----BEGIN PUBLIC KEY-----' },
    { id: 'jwks', label: 'Optional JWKS JSON', type: 'textarea', placeholder: '{"keys":[...]}' },
  ],
  execute: async (inputs) => {
    const token = asString(inputs.token, 'JWT token', 20_000).trim();
    try {
      const inspection = await inspectJwt(token, {
        clockSkewSeconds: Number(inputs.clockSkew) || 0,
        secret: typeof inputs.secret === 'string' ? inputs.secret : undefined,
        publicKeyPem: typeof inputs.publicKey === 'string' ? inputs.publicKey : undefined,
        jwksJson: typeof inputs.jwks === 'string' ? inputs.jwks : undefined,
      });
      const warningSummary = inspection.warnings.length
        ? `${inspection.warnings.length} warning(s)`
        : 'no claim or algorithm warnings';
      const summary = inspection.verification.status === 'verified'
        ? `Signature verified; ${warningSummary}`
        : `Decoded; signature ${inspection.verification.status === 'not-requested' ? 'not verified' : inspection.verification.status}; ${warningSummary}`;
      const raw = JSON.stringify(
        {
          header: inspection.header,
          payload: inspection.payload,
          claims: inspection.claims,
          verification: inspection.verification,
          warnings: inspection.warnings,
        },
        null,
        2
      );
      return {
        success: true,
        summary,
        data: inspection,
        rawOutput: raw,
        severity: inspection.warnings.some((warning) => warning.severity === 'critical')
          ? 'critical'
          : inspection.warnings.some((warning) => warning.severity === 'high')
            ? 'high'
            : inspection.warnings.length
              ? 'medium'
              : 'info',
        explanation: 'Decoding proves only that the token structure is readable. Cryptographic authenticity is claimed only when the signature status is verified. Sensitive claim values are masked in output by default.',
        items: [
          { label: 'Algorithm', value: inspection.algorithm, status: inspection.algorithm === 'none' ? 'fail' : 'info' },
          { label: 'Authenticity', value: inspection.verification.status === 'verified' ? 'Cryptographically verified' : 'Not established', status: inspection.verification.status === 'verified' ? 'pass' : 'warn' },
          { label: 'Signature', value: inspection.verification.message, status: inspection.verification.status === 'verified' ? 'pass' : inspection.verification.status === 'not-requested' ? 'warn' : 'fail' },
          { label: 'Clock Skew', value: `${inspection.clockSkewSeconds} second(s)`, status: 'info' },
          { label: 'exp', value: inspection.claims.exp !== undefined ? new Date(inspection.claims.exp * 1000).toISOString() : 'Missing', status: inspection.warnings.some((warning) => warning.id === 'expired' || warning.id === 'missing-exp') ? 'fail' : 'pass' },
          { label: 'nbf', value: inspection.claims.nbf !== undefined ? new Date(inspection.claims.nbf * 1000).toISOString() : 'Not set', status: inspection.warnings.some((warning) => warning.id === 'not-before') ? 'fail' : 'info' },
          { label: 'iat', value: inspection.claims.iat !== undefined ? new Date(inspection.claims.iat * 1000).toISOString() : 'Not set', status: inspection.warnings.some((warning) => warning.id === 'future-iat') ? 'warn' : 'info' },
          { label: 'iss', value: inspection.claims.iss || 'Not set', status: 'info' },
          { label: 'aud', value: Array.isArray(inspection.claims.aud) ? inspection.claims.aud.join(', ') : inspection.claims.aud || 'Not set', status: 'info' },
          { label: 'sub', value: inspection.claims.sub || 'Not set', status: 'info' },
          { label: 'jti', value: inspection.claims.jti || 'Not set', status: 'info' },
          { label: 'Warnings', value: inspection.warnings.map((warning) => warning.message).join(' ') || 'None', status: inspection.warnings.length ? 'warn' : 'pass' },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not inspect token.';
      return { success: false, summary: `Invalid JWT: ${message}`, data: { error: message }, rawOutput: `Error: ${message}` };
    }
  },
};

export const morseCodeTool: ToolDefinition = {
  id: 'morse-code',
  slug: 'morse-code',
  name: 'Morse Code Translator',
  category: 'ctf',
  description: 'Convert text to Morse code or decode Morse code back to text. Uses dots (.) and dashes (-) with space-separated characters and slash-separated words.',
  shortDescription: 'Encode and decode Morse code',
  tags: ['morse', 'code', 'ctf', 'dots', 'dashes'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text or Morse code (.- / -...)...', required: true },
    { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'encode', options: [{ label: 'Text → Morse', value: 'encode' }, { label: 'Morse → Text', value: 'decode' }] },
  ],
  execute: async (inputs) => {
    const morseMap: Record<string, string> = { 'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', ' ': '/' };
    const reverseMorse: Record<string, string> = {};
    for (const [k, v] of Object.entries(morseMap)) reverseMorse[v] = k;
    const input = asString(inputs.input, 'Input');
    const mode = optionalString(inputs.mode, 'encode');
    let result: string;
    if (mode === 'encode') {
      result = input.toUpperCase().split('').map(c => morseMap[c] || c).join(' ');
    } else {
      result = input.split(' / ').map(word => word.split(' ').map(c => reverseMorse[c] || c).join('')).join(' ');
    }
    return { success: true, summary: `Morse code ${mode === 'encode' ? 'encoded' : 'decoded'}`, data: { result }, rawOutput: result };
  },
};

export const encodingTools: ToolDefinition[] = [
  base64Tool, urlEncoderTool, htmlEntityTool, hexConverterTool,
  binaryConverterTool, unicodeConverterTool, rot13Tool, caesarCipherTool,
  jwtDecoderTool, morseCodeTool,
];
