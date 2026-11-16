import { pgTable, serial, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

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

// Social Media Monthly Reports Table (Instagram, TikTok & Production Counts)
export const socialMediaReports = pgTable('social_media_reports', {
  id: text('id').primaryKey(), // 'YYYY-MM'
  month: integer('month').notNull(), // 0-11
  year: integer('year').notNull(),
  producedVideosCount: integer('produced_videos_count').notNull().default(0),
  producedFlyersCount: integer('produced_flyers_count').notNull().default(0),
  unUploadedFlyersCount: integer('unuploaded_flyers_count').default(0),
  productionNotes: text('production_notes'),
  igAccount: text('ig_account').notNull(),
  igFollowers: integer('ig_followers').notNull().default(0),
  igFollowersGrowth: integer('ig_followers_growth').notNull().default(0),
  igPostsCount: integer('ig_posts_count').notNull().default(0),
  igTotalViews: integer('ig_total_views').notNull().default(0),
  igTopContentTitle: text('ig_top_content_title').notNull().default(''),
  igTopContentViews: integer('ig_top_content_views').notNull().default(0),
  igTopContentUrl: text('ig_top_content_url'),
  ttAccount: text('tt_account').notNull(),
  ttFollowers: integer('tt_followers').notNull().default(0),
  ttFollowersGrowth: integer('tt_followers_growth').notNull().default(0),
  ttPostsCount: integer('tt_posts_count').notNull().default(0),
  ttTotalViews: integer('tt_total_views').notNull().default(0),
  ttTopContentTitle: text('tt_top_content_title').notNull().default(''),
  ttTopContentViews: integer('tt_top_content_views').notNull().default(0),
  ttTopContentUrl: text('tt_top_content_url'),
  source: text('source').default('manual'),
  updatedAt: text('updated_at').notNull(),
});

