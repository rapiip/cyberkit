# Privacy-Critical Data Flow

## Pwned Password

1. The browser hashes the password with SHA-1.
2. The browser sends only the first five uppercase hexadecimal characters as
   `{ "hashPrefix": "ABCDE" }`.
3. CyberKit requests the corresponding HIBP range and returns parsed
   `{ suffix, count }` entries.
4. The browser compares the remaining 35 hash characters locally.

Plaintext passwords and SHA-1 suffixes are rejected by the backend contract.
The route uses `Cache-Control: private, no-store` and contains no value logging.

## Password Security

Strength estimation runs locally with `zxcvbn-ts`. Results include conservative
crack-time estimates, matched pattern types, warning text, feedback,
recommendations, and optional HIBP breach status.

Random passwords:

- use Web Crypto;
- use rejection sampling instead of modulo reduction;
- include at least one character from every selected category;
- are shuffled with an unbiased Fisher-Yates implementation.

Passphrases are selected locally from the bundled word list with the same
rejection-sampling primitive.

Password-related inputs and outputs are rejected by both the UI runner and
storage layer. They are not written to history, reports, analytics,
`localStorage`, exported application data, or Cloud Sync.

## JWT Inspector

JWT parsing and verification run locally. The inspector:

- requires exactly three segments and canonical unpadded Base64URL;
- requires UTF-8 JSON objects for header and payload;
- validates the types of `exp`, `nbf`, `iat`, `iss`, `aud`, `sub`, and `jti`;
- applies configurable clock skew;
- detects unsigned, unknown/weak, expired, missing-exp, future, and suspicious
  lifetime conditions;
- optionally verifies HS256/384/512 or RS256/384/512 with a secret, SPKI public
  key, or pasted JWKS.

Decoded tokens are never described as authentic. Only a successful Web Crypto
signature operation produces `verified`. Sensitive claim values are masked in
the rendered result. Tokens and verification material are excluded
from persistent stores and Cloud Sync.

## Cloud Sync

Cloud Sync requires two values:

- **Sync ID**: a non-secret lookup identifier sent to the server.
- **Passphrase**: a secret used only in browser memory.

The browser creates a random 16-byte salt and 12-byte IV, derives an AES-256 key
with PBKDF2-SHA-256 and 310,000 iterations, and encrypts the validated CyberKit
export with AES-GCM. Format version `1` uses authenticated additional data
`cyberkit-sync:v1`.

The server accepts and stores only:

```json
{
  "version": 1,
  "ciphertext": "...",
  "iv": "...",
  "salt": "...",
  "timestamp": "..."
}
```

The passphrase and plaintext export never cross the network. Redis keys use a
SHA-256 digest of the Sync ID. Stored envelopes expire after 30 days by default;
`CLOUD_SYNC_RETENTION_DAYS` can select 1-90 days. AES-GCM authentication produces
a specific wrong-passphrase-or-corrupt-data error without importing anything.
Restore checks format version, integrity, and expiry before import. Decrypted
plaintext bytes are zeroed from the working buffer immediately after parsing.

There is no server-side recovery for a forgotten passphrase.

## Secret Scanner

Secret scanning runs in browser memory by default. CyberKit can scan pasted text
or uploaded local files without sending them to the server.

- findings are redacted by default and shown only as masked previews;
- each finding includes the detected type, file/location, line, column, and
  confidence;
- entropy thresholds, allowlist terms, comment skipping, fixture/test-path
  skipping, deduplication, and placeholder filtering reduce false positives;
- raw secrets are not written to history, reports, analytics, `localStorage`,
  exports, or Cloud Sync.

## File Triage & IOC Analysis

File triage and IOC analysis also run locally by default.

- file typing uses magic-byte detection plus browser-declared MIME and filename
  extension checks;
- EXIF parsing uses `exifr`;
- MIME and signature detection use `file-type` with a local plain-text fallback;
- hashes, entropy, printable strings, metadata, embedded URLs, and IOC
  candidates are derived in the browser;
- IOC extraction supports defanged indicators such as `hxxps://` and `[.]`,
  then validates IPs, domains, URLs, emails, and common hash lengths locally.

Provider enrichment is not performed unless the user explicitly requests it.
This build does not have an enrichment provider configured, so explicit consent
still results in local-only processing.
