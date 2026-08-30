import {
  WORKSPACE_ICON_FALLBACK,
  workspaceIcons,
  type WorkspaceIconName,
} from '@/components/icons';

export default function WorkspaceIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = workspaceIcons[name as WorkspaceIconName] ?? WORKSPACE_ICON_FALLBACK;
  return <Icon size={size} aria-hidden="true" />;
}
