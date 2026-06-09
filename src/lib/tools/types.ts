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

export interface ToolInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'file' | 'url' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  helperText?: string;
}

export interface ToolResult {
  success: boolean;
  title?: string;
  summary?: string;
  data: Record<string, unknown>;
  rawOutput?: string;
  explanation?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  items?: ToolResultItem[];
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
  execute: (inputs: Record<string, unknown>) => Promise<ToolResult>;
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
