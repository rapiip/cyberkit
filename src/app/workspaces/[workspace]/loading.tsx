export default function WorkspaceLoading() {
  return (
    <div className="page-shell space-y-6" aria-label="Loading workspace">
      <div className="glass-card h-44 animate-pulse" />
      <div className="glass-card h-36 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card h-96 animate-pulse" />
        <div className="glass-card h-96 animate-pulse" />
      </div>
    </div>
  );
}
