'use client';

import { AlertTriangle } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';

/**
 * `retry` re-fetches and re-renders the boundary's children, which is what a
 * failed workspace needs. It became stable in Next 16.3; this file previously
 * used the `unstable_retry` prop from 16.2.
 */
export default function WorkspaceError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="page-shell-tight max-w-3xl">
      <StatePanel
        icon={<AlertTriangle size={24} />}
        title="Workspace could not be loaded"
        description="The workspace encountered an unexpected rendering error."
        tone="error"
        action={
          <button type="button" onClick={() => retry()} className="btn-cyber btn-primary">
            Retry workspace
          </button>
        }
      />
    </div>
  );
}
