import type { ToolMetadata } from '@/lib/tools/metadata';
import { executeTransformOperation } from './engine';

export interface QuickRunOptions {
  input: string;
  mode?: string;
  /** Caesar cipher shift. Defaults to the classic ROT-3 rotation. */
  shift?: number;
  /** XOR key applied by the XOR helper. Defaults to a single-byte 'A' key. */
  xorKey?: string;
  /** Separator inserted between hex pairs. */
  separator?: string;
}

export const QUICK_RUN_DEFAULTS = {
  shift: 3,
  xorKey: 'A',
  separator: ' ',
} as const;

const transformToolIds = new Set([
  'base64',
  'url-encoder',
  'html-entity',
  'hex-converter',
  'binary-converter',
  'unicode-converter',
  'rot13',
  'caesar-cipher',
  'morse-code',
  'xor-helper',
]);

/** Tool ids whose quick-run output depends on an extra parameter. */
export const QUICK_RUN_PARAMETERIZED_TOOL_IDS = {
  shift: 'caesar-cipher',
  xorKey: 'xor-helper',
} as const;

export function canQuickRunTransformTool(toolId: string) {
  return transformToolIds.has(toolId);
}

export async function quickRunTransformTool(tool: ToolMetadata, options: QuickRunOptions) {
  const input = options.input;
  const mode = options.mode || 'encode';
  const shift = Number.isFinite(options.shift) ? Number(options.shift) : QUICK_RUN_DEFAULTS.shift;
  const xorKey = options.xorKey && options.xorKey.length > 0 ? options.xorKey : QUICK_RUN_DEFAULTS.xorKey;
  const separator = options.separator ?? QUICK_RUN_DEFAULTS.separator;

  switch (tool.id) {
    case 'base64':
      return executeTransformOperation(mode === 'encode' ? 'base64-encode' : 'base64-decode', input).output;
    case 'url-encoder': {
      const map = {
        encode: 'url-encode',
        decode: 'url-decode',
        encodeComponent: 'url-encode-component',
        decodeComponent: 'url-decode-component',
      } as const;
      return executeTransformOperation(map[mode as keyof typeof map] ?? 'url-encode-component', input).output;
    }
    case 'html-entity':
      return executeTransformOperation(mode === 'encode' ? 'html-encode' : 'html-decode', input).output;
    case 'hex-converter':
      return executeTransformOperation(mode === 'encode' ? 'hex-encode' : 'hex-decode', input, { separator }).output;
    case 'binary-converter':
      return executeTransformOperation(mode === 'encode' ? 'binary-encode' : 'binary-decode', input).output;
    case 'unicode-converter':
      return executeTransformOperation(mode === 'encode' ? 'unicode-encode' : 'unicode-decode', input).output;
    case 'rot13':
      return executeTransformOperation('rot13', input).output;
    case 'caesar-cipher':
      return executeTransformOperation(mode === 'decrypt' ? 'caesar-decrypt' : 'caesar-encrypt', input, { shift }).output;
    case 'morse-code':
      return executeTransformOperation(mode === 'encode' ? 'morse-encode' : 'morse-decode', input).output;
    case 'xor-helper':
      return executeTransformOperation('xor-text', input, { xorKey, xorInputFormat: 'text' }).output;
    default:
      throw new Error(`Unsupported quick-run transform tool: ${tool.id}`);
  }
}
