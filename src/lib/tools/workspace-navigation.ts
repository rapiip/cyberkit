import { allToolMetadata, type ToolMetadata } from './metadata';
import {
  getWorkspaceById,
  getWorkspaceForTool,
  workspaceRegistry,
  type WorkspaceDefinition,
  type WorkspaceId,
} from './workspaces';

export interface NavigationResult {
  id: string;
  name: string;
  description: string;
  href: string;
  maturity: WorkspaceDefinition['maturity'];
  kind: 'workspace' | 'tool';
  workspaceName: string;
}

export const priorityWorkspaces = workspaceRegistry.filter((workspace) => workspace.priority);

export function getWorkspaceTools(workspaceId: WorkspaceId): ToolMetadata[] {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) return [];
  return workspace.toolIds
    .map((toolId) => allToolMetadata.find((tool) => tool.id === toolId))
    .filter((tool): tool is ToolMetadata => tool !== undefined);
}

export function getWorkspaceToolHref(tool: Pick<ToolMetadata, 'id'>): string {
  const workspace = getWorkspaceForTool(tool.id);
  return workspace ? `${workspace.canonicalPath}?tool=${encodeURIComponent(tool.id)}` : '/workspaces';
}

export function searchWorkspaceNavigation(query: string): NavigationResult[] {
  const normalized = query.trim().toLowerCase();
  const workspaceResults = workspaceRegistry
    .filter((workspace) => {
      if (!normalized) return true;
      return [workspace.name, workspace.description, workspace.goal, workspace.maturity]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    })
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      href: workspace.canonicalPath,
      maturity: workspace.maturity,
      kind: 'workspace' as const,
      workspaceName: workspace.name,
    }));

  if (!normalized) return workspaceResults;

  const toolResults = allToolMetadata
    .filter((tool) =>
      [tool.name, tool.shortDescription, tool.description, tool.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
    .map((tool) => {
      const workspace = getWorkspaceForTool(tool.id);
      return {
        id: tool.id,
        name: tool.name,
        description: tool.shortDescription,
        href: getWorkspaceToolHref(tool),
        maturity: workspace?.maturity ?? tool.maturity,
        kind: 'tool' as const,
        workspaceName: workspace?.name ?? 'Workspace',
      };
    });

  return [...workspaceResults, ...toolResults];
}

export function nextSelectionIndex(
  currentIndex: number,
  direction: 'next' | 'previous',
  resultCount: number
): number {
  if (resultCount <= 0) return 0;
  if (direction === 'next') return Math.min(currentIndex + 1, resultCount - 1);
  return Math.max(currentIndex - 1, 0);
}
