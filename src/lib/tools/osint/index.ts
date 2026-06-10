import type { ToolDefinition } from '../types';
import { LOCAL_ANALYSIS_MAX_FILE_BYTES, scanSecretsInText } from '@/lib/security/local-analysis';
import { asString, assertFiles, optionalString } from '../validation';

export const emailFormatTool: ToolDefinition = {
  id: 'email-format', slug: 'email-format', name: 'Email Format Checker', category: 'osint',
  description: 'Validate email address format and extract components. Check for common disposable email providers.',
  shortDescription: 'Validate and analyze email addresses',
  tags: ['email', 'validate', 'format', 'osint'], difficulty: 'beginner', executionType: 'client', isFeatured: false,
  inputs: [{ id: 'email', label: 'Email Address', type: 'text', placeholder: 'user@example.com', required: true }],
  execute: async (inputs) => {
    const email = asString(inputs.email, 'Email address', 320).trim();
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
  description: 'Scan pasted text or uploaded files for likely secrets using local, redacted pattern matching with entropy checks and false-positive controls.',
  shortDescription: 'Detect secrets in code and files',
  tags: ['github', 'secret', 'api-key', 'token', 'leak', 'security'], difficulty: 'intermediate', executionType: 'client', isFeatured: false,
  persistHistory: false,
  inputs: [
    { id: 'input', label: 'Code / Text', type: 'textarea', placeholder: 'Paste code to scan for secrets...' },
    { id: 'files', label: 'Files', type: 'file', helperText: 'Optional. Scan one or more local files without uploading them.', multiple: true },
    { id: 'allowlist', label: 'Allowlist Terms', type: 'textarea', placeholder: 'example-token\nfixture-secret', helperText: 'One term per line. Matching lines are skipped before reporting.' },
    { id: 'ignoreComments', label: 'Ignore comment lines', type: 'checkbox', defaultValue: true },
    { id: 'ignoreFixtures', label: 'Ignore test and fixture paths', type: 'checkbox', defaultValue: true },
    { id: 'minEntropy', label: 'Minimum entropy', type: 'number', defaultValue: 3.2, helperText: 'Raise this to reduce generic false positives.' },
  ],
  execute: async (inputs, context) => {
    const pasted = optionalString(inputs.input).trim();
    const files = Array.isArray(inputs.files) && inputs.files.length
      ? assertFiles(inputs.files, 'Files', LOCAL_ANALYSIS_MAX_FILE_BYTES)
      : [];
    if (!pasted && files.length === 0) {
      throw new Error('Provide pasted text or at least one file to scan.');
    }
    const allowlist = optionalString(inputs.allowlist)
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean);
    const options = {
      allowlist,
      ignoreComments: Boolean(inputs.ignoreComments ?? true),
      ignoreTestFixtures: Boolean(inputs.ignoreFixtures ?? true),
      minEntropy: Math.max(0, Number(inputs.minEntropy) || 3.2),
    };

    const findings = [];
    const scanSources = [
      ...(pasted ? [{ name: 'pasted-input.txt', text: asString(pasted, 'Code / text', 200_000) }] : []),
      ...files.map((file) => ({ file })),
    ];

    for (let index = 0; index < scanSources.length; index += 1) {
      if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const source = scanSources[index];
      context?.onProgress?.({
        current: index + 1,
        total: scanSources.length,
        label: 'Scanning source for secrets',
      });
      if ('text' in source) {
        findings.push(...scanSecretsInText(source.name, source.text, options));
        continue;
      }
      const text = await source.file.text();
      findings.push(...scanSecretsInText(source.file.name, text, options));
    }

    const raw = findings.length
      ? findings.map((finding) => `[${finding.location}] ${finding.type} (${finding.confidence}): ${finding.maskedPreview}`).join('\n')
      : 'No secrets detected';
    return {
      success: true, summary: `${findings.length} potential secret(s) found across ${scanSources.length} source(s)`, data: { findings, count: findings.length }, rawOutput: raw,
      severity: findings.length > 0 ? 'high' : undefined,
      explanation: 'Scanning runs locally in the browser. Findings are redacted by default, deduplicated, filtered with entropy thresholds, and can ignore comments or test fixtures to reduce false positives.',
      items: findings.length
        ? findings.flatMap((finding) => ([
            { label: 'Type', value: finding.type, status: 'fail' as const },
            { label: 'Location', value: finding.location, status: 'info' as const },
            { label: 'Line', value: String(finding.line), status: 'info' as const },
            { label: 'Confidence', value: finding.confidence, status: finding.confidence === 'high' ? 'fail' as const : 'warn' as const },
            { label: 'Masked Preview', value: finding.maskedPreview, status: 'warn' as const },
          ]))
        : [{ label: 'Result', value: 'No secrets detected', status: 'pass' as const }],
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
    const query = asString(inputs.query, 'CVE ID or keyword', 120).trim();
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
