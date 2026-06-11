export interface NavigationItem {
  href: string;
  label: string;
  icon: 'home' | 'grid' | 'shield' | 'radar' | 'file' | 'scanner' | 'cve' | 'labs' | 'report' | 'history' | 'settings';
}

export const primaryNavigation: NavigationItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/audit', label: 'Website Audit', icon: 'shield' },
  { href: '/workspaces', label: 'Workspaces', icon: 'grid' },
];

export const secondaryNavigation: NavigationItem[] = [
  { href: '/tools', label: 'Tool Library', icon: 'file' },
  { href: '/workspaces/domain-ip-intelligence', label: 'Domain / IP', icon: 'radar' },
  { href: '/workspaces/secret-scanner', label: 'Secret Scanner', icon: 'scanner' },
  { href: '/workspaces/cve-kev-intelligence', label: 'CVE / KEV', icon: 'cve' },
  { href: '/labs', label: 'Security Labs', icon: 'labs' },
  { href: '/reports', label: 'Reports', icon: 'report' },
  { href: '/history', label: 'History', icon: 'history' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];
