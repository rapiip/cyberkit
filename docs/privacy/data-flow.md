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
the rendered and exported result. Tokens and verification material are excluded
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

There is no server-side recovery for a forgotten passphrase.
