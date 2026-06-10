import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  errorResponse,
  jsonError,
  parseJsonBody,
  PublicTargetError,
  rateLimitResponse,
} from '@/lib/server/scanner';
import {
  CLOUD_SYNC_FORMAT_VERSION,
  isSyncEnvelopeExpired,
  isEncryptedSyncEnvelope,
  syncEnvelopeExpiresAt,
  type EncryptedSyncEnvelope,
} from '@/lib/security/cloud-sync';

const DEFAULT_RETENTION_DAYS = 30;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function retentionSeconds() {
  const requestedDays = Number(process.env.CLOUD_SYNC_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;
  return Math.min(Math.max(Math.round(requestedDays), 1), 90) * 86_400;
}

function normalizeSyncId(value: unknown) {
  const syncId = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9._-]{8,128}$/.test(syncId)) {
    throw new PublicTargetError(
      'Sync ID must be 8-128 characters using letters, numbers, dot, underscore, or hyphen.',
      400,
      'INVALID_SYNC_ID'
    );
  }
  return syncId;
}

function syncStorageKey(syncId: string) {
  return `cyberkit:sync:v${CLOUD_SYNC_FORMAT_VERSION}:${createHash('sha256').update(syncId).digest('hex')}`;
}

async function redisCommand<T>(command: unknown[]) {
  const config = redisConfig();
  if (!config) throw new Error('Cloud sync storage is not configured.');
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  });
  if (!response.ok) throw new Error(`Cloud sync storage returned HTTP ${response.status}`);
  const payload = (await response.json()) as [{ result?: T; error?: string }];
  if (payload[0]?.error) throw new Error(payload[0].error);
  return payload[0]?.result ?? null;
}

function serverEnvelope(envelope: EncryptedSyncEnvelope): EncryptedSyncEnvelope {
  return {
    version: CLOUD_SYNC_FORMAT_VERSION,
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    salt: envelope.salt,
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    if (!redisConfig()) {
      return errorResponse('Cloud sync storage is not configured.', 503, 'SYNC_NOT_CONFIGURED', true);
    }
    const body = await parseJsonBody<{ syncId?: unknown }>(request);
    if (Object.keys(body).some((key) => key !== 'syncId')) {
      throw new PublicTargetError('Cloud restore accepts only a Sync ID.', 400, 'INVALID_SYNC_REQUEST');
    }
    const syncId = normalizeSyncId(body.syncId);
    const storageKey = syncStorageKey(syncId);
    const rate = await consumeRateLimit(request, storageKey, {
      endpoint: 'sync-read',
      ipLimit: 30,
      targetLimit: 20,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const stored = await redisCommand<string>(['GET', storageKey]);
    if (!stored) {
      return NextResponse.json(
        { success: true, found: false, expired: false, envelope: null },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }
    const envelope = JSON.parse(stored) as unknown;
    if (!isEncryptedSyncEnvelope(envelope)) {
      return errorResponse('Stored Cloud Sync payload is invalid.', 500, 'SYNC_DATA_INVALID');
    }
    const ttlSeconds = retentionSeconds();
    if (isSyncEnvelopeExpired(envelope, ttlSeconds)) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          expired: true,
          envelope: null,
          expiresAt: syncEnvelopeExpiresAt(envelope, ttlSeconds),
          version: envelope.version,
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }
    return NextResponse.json(
      {
        success: true,
        found: true,
        expired: false,
        envelope,
        expiresAt: syncEnvelopeExpiresAt(envelope, ttlSeconds),
        version: envelope.version,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    if (!redisConfig()) {
      return errorResponse('Cloud sync storage is not configured.', 503, 'SYNC_NOT_CONFIGURED', true);
    }
    const body = await parseJsonBody<{ syncId?: unknown; envelope?: unknown }>(request);
    if (Object.keys(body).some((key) => key !== 'syncId' && key !== 'envelope')) {
      throw new PublicTargetError(
        'Cloud backup accepts only a Sync ID and encrypted envelope.',
        400,
        'INVALID_SYNC_REQUEST'
      );
    }
    const syncId = normalizeSyncId(body.syncId);
    if (!isEncryptedSyncEnvelope(body.envelope)) {
      throw new PublicTargetError('Encrypted Cloud Sync envelope is invalid.', 400, 'INVALID_SYNC_ENVELOPE');
    }
    const storageKey = syncStorageKey(syncId);
    const rate = await consumeRateLimit(request, storageKey, {
      endpoint: 'sync-write',
      ipLimit: 20,
      targetLimit: 10,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const envelope = serverEnvelope(body.envelope);
    const ttlSeconds = retentionSeconds();
    await redisCommand(['SET', storageKey, JSON.stringify(envelope), 'EX', ttlSeconds]);
    return NextResponse.json({
      success: true,
      syncedAt: envelope.timestamp,
      expiresAt: new Date(Date.parse(envelope.timestamp) + ttlSeconds * 1000).toISOString(),
      version: envelope.version,
    });
  } catch (error) {
    return jsonError(error);
  }
}
