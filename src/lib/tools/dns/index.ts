import type { ToolDefinition, ToolResultItem } from '../types';
import { asString, optionalString } from '../validation';

interface MxRecordResult {
  exchange: string;
  priority: number;
}

type DnsRecordValue = string[] | MxRecordResult[];

interface DnsLookupApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  hostname?: string;
  resolvedIp?: string;
  records?: Record<string, DnsRecordValue>;
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
      rawLines.push(`Resolved IP: ${resData.resolvedIp || 'N/A'}`);
      rawLines.push('========================================\n');

      const items: ToolResultItem[] = [];

      if (resData.resolvedIp) {
        items.push({ label: 'Resolved IP', value: resData.resolvedIp, status: 'info' });
      }

      const recordTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'PTR'] as const;
      recordTypes.forEach((type) => {
        const val = records[type];
        if (val && val.length > 0) {
          rawLines.push(`[${type} Records]`);
          
          if (type === 'MX') {
            (val as MxRecordResult[]).forEach((r) => {
              rawLines.push(`- Exchange: ${r.exchange} | Priority: ${r.priority}`);
              items.push({ label: 'MX Record', value: `${r.exchange} (Priority: ${r.priority})`, status: 'info' });
            });
          } else {
            (val as string[]).forEach((r) => {
              rawLines.push(`- ${r}`);
              items.push({ label: `${type} Record`, value: r, status: 'info' });
            });
          }
          rawLines.push('');
        }
      });

      if (items.length === 0) {
        rawLines.push('No DNS records found for this domain.');
      }

      const raw = rawLines.join('\n');

      return {
        success: true,
        summary: `Resolved ${resData.hostname} — Found ${items.length} records`,
        data: resData,
        rawOutput: raw,
        explanation: `DNS (Domain Name System) maps human-readable domain names like "${resData.hostname}" to machine-readable IP addresses. We retrieved:\n` +
          `- A records: IPv4 Addresses\n` +
          `- AAAA records: IPv6 Addresses\n` +
          `- MX records: Mail server targets\n` +
          `- TXT records: Auxiliary text (SPF, domain verification, etc.)\n` +
          `- NS records: Authoritative DNS servers`,
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
        '========================================',
      ];

      for (const result of resData.results as {
        type: string;
        status: number;
        dnssecAuthenticated: boolean;
        answers: { data: string; TTL: number }[];
        comment?: string;
      }[]) {
        rawLines.push(`\n[${result.type}] Status=${result.status} DNSSEC_AD=${result.dnssecAuthenticated}`);
        if (result.comment) rawLines.push(`Comment: ${result.comment}`);
        if (!result.answers.length) {
          rawLines.push('- No answer records');
          items.push({ label: `${result.type} Records`, value: 'No answers', status: result.status === 0 ? 'warn' : 'fail' });
          continue;
        }

        result.answers.forEach((answer) => {
          rawLines.push(`- ${answer.data} (TTL ${answer.TTL})`);
          items.push({
            label: `${result.type} Record`,
            value: `${answer.data} (TTL ${answer.TTL})`,
            status: result.dnssecAuthenticated ? 'pass' : 'info',
          });
        });
      }

      return {
        success: true,
        summary: `Google DoH resolved ${items.length} answer(s) for ${resData.hostname}`,
        data: resData,
        rawOutput: rawLines.join('\n'),
        explanation: 'This tool uses Google Public DNS over HTTPS. The DNSSEC AD flag indicates whether Google validated authenticated DNSSEC data for a response.',
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
