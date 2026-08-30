import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WorkspaceClient from './WorkspaceClient';
import { getWorkspaceTools } from '@/lib/tools/workspace-navigation';
import { getWorkspaceById, workspaceRegistry, type WorkspaceId } from '@/lib/tools/workspaces';

type WorkspacePageProps = {
  params: Promise<{ workspace: string }>;
};

export function generateStaticParams() {
  return workspaceRegistry.map((workspace) => ({ workspace: workspace.id }));
}

/**
 * The workspace registry is fixed and fully enumerated above, so any other
 * segment genuinely does not exist and Next can reject it without rendering.
 *
 * This only works while the page stays statically prerenderable. Reading
 * `searchParams` here would force a dynamic render, and `notFound()` during a
 * dynamic render produced the 404 page with an HTTP 200 status, which tells
 * crawlers and uptime monitors that a non-existent workspace is a valid page.
 * The `?tool=` selection is therefore read on the client, where the workspace
 * shell already keeps the URL in sync via history.replaceState.
 */
export const dynamicParams = false;

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

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspace: workspaceId } = await params;
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) notFound();
  const tools = getWorkspaceTools(workspace.id as WorkspaceId);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading workspace...</div>}>
      <WorkspaceClient workspace={workspace} tools={tools} />
    </Suspense>
  );
}
