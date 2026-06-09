import type { ToolDefinition } from '../types';
import { asString, errorResult, hasNestedQuantifier, optionalString } from '../validation';

export const xorHelperTool: ToolDefinition = {
  id: 'xor-helper', slug: 'xor-helper', name: 'XOR Helper', category: 'ctf',
  description: 'XOR text or hex data with a key. Supports single-byte and multi-byte XOR operations common in CTF challenges.',
  shortDescription: 'XOR encode/decode data with a key',
  tags: ['xor', 'cipher', 'ctf', 'crypto', 'key'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [
    { id: 'input', label: 'Input', type: 'textarea', placeholder: 'Enter text or hex...', required: true },
    { id: 'key', label: 'XOR Key', type: 'text', placeholder: 'Key (text or hex like 0x41)', required: true },
    { id: 'inputFormat', label: 'Input Format', type: 'select', defaultValue: 'text', options: [{ label: 'Text', value: 'text' }, { label: 'Hex', value: 'hex' }] },
    { id: 'outputFormat', label: 'Output Format', type: 'select', defaultValue: 'text', options: [{ label: 'Text', value: 'text' }, { label: 'Hex', value: 'hex' }] },
  ],
  execute: async (inputs) => {
    const inputStr = asString(inputs.input, 'Input');
    const keyStr = asString(inputs.key, 'XOR key', 2048);
    const inFmt = optionalString(inputs.inputFormat, 'text');
    const outFmt = optionalString(inputs.outputFormat, 'text');
    try {
      let inputBytes: number[];
      if (inFmt === 'hex') {
        const clean = inputStr.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
        if (!clean || clean.length % 2 !== 0) throw new Error('Invalid hex input. Use complete byte pairs.');
        inputBytes = (clean.match(/.{1,2}/g) || []).map(h => parseInt(h, 16));
      } else {
        inputBytes = Array.from(inputStr).map(c => c.charCodeAt(0));
      }
      let keyBytes: number[];
      if (keyStr.startsWith('0x')) {
        if (!/^0x[0-9a-fA-F]{2}$/.test(keyStr)) throw new Error('Hex XOR key must be a single byte like 0x41.');
        keyBytes = [parseInt(keyStr, 16)];
      } else {
        keyBytes = Array.from(keyStr).map(c => c.charCodeAt(0));
      }
      if (keyBytes.length === 0) throw new Error('XOR key is required.');
      const result = inputBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
      let output: string;
      if (outFmt === 'hex') {
        output = result.map(b => b.toString(16).padStart(2, '0')).join(' ');
      } else {
        output = result.map(b => String.fromCharCode(b)).join('');
      }
      return { success: true, summary: 'XOR operation complete', data: { result: output }, rawOutput: output };
    } catch (error) {
      return errorResult(error);
    }
  },
};

export const regexTesterTool: ToolDefinition = {
  id: 'regex-tester', slug: 'regex-tester', name: 'Regex Tester', category: 'ctf',
  description: 'Test regular expressions against input text. View matches, groups, and match positions in real-time.',
  shortDescription: 'Test and debug regular expressions',
  tags: ['regex', 'regexp', 'pattern', 'test', 'match'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [
    { id: 'pattern', label: 'Regex Pattern', type: 'text', placeholder: '\\b[A-Z]\\w+', required: true },
    { id: 'flags', label: 'Flags', type: 'text', placeholder: 'gi', defaultValue: 'g' },
    { id: 'input', label: 'Test String', type: 'textarea', placeholder: 'Enter text to test against...', required: true },
  ],
  execute: async (inputs) => {
    const pattern = asString(inputs.pattern, 'Regex pattern', 500);
    const flags = optionalString(inputs.flags, 'g');
    const input = asString(inputs.input, 'Test string', 50_000);
    try {
      if (!/^[dgimsuvy]*$/.test(flags)) throw new Error('Invalid regex flags. Use JavaScript flags such as g, i, m, s, u, v, y, or d.');
      const warnings: string[] = [];
      if (hasNestedQuantifier(pattern)) {
        warnings.push('Pattern contains nested quantifiers and may be vulnerable to catastrophic backtracking on large input.');
      }
      const regex = new RegExp(pattern, flags);
      const matches: { match: string; index: number; groups?: Record<string, string> }[] = [];
      let m;
      if (flags.includes('g')) {
        while ((m = regex.exec(input)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.groups });
          if (!m[0]) break; // prevent infinite loop on zero-length matches
          if (matches.length > 300) break; // prevent high memory allocation / ReDoS hangs
        }
      } else {
        m = regex.exec(input);
        if (m) matches.push({ match: m[0], index: m.index, groups: m.groups });
      }
      const raw = `${warnings.map((warning) => `Warning: ${warning}`).join('\n')}${warnings.length ? '\n\n' : ''}${
        matches.length ? matches.map((m, i) => `Match ${i + 1}: "${m.match}" at index ${m.index}`).join('\n') : 'No matches'
      }`;
      return {
        success: true,
        summary: `${matches.length >= 300 ? '300+ (capped)' : matches.length} match(es) found${warnings.length ? ' with warning' : ''}`,
        data: { matches, pattern, flags, warnings },
        rawOutput: raw,
        items: [
          ...warnings.map((warning) => ({ label: 'Warning', value: warning, status: 'warn' as const })),
          ...matches.map((match, i) => ({ label: `Match ${i + 1}`, value: `"${match.match}" at index ${match.index}`, status: 'pass' as const })),
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid regex';
      return { success: false, summary: `Invalid regex: ${message}`, data: {}, rawOutput: `Error: ${message}` };
    }
  },

};

export const ctfTools: ToolDefinition[] = [xorHelperTool, regexTesterTool];
