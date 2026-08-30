# CyberKit Architecture and Documentation

## 1. Local vs Server/Provider Processing
CyberKit employs a hybrid processing model to prioritize privacy and security:
- **Local Processing (Client-Side)**: Password generation, strength analysis (zxcvbn), encoding/decoding, UUID generation, hashing, and JWT parsing/verification (RSA/HMAC). These never leave the browser.
- **Server Processing (Next.js API Routes)**: Domain/IP intelligence, CVE/KEV lookups, file triage IOC extraction, and DNS queries. The server acts as a proxy (`scanner.ts`) to external threat intelligence providers to hide the user's IP from the providers and to aggregate results.
- **Provider Policy**: Server requests to external providers drop user-identifying information (IP, hostname) from logging. 

## 2. Limitations and Confidence
- **Heuristic Suggestions**: Transform pipelines and format detection (e.g., Base64, Hex) use regex and heuristics, providing a "Confidence" score (Low/Medium/High). It is not deterministic.
- **IP Geolocation**: Geolocation provided by ipwho.is over HTTPS is approximate and should never be treated as a precise physical address. The earlier provider refused HTTPS on its free tier, so the target under investigation travelled in cleartext.
- **Threat Intel Limits**: Unauthenticated external lookups may hit rate limits. The application handles these gracefully with partial degradation.

## 3. Threat Model
- **Server-Side Request Forgery (SSRF)**: Mitigated by `resolveAndBlockPrivateIp` which actively blocks `127.0.0.0/8`, `10.0.0.0/8`, `169.254.0.0/16`, IPv4-mapped IPv6, and decimal/hex encoded IPs.
- **Cross-Site Scripting (XSS)**: Mitigated by React's default escaping and strict Content Security Policy (CSP).
- **Data Leakage**: The custom JSON logger (`logger.ts`) explicitly deletes sensitive inputs (passwords, tokens, target URLs, IPs) before logging.
- **Rate Limiting**: Durable IP and Target-based rate limiting via Redis (Upstash) with an in-memory fallback.

## 4. Data Flow
1. **Input**: User submits data via React UI.
2. **Validation**: Client-side parsing and format validation.
3. **Execution**: 
   - If local tool: processed immediately in browser memory.
   - If server tool: hits `/api/*` route.
4. **Server Proxying**: Request passes through `scanner.ts` -> Rate Limit check -> Private IP SSRF check -> External Fetch -> JSON Response Normalization.
5. **Output**: Result model normalizes data into a standard schema (Findings, Evidence, Source) and presents it to the user.

## 5. Retention and Provider Policy
- **Cloud Sync**: Workspaces synced to Redis use an AES-GCM encrypted envelope. The server NEVER sees the plaintext.
- **Expiry**: Redis keys for synced states are strictly TTL-enforced (e.g., 7 days).
- **History Export**: Password, secret, and JWT tools are explicitly excluded from local history exports to prevent credential leakage.

## 6. Self-Hosting
CyberKit can be self-hosted securely:
1. Clone the repository.
2. Copy `.env.example` to `.env.local` and provide optional API keys (Shodan, VirusTotal, AbuseIPDB, URLhaus).
3. Provide `UPSTASH_REDIS_REST_URL` and `TOKEN` for distributed rate-limiting and Cloud Sync. If omitted, the app falls back to in-memory processing gracefully.
4. Run `npm install`, then `npm run build`, and `npm start`.

## 7. Version Matrix
- **Node.js**: `>=20.9.0` (LTS recommended)
- **Next.js**: `^16.2.9`
- **React**: `^19.2.7`

## 8. Workspace Matrix
| Tool Area | Category | Processing | Status |
| :--- | :--- | :--- | :--- |
| Website Audit | Core | Server | Stable |
| Domain / IP | Core | Server | Stable |
| File Triage | Core | Server | Stable |
| Secret Scanner | Core | Server | Stable |
| CVE / KEV | Core | Server | Stable |
| Network (Subnets) | Utility | Local | Stable |
| Hash & Crypto | Utility | Local | Stable |
| Transform Pipeline | Utility | Local | Stable |

## 9. Coverage Matrix
| Module | Type | Coverage Focus |
| :--- | :--- | :--- |
| `scanner.ts` | Unit | SSRF prevention, timeouts, limits |
| `routes.ts` | Unit | API endpoint schema & mocked fetches |
| `privacy-critical.ts` | Unit | Redaction, safe exports |
| `utility-workbenches.ts` | Unit | Pure local processing logic |
| `e2e/workflows.spec.ts` | E2E | Priority page loads |
| `e2e/ux.spec.ts` | E2E | Keyboard, Accessibility, Mobile |
| `e2e/privacy.spec.ts` | E2E | No credentials in DOM or storage |
