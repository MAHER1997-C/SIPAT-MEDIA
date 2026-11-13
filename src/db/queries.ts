import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, pool, getDatabaseConfigInfo } from './index.ts';
import { mediaItems, loanRequests, mediaEvents, appSettings } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { initialItems, initialLoans, initialEvents, initialSettings } from '../data/seedData.ts';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';

let serverSupabaseClient: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  if (!serverSupabaseClient) {
    serverSupabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return serverSupabaseClient;
}

export function getActiveDbDriver(): {
  mode: 'postgres' | 'supabase-rest' | 'none';
  label: string;
} {
  const pgInfo = getDatabaseConfigInfo();
  if (pgInfo.hasPostgres) {
    return { mode: 'postgres', label: pgInfo.provider };
  }
  if (getServerSupabase()) {
    return { mode: 'supabase-rest', label: 'Supabase REST API' };
  }
  return { mode: 'none', label: 'Offline / Unconfigured' };
}

let initPromise: Promise<void> | null = null;
let tablesInitialized = false;

/**
 * Memastikan tabel PostgreSQL dibuat otomatis (khususnya untuk Supabase yang baru dikoneksikan)
 * dan terisi data awal resmi PPTQ Qoryatul Qur'an & Qoryah TV jika masih kosong.
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (tablesInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const driver = getActiveDbDriver();
    if (driver.mode === 'postgres') {
      // 1. Cek apakah tabel sudah ada terlebih dahulu (aman untuk user Cloud SQL tanpa hak CREATE di schema public)
      let tablesExist = false;
      try {
        await pool.query('SELECT id FROM app_settings LIMIT 1');
        tablesExist = true;
      } catch (probeErr: any) {
        const msg = String(probeErr?.message || '') + ' ' + String(probeErr?.cause?.message || '');
        const code = String(probeErr?.code || probeErr?.cause?.code || '');
        if (code !== '42P01' && !msg.includes('does not exist')) {
          throw probeErr;
        }
      }

      // 2. Buat tabel otomatis hanya jika belum ada (khususnya untuk fresh Supabase database)
      if (!tablesExist) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            uid TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            name TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            id TEXT PRIMARY KEY,
            app_title TEXT NOT NULL,
            pesantren_name TEXT NOT NULL,
            media_team_name TEXT NOT NULL,
            default_pickup_location TEXT NOT NULL,
            media_leader_phone TEXT NOT NULL,
            whatsapp_group_link TEXT NOT NULL,
            admin_pin TEXT NOT NULL,
            logo_type TEXT DEFAULT 'preset',
            logo_preset TEXT DEFAULT 'tv',
            logo_custom_url TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS media_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            serial_number TEXT NOT NULL,
            condition TEXT NOT NULL,
            status TEXT NOT NULL,
            location TEXT NOT NULL,
            specs TEXT,
            notes TEXT,
            current_borrower JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS loan_requests (
            id TEXT PRIMARY KEY,
            unit_name TEXT NOT NULL,
            borrower_name TEXT NOT NULL,
            borrower_phone TEXT NOT NULL,
            items JSONB NOT NULL,
            start_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_date TEXT NOT NULL,
            end_time TEXT NOT NULL,
            purpose TEXT NOT NULL,
            status TEXT NOT NULL,
            pickup_location TEXT,
            rejection_reason TEXT,
            return_notes TEXT,
            admin_notes TEXT,
            created_at TEXT NOT NULL,
            approved_at TEXT,
            returned_at TEXT,
            approved_by TEXT
          );

          CREATE TABLE IF NOT EXISTS media_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            start_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_date TEXT NOT NULL,
            end_time TEXT NOT NULL,
            location TEXT NOT NULL,
            crew_assigned JSONB,
            required_gear JSONB,
            description TEXT,
            related_loan_id TEXT
          );

          ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
          ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
          ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
          ALTER TABLE media_events ENABLE ROW LEVEL SECURITY;

          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow public access app_settings') THEN
              CREATE POLICY "Allow public access app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_items' AND policyname = 'Allow public access media_items') THEN
              CREATE POLICY "Allow public access media_items" ON media_items FOR ALL USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loan_requests' AND policyname = 'Allow public access loan_requests') THEN
              CREATE POLICY "Allow public access loan_requests" ON loan_requests FOR ALL USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_events' AND policyname = 'Allow public access media_events') THEN
              CREATE POLICY "Allow public access media_events" ON media_events FOR ALL USING (true) WITH CHECK (true);
            END IF;
          END $$;
        `);
      }

      // 3. Seed App Settings jika kosong
      const existingSettings = await db.select().from(appSettings).limit(1);
      if (existingSettings.length === 0) {
        await db
          .insert(appSettings)
          .values({
            id: 'main_settings',
            appTitle: initialSettings.appTitle,
            pesantrenName: initialSettings.pesantrenName,
            mediaTeamName: initialSettings.mediaTeamName,
            defaultPickupLocation: initialSettings.defaultPickupLocation || 'Kantor Media',
            mediaLeaderPhone: initialSettings.mediaLeaderPhone,
            whatsappGroupLink: initialSettings.whatsappGroupLink,
            adminPin: initialSettings.adminPin,
            logoType: initialSettings.logoType || 'preset',
            logoPreset: initialSettings.logoPreset || 'tv',
            logoCustomUrl: initialSettings.logoCustomUrl || '',
          })
          .onConflictDoNothing();
      }

      // 3. Seed 27 unit alat jika kosong
      const existingItems = await db.select().from(mediaItems).limit(1);
      if (existingItems.length === 0) {
        for (const item of initialItems) {
          await db
            .insert(mediaItems)
            .values({
              id: item.id,
              name: item.name,
              category: item.category,
              brand: item.brand,
              model: item.model,
              serialNumber: item.serialNumber,
              condition: item.condition,
              status: item.status,
              location: item.location || 'Kantor Media',
              specs: item.specs || '',
              notes: item.notes || '',
              currentBorrower: item.currentBorrower ? JSON.parse(JSON.stringify(item.currentBorrower)) : null,
            })
            .onConflictDoNothing();
        }
      }

      // 4. Seed Loan Requests jika kosong
      const existingLoans = await db.select().from(loanRequests).limit(1);
      if (existingLoans.length === 0) {
        for (const loan of initialLoans) {
          await db
            .insert(loanRequests)
            .values({
              id: loan.id,
              unitName: loan.unitName,
              borrowerName: loan.borrowerName,
              borrowerPhone: loan.borrowerPhone,
              items: JSON.parse(JSON.stringify(loan.items)),
              startDate: loan.startDate,
              startTime: loan.startTime || '08:00',
              endDate: loan.endDate,
              endTime: loan.endTime || '17:00',
              purpose: loan.purpose,
              status: loan.status,
              pickupLocation: loan.pickupLocation || 'Kantor Media',
              rejectionReason: loan.rejectionReason || null,
              returnNotes: loan.returnNotes || null,
              adminNotes: loan.adminNotes || null,
              createdAt: loan.createdAt,
              approvedAt: loan.approvedAt || null,
              returnedAt: loan.returnedAt || null,
              approvedBy: loan.approvedBy || null,
            })
            .onConflictDoNothing();
        }
      }

      // 5. Seed Media Events jika kosong
      const existingEvents = await db.select().from(mediaEvents).limit(1);
      if (existingEvents.length === 0) {
        for (const evt of initialEvents) {
          await db
            .insert(mediaEvents)
            .values({
              id: evt.id,
              title: evt.title,
              category: evt.category,
              startDate: evt.startDate,
              startTime: evt.startTime,
              endDate: evt.endDate,
              endTime: evt.endTime,
              location: evt.location,
              crewAssigned: JSON.parse(JSON.stringify(evt.crewAssigned || [])),
              requiredGear: JSON.parse(JSON.stringify(evt.requiredGear || [])),
              description: evt.description || null,
              relatedLoanId: evt.relatedLoanId || null,
            })
            .onConflictDoNothing();
        }
      }

      tablesInitialized = true;
    } else if (driver.mode === 'supabase-rest') {
      const supa = getServerSupabase()!;
      const { data: settingsData } = await supa.from('app_settings').select('id').limit(1);
      if (settingsData && settingsData.length === 0) {
        await supa.from('app_settings').upsert({
          id: 'main_settings',
          app_title: initialSettings.appTitle,
          pesantren_name: initialSettings.pesantrenName,
          media_team_name: initialSettings.mediaTeamName,
          default_pickup_location: initialSettings.defaultPickupLocation || 'Kantor Media',
          media_leader_phone: initialSettings.mediaLeaderPhone,
          whatsapp_group_link: initialSettings.whatsappGroupLink,
          admin_pin: initialSettings.adminPin,
          logo_type: initialSettings.logoType || 'preset',
          logo_preset: initialSettings.logoPreset || 'tv',
          logo_custom_url: initialSettings.logoCustomUrl || '',
        });
      }

      const { data: itemsData } = await supa.from('media_items').select('id').limit(1);
      if (itemsData && itemsData.length === 0) {
        for (const item of initialItems) {
          await supa.from('media_items').upsert({
            id: item.id,
            name: item.name,
            category: item.category,
            brand: item.brand,
            model: item.model,
            serial_number: item.serialNumber,
            condition: item.condition,
            status: item.status,
            location: item.location || 'Kantor Media',
            specs: item.specs || '',
            notes: item.notes || '',
            current_borrower: item.currentBorrower || null,
          });
        }
      }

      const { data: loansData } = await supa.from('loan_requests').select('id').limit(1);
      if (loansData && loansData.length === 0) {
        for (const loan of initialLoans) {
          await supa.from('loan_requests').upsert({
            id: loan.id,
            unit_name: loan.unitName,
            borrower_name: loan.borrowerName,
            borrower_phone: loan.borrowerPhone,
            items: loan.items,
            start_date: loan.startDate,
            start_time: loan.startTime || '08:00',
            end_date: loan.endDate,
            end_time: loan.endTime || '17:00',
            purpose: loan.purpose,
            status: loan.status,
            pickup_location: loan.pickupLocation || 'Kantor Media',
            rejection_reason: loan.rejectionReason || null,
            return_notes: loan.returnNotes || null,
            admin_notes: loan.adminNotes || null,
            created_at: loan.createdAt,
            approved_at: loan.approvedAt || null,
            returned_at: loan.returnedAt || null,
            approved_by: loan.approvedBy || null,
          });
        }
      }

      const { data: eventsData } = await supa.from('media_events').select('id').limit(1);
      if (eventsData && eventsData.length === 0) {
        for (const evt of initialEvents) {
          await supa.from('media_events').upsert({
            id: evt.id,
            title: evt.title,
            category: evt.category,
            start_date: evt.startDate,
            start_time: evt.startTime,
            end_date: evt.endDate,
            end_time: evt.endTime,
            location: evt.location,
            crew_assigned: evt.crewAssigned || [],
            required_gear: evt.requiredGear || [],
            description: evt.description || null,
            related_loan_id: evt.relatedLoanId || null,
          });
        }
      }

      tablesInitialized = true;
    }
  })().catch((err) => {
    initPromise = null; // Izinkan percobaan ulang di request berikutnya
    throw err;
  });

  return initPromise;
}

// Alias backward-compatible
export const ensureDatabaseSeeded = ensureDatabaseReady;

// ==========================================
// MEDIA ITEMS QUERIES
// ==========================================

export async function dbGetItems(): Promise<MediaItem[]> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { data, error } = await supa.from('media_items').select('*').order('id');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      brand: r.brand,
      model: r.model,
      serialNumber: r.serial_number,
      condition: r.condition,
      status: r.status,
      location: r.location,
      specs: r.specs || undefined,
      notes: r.notes || undefined,
      currentBorrower: r.current_borrower || undefined,
    }));
  }

  const rows = await db.select().from(mediaItems).orderBy(mediaItems.id);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as any,
    brand: r.brand,
    model: r.model,
    serialNumber: r.serialNumber,
    condition: r.condition as any,
    status: r.status as any,
    location: r.location,
    specs: r.specs || undefined,
    notes: r.notes || undefined,
    currentBorrower: (r.currentBorrower as any) || undefined,
  }));
}

export async function dbCreateItem(item: MediaItem): Promise<MediaItem> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('media_items').upsert({
      id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand,
      model: item.model,
      serial_number: item.serialNumber,
      condition: item.condition,
      status: item.status,
      location: item.location || 'Kantor Media',
      specs: item.specs || '',
      notes: item.notes || '',
      current_borrower: item.currentBorrower || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return item;
  }

  await db
    .insert(mediaItems)
    .values({
      id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      condition: item.condition,
      status: item.status,
      location: item.location || 'Kantor Media',
      specs: item.specs || '',
      notes: item.notes || '',
      currentBorrower: item.currentBorrower ? JSON.parse(JSON.stringify(item.currentBorrower)) : null,
    })
    .onConflictDoUpdate({
      target: mediaItems.id,
      set: {
        name: item.name,
        category: item.category,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber,
        condition: item.condition,
        status: item.status,
        location: item.location || 'Kantor Media',
        specs: item.specs || '',
        notes: item.notes || '',
        currentBorrower: item.currentBorrower ? JSON.parse(JSON.stringify(item.currentBorrower)) : null,
        updatedAt: new Date(),
      },
    });
  return item;
}

export async function dbUpdateItem(id: string, item: Partial<MediaItem>): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const updateValues: Record<string, any> = { updated_at: new Date().toISOString() };
    if (item.name !== undefined) updateValues.name = item.name;
    if (item.category !== undefined) updateValues.category = item.category;
    if (item.brand !== undefined) updateValues.brand = item.brand;
    if (item.model !== undefined) updateValues.model = item.model;
    if (item.serialNumber !== undefined) updateValues.serial_number = item.serialNumber;
    if (item.condition !== undefined) updateValues.condition = item.condition;
    if (item.status !== undefined) updateValues.status = item.status;
    if (item.location !== undefined) updateValues.location = item.location;
    if (item.specs !== undefined) updateValues.specs = item.specs;
    if (item.notes !== undefined) updateValues.notes = item.notes;
    if (item.currentBorrower !== undefined) updateValues.current_borrower = item.currentBorrower || null;
    const { error } = await supa.from('media_items').update(updateValues).eq('id', id);
    if (error) throw error;
    return;
  }

  const updateValues: Record<string, any> = { updatedAt: new Date() };
  if (item.name !== undefined) updateValues.name = item.name;
  if (item.category !== undefined) updateValues.category = item.category;
  if (item.brand !== undefined) updateValues.brand = item.brand;
  if (item.model !== undefined) updateValues.model = item.model;
  if (item.serialNumber !== undefined) updateValues.serialNumber = item.serialNumber;
  if (item.condition !== undefined) updateValues.condition = item.condition;
  if (item.status !== undefined) updateValues.status = item.status;
  if (item.location !== undefined) updateValues.location = item.location;
  if (item.specs !== undefined) updateValues.specs = item.specs;
  if (item.notes !== undefined) updateValues.notes = item.notes;
  if (item.currentBorrower !== undefined) {
    updateValues.currentBorrower = item.currentBorrower ? JSON.parse(JSON.stringify(item.currentBorrower)) : null;
  }

  await db.update(mediaItems).set(updateValues).where(eq(mediaItems.id, id));
}

export async function dbDeleteItem(id: string): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('media_items').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await db.delete(mediaItems).where(eq(mediaItems.id, id));
}

// ==========================================
// LOAN REQUESTS QUERIES
// ==========================================

export async function dbGetLoans(): Promise<LoanRequest[]> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { data, error } = await supa
      .from('loan_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      unitName: r.unit_name,
      borrowerName: r.borrower_name,
      borrowerPhone: r.borrower_phone,
      items: r.items || [],
      startDate: r.start_date,
      startTime: r.start_time,
      endDate: r.end_date,
      endTime: r.end_time,
      purpose: r.purpose,
      status: r.status,
      pickupLocation: r.pickup_location || undefined,
      rejectionReason: r.rejection_reason || undefined,
      returnNotes: r.return_notes || undefined,
      adminNotes: r.admin_notes || undefined,
      createdAt: r.created_at,
      approvedAt: r.approved_at || undefined,
      returnedAt: r.returned_at || undefined,
      approvedBy: r.approved_by || undefined,
    }));
  }

  const rows = await db.select().from(loanRequests).orderBy(desc(loanRequests.createdAt));
  return rows.map((r) => ({
    id: r.id,
    unitName: r.unitName,
    borrowerName: r.borrowerName,
    borrowerPhone: r.borrowerPhone,
    items: (r.items as any) || [],
    startDate: r.startDate,
    startTime: r.startTime,
    endDate: r.endDate,
    endTime: r.endTime,
    purpose: r.purpose,
    status: r.status as any,
    pickupLocation: r.pickupLocation || undefined,
    rejectionReason: r.rejectionReason || undefined,
    returnNotes: r.returnNotes || undefined,
    adminNotes: r.adminNotes || undefined,
    createdAt: r.createdAt,
    approvedAt: r.approvedAt || undefined,
    returnedAt: r.returnedAt || undefined,
    approvedBy: r.approvedBy || undefined,
  }));
}

export async function dbCreateLoan(loan: LoanRequest): Promise<LoanRequest> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('loan_requests').upsert({
      id: loan.id,
      unit_name: loan.unitName,
      borrower_name: loan.borrowerName,
      borrower_phone: loan.borrowerPhone,
      items: loan.items,
      start_date: loan.startDate,
      start_time: loan.startTime || '08:00',
      end_date: loan.endDate,
      end_time: loan.endTime || '17:00',
      purpose: loan.purpose,
      status: loan.status,
      pickup_location: loan.pickupLocation || 'Kantor Media',
      rejection_reason: loan.rejectionReason || null,
      return_notes: loan.returnNotes || null,
      admin_notes: loan.adminNotes || null,
      created_at: loan.createdAt,
      approved_at: loan.approvedAt || null,
      returned_at: loan.returnedAt || null,
      approved_by: loan.approvedBy || null,
    });
    if (error) throw error;
    return loan;
  }

  await db
    .insert(loanRequests)
    .values({
      id: loan.id,
      unitName: loan.unitName,
      borrowerName: loan.borrowerName,
      borrowerPhone: loan.borrowerPhone,
      items: JSON.parse(JSON.stringify(loan.items)),
      startDate: loan.startDate,
      startTime: loan.startTime || '08:00',
      endDate: loan.endDate,
      endTime: loan.endTime || '17:00',
      purpose: loan.purpose,
      status: loan.status,
      pickupLocation: loan.pickupLocation || 'Kantor Media',
      rejectionReason: loan.rejectionReason || null,
      returnNotes: loan.returnNotes || null,
      adminNotes: loan.adminNotes || null,
      createdAt: loan.createdAt,
      approvedAt: loan.approvedAt || null,
      returnedAt: loan.returnedAt || null,
      approvedBy: loan.approvedBy || null,
    })
    .onConflictDoUpdate({
      target: loanRequests.id,
      set: {
        status: loan.status,
        pickupLocation: loan.pickupLocation || 'Kantor Media',
        rejectionReason: loan.rejectionReason || null,
        returnNotes: loan.returnNotes || null,
        adminNotes: loan.adminNotes || null,
        approvedAt: loan.approvedAt || null,
        returnedAt: loan.returnedAt || null,
        approvedBy: loan.approvedBy || null,
      },
    });
  return loan;
}

export async function dbUpdateLoan(id: string, patch: Partial<LoanRequest>): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const updateValues: Record<string, any> = {};
    if (patch.status !== undefined) updateValues.status = patch.status;
    if (patch.pickupLocation !== undefined) updateValues.pickup_location = patch.pickupLocation;
    if (patch.rejectionReason !== undefined) updateValues.rejection_reason = patch.rejectionReason;
    if (patch.returnNotes !== undefined) updateValues.return_notes = patch.returnNotes;
    if (patch.adminNotes !== undefined) updateValues.admin_notes = patch.adminNotes;
    if (patch.approvedAt !== undefined) updateValues.approved_at = patch.approvedAt;
    if (patch.returnedAt !== undefined) updateValues.returned_at = patch.returnedAt;
    if (patch.approvedBy !== undefined) updateValues.approved_by = patch.approvedBy;
    const { error } = await supa.from('loan_requests').update(updateValues).eq('id', id);
    if (error) throw error;
    return;
  }

  const updateValues: Record<string, any> = {};
  if (patch.status !== undefined) updateValues.status = patch.status;
  if (patch.pickupLocation !== undefined) updateValues.pickupLocation = patch.pickupLocation;
  if (patch.rejectionReason !== undefined) updateValues.rejectionReason = patch.rejectionReason;
  if (patch.returnNotes !== undefined) updateValues.returnNotes = patch.returnNotes;
  if (patch.adminNotes !== undefined) updateValues.adminNotes = patch.adminNotes;
  if (patch.approvedAt !== undefined) updateValues.approvedAt = patch.approvedAt;
  if (patch.returnedAt !== undefined) updateValues.returnedAt = patch.returnedAt;
  if (patch.approvedBy !== undefined) updateValues.approvedBy = patch.approvedBy;

  await db.update(loanRequests).set(updateValues).where(eq(loanRequests.id, id));
}

export async function dbDeleteLoan(id: string): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('loan_requests').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  await db.delete(loanRequests).where(eq(loanRequests.id, id));
}

// ==========================================
// MEDIA EVENTS QUERIES
// ==========================================

export async function dbGetEvents(): Promise<MediaEvent[]> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { data, error } = await supa
      .from('media_events')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      startDate: r.start_date,
      startTime: r.start_time,
      endDate: r.end_date,
      endTime: r.end_time,
      location: r.location,
      crewAssigned: r.crew_assigned || [],
      requiredGear: r.required_gear || [],
      description: r.description || undefined,
      relatedLoanId: r.related_loan_id || undefined,
    }));
  }

  const rows = await db.select().from(mediaEvents).orderBy(desc(mediaEvents.startDate));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category as any,
    startDate: r.startDate,
    startTime: r.startTime,
    endDate: r.endDate,
    endTime: r.endTime,
    location: r.location,
    crewAssigned: (r.crewAssigned as any) || [],
    requiredGear: (r.requiredGear as any) || [],
    description: r.description || undefined,
    relatedLoanId: r.relatedLoanId || undefined,
  }));
}

export async function dbCreateEvent(evt: MediaEvent): Promise<MediaEvent> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('media_events').upsert({
      id: evt.id,
      title: evt.title,
      category: evt.category,
      start_date: evt.startDate,
      start_time: evt.startTime,
      end_date: evt.endDate,
      end_time: evt.endTime,
      location: evt.location,
      crew_assigned: evt.crewAssigned || [],
      required_gear: evt.requiredGear || [],
      description: evt.description || null,
      related_loan_id: evt.relatedLoanId || null,
    });
    if (error) throw error;
    return evt;
  }

  await db
    .insert(mediaEvents)
    .values({
      id: evt.id,
      title: evt.title,
      category: evt.category,
      startDate: evt.startDate,
      startTime: evt.startTime,
      endDate: evt.endDate,
      endTime: evt.endTime,
      location: evt.location,
      crewAssigned: JSON.parse(JSON.stringify(evt.crewAssigned || [])),
      requiredGear: JSON.parse(JSON.stringify(evt.requiredGear || [])),
      description: evt.description || null,
      relatedLoanId: evt.relatedLoanId || null,
    })
    .onConflictDoUpdate({
      target: mediaEvents.id,
      set: {
        title: evt.title,
        category: evt.category,
        startDate: evt.startDate,
        startTime: evt.startTime,
        endDate: evt.endDate,
        endTime: evt.endTime,
        location: evt.location,
        crewAssigned: JSON.parse(JSON.stringify(evt.crewAssigned || [])),
        requiredGear: JSON.parse(JSON.stringify(evt.requiredGear || [])),
        description: evt.description || null,
        relatedLoanId: evt.relatedLoanId || null,
      },
    });
  return evt;
}

export async function dbDeleteEvent(id: string): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('media_events').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await db.delete(mediaEvents).where(eq(mediaEvents.id, id));
}

// ==========================================
// SETTINGS QUERIES
// ==========================================

export async function dbGetSettings(): Promise<AppSettings> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { data, error } = await supa.from('app_settings').select('*').limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return initialSettings;
    const r = data[0];
    return {
      appTitle: r.app_title,
      pesantrenName: r.pesantren_name,
      mediaTeamName: r.media_team_name,
      defaultPickupLocation: r.default_pickup_location,
      mediaLeaderPhone: r.media_leader_phone,
      whatsappGroupLink: r.whatsapp_group_link,
      adminPin: r.admin_pin,
      logoType: r.logo_type || 'preset',
      logoPreset: r.logo_preset || 'tv',
      logoCustomUrl: r.logo_custom_url || '',
    };
  }

  const rows = await db.select().from(appSettings).limit(1);
  if (rows.length === 0) {
    return initialSettings;
  }
  const r = rows[0];
  return {
    appTitle: r.appTitle,
    pesantrenName: r.pesantrenName,
    mediaTeamName: r.mediaTeamName,
    defaultPickupLocation: r.defaultPickupLocation,
    mediaLeaderPhone: r.mediaLeaderPhone,
    whatsappGroupLink: r.whatsappGroupLink,
    adminPin: r.adminPin,
    logoType: (r.logoType as any) || 'preset',
    logoPreset: r.logoPreset || 'tv',
    logoCustomUrl: r.logoCustomUrl || '',
  };
}

export async function dbUpdateSettings(settings: AppSettings): Promise<void> {
  const driver = getActiveDbDriver();
  if (driver.mode === 'supabase-rest') {
    const supa = getServerSupabase()!;
    const { error } = await supa.from('app_settings').upsert({
      id: 'main_settings',
      app_title: settings.appTitle,
      pesantren_name: settings.pesantrenName,
      media_team_name: settings.mediaTeamName,
      default_pickup_location: settings.defaultPickupLocation || 'Kantor Media',
      media_leader_phone: settings.mediaLeaderPhone,
      whatsapp_group_link: settings.whatsappGroupLink,
      admin_pin: settings.adminPin,
      logo_type: settings.logoType || 'preset',
      logo_preset: settings.logoPreset || 'tv',
      logo_custom_url: settings.logoCustomUrl || '',
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }

  await db
    .insert(appSettings)
    .values({
      id: 'main_settings',
      appTitle: settings.appTitle,
      pesantrenName: settings.pesantrenName,
      mediaTeamName: settings.mediaTeamName,
      defaultPickupLocation: settings.defaultPickupLocation || 'Kantor Media',
      mediaLeaderPhone: settings.mediaLeaderPhone,
      whatsappGroupLink: settings.whatsappGroupLink,
      adminPin: settings.adminPin,
      logoType: settings.logoType || 'preset',
      logoPreset: settings.logoPreset || 'tv',
      logoCustomUrl: settings.logoCustomUrl || '',
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        appTitle: settings.appTitle,
        pesantrenName: settings.pesantrenName,
        mediaTeamName: settings.mediaTeamName,
        defaultPickupLocation: settings.defaultPickupLocation || 'Kantor Media',
        mediaLeaderPhone: settings.mediaLeaderPhone,
        whatsappGroupLink: settings.whatsappGroupLink,
        adminPin: settings.adminPin,
        logoType: settings.logoType || 'preset',
        logoPreset: settings.logoPreset || 'tv',
        logoCustomUrl: settings.logoCustomUrl || '',
        updatedAt: new Date(),
      },
    });
}
