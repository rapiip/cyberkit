import type { ReactNode } from 'react';

type StatePanelProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
};

export default function StatePanel({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
}: StatePanelProps) {
  return (
    <div
      className={`glass-card p-10 text-center ${
        tone === 'error' ? 'border-status-fail/20' : ''
      }`}
    >
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${
          tone === 'error'
            ? 'border-status-fail/20 bg-status-fail/10 text-status-fail'
            : 'border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan'
        }`}
      >
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
