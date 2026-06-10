import type { SavedReport, ScanHistoryEntry } from '@/lib/tools/types';

export const PERSISTENCE_RESTRICTED_TOOL_IDS = new Set([
  'password-generator',
  'password-strength',
  'pwned-password',
  'jwt-decoder',
]);

export function isPersistenceRestrictedTool(toolId: string): boolean {
  return PERSISTENCE_RESTRICTED_TOOL_IDS.has(toolId);
}

export function containsPersistenceRestrictedTool(toolIds: string[]): boolean {
  return toolIds.some(isPersistenceRestrictedTool);
}

export function filterPrivateHistory(entries: ScanHistoryEntry[]): ScanHistoryEntry[] {
  return entries.filter((entry) => !isPersistenceRestrictedTool(entry.toolId));
}

export function filterPrivateReports(reports: SavedReport[]): SavedReport[] {
  return reports.filter((report) => !containsPersistenceRestrictedTool(report.toolsUsed));
}
