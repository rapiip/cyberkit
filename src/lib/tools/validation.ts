export const MAX_TEXT_INPUT = 200_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function asString(value: unknown, label: string, maxLength = MAX_TEXT_INPUT) {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  if (!value.length) throw new Error(`${label} is required`);
  if (value.length > maxLength) throw new Error(`${label} is too large. Maximum ${maxLength.toLocaleString()} characters.`);
  return value;
}

export function optionalString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function assertFile(value: unknown, label = 'File', maxBytes = MAX_FILE_BYTES) {
  if (!(value instanceof File)) throw new Error(`${label} is required`);
  if (value.size === 0) throw new Error(`${label} is empty`);
  if (value.size > maxBytes) throw new Error(`${label} is too large. Maximum ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`);
  return value;
}

export function assertFiles(value: unknown, label = 'Files', maxBytes = MAX_FILE_BYTES) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} are required`);
  return value.map((item, index) => assertFile(item, `${label} item ${index + 1}`, maxBytes));
}

export function errorResult(error: unknown, fallback = 'Tool execution failed') {
  const message = error instanceof Error ? error.message : fallback;
  return { success: false, summary: message, data: {}, rawOutput: `Error: ${message}` };
}

export function hasNestedQuantifier(pattern: string) {
  return /(\([^)]*[+*][^)]*\)|\[[^\]]+\])[+*{]/.test(pattern) || /([+*}])\s*[+*{]/.test(pattern);
}
