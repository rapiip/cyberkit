import type { NextConfig } from "next";
import { legacyRouteMappings } from "./src/lib/tools/workspaces";

const nextConfig: NextConfig = {
  /**
   * The dev server only accepts `/_next/*` requests whose Host matches the
   * hostname it was started with (`localhost` by default) and answers everything
   * else with 403. Opening the app at http://127.0.0.1:3001 therefore served the
   * HTML but blocked every chunk, so React never hydrated and the console looked
   * functional while being completely inert.
   *
   * These entries cover loopback by IP and private LAN ranges, which is what you
   * need when testing from another device on the same network. Development only;
   * the option has no effect on a production build.
   */
  allowedDevOrigins: [
    '127.0.0.1',
    '[::1]',
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
    '172.19.*.*',
    '172.2*.*.*',
    '172.30.*.*',
    '172.31.*.*',
    '192.168.*.*',
  ],
  async redirects() {
    return [
      { source: "/tools", destination: "/workspaces", permanent: true },
      {
        source: "/tools/compare",
        destination: "/workspaces/data-transformation",
        permanent: true,
      },
      ...legacyRouteMappings.map(({ source, destination }) => ({
        source,
        destination,
        permanent: true,
      })),
    ];
  },
  async headers() {
    const scriptSrc =
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'";

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
