# Web Management System 🚀

Aplikasi web modern yang dirancang untuk membantu pengelolaan data dan aktivitas secara praktis, efisien, dan terstruktur.

Dibangun menggunakan teknologi modern dengan desain responsif, performa ringan, serta sistem pengelolaan data terintegrasi.

---

## Teknologi yang Digunakan

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Node.js
- Google Sheets API
- Recharts
- JOSE
- Vercel

---

## Fitur Utama

- 🔐 Sistem autentikasi dan keamanan akses.
- 📊 Dashboard dengan visualisasi data.
- 📁 Pengelolaan dan pencatatan data.
- ⚡ Form input cepat.
- 🔎 Pencarian dan filter data.
- 📈 Grafik dan analisis informasi.
- 📅 Pengelolaan data berdasarkan periode.
- 📜 Riwayat aktivitas.
- 🌙 Dark Mode.
- 📱 Responsive Design untuk desktop dan mobile.

---

## Arsitektur Sistem

- Frontend menggunakan Next.js dan Tailwind CSS.
- Backend menggunakan API Routes Next.js.
- Database terintegrasi dengan Google Spreadsheet.
- Autentikasi menggunakan sistem session berbasis cookie.
- Visualisasi data menggunakan Recharts.

---

## Struktur Penyimpanan Data

Sistem menggunakan Google Spreadsheet API sebagai media penyimpanan data dengan beberapa lembar kerja yang dikelola secara otomatis.

- Pemasukan
- Pengeluaran
- Anggaran
- Pengaturan

---

## Konfigurasi Environment

Gunakan environment variables untuk seluruh konfigurasi aplikasi.

```env
GOOGLE_SHEET_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
ADMIN_PASSWORD=
SESSION_SECRET=
```

Jangan mengunggah file `.env.local` atau kredensial rahasia ke repository publik.

---

## Menjalankan Project

Install dependencies:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

Build aplikasi:

```bash
npm run build
```

---

## Deployment

Project ini mendukung deployment menggunakan Vercel.

1. Hubungkan repository GitHub.
2. Konfigurasikan Environment Variables.
3. Jalankan proses deployment.
4. Aplikasi siap diakses secara online.

---

**Developer:** PoYarinap

**Project:** Web Management System
