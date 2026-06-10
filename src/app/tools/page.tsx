import type { Metadata } from 'next';
import ToolsClient from './ToolsClient';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Browse CyberKit cybersecurity utilities for DNS, web security, hashing, encoding, OSINT, forensics, and CTF workflows.',
  alternates: {
    canonical: '/tools',
  },
};

export default function Page() {
  return <ToolsClient />;
}
