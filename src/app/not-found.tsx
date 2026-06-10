import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="glass-card max-w-lg p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The requested CyberKit page or tool does not exist.
          </p>
        </div>
        <Link href="/" className="btn-cyber btn-primary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
