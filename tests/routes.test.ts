import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { EventEmitter } from 'node:events';
import { POST as dnsPost } from '../src/app/api/dns/route';
import { POST as dohPost } from '../src/app/api/doh/route';
import { POST as auditPost } from '../src/app/api/audit/route';
import { POST as rdapPost } from '../src/app/api/rdap/route';
import { POST as ipPost } from '../src/app/api/ip/route';
import { POST as pwnedPasswordPost } from '../src/app/api/pwned-password/route';
import { POST as syncPost, PUT as syncPut } from '../src/app/api/sync/route';
import type { EncryptedSyncEnvelope } from '../src/lib/security/cloud-sync';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('dns route returns structured validation errors', async () => {
  const response = await dnsPost(jsonRequest({ hostname: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_HOSTNAME');
  assert.equal(typeof data.message, 'string');
  assert.equal(typeof data.retryable, 'boolean');
});

test('audit route returns structured validation errors', async () => {
  const response = await auditPost(jsonRequest({ url: '' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_URL');
  assert.equal(typeof data.message, 'string');
  assert.equal(typeof data.retryable, 'boolean');
});

test('dns route returns structured records, helpers, and partial state', async () => {
  const originalLookup = dns.promises.lookup;
  const originalResolve4 = dns.promises.resolve4;
  const originalResolve6 = dns.promises.resolve6;
  const originalResolveMx = dns.promises.resolveMx;
  const originalResolveTxt = dns.promises.resolveTxt;
  const originalResolveNs = dns.promises.resolveNs;
  const originalResolveCaa = dns.promises.resolveCaa;
  const originalResolveSoa = dns.promises.resolveSoa;
  const originalReverse = dns.promises.reverse;

  dns.promises.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as unknown as typeof dns.promises.lookup;
  dns.promises.resolve4 = (async () => [{ address: '93.184.216.34', ttl: 300 }]) as unknown as typeof dns.promises.resolve4;
  dns.promises.resolve6 = (async () => []) as unknown as typeof dns.promises.resolve6;
  dns.promises.resolveMx = (async () => [{ exchange: 'mail.example.com', priority: 10 }]) as unknown as typeof dns.promises.resolveMx;
  dns.promises.resolveTxt = (async (hostname: string) => {
    if (hostname === 'example.com') return [['v=spf1 include:_spf.example.com -all']];
    if (hostname === '_dmarc.example.com') return [['v=DMARC1; p=reject']];
    if (hostname === 'default._domainkey.example.com') return [['v=DKIM1; k=rsa; p=abc']];
    throw new Error('not found');
  }) as unknown as typeof dns.promises.resolveTxt;
  dns.promises.resolveNs = (async () => ['ns1.example.com']) as unknown as typeof dns.promises.resolveNs;
  dns.promises.resolveCaa = (async () => [{ critical: 0, issue: 'letsencrypt.org' }]) as unknown as typeof dns.promises.resolveCaa;
  dns.promises.resolveSoa = (async () => ({
    nsname: 'ns1.example.com',
    hostmaster: 'hostmaster.example.com',
    serial: 2026061001,
    refresh: 3600,
    retry: 600,
    expire: 86400,
    minttl: 300,
  })) as unknown as typeof dns.promises.resolveSoa;
  dns.promises.reverse = (async () => ['ptr.example.com']) as unknown as typeof dns.promises.reverse;

  try {
    const response = await dnsPost(jsonRequest({ hostname: 'example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'Node.js resolver');
    assert.equal(data.hostname, 'example.com');
    assert.equal(data.partial, false);
    assert.equal(data.records.A.provider, 'Node.js resolver');
    assert.equal(data.records.A.ttl, 300);
    assert.equal(data.records.MX.values[0].exchange, 'mail.example.com');
    assert.equal(data.records.PTR.values[0], 'ptr.example.com');
    assert.equal(data.helpers.spf.present, true);
    assert.equal(data.helpers.dmarc.present, true);
    assert.deepEqual(data.helpers.dkim.selectorsFound, ['default']);
  } finally {
    dns.promises.lookup = originalLookup;
    dns.promises.resolve4 = originalResolve4;
    dns.promises.resolve6 = originalResolve6;
    dns.promises.resolveMx = originalResolveMx;
    dns.promises.resolveTxt = originalResolveTxt;
    dns.promises.resolveNs = originalResolveNs;
    dns.promises.resolveCaa = originalResolveCaa;
    dns.promises.resolveSoa = originalResolveSoa;
    dns.promises.reverse = originalReverse;
  }
});

test('doh route returns local and public resolver comparisons', async () => {
  const originalLookup = dns.promises.lookup;
  const originalResolve4 = dns.promises.resolve4;
  const originalResolve6 = dns.promises.resolve6;
  const originalResolveMx = dns.promises.resolveMx;
  const originalResolveTxt = dns.promises.resolveTxt;
  const originalResolveNs = dns.promises.resolveNs;
  const originalResolveCaa = dns.promises.resolveCaa;
  const originalFetch = globalThis.fetch;

  dns.promises.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as unknown as typeof dns.promises.lookup;
  dns.promises.resolve4 = (async () => [{ address: '93.184.216.34', ttl: 120 }]) as unknown as typeof dns.promises.resolve4;
  dns.promises.resolve6 = (async () => []) as unknown as typeof dns.promises.resolve6;
  dns.promises.resolveMx = (async () => [{ exchange: 'mail.example.com', priority: 10 }]) as unknown as typeof dns.promises.resolveMx;
  dns.promises.resolveTxt = (async () => [['v=spf1 -all']]) as unknown as typeof dns.promises.resolveTxt;
  dns.promises.resolveNs = (async () => ['ns1.example.com']) as unknown as typeof dns.promises.resolveNs;
  dns.promises.resolveCaa = (async () => [{ critical: 0, issue: 'letsencrypt.org' }]) as unknown as typeof dns.promises.resolveCaa;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.match(String(input), /^https:\/\/dns\.google\/resolve\?/);
    return Response.json({
      Status: 0,
      TC: false,
      RA: true,
      AD: true,
      Answer: [{ name: 'example.com.', type: 1, TTL: 120, data: '93.184.216.34' }],
    });
  }) as typeof fetch;

  try {
    const response = await dohPost(jsonRequest({ hostname: 'example.com', type: 'A' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'Resolver comparison');
    assert.equal(data.partial, false);
    assert.equal(data.comparisons.length, 1);
    assert.equal(data.comparisons[0].type, 'A');
    assert.equal(data.comparisons[0].local.values[0].address, '93.184.216.34');
    assert.equal(data.comparisons[0].doh.dnssecAuthenticated, true);
    assert.equal(data.comparisons[0].doh.answers[0].data, '93.184.216.34');
  } finally {
    dns.promises.lookup = originalLookup;
    dns.promises.resolve4 = originalResolve4;
    dns.promises.resolve6 = originalResolve6;
    dns.promises.resolveMx = originalResolveMx;
    dns.promises.resolveTxt = originalResolveTxt;
    dns.promises.resolveNs = originalResolveNs;
    dns.promises.resolveCaa = originalResolveCaa;
    globalThis.fetch = originalFetch;
  }
});

test('rdap route returns structured provider metadata', async () => {
  const originalLookup = dns.promises.lookup;
  const originalFetch = globalThis.fetch;

  dns.promises.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as unknown as typeof dns.promises.lookup;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), 'https://rdap.org/domain/example.com');
    return Response.json({
      objectClassName: 'domain',
      ldhName: 'example.com',
      status: ['active'],
      events: [{ eventAction: 'expiration', eventDate: '2030-01-01T00:00:00Z' }],
      nameservers: [{ ldhName: 'ns1.example.com' }],
      entities: [{ roles: ['registrar'], fn: 'Example Registrar' }],
      port43: 'whois.example.test',
      rdapConformance: ['rdap_level_0'],
      notices: [{ title: 'Notice', description: ['Test'] }],
    });
  }) as typeof fetch;

  try {
    const response = await rdapPost(jsonRequest({ hostname: 'example.com' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'RDAP.org');
    assert.equal(data.confidence, 'high');
    assert.equal(data.partial, false);
    assert.equal(data.registrar, 'Example Registrar');
    assert.deepEqual(data.nameservers, ['ns1.example.com']);
  } finally {
    dns.promises.lookup = originalLookup;
    globalThis.fetch = originalFetch;
  }
});

test('ip route returns approximate geolocation disclaimer and provider metadata', async () => {
  const originalFetch = globalThis.fetch;
  const previousAbuseKey = process.env.ABUSEIPDB_API_KEY;
  const previousShodanKey = process.env.SHODAN_API_KEY;
  const previousVtKey = process.env.VIRUSTOTAL_API_KEY;
  const previousUrlhausKey = process.env.URLHAUS_AUTH_KEY;
  delete process.env.ABUSEIPDB_API_KEY;
  delete process.env.SHODAN_API_KEY;
  delete process.env.VIRUSTOTAL_API_KEY;
  delete process.env.URLHAUS_AUTH_KEY;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.match(String(input), /^http:\/\/ip-api\.com\/json\/8\.8\.8\.8\?/);
    return Response.json({
      status: 'success',
      country: 'United States',
      countryCode: 'US',
      regionName: 'California',
      city: 'Mountain View',
      zip: '94043',
      lat: 37.4056,
      lon: -122.0775,
      timezone: 'America/Los_Angeles',
      isp: 'Google LLC',
      org: 'Google Public DNS',
      as: 'AS15169 Google LLC',
    });
  }) as typeof fetch;

  try {
    const response = await ipPost(jsonRequest({ ipOrDomain: '8.8.8.8' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'IP-API');
    assert.equal(data.ip, '8.8.8.8');
    assert.match(data.precisionDisclaimer, /approximate/i);
    assert.deepEqual(data.threatIntel.configuredProviders, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousAbuseKey === undefined) delete process.env.ABUSEIPDB_API_KEY;
    else process.env.ABUSEIPDB_API_KEY = previousAbuseKey;
    if (previousShodanKey === undefined) delete process.env.SHODAN_API_KEY;
    else process.env.SHODAN_API_KEY = previousShodanKey;
    if (previousVtKey === undefined) delete process.env.VIRUSTOTAL_API_KEY;
    else process.env.VIRUSTOTAL_API_KEY = previousVtKey;
    if (previousUrlhausKey === undefined) delete process.env.URLHAUS_AUTH_KEY;
    else process.env.URLHAUS_AUTH_KEY = previousUrlhausKey;
  }
});

test('audit route returns weighted findings, evidence, and baseline comparison', async () => {
  const originalLookup = dns.promises.lookup;
  const originalResolve4 = dns.promises.resolve4;
  const originalResolve6 = dns.promises.resolve6;
  const originalHttpsRequest = https.request;
  const originalTlsConnect = tls.connect;

  dns.promises.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as unknown as typeof dns.promises.lookup;
  dns.promises.resolve4 = (async () => ['93.184.216.34']) as unknown as typeof dns.promises.resolve4;
  dns.promises.resolve6 = (async () => []) as unknown as typeof dns.promises.resolve6;

  https.request = ((options: https.RequestOptions, callback?: (res: import('http').IncomingMessage) => void) => {
    const request = new EventEmitter() as http.ClientRequest;
    request.write = (() => true) as http.ClientRequest['write'];
    request.end = (() => {
      const response = new EventEmitter() as import('http').IncomingMessage;
      const path = String(options.path || '/');
      response.statusCode = 200;
      response.statusMessage = 'OK';
      if (path === '/robots.txt') {
        response.headers = { 'content-type': 'text/plain; charset=utf-8' };
        process.nextTick(() => {
          callback?.(response);
          response.emit('data', Buffer.from('User-agent: *\nDisallow: /admin\n'));
          response.emit('end');
        });
        return request;
      }
      if (path === '/.well-known/security.txt') {
        response.headers = { 'content-type': 'text/plain; charset=utf-8' };
        process.nextTick(() => {
          callback?.(response);
          response.emit('data', Buffer.from('Contact: mailto:security@example.com\n'));
          response.emit('end');
        });
        return request;
      }

      response.headers = {
        'content-type': 'text/html; charset=utf-8',
        'set-cookie': ['session=abc; Path=/'],
      };
      process.nextTick(() => {
        callback?.(response);
        response.emit('data', Buffer.from('<html><script src="http://cdn.example.org/app.js"></script></html>'));
        response.emit('end');
      });
      return request;
    }) as http.ClientRequest['end'];
    request.destroy = (() => request) as http.ClientRequest['destroy'];
    request.setTimeout = (() => request) as http.ClientRequest['setTimeout'];
    return request;
  }) as typeof https.request;

  tls.connect = ((options: tls.ConnectionOptions, callback?: () => void) => {
    const socket = new EventEmitter() as tls.TLSSocket;
    socket.authorized = true;
    socket.getCipher = (() => ({ name: 'TLS_AES_128_GCM_SHA256', standardName: 'TLS_AES_128_GCM_SHA256', version: 'TLSv1.3' })) as tls.TLSSocket['getCipher'];
    socket.getProtocol = (() => 'TLSv1.3') as tls.TLSSocket['getProtocol'];
    socket.getPeerCertificate = ((() => ({
      subject: { CN: options.servername || 'example.com' },
      issuer: { O: 'Example CA' },
      valid_to: 'Jun 10 2030 GMT',
      issuerCertificate: null,
    })) as unknown) as tls.TLSSocket['getPeerCertificate'];
    socket.setTimeout = (() => socket) as tls.TLSSocket['setTimeout'];
    socket.destroy = (() => socket) as tls.TLSSocket['destroy'];
    process.nextTick(() => callback?.());
    return socket;
  }) as typeof tls.connect;

  try {
    const response = await auditPost(
      jsonRequest({
        url: 'https://example.com',
        baseline: { score: 95, findings: [{ id: 'legacy-only' }] },
      })
    );
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.scoring.model, 'weighted-subtractive-v1');
    assert.equal(Array.isArray(data.findings), true);
    assert.equal(data.redirectChain.length, 1);
    assert.equal(data.tls.protocol, 'TLSv1.3');
    assert.equal(data.supportFiles.robots.found, true);
    assert.equal(data.supportFiles.securityTxt.found, true);
    assert.equal(data.comparison.scoreDelta < 0, true);
    assert.equal(data.comparison.introducedCount > 0, true);
    assert.equal(data.findings.some((finding: { id: string }) => finding.id === 'cookie-flags-missing'), true);
    assert.equal(data.findings.some((finding: { id: string }) => finding.id === 'securitytxt-invalid'), true);
    assert.equal(data.findings.some((finding: { id: string }) => finding.id === 'mixed-content-signal'), true);
  } finally {
    dns.promises.lookup = originalLookup;
    dns.promises.resolve4 = originalResolve4;
    dns.promises.resolve6 = originalResolve6;
    https.request = originalHttpsRequest;
    tls.connect = originalTlsConnect;
  }
});

test('pwned password route rejects plaintext password payloads', async () => {
  const response = await pwnedPasswordPost(jsonRequest({ password: 'password' }));
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.errorCode, 'INVALID_HASH_PREFIX');
});

test('pwned password route rejects SHA-1 suffixes', async () => {
  const response = await pwnedPasswordPost(
    jsonRequest({
      hashPrefix: 'ABCDE',
      hashSuffix: '1234567890ABCDEF1234567890ABCDEF123',
    })
  );
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.errorCode, 'INVALID_HASH_PREFIX');
});

test('pwned password route returns a parsed HIBP range without matching suffixes', async () => {
  const originalFetch = globalThis.fetch;
  const hashPrefix = 'ABCDE';
  const hashSuffix = '1234567890ABCDEF1234567890ABCDEF123';

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), `https://api.pwnedpasswords.com/range/${hashPrefix}`);
    return new Response(`${hashSuffix}:42\n00000000000000000000000000000000000:1`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }) as typeof fetch;

  try {
    const response = await pwnedPasswordPost(jsonRequest({ hashPrefix }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.provider, 'Have I Been Pwned Pwned Passwords');
    assert.equal(data.hashPrefix, hashPrefix);
    assert.deepEqual(data.range, [
      { suffix: hashSuffix, count: 42 },
      { suffix: '00000000000000000000000000000000000', count: 1 },
    ]);
    assert.equal('pwned' in data, false);
    assert.equal('breachCount' in data, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sync route reports missing cloud storage configuration', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const response = await syncPost(jsonRequest({ syncId: 'device-backup' }));
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.success, false);
    assert.equal(data.errorCode, 'SYNC_NOT_CONFIGURED');
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test('sync route stores only the encrypted envelope with retention TTL', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousRetention = process.env.CLOUD_SYNC_RETENTION_DAYS;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.CLOUD_SYNC_RETENTION_DAYS = '7';
  const envelope: EncryptedSyncEnvelope = {
    version: 1,
    ciphertext: 'A'.repeat(32),
    iv: 'A'.repeat(16),
    salt: 'A'.repeat(22) + '==',
    timestamp: new Date(0).toISOString(),
  };
  let redisCommand: unknown[] = [];
  globalThis.fetch = (async (_input, init) => {
    const pipeline = JSON.parse(String(init?.body)) as unknown[][];
    if (pipeline.length === 3 && pipeline[0]?.[0] === 'INCR') {
      return Response.json([{ result: 1 }, { result: 1 }, { result: 60_000 }]);
    }
    redisCommand = pipeline[0];
    return Response.json([{ result: 'OK' }]);
  }) as typeof fetch;

  try {
    const response = await syncPut(jsonRequest({ syncId: 'device-backup', envelope }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.version, 1);
    assert.equal(redisCommand[0], 'SET');
    assert.equal(redisCommand[3], 'EX');
    assert.equal(redisCommand[4], 7 * 86_400);
    const stored = JSON.parse(String(redisCommand[2])) as Record<string, unknown>;
    assert.deepEqual(Object.keys(stored).sort(), ['ciphertext', 'iv', 'salt', 'timestamp', 'version']);
    assert.equal(JSON.stringify(redisCommand).includes('passphrase'), false);
    assert.equal(JSON.stringify(redisCommand).includes('"history"'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    if (previousRetention === undefined) delete process.env.CLOUD_SYNC_RETENTION_DAYS;
    else process.env.CLOUD_SYNC_RETENTION_DAYS = previousRetention;
  }
});

test('sync route rejects plaintext and passphrase fields', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  try {
    const response = await syncPut(
      jsonRequest({ syncId: 'device-backup', passphrase: 'never-send-this', data: { history: [] } })
    );
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.errorCode, 'INVALID_SYNC_REQUEST');
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test('sync restore returns only the encrypted envelope', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const envelope: EncryptedSyncEnvelope = {
    version: 1,
    ciphertext: 'A'.repeat(32),
    iv: 'A'.repeat(16),
    salt: 'A'.repeat(22) + '==',
    timestamp: new Date().toISOString(),
  };
  globalThis.fetch = (async (_input, init) => {
    const pipeline = JSON.parse(String(init?.body)) as unknown[][];
    if (pipeline.length === 3) {
      return Response.json([{ result: 1 }, { result: 1 }, { result: 60_000 }]);
    }
    return Response.json([{ result: JSON.stringify(envelope) }]);
  }) as typeof fetch;
  try {
    const response = await syncPost(jsonRequest({ syncId: 'device-restore' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.found, true);
    assert.equal(data.expired, false);
    assert.equal(data.version, 1);
    assert.deepEqual(data.envelope, envelope);
    assert.equal('data' in data, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test('sync restore reports expired envelopes without returning plaintext', async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousRetention = process.env.CLOUD_SYNC_RETENTION_DAYS;
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.CLOUD_SYNC_RETENTION_DAYS = '1';
  const envelope: EncryptedSyncEnvelope = {
    version: 1,
    ciphertext: 'A'.repeat(32),
    iv: 'A'.repeat(16),
    salt: 'A'.repeat(22) + '==',
    timestamp: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  };
  globalThis.fetch = (async (_input, init) => {
    const pipeline = JSON.parse(String(init?.body)) as unknown[][];
    if (pipeline.length === 3) {
      return Response.json([{ result: 1 }, { result: 1 }, { result: 60_000 }]);
    }
    return Response.json([{ result: JSON.stringify(envelope) }]);
  }) as typeof fetch;

  try {
    const response = await syncPost(jsonRequest({ syncId: 'expired-backup' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.found, false);
    assert.equal(data.expired, true);
    assert.equal(data.version, 1);
    assert.equal(data.envelope, null);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    if (previousRetention === undefined) delete process.env.CLOUD_SYNC_RETENTION_DAYS;
    else process.env.CLOUD_SYNC_RETENTION_DAYS = previousRetention;
  }
});
