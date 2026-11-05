import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types';
import { initialItems, initialLoans, initialEvents, initialSettings } from '../data/seedData';

const CURRENT_VERSION = 'v7_pptq_qoryatul_quran_official';
const VERSION_KEY = 'sipat_media_version_sync';

const STORAGE_KEYS = {
  ITEMS: 'sipat_media_items_v5',
  LOANS: 'sipat_media_loans_v5',
  EVENTS: 'sipat_media_events_v5',
  SETTINGS: 'sipat_media_settings_v1',
  ADMIN_SESSION: 'sipat_media_admin_logged_in_v1',
};

// Pastikan browser pengunjung otomatis diperbarui ke PPTQ Qoryatul Qur'an & Qoryah TV
function ensureLatestVersionMigration(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const currentVer = localStorage.getItem(VERSION_KEY);
    if (currentVer !== CURRENT_VERSION) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(initialItems));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(initialLoans));
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch (e) {
    console.error('Error migrating stored media data', e);
  }
}

// Jalankan migrasi otomatis saat modul dimuat
ensureLatestVersionMigration();

export function getStoredItems(): MediaItem[] {
  try {
    ensureLatestVersionMigration();
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
    const pesantrenName = (!parsed.pesantrenName || parsed.pesantrenName === 'Pondok Pesantren Darul Hikmah')
      ? initialSettings.pesantrenName
      : parsed.pesantrenName;
    const mediaTeamName = (!parsed.mediaTeamName || parsed.mediaTeamName === 'Biro Media & Dokumentasi')
      ? initialSettings.mediaTeamName
      : parsed.mediaTeamName;
    const defaultPickupLocation = (!parsed.defaultPickupLocation || parsed.defaultPickupLocation.includes('Studio Biro Media'))
      ? initialSettings.defaultPickupLocation
      : parsed.defaultPickupLocation;

    return {
      ...initialSettings,
      ...parsed,
      pesantrenName,
      mediaTeamName,
      defaultPickupLocation,
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

/**
 * Mengubah pengaturan (nama pesantren, logo, lokasi, kontak) menjadi kode sinkronisasi ringkas
 */
export function encodeSettingsToCode(settings: AppSettings, omitLargeImage = false): string {
  try {
    let toEncode = settings;
    if (omitLargeImage && settings.logoCustomUrl && settings.logoCustomUrl.length > 500) {
      // Hilangkan base64 gambar yang terlalu panjang agar muat di parameter URL browser
      toEncode = {
        ...settings,
        logoCustomUrl: '',
      };
    }
    const jsonStr = JSON.stringify(toEncode);
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch (e) {
    console.error('Error encoding settings', e);
    return '';
  }
}

/**
 * Membaca kembali kode sinkronisasi menjadi objek pengaturan
 */
export function decodeSettingsFromCode(code: string): AppSettings | null {
  try {
    const clean = code.trim();
    if (!clean) return null;
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && (parsed.pesantrenName || parsed.appTitle)) {
      return {
        ...initialSettings,
        ...parsed,
      };
    }
    return null;
  } catch (e) {
    console.error('Error decoding settings code', e);
    return null;
  }
}

/**
 * Ekspor khusus file pengaturan lembaga (termasuk logo gambar penuh)
 */
export function exportSettingsJson(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function importSettingsJson(jsonStr: string): AppSettings | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && (parsed.pesantrenName || parsed.appTitle)) {
      return {
        ...initialSettings,
        ...parsed,
      };
    }
    return null;
  } catch (e) {
    console.error('Error importing settings JSON', e);
    return null;
  }
}

