'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="glass-card max-w-lg p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            CyberKit could not render this view. Retry the view or return to the dashboard.
          </p>
        </div>
        <button onClick={reset} className="btn-cyber btn-primary">
          Retry
        </button>
      </div>
    </div>
  );
}
