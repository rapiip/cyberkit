export type WorkspaceId =
  | 'website-security-audit'
  | 'domain-ip-intelligence'
  | 'network-workbench'
  | 'data-transformation'
  | 'jwt-inspector'
  | 'ctf-decoder-workbench'
  | 'hash-crypto-workbench'
  | 'password-security'
  | 'file-triage-ioc'
  | 'secret-scanner'
  | 'cve-kev-intelligence';

export interface WorkspaceDefinition {
  id: WorkspaceId;
  name: string;
  description: string;
  maturity: 'core' | 'utility' | 'experimental';
  canonicalPath: `/workspaces/${string}`;
  toolIds: string[];
  primaryToolIds: string[];
  utilityGroups: Array<{
    id: string;
    name: string;
    description: string;
    toolIds: string[];
  }>;
  priority: boolean;
  icon: string;
  goal: string;
  primaryAction?: {
    label: string;
    href: string;
    description: string;
  };
}

export const toolWorkspaceAssignments = {
  'url-analyzer': 'website-security-audit',
  'csp-generator': 'website-security-audit',
  'http-header-checker': 'website-security-audit',
  'ssl-checker': 'website-security-audit',
  'cors-checker': 'website-security-audit',
  'robots-txt-viewer': 'website-security-audit',
  'security-txt-checker': 'website-security-audit',
  'dns-lookup': 'domain-ip-intelligence',
  'dns-over-https': 'domain-ip-intelligence',
  'whois-lookup': 'domain-ip-intelligence',
  'ip-lookup': 'domain-ip-intelligence',
  'cidr-calculator': 'network-workbench',
  'subnet-calculator': 'network-workbench',
  'common-ports': 'network-workbench',
  base64: 'data-transformation',
  'url-encoder': 'data-transformation',
  'html-entity': 'data-transformation',
  'hex-converter': 'data-transformation',
  'binary-converter': 'data-transformation',
  'unicode-converter': 'data-transformation',
  'jwt-decoder': 'jwt-inspector',
  rot13: 'ctf-decoder-workbench',
  'caesar-cipher': 'ctf-decoder-workbench',
  'morse-code': 'ctf-decoder-workbench',
  'xor-helper': 'ctf-decoder-workbench',
  'regex-tester': 'ctf-decoder-workbench',
  'md5-generator': 'hash-crypto-workbench',
  'sha1-generator': 'hash-crypto-workbench',
  'sha256-generator': 'hash-crypto-workbench',
  'sha512-generator': 'hash-crypto-workbench',
  'hmac-generator': 'hash-crypto-workbench',
  'hash-identifier': 'hash-crypto-workbench',
  'file-hash': 'hash-crypto-workbench',
  'uuid-generator': 'data-transformation',
  'random-string': 'data-transformation',
  'password-generator': 'password-security',
  'password-strength': 'password-security',
  'pwned-password': 'password-security',
  'exif-viewer': 'file-triage-ioc',
  'mime-checker': 'file-triage-ioc',
  'magic-bytes': 'file-triage-ioc',
  'string-extractor': 'file-triage-ioc',
  'ioc-extractor': 'file-triage-ioc',
  'email-format': 'file-triage-ioc',
  'github-secret': 'secret-scanner',
  'cve-lookup': 'cve-kev-intelligence',
} as const satisfies Record<string, WorkspaceId>;

function toolIdsFor(workspaceId: WorkspaceId) {
  return Object.entries(toolWorkspaceAssignments)
    .filter(([, assignedWorkspace]) => assignedWorkspace === workspaceId)
    .map(([toolId]) => toolId);
}

export const workspaceRegistry: WorkspaceDefinition[] = [
  {
    id: 'website-security-audit',
    name: 'Website Security Audit',
    description: 'Unified URL, header, TLS, CORS, policy, robots.txt, and security.txt assessment.',
    maturity: 'core',
    canonicalPath: '/workspaces/website-security-audit',
    toolIds: toolIdsFor('website-security-audit'),
    primaryToolIds: ['http-header-checker', 'ssl-checker', 'cors-checker'],
    utilityGroups: [
      {
        id: 'website-discovery',
        name: 'Discovery & Policy Utilities',
        description: 'Inspect URL structure, robots.txt, security.txt, and generate CSP remediation.',
        toolIds: ['url-analyzer', 'robots-txt-viewer', 'security-txt-checker', 'csp-generator'],
      },
    ],
    priority: true,
    icon: 'ShieldCheck',
    goal: 'Audit a website',
    primaryAction: {
      label: 'Run unified website audit',
      href: '/audit',
      description: 'Run the existing combined HTTPS, TLS, header, CORS, cookie, robots.txt, and security.txt workflow.',
    },
  },
  {
    id: 'domain-ip-intelligence',
    name: 'Domain & IP Intelligence',
    description: 'DNS, DoH, RDAP, IP, ASN, geolocation, and reputation context.',
    maturity: 'core',
    canonicalPath: '/workspaces/domain-ip-intelligence',
    toolIds: toolIdsFor('domain-ip-intelligence'),
    primaryToolIds: ['dns-lookup', 'whois-lookup', 'ip-lookup'],
    utilityGroups: [
      {
        id: 'resolver-comparison',
        name: 'Resolver Utility',
        description: 'Compare public DNS-over-HTTPS output with the deployment resolver.',
        toolIds: ['dns-over-https'],
      },
    ],
    priority: true,
    icon: 'Radar',
    goal: 'Investigate a domain or IP',
  },
  {
    id: 'network-workbench',
    name: 'Network Workbench',
    description: 'CIDR, subnet calculation, and common port reference.',
    maturity: 'utility',
    canonicalPath: '/workspaces/network-workbench',
    toolIds: toolIdsFor('network-workbench'),
    primaryToolIds: ['cidr-calculator', 'subnet-calculator'],
    utilityGroups: [
      {
        id: 'network-reference',
        name: 'Reference Panel',
        description: 'Look up common service ports without leaving the network workspace.',
        toolIds: ['common-ports'],
      },
    ],
    priority: false,
    icon: 'Network',
    goal: 'Plan and inspect networks',
  },
  {
    id: 'data-transformation',
    name: 'Data Transformation',
    description: 'Composable encoding and decoding transformations.',
    maturity: 'utility',
    canonicalPath: '/workspaces/data-transformation',
    toolIds: toolIdsFor('data-transformation'),
    primaryToolIds: ['base64'],
    utilityGroups: [
      {
        id: 'encoding-utilities',
        name: 'Encoding Utilities',
        description: 'Run URL, HTML entity, hex, binary, and Unicode transformations as focused panels.',
        toolIds: ['url-encoder', 'html-entity', 'hex-converter', 'binary-converter', 'unicode-converter'],
      },
      {
        id: 'secure-generator',
        name: 'Secure Generator',
        description: 'Generate UUIDs and random strings or tokens from the same utility workspace.',
        toolIds: ['uuid-generator', 'random-string'],
      },
    ],
    priority: false,
    icon: 'Workflow',
    goal: 'Transform or generate data',
  },
  {
    id: 'jwt-inspector',
    name: 'JWT Inspector',
    description: 'JWT structure, claim, and optional signature inspection.',
    maturity: 'core',
    canonicalPath: '/workspaces/jwt-inspector',
    toolIds: toolIdsFor('jwt-inspector'),
    primaryToolIds: ['jwt-decoder'],
    utilityGroups: [],
    priority: true,
    icon: 'KeyRound',
    goal: 'Inspect a JWT',
  },
  {
    id: 'ctf-decoder-workbench',
    name: 'CTF Decoder Workbench',
    description: 'Classical cipher, Morse, XOR, and regex utilities.',
    maturity: 'utility',
    canonicalPath: '/workspaces/ctf-decoder-workbench',
    toolIds: toolIdsFor('ctf-decoder-workbench'),
    primaryToolIds: [],
    utilityGroups: [
      {
        id: 'decoder-utilities',
        name: 'Decoder Utilities',
        description: 'Use classical ciphers, Morse, XOR, and regex helpers as utility panels.',
        toolIds: ['rot13', 'caesar-cipher', 'morse-code', 'xor-helper', 'regex-tester'],
      },
    ],
    priority: false,
    icon: 'Puzzle',
    goal: 'Decode a payload',
  },
  {
    id: 'hash-crypto-workbench',
    name: 'Hash & Crypto Workbench',
    description: 'Text and file hashing, HMAC, checksum generation, and hash-format candidates.',
    maturity: 'utility',
    canonicalPath: '/workspaces/hash-crypto-workbench',
    toolIds: toolIdsFor('hash-crypto-workbench'),
    primaryToolIds: ['sha256-generator', 'file-hash', 'hmac-generator'],
    utilityGroups: [
      {
        id: 'legacy-hashes',
        name: 'Hash Utilities',
        description: 'Generate legacy and alternate digests or inspect hash format candidates.',
        toolIds: ['md5-generator', 'sha1-generator', 'sha512-generator', 'hash-identifier'],
      },
    ],
    priority: false,
    icon: 'Hash',
    goal: 'Hash or verify data',
  },
  {
    id: 'password-security',
    name: 'Password Security',
    description: 'Password generation, strength estimation, and breach checks.',
    maturity: 'core',
    canonicalPath: '/workspaces/password-security',
    toolIds: toolIdsFor('password-security'),
    primaryToolIds: ['password-strength', 'pwned-password'],
    utilityGroups: [
      {
        id: 'password-generation',
        name: 'Password Generator',
        description: 'Create passwords from the same password-security workflow.',
        toolIds: ['password-generator'],
      },
    ],
    priority: true,
    icon: 'LockKeyhole',
    goal: 'Analyze password security',
  },
  {
    id: 'file-triage-ioc',
    name: 'File Triage & IOC Analysis',
    description: 'Local file metadata, type, strings, hashes, and IOC analysis.',
    maturity: 'core',
    canonicalPath: '/workspaces/file-triage-ioc',
    toolIds: toolIdsFor('file-triage-ioc'),
    primaryToolIds: ['exif-viewer', 'mime-checker', 'magic-bytes', 'string-extractor', 'ioc-extractor'],
    utilityGroups: [
      {
        id: 'text-indicator-utilities',
        name: 'Text & Indicator Utilities',
        description: 'Validate email-shaped indicators while triaging text and logs.',
        toolIds: ['email-format'],
      },
    ],
    priority: true,
    icon: 'FileScan',
    goal: 'Analyze a file or log',
  },
  {
    id: 'secret-scanner',
    name: 'Secret Scanner',
    description: 'Secret and credential pattern discovery with privacy controls.',
    maturity: 'core',
    canonicalPath: '/workspaces/secret-scanner',
    toolIds: toolIdsFor('secret-scanner'),
    primaryToolIds: ['github-secret'],
    utilityGroups: [],
    priority: true,
    icon: 'ScanSearch',
    goal: 'Find secrets and exposed credentials',
  },
  {
    id: 'cve-kev-intelligence',
    name: 'CVE / KEV Intelligence',
    description: 'CVE search enriched with CISA Known Exploited Vulnerabilities data.',
    maturity: 'core',
    canonicalPath: '/workspaces/cve-kev-intelligence',
    toolIds: toolIdsFor('cve-kev-intelligence'),
    primaryToolIds: ['cve-lookup'],
    utilityGroups: [],
    priority: true,
    icon: 'ShieldAlert',
    goal: 'Check CVE and KEV intelligence',
  },
];

export interface LegacyRouteMapping {
  toolId: string;
  source: `/tools/${string}`;
  destination: string;
  active: true;
}

export const legacyRouteMappings: LegacyRouteMapping[] = Object.entries(toolWorkspaceAssignments).map(
  ([toolId, workspaceId]) => {
    const workspace = workspaceRegistry.find((item) => item.id === workspaceId);
    if (!workspace) throw new Error(`Missing workspace definition for ${workspaceId}`);
    return {
      toolId,
      source: `/tools/${toolId}`,
      destination: `${workspace.canonicalPath}?tool=${encodeURIComponent(toolId)}`,
      active: true,
    };
  }
);

export function getWorkspaceById(id: string) {
  return workspaceRegistry.find((workspace) => workspace.id === id);
}

export function getWorkspaceForTool(toolId: string) {
  const workspaceId = toolWorkspaceAssignments[toolId as keyof typeof toolWorkspaceAssignments];
  return workspaceId ? getWorkspaceById(workspaceId) : undefined;
}

export function resolveLegacyToolRoute(pathname: string) {
  return legacyRouteMappings.find((mapping) => mapping.source === pathname);
}
