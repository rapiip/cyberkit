import type { ToolDefinition } from '../types';
import { asString, optionalString } from '../validation';
import { analyzeCidr, analyzeSubnet } from './utils';

export const cidrCalculatorTool: ToolDefinition = {
  id: 'cidr-calculator',
  slug: 'cidr-calculator',
  name: 'CIDR Calculator',
  category: 'network',
  description: 'Calculate IP address ranges, subnet masks, and host counts from CIDR notation. Supports both IPv4 CIDR blocks.',
  shortDescription: 'Calculate IP ranges from CIDR notation',
  tags: ['cidr', 'ip', 'subnet', 'network', 'range'],
  difficulty: 'intermediate',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'cidr', label: 'CIDR Block', type: 'text', placeholder: '192.168.1.0/24', required: true },
  ],
  execute: async (inputs) => {
    try {
      const cidr = asString(inputs.cidr, 'CIDR block', 128).trim();
      const result = analyzeCidr(cidr);
      const raw = [
        `CIDR: ${cidr}`,
        `IP Version: IPv${result.version}`,
        `Network: ${result.network}/${result.prefix}`,
        result.broadcast ? `Broadcast: ${result.broadcast}` : null,
        `Range Start: ${result.rangeStart}`,
        `Range End: ${result.rangeEnd}`,
        `First Host: ${result.firstHost}`,
        `Last Host: ${result.lastHost}`,
        `Subnet Mask: ${result.subnetMask}`,
        `Wildcard: ${result.wildcard}`,
        `Host Count: ${result.hostCount}`,
        `Reverse DNS Zone: ${result.reverseZone}`,
        `Binary Address: ${result.binaryAddress}`,
        `Binary Mask: ${result.binaryMask}`,
        result.splitSuggestions.length ? `Split Suggestions: ${result.splitSuggestions.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      return {
        success: true,
        summary: `${result.network}/${result.prefix} — ${result.hostCount} host(s)`,
        data: result,
        rawOutput: raw,
        items: [
          { label: 'Network', value: `${result.network}/${result.prefix}`, status: 'info' },
          ...(result.broadcast ? [{ label: 'Broadcast', value: result.broadcast, status: 'info' as const }] : []),
          { label: 'Range', value: `${result.rangeStart} → ${result.rangeEnd}`, status: 'info' },
          { label: 'Hosts', value: result.hostCount, status: 'info' },
          { label: 'Reverse Zone', value: result.reverseZone, status: 'info' },
          { label: 'Split', value: result.splitSuggestions.join(' | ') || 'No smaller split available', status: 'info' },
        ],
      };
    } catch (error) {
      return {
        success: false,
        summary: error instanceof Error ? error.message : 'Invalid CIDR format',
        data: {},
        rawOutput: `Error: ${error instanceof Error ? error.message : 'Use format like 192.168.1.0/24 or 2001:db8::/64'}`,
      };
    }
  },
};

export const subnetCalculatorTool: ToolDefinition = {
  id: 'subnet-calculator',
  slug: 'subnet-calculator',
  name: 'Subnet Calculator',
  category: 'network',
  description: 'Calculate subnet information from an IP address and subnet mask or prefix length. Determine network address, broadcast, usable range, and wildcard mask.',
  shortDescription: 'Calculate subnet details from IP and mask',
  tags: ['subnet', 'ip', 'mask', 'network', 'wildcard'],
  difficulty: 'intermediate',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'ip', label: 'IP Address', type: 'text', placeholder: '192.168.1.100', required: true },
    { id: 'mask', label: 'Subnet Mask or Prefix', type: 'text', placeholder: '255.255.255.0 or /24', required: true },
  ],
  execute: async (inputs) => {
    try {
      const ipStr = asString(inputs.ip, 'IP address', 128).trim();
      const maskStr = asString(inputs.mask, 'Subnet mask or prefix', 128).trim();
      const result = analyzeSubnet(ipStr, maskStr);
      const raw = [
        `IP: ${ipStr}`,
        `Network: ${result.network}/${result.prefix}`,
        result.broadcast ? `Broadcast: ${result.broadcast}` : null,
        `Subnet Mask: ${result.subnetMask}`,
        `Wildcard: ${result.wildcard}`,
        `Usable Hosts: ${result.hostCount}`,
        `Range: ${result.rangeStart} → ${result.rangeEnd}`,
        `Reverse DNS Zone: ${result.reverseZone}`,
        `Binary Address: ${result.binaryAddress}`,
      ].filter(Boolean).join('\n');
      return {
        success: true,
        summary: `${result.network}/${result.prefix} — ${result.hostCount} host(s)`,
        data: result,
        rawOutput: raw,
        items: [
          { label: 'Network', value: `${result.network}/${result.prefix}`, status: 'info' },
          ...(result.broadcast ? [{ label: 'Broadcast', value: result.broadcast, status: 'info' as const }] : []),
          { label: 'Subnet Mask', value: result.subnetMask, status: 'info' },
          { label: 'Wildcard Mask', value: result.wildcard, status: 'info' },
          { label: 'Range', value: `${result.rangeStart} → ${result.rangeEnd}`, status: 'info' },
        ],
      };
    } catch (error) {
      return {
        success: false,
        summary: error instanceof Error ? error.message : 'Invalid subnet input',
        data: {},
        rawOutput: `Error: ${error instanceof Error ? error.message : 'Invalid subnet input'}`,
      };
    }
  },
};

export const commonPortsTool: ToolDefinition = {
  id: 'common-ports',
  slug: 'common-ports',
  name: 'Common Port Reference',
  category: 'network',
  description: 'Quick reference for common network ports and their associated services. Search by port number or service name.',
  shortDescription: 'Reference guide for common network ports',
  tags: ['port', 'tcp', 'udp', 'service', 'reference', 'network'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'search', label: 'Search Port or Service', type: 'text', placeholder: 'e.g., 443, ssh, http...', helperText: 'Leave empty to show all common ports' },
  ],
  execute: async (inputs) => {
    const ports = [
      { port: 20, service: 'FTP Data', protocol: 'TCP', description: 'File Transfer Protocol data transfer' },
      { port: 21, service: 'FTP', protocol: 'TCP', description: 'File Transfer Protocol control' },
      { port: 22, service: 'SSH', protocol: 'TCP', description: 'Secure Shell' },
      { port: 23, service: 'Telnet', protocol: 'TCP', description: 'Unencrypted remote login' },
      { port: 25, service: 'SMTP', protocol: 'TCP', description: 'Simple Mail Transfer Protocol' },
      { port: 53, service: 'DNS', protocol: 'TCP/UDP', description: 'Domain Name System' },
      { port: 67, service: 'DHCP', protocol: 'UDP', description: 'DHCP Server' },
      { port: 68, service: 'DHCP', protocol: 'UDP', description: 'DHCP Client' },
      { port: 69, service: 'TFTP', protocol: 'UDP', description: 'Trivial File Transfer Protocol' },
      { port: 80, service: 'HTTP', protocol: 'TCP', description: 'Hypertext Transfer Protocol' },
      { port: 110, service: 'POP3', protocol: 'TCP', description: 'Post Office Protocol v3' },
      { port: 123, service: 'NTP', protocol: 'UDP', description: 'Network Time Protocol' },
      { port: 135, service: 'RPC', protocol: 'TCP', description: 'Microsoft RPC' },
      { port: 137, service: 'NetBIOS', protocol: 'UDP', description: 'NetBIOS Name Service' },
      { port: 139, service: 'NetBIOS', protocol: 'TCP', description: 'NetBIOS Session Service' },
      { port: 143, service: 'IMAP', protocol: 'TCP', description: 'Internet Access Protocol' },
      { port: 161, service: 'SNMP', protocol: 'UDP', description: 'Simple Network Management Protocol' },
      { port: 389, service: 'LDAP', protocol: 'TCP', description: 'Lightweight Directory Access Protocol' },
      { port: 443, service: 'HTTPS', protocol: 'TCP', description: 'HTTP over TLS/SSL' },
      { port: 445, service: 'SMB', protocol: 'TCP', description: 'Server Message Block' },
      { port: 465, service: 'SMTPS', protocol: 'TCP', description: 'SMTP over SSL' },
      { port: 514, service: 'Syslog', protocol: 'UDP', description: 'System Logging' },
      { port: 587, service: 'SMTP', protocol: 'TCP', description: 'SMTP mail submission' },
      { port: 636, service: 'LDAPS', protocol: 'TCP', description: 'LDAP over SSL' },
      { port: 993, service: 'IMAPS', protocol: 'TCP', description: 'IMAP over SSL' },
      { port: 995, service: 'POP3S', protocol: 'TCP', description: 'POP3 over SSL' },
      { port: 1433, service: 'MSSQL', protocol: 'TCP', description: 'Microsoft SQL Server' },
      { port: 1521, service: 'Oracle', protocol: 'TCP', description: 'Oracle Database' },
      { port: 3306, service: 'MySQL', protocol: 'TCP', description: 'MySQL Database' },
      { port: 3389, service: 'RDP', protocol: 'TCP', description: 'Remote Desktop Protocol' },
      { port: 5432, service: 'PostgreSQL', protocol: 'TCP', description: 'PostgreSQL Database' },
      { port: 5900, service: 'VNC', protocol: 'TCP', description: 'Virtual Network Computing' },
      { port: 6379, service: 'Redis', protocol: 'TCP', description: 'Redis Database' },
      { port: 8080, service: 'HTTP Alt', protocol: 'TCP', description: 'HTTP Alternate / Proxy' },
      { port: 8443, service: 'HTTPS Alt', protocol: 'TCP', description: 'HTTPS Alternate' },
      { port: 27017, service: 'MongoDB', protocol: 'TCP', description: 'MongoDB Database' },
    ];
    const search = optionalString(inputs.search).slice(0, 100).toLowerCase().trim();
    const filtered = search ? ports.filter(p => p.port.toString().includes(search) || p.service.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)) : ports;
    const raw = filtered.map(p => `${p.port}\t${p.service}\t${p.protocol}\t${p.description}`).join('\n');
    return {
      success: true, summary: `Found ${filtered.length} port(s)`, data: { ports: filtered, total: filtered.length }, rawOutput: raw,
      items: filtered.map(p => ({ label: `Port ${p.port}`, value: `${p.service} (${p.protocol}) — ${p.description}`, status: 'info' as const })),
    };
  },
};

export const ipLookupTool: ToolDefinition = {
  id: 'ip-lookup',
  slug: 'ip-lookup',
  name: 'IP Geolocation & ASN Lookup',
  category: 'network',
  description: 'Lookup detailed geographical location, timezone, ISP, organization, and ASN routing info for any IPv4/IPv6 address or domain.',
  shortDescription: 'Locate and identify IP/domain routing',
  tags: ['ip', 'geolocation', 'geo', 'isp', 'asn', 'network'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: true,
  inputs: [
    {
      id: 'ipOrDomain',
      label: 'IP Address or Domain',
      type: 'text',
      placeholder: 'e.g., 8.8.8.8 or google.com',
      required: true,
    },
  ],
  execute: async (inputs) => {
    const ipOrDomain = asString(inputs.ipOrDomain, 'IP address or domain', 2048).trim();
    try {
      const response = await fetch('/api/ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipOrDomain }),
      });

      const resData = await response.json();
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'IP Geolocation failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to scan IP address'}`,
        };
      }

      const items = [
        { label: 'Target Host', value: resData.input, status: 'info' as const },
        { label: 'Resolved IP', value: resData.ip, status: 'info' as const },
        { label: 'Country', value: `${resData.country} (${resData.countryCode})`, status: 'info' as const },
        { label: 'City & Region', value: `${resData.city}, ${resData.region}`, status: 'info' as const },
        { label: 'ISP', value: resData.isp || 'unknown', status: 'info' as const },
        { label: 'ASN', value: resData.asn || 'unknown', status: 'info' as const },
        { label: 'Provider', value: resData.provider || 'unknown', status: 'info' as const },
        { label: 'Timestamp', value: resData.timestamp || 'N/A', status: 'info' as const },
        { label: 'Geo Precision', value: resData.precisionDisclaimer || 'Approximate', status: 'warn' as const },
      ];

      const raw = `Input: ${resData.input}
Resolved IP: ${resData.ip}
----------------------------------------
Provider: ${resData.provider || 'N/A'}
Timestamp: ${resData.timestamp || 'N/A'}
Location Info:
  Country: ${resData.country} (${resData.countryCode})
  Region: ${resData.region}
  City: ${resData.city}
  ZIP/Postal Code: ${resData.zip || 'N/A'}
  Coordinates: ${resData.latitude}, ${resData.longitude}
  Timezone: ${resData.timezone}
Network Routing:
  ISP: ${resData.isp}
  Organization: ${resData.organization || 'N/A'}
  ASN: ${resData.asn}
Precision Disclaimer: ${resData.precisionDisclaimer || 'IP geolocation is approximate.'}
`;

      return {
        success: true,
        summary: `Locate ${resData.ip} — ${resData.city}, ${resData.country}`,
        data: resData,
        rawOutput: raw,
        explanation: 'IP Geolocation queries databases that map IP blocks to physical addresses, ISP companies, and Autonomous System Numbers (ASN). This helps network analysts identify who owns an IP block and where it operates.',
        items,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to query IP Geolocation API',
        data: {},
        rawOutput: `Error: ${message}`,
      };
    }
  },
};

export const networkTools: ToolDefinition[] = [
  cidrCalculatorTool,
  subnetCalculatorTool,
  commonPortsTool,
  ipLookupTool,
];
