'use client';

import { AlertTriangle } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';

export default function WorkspaceError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="page-shell-tight max-w-3xl">
      <StatePanel
        icon={<AlertTriangle size={24} />}
        title="Workspace could not be loaded"
        description="The workspace encountered an unexpected rendering error."
        tone="error"
        action={
          <button type="button" onClick={unstable_retry} className="btn-cyber btn-primary">
            Retry workspace
          </button>
        }
      />
    </div>
  );
}
