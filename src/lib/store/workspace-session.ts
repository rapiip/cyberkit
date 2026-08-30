import { create } from 'zustand';
import { isPersistenceRestrictedTool } from '@/lib/security/privacy';
import type { ToolResult } from '@/lib/tools/types';
import type { WorkspaceId } from '@/lib/tools/workspaces';

/**
 * In-memory collection of the capability results produced during the current
 * browser session, grouped by workspace.
 *
 * This store is deliberately NOT persisted. It exists so an analyst can run
 * several panels in one workspace (say DNS, RDAP, IP and TLS for the same
 * domain) and then assemble one report from those runs.
 *
 * Privacy: tools listed in PERSISTENCE_RESTRICTED_TOOL_IDS are rejected here as
 * well as in the history and report stores. Their inputs and outputs must not
 * reach reports or exports, and a session collection feeding a report export is
 * exactly that path.
 */

export interface WorkspaceSessionEntry {
  id: string;
  workspaceId: WorkspaceId;
  toolId: string;
  toolName: string;
  /** Short, already-truncated description of the input. */
  inputSummary: string;
  /** Primary target the run was about, used to title the report. */
  target: string;
  result: ToolResult;
  createdAt: string;
}

export interface WorkspaceSessionInput {
  workspaceId: WorkspaceId;
  toolId: string;
  toolName: string;
  inputSummary: string;
  target: string;
  result: ToolResult;
}

/** Maximum runs retained per workspace so a long session cannot grow unbounded. */
export const MAX_SESSION_ENTRIES_PER_WORKSPACE = 40;

interface WorkspaceSessionStore {
  entries: WorkspaceSessionEntry[];
  recordResult: (entry: WorkspaceSessionInput) => void;
  removeEntry: (id: string) => void;
  clearWorkspace: (workspaceId: WorkspaceId) => void;
  clearAll: () => void;
}

export function canCollectToolResult(toolId: string) {
  return !isPersistenceRestrictedTool(toolId);
}

export const useWorkspaceSessionStore = create<WorkspaceSessionStore>((set, get) => ({
  entries: [],
  recordResult: (entry) => {
    if (!canCollectToolResult(entry.toolId)) return;

    const next: WorkspaceSessionEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const current = get().entries;
    // Keep the newest run per workspace/tool/target so re-running a panel
    // replaces its previous entry instead of stacking duplicates.
    const withoutSupersededRun = current.filter(
      (existing) =>
        !(
          existing.workspaceId === entry.workspaceId &&
          existing.toolId === entry.toolId &&
          existing.target === entry.target
        )
    );

    const workspaceEntries = [next, ...withoutSupersededRun.filter((item) => item.workspaceId === entry.workspaceId)]
      .slice(0, MAX_SESSION_ENTRIES_PER_WORKSPACE);
    const otherEntries = withoutSupersededRun.filter((item) => item.workspaceId !== entry.workspaceId);

    set({ entries: [...workspaceEntries, ...otherEntries] });
  },
  removeEntry: (id) => set({ entries: get().entries.filter((entry) => entry.id !== id) }),
  clearWorkspace: (workspaceId) =>
    set({ entries: get().entries.filter((entry) => entry.workspaceId !== workspaceId) }),
  clearAll: () => set({ entries: [] }),
}));

export function selectWorkspaceEntries(entries: WorkspaceSessionEntry[], workspaceId: WorkspaceId) {
  return entries.filter((entry) => entry.workspaceId === workspaceId);
}
