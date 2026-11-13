import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';
import { initialItems, initialLoans, initialEvents, initialSettings } from '../data/seedData.ts';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
  '';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  '';

export const isClientSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cachedClient: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient | null {
  if (!isClientSupabaseConfigured) return null;
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedClient;
}

export async function supaClientGetItems(): Promise<MediaItem[]> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { data, error } = await client.from('media_items').select('*').order('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    for (const item of initialItems) {
      await client.from('media_items').upsert({
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
    return initialItems;
  }
  return data.map((r: any) => ({
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

export async function supaClientSaveItem(item: MediaItem): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('media_items').upsert({
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
}

export async function supaClientDeleteItem(id: string): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('media_items').delete().eq('id', id);
  if (error) throw error;
}

export async function supaClientGetLoans(): Promise<LoanRequest[]> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { data, error } = await client
    .from('loan_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) {
    for (const loan of initialLoans) {
      await client.from('loan_requests').upsert({
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
    return initialLoans;
  }
  return data.map((r: any) => ({
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

export async function supaClientCreateLoan(loan: LoanRequest): Promise<LoanRequest> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('loan_requests').upsert({
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

export async function supaClientUpdateLoan(id: string, patch: Partial<LoanRequest>): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const updateData: Record<string, any> = {};
  if (patch.status !== undefined) updateData.status = patch.status;
  if (patch.pickupLocation !== undefined) updateData.pickup_location = patch.pickupLocation;
  if (patch.rejectionReason !== undefined) updateData.rejection_reason = patch.rejectionReason;
  if (patch.returnNotes !== undefined) updateData.return_notes = patch.returnNotes;
  if (patch.adminNotes !== undefined) updateData.admin_notes = patch.adminNotes;
  if (patch.approvedAt !== undefined) updateData.approved_at = patch.approvedAt;
  if (patch.returnedAt !== undefined) updateData.returned_at = patch.returnedAt;
  if (patch.approvedBy !== undefined) updateData.approved_by = patch.approvedBy;

  const { error } = await client.from('loan_requests').update(updateData).eq('id', id);
  if (error) throw error;
}

export async function supaClientDeleteLoan(id: string): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('loan_requests').delete().eq('id', id);
  if (error) throw error;
}

export async function supaClientGetEvents(): Promise<MediaEvent[]> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { data, error } = await client
    .from('media_events')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) {
    for (const evt of initialEvents) {
      await client.from('media_events').upsert({
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
    return initialEvents;
  }
  return data.map((r: any) => ({
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

export async function supaClientSaveEvent(evt: MediaEvent): Promise<MediaEvent> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('media_events').upsert({
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

export async function supaClientDeleteEvent(id: string): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('media_events').delete().eq('id', id);
  if (error) throw error;
}

export async function supaClientGetSettings(): Promise<AppSettings> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { data, error } = await client.from('app_settings').select('*').limit(1);
  if (error) throw error;
  if (!data || data.length === 0) {
    await supaClientSaveSettings(initialSettings);
    return initialSettings;
  }
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

export async function supaClientSaveSettings(settings: AppSettings): Promise<void> {
  const client = getClientSupabase();
  if (!client) throw new Error('Supabase client not configured');
  const { error } = await client.from('app_settings').upsert({
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
}
