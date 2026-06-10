import {
  FileScan,
  Hash,
  KeyRound,
  LockKeyhole,
  Network,
  Puzzle,
  Radar,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const iconMap = {
  FileScan,
  Hash,
  KeyRound,
  LockKeyhole,
  Network,
  Puzzle,
  Radar,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Workflow,
};

export default function WorkspaceIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? Workflow;
  return <Icon size={size} aria-hidden="true" />;
}
