import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CloudSyncDecryptionError,
  decryptSyncData,
  encryptSyncData,
} from '../src/lib/security/cloud-sync';
import { inspectJwt } from '../src/lib/security/jwt';
import {
  estimatePasswordStrength,
  generatePassphrase,
  generatePassword,
  secureRandomInt,
} from '../src/lib/security/password';
import { validateImportedCyberKitData, useHistoryStore, useReportsStore } from '../src/lib/store';

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function unsignedToken(header: Record<string, unknown>, payload: Record<string, unknown>) {
  return `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}.`;
}

async function hmacToken(payload: Record<string, unknown>, secret: string) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

test('password generator guarantees every selected category', () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const password = generatePassword(20, {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[^A-Za-z0-9]/);
  }
  assert.throws(
    () => generatePassword(12, { uppercase: false, lowercase: false, numbers: false, symbols: false }),
    /at least one/i
  );
});

test('secure random selection stays inside bounds and passphrases use requested shape', () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = secureRandomInt(7);
    assert.equal(value >= 0 && value < 7, true);
  }
  const passphrase = generatePassphrase(5, '-', true, true);
  assert.equal(passphrase.split('-').length, 6);
  assert.match(passphrase, /\d{2}/);
});

test('zxcvbn-ts reports weak patterns and stronger generated passwords', () => {
  const weak = estimatePasswordStrength('password123');
  const strong = estimatePasswordStrength('Quartz!Orbit7-Cedar$Frost');
  assert.equal(weak.score < strong.score, true);
  assert.equal(Boolean(weak.feedback.warning), true);
  assert.equal(typeof strong.crackTimesDisplay.offlineFastHashing1e10PerSecond, 'string');
});

test('Cloud Sync encrypts, authenticates, versions, and rejects wrong passphrases', async () => {
  const plaintext = { history: [{ input: 'private-value' }], favorites: [], reports: [] };
  const first = await encryptSyncData(plaintext, 'correct horse battery staple');
  const second = await encryptSyncData(plaintext, 'correct horse battery staple');
  assert.equal(first.version, 1);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.salt, second.salt);
  assert.equal(JSON.stringify(first).includes('private-value'), false);
  assert.deepEqual(await decryptSyncData(first, 'correct horse battery staple'), plaintext);
  await assert.rejects(
    () => decryptSyncData(first, 'wrong passphrase with enough length'),
    CloudSyncDecryptionError
  );
  const tampered = { ...first, ciphertext: `${first.ciphertext.slice(0, -4)}AAAA` };
  await assert.rejects(
    () => decryptSyncData(tampered, 'correct horse battery staple'),
    CloudSyncDecryptionError
  );
});

test('JWT inspection rejects malformed Base64URL and non-object JSON', async () => {
  await assert.rejects(
    () => inspectJwt('abc=.e30.signature'),
    /Base64URL/
  );
  const arrayHeader = `${base64Url('[]')}.${base64Url('{}')}.`;
  await assert.rejects(() => inspectJwt(arrayHeader), /JSON object/);
});

test('JWT inspection detects unsigned, expired, missing exp, future nbf, and suspicious lifetime', async () => {
  const now = 1_800_000_000;
  const inspected = await inspectJwt(
    unsignedToken(
      { alg: 'none', typ: 'JWT' },
      {
        sub: 'sensitive-subject',
        jti: 'sensitive-identifier',
        iat: now - 200_000,
        exp: now - 120,
        nbf: now + 600,
        iss: 'issuer',
        aud: ['api'],
      }
    ),
    { nowSeconds: now, clockSkewSeconds: 60 }
  );
  const warningIds = inspected.warnings.map((warning) => warning.id);
  assert.equal(warningIds.includes('alg-none'), true);
  assert.equal(warningIds.includes('expired'), true);
  assert.equal(warningIds.includes('not-before'), true);
  assert.equal(warningIds.includes('suspicious-lifetime'), true);
  assert.notEqual(inspected.claims.sub, 'sensitive-subject');
  assert.notEqual(inspected.claims.jti, 'sensitive-identifier');

  const missingExp = await inspectJwt(unsignedToken({ alg: 'none' }, { iat: now }), { nowSeconds: now });
  assert.equal(missingExp.warnings.some((warning) => warning.id === 'missing-exp'), true);
  const weak = await inspectJwt(
    `${base64Url(JSON.stringify({ alg: 'RS1' }))}.${base64Url(JSON.stringify({ exp: now + 100 }))}.${base64Url('signature')}`,
    { nowSeconds: now }
  );
  assert.equal(weak.warnings.some((warning) => warning.id === 'weak-algorithm'), true);
});

test('JWT HMAC verification distinguishes verified and failed signatures', async () => {
  const token = await hmacToken({ exp: 2_000_000_000, sub: 'private-subject' }, 'shared-secret');
  const verified = await inspectJwt(token, { secret: 'shared-secret', nowSeconds: 1_900_000_000 });
  const failed = await inspectJwt(token, { secret: 'wrong-secret', nowSeconds: 1_900_000_000 });
  assert.equal(verified.verification.status, 'verified');
  assert.equal(failed.verification.status, 'failed');
});

test('JWT RSA verification accepts a matching JWKS key', async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  (publicJwk as JsonWebKey & { kid?: string }).kid = 'key-1';
  const header = base64Url(JSON.stringify({ alg: 'RS256', kid: 'key-1' }));
  const payload = base64Url(JSON.stringify({ exp: 2_000_000_000 }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  const inspected = await inspectJwt(
    `${signingInput}.${base64Url(new Uint8Array(signature))}`,
    { jwksJson: JSON.stringify({ keys: [publicJwk] }), nowSeconds: 1_900_000_000 }
  );
  assert.equal(inspected.verification.status, 'verified');

  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey));
  const pemBody = Buffer.from(spki).toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  const pem = `-----BEGIN PUBLIC KEY-----\n${pemBody}\n-----END PUBLIC KEY-----`;
  const inspectedWithPem = await inspectJwt(
    `${signingInput}.${base64Url(new Uint8Array(signature))}`,
    { publicKeyPem: pem, nowSeconds: 1_900_000_000 }
  );
  assert.equal(inspectedWithPem.verification.status, 'verified');
});

test('password and JWT tools are filtered from imported history and reports', () => {
  const now = new Date().toISOString();
  const data = validateImportedCyberKitData({
    history: [
      {
        id: 'sensitive',
        toolId: 'password-strength',
        toolName: 'Password Strength',
        input: 'password: secret',
        resultSummary: 'weak',
        rawResult: 'secret',
        status: 'success',
        createdAt: now,
      },
    ],
    favorites: [],
    reports: [
      {
        id: 'report',
        title: 'Sensitive',
        target: 'local',
        content: 'secret',
        format: 'json',
        toolsUsed: ['jwt-decoder'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    exportedAt: now,
  });
  assert.deepEqual(data.history, []);
  assert.deepEqual(data.reports, []);
});

test('stores reject password data before state or localStorage persistence', () => {
  const writes: string[] = [];
  const globals = globalThis as unknown as { window?: unknown; localStorage?: unknown };
  const originalWindow = globals.window;
  const originalStorage = globals.localStorage;
  globals.window = {};
  globals.localStorage = {
    length: 0,
    clear: () => undefined,
    key: () => null,
    setItem: (_key: string, value: string) => writes.push(value),
    getItem: () => null,
    removeItem: () => undefined,
  };
  try {
    useHistoryStore.setState({ entries: [] });
    useReportsStore.setState({ reports: [] });
    useHistoryStore.getState().addEntry({
      toolId: 'pwned-password',
      toolName: 'Pwned Password',
      input: 'password: secret',
      resultSummary: 'found',
      rawResult: 'secret',
      status: 'success',
    });
    useReportsStore.getState().addReport({
      title: 'Password',
      target: 'local',
      content: 'secret',
      format: 'json',
      toolsUsed: ['password-generator'],
    });
    assert.deepEqual(useHistoryStore.getState().entries, []);
    assert.deepEqual(useReportsStore.getState().reports, []);
    assert.equal(writes.some((value) => value.includes('secret')), false);
  } finally {
    if (originalWindow === undefined) delete globals.window;
    else globals.window = originalWindow;
    if (originalStorage === undefined) delete globals.localStorage;
    else globals.localStorage = originalStorage;
  }
});
