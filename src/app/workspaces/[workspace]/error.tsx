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
    <div className="mx-auto max-w-3xl p-4 pt-20 md:p-8">
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
