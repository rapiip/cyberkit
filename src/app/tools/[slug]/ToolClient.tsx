'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Cpu } from 'lucide-react';
import ToolRunner from '@/components/workspaces/ToolRunner';
import { getWorkspaceToolHref } from '@/lib/tools/workspace-navigation';
import type { ToolMetadata } from '@/lib/tools/metadata';

interface ToolClientProps {
  tool: ToolMetadata;
  relatedTools: ToolMetadata[];
  categoryName: string;
}

export default function ToolClient({ tool, relatedTools, categoryName }: ToolClientProps) {
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight size={12} />
        <Link href="/workspaces" className="hover:text-foreground">
          Workspaces
        </Link>
        <ChevronRight size={12} />
        <span className="text-foreground">{tool.name}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Link
          href={getWorkspaceToolHref(tool)}
          className="btn-cyber btn-ghost rounded-lg p-2"
          aria-label={`Back to ${tool.workspaceId} workspace`}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold md:text-2xl">{tool.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-cyan">{tool.maturity}</span>
            <span className="badge badge-purple">{tool.difficulty}</span>
            <span className="badge badge-green">
              <Cpu size={10} className="mr-1" />
              {tool.executionType}-side
            </span>
          </div>
        </div>
      </div>

      <ToolRunner tool={tool} />

      {relatedTools.length > 0 && (
        <section className="mt-8" aria-labelledby="related-tools-heading">
          <h2 id="related-tools-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
            More {categoryName} panels
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedTools.map((relatedTool) => (
              <Link
                key={relatedTool.id}
                href={getWorkspaceToolHref(relatedTool)}
                className="glass-card p-3"
              >
                <h3 className="text-xs font-medium">{relatedTool.name}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {relatedTool.shortDescription}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
