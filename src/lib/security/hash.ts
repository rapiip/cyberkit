export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

const textEncoder = new TextEncoder();

function latin1FromBytes(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let result = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return result;
}

export const md5 = (input: string): string => {
  const K = [0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391];
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const add32 = (a: number, b: number) => (a + b) & 0xffffffff;
  const rotl = (v: number, n: number) => (v << n) | (v >>> (32 - n));
  const bytes = Array.from(unescape(encodeURIComponent(input))).map((char) => char.charCodeAt(0));
  const len = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((len >>> (i * 8)) & 0xff);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let i = 0; i < bytes.length; i += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) M.push(bytes[i+j*4] | (bytes[i+j*4+1]<<8) | (bytes[i+j*4+2]<<16) | (bytes[i+j*4+3]<<24));
    let A=a0,B=b0,C=c0,D=d0;
    for (let j = 0; j < 64; j++) {
      let F: number, g: number;
      if (j < 16) { F = (B & C) | (~B & D); g = j; }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5*j+1)%16; }
      else if (j < 48) { F = B ^ C ^ D; g = (3*j+5)%16; }
      else { F = C ^ (B | ~D); g = (7*j)%16; }
      F = add32(add32(F, A), add32(K[j], M[g]));
      A = D; D = C; C = B; B = add32(B, rotl(F, S[j]));
    }
    a0=add32(a0,A); b0=add32(b0,B); c0=add32(c0,C); d0=add32(d0,D);
  }
  const hex = (n: number) => Array.from({ length: 4 }, (_, i) => ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')).join('');
  return hex(a0)+hex(b0)+hex(c0)+hex(d0);
};

export async function hashBytes(algorithm: Exclude<HashAlgorithm, 'MD5'>, bytes: Uint8Array) {
  const copied = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest(algorithm, copied);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashText(algorithm: HashAlgorithm, input: string) {
  if (algorithm === 'MD5') {
    return md5(input);
  }
  return hashBytes(algorithm, textEncoder.encode(input));
}

export interface FileHashResult {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
  chunkCount: number;
  bytesRead: number;
}

export async function hashFileWithProgress(
  file: File,
  onProgress?: (progress: { current: number; total: number; label: string }) => void
): Promise<FileHashResult> {
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let chunkCount = 0;
  const reader = file.stream().getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      bytesRead += value.length;
      chunkCount += 1;
      onProgress?.({
        current: bytesRead,
        total: file.size,
        label: `Read ${bytesRead.toLocaleString()} of ${file.size.toLocaleString()} bytes`,
      });
    }
  }

  const merged = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    md5: md5(latin1FromBytes(merged)),
    sha1: await hashBytes('SHA-1', merged),
    sha256: await hashBytes('SHA-256', merged),
    sha512: await hashBytes('SHA-512', merged),
    chunkCount,
    bytesRead,
  };
}

export function normalizeHashInput(value: string) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

export function compareHashValues(actual: string, expected: string) {
  const normalizedActual = normalizeHashInput(actual);
  const normalizedExpected = normalizeHashInput(expected);
  if (!normalizedActual || !normalizedExpected) {
    throw new Error('Both hash values are required for comparison.');
  }
  return {
    match: normalizedActual === normalizedExpected,
    actual: normalizedActual,
    expected: normalizedExpected,
  };
}
