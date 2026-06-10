# CyberKit

CyberKit adalah produk cybersecurity berbasis workflow untuk audit website, investigasi domain/IP, triage file dan IOC, pemeriksaan secret, CVE/KEV, password, JWT, serta workbench pendukung.

Aplikasi ini dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, dan Lucide Icons. Sebagian tool berjalan langsung di browser untuk menjaga privasi input, sementara fitur yang membutuhkan akses jaringan memakai API route server-side.

## Fitur Utama

- Homepage berbasis tujuh tujuan pengguna dan command palette untuk mencari workflow atau capability.
- Sebelas workspace yang dikelompokkan sebagai Core atau Utility, dengan Security Labs terpisah sebagai Experimental.
- Website Security Audit dengan pengecekan HTTPS, DNS, SSL/TLS, security headers, CORS, cookie security, `robots.txt`, dan `security.txt`.
- API route server-side untuk DNS, DoH, SSL, headers, CORS, CVE, RDAP, robots, security.txt, pwned password, IP lookup, dan audit agregat.
- Saved reports yang tersimpan lokal, dengan ekspor Markdown/JSON/PDF.
- Cloud Sync terenkripsi end-to-end di browser menggunakan AES-256-GCM dan PBKDF2-SHA-256; server hanya menyimpan envelope ciphertext dengan expiry.
- Data Transformation menampung encoding dan Secure Generator sebagai utility panel; CTF Decoder juga ditempatkan sebagai utility workflow.
- Security Labs interaktif untuk SQL Injection, XSS, Auth Bypass, dan CSRF.
- Riwayat eksekusi tool berbasis local storage.

## Tech Stack

- Next.js 16.2.9
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
    workspaces/       Katalog 11 workspace dan shell capability panels
    tools/            Route kompatibilitas untuk URL mini-tool lama
  components/
    layout/           Sidebar dan command palette
  lib/
    server/           Helper server-side scanner, timeout, rate limit, validasi target
    store/            Zustand stores untuk history dan reports
    tools/            Metadata, workspace registry, result schema, validasi, dan lazy executor
    utils/            Helper umum dan export report
public/               Asset statis
```

Audit arsitektur fase pertama, inventaris route/provider/storage, rancangan 11
workspace, dan batasan migrasi tersedia di
[`docs/architecture/phase-1-audit.md`](docs/architecture/phase-1-audit.md).
Implementasi navigasi berbasis workflow dan tabel migrasi route dijelaskan di
[`docs/architecture/phase-2-workspace-navigation.md`](docs/architecture/phase-2-workspace-navigation.md).

## Workspace

- Core: Website Security Audit, Domain & IP Intelligence, JWT Inspector, Password Security, File Triage & IOC Analysis, Secret Scanner, dan CVE / KEV Intelligence.
- Utility: Network Workbench, Data Transformation, CTF Decoder Workbench, dan Hash & Crypto Workbench.
- Experimental: Security Labs, dipisahkan dari workflow analisis operasional.

Mini-tool sederhana tidak ditampilkan sebagai menu utama. Capability tersebut tersedia sebagai tab atau panel di workspace pemiliknya. Semua URL lama `/tools/<slug>` memakai permanent redirect ke `/workspaces/<workspace>?tool=<id>`.

## Catatan Keamanan

CyberKit ditujukan untuk pembelajaran, analisis defensif, CTF, dan audit pada sistem yang Anda miliki atau yang secara eksplisit mengizinkan pengujian. Jangan gunakan tool scanner untuk target pihak ketiga tanpa izin.

API route server-side memiliki validasi target, timeout, dan rate limit dasar agar request jaringan lebih terkendali. Tetap review batasan ini sebelum deployment publik.

Jika `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` tersedia, CyberKit memakai Upstash Redis untuk cache TTL, rate limit, dan Cloud Sync. Tanpa env tersebut, mode lokal memakai bounded in-memory cache/rate-limit dan Cloud Sync akan nonaktif.

Header proxy seperti `x-forwarded-for` hanya dipercaya jika `CYBERKIT_TRUST_PROXY_HEADERS=true`. Aktifkan hanya di deployment yang mengontrol proxy chain.

Pwned Password Checker melakukan SHA-1 hashing di browser dan hanya mengirim prefix lima karakter ke backend CyberKit. Backend mengembalikan range HIBP yang sudah diparse; pencocokan suffix tetap di browser.

Password generator, strength checker, Pwned Password, dan JWT Inspector tidak menulis input atau output ke history, reports, analytics, `localStorage`, export data, atau Cloud Sync. Detail aliran data tersedia di [`docs/privacy/data-flow.md`](docs/privacy/data-flow.md).

## Environment Variables

Lihat `.env.example` untuk daftar lengkap:

- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CYBERKIT_TRUST_PROXY_HEADERS`
- `CLOUD_SYNC_RETENTION_DAYS` (default 30, minimum 1, maksimum 90)
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
