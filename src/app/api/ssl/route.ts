import { NextResponse } from 'next/server';
import tls from 'tls';
import {
  assertPublicHostname,
  consumeRateLimit,
  errorResponse,
  errorMessage,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  resolveAndBlockPrivateIp,
  TIMEOUTS,
} from '@/lib/server/scanner';

interface TlsResult {
  cert: ExtendedPeerCertificate;
  protocol: string | null;
  cipher: tls.CipherNameAndProtocol;
  authorized: boolean;
  authorizationError: string | null;
}

type ExtendedPeerCertificate = tls.DetailedPeerCertificate & {
  sigalg?: string;
  asn1Curve?: string;
  nistCurve?: string;
};

interface Finding {
  rule: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
  scoreDeduction: number;
}

async function getCertificateInfo(hostname: string): Promise<TlsResult> {
  const [address] = await resolveAndBlockPrivateIp(hostname);
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: address,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        const authorized = socket.authorized;
        const authorizationError = socket.authorizationError ? String(socket.authorizationError) : null;

        if (!cert || Object.keys(cert).length === 0) {
          socket.destroy();
          reject(new Error('No certificate returned by peer'));
          return;
        }

        socket.destroy();
        resolve({ cert: cert as ExtendedPeerCertificate, protocol, cipher, authorized, authorizationError });
      }
    );

    socket.setTimeout(TIMEOUTS.tlsMs);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('TLS handshake connection timed out'));
    });
    socket.on('error', (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return errorResponse('Invalid hostname provided', 400, 'INVALID_HOSTNAME');
    }

    const cleanHost = await assertPublicHostname(body.hostname);
    const rate = await consumeRateLimit(request, cleanHost, {
      endpoint: 'ssl',
      ipLimit: 20,
      targetLimit: 5,
      windowMs: 60_000,
      cooldownMs: 10_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    let resultData: TlsResult;
    try {
      resultData = await getCertificateInfo(cleanHost);
    } catch (tlsError) {
      return NextResponse.json(
        {
          success: false,
          error: `TLS Connection failed: ${errorMessage(tlsError, 'Host offline or not supporting TLS on port 443')}`,
        },
        { status: 502 }
      );
    }

    const { cert, protocol, cipher, authorized, authorizationError } = resultData;
    const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
    const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
    const now = new Date();

    const isExpired = validTo ? validTo.getTime() < now.getTime() : false;
    const daysRemaining = validTo
      ? Math.max(0, Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const keyStrength = cert.bits || null;
    const sigalg = cert.sigalg || 'Unknown';
    const isSelfSigned = Boolean(
      cert.issuer &&
      cert.subject &&
      JSON.stringify(cert.issuer) === JSON.stringify(cert.subject)
    );

    let score = 100;
    const findings: Finding[] = [];

    let protocolSafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
      score -= 30;
      protocolSafety = 'fail';
      findings.push({
        rule: 'Deprecated TLS Protocol Version',
        impact: `Negotiated ${protocol}. TLS 1.0 and 1.1 are deprecated due to cryptographic flaws.`,
        severity: 'high',
        scoreDeduction: 30,
      });
    }

    let cipherSafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (cipher?.name) {
      const weakCipherKeywords = ['RC4', '3DES', 'DES', 'CBC', 'NULL', 'EXPORT', 'MD5', 'SHA1'];
      if (weakCipherKeywords.some((keyword) => cipher.name.toUpperCase().includes(keyword))) {
        score -= 25;
        cipherSafety = 'fail';
        findings.push({
          rule: 'Weak Cipher Suite Detected',
          impact: `Negotiated ${cipher.name}. Contains legacy or vulnerable cryptographic algorithms.`,
          severity: 'high',
          scoreDeduction: 25,
        });
      }
    }

    let keySafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (keyStrength && keyStrength < 2048) {
      score -= 20;
      keySafety = 'fail';
      findings.push({
        rule: 'Weak Public Key Length',
        impact: `Public key has only ${keyStrength} bits. Modern RSA deployments require at least 2048 bits.`,
        severity: 'high',
        scoreDeduction: 20,
      });
    }

    let signatureSafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (['md5', 'sha1'].some((weakSig) => sigalg.toLowerCase().includes(weakSig))) {
      score -= 30;
      signatureSafety = 'fail';
      findings.push({
        rule: 'Weak Signature Hash Algorithm',
        impact: `Certificate signed with ${sigalg}. Subject to collision attacks.`,
        severity: 'high',
        scoreDeduction: 30,
      });
    }

    let expirySafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (isExpired) {
      score -= 50;
      expirySafety = 'fail';
      findings.push({
        rule: 'Expired Certificate',
        impact: 'The certificate is expired. Client browsers will block access.',
        severity: 'high',
        scoreDeduction: 50,
      });
    } else if (daysRemaining < 15) {
      score -= 15;
      expirySafety = 'warn';
      findings.push({
        rule: 'Certificate Nearing Expiration',
        impact: `Only ${daysRemaining} days remain before expiration.`,
        severity: 'medium',
        scoreDeduction: 15,
      });
    }

    let trustSafety: 'pass' | 'warn' | 'fail' = 'pass';
    if (!authorized || isSelfSigned) {
      score -= 40;
      trustSafety = 'fail';
      findings.push({
        rule: isSelfSigned ? 'Self-Signed Certificate' : 'Certificate Trust Chain Error',
        impact: isSelfSigned
          ? 'Certificate is self-signed and not trusted by standard web root certificates.'
          : `Certificate trust validation failed: ${authorizationError || 'Unknown authorization error'}.`,
        severity: 'high',
        scoreDeduction: 40,
      });
    }

    score = Math.max(0, score);
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 50) grade = 'D';

    const ocsps = cert.infoAccess?.OCSP || [];
    const caIssuers = cert.infoAccess?.['CA Issuers'] || [];

    return NextResponse.json({
      success: true,
      hostname: cleanHost,
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: validFrom?.toISOString(),
      validTo: validTo?.toISOString(),
      isExpired,
      daysRemaining,
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      bits: keyStrength,
      asn1Curve: cert.asn1Curve || null,
      nistCurve: cert.nistCurve || null,
      protocol,
      cipher: cipher
        ? {
            name: cipher.name,
            version: cipher.version,
            standardName: cipher.standardName,
          }
        : null,
      sigalg,
      authorized,
      authorizationError,
      isSelfSigned,
      ca: cert.ca || false,
      subjectaltname: cert.subjectaltname || null,
      ocspUrls: Array.isArray(ocsps) ? ocsps : [ocsps].filter(Boolean),
      caIssuers: Array.isArray(caIssuers) ? caIssuers : [caIssuers].filter(Boolean),
      audit: {
        score,
        grade,
        findings,
        safetyRatings: {
          protocol: protocolSafety,
          cipher: cipherSafety,
          key: keySafety,
          signature: signatureSafety,
          expiry: expirySafety,
          trust: trustSafety,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
