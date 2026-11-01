# Sistem Media & Peminjaman Alat Santri (SIPAT-Media Tahfidz)

Aplikasi manajemen operasional khusus tim media Pondok Pesantren Tahfidzul Qur'an yang memadukan inventaris alat multimedia (kamera, lensa, audio, lighting, drone), kalender agenda kegiatan liputan/dokumentasi pesantren, platform peminjaman alat berbasis checklist unit mandiri, serta integrasi draf pesan otomatis WhatsApp langsung ke grup media pesantren.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Hasil Klarifikasi Pengguna:**
> - **Integrasi WhatsApp**: Menggunakan peluncuran otomatis WhatsApp (`https://api.whatsapp.com/send?text=...`) dengan pesan template terstruktur dan rapi (detail unit, nama peminjam, kontak, keperluan, daftar checklist barang yang dipinjam, tanggal pinjam & kembali), dilengkapi tombol salin draf cepat.
> - **Input Unit Peminjam**: Kolom input fleksibel bebas ketik disertai saran cepat (contoh: MTs, MI, MA, Kesantrian, Asatidz, Panitia Haflah).
> - **Sistem Login**: Akses umum instan untuk pengajuan peminjaman dan pengecekan ketersediaan kalender/alat; akses Admin penuh dilindungi dengan PIN/Sandi khusus (default `1234` dan dapat diubah) tanpa membebani santri/asatidz dengan registrasi rumit.

---

### 1. Overview & Core Concept

- **Apa yang Dibangun**: Platform web responsif yang memudahkan seluruh unit lembaga pesantren (MI, MTs, MA, Kesantrian, dll.) mengajukan peminjaman aset media dan melihat ketersediaan alat secara real-time, sekaligus memberi kendali penuh bagi kru media pesantren untuk memantau status alat, menyetujui peminjaman, dan mengatur jadwal dokumentasi kegiatan pesantren.
- **Pengguna Sasaran**: Tim Media Pesantren (Admin/Kru dokumentasi) dan Perwakilan Unit Lembaga Pesantren (Ustaz/Ustazah/Santri penanggung jawab kegiatan).
- **Nilai Utama**: Menghilangkan kekacauan peminjaman alat manual/chat tercecer, mencegah tabrakan jadwal pemakaian alat penting, dan menjaga pertanggungjawaban aset pesantren dengan pesan resmi yang langsung terdistribusi ke grup WhatsApp media.

---

### 2. User Experience & Visual Design

#### A. Alur Pengguna (User Flows)
1. **Mode Unit / Peminjam Umum**:
   - Membuka aplikasi tanpa hambatan login.
   - Melihat status ketersediaan alat (Tersedia, Sedang Dipinjam, Dalam Perawatan).
   - Melihat Kalender Kegiatan Media untuk memastikan alat tidak bentrok dengan jadwal liputan pondok (misal: Wisuda Tahfidz, Kajian Akbar, PHBI).
   - Memilih alat yang dibutuhkan melalui checklist interaktif (bisa multi-pilih kamera, clip on, tripod, lighting).
   - Mengisi data: Nama Unit (bisa ketik bebas), Nama Penanggung Jawab, Nomor WA, Tanggal & Waktu Pinjam - Kembali, serta Keperluan Acara.
   - Mengklik **"Ajukan Peminjaman & Kirim ke WhatsApp Grup"** -> Sistem membuat data peminjaman berstatus "Menunggu Konfirmasi" dan langsung membuka WhatsApp dengan format pesan resmi siap kirim ke grup media.
2. **Mode Admin Media**:
   - Memasukkan PIN Admin di pojok atas atau navigasi.
   - Akses penuh untuk:
     - Manajemen Inventaris: Tambah, edit, hapus, ubah kondisi alat (Baik, Rusak Ringan, Rusak), nomor seri, dan lokasi rak/tas.
     - Kelola Peminjaman: Konfirmasi/Setujui pinjaman, tandai barang sudah dikembalikan (otomatis mengembalikan stok alat), atau tolak dengan catatan.
     - Kalender Agenda: Tambah agenda dokumentasi media (misal: Live Streaming Khotmil Qur'an, Podcast Santri, Liputan Ujian Tahfidz, Dokumentasi Sholat Id).
     - Pengaturan Grup Media: Simpan nomor/tautan grup WhatsApp media pesantren untuk tautan langsung.

#### B. Identitas Visual & Tema
- **Arah Estetika**: Bernuansa Islami modern, rapi, bersih, berwibawa, dan fungsional (*Clean Islamic Tech / Editorial Green & Warm Slate*).
- **Palet Warna**:
  - Latar Belakang: `#F8FAFC` (Slate 50) dengan aksen panel `#FFFFFF`.
  - Warna Primer: Deep Emerald Forest (`#065F46` / `#047857`) melambangkan nilai pesantren dan kedamaian Tahfidz.
  - Warna Aksen: Warm Amber / Gold (`#D97706`) untuk penanda agenda penting atau status menunggu konfirmasi.
  - Warna Status: Emerald (`#10B981`) untuk Tersedia/Selesai, Amber (`#F59E0B`) untuk Dipinjam, Rose (`#F43F5E`) untuk Perawatan/Rusak.
- **Tipografi**: `Plus Jakarta Sans` untuk judul dan teks antarmuka yang modern, dipadukan dengan `JetBrains Mono` / `tabular-nums` untuk nomor seri aset, jam, tanggal, dan kode booking peminjaman.
- **Zero-Pill & Disiplin Tampilan**: Tanpa pill-badge bertumpuk; menggunakan metadata berjarak tipografis rapi (`·`), tabel bersih, dan kartu alat yang informatif dengan foto serta tag kondisi yang tegas.

---

### 3. Key Product Decisions & Trade-Offs

- **Alur Kirim WhatsApp Otomatis**:
  - *Keputusan*: Memanfaatkan format URL universal WhatsApp (`https://api.whatsapp.com/send?text=...`) ditambah tombol *Salin Pesan ke Clipboard* & *Buka Tautan Grup WA*.
  - *Alasan*: Kompatibel 100% di semua perangkat (Android, iOS, laptop/PC WhatsApp Web) tanpa memerlukan API gateway WhatsApp berbayar atau bot nomor khusus yang rentan terblokir.
- **Penyimpanan Data Berkelanjutan (Local Persistence & Seed Data)**:
  - *Keputusan*: Menggunakan LocalStorage terstruktur dengan initial seed data realistis media pesantren (kamera Sony FX30/A7III, wireless mic DJI Mic 2/Boya, gimbal DJI RS3, lampu Godox, drone DJI Mini, dll.) dan fitur Backup/Export-Import data JSON untuk Admin.
  - *Alasan*: Aplikasi langsung berfungsi instan, data tersimpan aman di browser kru, bebas downtime server, dan data inventaris dapat diunduh kapan saja.
- **Keamanan Peran**:
  - *Keputusan*: Akses umum leluasa bagi unit santri/guru untuk mengajukan pinjaman; proteksi PIN 4-digit untuk Admin dengan opsi logout instan dan sesi tersimpan.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Sistem Peminjaman & Inventaris Media Tahfidz               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌───────────────────────────────────┐       ┌─────────────────────────────┐
│          MODE UNIT UMUM           │       │         MODE ADMIN          │
│ • Lihat Katalog & Kondisi Alat    │       │ • Proteksi PIN (Ubah/Reset) │
│ • Cek Kalender Kegiatan Media     │       │ • Tambah/Edit/Hapus Alat    │
│ • Formulir Peminjaman (Checklist) │       │ • Persetujuan & Pengembalian│
│ • Auto-generate Format WhatsApp   │       │ • Buat & Kelola Jadwal Media│
└─────────────────┬─────────────────┘       └──────────────┬──────────────┘
                  │                                        │
                  └───────────────────┬────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STATE & STORAGE ENGINE                           │
│ • Inventory Store (Kategori, ID, Nama, Kondisi, Status, Lokasi)         │
│ • Loan Request Store (ID Pinjam, Unit, Pemohon, Waktu, Item, Status)    │
│ • Media Calendar Store (Judul, Tanggal, Jam, Lokasi, Kru Petugas)       │
│ • Settings Store (PIN Admin, Nama Pesantren, Link/Nomor Grup WA Media)  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     WHATSAPP DISPATCH SERVICE                           │
│ Formatter template rapi: Format surat permohonan santri lengkap        │
│ URL Builder: encodeURIComponent(template) -> Kirim ke Grup / WA Web     │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Struktur Entitas Data:
1. **MediaItem (Inventaris Alat)**:
   - `id`: string (e.g. `ALAT-001`)
   - `name`: string (e.g. `Sony Alpha A7 IV Kit 24-70mm`)
   - `category`: `Kamera` | `Lensa` | `Audio & Mic` | `Lighting` | `Stabilizer & Tripod` | `Drone & Aksesoris`
   - `serialNumber`: string
   - `condition`: `Baik` | `Perlu Servis` | `Rusak`
   - `status`: `Tersedia` | `Sedang Dipinjam` | `Dalam Perawatan`
   - `location`: string (e.g. `Lemari A - Rak 2 Studio Media`)
   - `notes`: string
2. **LoanRequest (Peminjaman)**:
   - `id`: string (e.g. `PINJAM-20261029-01`)
   - `unitName`: string (e.g. `Unit MTs Tahfidz Putri`)
   - `borrowerName`: string
   - `borrowerPhone`: string
   - `items`: array item terpinjam dengan rincian
   - `startDate`: string & `endDate`: string
   - `purpose`: string (e.g. `Liputan Ujian Tasmi' 30 Juz & Khotmil`)
   - `status`: `Menunggu Konfirmasi` | `Disetujui` | `Selesai/Kembali` | `Ditolak`
   - `createdAt`: string
   - `whatsappDraft`: string
3. **MediaEvent (Kalender Kegiatan)**:
   - `id`: string
   - `title`: string
   - `category`: `Liputan Santri` | `Live Streaming` | `Kajian / Tabligh` | `Produksi Konten` | `Internal Pesantren`
   - `startDate`: string
   - `endDate`: string
   - `location`: string
   - `crewAssigned`: string[]
   - `requiredGear`: string[]
   - `notes`: string

---

### Rencana Verifikasi Pengujian
1. **Pengujian Peminjaman Unit**: Isi form peminjaman dengan multi-alat checklist, submit, dan verifikasi teks format WhatsApp yang ter-generate secara rapi.
2. **Pengujian Notifikasi WA**: Verifikasi tautan WhatsApp membuka draf pesan dengan nomor/grup WA yang tepat.
3. **Pengujian Kalender**: Menambahkan kegiatan dan memverifikasi tampilan kalender bulanan/mingguan/daftar agenda.
4. **Pengujian Keamanan Admin**: Menguji proteksi PIN Admin, persetujuan peminjaman, serta pengembalian alat yang secara otomatis mengupdate status inventaris menjadi 'Tersedia'.
