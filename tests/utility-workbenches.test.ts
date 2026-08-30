import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { analyzeCidr, analyzeSubnet, prefixFromMask } from '../src/lib/tools/network/utils';
import {
  executeTransformOperation,
  executeTransformPipeline,
  executeTransformPipelineWithEncodings,
  formatTransformOutput,
  parseTransformInput,
  suggestTransformOperations,
} from '../src/lib/tools/transforms/engine';
import { randomStringTool } from '../src/lib/tools/hashing';
import { allToolMetadata } from '../src/lib/tools/metadata';
import { quickRunTransformTool } from '../src/lib/tools/transforms/quick-run';
import { compareHashValues, hashFileWithProgress, hashText, md5, md5Bytes } from '../src/lib/security/hash';

test('network helpers handle IPv4 edge prefixes and contiguous masks', () => {
  const slash31 = analyzeCidr('192.0.2.10/31');
  assert.equal(slash31.network, '192.0.2.10');
  assert.equal(slash31.rangeEnd, '192.0.2.11');
  assert.equal(slash31.hostCount, '2');

  const slash32 = analyzeCidr('192.0.2.10/32');
  assert.equal(slash32.firstHost, '192.0.2.10');
  assert.equal(slash32.lastHost, '192.0.2.10');
  assert.equal(slash32.hostCount, '1');

  assert.equal(prefixFromMask('255.255.255.0'), 24);
  assert.throws(() => prefixFromMask('255.0.255.0'), /contiguous/i);
});

test('network helpers support IPv6 CIDR and subnet notation', () => {
  const slash127 = analyzeCidr('2001:db8::1/127');
  assert.equal(slash127.version, 6);
  assert.equal(slash127.hostCount, '2');
  assert.match(slash127.reverseZone, /ip6\.arpa$/);

  const subnet = analyzeSubnet('2001:db8::1', '/128');
  assert.equal(subnet.hostCount, '1');
  assert.equal(subnet.rangeStart, subnet.rangeEnd);
});

test('transform engine supports round trips and explicit failures', () => {
  const base64 = executeTransformOperation('base64-encode', 'hello').output;
  assert.equal(executeTransformOperation('base64-decode', base64).output, 'hello');

  const hex = executeTransformOperation('hex-encode', 'CyberKit').output;
  assert.equal(executeTransformOperation('hex-decode', hex).output, 'CyberKit');

  assert.throws(() => executeTransformOperation('binary-decode', '101'), /8-bit/i);
  assert.throws(() => executeTransformOperation('unicode-decode', '0041'), /Unicode input/i);
});

test('transform pipeline composes steps and suggestions are heuristic only', () => {
  const pipeline = executeTransformPipeline('hello', [
    { id: '1', operationId: 'base64-encode', enabled: true },
    { id: '2', operationId: 'base64url-encode', enabled: false },
    { id: '3', operationId: 'base64-decode', enabled: true },
  ]);
  assert.equal(pipeline.output, 'hello');
  assert.equal(pipeline.history.length, 2);

  const suggestions = suggestTransformOperations('68656c6c6f');
  assert.equal(suggestions.some((suggestion) => suggestion.operationId === 'hex-decode'), true);
});

test('transform pipeline supports Base64URL, hex, and raw byte boundaries', () => {
  const bytes = parseTransformInput('48656c6c6f', 'hex');
  assert.equal(formatTransformOutput(bytes, 'utf8'), 'Hello');

  const pipeline = executeTransformPipelineWithEncodings(
    'SGVsbG8',
    [{ id: '1', operationId: 'base64url-decode', enabled: true }],
    'raw-bytes',
    'hex'
  );
  assert.equal(pipeline.output, '48 65 6c 6c 6f');

  assert.throws(
    () => executeTransformPipelineWithEncodings('\u00ff', [{ id: '1', operationId: 'rot13', enabled: true }], 'raw-bytes', 'utf8'),
    /encoded data is not valid|invalid utf-8|utf-8/i
  );
});

test('compare panel imports the shared transform quick runner', async () => {
  const source = await readFile('src/components/workspaces/CompareToolsPanel.tsx', 'utf8');
  assert.match(source, /quickRunTransformTool/);
  assert.match(source, /canQuickRunTransformTool/);
  // The retired /tools/compare route hardcoded the Caesar shift and XOR key.
  // The panel must forward user-supplied values instead.
  assert.match(source, /shift: state\.shift/);
  assert.match(source, /xorKey: state\.xorKey/);
});

test('quick-run transforms honour caller supplied shift and xor key', async () => {
  const caesar = allToolMetadata.find((tool) => tool.id === 'caesar-cipher');
  const xor = allToolMetadata.find((tool) => tool.id === 'xor-helper');
  assert.ok(caesar);
  assert.ok(xor);

  assert.equal(await quickRunTransformTool(caesar, { input: 'abc', mode: 'encrypt' }), 'def');
  assert.equal(await quickRunTransformTool(caesar, { input: 'abc', mode: 'encrypt', shift: 1 }), 'bcd');
  assert.equal(await quickRunTransformTool(caesar, { input: 'abc', mode: 'encrypt', shift: 5 }), 'fgh');

  const defaultXor = await quickRunTransformTool(xor, { input: 'CyberKit' });
  const customXor = await quickRunTransformTool(xor, { input: 'CyberKit', xorKey: 'secret' });
  assert.notEqual(defaultXor, customXor);

  // XOR is its own inverse, so re-applying the same key must round-trip.
  assert.equal(await quickRunTransformTool(xor, { input: customXor, xorKey: 'secret' }), 'CyberKit');
});

test('random string generator reports unbiased selection metadata', async () => {
  const result = await randomStringTool.execute({ length: 8, count: 2, charset: 'hex' });
  assert.equal(result.success, true);
  assert.equal(result.data.moduloBiasAvoided, true);
  const strings = result.data.strings as string[];
  assert.equal(strings.length, 2);
  assert.match(strings[0], /^[0-9a-f]{8}$/);
});

test('md5 matches the RFC 1321 test vectors for both string and byte input', async () => {
  // The codebase previously carried two separate MD5 implementations. These
  // vectors pin the behaviour of the single consolidated one.
  const vectors: Array<[string, string]> = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      'd174ab98d277d9f5a5611c2c9f419d9f',
    ],
    ['12345678901234567890123456789012345678901234567890123456789012345678901234567890', '57edf4a22be3c955ac49da2e2107b67a'],
  ];

  const encoder = new TextEncoder();
  for (const [input, expected] of vectors) {
    assert.equal(md5(input), expected, `md5(${JSON.stringify(input)})`);
    assert.equal(md5Bytes(encoder.encode(input)), expected, `md5Bytes(${JSON.stringify(input)})`);
    assert.equal(await hashText('MD5', input), expected, `hashText MD5 ${JSON.stringify(input)}`);
  }

  // Multi-byte input must be hashed as UTF-8, not as code units.
  assert.equal(md5('äöü'), md5Bytes(encoder.encode('äöü')));
});

test('md5 matches node crypto across block boundaries and multi-byte input', () => {
  const encoder = new TextEncoder();
  const samples = [
    '',
    'a',
    'abc',
    'CyberKit',
    'ä ö ü 日本語 🙂',
    ...[54, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000].map((length) => 'x'.repeat(length)),
  ];

  for (const sample of samples) {
    const expected = nodeCrypto.createHash('md5').update(sample, 'utf8').digest('hex');
    assert.equal(md5(sample), expected, `md5 length ${sample.length}`);
    assert.equal(md5Bytes(encoder.encode(sample)), expected, `md5Bytes length ${sample.length}`);
  }

  // Random binary payloads, including bytes above 0x7f which exercise the
  // signed-shift paths in the block assembly.
  for (let iteration = 0; iteration < 25; iteration += 1) {
    const bytes = nodeCrypto.randomBytes(1 + Math.floor(Math.random() * 300));
    const expected = nodeCrypto.createHash('md5').update(bytes).digest('hex');
    assert.equal(md5Bytes(new Uint8Array(bytes)), expected, `random payload of ${bytes.length} bytes`);
  }
});

test('md5 handles block-boundary lengths', () => {
  const encoder = new TextEncoder();
  // 55, 56, 57, 63, 64 and 65 bytes exercise the padding and extra-block paths.
  for (const length of [55, 56, 57, 63, 64, 65, 119, 120]) {
    const input = 'x'.repeat(length);
    assert.equal(md5(input), md5Bytes(encoder.encode(input)), `length ${length}`);
    assert.match(md5(input), /^[0-9a-f]{32}$/, `length ${length} must be 32 hex chars`);
  }
});

test('only one MD5 implementation exists in the source tree', async () => {
  const files = ['src/lib/security/hash.ts', 'src/lib/security/local-analysis.ts'];
  const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));

  // The MD5 K constant table is the fingerprint of an implementation.
  const implementations = sources.filter((source) => source.includes('0xd76aa478')).length;
  assert.equal(implementations, 1, 'MD5 must be implemented exactly once');
  assert.match(sources[1], /import \{ md5Bytes \} from '\.\/hash'/);
});

test('hash helpers verify expected values and compare normalized hashes', async () => {
  const sha256 = await hashText('SHA-256', 'CyberKit');
  const verification = compareHashValues(sha256, `  ${sha256.toUpperCase()}  `);
  assert.equal(verification.match, true);
  assert.throws(() => compareHashValues('', sha256), /required/i);
});

test('chunked file hashing uses fixture content and reports progress-friendly metadata', async () => {
  const fixture = await readFile('tests/fixtures/utility-workbenches/payload.txt');
  const file = new File([fixture], 'payload.txt', { type: 'text/plain' });
  let progressCalls = 0;
  const result = await hashFileWithProgress(file, () => {
    progressCalls += 1;
  });
  assert.equal(result.bytesRead, fixture.length);
  assert.ok(result.chunkCount >= 1);
  assert.ok(progressCalls >= 1);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});
