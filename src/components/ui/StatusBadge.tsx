type Status = 'pass' | 'warn' | 'fail' | 'info' | 'unknown';

type StatusBadgeProps = {
  status: Status | string;
  label?: string;
  className?: string;
};

const statusStyles: Record<Status, string> = {
  pass: 'bg-status-pass/12 text-status-pass border-status-pass/16',
  warn: 'bg-status-warn/12 text-status-warn border-status-warn/16',
  fail: 'bg-status-fail/12 text-status-fail border-status-fail/16',
  info: 'bg-cyber-blue/12 text-cyber-blue border-cyber-blue/16',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const defaultLabels: Record<Status, string> = {
  pass: 'Pass',
  warn: 'Warn',
  fail: 'Fail',
  info: 'Info',
  unknown: 'Unknown',
};

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const normalized = (Object.keys(statusStyles).includes(status) ? status : 'unknown') as Status;
  const style = statusStyles[normalized];
  const text = label ?? defaultLabels[normalized];
  return (
    <span className={`badge border ${style} ${className}`}>
      {text}
    </span>
  );
}
