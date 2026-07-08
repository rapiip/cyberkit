import Link from 'next/link';
import { Compass, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="glass-card w-full max-w-lg p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan">
          <Compass size={24} />
        </div>
        <div className="text-5xl font-bold tracking-tight text-cyber-cyan" aria-hidden="true">404</div>
        <h1 className="mt-2 text-base font-semibold text-foreground">Page not found</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The requested CyberKit page or tool does not exist. It may have moved, or the link may be broken.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-cyber btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/tools" className="btn-cyber btn-secondary">
            <Search size={15} /> Browse Tools
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tip: press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">Ctrl</kbd>{' '}+{' '}<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">K</kbd> on the dashboard to jump anywhere.
        </p>
      </div>
    </div>
  );
}
