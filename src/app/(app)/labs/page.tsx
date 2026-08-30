import type { Metadata } from 'next';
import LabsClient from './LabsClient';

export const metadata: Metadata = {
  title: 'Security Labs',
  description: 'Practice cybersecurity concepts safely in local-only learning labs for SQL injection, XSS, CSRF, and authentication bypass defenses.',
  alternates: {
    canonical: '/labs',
  },
};

export default function Page() {
  return <LabsClient />;
}
