export interface NavigationItem {
  href: string;
  label: string;
  icon: 'home' | 'grid' | 'shield' | 'radar' | 'file' | 'scanner' | 'cve' | 'labs' | 'report' | 'history' | 'settings';
}

export const primaryNavigation: NavigationItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/workspaces', label: 'Workspaces', icon: 'grid' },
  { href: '/workspaces/website-security-audit', label: 'Website Audit', icon: 'shield' },
  { href: '/workspaces/domain-ip-intelligence', label: 'Domain / IP', icon: 'radar' },
  { href: '/workspaces/file-triage-ioc', label: 'File Triage', icon: 'file' },
  { href: '/workspaces/secret-scanner', label: 'Secret Scanner', icon: 'scanner' },
  { href: '/workspaces/cve-kev-intelligence', label: 'CVE / KEV', icon: 'cve' },
];

export const secondaryNavigation: NavigationItem[] = [
  { href: '/labs', label: 'Security Labs', icon: 'labs' },
  { href: '/reports', label: 'Reports', icon: 'report' },
  { href: '/history', label: 'History', icon: 'history' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];
