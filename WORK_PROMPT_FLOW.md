# CyberKit — Work Prompt Flow (Panduan Prompt Bertahap)

Dokumen ini berisi rangkaian prompt terstruktur dan siap pakai (*copy-paste*) yang dibagi menjadi **5 Bagian Utama** untuk melengkapi dan memperbaiki fitur-fitur penting yang masih kurang atau bersifat simulasi (mock) pada project **CyberKit**.

Gunakan prompt-prompt di bawah ini secara berurutan dengan menyalin teks di dalam blok kuotasi ke asisten AI Anda (seperti Claude, Gemini, dll.) untuk mengeksekusi setiap bagian secara mandiri dan aman.

---

## 📋 Daftar Rencana Kerja (Work Prompt Flow)

| Bagian | Area Fokus | Status Awal | Output Akhir |
|---|---|---|---|
| **Bagian 1** | **Server-side API Routes & DNS/IP Tools** | Belum ada API routes, tool DNS/IP belum aktif | API `/api/dns`, `/api/ssl`, `/api/headers`, `/api/ip`, dll. beserta registrasi tool-nya. |
| **Bagian 2** | **Website Security Audit Terintegrasi Real-Time** | Hasil audit berupa simulasi/mock | Audit nyata yang menembak API route dan menghitung skor keamanan riil. |
| **Bagian 3** | **Penyempurnaan PDF Export Berstandar Laporan Cyber** | jsPDF diimpor tapi tidak digunakan dengan rapi | PDF multi-halaman berdesain premium dengan diagram skor, tabel kerentanan, dan branding CyberKit. |
| **Bagian 4** | **Penambahan Lab Interaktif Baru (Auth Bypass & CSRF)** | Hanya ada SQLi & XSS | Lab interaktif Auth Bypass & CSRF Demo lengkap dengan visualisasi query & payload. |
| **Bagian 5** | **Polish, Penanganan Edge Case, & Workspace Komparasi** | Beberapa input/output rentan crash, UI terpotong | Pengamanan error handling, loading state global, dan dashboard workspace pembanding tool. |

---

# 🚀 BAGIAN 1: Server-side API Routes & DNS/IP Tools

### 🎯 Tujuan
Membangun backend API Routes Next.js untuk kebutuhan server-side scanning (DNS, SSL, Headers, robots.txt, IP Geolocation) dan meregistrasikan tools tersebut ke tool registry agar bisa dipakai secara nyata.

### ✍️ Salin & Gunakan Prompt Berikut:

```text
Halo! Kita akan melengkapi project "CyberKit" dengan mengimplementasikan API Routes server-side di Next.js 15+ (App Router) serta membuat tool-nya benar-benar berfungsi secara riil. Saat ini, DNS Lookup, HTTP Header Checker, SSL/TLS Checker, CORS Checker, robots.txt Viewer, dan IP Geolocation belum diimplementasikan backend-nya.

Tolong kerjakan langkah-langkah berikut secara terstruktur:

1. **Buat API Routes di Next.js (App Router):**
   - **`src/app/api/dns/route.ts`**: Menerima request POST dengan JSON `{ hostname }`. Gunakan `node:dns` bawaan Node.js (seperti `dns.promises.resolve`) untuk melakukan lookup record: A, AAAA, MX, TXT, NS, CNAME, dan Reverse DNS (PTR). Tangani error jika domain tidak ditemukan atau record kosong secara elegan.
   - **`src/app/api/headers/route.ts`**: Menerima request POST dengan JSON `{ url }`. Melakukan fetch ke URL target menggunakan `fetch` Node.js (dengan timeout 5-8 detik). Kembalikan objek berisi semua HTTP Headers respon, serta analisis keamanan header: apakah header penting berikut ADA atau ABSEN: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` (HSTS), `Referrer-Policy`, `Permissions-Policy`.
   - **`src/app/api/ssl/route.ts`**: Menerima request POST dengan JSON `{ hostname }`. Lakukan koneksi TLS menggunakan `tls.connect` Node.js ke port 443 hostname tersebut untuk membaca detail sertifikat SSL (issuer, valid dari/sampai, subjek, apakah valid/expired, sisa hari aktif).
   - **`src/app/api/cors/route.ts`**: Menerima request POST dengan JSON `{ url }`. Lakukan fetch preflight (atau request biasa) dan periksa header `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`. Berikan analisis apakah konfigurasinya aman atau terlalu longgar (misal wildcard `*`).
   - **`src/app/api/ip/route.ts`**: Menerima request POST dengan JSON `{ ipOrDomain }`. Jika domain diberikan, lakukan DNS lookup terlebih dahulu untuk mendapatkan IP. Kemudian panggil API Geolocation publik gratis (seperti `http://ip-api.com/json/{query}`) untuk mendapatkan data negara, kota, ISP, ASN, lintang/bujur.

2. **Buat & Daftarkan File Definisi Tools:**
   - Buat folder `src/lib/tools/dns` jika belum ada.
   - Buat file `src/lib/tools/dns/index.ts` yang berisi tool definitions untuk:
     - `dnsLookupTool` (slug: `dns-lookup`): Input berupa domain/host, panggil `/api/dns` via POST, kembalikan data record DNS yang rapi dan terstruktur dalam tab `data` serta `rawOutput`.
     - `whoisLookupTool` (slug: `whois-lookup`): Lakukan pencarian basic WHOIS (bisa integrasi dengan DNS TXT/NS atau panggil API WHOIS publik jika ada, atau buat fallback visual yang informatif).
   - Perbarui `src/lib/tools/web-security/index.ts` untuk meregistrasikan:
     - `httpHeaderCheckerTool` (slug: `http-header-checker`): Panggil `/api/headers`.
     - `sslCheckerTool` (slug: `ssl-checker`): Panggil `/api/ssl`.
     - `corsCheckerTool` (slug: `cors-checker`): Panggil `/api/cors`.
     - `robotsTxtTool` (slug: `robots-txt-viewer`): Panggil fetch `/robots.txt` pada target domain dan tampilkan isinya secara rapi.
   - Perbarui `src/lib/tools/network/index.ts` untuk menambahkan:
     - `ipLookupTool` (slug: `ip-lookup`): Panggil `/api/ip`.
   - Daftarkan semua tool baru ini ke dalam `src/lib/tools/registry.ts` sehingga otomatis terdeteksi oleh sistem pencarian global, favorite, dan command palette.

3. **Pastikan Kompabilitas Kode:**
   - Semua input form harus tervalidasi dengan baik (client-side & server-side).
   - Menggunakan format return value `Promise<ToolResult>` yang sesuai dengan `src/lib/tools/types.ts`.
   - Jalankan build verification dengan memastikan tidak ada error TypeScript maupun kegagalan kompilasi.
```

---

# 🛡️ BAGIAN 2: Mengubah Website Security Audit dari Mock menjadi Real Audit

### 🎯 Tujuan
Menghubungkan halaman Website Security Audit (`/audit`) ke API route nyata yang mengagregasikan semua hasil dari API Routes Bagian 1, menganalisis header & sertifikat SSL riil, dan memberikan skor keamanan riil (A-F) secara dinamis.

### ✍️ Salin & Gunakan Prompt Berikut:

```text
Halo! Sekarang kita akan mengubah modul **Website Security Audit** di `src/app/audit/page.tsx` agar tidak lagi menggunakan simulasi (mock delay & mock results), melainkan melakukan scanning riil secara paralel menggunakan API routes yang telah kita buat.

Tolong implementasikan perubahan berikut pada halaman audit:

1. **Buat API Endpoint Agregator Audit (`src/app/api/audit/route.ts`):**
   - Menerima request POST dengan JSON `{ url }`.
   - Ekstrak hostname dari URL tersebut.
   - Jalankan pengecekan berikut secara paralel (menggunakan `Promise.all` atau `Promise.allSettled` untuk menghindari kegagalan total jika salah satu error):
     - HTTPS check (baca skema URL)
     - DNS Lookup (panggil fungsi internal resolver dari `/api/dns`)
     - SSL/TLS Check (panggil fungsi internal dari `/api/ssl`)
     - HTTP Headers & Security Headers Check (panggil fungsi dari `/api/headers`)
     - robots.txt & security.txt presence (lakukan fetch cepat ke target)
   - Agregasikan semua data ke dalam satu struktur hasil audit termapkan.

2. **Algoritma Perhitungan Skor Keamanan (Grade Scoring):**
   - Desain sistem perhitungan skor dinamis dari **0 - 100** dengan bobot berikut:
     - **HTTPS Enforced**: +15 poin
     - **Valid SSL Certificate**: +15 poin (jika SSL valid dan tidak kedaluwarsa)
     - **Content-Security-Policy (CSP)**: +15 poin
     - **X-Frame-Options (Clickjacking protection)**: +10 poin
     - **X-Content-Type-Options**: +10 poin
     - **Strict-Transport-Security (HSTS)**: +15 poin
     - **Referrer-Policy**: +10 poin
     - **robots.txt / security.txt found**: +10 poin (opsional/tambahan)
   - Konversikan skor akhir ke Grade Huruf:
     - `>= 90`: **A (Secure)**
     - `>= 75`: **B (Good)**
     - `>= 55`: **C (Warning)**
     - `>= 35`: **D (Vulnerable)**
     - `< 35`: **F (Critical)**

3. **Perbarui UI Audit (`src/app/audit/page.tsx`):**
   - Tampilkan progress running yang interaktif untuk setiap item pengecekan secara berurutan (animasi spinner).
   - Tampilkan hasil pass/fail/warning riil berdasarkan respon API.
   - Hasil audit riil yang sukses harus disimpan ke Zustand `ReportsStore` dengan format Markdown yang detail dan berbobot teknis tinggi.
   - Tambahkan visualisasi grafik lingkaran skor atau bar persentase yang menarik dengan aksen warna neon menyesuaikan tingkat keamanan (hijau neon untuk A, kuning untuk B/C, merah menyala untuk D/F).
   - Pastikan loading state ditangani dengan apik dan cegah crash jika server target memblokir request fetch (gunakan graceful error fallback).
```

---

# 📄 BAGIAN 3: Penyempurnaan PDF Export Berstandar Laporan Cyber

### 🎯 Tujuan
Mengintegrasikan pustaka `jsPDF` untuk menghasilkan dokumen PDF yang sangat premium, terstruktur rapi, multi-page, memiliki header/footer bermerek CyberKit, tabel temuan keamanan dengan penanda warna tingkat kerentanan, dan representasi visual dari skor audit.

### ✍️ Salin & Gunakan Prompt Berikut:

```text
Halo! Kita ingin menyempurnakan fitur ekspor laporan ke PDF di halaman `/reports` dan halaman `/audit` menggunakan library `jsPDF` yang sudah terinstall di package.json. Saat ini, ekspor PDF hanya menggunakan fungsi basic atau bahkan belum terintegrasi secara visual. Kita ingin laporan PDF yang dihasilkan terlihat sangat profesional, layak untuk portofolio dunia kerja cybersecurity.

Tolong buat atau perbarui utility ekspor PDF (`src/lib/utils/export.ts` atau file sejenis) dengan fitur-fitur premium berikut:

1. **Desain Layout PDF yang Premium:**
   - **Cover Page (Laman Utama):** Desain bernuansa "Cyber Command" dengan latar belakang gelap (atau aksen batas gelap), logo teks "CYBERKIT SECURITY REPORT", tanggal pembuatan, domain target audit, dan ringkasan nilai skor (Grade A/B/C/D/F).
   - **Font & Tipografi:** Gunakan ukuran font yang terstruktur dengan hierarki jelas (Title, H1, H2, Body, Monospace untuk potongan code/data raw).
   - **Header & Footer Otomatis:** Setiap halaman berikutnya harus memiliki header tipis berupa nama domain yang di-scan, dan footer berisi nomor halaman dinamis ("Page X of Y") serta disclaimer rahasia (*"CONFIDENTIAL - Generated by CyberKit Toolkit"*).

2. **Visualisasi Skor & Tabel Hasil:**
   - Buat representasi grafik skor sederhana (misalnya lingkaran berwarna atau progress bar horizontal menggunakan fungsi canvas/drawing bawaan jsPDF).
   - **Tabel Hasil Temuan (Findings Table):** Menampilkan kolom: No, Security Check, Status (PASS/WARN/FAIL), dan Ringkasan Masalah.
   - Berikan warna aksen khusus pada baris tabel berdasarkan status kerentanan:
     - **FAIL / Critical**: Teks merah / Latar belakang pink muda.
     - **WARN / Medium**: Teks kuning / Latar belakang kuning muda.
     - **PASS / Safe**: Teks hijau / Latar belakang hijau muda.
   - Jika laporan berisi data raw (seperti isi HTTP Headers atau DNS records), cetak menggunakan font monospace (Courier) di dalam kotak khusus (*code-block container*) dengan pembatas garis.

3. **Multi-page & Auto-wrap Handling:**
   - Tangani auto-wrap text untuk penjelasan temuan yang panjang agar tidak terpotong di batas kanan halaman.
   - Lakukan perhitungan posisi Y koordinat dokumen secara dinamis. Jika posisi Y melebihi batas bawah halaman (misal 280mm pada kertas A4), otomatis tambahkan halaman baru (`doc.addPage()`) dan gambar kembali struktur header/footer-nya.
```

---

# 🧪 BAGIAN 4: Penambahan Lab Interaktif Baru (Auth Bypass & CSRF)

### 🎯 Tujuan
Memperluas modul Security Labs (`/labs`) dengan menambahkan dua lab pembelajaran baru yang interaktif: **Authentication Bypass** (menyalahgunakan form login melalui SQLi/logic flaw) dan **CSRF (Cross-Site Request Forgery)**.

### ✍️ Salin & Gunakan Prompt Berikut:

```text
Halo! Kita ingin menambahkan dua buah laboratorium keamanan interaktif baru di dalam direktori `src/app/labs/` untuk memperkuat nilai edukasi dan portofolio teknis CyberKit. Saat ini baru ada lab dasar SQL Injection dan XSS. Kita ingin menambahkan:

1. **Authentication Bypass Lab (`src/app/labs/auth-bypass/page.tsx`):**
   - **Skenario:** Pengguna diajarkan bagaimana bypass mekanisme login menggunakan query SQL `admin' --` atau `' OR '1'='1`.
   - **Fitur Interaktif:**
     - Form login fiktif (Username & Password).
     - Visualisasi Query SQL di backend secara real-time yang berubah ketika pengguna mengetik input (contoh: `SELECT * FROM users WHERE username = '${input_username}' AND password = '${input_password}'`).
     - Jika pengguna memasukkan payload SQLi bypass, tampilkan status "LOGIN SUCCESSFUL sebagai Admin!" beserta visualisasi terputusnya sisa logic query akibat karakter comment `--`.
     - Sediakan tab penjelas celah keamanan, tab perbandingan kode rentan (Vulnerable Code) vs kode aman (Secure Code menggunakan Parameterized Queries), dan langkah-langkah pencegahannya.

2. **CSRF Concept Demo Lab (`src/app/labs/csrf/page.tsx`):**
   - **Skenario:** Mendemonstrasikan bagaimana situs pihak ketiga (Third-party malicious site) dapat mengirimkan request tidak sah atas nama pengguna yang sudah login ke situs target (Vulnerable Bank App).
   - **Fitur Interaktif:**
     - Tampilan split screen: Sisi kiri adalah "Vulnerable Social/Bank App" (menampilkan saldo pengguna dan status login "Logged In as JohnDoe"). Sisi kanan adalah "Malicious Blog Site" (menampilkan artikel menarik dengan tombol terselubung atau image tag tersembunyi).
     - Ketika pengguna mengklik tombol di blog jahat tersebut, jalankan simulasi pengiriman request transfer dana terselubung ke sisi kiri bank app.
     - Saldo di bank app kiri otomatis berkurang secara dramatis, memperlihatkan eksploitasi CSRF berhasil karena session cookie terkirim otomatis oleh browser.
     - Tampilkan penjelasan mendalam mengapa serangan ini terjadi dan bagaimana melindunginya menggunakan Anti-CSRF Token, SameSite Cookie Attribute, dan Custom Request Headers.

3. **Integrasikan ke Halaman Labs:**
   - Daftarkan kedua lab baru ini di halaman katalog labs utama (`src/app/labs/page.tsx`) dengan deskripsi menarik, tag difficulty (intermediate), dan ikon yang relevan agar user bisa langsung mengkliknya.
```

---

# 🛠️ BAGIAN 5: Polish, Penanganan Edge Case, & Workspace Komparasi

### 🎯 Tujuan
Melakukan audit kode internal untuk memberantas bug crash akibat bad input, menyempurnakan performa loading global, memperbaiki kejanggalan rendering Tailwind, serta membangun fitur "Tool Workspace Comparison" di Dashboard untuk membandingkan output dua alat sekaligus.

### ✍️ Salin & Gunakan Prompt Berikut:

```text
Halo! Ini adalah tahap akhir untuk memoles (*polishing*) dan menstabilkan seluruh website CyberKit sebelum siap dideploy secara penuh. Kita ingin menangani berbagai celah kecil yang sering membuat aplikasi web terasa kurang kokoh.

Tolong implementasikan perbaikan dan fitur pemoles berikut pada kode sumber:

1. **Penguatan Penanganan Input Celah & Crash (Robust Input Validation):**
   - Periksa semua file eksekutor di `src/lib/tools/` (terutama yang memproses file upload, input heksadesimal, string biner, regex, dan JWT).
   - Tambahkan blok `try-catch` yang ketat di setiap fungsi `execute` agar jika pengguna memasukkan input acak/rusak, aplikasi tidak crash/white-screen, melainkan mengembalikan `{ success: false, summary: 'Pesan error yang ramah user' }`.
   - **Spesifik Regex Tester**: Batasi waktu eksekusi evaluasi regex (mencegah ReDoS / Regular Expression Denial of Service) atau gunakan batasan panjang input agar tidak terjadi browser hang.
   - **Spesifik EXIF Viewer**: Tangani file gambar yang tidak memiliki metadata EXIF secara anggun tanpa melemparkan error yang merusak halaman UI.

2. **Perbaikan Tampilan CSS & Animasi:**
   - Pastikan sidebar navigasi tertutup secara otomatis di perangkat mobile saat salah satu menu diklik.
   - Periksa kejanggalan CSS pada card component (glassmorphism) agar tidak memiliki border yang terlalu tebal di layar beresolusi rendah.
   - Tambahkan global skeleton loader atau spinner yang konsisten di seluruh halaman tool ketika proses kalkulasi backend sedang berlangsung.

3. **Fitur "Compare Tools Workspace" di Dashboard (Dashboard Enhancements):**
   - Buat sebuah halaman baru `/tools/compare` atau modul di dalam dashboard yang memungkinkan pengguna membuka dua alat pengubah data sekaligus secara berdampingan (contoh: Base64 Decoder di kiri, Hex Decoder di kanan).
   - Ini sangat berguna bagi CTF players untuk menganalisis payload secara cepat tanpa harus berpindah tab browser.
   - Sediakan tombol salin cepat antar-panel (hasil panel kiri dapat dikirim langsung menjadi input panel kanan).
```

---
> [!NOTE]
> **Tips Penggunaan:** Jalankan setiap bagian secara bertahap. Pastikan untuk selalu menjalankan `npm run build` dan `npm run dev` setelah menyelesaikan satu bagian prompt untuk memastikan perubahan terintegrasi sempurna tanpa memecahkan kode yang sudah berjalan.
