import type { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage CyberKit local data, exports, imports, and optional Cloud Sync backup settings.',
  alternates: {
    canonical: '/settings',
  },
};

export default function Page() {
  return <SettingsClient />;
}
