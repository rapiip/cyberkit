import type { ToolDefinition, ToolResultItem } from '../types';
import { asString } from '../validation';

interface HeaderAnalysisItem {
  name: string;
  isPresent: boolean;
  value: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface HeaderApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  url?: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  securityHeadersAnalysis?: HeaderAnalysisItem[];
  summary?: { score: number; passedCount: number; failedCount: number };
}

interface SslFinding {
  rule: string;
  impact: string;
  scoreDeduction: number;
}

interface SslApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  hostname?: string;
  validTo?: string;
  validFrom?: string;
  audit?: {
    grade?: string;
    score?: number;
    findings?: SslFinding[];
    safetyRatings?: Record<string, 'pass' | 'warn' | 'fail'>;
  };
  protocol?: string;
  cipher?: { name?: string; version?: string; standardName?: string } | null;
  isExpired?: boolean;
  daysRemaining?: number;
  bits?: number;
  asn1Curve?: string | null;
  nistCurve?: string | null;
  sigalg?: string;
  ca?: boolean;
  isSelfSigned?: boolean;
  subject?: { CN?: string; O?: string };
  issuer?: { CN?: string; O?: string };
  serialNumber?: string;
  fingerprint?: string;
  fingerprint256?: string;
  subjectaltname?: string | null;
  ocspUrls?: string[];
  caIssuers?: string[];
}

interface CorsProbeResponse {
  status?: number;
  allowOrigin?: string | null;
  allowCredentials?: boolean;
}

interface CorsApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  url?: string;
  vulnerabilityLevel?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  maliciousOriginTest?: CorsProbeResponse;
  wildcardTest?: CorsProbeResponse;
  findings?: string[];
}

interface RobotsApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  found?: boolean;
  content?: string;
}

interface SecurityTxtApiResponse extends Record<string, unknown> {
  success: boolean;
  error?: string;
  found?: boolean;
  path?: string;
  content?: string;
  message?: string;
  directives?: Record<string, string[]>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'API connection failed';
}

export const urlAnalyzerTool: ToolDefinition = {
  id: 'url-analyzer',
  slug: 'url-analyzer',
  name: 'URL Analyzer',
  category: 'web-security',
  description: 'Parse and analyze URL components including protocol, hostname, port, path, query parameters, and fragment. Detects potential security issues in URLs.',
  shortDescription: 'Parse and analyze URL components',
  tags: ['url', 'parse', 'analyze', 'web', 'security'],
  difficulty: 'beginner',
  executionType: 'client',
  isFeatured: true,
  inputs: [
    { id: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com/path?key=value#section', required: true },
  ],
  execute: async (inputs) => {
    const urlStr = asString(inputs.url, 'URL', 20_000);
    try {
      const url = new URL(urlStr);
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      const warnings: string[] = [];
      if (url.protocol === 'http:') warnings.push('Using HTTP (not secure)');
      if (url.username || url.password) warnings.push('Contains credentials in URL');
      if (url.port && !['80', '443', ''].includes(url.port)) warnings.push(`Non-standard port: ${url.port}`);
      const paramCount = Object.keys(params).length;
      if (paramCount > 10) warnings.push(`High number of parameters: ${paramCount}`);
      // Check for common suspicious patterns
      const susPatterns = [/script/i, /javascript:/i, /data:/i, /vbscript:/i, /on\w+=/i];
      if (susPatterns.some(p => p.test(urlStr))) warnings.push('Potential XSS patterns detected');
      const raw = `URL: ${urlStr}\nProtocol: ${url.protocol}\nHostname: ${url.hostname}\nPort: ${url.port || 'default'}\nPath: ${url.pathname}\nQuery: ${url.search}\nFragment: ${url.hash}\nParams: ${JSON.stringify(params, null, 2)}\nWarnings: ${warnings.length > 0 ? warnings.join(', ') : 'None'}`;
      return {
        success: true, summary: `${url.hostname} — ${warnings.length} warning(s)`, data: { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, search: url.search, hash: url.hash, params, warnings }, rawOutput: raw,
        items: [
          { label: 'Protocol', value: url.protocol, status: url.protocol === 'https:' ? 'pass' : 'warn' },
          { label: 'Hostname', value: url.hostname, status: 'info' },
          { label: 'Port', value: url.port || 'default', status: 'info' },
          { label: 'Path', value: url.pathname, status: 'info' },
          { label: 'Parameters', value: `${paramCount} param(s)`, status: 'info' },
          { label: 'Fragment', value: url.hash || 'none', status: 'info' },
          ...warnings.map(w => ({ label: 'Warning', value: w, status: 'warn' as const })),
        ],
      };
    } catch {
      return { success: false, summary: 'Invalid URL', data: {}, rawOutput: 'Error: Could not parse URL' };
    }
  },
};

export const cspGeneratorTool: ToolDefinition = {
  id: 'csp-generator',
  slug: 'csp-generator',
  name: 'CSP Generator',
  category: 'web-security',
  description: 'Generate Content Security Policy headers with a visual builder. Select allowed sources for scripts, styles, images, and other resources.',
  shortDescription: 'Build Content Security Policy headers',
  tags: ['csp', 'content-security-policy', 'header', 'security', 'xss'],
  difficulty: 'intermediate',
  executionType: 'client',
  isFeatured: false,
  inputs: [
    { id: 'defaultSrc', label: 'default-src', type: 'text', placeholder: "'self'", defaultValue: "'self'" },
    { id: 'scriptSrc', label: 'script-src', type: 'text', placeholder: "'self' https://cdn.example.com", defaultValue: "'self'" },
    { id: 'styleSrc', label: 'style-src', type: 'text', placeholder: "'self' 'unsafe-inline'", defaultValue: "'self' 'unsafe-inline'" },
    { id: 'imgSrc', label: 'img-src', type: 'text', placeholder: "'self' data: https:", defaultValue: "'self' data:" },
    { id: 'fontSrc', label: 'font-src', type: 'text', placeholder: "'self' https://fonts.gstatic.com", defaultValue: "'self'" },
    { id: 'connectSrc', label: 'connect-src', type: 'text', placeholder: "'self'", defaultValue: "'self'" },
    { id: 'frameSrc', label: 'frame-src', type: 'text', placeholder: "'none'", defaultValue: "'none'" },
    { id: 'objectSrc', label: 'object-src', type: 'text', placeholder: "'none'", defaultValue: "'none'" },
    { id: 'upgradeInsecure', label: 'Upgrade Insecure Requests', type: 'checkbox', defaultValue: true },
    { id: 'blockMixed', label: 'Block All Mixed Content', type: 'checkbox', defaultValue: true },
  ],
  execute: async (inputs) => {
    const sourceInputs = ['defaultSrc', 'scriptSrc', 'styleSrc', 'imgSrc', 'fontSrc', 'connectSrc', 'frameSrc', 'objectSrc'];
    for (const key of sourceInputs) {
      if (typeof inputs[key] === 'string' && inputs[key].length > 5000) {
        return { success: false, summary: `${key} is too long`, data: {}, rawOutput: `Error: ${key} is too long` };
      }
    }
    const directives: string[] = [];
    const addDirective = (name: string, value: string | unknown) => {
      const v = (value as string || '').trim();
      if (v) directives.push(`${name} ${v}`);
    };
    addDirective('default-src', inputs.defaultSrc);
    addDirective('script-src', inputs.scriptSrc);
    addDirective('style-src', inputs.styleSrc);
    addDirective('img-src', inputs.imgSrc);
    addDirective('font-src', inputs.fontSrc);
    addDirective('connect-src', inputs.connectSrc);
    addDirective('frame-src', inputs.frameSrc);
    addDirective('object-src', inputs.objectSrc);
    if (inputs.upgradeInsecure) directives.push('upgrade-insecure-requests');
    if (inputs.blockMixed) directives.push('block-all-mixed-content');
    const csp = directives.join('; ');
    const raw = `Content-Security-Policy: ${csp}\n\n<!-- HTML meta tag -->\n<meta http-equiv="Content-Security-Policy" content="${csp}">`;
    return { success: true, summary: `CSP with ${directives.length} directives`, data: { csp, directives }, rawOutput: raw };
  },
};

export const httpHeaderCheckerTool: ToolDefinition = {
  id: 'http-header-checker',
  slug: 'http-header-checker',
  name: 'HTTP Header Checker',
  category: 'web-security',
  description: 'Analyze HTTP headers of any website in real-time. Detects active response headers, evaluates missing security headers, and scores overall safety configuration.',
  shortDescription: 'Audit response and security headers',
  tags: ['headers', 'http', 'security-headers', 'audit', 'csp'],
  difficulty: 'intermediate',
  executionType: 'server',
  isFeatured: true,
  inputs: [
    { id: 'url', label: 'URL or Hostname', type: 'text', placeholder: 'e.g., github.com', required: true },
  ],
  execute: async (inputs) => {
    const url = asString(inputs.url, 'URL or hostname', 2048).trim();
    try {
      const response = await fetch('/api/headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const resData = (await response.json()) as HeaderApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'Header analysis failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to scan headers'}`,
        };
      }

      const rawHeaders = Object.entries(resData.headers || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const items: ToolResultItem[] = [];
      const analysis = resData.securityHeadersAnalysis || [];
      analysis.forEach((a) => {
        items.push({
          label: a.name,
          value: a.isPresent ? a.value || '' : 'MISSING (Unsafe)',
          status: a.isPresent ? ('pass' as const) : (a.severity === 'critical' || a.severity === 'high' ? ('fail' as const) : ('warn' as const)),
          details: a.isPresent ? a.description : `Recommendation: ${a.recommendation}`,
        });
      });

      return {
        success: true,
        summary: `Score: ${resData.summary?.score ?? 0}/100 — ${resData.summary?.passedCount ?? 0} of ${(resData.summary?.passedCount ?? 0) + (resData.summary?.failedCount ?? 0)} headers found`,
        data: resData,
        rawOutput: `URL Scanned: ${resData.url}\nHTTP Status: ${resData.status} ${resData.statusText}\n\n[Security Header Analysis]\n` +
          analysis.map((a) => `${a.name}: ${a.isPresent ? 'OK' : 'MISSING'} (${a.isPresent ? a.value : a.recommendation})`).join('\n') +
          `\n\n[All Response Headers]\n${rawHeaders}`,
        explanation: 'HTTP response headers are crucial to configuring a secure environment. Missing security headers like Content-Security-Policy (CSP) and HSTS leave websites vulnerable to XSS, Clickjacking, and Session Hijacking.',
        items,
      };
    } catch (err: unknown) {
      return {
        success: false,
        summary: 'Failed to contact Header Checker API',
        data: {},
        rawOutput: `Error: ${getErrorMessage(err)}`,
      };
    }
  },
};

export const sslCheckerTool: ToolDefinition = {
  id: 'ssl-checker',
  slug: 'ssl-checker',
  name: 'SSL/TLS Cryptographic Auditor',
  category: 'web-security',
  description: 'Inspect a server\'s active SSL/TLS configuration, certificate attributes, negotiated protocol version, and cryptographic cipher. Evaluates trust, cipher safety, signature strength, and overall compliance.',
  shortDescription: 'Audit SSL/TLS certificate and connection security',
  tags: ['ssl', 'tls', 'certificate', 'https', 'expiry', 'audit', 'cryptography'],
  difficulty: 'intermediate',
  executionType: 'server',
  isFeatured: true,
  inputs: [
    { id: 'hostname', label: 'Hostname or URL', type: 'text', placeholder: 'e.g., google.com', required: true },
  ],
  execute: async (inputs) => {
    const hostname = asString(inputs.hostname, 'Hostname', 2048).trim();
    try {
      const response = await fetch('/api/ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname }),
      });

      const resData = (await response.json()) as SslApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'SSL Cryptographic Audit failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to scan SSL certificate configuration'}`,
        };
      }

      const validToDate = new Date(resData.validTo || Date.now());
      const validFromDate = new Date(resData.validFrom || Date.now());
      const audit = resData.audit || {};
      const ratings = audit.safetyRatings || {};

      const items = [
        { label: 'Security Grade', value: `${audit.grade || 'N/A'} (Score: ${audit.score || 0}/100)`, status: audit.grade === 'A' || audit.grade === 'B' ? ('pass' as const) : audit.grade === 'C' ? ('warn' as const) : ('fail' as const) },
        { label: 'Negotiated TLS Version', value: resData.protocol || 'Unknown', status: ratings.protocol === 'pass' ? ('pass' as const) : ('fail' as const) },
        { label: 'Negotiated Cipher Suite', value: resData.cipher?.name || 'Unknown', status: ratings.cipher === 'pass' ? ('pass' as const) : ('fail' as const) },
        { label: 'Validation Status', value: resData.isExpired ? 'EXPIRED' : 'VALID', status: resData.isExpired ? ('fail' as const) : ('pass' as const) },
        { label: 'Remaining Validity', value: `${resData.daysRemaining} days`, status: ratings.expiry === 'pass' ? ('pass' as const) : ratings.expiry === 'warn' ? ('warn' as const) : ('fail' as const) },
        { label: 'Key Strength', value: `${resData.bits || 'unknown'} bits (${resData.asn1Curve || resData.nistCurve || 'RSA'})`, status: ratings.key === 'pass' ? ('pass' as const) : ('fail' as const) },
        { label: 'Signature Algorithm', value: resData.sigalg || 'Unknown', status: ratings.signature === 'pass' ? ('pass' as const) : ('fail' as const) },
        { label: 'CA Certificate', value: resData.ca ? 'Yes (Certificate Authority)' : 'No (End-entity)', status: 'info' as const },
        { label: 'Self-Signed', value: resData.isSelfSigned ? 'Yes (Untrusted)' : 'No (Trusted)', status: resData.isSelfSigned ? ('fail' as const) : ('pass' as const) },
      ];

      // Format findings
      const findingsList = audit.findings || [];
      const findingsStr = findingsList.length > 0
        ? findingsList.map((f) => `[DEDUCTION: -${f.scoreDeduction}pts] ${f.rule}: ${f.impact}`).join('\n')
        : 'No major security flaws or deprecated configurations identified. Configuration conforms to modern standards.';

      // Format details
      const raw = `======================================================================
         SSL/TLS DEEP CRYPTOGRAPHIC & COMPLIANCE REPORT
======================================================================
Target Hostname:      ${resData.hostname}
Security Rating:      Grade ${audit.grade} (Score: ${audit.score}/100)
Connection Status:    Negotiation Succeeded

[1] TLS CONNECTION METADATA
--------------------------------------------------
Negotiated Protocol:  ${resData.protocol || 'N/A'}
Negotiated Cipher:    ${resData.cipher?.name || 'N/A'}
Cipher SSL Version:   ${resData.cipher?.version || 'N/A'}
Standard RFC Name:    ${resData.cipher?.standardName || 'N/A'}

[2] PEER CERTIFICATE DETAILS
--------------------------------------------------
Subject Common Name:  ${resData.subject?.CN || 'N/A'}
Subject Organization: ${resData.subject?.O || 'N/A'}
Issuer Common Name:   ${resData.issuer?.CN || 'N/A'}
Issuer Organization:  ${resData.issuer?.O || 'N/A'}
Serial Number:        ${resData.serialNumber || 'N/A'}
SHA-256 Fingerprint:  ${resData.fingerprint256 || 'N/A'}
SHA-1 Fingerprint:    ${resData.fingerprint || 'N/A'}
Certificate Authority: ${resData.ca ? 'YES' : 'NO'}

[3] KEY & CRYPTOGRAPHIC PARAMETERS
--------------------------------------------------
Public Key Strength:  ${resData.bits || 'unknown'} bits
Asymmetric Type:      ${resData.asn1Curve || resData.nistCurve ? 'Elliptic Curve (ECC)' : 'RSA'}
Signature Algorithm:  ${resData.sigalg || 'N/A'}
EC Named Curve:       ${resData.nistCurve || resData.asn1Curve || 'None'}

[4] CERTIFICATE VALIDITY DATES
--------------------------------------------------
Valid From:           ${validFromDate.toISOString()}
Valid To:             ${validToDate.toISOString()}
Status:               ${resData.isExpired ? 'EXPIRED (Browser Blocked!)' : 'ACTIVE / VALID'}
Days Until Expiry:    ${resData.daysRemaining} days remaining

[5] SUBJECT ALTERNATIVE NAMES (SANs)
--------------------------------------------------
${resData.subjectaltname || 'None configured'}

[6] AUTHORITY INFORMATION ACCESS (AIA)
--------------------------------------------------
OCSP Responder URLs:  ${resData.ocspUrls?.join(', ') || 'None'}
CA Issuer URLs:       ${resData.caIssuers?.join(', ') || 'None'}

[7] CRYPTOGRAPHIC AUDIT FINDINGS
--------------------------------------------------
${findingsStr}

======================================================================
`;

      return {
        success: true,
        summary: `Grade ${audit.grade} (${audit.score}/100) — TLS Version: ${resData.protocol} — ${resData.isExpired ? 'EXPIRED' : 'VALID'}`,
        data: resData,
        rawOutput: raw,
        explanation: 'TLS/SSL Cryptographic Auditing evaluates secure negotiation properties (ciphers, handshake versions) and the public key parameters of the host\'s leaf certificate. Maintaining a modern TLS 1.3/1.2 layer with strong ECDHE AEAD ciphers, SHA-256 signatures, and >=2048-bit keys prevents eavesdropping, downgrade attacks (like POODLE/BEAST), and collision vulnerability exploits.',
        items,
      };
    } catch (err: unknown) {
      return {
        success: false,
        summary: 'Failed to contact SSL Checker API',
        data: {},
        rawOutput: `Error: ${getErrorMessage(err)}`,
      };
    }
  },
};

export const corsCheckerTool: ToolDefinition = {
  id: 'cors-checker',
  slug: 'cors-checker',
  name: 'CORS Policy Checker',
  category: 'web-security',
  description: 'Evaluate Cross-Origin Resource Sharing configuration of a target URL. Probes reflected origins, wildcards, credentials support, and checks for potential hijacking flaws.',
  shortDescription: 'Audit CORS policy configurations',
  tags: ['cors', 'origin', 'credentials', 'api', 'vulnerability'],
  difficulty: 'intermediate',
  executionType: 'server',
  isFeatured: false,
  inputs: [
    { id: 'url', label: 'Target URL', type: 'text', placeholder: 'e.g., https://api.github.com', required: true },
  ],
  execute: async (inputs) => {
    const url = asString(inputs.url, 'Target URL', 2048).trim();
    try {
      const response = await fetch('/api/cors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const resData = (await response.json()) as CorsApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'CORS audit failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to scan CORS policy'}`,
        };
      }

      const vulnerabilityLevel = resData.vulnerabilityLevel || 'info';
      const items = [
        { label: 'Security Assessment', value: vulnerabilityLevel.toUpperCase(), status: vulnerabilityLevel === 'critical' || vulnerabilityLevel === 'high' ? ('fail' as const) : (vulnerabilityLevel === 'medium' ? ('warn' as const) : ('pass' as const)) },
      ];

      (resData.findings || []).forEach((finding, idx) => {
        items.push({
          label: `Finding ${idx + 1}`,
          value: finding,
          status: vulnerabilityLevel === 'critical' || vulnerabilityLevel === 'high' ? ('fail' as const) : ('warn' as const),
        });
      });

      const raw = `CORS Analysis for: ${resData.url}
Vulnerability Level: ${vulnerabilityLevel.toUpperCase()}

[Origin Test: Arbitrary Domain (https://evil.example.com)]
  Status: ${resData.maliciousOriginTest?.status || 'Error/Blocked'}
  Access-Control-Allow-Origin: ${resData.maliciousOriginTest?.allowOrigin || 'Not reflected (Safe)'}
  Access-Control-Allow-Credentials: ${resData.maliciousOriginTest?.allowCredentials ? 'true (Vulnerable!)' : 'false (Secure)'}

[Origin Test: Wildcard (*)]
  Access-Control-Allow-Origin: ${resData.wildcardTest?.allowOrigin || 'Not supported'}
  Access-Control-Allow-Credentials: ${resData.wildcardTest?.allowCredentials ? 'true' : 'false'}

[Findings Summary]
${(resData.findings || []).map((f) => `- ${f}`).join('\n')}
`;

      return {
        success: true,
        summary: `CORS vulnerability level: ${vulnerabilityLevel.toUpperCase()}`,
        data: resData,
        rawOutput: raw,
        explanation: 'CORS (Cross-Origin Resource Sharing) is a mechanism that allows restricted resources on a web page to be requested from another domain. Bad configurations (like reflecting the Origin header combined with allow-credentials) enable malicious sites to steal users authenticated session data.',
        items,
      };
    } catch (err: unknown) {
      return {
        success: false,
        summary: 'Failed to contact CORS Checker API',
        data: {},
        rawOutput: `Error: ${getErrorMessage(err)}`,
      };
    }
  },
};

export const robotsTxtTool: ToolDefinition = {
  id: 'robots-txt-viewer',
  slug: 'robots-txt-viewer',
  name: 'robots.txt Viewer',
  category: 'web-security',
  description: 'Download and view the robots.txt file of any website to reveal hidden administration directories, crawl rules, sitemaps, and bot instructions.',
  shortDescription: 'Fetch and view robots.txt crawl rules',
  tags: ['robots', 'crawl', 'admin', 'sitemap', 'recon'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: false,
  inputs: [
    { id: 'url', label: 'Website URL', type: 'text', placeholder: 'e.g., google.com', required: true },
  ],
  execute: async (inputs) => {
    const url = asString(inputs.url, 'Website URL', 2048).trim();
    try {
      const response = await fetch('/api/robots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const resData = (await response.json()) as RobotsApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'Failed to fetch robots.txt',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to fetch robots.txt file'}`,
        };
      }

      const items = [
        { label: 'Status', value: resData.found ? 'FOUND' : 'NOT FOUND', status: resData.found ? ('pass' as const) : ('warn' as const) },
      ];

      return {
        success: true,
        summary: resData.found ? 'robots.txt found successfully' : 'robots.txt not found',
        data: resData,
        rawOutput: resData.content,
        explanation: 'robots.txt tells search engine crawlers which URLs they can request from your site. In a security context, it is checked during reconnaissance to identify hidden administration portals or directories that site owners want search bots to ignore.',
        items,
      };
    } catch (err: unknown) {
      return {
        success: false,
        summary: 'Failed to query robots.txt API',
        data: {},
        rawOutput: `Error: ${getErrorMessage(err)}`,
      };
    }
  },
};

export const securityTxtTool: ToolDefinition = {
  id: 'security-txt-checker',
  slug: 'security-txt-checker',
  name: 'security.txt Checker',
  category: 'web-security',
  description: 'Probe a domain for the presence of a security.txt file (RFC 9116) at standard paths. Parses security contact info, encryption keys, and policy guidelines.',
  shortDescription: 'Fetch and parse security.txt contact info',
  tags: ['security.txt', 'rfc9116', 'contact', 'vulnerability', 'disclosure'],
  difficulty: 'beginner',
  executionType: 'server',
  isFeatured: false,
  inputs: [
    { id: 'url', label: 'Domain or URL', type: 'text', placeholder: 'e.g., google.com', required: true },
  ],
  execute: async (inputs) => {
    const url = asString(inputs.url, 'Domain or URL', 2048).trim();
    try {
      const response = await fetch('/api/security-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const resData = (await response.json()) as SecurityTxtApiResponse;
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'Failed to check security.txt',
          data: {},
          rawOutput: `Error: ${resData.error || 'Failed to scan security.txt file'}`,
        };
      }

      const items: ToolResultItem[] = [
        { label: 'Status', value: resData.found ? 'FOUND' : 'NOT FOUND', status: resData.found ? ('pass' as const) : ('warn' as const) },
      ];

      if (resData.found) {
        items.push({ label: 'Discovered Path', value: resData.path || 'N/A', status: 'info' as const });
        const contacts = resData.directives?.contact || [];
        contacts.forEach((c) => {
          items.push({ label: 'Contact Method', value: c, status: 'info' as const });
        });
      }

      return {
        success: true,
        summary: resData.found ? `security.txt found at ${resData.path}` : 'security.txt not found',
        data: resData,
        rawOutput: resData.found ? resData.content : resData.message,
        explanation: 'security.txt is an RFC 9116 standard defining a text file that websites can use to outline their security contact information, encryption keys, and vulnerability disclosure policies so researchers can report security bugs easily.',
        items,
      };
    } catch (err: unknown) {
      return {
        success: false,
        summary: 'Failed to query security.txt API',
        data: {},
        rawOutput: `Error: ${getErrorMessage(err)}`,
      };
    }
  },
};

export const webSecurityTools: ToolDefinition[] = [
  urlAnalyzerTool,
  cspGeneratorTool,
  httpHeaderCheckerTool,
  sslCheckerTool,
  corsCheckerTool,
  robotsTxtTool,
  securityTxtTool,
];
