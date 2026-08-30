'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';

/**
 * Uses `retry` rather than `reset`: a view that failed to render needs its
 * contents re-fetched, not merely the error state cleared. `reset` only re-renders
 * the existing children, so a transient data failure would immediately fail again.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg">
        <StatePanel
          tone="error"
          icon={<AlertOctagon size={24} />}
          title="Something went wrong"
          description="CyberKit could not render this view. Retry the view or return to the dashboard."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => retry()} className="btn-cyber btn-primary">
                <RotateCcw size={15} /> Retry
              </button>
              <Link href="/dashboard" className="btn-cyber btn-secondary">
                Go to Dashboard
              </Link>
            </div>
          }
        />
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-4 rounded-xl border border-status-fail/20 bg-status-fail/5 px-3 py-2 text-center font-mono text-xs text-muted-foreground" role="alert">
            {error.message || 'Unknown error'}
            {error.digest ? ` (digest: ${error.digest})` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
