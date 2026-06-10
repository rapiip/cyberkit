import type { ToolDefinition } from '../types';
import {
  extractIocsFromText,
  LOCAL_ANALYSIS_MAX_FILE_BYTES,
  triageFile,
} from '@/lib/security/local-analysis';
import { assertFile, optionalString } from '../validation';

function triageSummaryItems(report: Awaited<ReturnType<typeof triageFile>>) {
  return [
    { label: 'Declared MIME', value: report.declaredMime, status: 'info' as const },
    { label: 'Detected MIME', value: report.detectedMime, status: report.detectedMime === 'unknown' ? 'warn' as const : 'pass' as const },
    { label: 'Extension', value: report.extension || 'none', status: 'info' as const },
    { label: 'Detected Extension', value: report.detectedExtension, status: 'info' as const },
    { label: 'Declared vs Magic', value: report.mimeMismatch ? 'Mismatch' : 'Consistent', status: report.mimeMismatch ? 'fail' as const : 'pass' as const },
    { label: 'Extension vs Magic', value: report.extensionMismatch ? 'Mismatch' : 'Consistent', status: report.extensionMismatch ? 'fail' as const : 'pass' as const },
    { label: 'SHA-256', value: report.hashes.sha256, status: 'info' as const },
    { label: 'SHA-1', value: report.hashes.sha1, status: 'info' as const },
    { label: 'MD5', value: report.hashes.md5, status: 'info' as const },
    { label: 'Entropy', value: String(report.entropy), status: report.entropy > 5 ? 'warn' as const : 'info' as const },
  ];
}

export const exifViewerTool: ToolDefinition = {
  id: 'exif-viewer', slug: 'exif-viewer', name: 'EXIF Metadata Viewer', category: 'forensics',
  description: 'Extract local file metadata, hashes, and EXIF details from images without uploading them.',
  shortDescription: 'Extract EXIF and file metadata from images',
  tags: ['exif', 'metadata', 'image', 'gps', 'forensics'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [{ id: 'file', label: 'Image File', type: 'file', required: true, helperText: 'Processed locally in your browser. Maximum 15 MB.' }],
  execute: async (inputs, context) => {
    const file = assertFile(inputs.file, 'Image file', LOCAL_ANALYSIS_MAX_FILE_BYTES);
    context?.onProgress?.({ current: 1, total: 1, label: 'Reading image metadata' });
    const report = await triageFile(file, context?.signal);
    const metadataEntries = Object.entries(report.metadata);
    return {
      success: true,
      summary: metadataEntries.length ? `${metadataEntries.length} metadata field(s) extracted` : 'No EXIF metadata found',
      data: { report },
      rawOutput: [
        `File: ${report.fileName}`,
        `Declared MIME: ${report.declaredMime}`,
        `Detected MIME: ${report.detectedMime}`,
        `SHA-256: ${report.hashes.sha256}`,
        ...metadataEntries.map(([key, value]) => `${key}: ${String(value)}`),
      ].join('\n'),
      explanation: 'The file is processed locally. EXIF parsing uses exifr, type identification uses magic bytes, and hashes are derived in-browser.',
      items: [
        ...triageSummaryItems(report),
        { label: 'Metadata Fields', value: String(metadataEntries.length), status: metadataEntries.length ? 'pass' as const : 'info' as const },
      ],
    };
  },

};

export const mimeCheckerTool: ToolDefinition = {
  id: 'mime-checker', slug: 'mime-checker', name: 'MIME Type Checker', category: 'forensics',
  description: 'Compare extension, declared MIME type, and magic-byte detection for a local file.',
  shortDescription: 'Check extension, MIME, and magic-byte consistency',
  tags: ['mime', 'type', 'file', 'forensics'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [{ id: 'file', label: 'File', type: 'file', required: true, helperText: 'Processed locally in your browser. Maximum 15 MB.' }],
  execute: async (inputs, context) => {
    const file = assertFile(inputs.file, 'File', LOCAL_ANALYSIS_MAX_FILE_BYTES);
    context?.onProgress?.({ current: 1, total: 1, label: 'Analyzing file type' });
    const report = await triageFile(file, context?.signal);
    return {
      success: true,
      summary: report.mimeMismatch || report.extensionMismatch ? 'Type mismatch detected' : 'Declared type matches file content',
      data: { report },
      rawOutput: `File: ${report.fileName}\nDeclared MIME: ${report.declaredMime}\nDetected MIME: ${report.detectedMime}\nExtension: ${report.extension || 'none'}\nDetected Extension: ${report.detectedExtension}\nMagic Bytes: ${report.magicBytes}`,
      explanation: 'Detection compares the browser-declared MIME type, the filename extension, and magic-byte inspection via file-type. Mismatches often indicate renaming, malformed uploads, or masquerading content.',
      items: [
        ...triageSummaryItems(report),
        { label: 'Magic Bytes', value: report.magicBytes, status: 'info' as const },
      ],
    };
  },
};

export const magicBytesTool: ToolDefinition = {
  id: 'magic-bytes', slug: 'magic-bytes', name: 'Magic Bytes Viewer', category: 'forensics',
  description: 'Inspect local file headers together with detected type and integrity hashes.',
  shortDescription: 'Inspect magic bytes and file signatures', tags: ['magic', 'bytes', 'hex', 'forensics'],
  difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [
    { id: 'file', label: 'File', type: 'file', required: true, helperText: 'Processed locally in your browser. Maximum 15 MB.' },
  ],
  execute: async (inputs, context) => {
    const file = assertFile(inputs.file, 'File', LOCAL_ANALYSIS_MAX_FILE_BYTES);
    context?.onProgress?.({ current: 1, total: 1, label: 'Reading file signature' });
    const report = await triageFile(file, context?.signal);
    return {
      success: true,
      summary: `Magic bytes read for ${report.fileName}`,
      data: { report },
      rawOutput: `File: ${report.fileName}\nMagic Bytes: ${report.magicBytes}\nDetected MIME: ${report.detectedMime}\nDetected Extension: ${report.detectedExtension}\nSHA-256: ${report.hashes.sha256}`,
      items: [
        { label: 'Magic Bytes', value: report.magicBytes, status: 'info' as const },
        { label: 'Detected MIME', value: report.detectedMime, status: report.detectedMime === 'unknown' ? 'warn' as const : 'pass' as const },
        { label: 'Detected Extension', value: report.detectedExtension, status: 'info' as const },
        { label: 'SHA-256', value: report.hashes.sha256, status: 'info' as const },
      ],
    };
  },
};

export const stringExtractorTool: ToolDefinition = {
  id: 'string-extractor', slug: 'string-extractor', name: 'String Extractor', category: 'forensics',
  description: 'Extract printable strings, embedded URLs, hashes, and other IOCs from local files.',
  shortDescription: 'Extract strings and embedded IOCs from files',
  tags: ['strings', 'extract', 'binary', 'forensics'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [
    { id: 'file', label: 'File', type: 'file', required: true, helperText: 'Processed locally in your browser. Maximum 15 MB.' },
  ],
  execute: async (inputs, context) => {
    const file = assertFile(inputs.file, 'File', LOCAL_ANALYSIS_MAX_FILE_BYTES);
    context?.onProgress?.({ current: 1, total: 1, label: 'Extracting printable strings' });
    const report = await triageFile(file, context?.signal);
    return {
      success: true,
      summary: `Found ${report.printableStrings.length} printable string(s) and ${report.iocs.length} IOC candidate(s)`,
      data: { report },
      rawOutput: [
        `File: ${report.fileName}`,
        `Embedded URLs: ${report.embeddedUrls.length}`,
        `IOC Candidates: ${report.iocs.length}`,
        '',
        ...report.printableStrings.slice(0, 120),
      ].join('\n'),
      explanation: 'Strings are extracted locally from printable ASCII ranges. The same local pass also surfaces embedded URLs and IOC candidates from strings and metadata.',
      items: [
        { label: 'Printable Strings', value: String(report.printableStrings.length), status: report.printableStrings.length ? 'info' as const : 'pass' as const },
        { label: 'Embedded URLs', value: String(report.embeddedUrls.length), status: report.embeddedUrls.length ? 'warn' as const : 'pass' as const },
        { label: 'IOC Candidates', value: String(report.iocs.length), status: report.iocs.length ? 'warn' as const : 'pass' as const },
        { label: 'Entropy', value: String(report.entropy), status: report.entropy > 5 ? 'warn' as const : 'info' as const },
      ],
    };
  },
};

export const iocExtractorTool: ToolDefinition = {
  id: 'ioc-extractor', slug: 'ioc-extractor', name: 'IOC Extractor', category: 'forensics',
  description: 'Extract and validate local IOC candidates from text or files, including defanged IPs, domains, URLs, emails, and hashes.',
  shortDescription: 'Extract and validate IOCs locally',
  tags: ['ioc', 'indicator', 'threat', 'ip', 'hash'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [
    { id: 'input', label: 'Text / Logs', type: 'textarea', placeholder: 'Paste logs, alert text, or decoded strings...' },
    { id: 'file', label: 'Optional File', type: 'file', helperText: 'Optional local file. Strings and metadata are scanned locally without upload.' },
    { id: 'enableEnrichment', label: 'Explicitly allow provider enrichment', type: 'checkbox', defaultValue: false, helperText: 'Disabled by default. This build performs local analysis only unless a provider is configured later.' },
  ],
  execute: async (inputs, context) => {
    const pasted = optionalString(inputs.input).trim();
    const file = inputs.file instanceof File ? assertFile(inputs.file, 'Optional file', LOCAL_ANALYSIS_MAX_FILE_BYTES) : null;
    if (!pasted && !file) throw new Error('Provide text, a file, or both for IOC extraction.');

    context?.onProgress?.({ current: 1, total: file ? 2 : 1, label: 'Extracting IOC candidates' });
    const iocs = extractIocsFromText(pasted, 'pasted-input');
    let fileReport = null;
    if (file) {
      context?.onProgress?.({ current: 2, total: 2, label: 'Analyzing file strings and metadata' });
      fileReport = await triageFile(file, context?.signal);
      for (const ioc of fileReport.iocs) iocs.push(ioc);
    }

    const deduped = Array.from(new Map(iocs.map((ioc) => [`${ioc.type}:${ioc.normalized.toLowerCase()}`, ioc])).values());
    const validCount = deduped.filter((ioc) => ioc.valid).length;
    const enrichmentRequested = Boolean(inputs.enableEnrichment);
    return {
      success: true,
      summary: `${deduped.length} IOC candidate(s), ${validCount} validated locally${enrichmentRequested ? '; provider enrichment not configured' : ''}`,
      data: { iocs: deduped, fileReport, enrichmentRequested, enrichmentPerformed: false },
      rawOutput: deduped.length
        ? deduped.map((ioc) => `${ioc.type.toUpperCase()} [${ioc.confidence}] ${ioc.normalized}${ioc.defanged ? ' (defanged source)' : ''}`).join('\n')
        : 'No IOCs found',
      explanation: enrichmentRequested
        ? 'Local extraction and validation completed. Provider enrichment was explicitly requested, but this build has no external enrichment provider configured, so no indicators left the browser.'
        : 'IOC extraction and validation completed locally. No provider enrichment was requested or performed.',
      items: [
        { label: 'IOC Candidates', value: String(deduped.length), status: deduped.length ? 'warn' as const : 'pass' as const },
        { label: 'Validated', value: String(validCount), status: validCount ? 'pass' as const : 'info' as const },
        { label: 'Defanged Inputs', value: String(deduped.filter((ioc) => ioc.defanged).length), status: 'info' as const },
        { label: 'Enrichment', value: enrichmentRequested ? 'Requested but not configured' : 'Local only', status: enrichmentRequested ? 'warn' as const : 'pass' as const },
      ],
    };
  },
};

export const forensicsTools: ToolDefinition[] = [exifViewerTool, mimeCheckerTool, magicBytesTool, stringExtractorTool, iocExtractorTool];
