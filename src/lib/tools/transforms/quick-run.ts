import type { ToolMetadata } from '@/lib/tools/metadata';
import { executeTransformOperation } from './engine';

export interface QuickRunOptions {
  input: string;
  mode?: string;
}

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

export function canQuickRunTransformTool(toolId: string) {
  return transformToolIds.has(toolId);
}

export async function quickRunTransformTool(tool: ToolMetadata, options: QuickRunOptions) {
  const input = options.input;
  const mode = options.mode || 'encode';

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
      return executeTransformOperation(mode === 'encode' ? 'hex-encode' : 'hex-decode', input, { separator: ' ' }).output;
    case 'binary-converter':
      return executeTransformOperation(mode === 'encode' ? 'binary-encode' : 'binary-decode', input).output;
    case 'unicode-converter':
      return executeTransformOperation(mode === 'encode' ? 'unicode-encode' : 'unicode-decode', input).output;
    case 'rot13':
      return executeTransformOperation('rot13', input).output;
    case 'caesar-cipher':
      return executeTransformOperation(mode === 'decrypt' ? 'caesar-decrypt' : 'caesar-encrypt', input, { shift: 3 }).output;
    case 'morse-code':
      return executeTransformOperation(mode === 'encode' ? 'morse-encode' : 'morse-decode', input).output;
    case 'xor-helper':
      return executeTransformOperation('xor-text', input, { xorKey: 'A', xorInputFormat: 'text' }).output;
    default:
      throw new Error(`Unsupported quick-run transform tool: ${tool.id}`);
  }
}
