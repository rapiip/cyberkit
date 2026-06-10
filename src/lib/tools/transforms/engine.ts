export type TransformOperationId =
  | 'base64-encode'
  | 'base64-decode'
  | 'base64url-encode'
  | 'base64url-decode'
  | 'url-encode'
  | 'url-decode'
  | 'url-encode-component'
  | 'url-decode-component'
  | 'html-encode'
  | 'html-decode'
  | 'hex-encode'
  | 'hex-decode'
  | 'binary-encode'
  | 'binary-decode'
  | 'unicode-encode'
  | 'unicode-decode'
  | 'rot13'
  | 'caesar-encrypt'
  | 'caesar-decrypt'
  | 'morse-encode'
  | 'morse-decode'
  | 'xor-text'
  | 'xor-hex';

export type TransformEncoding = 'utf8' | 'hex' | 'base64url' | 'raw-bytes';

export interface TransformSuggestion {
  operationId: TransformOperationId;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface TransformStep {
  id: string;
  operationId: TransformOperationId;
  enabled: boolean;
  options?: {
    shift?: number;
    separator?: string;
    xorKey?: string;
    xorInputFormat?: 'text' | 'hex';
  };
}

export interface TransformExecutionResult {
  output: string;
  operationId: TransformOperationId;
}

const textEncoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const reverseHtmlEntities = Object.fromEntries(
  Object.entries(htmlEntities).map(([key, value]) => [value, key])
);

const morseMap: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  0: '-----',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
  ' ': '/',
};

const reverseMorseMap = Object.fromEntries(
  Object.entries(morseMap).map(([key, value]) => [value, key])
);

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(input: string) {
  return Uint8Array.from(atob(input), (character) => character.charCodeAt(0));
}

function normalizeBase64(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const padding = normalized.length % 4;
  if (padding === 1) {
    throw new Error('Invalid Base64 input length.');
  }
  return `${normalized}${padding ? '='.repeat(4 - padding) : ''}`;
}

function toBase64Url(input: string) {
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeUtf8(bytes: Uint8Array) {
  return utf8Decoder.decode(bytes);
}

function fromHex(input: string) {
  const cleaned = input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (!cleaned || cleaned.length % 2 !== 0 || /[^0-9a-fA-F]/.test(cleaned)) {
    throw new Error('Invalid hex input. Use complete byte pairs such as 48 65 6c 6c 6f.');
  }
  const pairs = cleaned.match(/.{1,2}/g) || [];
  return Uint8Array.from(pairs.map((pair) => parseInt(pair, 16)));
}

function toHex(input: Uint8Array, separator = ' ') {
  const encoded = Array.from(input, (byte) => byte.toString(16).padStart(2, '0'));
  return separator === '0x'
    ? encoded.map((pair) => `0x${pair}`).join(' ')
    : encoded.join(separator);
}

function fromBinary(input: string) {
  if (/[^01\s]/.test(input)) {
    throw new Error('Invalid binary input. Only 0, 1, and whitespace are allowed.');
  }
  const cleaned = input.replace(/\s/g, '');
  if (!cleaned || cleaned.length % 8 !== 0) {
    throw new Error('Invalid binary input. Use complete 8-bit bytes.');
  }
  const bytes = cleaned.match(/.{1,8}/g) || [];
  return Uint8Array.from(bytes.map((byte) => parseInt(byte, 2)));
}

function toBinary(input: Uint8Array) {
  return Array.from(input, (byte) => byte.toString(2).padStart(8, '0')).join(' ');
}

function caesarShift(input: string, shift: number) {
  return input.replace(/[a-zA-Z]/g, (character) => {
    const base = character <= 'Z' ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base + shift + 26) % 26) + base);
  });
}

function xorBytes(input: Uint8Array, key: Uint8Array) {
  if (key.length === 0) {
    throw new Error('XOR key is required.');
  }
  return Uint8Array.from(input, (byte, index) => byte ^ key[index % key.length]);
}

function parseXorKey(key: string) {
  if (!key.length) {
    throw new Error('XOR key is required.');
  }
  if (key.startsWith('0x')) {
    if (!/^0x[0-9a-fA-F]{2}$/.test(key)) {
      throw new Error('Hex XOR key must be a single byte like 0x41.');
    }
    return Uint8Array.from([parseInt(key, 16)]);
  }
  return textEncoder.encode(key);
}

function bytesToRawString(bytes: Uint8Array) {
  let result = '';
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return result;
}

function rawStringToBytes(input: string) {
  return Uint8Array.from(Array.from(input, (character) => character.charCodeAt(0) & 0xff));
}

export function parseTransformInput(input: string, encoding: TransformEncoding) {
  switch (encoding) {
    case 'utf8':
      return textEncoder.encode(input);
    case 'hex':
      return fromHex(input);
    case 'base64url':
      return base64ToBytes(normalizeBase64(input));
    case 'raw-bytes':
      return rawStringToBytes(input);
    default: {
      const exhaustive: never = encoding;
      throw new Error(`Unsupported input encoding: ${exhaustive}`);
    }
  }
}

export function formatTransformOutput(bytes: Uint8Array, encoding: TransformEncoding) {
  switch (encoding) {
    case 'utf8':
      return decodeUtf8(bytes);
    case 'hex':
      return toHex(bytes, ' ');
    case 'base64url':
      return toBase64Url(bytesToBase64(bytes));
    case 'raw-bytes':
      return bytesToRawString(bytes);
    default: {
      const exhaustive: never = encoding;
      throw new Error(`Unsupported output encoding: ${exhaustive}`);
    }
  }
}

function textBytesOperation(inputBytes: Uint8Array, transform: (input: string) => string) {
  return textEncoder.encode(transform(decodeUtf8(inputBytes)));
}

export function listTransformOperations() {
  return [
    { id: 'base64-encode', label: 'Base64 Encode' },
    { id: 'base64-decode', label: 'Base64 Decode' },
    { id: 'base64url-encode', label: 'Base64URL Encode' },
    { id: 'base64url-decode', label: 'Base64URL Decode' },
    { id: 'url-encode', label: 'URL Encode' },
    { id: 'url-decode', label: 'URL Decode' },
    { id: 'url-encode-component', label: 'URL Encode Component' },
    { id: 'url-decode-component', label: 'URL Decode Component' },
    { id: 'html-encode', label: 'HTML Entity Encode' },
    { id: 'html-decode', label: 'HTML Entity Decode' },
    { id: 'hex-encode', label: 'Hex Encode' },
    { id: 'hex-decode', label: 'Hex Decode' },
    { id: 'binary-encode', label: 'Binary Encode' },
    { id: 'binary-decode', label: 'Binary Decode' },
    { id: 'unicode-encode', label: 'Unicode Encode' },
    { id: 'unicode-decode', label: 'Unicode Decode' },
    { id: 'rot13', label: 'ROT13' },
    { id: 'caesar-encrypt', label: 'Caesar Encrypt' },
    { id: 'caesar-decrypt', label: 'Caesar Decrypt' },
    { id: 'morse-encode', label: 'Morse Encode' },
    { id: 'morse-decode', label: 'Morse Decode' },
    { id: 'xor-text', label: 'XOR to Text' },
    { id: 'xor-hex', label: 'XOR to Hex' },
  ] as const;
}

export function listTransformEncodings() {
  return [
    { id: 'utf8', label: 'UTF-8 Text' },
    { id: 'hex', label: 'Hex Bytes' },
    { id: 'base64url', label: 'Base64URL' },
    { id: 'raw-bytes', label: 'Raw Byte String' },
  ] as const;
}

export function suggestTransformOperations(input: string): TransformSuggestion[] {
  const suggestions: TransformSuggestion[] = [];
  const trimmed = input.trim();
  if (!trimmed) {
    return suggestions;
  }
  if (/^(?:[A-Za-z0-9+/_-]{4})*(?:[A-Za-z0-9+/_-]{2}==|[A-Za-z0-9+/_-]{3}=)?$/.test(trimmed) && trimmed.length >= 8) {
    suggestions.push({
      operationId: trimmed.includes('-') || trimmed.includes('_') ? 'base64url-decode' : 'base64-decode',
      confidence: 'medium',
      reason: 'Input matches a Base64-like alphabet and padding pattern.',
    });
  }
  if (/^(?:0x)?[0-9a-fA-F\s:]+$/.test(trimmed) && trimmed.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '').length >= 4) {
    suggestions.push({
      operationId: 'hex-decode',
      confidence: 'high',
      reason: 'Input looks like hexadecimal byte pairs.',
    });
  }
  if (/^[01\s]{8,}$/.test(trimmed)) {
    suggestions.push({
      operationId: 'binary-decode',
      confidence: 'high',
      reason: 'Input contains only binary digits and whitespace.',
    });
  }
  if (/^(?:[.-]+\s+)+(?:[.-]+|\/)$/.test(trimmed) || /^[./\-\s]+$/.test(trimmed)) {
    suggestions.push({
      operationId: 'morse-decode',
      confidence: 'medium',
      reason: 'Input resembles Morse code tokens.',
    });
  }
  if (/U\+[0-9A-Fa-f]{4,6}/.test(trimmed)) {
    suggestions.push({
      operationId: 'unicode-decode',
      confidence: 'high',
      reason: 'Input contains Unicode code point notation.',
    });
  }
  if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
    suggestions.push({
      operationId: 'url-decode-component',
      confidence: 'medium',
      reason: 'Input contains percent-encoded bytes.',
    });
  }
  return suggestions;
}

export function executeTransformOperationToBytes(
  operationId: TransformOperationId,
  inputBytes: Uint8Array,
  options: TransformStep['options'] = {}
) {
  switch (operationId) {
    case 'base64-encode':
      return textEncoder.encode(bytesToBase64(inputBytes));
    case 'base64-decode':
      return base64ToBytes(normalizeBase64(bytesToRawString(inputBytes)));
    case 'base64url-encode':
      return textEncoder.encode(toBase64Url(bytesToBase64(inputBytes)));
    case 'base64url-decode':
      return base64ToBytes(normalizeBase64(bytesToRawString(inputBytes)));
    case 'url-encode':
      return textBytesOperation(inputBytes, (input) => encodeURI(input));
    case 'url-decode':
      return textBytesOperation(inputBytes, (input) => decodeURI(input));
    case 'url-encode-component':
      return textBytesOperation(inputBytes, (input) => encodeURIComponent(input));
    case 'url-decode-component':
      return textBytesOperation(inputBytes, (input) => decodeURIComponent(input));
    case 'html-encode':
      return textBytesOperation(inputBytes, (input) =>
        input.replace(/[&<>"'`=/]/g, (character) => htmlEntities[character] || character)
      );
    case 'html-decode':
      return textBytesOperation(inputBytes, (input) =>
        input.replace(
          /&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g,
          (entity) => reverseHtmlEntities[entity] || entity
        )
      );
    case 'hex-encode':
      return textEncoder.encode(toHex(inputBytes, options.separator || ' '));
    case 'hex-decode':
      return fromHex(bytesToRawString(inputBytes));
    case 'binary-encode':
      return textEncoder.encode(toBinary(inputBytes));
    case 'binary-decode':
      return fromBinary(bytesToRawString(inputBytes));
    case 'unicode-encode':
      return textBytesOperation(inputBytes, (input) =>
        Array.from(input)
          .map((character) => `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
          .join(' ')
      );
    case 'unicode-decode':
      return textBytesOperation(inputBytes, (input) => {
        const matches = input.match(/U\+([0-9A-Fa-f]+)/g);
        if (!matches?.length) {
          throw new Error('Invalid Unicode input. Use U+0041 style code points.');
        }
        return matches
          .map((codePoint) => String.fromCodePoint(parseInt(codePoint.replace('U+', ''), 16)))
          .join('');
      });
    case 'rot13':
      return textBytesOperation(inputBytes, (input) => caesarShift(input, 13));
    case 'caesar-encrypt':
      return textBytesOperation(inputBytes, (input) => caesarShift(input, options.shift ?? 3));
    case 'caesar-decrypt':
      return textBytesOperation(inputBytes, (input) => caesarShift(input, -(options.shift ?? 3)));
    case 'morse-encode':
      return textBytesOperation(inputBytes, (input) =>
        input
          .toUpperCase()
          .split('')
          .map((character) => morseMap[character] || character)
          .join(' ')
      );
    case 'morse-decode':
      return textBytesOperation(inputBytes, (input) =>
        input
          .split(' / ')
          .map((word) => word.split(/\s+/).map((token) => reverseMorseMap[token] || token).join(''))
          .join(' ')
      );
    case 'xor-text':
    case 'xor-hex': {
      const sourceBytes =
        options.xorInputFormat === 'hex' ? fromHex(bytesToRawString(inputBytes)) : inputBytes;
      const result = xorBytes(sourceBytes, parseXorKey(options.xorKey || ''));
      return operationId === 'xor-hex' ? textEncoder.encode(toHex(result, ' ')) : result;
    }
    default: {
      const exhaustive: never = operationId;
      throw new Error(`Unsupported transform operation: ${exhaustive}`);
    }
  }
}

export function executeTransformOperation(
  operationId: TransformOperationId,
  input: string,
  options: TransformStep['options'] = {}
): TransformExecutionResult {
  const outputBytes = executeTransformOperationToBytes(operationId, textEncoder.encode(input), options);
  return {
    operationId,
    output: decodeUtf8(outputBytes),
  };
}

export function executeTransformPipeline(input: string, steps: TransformStep[]) {
  return executeTransformPipelineWithEncodings(input, steps, 'utf8', 'utf8');
}

export function executeTransformPipelineWithEncodings(
  input: string,
  steps: TransformStep[],
  inputEncoding: TransformEncoding,
  outputEncoding: TransformEncoding
) {
  const history: Array<{ step: TransformStep; output: string }> = [];
  let currentBytes = parseTransformInput(input, inputEncoding);
  for (const step of steps) {
    if (!step.enabled) {
      continue;
    }
    currentBytes = executeTransformOperationToBytes(step.operationId, currentBytes, step.options);
    history.push({
      step,
      output: formatTransformOutput(currentBytes, outputEncoding),
    });
  }
  return {
    output: formatTransformOutput(currentBytes, outputEncoding),
    history,
  };
}

export function formatTransformBytesForSummary(bytes: Uint8Array) {
  return {
    utf8: (() => {
      try {
        return decodeUtf8(bytes);
      } catch {
        return '[invalid UTF-8 bytes]';
      }
    })(),
    hex: toHex(bytes, ' '),
    base64url: toBase64Url(bytesToBase64(bytes)),
    rawBytesLength: bytes.length,
  };
}
