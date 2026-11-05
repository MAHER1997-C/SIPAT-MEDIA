# Rencana Implementasi: Sinkronisasi Identitas Lembaga & Integrasi GitHub-Vercel

Berdasarkan konfirmasi Anda bahwa aplikasi dideploy menggunakan **GitHub dan Vercel**, kami menyesuaikan rencana agar selaras dengan infrastruktur yang Anda gunakan saat ini.

---

## 1. Analisis Kebutuhan & Cara Kerja GitHub + Vercel

1. **Alur Kerja Vercel**:  
   Ketika kode di-push ke GitHub, Vercel membangun (*build*) aplikasi dari file sumber di repositori.
2. **Penyebab Laptop Mengambil Data Default**:  
   Saat ini, file `src/data/seedData.ts` di GitHub masih berisi nilai bawaan (*"Pondok Pesantren Darul Hikmah"* dan *"Studio Biro Media"*). Ketika Anda mengubah nama dan logo di HP, perubahannya hanya tersimpan di memori lokal (*localStorage*) HP tersebut dan tidak otomatis mengubah file di repositori GitHub.
3. **Solusi Terbaik**:  
   Memperbarui nilai bawaan langsung di file kode `src/data/seedData.ts` dengan data pesantren, logo, dan lokasi Anda yang sebenarnya. Dengan begitu, setiap kali Vercel mem-build proyek dari GitHub, **semua laptop, HP, dan pengunjung manapun langsung otomatis menampilkan data pesantren Anda sejak pertama kali dibuka**.

---

## 2. Rencana Eksekusi Perbaikan

### Langkah 1: Memperbarui Data Bawaan di Kode Sumber (`src/data/seedData.ts`)
- Memperbarui `initialSettings` agar menyimpan:
  - **Nama Pondok Pesantren**: Nama resmi pesantren Anda
  - **Nama Tim / Biro Media**: Nama biro dokumentasi Anda
  - **Lokasi Standar Pengambilan Alat**: Lokasi pengambilan bawaan
  - **Logo**: Logo resmi (preset atau data logo)
  - **Kontak & Grup WhatsApp**: Nomor admin dan tautan grup WA jika ada
- Memastikan `App.tsx` dan `storage.ts` memprioritaskan data lembaga resmi ini sehingga perangkat lama yang memiliki cache lama juga otomatis diperbarui ke data pesantren yang baru.

### Langkah 2: Memperbarui Versi Sinkronisasi Penyimpanan (`CURRENT_VERSION` di `src/utils/storage.ts`)
- Menaikkan nomor versi migrasi cache (misal ke `v6_pesantren_sync`).
- Tujuannya: Agar laptop atau HP lain yang pernah membuka web tidak terkunci pada cache lama, melainkan langsung otomatis memuat data pesantren terbaru Anda.

### Langkah 3: Tetap Menyediakan Fitur Sinkronisasi Cepat (Backup & Link)
- Fitur **"Salin Tautan Sinkronisasi"** dan **"Impor File Backup"** di menu Pengaturan Admin tetap aktif untuk fleksibilitas jika admin di masa mendatang ingin mengganti logo atau nomor kontak secara langsung dari perangkat tanpa coding.

### Langkah 4 (Opsional): Sinkronisasi Data Transaksi Pinjam via Firebase
- Jika Anda juga menghendaki agar santri/unit yang mengisi form peminjaman di HP mereka datanya langsung muncul otomatis di laptop admin secara real-time, kita dapat mengaktifkan Firebase Firestore yang terhubung ke Vercel.

---

## 3. Langkah Selanjutnya untuk Anda
Cukup berikan rincian data lembaga Anda yang ingin dijadikan standar permanen di GitHub & Vercel:
1. **Nama Pondok Pesantren**: ...
2. **Nama Tim / Biro Media**: ...
3. **Lokasi Standar Pengambilan Alat**: ...
4. **Logo yang Digunakan**: *(pilihan preset: kamera / video / pesantren / kreatif, atau deskripsi logo)*
5. **No. WhatsApp Admin / Link Grup WA**: *(jika ingin dicantumkan)*
