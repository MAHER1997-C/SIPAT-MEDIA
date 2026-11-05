import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';

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
 * Mendukung proxy internal, VITE_API_URL, atau custom endpoint
 */
function getApiUrl(path: string): string {
  const base = (typeof window !== 'undefined' && localStorage.getItem('sipat_custom_api_url')) || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base) {
    return `${base.replace(/\/$/, '')}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Health check status server & Cloud SQL
 */
export async function checkServerHealth(): Promise<HealthCheckResult> {
  const res = await fetch(getApiUrl('/api/health'));
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

/**
 * Tarik seluruh paket data sinkronisasi dari server dalam 1 request
 */
export async function fetchFullSyncBundle(): Promise<FullSyncBundle> {
  const res = await fetch(getApiUrl('/api/sync/bundle'));
  if (!res.ok) {
    throw new Error(`Gagal memuat paket data dari server (${res.status})`);
  }
  return await res.json();
}

/**
 * Kirim seluruh paket data sinkronisasi ke server Cloud SQL
 */
export async function sendFullSyncBundle(bundle: {
  settings?: AppSettings;
  items?: MediaItem[];
  loans?: LoanRequest[];
  events?: MediaEvent[];
}): Promise<{ success: boolean; message: string; stats?: any }> {
  const res = await fetch(getApiUrl('/api/sync/bundle'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengirim paket sinkronisasi (${res.status})`);
  }
  return await res.json();
}

export async function fetchCloudItems(): Promise<MediaItem[]> {
  const res = await fetch(getApiUrl('/api/items'));
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function saveCloudItem(item: MediaItem, isNew: boolean): Promise<void> {
  const url = getApiUrl(isNew ? '/api/items' : `/api/items/${encodeURIComponent(item.id)}`);
  const method = isNew ? 'POST' : 'PUT';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menyimpan alat ke server (${res.status})`);
  }
}

export async function deleteCloudItem(id: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/items/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menghapus alat dari server (${res.status})`);
  }
}

export async function fetchCloudLoans(): Promise<LoanRequest[]> {
  const res = await fetch(getApiUrl('/api/loans'));
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function createCloudLoan(loan: LoanRequest): Promise<LoanRequest> {
  const res = await fetch(getApiUrl('/api/loans'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loan),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengajukan pinjaman ke server (${res.status})`);
  }
  return await res.json();
}

export async function updateCloudLoan(id: string, patch: Partial<LoanRequest>): Promise<void> {
  const res = await fetch(getApiUrl(`/api/loans/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengupdate pinjaman di server (${res.status})`);
  }
}

export async function fetchCloudEvents(): Promise<MediaEvent[]> {
  const res = await fetch(getApiUrl('/api/events'));
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function createCloudEvent(event: MediaEvent): Promise<MediaEvent> {
  const res = await fetch(getApiUrl('/api/events'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menambah agenda ke server (${res.status})`);
  }
  return await res.json();
}

export async function fetchCloudSettings(): Promise<AppSettings> {
  const res = await fetch(getApiUrl('/api/settings'));
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function saveCloudSettings(settings: AppSettings): Promise<void> {
  const res = await fetch(getApiUrl('/api/settings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menyimpan pengaturan ke server (${res.status})`);
  }
}
