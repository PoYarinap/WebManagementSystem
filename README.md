# Rencana Gaji 💰

Aplikasi web pencatat gaji dan pengeluaran harian pribadi yang simpel, ringan, mobile-first, berbahasa Indonesia, dan siap dideploy ke **Vercel**. Menggunakan **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Google Spreadsheet** sebagai basis data melalui Google Sheets API (`googleapis`).

---

## Fitur Utama

- 🔒 **Akses Admin Aman**: Dilindungi middleware dengan otentikasi password admin (`ADMIN_PASSWORD`) dan cookie bertanda tangan `jose` (`SESSION_SECRET`).
- 📊 **Dasbor Dinamis**:
  - Konsep **Reset Bulanan** otomatis berbasis zona waktu Asia/Jakarta (data lama tetap tersimpan dengan tag `periode` YYYY-MM).
  - Kartu ringkasan: **Uang Masuk**, **Total Terpakai**, **Sisa Saldo**, dan **Sisa Jatah Makan Hari Ini**.
  - Indikator kemajuan (progress bar) tiap pos anggaran dengan kode warna: Hijau (<70%), Kuning (70-99%), Merah (>=100%).
  - Info & tombol alihkan sisa saldo bulan lalu ke tabungan.
  - Bagian **"Di Mana Boroskan?"**: Diagram batang pengeluaran per pos (Recharts), 3 pengeluaran terbesar, tren pengeluaran harian, dan peringatan otomatis (contoh: persentase belanja mendahului laju tanggal bulan berjalan).
  - 10 daftar transaksi terbaru.
- ⚡ **Input Cepat (FAB)**:
  - Tombol melayang `+` di semua halaman membuka formulir bottom sheet/modal.
  - Tombol pintas (chips) nominal makan siang (10rb, 15rb, 20rb, 25rb) untuk pencatatan dalam 2 ketukan.
  - Validasi batas anggaran: konfirmasi ramah jika pengeluaran melebihi sisa jatah pos.
- 💵 **Pemasukan**: Catat gaji masuk per periode, ubah atau hapus data pemasukan.
- 🧾 **Transaksi**: Daftar lengkap pengeluaran dengan filter per pos, pencarian nama, urutan tanggal, kartu di tampilan HP dan tabel di desktop.
- 🎯 **Anggaran**: Atur pos bulanan, tambah/hapus pos, ubah patokan gaji default (`gaji_default`), deteksi over-alokasi jika pos melebihi gaji.
- 📜 **Riwayat**: Tinjau arus kas bulan-bulan sebelumnya lengkap dengan pos terboros.
- 🌙 **Dukungan Dark Mode**: Otomatis mengikuti tema sistem dengan toggle manual yang tersimpan di browser.

---

## Struktur Google Spreadsheet

Aplikasi otomatis membuat sheet dan header jika dokumen Google Spreadsheet masih kosong atau baru dibuat (auto-initialization & seeding):

1. **`Pemasukan`**: `id` | `tanggal` | `periode` | `jumlah` | `keterangan`
2. **`Pengeluaran`**: `id` | `tanggal` | `periode` | `pos` | `keterangan` | `jumlah` | `dibuat_pada`
3. **`Anggaran`**: `pos` | `jatah_bulanan` | `jatah_harian_opsional`
   - *Data awal bawaan (Total Rp1.400.000)*:
     - Tabungan: Rp150.000
     - Makan: Rp700.000
     - Bensin: Rp100.000
     - Kebutuhan Pokok: Rp150.000
     - Dana Tak Terduga: Rp200.000
     - Jajan & Rokok: Rp100.000
4. **`Pengaturan`**: `key` | `value`
   - `gaji_default`: `1400000`
   - `tanggal_gajian`: `25`

---

## Panduan Penyiapan Google Sheets & Service Account

### Langkah 1: Buat Google Cloud Project & Aktifkan Google Sheets API
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru (misalnya diberi nama `Rencana-Gaji`).
3. Di bilah menu pencarian atas, ketik **Google Sheets API**, lalu klik **Enable** (Aktifkan).

### Langkah 2: Buat Service Account dan Download Key JSON
1. Masuk ke menu **IAM & Admin** > **Service Accounts**.
2. Klik **Create Service Account**:
   - Beri nama service account (contoh: `rencana-gaji-bot`).
   - Klik **Create and Continue**, lewati bagian peran (opsional), lalu klik **Done**.
3. Salin alamat email Service Account yang baru saja dibuat (format: `rencana-gaji-bot@<project-id>.iam.gserviceaccount.com`).
4. Klik pada email service account tersebut, masuk ke tab **Keys**.
5. Klik **Add Key** > **Create new key** > pilih format **JSON** > klik **Create**. File JSON akan otomatis terunduh ke komputer Anda.

### Langkah 3: Buat Google Spreadsheet Baru & Bagikan Akses
1. Buka [Google Sheets](https://sheets.new) di browser Anda untuk membuat spreadsheet kosong baru.
2. Beri nama file, misalnya **Keuangan Pribadi**.
3. Klik tombol **Share (Bagikan)** di pojok kanan atas.
4. Masukkan email Service Account (yang didapat pada Langkah 2) dan berikan peran sebagai **Editor**, lalu hapus centang *Notify people* dan klik **Send / Share**.
5. Salin ID Spreadsheet dari URL browser Anda:
   ```
   https://docs.google.com/spreadsheets/d/INI_ADALAH_SPREADSHEET_ID/edit
   ```

---

## Menjalankan di Lokal (Development)

1. Clone atau buka direktori proyek:
   ```bash
   cd "Web gaji dan pegeluaran"
   ```

2. Buat file `.env.local` dari salinan `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

3. Buka file JSON Service Account yang telah diunduh, lalu isi `.env.local`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=email-service-account-kamu@project-id.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...dan_seterusnya...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=ID_SPREADSHEET_GOOGLE_KAMU
   ADMIN_PASSWORD=password_admin_rahasia_kamu
   SESSION_SECRET=string_acak_rahasia_minimal_32_karakter_untuk_sesi_jwt
   ```
   *Catatan*: Pastikan `GOOGLE_PRIVATE_KEY` diawali dan diakhiri tanda kutip ganda serta karakter `\n` tetap dipertahankan.

4. Pasang dependensi dan jalankan server lokal:
   ```bash
   npm install
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda. Masukkan password admin yang Anda isi di `ADMIN_PASSWORD`.

---

## Panduan Deploy ke Vercel

1. **Upload ke Git (GitHub / GitLab / Bitbucket)**:
   - Buat repositori baru di GitHub.
   - Commit seluruh kode aplikasi dan push ke GitHub (file `.env.local` dan `node_modules` sudah otomatis diabaikan oleh `.gitignore`).

2. **Impor ke Vercel**:
   - Buka [Vercel Dashboard](https://vercel.com/dashboard).
   - Klik **Add New...** > **Project**.
   - Pilih repositori yang baru Anda buat.

3. **Konfigurasi Environment Variables di Vercel**:
   - Di bagian konfigurasi deploy, buka menu **Environment Variables**.
   - Tambahkan variabel-variabel berikut:
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: *email service account Anda*
     - `GOOGLE_PRIVATE_KEY`: *private key lengkap termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`*
     - `GOOGLE_SHEET_ID`: *ID Google Spreadsheet Anda*
     - `ADMIN_PASSWORD`: *kata sandi untuk login admin*
     - `SESSION_SECRET`: *kunci rahasia minimal 32 karakter untuk enkripsi sesi JWT*
   - Klik **Deploy**.

4. Aplikasi siap digunakan kapan saja dari HP maupun komputer! 🚀
