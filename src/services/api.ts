import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';

/**
 * Client-side Cloud SQL PostgreSQL API Service
 * Menghubungkan frontend ke backend Express server dengan cache fallback ke localStorage
 */

export async function fetchCloudItems(): Promise<MediaItem[]> {
  const res = await fetch('/api/items');
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function saveCloudItem(item: MediaItem, isNew: boolean): Promise<void> {
  const url = isNew ? '/api/items' : `/api/items/${encodeURIComponent(item.id)}`;
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
  const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menghapus alat dari server (${res.status})`);
  }
}

export async function fetchCloudLoans(): Promise<LoanRequest[]> {
  const res = await fetch('/api/loans');
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function createCloudLoan(loan: LoanRequest): Promise<LoanRequest> {
  const res = await fetch('/api/loans', {
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
  const res = await fetch(`/api/loans/${encodeURIComponent(id)}`, {
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
  const res = await fetch('/api/events');
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function createCloudEvent(event: MediaEvent): Promise<MediaEvent> {
  const res = await fetch('/api/events', {
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
  const res = await fetch('/api/settings');
  if (!res.ok) {
    throw new Error(`Server returned status ${res.status}`);
  }
  return await res.json();
}

export async function saveCloudSettings(settings: AppSettings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menyimpan pengaturan ke server (${res.status})`);
  }
}
