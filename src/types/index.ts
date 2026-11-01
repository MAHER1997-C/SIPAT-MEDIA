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
