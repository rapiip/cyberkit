import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/layout/CommandPalette";
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
      <body className="min-h-full flex">
        <MotionProvider>
          <Sidebar />
          <main id="main-content" className="flex-1 min-h-screen overflow-x-hidden pt-16 md:pt-0">
            {children}
          </main>
          <CommandPalette />
        </MotionProvider>
      </body>
    </html>
  );
}
