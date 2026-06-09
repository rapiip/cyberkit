import { NextResponse } from 'next/server';
import {
  cachedJson,
  consumeRateLimit,
  envHeader,
  fetchWithTimeout,
  jsonError,
  parseJsonBody,
  rateLimitResponse,
  TIMEOUTS,
} from '@/lib/server/scanner';

interface NvdMetric {
  cvssData?: {
    baseScore?: number;
    baseSeverity?: string;
    vectorString?: string;
  };
}

interface NvdVulnerability {
  cve: {
    id: string;
    published?: string;
    lastModified?: string;
    vulnStatus?: string;
    descriptions?: { lang: string; value: string }[];
    metrics?: {
      cvssMetricV40?: NvdMetric[];
      cvssMetricV31?: NvdMetric[];
      cvssMetricV30?: NvdMetric[];
      cvssMetricV2?: NvdMetric[];
    };
    weaknesses?: { description?: { lang: string; value: string }[] }[];
    references?: { url: string; source?: string }[];
  };
}

interface NvdResponse {
  totalResults: number;
  startIndex?: number;
  resultsPerPage?: number;
  vulnerabilities?: NvdVulnerability[];
}

interface CisaKevItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
}

interface CisaKevResponse {
  title?: string;
  catalogVersion?: string;
  dateReleased?: string;
  count?: number;
  vulnerabilities?: CisaKevItem[];
}

const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
type Severity = (typeof severities)[number];

function pickCvss(cve: NvdVulnerability['cve']) {
  const metrics = cve.metrics;
  return (
    metrics?.cvssMetricV40?.[0] ||
    metrics?.cvssMetricV31?.[0] ||
    metrics?.cvssMetricV30?.[0] ||
    metrics?.cvssMetricV2?.[0] ||
    null
  );
}

async function getKevCatalog() {
  return cachedJson('cisa:kev', 6 * 60 * 60_000, async () => {
    const response = await fetchWithTimeout(
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
      { headers: { Accept: 'application/json', 'User-Agent': 'CyberKit/1.0' } },
      TIMEOUTS.cveKevMs
    );
    if (!response.ok) throw new Error(`CISA KEV feed returned HTTP ${response.status}`);
    return (await response.json()) as CisaKevResponse;
  });
}

async function getNvd(url: URL) {
  return cachedJson(`nvd:${url.searchParams.toString()}`, 10 * 60_000, async () => {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CyberKit/1.0',
          ...envHeader('NVD_API_KEY', 'apiKey'),
        },
      },
      TIMEOUTS.cveKevMs
    );
    if (!response.ok) throw new Error(`NVD API returned HTTP ${response.status}`);
    return (await response.json()) as NvdResponse;
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      query?: unknown;
      startIndex?: unknown;
      resultsPerPage?: unknown;
      severity?: unknown;
      kevOnly?: unknown;
      ransomwareOnly?: unknown;
    }>(request);
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query || query.length > 120) {
      return NextResponse.json({ success: false, error: 'Invalid CVE ID or keyword provided' }, { status: 400 });
    }

    const rate = consumeRateLimit(request, query.toLowerCase(), {
      endpoint: 'cve',
      ipLimit: 25,
      targetLimit: 5,
      windowMs: 60_000,
      cooldownMs: 8_000,
    });
    if (rate.limited) return rateLimitResponse(rate.retryAfter);

    const startIndex = Math.max(0, Math.min(Number(body.startIndex) || 0, 2000));
    const resultsPerPage = Math.max(1, Math.min(Number(body.resultsPerPage) || 10, 50));
    const severity = typeof body.severity === 'string' ? body.severity.toUpperCase() : '';
    const severityFilter = severities.includes(severity as Severity) ? (severity as Severity) : '';

    const nvdUrl = new URL('https://services.nvd.nist.gov/rest/json/cves/2.0');
    const cveIdMatch = query.match(/^CVE-\d{4}-\d{4,}$/i);
    if (cveIdMatch) {
      nvdUrl.searchParams.set('cveId', cveIdMatch[0].toUpperCase());
    } else {
      nvdUrl.searchParams.set('keywordSearch', query);
      nvdUrl.searchParams.set('resultsPerPage', String(resultsPerPage));
      nvdUrl.searchParams.set('startIndex', String(startIndex));
      nvdUrl.searchParams.set('noRejected', '');
      if (severityFilter) nvdUrl.searchParams.set('cvssV3Severity', severityFilter);
    }

    const [nvdResult, kevResult] = await Promise.allSettled([getNvd(nvdUrl), getKevCatalog()]);
    if (nvdResult.status === 'rejected') throw nvdResult.reason;
    const nvd = nvdResult.value;
    const kev = kevResult.status === 'fulfilled' ? kevResult.value : null;
    const kevMap = new Map((kev?.vulnerabilities || []).map((item) => [item.cveID.toUpperCase(), item]));

    const vulnerabilities = (nvd.vulnerabilities || [])
      .map((entry) => {
        const cve = entry.cve;
        const metric = pickCvss(cve);
        const cisaKev = kevMap.get(cve.id.toUpperCase()) || null;
        const description =
          cve.descriptions?.find((item) => item.lang === 'en')?.value ||
          cve.descriptions?.[0]?.value ||
          '';
        const weaknesses =
          cve.weaknesses
            ?.flatMap((weakness) => weakness.description || [])
            .filter((item) => item.lang === 'en')
            .map((item) => item.value) || [];

        return {
          id: cve.id,
          description,
          published: cve.published,
          lastModified: cve.lastModified,
          status: cve.vulnStatus,
          cvss: metric?.cvssData || null,
          weaknesses,
          references: (cve.references || []).slice(0, 10),
          cisaKev,
        };
      })
      .filter((item) => !body.kevOnly || item.cisaKev)
      .filter((item) => !body.ransomwareOnly || item.cisaKev?.knownRansomwareCampaignUse === 'Known');

    return NextResponse.json({
      success: true,
      provider: 'NVD CVE API + CISA KEV Catalog',
      totalResults: nvd.totalResults,
      startIndex,
      resultsPerPage,
      nextStartIndex: startIndex + resultsPerPage < nvd.totalResults ? startIndex + resultsPerPage : null,
      filters: {
        severity: severityFilter || null,
        kevOnly: Boolean(body.kevOnly),
        ransomwareOnly: Boolean(body.ransomwareOnly),
      },
      kevCatalog: kev
        ? {
            title: kev.title,
            catalogVersion: kev.catalogVersion,
            dateReleased: kev.dateReleased,
            count: kev.count,
          }
        : null,
      vulnerabilities,
    });
  } catch (error) {
    return jsonError(error);
  }
}
