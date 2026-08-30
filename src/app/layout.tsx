import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "CyberKit — Cybersecurity Toolkit",
    template: "%s — CyberKit",
  },
  description: "A fast, unified cybersecurity toolkit for web security checks, DNS analysis, encoding, hashing, file inspection, and security learning labs.",
  keywords: ["cybersecurity", "tools", "security", "hashing", "encoding", "dns", "ctf", "forensics"],
  applicationName: "CyberKit",
  authors: [{ name: "CyberKit" }],
  creator: "CyberKit",
  publisher: "CyberKit",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "CyberKit",
    title: "CyberKit — Cybersecurity Toolkit",
    description: "A fast, unified cybersecurity toolkit for web security checks, DNS analysis, encoding, hashing, file inspection, and security learning labs.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "CyberKit — Cybersecurity Toolkit",
    description: "A fast, unified cybersecurity toolkit for web security checks, DNS analysis, encoding, hashing, file inspection, and security learning labs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Single root layout for the whole application.
 *
 * Next.js only supports multiple root layouts when there is no top-level
 * `layout.tsx`. Because this file exists, nested layouts such as
 * `(app)/layout.tsx` and `(landing)/layout.tsx` must never render their own
 * `<html>` or `<body>` element.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
