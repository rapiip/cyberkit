<div align="center">

# CyberKit

**A workflow-first security toolkit that runs in your browser.**

Audit a website, investigate a domain, triage a suspicious file, or decode a CTF payload without shipping your secrets to someone else's server.

[![CI](https://github.com/rapiip/cyberkit/actions/workflows/ci.yml/badge.svg)](https://github.com/rapiip/cyberkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

`11 workspaces` · `46 tools` · `4 interactive labs` · `0 telemetry`

</div>

---

## Why CyberKit

Most security tool collections are a wall of 50 identical input boxes. You already know what you want to accomplish, so CyberKit starts from the goal instead of the tool.

Pick an intent like *"audit a website"* or *"investigate a domain or IP"*, and you land in a workspace that already has the right panels open, keeps results from every panel in one place, and turns them into a single report when you are done.

Three principles drive the design:

| Principle | What it means in practice |
| :--- | :--- |
| **Privacy by default** | Passwords, JWTs, and secrets are processed in browser memory and never touch history, exports, analytics, or sync. |
| **Explicit consent** | Third-party enrichment is opt in per request. No API key configured means nothing leaves your machine. |
| **Honest results** | Heuristic output carries a confidence score. Rate limits degrade gracefully instead of silently returning empty data. |

---

## Highlights

**Outcome-based navigation.** The workspace index groups all 11 workspaces into Core and Utility tiers, and every workspace carries the security goal it serves. A command palette (`Ctrl` + `K`, or `Cmd` + `K`) searches across workspace names, descriptions, goals, and individual capabilities.

**Unified website audit.** One run covers HTTPS enforcement, DNS, SSL/TLS, security headers, CORS, cookie flags, `robots.txt`, and `security.txt`.

**Cross-tool workspace reports.** Results from multiple panels in the same workspace collect per session in memory only, then export as a single Markdown or JSON report. Privacy-restricted panels never join the collection.

**End-to-end encrypted Cloud Sync.** AES-256-GCM with PBKDF2-SHA-256 key derivation happens in the browser. The server stores an opaque ciphertext envelope with a TTL and cannot read it.

**Breach checks that keep the password local.** SHA-1 hashing runs client side and only a five character prefix reaches the backend. Suffix matching against the returned HIBP range stays in the browser.

**Local-first file triage.** EXIF, MIME, magic bytes, string extraction, and IOC parsing run against the file in your browser. Enrichment is a separate, explicit step.

**Interactive security labs.** Hands-on SQL Injection, XSS, Auth Bypass, and CSRF exercises, kept deliberately separate from the operational analysis workflows.

**Saved reports and history.** Persisted in local storage with Markdown, JSON, and PDF export.

---

## Workspaces

<table>
<tr><th align="left">Core</th><th align="left">What it does</th></tr>
<tr><td><b>Website Security Audit</b></td><td>URL, header, TLS, CORS, policy, robots.txt, and security.txt assessment</td></tr>
<tr><td><b>Domain &amp; IP Intelligence</b></td><td>DNS, DoH, RDAP, IP, ASN, geolocation, and reputation context</td></tr>
<tr><td><b>File Triage &amp; IOC Analysis</b></td><td>Local file metadata, type, strings, hashes, and indicator extraction</td></tr>
<tr><td><b>Secret Scanner</b></td><td>Secret and credential pattern discovery with privacy controls</td></tr>
<tr><td><b>CVE / KEV Intelligence</b></td><td>CVE search enriched with CISA Known Exploited Vulnerabilities data</td></tr>
<tr><td><b>JWT Inspector</b></td><td>Structure, claim, and optional signature inspection</td></tr>
<tr><td><b>Password Security</b></td><td>Generation, zxcvbn strength estimation, and breach checks</td></tr>
</table>

<table>
<tr><th align="left">Utility</th><th align="left">What it does</th></tr>
<tr><td><b>Network Workbench</b></td><td>CIDR, subnet calculation, and common port reference</td></tr>
<tr><td><b>Data Transformation</b></td><td>Composable encoding pipelines plus UUID and token generation</td></tr>
<tr><td><b>CTF Decoder Workbench</b></td><td>Classical ciphers, Morse, XOR, and regex utilities</td></tr>
<tr><td><b>Hash &amp; Crypto Workbench</b></td><td>Text and file hashing, HMAC, checksums, and hash format identification</td></tr>
</table>

Simple mini-tools are not top level menu items. Each capability lives as a tab or panel inside the workspace that owns it, and every legacy `/tools/<slug>` URL permanently redirects to `/workspaces/<workspace>?tool=<id>`.

**Experimental:** Security Labs at `/labs`, isolated from the operational workflows.

---

## Quick Start

```bash
git clone https://github.com/rapiip/cyberkit.git
cd cyberkit/cyberkit-app
npm install
npm run dev
```

Open **http://localhost:3001** and you are running.

Everything above works with zero configuration. To unlock optional API keys or Cloud Sync:

```bash
cp .env.example .env.local
```

Production build:

```bash
npm run build
npm run start     # serves on port 3000
```

**Prerequisites:** Node.js `>=20.9.0` and npm, since the repo ships a `package-lock.json`.

---

## Verification

Run the full gate before you commit or publish:

```bash
npm run verify
```

That chains `lint`, `typecheck`, `test`, `build`, and `npm audit --audit-level=moderate`.

Individual commands:

```bash
npm run lint        # ESLint
npm run typecheck   # next typegen + tsc --noEmit
npm test            # unit tests, fully offline and deterministic
npm run test:e2e    # Playwright (chromium)
npm run test:network  # hits real third-party endpoints, excluded from the default suite
```

`npm run test:e2e` uses `next dev` locally and `next start` when `CI` is set, so CI exercises the production output. Run `npm run build` first when using CI mode.

---

## Architecture

```text
src/
  app/
    api/              Server-side scanner and lookup routes
    audit/            Unified website security audit
    history/          Tool usage history
    labs/             Security learning labs
    reports/          Saved reports and export
    settings/         Application settings
    workspaces/       The 11 workspaces and their capability panel shells
    tools/            Compatibility redirects for legacy mini-tool URLs
  components/
    layout/           Sidebar and command palette
  lib/
    server/           Scanner helpers, timeouts, rate limiting, target validation
    store/            Zustand stores for history and reports
    tools/            Metadata, workspace registry, result schema, lazy executors
    utils/            Shared helpers and report export
public/               Static assets
```

Fifteen API routes back the server-side work: `audit`, `cors`, `cve`, `dns`, `doh`, `enrich`, `headers`, `health`, `ip`, `pwned-password`, `rdap`, `robots`, `security-txt`, `ssl`, and `sync`.

Deeper reading:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) for the threat model, data flow, and coverage matrix
- [`docs/architecture/phase-1-audit.md`](docs/architecture/phase-1-audit.md) for the route, provider, and storage inventory
- [`docs/architecture/phase-2-workspace-navigation.md`](docs/architecture/phase-2-workspace-navigation.md) for the workflow navigation design and route migration table
- [`docs/privacy/data-flow.md`](docs/privacy/data-flow.md) for exactly what each tool does and does not transmit

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Zustand, Framer Motion, jsPDF, Lucide React, ESLint 9.

---

## Security Notes

> **Scope.** CyberKit is built for learning, defensive analysis, CTFs, and auditing systems you own or have explicit written permission to test. Do not point the scanners at third-party targets without authorization.

**What the sensitive tools never persist.** The password generator, strength checker, Pwned Password checker, and JWT Inspector write nothing to history, reports, analytics, `localStorage`, exports, or Cloud Sync.

**Response streaming limits.** Target responses are capped while streaming rather than after the full body is buffered, so a hostile target cannot exhaust server memory by sending a huge payload.

**Outbound port allowlist.** Scans against user-supplied targets are restricted to web ports (default `80,443,591,3000,8000,8008,8080,8443,8888`, configurable via `CYBERKIT_ALLOWED_OUTBOUND_PORTS`). Without this, the scan endpoints double as a port prober for SSH, MySQL, PostgreSQL, Redis, or MongoDB on any public host. Calls to third-party providers are unaffected.

**SSRF protection.** `resolveAndBlockPrivateIp` rejects loopback, private, link-local, IPv4-mapped IPv6, and decimal or hex encoded address forms.

**Geolocation over HTTPS.** IP geolocation uses `ipwho.is` over HTTPS. The previous provider refused HTTPS on its free tier, which sent the IP or domain under investigation in cleartext and leaked the subject of the investigation to anyone on the network path.

**Redis is optional but recommended.** With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, CyberKit uses Upstash Redis for TTL caching, rate limiting, and Cloud Sync. Without them it falls back to a bounded in-memory cache and rate limiter, and Cloud Sync is disabled.

**Proxy headers require a deliberate opt in.** Headers like `x-forwarded-for` are trusted only when `CYBERKIT_TRUST_PROXY_HEADERS=true`.

> ⚠️ **Read this before a public deployment.** Without that flag a Route Handler cannot determine the client address, so every visitor shares one rate-limit bucket and the per-IP budget behaves as a global budget. One busy user can drain it for everyone. The per-target budget still applies per hostname and remains a meaningful control. The app logs a one-time warning when it runs in production without the flag. Conversely, do not enable it where clients can set the header themselves, because a forged header bypasses the limit.

**IOC enrichment is opt in, twice over.** By default the IOC Extractor works purely locally. Indicators reach `/api/enrich` only when you tick *"Explicitly allow provider enrichment"* **and** the deployment has `VIRUSTOTAL_API_KEY`, `ABUSEIPDB_API_KEY`, or `URLHAUS_AUTH_KEY` configured. Without a key the route returns `503 ENRICHMENT_NOT_CONFIGURED` and no indicator leaves the browser.

Found a vulnerability? See [`SECURITY.md`](SECURITY.md).

---

## Environment Variables

See [`.env.example`](.env.example) for the annotated list.

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public URL used for metadata, sitemap, and robots.txt |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint for cache, rate limiting, and Cloud Sync |
| `UPSTASH_REDIS_REST_TOKEN` | Token paired with the Redis URL |
| `CLOUD_SYNC_RETENTION_DAYS` | Encrypted sync retention, 1 to 90, default 30 |
| `CYBERKIT_TRUST_PROXY_HEADERS` | Trust proxy-supplied client IP headers, default `false` |
| `CYBERKIT_ALLOWED_OUTBOUND_PORTS` | Comma-separated outbound port allowlist for scans |
| `NVD_API_KEY` | Higher-rate CVE lookups |
| `SECURITYTRAILS_API_KEY` | DNS history enrichment |
| `ABUSEIPDB_API_KEY` | IP reputation enrichment |
| `SHODAN_API_KEY` | Exposed-service enrichment |
| `VIRUSTOTAL_API_KEY` | IP and file reputation enrichment |
| `URLHAUS_AUTH_KEY` | Malicious URL and IP context |

All API keys are optional. Features that depend on a missing key degrade to a clear "not configured" response rather than failing silently.

---

## Deployment

CyberKit deploys to any platform that supports the Next.js App Router. Before going public:

1. Run `npm run build` and confirm `npm run verify` passes.
2. Restrict access to or rate limit the scanner endpoints.
3. Set `CYBERKIT_TRUST_PROXY_HEADERS=true` only if you control the entire proxy chain.
4. Review your host's outbound network request policy.
5. Confirm your usage of each third-party public API fits its rate limits and terms.

---

## License

[MIT](LICENSE)
