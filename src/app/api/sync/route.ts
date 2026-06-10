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
import { validateImportedCyberKitData } from '@/lib/store';

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function syncStorageKey(syncKey: string) {
  return `cyberkit:sync:${createHash('sha256').update(syncKey).digest('hex')}`;
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

async function readPayload(request: Request) {
  const body = await parseJsonBody<{ syncKey?: unknown; data?: unknown }>(request);
  const syncKey = typeof body.syncKey === 'string' ? body.syncKey.trim() : '';
  if (syncKey.length < 16 || syncKey.length > 128) {
    throw new PublicTargetError('Sync key must be 16-128 characters.', 400, 'INVALID_SYNC_KEY');
  }
  return { syncKey, data: body.data };
}

export async function POST(request: Request) {
  try {
    if (!redisConfig()) return errorResponse('Cloud sync storage is not configured.', 503, 'SYNC_NOT_CONFIGURED', true);
    const { syncKey } = await readPayload(request);
    const rate = await consumeRateLimit(request, 'sync', {
      endpoint: 'sync-read',
      ipLimit: 30,
      targetLimit: 20,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const stored = await redisCommand<string>(['GET', syncStorageKey(syncKey)]);
    if (!stored) {
      return NextResponse.json({
        success: true,
        found: false,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: validateImportedCyberKitData(JSON.parse(stored)),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    if (!redisConfig()) return errorResponse('Cloud sync storage is not configured.', 503, 'SYNC_NOT_CONFIGURED', true);
    const { syncKey, data } = await readPayload(request);
    const validData = validateImportedCyberKitData(data);
    const rate = await consumeRateLimit(request, 'sync', {
      endpoint: 'sync-write',
      ipLimit: 20,
      targetLimit: 10,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    await redisCommand(['SET', syncStorageKey(syncKey), JSON.stringify(validData)]);
    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
