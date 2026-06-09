import { NextResponse } from 'next/server';
import dns from 'dns';
import {
  assertPublicHostname,
  consumeRateLimit,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

const dnsPromises = dns.promises;

type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'PTR';
type DnsRecordValue = string[] | string[][] | dns.MxRecord[];

async function withDnsTimeout<T>(operation: Promise<T>) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('DNS query timed out')), TIMEOUTS.dnsRdapMs);
  });
  return Promise.race([operation, timeout]);
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ hostname?: unknown }>(request);
    if (typeof body.hostname !== 'string' || !body.hostname.trim()) {
      return NextResponse.json({ success: false, error: 'Invalid hostname provided' }, { status: 400 });
    }

    const cleanHost = await assertPublicHostname(body.hostname);
    const rate = consumeRateLimit(request, cleanHost, {
      endpoint: 'dns',
      ipLimit: 45,
      targetLimit: 15,
      windowMs: 60_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const resolveRecord = async (type: DnsRecordType): Promise<DnsRecordValue> => {
      try {
        switch (type) {
          case 'A':
            return await withDnsTimeout(dnsPromises.resolve4(cleanHost));
          case 'AAAA':
            return await withDnsTimeout(dnsPromises.resolve6(cleanHost));
          case 'MX':
            return await withDnsTimeout(dnsPromises.resolveMx(cleanHost));
          case 'TXT':
            return await withDnsTimeout(dnsPromises.resolveTxt(cleanHost));
          case 'NS':
            return await withDnsTimeout(dnsPromises.resolveNs(cleanHost));
          case 'CNAME':
            return await withDnsTimeout(dnsPromises.resolveCname(cleanHost));
          case 'PTR':
            return [];
          default:
            return [];
        }
      } catch {
        return [];
      }
    };

    const [a, aaaa, mx, txt, ns, cname, ptr] = await Promise.all([
      resolveRecord('A'),
      resolveRecord('AAAA'),
      resolveRecord('MX'),
      resolveRecord('TXT'),
      resolveRecord('NS'),
      resolveRecord('CNAME'),
      resolveRecord('PTR'),
    ]);

    let resolvedIp = '';
    try {
      const lookup = await withDnsTimeout(dnsPromises.lookup(cleanHost));
      resolvedIp = lookup.address;
    } catch {
      // Individual DNS record output above is still useful.
    }

    return NextResponse.json({
      success: true,
      hostname: cleanHost,
      resolvedIp,
      records: {
        A: a,
        AAAA: aaaa,
        MX: mx,
        TXT: (txt as string[][]).map((record) => record.join(' ')),
        NS: ns,
        CNAME: cname,
        PTR: ptr,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
