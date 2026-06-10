import test from 'node:test';
import assert from 'node:assert/strict';
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
import { compareHashValues, hashFileWithProgress, hashText } from '../src/lib/security/hash';

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

test('compare workspace imports the shared transform quick runner', async () => {
  const source = await readFile('src/app/tools/compare/CompareToolsClient.tsx', 'utf8');
  assert.match(source, /quickRunTransformTool/);
  assert.match(source, /canQuickRunTransformTool/);
});

test('random string generator reports unbiased selection metadata', async () => {
  const result = await randomStringTool.execute({ length: 8, count: 2, charset: 'hex' });
  assert.equal(result.success, true);
  assert.equal(result.data.moduloBiasAvoided, true);
  const strings = result.data.strings as string[];
  assert.equal(strings.length, 2);
  assert.match(strings[0], /^[0-9a-f]{8}$/);
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
