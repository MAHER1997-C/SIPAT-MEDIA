import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types';
import { initialItems, initialLoans, initialEvents, initialSettings } from '../data/seedData';

const STORAGE_KEYS = {
  ITEMS: 'sipat_media_items_v4',
  LOANS: 'sipat_media_loans_v4',
  EVENTS: 'sipat_media_events_v4',
  SETTINGS: 'sipat_media_settings_v1',
  ADMIN_SESSION: 'sipat_media_admin_logged_in_v1',
};

export function getStoredItems(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(initialItems));
      return initialItems;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading items from storage', e);
    return initialItems;
  }
}

export function saveStoredItems(items: MediaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving items to storage', e);
  }
}

export function getStoredLoans(): LoanRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initialLoans));
      return initialLoans;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading loans from storage', e);
    return initialLoans;
  }
}

export function saveStoredLoans(loans: LoanRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  } catch (e) {
    console.error('Error saving loans to storage', e);
  }
}

export function getStoredEvents(): MediaEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
      return initialEvents;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
      return initialEvents;
    }
    return parsed;
  } catch (e) {
    console.error('Error reading events from storage', e);
    return initialEvents;
  }
}

export function saveStoredEvents(events: MediaEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('Error saving events to storage', e);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
      return initialSettings;
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialSettings,
      ...parsed,
      appTitle: parsed.appTitle || initialSettings.appTitle,
      logoType: parsed.logoType || initialSettings.logoType,
      logoPreset: parsed.logoPreset || initialSettings.logoPreset,
    };
  } catch (e) {
    console.error('Error reading settings from storage', e);
    return initialSettings;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to storage', e);
  }
}

export function getAdminSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSession(isLoggedIn: boolean): void {
  try {
    if (isLoggedIn) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  } catch (e) {
    console.error('Error updating admin session', e);
  }
}

export function exportBackupData(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    settings: getStoredSettings(),
    items: getStoredItems(),
    loans: getStoredLoans(),
    events: getStoredEvents(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.items && Array.isArray(parsed.items)) {
      saveStoredItems(parsed.items);
    }
    if (parsed.loans && Array.isArray(parsed.loans)) {
      saveStoredLoans(parsed.loans);
    }
    if (parsed.events && Array.isArray(parsed.events)) {
      saveStoredEvents(parsed.events);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveStoredSettings(parsed.settings);
    }
    return true;
  } catch (e) {
    console.error('Gagal mengimpor data backup', e);
    return false;
  }
}

export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(initialItems));
  localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initialLoans));
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
}
