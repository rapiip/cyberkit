import type { Metadata } from 'next';
import AuditClient from './AuditClient';

export const metadata: Metadata = {
  title: 'Security Audit',
  description: 'Run a responsible web security audit with checks for headers, TLS, DNS, robots, security.txt, CORS, and public exposure signals.',
  alternates: {
    canonical: '/audit',
  },
};

export default function Page() {
  return <AuditClient />;
}
