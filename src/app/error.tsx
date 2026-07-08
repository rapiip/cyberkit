'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import StatePanel from '@/components/ui/StatePanel';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
              <button onClick={reset} className="btn-cyber btn-primary">
                <RotateCcw size={15} /> Retry
              </button>
              <Link href="/" className="btn-cyber btn-secondary">
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
