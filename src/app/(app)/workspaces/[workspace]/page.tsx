import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WorkspaceClient from './WorkspaceClient';
import { getWorkspaceTools } from '@/lib/tools/workspace-navigation';
import { getWorkspaceById, workspaceRegistry, type WorkspaceId } from '@/lib/tools/workspaces';

type WorkspacePageProps = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ tool?: string | string[] }>;
};

export function generateStaticParams() {
  return workspaceRegistry.map((workspace) => ({ workspace: workspace.id }));
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { workspace: workspaceId } = await params;
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) notFound();

  return {
    title: workspace.name,
    description: workspace.description,
    alternates: { canonical: workspace.canonicalPath },
  };
}

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { workspace: workspaceId } = await params;
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) notFound();
  const query = await searchParams;
  const requestedTool = Array.isArray(query.tool) ? query.tool[0] : query.tool;
  const tools = getWorkspaceTools(workspace.id as WorkspaceId);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading workspace...</div>}>
      <WorkspaceClient workspace={workspace} tools={tools} initialToolId={requestedTool} />
    </Suspense>
  );
}
