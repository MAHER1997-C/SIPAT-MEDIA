export type ItemCondition = 'Baik' | 'Perlu Servis' | 'Rusak';

export type ItemStatus = 'Tersedia' | 'Sedang Dipinjam' | 'Dalam Perawatan';

export type ItemCategory = 
  | 'Kamera'
  | 'Lensa'
  | 'Audio & Mic'
  | 'Lighting'
  | 'Stabilizer & Tripod'
  | 'Drone & Stream'
  | 'Aksesoris & Kabel';

export interface MediaItem {
  id: string; // e.g., ALAT-001
  name: string;
  category: ItemCategory;
  brand: string;
  model: string;
  serialNumber: string;
  condition: ItemCondition;
  status: ItemStatus;
  location: string; // e.g., Lemari A - Rak 2 Studio
  specs?: string;
  notes?: string;
  currentBorrower?: {
    loanId: string;
    unitName: string;
    borrowerName: string;
    returnDate: string;
  };
}

export type LoanStatus = 'Menunggu Konfirmasi' | 'Disetujui' | 'Selesai' | 'Ditolak';

export interface BorrowedItemRef {
  itemId: string;
  itemName: string;
  category: ItemCategory;
  serialNumber?: string;
}

export interface LoanRequest {
  id: string; // e.g., PJM-20261029-001
  unitName: string; // e.g. "Unit MTs Tahfidz", "Unit MI Al-Qur'an", "Kesantrian Putri"
  borrowerName: string;
  borrowerPhone: string;
  items: BorrowedItemRef[];
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  purpose: string;
  status: LoanStatus;
  rejectionReason?: string;
  returnNotes?: string;
  createdAt: string;
  approvedAt?: string;
  returnedAt?: string;
  approvedBy?: string;
  pickupLocation?: string; // Lokasi pengambilan alat yang ditentukan admin
  adminNotes?: string;
}

export type EventCategory = 
  | 'Liputan Santri'
  | 'Live Streaming'
  | 'Kajian / Tabligh'
  | 'Produksi Konten'
  | 'Internal Pesantren';

export interface MediaEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  location: string;
  crewAssigned: string[];
  requiredGear: string[];
  description?: string;
  relatedLoanId?: string;
}

export interface AppSettings {
  appTitle: string; // e.g. "SIPAT Media" (dapat diubah admin)
  pesantrenName: string; // e.g. "Pondok Pesantren Darul Hikmah" (dapat diubah admin)
  mediaTeamName: string; // e.g. "Biro Media & Dokumentasi" (dapat diubah admin)
  defaultPickupLocation?: string; // e.g. "Ruang Media Center" (lokasi bawaan pengambilan alat)
  logoType?: 'preset' | 'custom_url';
  logoPreset?: string; // 'camera' | 'video' | 'radio' | 'mosque' | 'film' | 'sparkles' | 'tv'
  logoCustomUrl?: string; // Custom uploaded image data-url or link
  whatsappGroupLink: string;
  mediaLeaderPhone: string;
  adminPin: string;
}

export interface SocialMediaMonthlyReport {
  id: string; // e.g. "2026-11" (YYYY-MM)
  month: number; // 0-11 (0 = Januari, 10 = November)
  year: number; // e.g. 2026
  // Jumlah Produksi Konten Bulanan
  producedVideosCount: number; // Jumlah produksi konten Video
  producedFlyersCount: number; // Jumlah produksi konten Flyer (termasuk tidak terupload)
  unUploadedFlyersCount?: number; // Rincian opsional flyer internal/tidak terupload
  productionNotes?: string;
  // Instagram Metrics
  igAccount: string; // e.g. "@qoryatulquran"
  igFollowers: number;
  igFollowersGrowth: number; // Pertumbuhan followers dibanding bulan lalu (+/-)
  igPostsCount: number; // Jumlah konten IG terupload bulan ini
  igTotalViews: number; // Total views/reach IG bulan ini
  igTopContentTitle: string; // Judul/topik konten IG terpopuler bulan ini
  igTopContentViews: number; // Jumlah views konten IG terpopuler
  igTopContentUrl?: string;
  // TikTok Metrics
  ttAccount: string; // e.g. "@qoryahtv"
  ttFollowers: number;
  ttFollowersGrowth: number; // Pertumbuhan followers dibanding bulan lalu (+/-)
  ttPostsCount: number; // Jumlah konten TikTok terupload bulan ini
  ttTotalViews: number; // Total views TikTok bulan ini
  ttTopContentTitle: string; // Judul/topik konten TikTok terpopuler bulan ini
  ttTopContentViews: number; // Jumlah views konten TikTok terpopuler
  ttTopContentUrl?: string;
  // Metadata
  updatedAt: string;
  source?: 'manual' | 'bot-username' | 'bot-screenshot';
}

