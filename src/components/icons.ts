import {
  BookOpenCheck,
  Bug,
  FileScan,
  FlaskConical,
  Grid2X2,
  Hash,
  History,
  Home,
  KeyRound,
  LockKeyhole,
  Network,
  Puzzle,
  Radar,
  ScanSearch,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { NavigationItem } from '@/lib/navigation';

/**
 * Single icon registry for the whole console.
 *
 * `workspaceIcons` is keyed by the `icon` field of each workspace definition in
 * `src/lib/tools/workspaces.ts`. `navigationIcons` is keyed by the `icon` field
 * of `NavigationItem`. Keeping both here prevents the three drifting copies the
 * sidebar, workspace header, and workspace catalog used to carry.
 */
export const workspaceIcons = {
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
} as const satisfies Record<string, LucideIcon>;

export type WorkspaceIconName = keyof typeof workspaceIcons;

/**
 * Fallback glyph for workspaces whose icon name is not in the registry.
 *
 * Callers index `workspaceIcons` directly rather than going through a resolver
 * function so the React compiler can still see the component reference as
 * static (`react-hooks/static-components`).
 */
export const WORKSPACE_ICON_FALLBACK: LucideIcon = Workflow;

export const navigationIcons = {
  home: Home,
  grid: Grid2X2,
  shield: ShieldCheck,
  radar: Radar,
  file: FileScan,
  scanner: ScanSearch,
  cve: Bug,
  labs: FlaskConical,
  report: BookOpenCheck,
  history: History,
  settings: Settings,
} as const satisfies Record<NavigationItem['icon'], LucideIcon>;
