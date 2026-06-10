import { allToolMetadata, getToolMetadataBySlug } from './metadata';
import { normalizeToolResult } from './result-model';
import { getWorkspaceById, type WorkspaceId } from './workspaces';
import type { LoadedToolDefinition, ToolDefinition } from './types';

type ExecutorLoader = () => Promise<ToolDefinition[]>;

const loadedExecutorWorkspaces = new Set<WorkspaceId>();

function trackedLoader(workspaceId: WorkspaceId, loader: ExecutorLoader): ExecutorLoader {
  return async () => {
    loadedExecutorWorkspaces.add(workspaceId);
    return loader();
  };
}

const workspaceExecutorLoaders: Record<WorkspaceId, ExecutorLoader> = {
  'website-security-audit': trackedLoader('website-security-audit', async () => {
    const toolModule = await import('./web-security');
    return toolModule.webSecurityTools;
  }),
  'domain-ip-intelligence': trackedLoader('domain-ip-intelligence', async () => {
    const [dnsModule, networkModule] = await Promise.all([import('./dns'), import('./network')]);
    return [...dnsModule.dnsTools, ...networkModule.networkTools];
  }),
  'network-workbench': trackedLoader('network-workbench', async () => {
    const toolModule = await import('./network');
    return toolModule.networkTools;
  }),
  'data-transformation': trackedLoader('data-transformation', async () => {
    const [encodingModule, hashingModule] = await Promise.all([import('./encoding'), import('./hashing')]);
    return [...encodingModule.encodingTools, ...hashingModule.hashingTools];
  }),
  'jwt-inspector': trackedLoader('jwt-inspector', async () => {
    const toolModule = await import('./encoding');
    return toolModule.encodingTools;
  }),
  'ctf-decoder-workbench': trackedLoader('ctf-decoder-workbench', async () => {
    const [encodingModule, ctfModule] = await Promise.all([import('./encoding'), import('./ctf')]);
    return [...encodingModule.encodingTools, ...ctfModule.ctfTools];
  }),
  'hash-crypto-workbench': trackedLoader('hash-crypto-workbench', async () => {
    const toolModule = await import('./hashing');
    return toolModule.hashingTools;
  }),
  'password-security': trackedLoader('password-security', async () => {
    const toolModule = await import('./hashing');
    return toolModule.hashingTools;
  }),
  'file-triage-ioc': trackedLoader('file-triage-ioc', async () => {
    const [forensicsModule, osintModule] = await Promise.all([import('./forensics'), import('./osint')]);
    return [...forensicsModule.forensicsTools, ...osintModule.osintTools];
  }),
  'secret-scanner': trackedLoader('secret-scanner', async () => {
    const toolModule = await import('./osint');
    return toolModule.osintTools;
  }),
  'cve-kev-intelligence': trackedLoader('cve-kev-intelligence', async () => {
    const toolModule = await import('./osint');
    return toolModule.osintTools;
  }),
};

export async function loadToolExecutor(slug: string): Promise<LoadedToolDefinition | undefined> {
  const metadata = getToolMetadataBySlug(slug);
  if (!metadata) return undefined;

  const definitions = await workspaceExecutorLoaders[metadata.workspaceId]();
  const executable = definitions.find((tool) => tool.slug === slug);
  if (!executable) throw new Error(`Tool metadata exists without an executor: ${slug}`);
  if (executable.id !== metadata.id) {
    throw new Error(`Tool executor id mismatch for ${slug}: expected ${metadata.id}, received ${executable.id}`);
  }

  return {
    ...metadata,
    execute: async (inputs) => normalizeToolResult(await executable.execute(inputs)),
  };
}

export function getLoadedExecutorWorkspaces(): WorkspaceId[] {
  return Array.from(loadedExecutorWorkspaces);
}

export async function validateRegistrySync(): Promise<void> {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const metadata of allToolMetadata) {
    if (ids.has(metadata.id)) throw new Error(`Duplicate tool id: ${metadata.id}`);
    if (slugs.has(metadata.slug)) throw new Error(`Duplicate tool slug: ${metadata.slug}`);
    ids.add(metadata.id);
    slugs.add(metadata.slug);
  }

  for (const workspaceId of Object.keys(workspaceExecutorLoaders) as WorkspaceId[]) {
    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) throw new Error(`Executor loader has no workspace metadata: ${workspaceId}`);
    const definitions = await workspaceExecutorLoaders[workspaceId]();

    for (const toolId of workspace.toolIds) {
      const metadata = allToolMetadata.find((tool) => tool.id === toolId);
      const executable = definitions.find((tool) => tool.id === toolId);
      if (!metadata) throw new Error(`Workspace references missing metadata: ${toolId}`);
      if (!executable) throw new Error(`Missing executor for ${toolId}`);
      if (executable.slug !== metadata.slug) throw new Error(`Slug mismatch for ${toolId}`);
      if (executable.category !== metadata.category) throw new Error(`Category mismatch for ${toolId}`);
      if (JSON.stringify(executable.inputs) !== JSON.stringify(metadata.inputs)) {
        throw new Error(`Input metadata mismatch for ${toolId}`);
      }
    }
  }
}
