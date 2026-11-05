# Integrasi Database Cloud PostgreSQL (Cloud SQL) untuk Sinkronisasi Multi-Perangkat

Rencana implementasi integrasi database cloud terpusat menggunakan PostgreSQL (Cloud SQL) agar seluruh data penambahan alat inventaris, pengajuan peminjaman, persetujuan admin, dan pengaturan tersinkronisasi secara otomatis dan *real-time* di seluruh HP peminjam, HP admin, dan laptop pimpinan.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Telah Dikonfirmasi Pengguna:**
> 1. **Engine Database**: Menggunakan **PostgreSQL Cloud SQL** sebagai backend basis data relasional online.
> 2. **Migrasi Data Awal**: Seluruh 27 unit peralatan media Qoryah TV, riwayat peminjaman, agenda liputan, dan identitas resmi (*PPTQ Qoryatul Qur'an*, *Qoryah TV*, *Kantor Media*, WA Admin *081515509831*) akan otomatis diunggah (*seeded*) ke cloud saat database aktif pertama kali.
> 3. **Fallback Ketahanan (Offline/Vercel/Cloud Quota)**: Jika koneksi offline sementara atau terjadi kendala kuota cloud, sistem akan memiliki mekanisme fallback transparan ke penyimpanan lokal agar aplikasi tetap berfungsi tanpa error bagi pengguna.

---

## 1. Overview & Core Concept

* **Masalah Saat Ini**: Data inventaris dan permohonan pinjam tersimpan di *localStorage* (memori browser HP masing-masing). Ketika input alat baru atau peminjaman dilakukan di satu HP, HP lain atau browser laptop tidak dapat melihat perubahannya.
* **Solusi**: Membangun arsitektur full-stack dengan PostgreSQL terpusat yang diakses melalui API server Express/Vite. Setiap penambahan alat, update kondisi, peminjaman, atau pengembalian langsung masuk ke database cloud dan diperbarui di semua perangkat secara instan.
* **Pengguna Utama**:
  * **Santri / Unit Lembaga**: Mengajukan peminjaman dari HP masing-masing dan langsung tercatat di server.
  * **Admin Media (Qoryah TV)**: Menambah/mengedit alat dan mengonfirmasi peminjaman dari HP atau laptop.
  * **Pimpinan Pondok**: Membuka laporan bulanan dari laptop dengan data terkini yang identik dengan HP admin.

---

## 2. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PERANGKAT PENGGUNA                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │  HP Santri/Unit   │  │     HP Admin      │  │   Laptop Pimpinan  │  │
│  │ (Form Peminjaman) │  │ (Input/Edit Alat) │  │ (Laporan Bulanan)  │  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬──────────┘  │
└────────────┼──────────────────────┼──────────────────────┼─────────────┘
             │                      │                      │              
             ▼                      ▼                      ▼              
┌────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND CLIENT (REACT + VITE SPA)                    │
│  • UI Form Pinjam   • UI Kelola Inventaris   • UI Laporan Bulanan      │
│  • Hook Data Sync: fetch('/api/...') dengan auto-refresh / fallback    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND RUNTIME (server.ts / EXPRESS)                │
│  • GET/POST/PUT/DELETE /api/items     (Kelola 27 unit alat)            │
│  • GET/POST/PUT /api/loans            (Peminjaman & persetujuan)       │
│  • GET/POST/PUT /api/events           (Agenda kegiatan liputan)        │
│  • GET/POST /api/settings             (Identitas pondok & WA admin)    │
│  • GET /api/seed                      (Auto-seeding data awal resmi)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Drizzle ORM / pg connection
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               GOOGLE CLOUD SQL (POSTGRESQL DATABASE)                   │
│  • Tabel: media_items     • Tabel: loan_requests                       │
│  • Tabel: media_events    • Tabel: app_settings                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Desain Skema Database (Drizzle ORM)

Skema database PostgreSQL dirancang lengkap mencakup seluruh atribut operasional:

1. **Tabel `app_settings`**:
   * `id`: string (primary key)
   * `app_title`: text ('SIPAT Media')
   * `pesantren_name`: text ("PPTQ Qoryatul Qur'an")
   * `media_team_name`: text ("Qoryah TV")
   * `default_pickup_location`: text ("Kantor Media")
   * `media_leader_phone`: text ("081515509831")
   * `whatsapp_group_link`: text
   * `admin_pin`: text ('1234')
   * `logo_type`, `logo_preset`, `logo_custom_url`

2. **Tabel `media_items`**:
   * `id`: text primary key (e.g., 'ALAT-001')
   * `name`: text ('Mirrorless', 'Sony FX3', dsb.)
   * `category`: text ('Kamera', 'Lensa', 'Audio & Mic', 'Lighting', 'Stabilizer & Tripod', 'Drone & Stream', 'Aksesoris & Kabel')
   * `brand`, `model`, `serial_number`: text
   * `condition`: text ('Baik', 'Perlu Servis', 'Rusak')
   * `status`: text ('Tersedia', 'Sedang Dipinjam', 'Dalam Perawatan')
   * `location`: text ('Kantor Media')
   * `notes`, `specs`: text
   * `current_borrower`: jsonb (nullable)

3. **Tabel `loan_requests`**:
   * `id`: text primary key (e.g., 'PJM-20261105-001')
   * `unit_name`, `borrower_name`, `borrower_phone`: text
   * `items`: jsonb (daftar item yang dipinjam beserta kategori)
   * `start_date`, `start_time`, `end_date`, `end_time`: text
   * `purpose`: text
   * `status`: text ('Menunggu Konfirmasi', 'Disetujui', 'Selesai', 'Ditolak')
   * `pickup_location`: text ('Kantor Media')
   * `rejection_reason`, `return_notes`, `admin_notes`: text
   * `created_at`, `approved_at`, `returned_at`, `approved_by`: text

4. **Tabel `media_events`**:
   * `id`: text primary key
   * `title`, `category`: text
   * `start_date`, `start_time`, `end_date`, `end_time`: text
   * `location`: text
   * `crew_assigned`, `required_gear`: jsonb
   * `description`: text

---

## 4. Rencana Tahapan Eksekusi

### Tahap 1: Setup & Provisioning Cloud SQL
* Jalankan pengecekan kelayakan fitur via `rpc_action CheckFeatureEligibility`.
* Tampilkan kartu aktivasi Cloud SQL kepada pengguna melalui `show_aistudio_ui` untuk konfirmasi region/proyek.
* Lakukan provisioning instance Cloud SQL PostgreSQL.

### Tahap 2: Definisi Skema & Migrasi Database
* Pasang dependensi yang dibutuhkan: `drizzle-orm`, `pg`, `@types/pg`, `tsx`.
* Konfigurasi file `src/db/schema.ts` dan koneksi database dengan kredensial Cloud SQL.
* Jalankan migrasi skema tabel ke instance database.

### Tahap 3: Implementasi Backend API (`server.ts`)
* Konfigurasi Express dev & production server yang melayani file Vite sekaligus endpoint REST `/api/*`.
* Buat modul auto-seeding: jika database masih kosong, otomatis isi 27 data inventaris alat dan pengaturan PPTQ Qoryatul Qur'an.
* Endpoint CRUD lengkap untuk item, peminjaman (approve/return/reject), agenda, dan pengaturan.

### Tahap 4: Integrasi Frontend Client
* Hubungkan state aplikasi di `src/App.tsx` ke endpoint API `/api/*` dengan fallback aman ke cache lokal bila offline.
* Saat admin menambah/mengedit alat di satu HP, data tersimpan langsung ke PostgreSQL.
* Saat HP lain dibuka, browser melakukan fetch dari server sehingga alat baru dan status peminjaman langsung tampil seragam.

---

## 5. Rencana Pengujian & Verifikasi

1. **Uji Tambah Alat Baru**:
   * Buka panel admin, tambahkan alat baru (misal: "Tripod Beike").
   * Verifikasi data tersimpan di tabel `media_items` PostgreSQL.
   * Refresh browser atau buka di tab/perangkat lain untuk memastikan alat baru langsung muncul.
2. **Uji Pengajuan Peminjaman**:
   * Ajukan peminjaman dari form peminjam.
   * Verifikasi berkas peminjaman masuk ke database dan langsung terlihat di tab Peminjaman Admin.
3. **Uji Persetujuan & Lokasi Pengambilan**:
   * Setujui peminjaman dan tentukan lokasi pengambilan ("Kantor Media").
   * Verifikasi status alat otomatis berubah menjadi "Sedang Dipinjam" di seluruh tampilan.
4. **Verifikasi Build & Lint**:
   * Jalankan `compile_applet` dan `lint_applet` untuk menjamin tidak ada error TypeScript maupun runtime.
