# CyberKit Phase 1 Architecture Audit

Date: 2026-06-10

This document records the codebase state and the architecture introduced before
the workspace navigation migration. Existing user-facing tool URLs remain
active in this phase.

## Local Next.js Guidance Reviewed

The implementation was checked against the documentation shipped with the
installed Next.js 16.2.9 package:

- `01-app/01-getting-started/02-project-structure.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/15-route-handlers.md`
- `01-app/02-guides/lazy-loading.md`
- `01-app/02-guides/redirecting.md`
- `01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- `01-app/03-api-reference/04-functions/not-found.md`
- `01-app/03-api-reference/05-config/01-next-config-js/redirects.md`

Relevant decisions:

- App Router pages remain Server Components unless browser interactivity is
  required.
- Dynamic `params` continue to be awaited.
- Tool executors use explicit dynamic imports. The catalog and metadata pages
  do not import executor modules.
- Legacy redirects are represented in the registry but are not activated until
  the workspace routes exist. This avoids redirecting users to dead routes.
- Static legacy redirects can be activated through `next.config.ts` in the
  navigation migration phase.

## Route Inventory

Pages:

- `/`
- `/about`
- `/audit`
- `/history`
- `/labs`
- `/labs/auth-bypass`
- `/labs/csrf`
- `/labs/sql-injection`
- `/labs/xss`
- `/reports`
- `/settings`
- `/tools`
- `/tools/compare`
- `/tools/[slug]`

Route Handlers:

- `POST /api/audit`
- `POST /api/cors`
- `POST /api/cve`
- `POST /api/dns`
- `POST /api/doh`
- `POST /api/headers`
- `POST /api/ip`
- `POST /api/pwned-password`
- `POST /api/rdap`
- `POST /api/robots`
- `POST /api/security-txt`
- `POST /api/ssl`
- `POST, PUT /api/sync`

Metadata routes are implemented by `manifest.ts`, `robots.ts`, and
`sitemap.ts`.

## Tool Inventory

The catalog contains 46 tools. The target product registry contains exactly 11
workspaces:

| Workspace | Maturity | Current tools |
| --- | --- | --- |
| Website Security Audit | Core | URL Analyzer, CSP Generator, HTTP Header Checker, SSL Checker, CORS Checker, robots.txt Viewer, security.txt Checker |
| Domain & IP Intelligence | Core | DNS Lookup, DNS over HTTPS, RDAP/WHOIS, IP Geolocation & ASN |
| Network Workbench | Utility | CIDR Calculator, Subnet Calculator, Common Ports |
| Data Transformation | Utility | Base64, URL, HTML Entity, Hex, Binary, Unicode |
| JWT Inspector | Core | JWT Decoder |
| CTF Decoder Workbench | Experimental | ROT13, Caesar, Morse, XOR, Regex |
| Hash & Crypto Workbench | Utility | MD5, SHA-1, SHA-256, SHA-512, HMAC, Hash Identifier, File Hash, UUID, Random String |
| Password Security | Core | Password Generator, Password Strength, Pwned Password |
| File Triage & IOC Analysis | Core | EXIF, MIME, Magic Bytes, String Extractor, IOC Extractor, Email Format |
| Secret Scanner | Core | GitHub Secret Pattern Checker |
| CVE / KEV Intelligence | Core | CVE & KEV Lookup |

Secure generation is a utility capability inside Hash & Crypto Workbench. This
keeps the primary workspace count at 11 without removing UUID or random token
generation.

## Registry Architecture

Canonical catalog metadata is stored in `src/lib/tools/metadata.ts`. Each entry
now includes:

- workspace ownership and capabilities
- Core, Utility, or Experimental maturity
- privacy level
- provider metadata and optional-provider state
- expected inputs
- known limitations
- explicit test coverage status

Executor loading is isolated in `src/lib/tools/registry.ts`. A catalog import
does not import the category executor modules. `loadToolExecutor(slug)` loads
the owning workspace module, verifies the executor identity, combines it with
canonical metadata, and normalizes the result.

`validateRegistrySync()` verifies:

- unique IDs and slugs
- every workspace tool has metadata and an executor
- metadata/executor slug and category agreement
- metadata/executor input agreement

The current implementation still stores legacy definition fields beside
executor functions inside category modules. Those fields are no longer used as
catalog metadata and are checked only as a migration integrity assertion. They
can be removed when executor modules are split further.

## Legacy Route Plan

`src/lib/tools/workspaces.ts` contains one mapping for every existing
`/tools/{slug}` URL. Each mapping targets a future
`/workspaces/{workspace}#{tool}` location.

Mappings have `active: false` in this phase because the workspace pages do not
exist yet. Existing URLs and bookmarks therefore retain their current
behavior. The navigation migration must create the workspace routes before
turning these mappings into Next.js redirects.

## Result Model

`src/lib/tools/result-model.ts` introduces schema version `1.0.0` and these
statuses:

- `success`
- `partial`
- `empty`
- `validation-error`
- `provider-error`
- `timeout`
- `rate-limited`

Legacy executor results are normalized at the loader boundary. Findings use a
structured contract containing:

- `id`
- `title`
- `severity`
- `confidence`
- `evidence`
- `remediation`
- `source`
- `references`

Tool result downloads now use a structured JSON envelope containing the schema
version, export timestamp, tool identity, and normalized result.

## Providers and Outbound Data

Current external or deployment-provided services:

- deployment DNS resolver
- Google Public DNS
- optional SecurityTrails
- IANA RDAP bootstrap and RDAP.org
- IP-API
- optional AbuseIPDB, Shodan, VirusTotal, and URLhaus
- NIST NVD and CISA KEV
- Have I Been Pwned Pwned Passwords
- optional Upstash Redis for cache, rate limiting, and Cloud Sync

Website audit, headers, CORS, robots.txt, security.txt, and TLS routes make
server-side requests to user-selected public targets. Scanner helpers perform
target normalization, private-address blocking, timeout handling, redirect
validation, and rate limiting.

Privacy gaps identified during phase 1 have since been resolved:

- Pwned Password sends only a five-character SHA-1 prefix; suffix matching runs
  in the browser.
- Cloud Sync stores only a versioned AES-GCM envelope with automatic expiry.
- Password and JWT workflows are excluded from history, reports, application
  export data, analytics, and localStorage.

See `docs/privacy/data-flow.md` for the current contracts.

## Storage Inventory

Browser local storage:

- `cyberkit-history:v1`, maximum 200 entries
- `cyberkit-favorites:v1`
- `cyberkit-reports:v1`, maximum 100 reports
- legacy keys for history, favorites, and reports
- `cyberkit:lastSyncedAt`

Optional server storage:

- Upstash Redis cache and rate-limit keys in scanner helpers
- `cyberkit:sync:v1:{sha256(syncId)}` for encrypted Cloud Sync envelopes

No database, IndexedDB, cookies, or server-side file storage is currently used.

## UI Component Inventory

- Homepage: `src/app/DashboardClient.tsx`
- Main navigation: `src/components/layout/Sidebar.tsx`
- Global search: `src/components/layout/CommandPalette.tsx`
- Tool catalog: `src/app/tools/ToolsClient.tsx`
- Tool execution: `src/app/tools/[slug]/ToolClient.tsx`
- Compare workspace: `src/app/tools/compare/CompareToolsClient.tsx`
- Website audit: `src/app/audit/AuditClient.tsx`
- History: `src/app/history/HistoryClient.tsx`
- Reports: `src/app/reports/ReportsClient.tsx`
- Settings and Cloud Sync: `src/app/settings/SettingsClient.tsx`

The report preview no longer interprets Markdown using a custom line parser.
It renders stored content as escaped plain text through React. PDF export still
parses the known audit report format into a fixed PDF layout; it does not emit
HTML.

## Test and Fixture Inventory

Before this phase, tests covered:

- registry uniqueness, input defaults, and metadata duplication
- selected route validation and mocked HIBP behavior
- storage import validation
- scanner normalization, rate limiting, and one redirect-to-private SSRF case

This phase adds tests for:

- metadata architecture fields
- lazy workspace executor loading
- metadata/executor synchronization
- 11-workspace ownership
- complete legacy-route planning
- result and finding schemas
- schema-versioned JSON exports

There is no dedicated fixture directory yet. File, JWT, secret, IOC, DNS,
CIDR, encoding, provider, browser E2E, accessibility, and mobile fixtures/tests
remain work for the corresponding implementation phases.

## Remaining Architecture Limitations

- Navigation and homepage still expose the current flat tool catalog.
- Workspace routes and active redirects are intentionally deferred.
- Some workspace loaders share a category module, so opening one workspace can
  load sibling executors from the same source file. The catalog itself remains
  executor-free.
- Existing executor return objects do not all construct structured findings
  directly; normalization supplies the common envelope.
- Saved audit reports remain Markdown strings in storage for backward
  compatibility, although preview rendering is plain text.
