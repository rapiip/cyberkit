import type { ReactNode } from 'react';

type Tone = 'neutral' | 'error' | 'success' | 'warning' | 'info';

type StatePanelProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: Tone;
};

const toneStyles: Record<Tone, { card: string; iconBox: string; role?: string }> = {
  neutral: {
    card: '',
    iconBox: 'border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-cyber-cyan',
  },
  error: {
    card: 'border-status-fail/20',
    iconBox: 'border-status-fail/20 bg-status-fail/10 text-status-fail',
    role: 'alert',
  },
  success: {
    card: 'border-status-pass/20',
    iconBox: 'border-status-pass/20 bg-status-pass/10 text-status-pass',
  },
  warning: {
    card: 'border-status-warn/20',
    iconBox: 'border-status-warn/20 bg-status-warn/10 text-status-warn',
  },
  info: {
    card: 'border-cyber-blue/20',
    iconBox: 'border-cyber-blue/20 bg-cyber-blue/10 text-cyber-blue',
  },
};

export default function StatePanel({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
}: StatePanelProps) {
  const styles = toneStyles[tone];
  return (
    <div
      className={`glass-card p-10 text-center ${styles.card}`}
      role={styles.role}
    >
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${styles.iconBox}`}
      >
        {icon}
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
