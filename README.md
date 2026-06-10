# CyberKit

CyberKit adalah toolkit cybersecurity berbasis web untuk analisis keamanan, utilitas CTF, encoding/decoding, hashing, DNS, jaringan, forensik file, OSINT ringan, laporan audit, dan security learning labs.

Aplikasi ini dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, dan Lucide Icons. Sebagian tool berjalan langsung di browser untuk menjaga privasi input, sementara fitur yang membutuhkan akses jaringan memakai API route server-side.

## Fitur Utama

- Dashboard tool dengan pencarian global dan command palette.
- Kategori tool: Web Security, DNS & Domain, Network, Encoding & Decoding, Hashing & Crypto, File & Forensics, OSINT & Threat Intel, CTF Helpers, dan Security Labs.
- Website Security Audit dengan pengecekan HTTPS, DNS, SSL/TLS, security headers, CORS, cookie security, `robots.txt`, dan `security.txt`.
- API route server-side untuk DNS, DoH, SSL, headers, CORS, CVE, RDAP, robots, security.txt, pwned password, IP lookup, dan audit agregat.
- Saved reports yang tersimpan lokal, dengan ekspor Markdown/JSON/PDF.
- Cloud Sync opsional berbasis Upstash Redis untuk backup/restore history, favorites, dan reports lintas perangkat.
- Compare Tools Workspace untuk menjalankan dua tool transformasi data secara berdampingan.
- Security Labs interaktif untuk SQL Injection, XSS, Auth Bypass, dan CSRF.
- Riwayat eksekusi tool berbasis local storage.

## Tech Stack

- Next.js 16.2.6
- React 19
- TypeScript 5
- Tailwind CSS 4
- Zustand
- Framer Motion
- jsPDF
- Lucide React
- ESLint 9

## Prasyarat

- Node.js versi modern yang kompatibel dengan Next.js 16.
- npm, karena repo ini sudah menyertakan `package-lock.json`.

## Menjalankan Lokal

Install dependency:

```bash
npm install
```

Salin konfigurasi env contoh bila ingin mengaktifkan API key opsional atau Cloud Sync:

```bash
cp .env.example .env.local
```

Jalankan development server:

```bash
npm run dev
```

Buka aplikasi di:

```text
http://localhost:3000
```

Build production:

```bash
npm run build
```

Jalankan hasil build:

```bash
npm run start
```

Lint:

```bash
npm run lint
```

## Struktur Proyek

```text
src/
  app/
    api/              API routes untuk scanner dan lookup server-side
    audit/            Halaman website security audit
    history/          Riwayat penggunaan tool
    labs/             Security learning labs
    reports/          Laporan tersimpan dan export
    settings/         Pengaturan aplikasi
    tools/            Katalog, detail tool, dan compare workspace
  components/
    layout/           Sidebar dan command palette
  lib/
    server/           Helper server-side scanner, timeout, rate limit, validasi target
    store/            Zustand stores untuk history dan reports
    tools/            Definisi, registry, kategori, validasi, dan executor tool
    utils/            Helper umum dan export report
public/               Asset statis
```

## Area Tool

- Web Security: URL analyzer, CSP generator, HTTP header checker, SSL checker, CORS checker, robots.txt viewer, security.txt checker.
- DNS & Domain: DNS lookup, DNS over HTTPS, WHOIS lookup.
- Network: CIDR/subnet calculator, common ports, IP lookup.
- Encoding & Decoding: Base64, URL, HTML entity, hex, binary, Unicode, ROT13, Caesar cipher, JWT decoder, Morse code.
- Hashing & Crypto: MD5, SHA-1, SHA-256, SHA-512, HMAC, UUID, password generator, password strength, pwned password, hash identifier, file hash, random string.
- File & Forensics: EXIF metadata, MIME checker, magic bytes, string extractor, IOC extractor.
- OSINT & Threat Intel: email format checker, GitHub secret pattern checker, CVE lookup.
- CTF Helpers: XOR helper dan regex tester.

## Catatan Keamanan

CyberKit ditujukan untuk pembelajaran, analisis defensif, CTF, dan audit pada sistem yang Anda miliki atau yang secara eksplisit mengizinkan pengujian. Jangan gunakan tool scanner untuk target pihak ketiga tanpa izin.

API route server-side memiliki validasi target, timeout, dan rate limit dasar agar request jaringan lebih terkendali. Tetap review batasan ini sebelum deployment publik.

Jika `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` tersedia, CyberKit memakai Upstash Redis untuk cache TTL, rate limit, dan Cloud Sync. Tanpa env tersebut, mode lokal memakai bounded in-memory cache/rate-limit dan Cloud Sync akan nonaktif.

Header proxy seperti `x-forwarded-for` hanya dipercaya jika `CYBERKIT_TRUST_PROXY_HEADERS=true`. Aktifkan hanya di deployment yang mengontrol proxy chain.

Pwned Password Checker melakukan SHA-1 hashing di browser dan hanya mengirim hash prefix/suffix ke backend CyberKit; plaintext password tidak dikirim ke backend.

## Environment Variables

Lihat `.env.example` untuk daftar lengkap:

- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CYBERKIT_TRUST_PROXY_HEADERS`
- `NVD_API_KEY`
- `SECURITYTRAILS_API_KEY`
- `ABUSEIPDB_API_KEY`
- `SHODAN_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `URLHAUS_AUTH_KEY`

## Deployment

Aplikasi dapat dideploy ke platform yang mendukung Next.js App Router. Untuk deployment production, perhatikan:

- Batasi akses atau rate limit endpoint scanner.
- Review kebijakan outbound network request dari hosting.
- Pastikan fitur yang memanggil API publik pihak ketiga sesuai dengan limit dan terms masing-masing layanan.
- Jalankan `npm run build` sebelum publish.
