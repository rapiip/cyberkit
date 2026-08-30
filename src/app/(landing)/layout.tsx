import type { Metadata } from 'next';
import './landing.css';

export const metadata: Metadata = {
  title: 'CyberKit — Cybersecurity Toolkit',
  description:
    'A fast, unified cybersecurity toolkit for web security checks, DNS analysis, encoding, hashing, file inspection, and security learning labs.',
  alternates: { canonical: '/' },
};

/**
 * Marketing shell for the public landing page.
 *
 * This is a nested layout: the surrounding `<html>`/`<body>` elements are owned
 * by `src/app/layout.tsx`. The landing route intentionally renders without the
 * console sidebar and command palette.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="landing-shell min-h-screen">{children}</div>;
}
