import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (mandatory for Cloud SQL + Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// App Settings Table
export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey(), // 'main_settings'
  appTitle: text('app_title').notNull(),
  pesantrenName: text('pesantren_name').notNull(),
  mediaTeamName: text('media_team_name').notNull(),
  defaultPickupLocation: text('default_pickup_location').notNull(),
  mediaLeaderPhone: text('media_leader_phone').notNull(),
  whatsappGroupLink: text('whatsapp_group_link').notNull(),
  adminPin: text('admin_pin').notNull(),
  logoType: text('logo_type').default('preset'),
  logoPreset: text('logo_preset').default('tv'),
  logoCustomUrl: text('logo_custom_url').default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Media Items Table (all 27 inventory assets)
export const mediaItems = pgTable('media_items', {
  id: text('id').primaryKey(), // ALAT-001, ALAT-002, etc.
  name: text('name').notNull(),
  category: text('category').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  serialNumber: text('serial_number').notNull(),
  condition: text('condition').notNull(), // 'Baik' | 'Perlu Servis' | 'Rusak'
  status: text('status').notNull(), // 'Tersedia' | 'Sedang Dipinjam' | 'Dalam Perawatan'
  location: text('location').notNull(),
  specs: text('specs'),
  notes: text('notes'),
  currentBorrower: jsonb('current_borrower'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Loan Requests Table
export const loanRequests = pgTable('loan_requests', {
  id: text('id').primaryKey(), // PJM-YYYYMMDD-XXX
  unitName: text('unit_name').notNull(),
  borrowerName: text('borrower_name').notNull(),
  borrowerPhone: text('borrower_phone').notNull(),
  items: jsonb('items').notNull(), // BorrowedItemRef[]
  startDate: text('start_date').notNull(),
  startTime: text('start_time').notNull(),
  endDate: text('end_date').notNull(),
  endTime: text('end_time').notNull(),
  purpose: text('purpose').notNull(),
  status: text('status').notNull(), // 'Menunggu Konfirmasi' | 'Disetujui' | 'Selesai' | 'Ditolak'
  pickupLocation: text('pickup_location'),
  rejectionReason: text('rejection_reason'),
  returnNotes: text('return_notes'),
  adminNotes: text('admin_notes'),
  createdAt: text('created_at').notNull(),
  approvedAt: text('approved_at'),
  returnedAt: text('returned_at'),
  approvedBy: text('approved_by'),
});

// Media Events Table
export const mediaEvents = pgTable('media_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  startDate: text('start_date').notNull(),
  startTime: text('start_time').notNull(),
  endDate: text('end_date').notNull(),
  endTime: text('end_time').notNull(),
  location: text('location').notNull(),
  crewAssigned: jsonb('crew_assigned'),
  requiredGear: jsonb('required_gear'),
  description: text('description'),
  relatedLoanId: text('related_loan_id'),
});
