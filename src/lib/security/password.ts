import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const PASSPHRASE_WORDS = [
  'amber', 'anchor', 'apricot', 'arrow', 'atlas', 'aurora', 'bamboo', 'beacon',
  'birch', 'breeze', 'bridge', 'cactus', 'canyon', 'cedar', 'cinder', 'cobalt',
  'comet', 'coral', 'cosmos', 'crystal', 'dahlia', 'delta', 'ember', 'falcon',
  'fern', 'fjord', 'forest', 'frost', 'galaxy', 'garden', 'garnet', 'glacier',
  'harbor', 'hazel', 'horizon', 'indigo', 'island', 'ivory', 'jade', 'jasmine',
  'jigsaw', 'juniper', 'lagoon', 'lantern', 'laurel', 'lilac', 'lotus', 'lunar',
  'maple', 'marble', 'meadow', 'meteor', 'mint', 'nebula', 'nectar', 'oasis',
  'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid', 'pebble', 'pepper',
  'pine', 'plasma', 'plum', 'prairie', 'prism', 'quartz', 'raven', 'reef',
  'river', 'robin', 'saffron', 'sage', 'saturn', 'scarlet', 'shadow', 'silver',
  'skyline', 'solar', 'spruce', 'stone', 'storm', 'summit', 'sunset', 'tango',
  'thistle', 'timber', 'topaz', 'tulip', 'valley', 'velvet', 'violet', 'willow',
  'winter', 'zenith',
] as const;

zxcvbnOptions.setOptions({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
});

export interface PasswordCategoryOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export interface PwnedRangeEntry {
  suffix: string;
  count: number;
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error('Random upper bound must be between 1 and 2^32.');
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

function randomCharacter(charset: string): string {
  return charset[secureRandomInt(charset.length)];
}

function secureShuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export function generatePassword(length: number, categories: PasswordCategoryOptions): string {
  const selected = [
    categories.uppercase ? UPPERCASE : '',
    categories.lowercase ? LOWERCASE : '',
    categories.numbers ? NUMBERS : '',
    categories.symbols ? SYMBOLS : '',
  ].filter(Boolean);
  if (!selected.length) throw new Error('Select at least one character category.');
  if (length < selected.length) {
    throw new Error(`Password length must be at least ${selected.length} for the selected categories.`);
  }

  const combined = selected.join('');
  const characters = selected.map(randomCharacter);
  while (characters.length < length) characters.push(randomCharacter(combined));
  return secureShuffle(characters).join('');
}

export function generatePassphrase(
  wordCount: number,
  separator: string,
  capitalize: boolean,
  includeNumber: boolean
): string {
  const words = Array.from({ length: wordCount }, () => {
    const word = PASSPHRASE_WORDS[secureRandomInt(PASSPHRASE_WORDS.length)];
    return capitalize ? `${word[0].toUpperCase()}${word.slice(1)}` : word;
  });
  if (includeNumber) words.push(String(secureRandomInt(100)).padStart(2, '0'));
  return secureShuffle(words).join(separator);
}

export function estimatePasswordStrength(password: string) {
  return zxcvbn(password);
}

export async function sha1RangeParts(password: string) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return { prefix: hex.slice(0, 5), suffix: hex.slice(5) };
}

export function findPwnedSuffix(range: PwnedRangeEntry[], suffix: string): number {
  return range.find((entry) => entry.suffix === suffix)?.count ?? 0;
}

export async function checkPwnedPassword(password: string) {
  const { prefix, suffix } = await sha1RangeParts(password);
  const response = await fetch('/api/pwned-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashPrefix: prefix }),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    error?: string;
    provider?: string;
    hashPrefix?: string;
    range?: PwnedRangeEntry[];
  };
  if (!response.ok || !payload.success || !Array.isArray(payload.range)) {
    throw new Error(payload.message || payload.error || 'Pwned Passwords range lookup failed.');
  }
  const breachCount = findPwnedSuffix(payload.range, suffix);
  return {
    provider: payload.provider || 'Have I Been Pwned Pwned Passwords',
    hashPrefix: prefix,
    pwned: breachCount > 0,
    breachCount,
  };
}
