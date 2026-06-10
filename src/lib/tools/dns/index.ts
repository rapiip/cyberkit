import type { ToolDefinition, ToolResultItem } from '../types';
import { asString, optionalString } from '../validation';

interface MxRecordResult {
  exchange: string;
  priority: number;
}

interface RecordEnvelope {
  provider: string;
  timestamp: string;
  confidence: string;
  ttl: number | null;
  unavailable: boolean;
  values: Array<string | MxRecordResult | Record<string, unknown>>;
  error?: string;
}

interface DnsLookupApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  hostname?: string;
  timestamp?: string;
  partial?: boolean;
  records?: Record<string, RecordEnvelope>;
  helpers?: {
    spf?: { value: string | null; present: boolean };
    dmarc?: { value: string | null; present: boolean };
    dkim?: { selectorsChecked: string[]; selectorsFound: string[]; present: boolean };
  };
}

export const dnsLookupTool: ToolDefinition = {
  id: 'dns-lookup',
  slug: 'dns-lookup',
  name: 'DNS Lookup',
  category: 'dns',
  description: 'Perform real-time DNS queries against a target domain. Retrieves active A, AAAA, MX, TXT, NS, CNAME, and Reverse DNS (PTR) records directly from authoritive servers.',
  shortDescription: 'Lookup active DNS records',
  tags: ['dns', 'lookup', 'records', 'domain', 'mx', 'txt'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: true,
  inputs: [
    {
      id: 'hostname',
      label: 'Domain or IP Address',
      type: 'text',
      placeholder: 'e.g., google.com or 8.8.8.8',
      required: true,
    },
  ],
  execute: async (inputs) => {
    const hostname = asString(inputs.hostname, 'Domain or IP address', 2048).trim();
    try {
      const response = await fetch('/api/dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostname }),
      });

      const resData = (await response.json()) as DnsLookupApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'DNS Lookup failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to fetch DNS records'}`,
        };
      }

      const records = resData.records || {};
      const rawLines: string[] = [];
      rawLines.push(`DNS Lookup Results for: ${resData.hostname}`);
      rawLines.push(`Provider Timestamp: ${resData.timestamp || 'N/A'}`);
      rawLines.push('========================================\n');

      const items: ToolResultItem[] = [];

      const recordTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CAA', 'SOA', 'PTR'] as const;
      recordTypes.forEach((type) => {
        const record = records[type];
        if (record) {
          rawLines.push(`[${type} Records] Provider=${record.provider} Confidence=${record.confidence} TTL=${record.ttl ?? 'N/A'}`);
          if (record.unavailable) {
            rawLines.push(`- Unavailable: ${record.error || 'No response'}`);
            items.push({ label: `${type} Status`, value: 'Unavailable', status: 'warn' });
            rawLines.push('');
            return;
          }

          const val = record.values;
          if (type === 'MX') {
            (val as MxRecordResult[]).forEach((r) => {
              rawLines.push(`- Exchange: ${r.exchange} | Priority: ${r.priority}`);
              items.push({ label: 'MX Record', value: `${r.exchange} (Priority: ${r.priority})`, status: 'info' });
            });
          } else {
            (val as Array<string | Record<string, unknown>>).forEach((r) => {
              const rendered = typeof r === 'string' ? r : JSON.stringify(r);
              rawLines.push(`- ${rendered}`);
              items.push({ label: `${type} Record`, value: rendered, status: 'info' });
            });
          }
          rawLines.push('');
        }
      });

      if (resData.helpers?.spf) {
        items.push({ label: 'SPF', value: resData.helpers.spf.present ? resData.helpers.spf.value || 'present' : 'not found', status: resData.helpers.spf.present ? 'pass' : 'warn' });
      }
      if (resData.helpers?.dmarc) {
        items.push({ label: 'DMARC', value: resData.helpers.dmarc.present ? resData.helpers.dmarc.value || 'present' : 'not found', status: resData.helpers.dmarc.present ? 'pass' : 'warn' });
      }
      if (resData.helpers?.dkim) {
        items.push({ label: 'DKIM', value: resData.helpers.dkim.present ? `selectors: ${resData.helpers.dkim.selectorsFound.join(', ')}` : 'not found in common selectors', status: resData.helpers.dkim.present ? 'pass' : 'warn' });
      }

      if (items.length === 0) {
        rawLines.push('No DNS records found for this domain.');
      }

      const raw = rawLines.join('\n');

      return {
        success: true,
        summary: `${resData.hostname} — ${items.length} result item(s)${resData.partial ? ' (partial)' : ''}`,
        data: resData,
        rawOutput: raw,
        explanation: `DNS maps domain names like "${resData.hostname}" to network records. Results include provider metadata, timestamps, TTL when available, partial-result handling, and email-authentication helpers for SPF, DMARC, and common DKIM selectors.`,
        items,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to communicate with DNS Lookup API',
        data: {},
        rawOutput: `Error: ${message}`,
      };
    }
  },
};

export const dnsOverHttpsTool: ToolDefinition = {
  id: 'dns-over-https',
  slug: 'dns-over-https',
  name: 'DNS over HTTPS Lookup',
  category: 'dns',
  description: 'Query Google Public DNS over HTTPS with DNSSEC validation details. Useful when you want resolver output from a public DoH API instead of the local server resolver.',
  shortDescription: 'Query Google Public DNS DoH records',
  tags: ['dns', 'doh', 'google', 'dnssec', 'records'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: false,
  inputs: [
    {
      id: 'hostname',
      label: 'Domain Name',
      type: 'text',
      placeholder: 'e.g., example.com',
      required: true,
    },
    {
      id: 'type',
      label: 'Record Type',
      type: 'select',
      defaultValue: '',
      options: [
        { label: 'All common records', value: '' },
        { label: 'A', value: 'A' },
        { label: 'AAAA', value: 'AAAA' },
        { label: 'MX', value: 'MX' },
        { label: 'TXT', value: 'TXT' },
        { label: 'NS', value: 'NS' },
        { label: 'CNAME', value: 'CNAME' },
        { label: 'CAA', value: 'CAA' },
      ],
    },
  ],
  execute: async (inputs) => {
    const hostname = asString(inputs.hostname, 'Domain name', 2048).trim();
    const type = optionalString(inputs.type) || undefined;

    try {
      const response = await fetch('/api/doh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, type }),
      });

      const resData = await response.json();
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'DNS over HTTPS lookup failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Google DoH query failed'}`,
        };
      }

      const items: { label: string; value: string; status: 'pass' | 'warn' | 'fail' | 'info' }[] = [];
      const rawLines = [
        `Provider: ${resData.provider}`,
        `Hostname: ${resData.hostname}`,
        `Timestamp: ${resData.timestamp || 'N/A'}`,
        '========================================',
      ];

      for (const result of resData.comparisons as {
        type: string;
        local: { unavailable: boolean; values: unknown[]; error?: string };
        doh: { status: number; dnssecAuthenticated: boolean; answers: { data: string; TTL: number }[]; comment?: string; unavailable: boolean };
      }[]) {
        rawLines.push(`\n[${result.type}]`);
        rawLines.push(`Local Resolver: ${result.local.unavailable ? result.local.error || 'Unavailable' : JSON.stringify(result.local.values)}`);
        rawLines.push(`Google DoH: status=${result.doh.status} DNSSEC_AD=${result.doh.dnssecAuthenticated}${result.doh.comment ? ` comment=${result.doh.comment}` : ''}`);
        if (!result.doh.answers.length) {
          items.push({ label: `${result.type} Comparison`, value: 'No DoH answers', status: result.doh.unavailable ? 'fail' : 'warn' });
          continue;
        }
        result.doh.answers.forEach((answer) => {
          rawLines.push(`- ${answer.data} (TTL ${answer.TTL})`);
          items.push({
            label: `${result.type} Record`,
            value: `${answer.data} (TTL ${answer.TTL})`,
            status: result.doh.dnssecAuthenticated ? 'pass' : 'info',
          });
        });
      }

      return {
        success: true,
        summary: `Resolver comparison returned ${items.length} answer item(s) for ${resData.hostname}${resData.partial ? ' (partial)' : ''}`,
        data: resData,
        rawOutput: rawLines.join('\n'),
        explanation: 'This tool compares the local resolver with Google Public DNS over HTTPS. The DNSSEC AD flag indicates whether Google validated authenticated DNSSEC data for a response.',
        items,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to query DNS over HTTPS API',
        data: {},
        rawOutput: `Error: ${message}`,
      };
    }
  },
};

export const whoisLookupTool: ToolDefinition = {
  id: 'whois-lookup',
  slug: 'whois-lookup',
  name: 'RDAP / WHOIS Domain Lookup',
  category: 'dns',
  description: 'Query RDAP registration data to retrieve registrar, domain status, event dates, name servers, and raw registration metadata.',
  shortDescription: 'Query RDAP domain registration details',
  tags: ['rdap', 'whois', 'registrar', 'domain', 'expiry', 'owner'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: false,
  inputs: [
    {
      id: 'hostname',
      label: 'Domain Name',
      type: 'text',
      placeholder: 'e.g., example.com',
      required: true,
    },
  ],
  execute: async (inputs) => {
    const hostname = asString(inputs.hostname, 'Domain name', 2048).trim();

    try {
      const response = await fetch('/api/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname }),
      });

      const resData = await response.json();
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'RDAP lookup failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Registration record not found'}`,
        };
      }

      const events = (resData.events || []) as { eventAction?: string; eventDate?: string }[];
      const nameservers = (resData.nameservers || []) as string[];
      const statuses = (resData.status || []) as string[];
      const items = [
        { label: 'Domain Name', value: resData.domainName || resData.domain, status: 'info' as const },
        { label: 'Registrar', value: resData.registrar || 'Not disclosed', status: 'info' as const },
        { label: 'Status', value: statuses.join(', ') || 'N/A', status: 'info' as const },
        { label: 'Port 43 WHOIS', value: resData.port43 || 'N/A', status: 'info' as const },
        { label: 'Provider', value: resData.provider || 'Unknown', status: 'info' as const },
        { label: 'Timestamp', value: resData.timestamp || 'N/A', status: 'info' as const },
      ];

      events.forEach((event) => {
        if (event.eventAction && event.eventDate) {
          items.push({ label: event.eventAction, value: event.eventDate, status: 'info' as const });
        }
      });

      nameservers.forEach((ns) => {
        items.push({ label: 'Name Server', value: ns, status: 'info' as const });
      });

      const rawText = `Provider: ${resData.provider}
Domain Name: ${resData.domainName || resData.domain}
Registrar: ${resData.registrar || 'Not disclosed'}
Status: ${statuses.join(', ') || 'N/A'}
Port 43 WHOIS: ${resData.port43 || 'N/A'}

Events:
${events.map((event) => `- ${event.eventAction || 'event'}: ${event.eventDate || 'unknown'}`).join('\n') || '- N/A'}

Name Servers:
${nameservers.map((ns) => `- ${ns}`).join('\n') || '- N/A'}
`;

      return {
        success: true,
        summary: `RDAP registration data retrieved for ${resData.domain}`,
        data: resData,
        rawOutput: rawText,
        explanation: 'RDAP is the structured HTTP/JSON successor to classic WHOIS. It returns standardized registration events, statuses, registrar information, and name server data when the registry exposes it.',
        items,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to retrieve RDAP details',
        data: {},
        rawOutput: `Error contacting RDAP service: ${message}`,
      };
    }
  },
};

export const dnsTools: ToolDefinition[] = [
  dnsLookupTool,
  dnsOverHttpsTool,
  whoisLookupTool,
];
