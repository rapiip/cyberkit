import type { ToolDefinition } from '../types';
import { assertFile, asString, errorResult, MAX_FILE_BYTES } from '../validation';

export const exifViewerTool: ToolDefinition = {
  id: 'exif-viewer', slug: 'exif-viewer', name: 'EXIF Metadata Viewer', category: 'forensics',
  description: 'Extract and view EXIF metadata from image files including camera info, GPS, timestamps.',
  shortDescription: 'Extract EXIF metadata from images',
  tags: ['exif', 'metadata', 'image', 'gps', 'forensics'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'file', label: 'Image File', type: 'file', required: true }],
  execute: async (inputs) => {
    try {
      const file = assertFile(inputs.file, 'Image file', MAX_FILE_BYTES);
      if (file.size < 4) return { success: false, summary: 'File is too small to contain valid metadata', data: {}, rawOutput: 'Error: File is too small' };
      
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      const items: { label: string; value: string; status: 'info' | 'warn' | 'pass' }[] = [
        { label: 'File Name', value: file.name, status: 'info' },
        { label: 'File Size', value: `${(file.size / 1024).toFixed(1)} KB`, status: 'info' },
        { label: 'File Type', value: file.type || 'unknown', status: 'info' },
        { label: 'Last Modified', value: new Date(file.lastModified).toISOString(), status: 'info' },
      ];
      if (view.byteLength >= 4 && view.getUint16(0) === 0xFFD8) {
        items.push({ label: 'Format', value: 'JPEG', status: 'info' });
        let offset = 2;
        while (offset < buffer.byteLength - 4) {
          const marker = view.getUint16(offset);
          if (marker === 0xFFE1) { items.push({ label: 'EXIF Data', value: 'Found', status: 'pass' }); break; }
          if ((marker & 0xFF00) !== 0xFF00) break;
          offset += 2 + view.getUint16(offset + 2);
        }
      }
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))).map(b => b.toString(16).padStart(2, '0')).join('');
      items.push({ label: 'SHA-256', value: sha, status: 'info' });
      return { success: true, summary: `${file.name} — ${items.length} fields`, data: {}, rawOutput: items.map(i => `${i.label}: ${i.value}`).join('\n'), items };
    } catch (error) {
      return errorResult(error, 'Failed to read metadata');
    }
  },

};

export const mimeCheckerTool: ToolDefinition = {
  id: 'mime-checker', slug: 'mime-checker', name: 'MIME Type Checker', category: 'forensics',
  description: 'Check file MIME type based on content and extension. Detect mismatches.',
  shortDescription: 'Check and verify file MIME types',
  tags: ['mime', 'type', 'file', 'forensics'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'file', label: 'File', type: 'file', required: true }],
  execute: async (inputs) => {
    const file = assertFile(inputs.file);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 16));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const sigs: { m: number[]; t: string }[] = [
      { m: [0xFF, 0xD8, 0xFF], t: 'image/jpeg' }, { m: [0x89, 0x50, 0x4E, 0x47], t: 'image/png' },
      { m: [0x47, 0x49, 0x46], t: 'image/gif' }, { m: [0x25, 0x50, 0x44, 0x46], t: 'application/pdf' },
      { m: [0x50, 0x4B, 0x03, 0x04], t: 'application/zip' }, { m: [0x1F, 0x8B], t: 'application/gzip' },
      { m: [0x4D, 0x5A], t: 'application/x-msdos-executable' },
    ];
    let detected = 'unknown';
    for (const s of sigs) { if (s.m.every((b, i) => bytes[i] === b)) { detected = s.t; break; } }
    const mismatch = file.type && detected !== 'unknown' && !file.type.includes(detected.split('/')[1]);
    return {
      success: true, summary: `${detected}${mismatch ? ' ⚠ Mismatch!' : ''}`, data: { declared: file.type, detected }, rawOutput: `File: ${file.name}\nDeclared: ${file.type}\nDetected: ${detected}\nMagic: ${hex}`,
      items: [
        { label: 'Declared', value: file.type || 'none', status: 'info' },
        { label: 'Detected', value: detected, status: detected === 'unknown' ? 'warn' : 'pass' },
        { label: 'Magic Bytes', value: hex, status: 'info' },
        { label: 'Mismatch', value: mismatch ? 'YES' : 'No', status: mismatch ? 'fail' : 'pass' },
      ],
    };
  },
};

export const magicBytesTool: ToolDefinition = {
  id: 'magic-bytes', slug: 'magic-bytes', name: 'Magic Bytes Viewer', category: 'forensics',
  description: 'View hex dump of file header bytes to identify true file type.',
  shortDescription: 'View file magic bytes', tags: ['magic', 'bytes', 'hex', 'forensics'],
  difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [
    { id: 'file', label: 'File', type: 'file', required: true },
    { id: 'byteCount', label: 'Bytes to Show', type: 'number', defaultValue: 64 },
  ],
  execute: async (inputs) => {
    const file = assertFile(inputs.file);
    const count = Math.min(Math.max(Number(inputs.byteCount) || 64, 16), 512);
    const bytes = new Uint8Array((await file.arrayBuffer()).slice(0, count));
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const s = bytes.slice(i, i + 16);
      const hex = Array.from(s).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(s).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
      lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(48)}  ${ascii}`);
    }
    return { success: true, summary: `First ${bytes.length} bytes`, data: {}, rawOutput: lines.join('\n') };
  },
};

export const stringExtractorTool: ToolDefinition = {
  id: 'string-extractor', slug: 'string-extractor', name: 'String Extractor', category: 'forensics',
  description: 'Extract readable ASCII strings from binary files, like Unix strings command.',
  shortDescription: 'Extract strings from binary files',
  tags: ['strings', 'extract', 'binary', 'forensics'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [
    { id: 'file', label: 'File', type: 'file', required: true },
    { id: 'minLength', label: 'Min String Length', type: 'number', defaultValue: 4 },
  ],
  execute: async (inputs) => {
    const file = assertFile(inputs.file);
    const minLen = Math.max(Number(inputs.minLength) || 4, 2);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const strings: string[] = [];
    let cur = '';
    for (const b of bytes) {
      if (b >= 32 && b <= 126) cur += String.fromCharCode(b);
      else { if (cur.length >= minLen) strings.push(cur); cur = ''; }
    }
    if (cur.length >= minLen) strings.push(cur);
    return { success: true, summary: `Found ${strings.length} strings`, data: { total: strings.length }, rawOutput: strings.slice(0, 500).join('\n') };
  },
};

export const iocExtractorTool: ToolDefinition = {
  id: 'ioc-extractor', slug: 'ioc-extractor', name: 'IOC Extractor', category: 'forensics',
  description: 'Extract Indicators of Compromise from text: IPs, domains, URLs, emails, hashes.',
  shortDescription: 'Extract IOCs from text/logs',
  tags: ['ioc', 'indicator', 'threat', 'ip', 'hash'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'input', label: 'Text / Logs', type: 'textarea', placeholder: 'Paste logs or text...', required: true }],
  execute: async (inputs) => {
    const t = asString(inputs.input, 'Text / logs');
    const ips = [...new Set(t.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])];
    const urls = [...new Set(t.match(/https?:\/\/[^\s<>"']+/g) || [])];
    const emails = [...new Set(t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    const md5 = [...new Set(t.match(/\b[a-f0-9]{32}\b/gi) || [])];
    const sha1 = [...new Set(t.match(/\b[a-f0-9]{40}\b/gi) || [])];
    const sha256 = [...new Set(t.match(/\b[a-f0-9]{64}\b/gi) || [])];
    const total = ips.length + urls.length + emails.length + md5.length + sha1.length + sha256.length;
    const parts: string[] = [];
    if (ips.length) parts.push(`IPs:\n${ips.join('\n')}`);
    if (urls.length) parts.push(`URLs:\n${urls.join('\n')}`);
    if (emails.length) parts.push(`Emails:\n${emails.join('\n')}`);
    if (md5.length) parts.push(`MD5:\n${md5.join('\n')}`);
    if (sha1.length) parts.push(`SHA-1:\n${sha1.join('\n')}`);
    if (sha256.length) parts.push(`SHA-256:\n${sha256.join('\n')}`);
    return {
      success: true, summary: `${total} IOC(s) found`, data: { ips, urls, emails, md5, sha1, sha256 }, rawOutput: parts.join('\n\n') || 'No IOCs found',
      items: [
        { label: 'IPs', value: `${ips.length}`, status: ips.length ? 'warn' : 'info' },
        { label: 'URLs', value: `${urls.length}`, status: urls.length ? 'warn' : 'info' },
        { label: 'Emails', value: `${emails.length}`, status: emails.length ? 'warn' : 'info' },
        { label: 'Hashes', value: `${md5.length + sha1.length + sha256.length}`, status: (md5.length + sha1.length + sha256.length) ? 'warn' : 'info' },
      ],
    };
  },
};

export const forensicsTools: ToolDefinition[] = [exifViewerTool, mimeCheckerTool, magicBytesTool, stringExtractorTool, iocExtractorTool];
