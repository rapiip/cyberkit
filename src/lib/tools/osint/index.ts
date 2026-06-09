import type { ToolDefinition } from '../types';

export const emailFormatTool: ToolDefinition = {
  id: 'email-format', slug: 'email-format', name: 'Email Format Checker', category: 'osint',
  description: 'Validate email address format and extract components. Check for common disposable email providers.',
  shortDescription: 'Validate and analyze email addresses',
  tags: ['email', 'validate', 'format', 'osint'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'email', label: 'Email Address', type: 'text', placeholder: 'user@example.com', required: true }],
  execute: async (inputs) => {
    const email = (inputs.email as string).trim();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const valid = regex.test(email);
    const [local, domain] = email.split('@') || ['', ''];
    const disposable = ['tempmail.com','throwaway.email','guerrillamail.com','mailinator.com','yopmail.com','10minutemail.com','trashmail.com'];
    const isDisposable = disposable.includes(domain?.toLowerCase());
    return {
      success: true, summary: valid ? `Valid email${isDisposable ? ' (disposable!)' : ''}` : 'Invalid format', data: { valid, local, domain, isDisposable },
      rawOutput: `Email: ${email}\nValid: ${valid}\nLocal: ${local}\nDomain: ${domain}\nDisposable: ${isDisposable}`,
      items: [
        { label: 'Format', value: valid ? 'Valid' : 'Invalid', status: valid ? 'pass' : 'fail' },
        { label: 'Local Part', value: local || 'N/A', status: 'info' },
        { label: 'Domain', value: domain || 'N/A', status: 'info' },
        { label: 'Disposable', value: isDisposable ? 'YES' : 'No', status: isDisposable ? 'warn' : 'pass' },
      ],
    };
  },
};

export const githubSecretTool: ToolDefinition = {
  id: 'github-secret', slug: 'github-secret', name: 'GitHub Secret Pattern Checker', category: 'osint',
  description: 'Scan text for common secret patterns like API keys, tokens, passwords, and credentials that should not be in code.',
  shortDescription: 'Detect secrets and API keys in code',
  tags: ['github', 'secret', 'api-key', 'token', 'leak', 'security'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'input', label: 'Code / Text', type: 'textarea', placeholder: 'Paste code to scan for secrets...', required: true }],
  execute: async (inputs) => {
    const text = inputs.input as string;
    const patterns: { name: string; regex: RegExp }[] = [
      { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'AWS Secret Key', regex: /(?:aws_secret|secret_key|secretkey)[\s=:'"]+([A-Za-z0-9/+=]{40})/gi },
      { name: 'GitHub Token', regex: /gh[ps]_[A-Za-z0-9_]{36,}/g },
      { name: 'Google API Key', regex: /AIza[0-9A-Za-z_-]{35}/g },
      { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z-]+/g },
      { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g },
      { name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|api_secret)[\s=:'"]+([a-zA-Z0-9_-]{20,})/gi },
      { name: 'Generic Secret', regex: /(?:secret|password|passwd|pwd)[\s=:'"]+([^\s'"]{8,})/gi },
      { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
      { name: 'Bearer Token', regex: /Bearer\s+[a-zA-Z0-9_\-.]{20,}/g },
    ];
    const findings: { type: string; match: string; line: number }[] = [];
    const lines = text.split('\n');
    for (const p of patterns) {
      for (let i = 0; i < lines.length; i++) {
        const matches = lines[i].match(p.regex);
        if (matches) matches.forEach(m => findings.push({ type: p.name, match: m.substring(0, 60), line: i + 1 }));
      }
    }
    const raw = findings.length ? findings.map(f => `[Line ${f.line}] ${f.type}: ${f.match}`).join('\n') : 'No secrets detected';
    return {
      success: true, summary: `${findings.length} potential secret(s) found`, data: { findings, count: findings.length }, rawOutput: raw,
      severity: findings.length > 0 ? 'high' : undefined,
      items: findings.length ? findings.map(f => ({ label: f.type, value: `Line ${f.line}: ${f.match}`, status: 'fail' as const })) : [{ label: 'Result', value: 'No secrets detected', status: 'pass' as const }],
    };
  },
};

export const cveLookupTool: ToolDefinition = {
  id: 'cve-lookup',
  slug: 'cve-lookup',
  name: 'CVE & KEV Lookup',
  category: 'osint',
  description: 'Search the NVD CVE API and enrich matching vulnerabilities with CISA Known Exploited Vulnerabilities (KEV) catalog data when available.',
  shortDescription: 'Search CVEs and known exploited status',
  tags: ['cve', 'nvd', 'cisa', 'kev', 'vulnerability', 'exploit'],
  difficulty: 'intermediate',
  executionType: 'server',
  isFeatured: true,
  inputs: [
    {
      id: 'query',
      label: 'CVE ID or Keyword',
      type: 'text',
      placeholder: 'e.g., CVE-2021-44228 or Microsoft Exchange',
      required: true,
    },
    {
      id: 'severity',
      label: 'Severity Filter',
      type: 'select',
      defaultValue: '',
      options: [
        { label: 'Any severity', value: '' },
        { label: 'Critical only', value: 'CRITICAL' },
        { label: 'High only', value: 'HIGH' },
        { label: 'Medium only', value: 'MEDIUM' },
        { label: 'Low only', value: 'LOW' },
      ],
    },
    { id: 'kevOnly', label: 'Known Exploited (CISA KEV) only', type: 'checkbox', defaultValue: false },
    { id: 'ransomwareOnly', label: 'Known ransomware campaign use only', type: 'checkbox', defaultValue: false },
    { id: 'resultsPerPage', label: 'Results Per Page', type: 'number', defaultValue: 10, helperText: '1-50 results per request' },
    { id: 'startIndex', label: 'Start Index', type: 'number', defaultValue: 0, helperText: 'Use the Next Start Index item to load the next page' },
  ],
  execute: async (inputs) => {
    const query = (inputs.query as string).trim();
    const severity = (inputs.severity as string) || '';
    const kevOnly = Boolean(inputs.kevOnly);
    const ransomwareOnly = Boolean(inputs.ransomwareOnly);
    const resultsPerPage = Math.max(1, Math.min(Number(inputs.resultsPerPage) || 10, 50));
    const startIndex = Math.max(0, Number(inputs.startIndex) || 0);

    try {
      const response = await fetch('/api/cve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, severity, kevOnly, ransomwareOnly, resultsPerPage, startIndex }),
      });

      const resData = await response.json();
      if (!resData.success) {
        return {
          success: false,
          summary: resData.error || 'CVE lookup failed',
          data: {},
          rawOutput: `Error: ${resData.error || 'NVD/CISA lookup failed'}`,
        };
      }

      const vulnerabilities = (resData.vulnerabilities || []) as {
        id: string;
        description: string;
        published?: string;
        cvss?: { baseScore?: number; baseSeverity?: string; vectorString?: string } | null;
        weaknesses?: string[];
        references?: { url: string }[];
        cisaKev?: {
          vulnerabilityName: string;
          dateAdded: string;
          requiredAction: string;
          dueDate: string;
          knownRansomwareCampaignUse?: string;
        } | null;
      }[];

      const raw = vulnerabilities.length
        ? vulnerabilities
            .map((vuln) => {
              const cvss = vuln.cvss
                ? `${vuln.cvss.baseSeverity || 'UNKNOWN'} ${vuln.cvss.baseScore ?? 'N/A'} (${vuln.cvss.vectorString || 'no vector'})`
                : 'No CVSS data';
              return `${vuln.id}
CVSS: ${cvss}
CISA KEV: ${vuln.cisaKev ? `YES - added ${vuln.cisaKev.dateAdded}` : 'No'}
Published: ${vuln.published || 'N/A'}
Description: ${vuln.description}
References:
${(vuln.references || []).slice(0, 5).map((ref) => `- ${ref.url}`).join('\n') || '- N/A'}`;
            })
            .join('\n\n----------------------------------------\n\n')
        : 'No CVEs found for this query.';

      const items = vulnerabilities.flatMap((vuln) => {
        const cvssStatus =
          (vuln.cvss?.baseScore || 0) >= 9
            ? 'fail'
            : (vuln.cvss?.baseScore || 0) >= 7
            ? 'warn'
            : 'info';
        return [
          {
            label: vuln.id,
            value: vuln.cvss
              ? `${vuln.cvss.baseSeverity || 'UNKNOWN'} ${vuln.cvss.baseScore ?? 'N/A'}`
              : 'No CVSS score',
            status: vuln.cisaKev ? 'fail' as const : cvssStatus as 'warn' | 'fail' | 'info',
          },
          {
            label: `${vuln.id} KEV`,
            value: vuln.cisaKev ? 'Known exploited in CISA KEV' : 'Not listed in CISA KEV',
            status: vuln.cisaKev ? 'fail' as const : 'info' as const,
          },
        ];
      });
      if (typeof resData.nextStartIndex === 'number') {
        items.push({
          label: 'Next Start Index',
          value: String(resData.nextStartIndex),
          status: 'info' as const,
        });
      }

      return {
        success: true,
        summary: `Showing ${vulnerabilities.length} CVE result(s) from index ${resData.startIndex ?? startIndex}; ${vulnerabilities.filter((v) => v.cisaKev).length} in CISA KEV`,
        data: resData,
        rawOutput: raw,
        severity: vulnerabilities.some((v) => v.cisaKev) ? 'critical' : undefined,
        explanation: 'Results come from the NVD CVE API and are enriched with CISA Known Exploited Vulnerabilities catalog matches. CISA KEV presence means there is evidence of exploitation in the wild and the item should be prioritized.',
        items,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API connection failed';
      return {
        success: false,
        summary: 'Failed to query CVE intelligence APIs',
        data: {},
        rawOutput: `Error: ${message}`,
      };
    }
  },
};

export const osintTools: ToolDefinition[] = [emailFormatTool, githubSecretTool, cveLookupTool];
