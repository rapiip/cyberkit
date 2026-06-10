export type ToolCategory =
  | 'web-security'
  | 'dns'
  | 'network'
  | 'encoding'
  | 'hashing'
  | 'forensics'
  | 'osint'
  | 'ctf'
  | 'labs';

export type ExecutionType = 'client' | 'server' | 'api';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ToolMaturity = 'core' | 'utility' | 'experimental';
export type PrivacyLevel = 'local' | 'sensitive-local' | 'server-proxied' | 'external-provider';
export type TestCoverageStatus = 'none' | 'partial' | 'unit' | 'integration' | 'e2e';
export type ResultStatus =
  | 'success'
  | 'partial'
  | 'empty'
  | 'validation-error'
  | 'provider-error'
  | 'timeout'
  | 'rate-limited';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingConfidence = 'high' | 'medium' | 'low';

export const RESULT_SCHEMA_VERSION = '1.0.0';

export interface ToolInput {
  id: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'number' | 'select' | 'file' | 'url' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  helperText?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  evidence: string;
  remediation: string;
  source: string;
  references: string[];
}

export interface ToolResultInput {
  success: boolean;
  status?: ResultStatus;
  schemaVersion?: string;
  title?: string;
  summary?: string;
  data: Record<string, unknown>;
  rawOutput?: string;
  explanation?: string;
  severity?: FindingSeverity;
  items?: ToolResultItem[];
  findings?: Finding[];
}

export interface ToolResult extends ToolResultInput {
  status: ResultStatus;
  schemaVersion: string;
  findings: Finding[];
}

export interface ToolResultItem {
  label: string;
  value: string;
  status?: 'pass' | 'warn' | 'fail' | 'info';
  details?: string;
}

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  shortDescription: string;
  tags: string[];
  difficulty: Difficulty;
  executionType: ExecutionType;
  isFeatured: boolean;
  inputs: ToolInput[];
  persistHistory?: boolean;
  execute: (inputs: Record<string, unknown>) => Promise<ToolResultInput>;
}

export interface LoadedToolDefinition extends Omit<ToolDefinition, 'execute'> {
  execute: (inputs: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolProvider {
  id: string;
  name: string;
  kind: 'browser' | 'cyberkit' | 'public-api' | 'optional-api';
  optional: boolean;
}

export interface ToolTestCoverage {
  status: TestCoverageStatus;
  unit: boolean;
  route: boolean;
  fixtures: boolean;
  e2e: boolean;
}

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
}

export interface ScanHistoryEntry {
  id: string;
  toolId: string;
  toolName: string;
  input: string;
  resultSummary: string;
  rawResult: string;
  status: 'success' | 'error' | 'warning';
  createdAt: string;
}

export interface SavedReport {
  id: string;
  title: string;
  target: string;
  content: string;
  format: 'markdown' | 'json';
  toolsUsed: string[];
  createdAt: string;
  updatedAt: string;
}
