import {
  RESULT_SCHEMA_VERSION,
  type Finding,
  type ResultStatus,
  type SavedReport,
  type ToolResult,
  type ToolResultInput,
} from './types';

export interface ToolResultExport {
  schemaVersion: string;
  exportedAt: string;
  tool: {
    id: string;
    slug: string;
    name: string;
  };
  result: ToolResult;
}

export interface SavedReportExport {
  schemaVersion: string;
  exportedAt: string;
  report: SavedReport;
}

function inferStatus(result: ToolResultInput): ResultStatus {
  if (result.status) return result.status;
  if (result.success) {
    if (result.items?.length === 0 && Object.keys(result.data).length === 0) return 'empty';
    return 'success';
  }

  const message = `${result.summary ?? ''} ${result.rawOutput ?? ''}`.toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
  if (message.includes('rate limit') || message.includes('too many requests')) return 'rate-limited';
  if (message.includes('invalid') || message.includes('required') || message.includes('must be')) {
    return 'validation-error';
  }
  return 'provider-error';
}

export function normalizeToolResult(result: ToolResultInput): ToolResult {
  return {
    ...result,
    schemaVersion: result.schemaVersion ?? RESULT_SCHEMA_VERSION,
    status: inferStatus(result),
    findings: result.findings ?? [],
  };
}

export function isFinding(value: unknown): value is Finding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const finding = value as Record<string, unknown>;
  return (
    typeof finding.id === 'string' &&
    typeof finding.title === 'string' &&
    ['critical', 'high', 'medium', 'low', 'info'].includes(String(finding.severity)) &&
    ['high', 'medium', 'low'].includes(String(finding.confidence)) &&
    typeof finding.evidence === 'string' &&
    typeof finding.remediation === 'string' &&
    typeof finding.source === 'string' &&
    Array.isArray(finding.references) &&
    finding.references.every((reference) => typeof reference === 'string')
  );
}

export function isToolResult(value: unknown): value is ToolResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.success === 'boolean' &&
    typeof result.schemaVersion === 'string' &&
    ['success', 'partial', 'empty', 'validation-error', 'provider-error', 'timeout', 'rate-limited'].includes(
      String(result.status)
    ) &&
    !!result.data &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data) &&
    Array.isArray(result.findings) &&
    result.findings.every(isFinding)
  );
}

export function createToolResultExport(
  tool: { id: string; slug: string; name: string },
  result: ToolResult
): ToolResultExport {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tool,
    result,
  };
}

export function createSavedReportExport(report: SavedReport): SavedReportExport {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    report,
  };
}
