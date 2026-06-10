export const CLOUD_SYNC_FORMAT_VERSION = 1;
export const CLOUD_SYNC_PBKDF2_ITERATIONS = 310_000;

export interface EncryptedSyncEnvelope {
  version: 1;
  ciphertext: string;
  iv: string;
  salt: string;
  timestamp: string;
}

export class CloudSyncDecryptionError extends Error {
  code = 'WRONG_PASSPHRASE_OR_CORRUPT_DATA';

  constructor() {
    super('Wrong passphrase or encrypted backup integrity check failed.');
    this.name = 'CloudSyncDecryptionError';
  }
}

function isBase64Bytes(value: unknown, expectedLength?: number): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return false;
  }
  try {
    const decodedLength = atob(value).length;
    return expectedLength === undefined ? decodedLength > 16 && decodedLength <= 5_000_000 : decodedLength === expectedLength;
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new CloudSyncDecryptionError();
  }
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    throw new CloudSyncDecryptionError();
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export function isEncryptedSyncEnvelope(value: unknown): value is EncryptedSyncEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const envelope = value as Record<string, unknown>;
  return (
    Object.keys(envelope).sort().join(',') === 'ciphertext,iv,salt,timestamp,version' &&
    envelope.version === CLOUD_SYNC_FORMAT_VERSION &&
    isBase64Bytes(envelope.ciphertext) &&
    isBase64Bytes(envelope.iv, 12) &&
    isBase64Bytes(envelope.salt, 16) &&
    typeof envelope.timestamp === 'string' &&
    !Number.isNaN(Date.parse(envelope.timestamp)) &&
    envelope.ciphertext.length > 20
  );
}

async function deriveSyncKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (passphrase.length < 16 || passphrase.length > 256) {
    throw new Error('Sync passphrase must be 16-256 characters.');
  }
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations: CLOUD_SYNC_PBKDF2_ITERATIONS,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSyncData(
  data: unknown,
  passphrase: string,
  timestamp = new Date().toISOString()
): Promise<EncryptedSyncEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveSyncKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(`cyberkit-sync:v${CLOUD_SYNC_FORMAT_VERSION}`),
      tagLength: 128,
    },
    key,
    plaintext
  );
  plaintext.fill(0);
  return {
    version: CLOUD_SYNC_FORMAT_VERSION,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    timestamp,
  };
}

export async function decryptSyncData<T>(
  envelope: EncryptedSyncEnvelope,
  passphrase: string
): Promise<T> {
  if (!isEncryptedSyncEnvelope(envelope)) {
    throw new Error('Unsupported or malformed Cloud Sync format.');
  }
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new CloudSyncDecryptionError();
    const key = await deriveSyncKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
        additionalData: new TextEncoder().encode(`cyberkit-sync:v${envelope.version}`),
        tagLength: 128,
      },
      key,
      toArrayBuffer(base64ToBytes(envelope.ciphertext))
    );
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)) as T;
  } catch (error) {
    if (error instanceof Error && error.message === 'Sync passphrase must be 16-256 characters.') throw error;
    throw new CloudSyncDecryptionError();
  }
}
