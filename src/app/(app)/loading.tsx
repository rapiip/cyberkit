export default function Loading() {
  return (
    <div className="min-h-screen p-5 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-7 w-56 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-80 max-w-full rounded bg-muted/70 animate-pulse" />
        </div>

        {/* Primary content skeleton */}
        <div className="glass-card space-y-4 p-5">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2.5 rounded-xl border border-border/60 bg-[color:var(--panel-subtle)] p-4">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-full rounded bg-muted/70 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Secondary content skeleton */}
        <div className="glass-card space-y-3 p-5">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 w-full rounded-lg bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
