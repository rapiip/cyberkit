export type JwtVerificationStatus = 'not-requested' | 'verified' | 'failed' | 'unsupported';

export interface JwtWarning {
  id: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface JwtInspectionOptions {
  nowSeconds?: number;
  clockSkewSeconds?: number;
  secret?: string;
  publicKeyPem?: string;
  jwksJson?: string;
}

function base64UrlToBytes(segment: string, allowEmpty = false): Uint8Array {
  if (!segment && allowEmpty) return new Uint8Array();
  if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) {
    throw new Error('JWT segment is not strict unpadded Base64URL.');
  }
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('JWT segment contains invalid Base64URL data.');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== segment) {
    throw new Error('JWT segment is not canonically encoded Base64URL.');
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function parseJsonObject(segment: string, label: string): Record<string, unknown> {
  const bytes = base64UrlToBytes(segment);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not valid UTF-8.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function numericClaim(payload: Record<string, unknown>, name: string): number | undefined {
  const value = payload[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`JWT claim "${name}" must be a finite NumericDate.`);
  }
  return value;
}

function stringClaim(payload: Record<string, unknown>, name: string): string | undefined {
  const value = payload[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`JWT claim "${name}" must be a string.`);
  return value;
}

function audienceClaim(payload: Record<string, unknown>): string | string[] | undefined {
  const value = payload.aud;
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  throw new Error('JWT claim "aud" must be a string or an array of strings.');
}

function maskValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= 4) return '***';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  if (Array.isArray(value)) return value.map(maskValue);
  return value;
}

function redactClaims(payload: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKey = /(^sub$|^jti$|email|phone|address|name|token|secret|password|session|account)/i;
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (sensitiveKey.test(key)) return [key, maskValue(value)];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, redactClaims(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}

function pemToBytes(pem: string): Uint8Array {
  const normalized = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!normalized) throw new Error('Public key must be an SPKI PEM public key.');
  try {
    return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  } catch {
    throw new Error('Public key PEM contains invalid Base64.');
  }
}

function algorithmParameters(algorithm: string) {
  const hash = algorithm.endsWith('256')
    ? 'SHA-256'
    : algorithm.endsWith('384')
      ? 'SHA-384'
      : algorithm.endsWith('512')
        ? 'SHA-512'
        : null;
  return hash;
}

async function verifySignature(
  algorithm: string,
  kid: unknown,
  signingInput: Uint8Array,
  signature: Uint8Array,
  options: JwtInspectionOptions
): Promise<{ status: JwtVerificationStatus; message: string }> {
  const requested = Boolean(options.secret || options.publicKeyPem || options.jwksJson);
  if (!requested) return { status: 'not-requested', message: 'Signature was not verified.' };
  if (algorithm === 'none') return { status: 'failed', message: 'Unsigned tokens cannot pass signature verification.' };

  const hash = algorithmParameters(algorithm);
  if (!hash) return { status: 'unsupported', message: `Verification for ${algorithm} is not supported.` };

  try {
    let key: CryptoKey;
    let verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
    if (algorithm.startsWith('HS')) {
      if (!options.secret) return { status: 'failed', message: `${algorithm} requires a shared secret.` };
      key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(options.secret),
        { name: 'HMAC', hash },
        false,
        ['verify']
      );
      verifyAlgorithm = { name: 'HMAC' };
    } else if (algorithm.startsWith('RS')) {
      const importAlgorithm = { name: 'RSASSA-PKCS1-v1_5', hash };
      if (options.jwksJson) {
        const parsed = JSON.parse(options.jwksJson) as {
          keys?: Array<JsonWebKey & { kid?: string; use?: string }>;
        };
        if (!Array.isArray(parsed.keys)) throw new Error('JWKS must contain a keys array.');
        const jwk = parsed.keys.find((candidate) =>
          typeof kid === 'string' ? candidate.kid === kid : candidate.use === 'sig'
        ) ?? parsed.keys[0];
        if (!jwk) throw new Error('JWKS does not contain a verification key.');
        key = await crypto.subtle.importKey('jwk', jwk, importAlgorithm, false, ['verify']);
      } else if (options.publicKeyPem) {
        key = await crypto.subtle.importKey(
          'spki',
          toArrayBuffer(pemToBytes(options.publicKeyPem)),
          importAlgorithm,
          false,
          ['verify']
        );
      } else {
        return { status: 'failed', message: `${algorithm} requires an SPKI public key or JWKS.` };
      }
      verifyAlgorithm = { name: 'RSASSA-PKCS1-v1_5' };
    } else {
      return { status: 'unsupported', message: `Verification for ${algorithm} is not supported.` };
    }

    const verified = await crypto.subtle.verify(
      verifyAlgorithm,
      key,
      toArrayBuffer(signature),
      toArrayBuffer(signingInput)
    );
    return verified
      ? { status: 'verified', message: 'Signature cryptographically verified.' }
      : { status: 'failed', message: 'Signature verification failed.' };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Signature verification failed.',
    };
  }
}

export async function inspectJwt(token: string, options: JwtInspectionOptions = {}) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT must contain exactly three dot-separated segments.');
  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header = parseJsonObject(headerSegment, 'JWT header');
  const payload = parseJsonObject(payloadSegment, 'JWT payload');
  const algorithm = header.alg;
  if (typeof algorithm !== 'string' || !algorithm) throw new Error('JWT header "alg" must be a non-empty string.');

  const signature = base64UrlToBytes(signatureSegment, algorithm === 'none');
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = Math.min(Math.max(options.clockSkewSeconds ?? 60, 0), 3600);
  const exp = numericClaim(payload, 'exp');
  const nbf = numericClaim(payload, 'nbf');
  const iat = numericClaim(payload, 'iat');
  const iss = stringClaim(payload, 'iss');
  const sub = stringClaim(payload, 'sub');
  const jti = stringClaim(payload, 'jti');
  const aud = audienceClaim(payload);
  const warnings: JwtWarning[] = [];

  if (algorithm === 'none') {
    warnings.push({ id: 'alg-none', message: 'alg=none declares an unsigned token.', severity: 'critical' });
    if (signature.length > 0) throw new Error('alg=none token must have an empty signature segment.');
  } else if (!signature.length) {
    warnings.push({ id: 'missing-signature', message: 'Signed algorithm has an empty signature.', severity: 'critical' });
  }
  if (['HS1', 'RS1', 'ES1'].includes(algorithm) || !/^(HS|RS)(256|384|512)$/.test(algorithm)) {
    warnings.push({ id: 'weak-algorithm', message: `Algorithm ${algorithm} is weak, unknown, or unsupported.`, severity: 'high' });
  }
  if (exp === undefined) {
    warnings.push({ id: 'missing-exp', message: 'Token has no exp claim.', severity: 'medium' });
  } else if (exp < now - skew) {
    warnings.push({ id: 'expired', message: `Token expired at ${new Date(exp * 1000).toISOString()}.`, severity: 'high' });
  } else if (exp < now) {
    warnings.push({ id: 'expiry-skew', message: 'Token is expired by wall clock but remains inside the configured skew window.', severity: 'low' });
  }
  if (nbf !== undefined && nbf > now + skew) {
    warnings.push({ id: 'not-before', message: `Token is not active until ${new Date(nbf * 1000).toISOString()}.`, severity: 'high' });
  }
  if (iat !== undefined && iat > now + skew) {
    warnings.push({ id: 'future-iat', message: 'iat is in the future beyond the configured clock skew.', severity: 'medium' });
  }
  if (iat !== undefined && exp !== undefined) {
    const lifetime = exp - iat;
    if (lifetime < 0) {
      warnings.push({ id: 'negative-lifetime', message: 'exp occurs before iat.', severity: 'high' });
    } else if (lifetime > 86_400) {
      warnings.push({ id: 'suspicious-lifetime', message: `Token lifetime is ${Math.round(lifetime / 3600)} hours.`, severity: 'medium' });
    }
  }

  const signingInput = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
  const verification = await verifySignature(algorithm, header.kid, signingInput, signature, options);
  if (verification.status === 'failed') {
    warnings.push({ id: 'signature-failed', message: verification.message, severity: 'critical' });
  } else if (verification.status === 'unsupported') {
    warnings.push({ id: 'signature-unsupported', message: verification.message, severity: 'high' });
  }

  const maskedSub = sub === undefined ? undefined : String(maskValue(sub));
  const maskedJti = jti === undefined ? undefined : String(maskValue(jti));
  return {
    header,
    payload: redactClaims(payload),
    claims: {
      exp,
      nbf,
      iat,
      iss,
      aud,
      sub: maskedSub,
      jti: maskedJti,
    },
    algorithm,
    clockSkewSeconds: skew,
    verification,
    warnings,
  };
}
