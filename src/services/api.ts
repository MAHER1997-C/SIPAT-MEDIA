import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';
import {
  isClientSupabaseConfigured,
  supaClientGetItems,
  supaClientSaveItem,
  supaClientDeleteItem,
  supaClientGetLoans,
  supaClientCreateLoan,
  supaClientUpdateLoan,
  supaClientGetEvents,
  supaClientSaveEvent,
  supaClientDeleteEvent,
  supaClientGetSettings,
  supaClientSaveSettings,
} from '../lib/supabase.ts';

export interface FullSyncBundle {
  timestamp: string;
  source?: string;
  settings: AppSettings;
  items: MediaItem[];
  loans: LoanRequest[];
  events: MediaEvent[];
  stats?: {
    itemsCount: number;
    loansCount: number;
    eventsCount: number;
  };
}

export interface HealthCheckResult {
  status: string;
  database: 'connected' | 'fallback' | 'disconnected';
  provider?: string;
  serverTime: string;
  institution?: string;
  mediaTeam?: string;
  counts?: {
    items: number;
    loans: number;
    events: number;
  };
  error?: string;
}

/**
 * Mendapatkan API base URL
 */
function getApiUrl(path: string): string {
  const base = (typeof window !== 'undefined' && localStorage.getItem('sipat_custom_api_url')) || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base) {
    return `${base.replace(/\/$/, '')}${cleanPath}`;
  }
  return cleanPath;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server tidak mengembalikan JSON (kemungkinan API route belum aktif)');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned status ${res.status}`);
  }
  return await res.json();
}

/**
 * Health check status server & Database (Supabase / Cloud SQL)
 */
export async function checkServerHealth(): Promise<HealthCheckResult> {
  try {
    const res = await fetch(getApiUrl('/api/health'));
    const data = await parseJsonResponse<HealthCheckResult>(res);
    if (data.database === 'connected') {
      return data;
    }
    if (isClientSupabaseConfigured) {
      const items = await supaClientGetItems();
      return {
        status: 'ok',
        database: 'connected',
        provider: 'Supabase Client Direct',
        serverTime: new Date().toISOString(),
        counts: { items: items.length, loans: 0, events: 0 },
      };
    }
    return data;
  } catch (err: any) {
    if (isClientSupabaseConfigured) {
      try {
        const items = await supaClientGetItems();
        return {
          status: 'ok',
          database: 'connected',
          provider: 'Supabase Client Direct',
          serverTime: new Date().toISOString(),
          counts: { items: items.length, loans: 0, events: 0 },
        };
      } catch (supaErr: any) {
        return {
          status: 'error',
          database: 'disconnected',
          provider: 'Supabase',
          serverTime: new Date().toISOString(),
          error: supaErr.message,
        };
      }
    }
    throw err;
  }
}

/**
 * Tarik seluruh paket data sinkronisasi dari server dalam 1 request
 */
export async function fetchFullSyncBundle(): Promise<FullSyncBundle> {
  const res = await fetch(getApiUrl('/api/sync/bundle'));
  return await parseJsonResponse<FullSyncBundle>(res);
}

/**
 * Kirim seluruh paket data sinkronisasi ke server
 */
export async function sendFullSyncBundle(bundle: {
  settings?: AppSettings;
  items?: MediaItem[];
  loans?: LoanRequest[];
  events?: MediaEvent[];
}): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const res = await fetch(getApiUrl('/api/sync/bundle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    return await parseJsonResponse<{ success: boolean; message: string; stats?: any }>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      if (bundle.settings) await supaClientSaveSettings(bundle.settings);
      if (bundle.items) {
        for (const item of bundle.items) await supaClientSaveItem(item);
      }
      if (bundle.loans) {
        for (const loan of bundle.loans) await supaClientCreateLoan(loan);
      }
      if (bundle.events) {
        for (const evt of bundle.events) await supaClientSaveEvent(evt);
      }
      return { success: true, message: 'Berhasil disimpan langsung ke Supabase' };
    }
    throw err;
  }
}

export async function fetchCloudItems(): Promise<MediaItem[]> {
  try {
    const res = await fetch(getApiUrl('/api/items'));
    return await parseJsonResponse<MediaItem[]>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientGetItems();
    }
    throw err;
  }
}

export async function saveCloudItem(item: MediaItem, isNew: boolean): Promise<void> {
  try {
    const url = getApiUrl(isNew ? '/api/items' : `/api/items/${encodeURIComponent(item.id)}`);
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    await parseJsonResponse(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      await supaClientSaveItem(item);
      return;
    }
    throw err;
  }
}

export async function deleteCloudItem(id: string): Promise<void> {
  try {
    const res = await fetch(getApiUrl(`/api/items/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    await parseJsonResponse(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      await supaClientDeleteItem(id);
      return;
    }
    throw err;
  }
}

export async function fetchCloudLoans(): Promise<LoanRequest[]> {
  try {
    const res = await fetch(getApiUrl('/api/loans'));
    return await parseJsonResponse<LoanRequest[]>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientGetLoans();
    }
    throw err;
  }
}

export async function createCloudLoan(loan: LoanRequest): Promise<LoanRequest> {
  try {
    const res = await fetch(getApiUrl('/api/loans'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loan),
    });
    return await parseJsonResponse<LoanRequest>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientCreateLoan(loan);
    }
    throw err;
  }
}

export async function updateCloudLoan(id: string, patch: Partial<LoanRequest>): Promise<void> {
  try {
    const res = await fetch(getApiUrl(`/api/loans/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await parseJsonResponse(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      await supaClientUpdateLoan(id, patch);
      return;
    }
    throw err;
  }
}

export async function fetchCloudEvents(): Promise<MediaEvent[]> {
  try {
    const res = await fetch(getApiUrl('/api/events'));
    return await parseJsonResponse<MediaEvent[]>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientGetEvents();
    }
    throw err;
  }
}

export async function createCloudEvent(event: MediaEvent): Promise<MediaEvent> {
  try {
    const res = await fetch(getApiUrl('/api/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return await parseJsonResponse<MediaEvent>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientSaveEvent(event);
    }
    throw err;
  }
}

export async function deleteCloudEvent(id: string): Promise<void> {
  try {
    const res = await fetch(getApiUrl(`/api/events/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    await parseJsonResponse(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      await supaClientDeleteEvent(id);
      return;
    }
    throw err;
  }
}

export async function fetchCloudSettings(): Promise<AppSettings> {
  try {
    const res = await fetch(getApiUrl('/api/settings'));
    return await parseJsonResponse<AppSettings>(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      return await supaClientGetSettings();
    }
    throw err;
  }
}

export async function saveCloudSettings(settings: AppSettings): Promise<void> {
  try {
    const res = await fetch(getApiUrl('/api/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    await parseJsonResponse(res);
  } catch (err) {
    if (isClientSupabaseConfigured) {
      await supaClientSaveSettings(settings);
      return;
    }
    throw err;
  }
}
