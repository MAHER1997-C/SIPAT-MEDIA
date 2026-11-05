import { db } from './index.ts';
import { mediaItems, loanRequests, mediaEvents, appSettings } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { initialItems, initialLoans, initialEvents, initialSettings } from '../data/seedData.ts';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types/index.ts';

/**
 * Memastikan database PostgreSQL terisi dengan data bawaan resmi (27 alat, pengaturan PPTQ Qoryatul Qur'an)
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  try {
    // 1. Cek & Seed App Settings
    const existingSettings = await db.select().from(appSettings).limit(1);
    if (existingSettings.length === 0) {
      console.log('Seeding initial app settings to Cloud SQL PostgreSQL...');
      await db.insert(appSettings).values({
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
      });
    }

    // 2. Cek & Seed Media Items (27 unit alat)
    const existingItems = await db.select().from(mediaItems);
    if (existingItems.length === 0) {
      console.log(`Seeding ${initialItems.length} media items to Cloud SQL PostgreSQL...`);
      for (const item of initialItems) {
        await db.insert(mediaItems).values({
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
        });
      }
    }

    // 3. Cek & Seed Loan Requests
    const existingLoans = await db.select().from(loanRequests);
    if (existingLoans.length === 0) {
      console.log(`Seeding ${initialLoans.length} loan records to Cloud SQL PostgreSQL...`);
      for (const loan of initialLoans) {
        await db.insert(loanRequests).values({
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
        });
      }
    }

    // 4. Cek & Seed Media Events
    const existingEvents = await db.select().from(mediaEvents);
    if (existingEvents.length === 0) {
      console.log(`Seeding ${initialEvents.length} events to Cloud SQL PostgreSQL...`);
      for (const evt of initialEvents) {
        await db.insert(mediaEvents).values({
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
        });
      }
    }
  } catch (error) {
    console.error('Failed to seed initial data to database:', error);
  }
}

// ==========================================
// MEDIA ITEMS QUERIES
// ==========================================

export async function dbGetItems(): Promise<MediaItem[]> {
  try {
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
  } catch (error) {
    console.error('dbGetItems error:', error);
    throw new Error('Gagal mengambil daftar inventaris alat dari server database.', { cause: error });
  }
}

export async function dbCreateItem(item: MediaItem): Promise<MediaItem> {
  try {
    await db.insert(mediaItems).values({
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
    });
    return item;
  } catch (error) {
    console.error('dbCreateItem error:', error);
    throw new Error(`Gagal menyimpan alat baru ${item.name} ke server database.`, { cause: error });
  }
}

export async function dbUpdateItem(id: string, item: Partial<MediaItem>): Promise<void> {
  try {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };
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
  } catch (error) {
    console.error('dbUpdateItem error:', error);
    throw new Error(`Gagal memperbarui alat ${id} di server database.`, { cause: error });
  }
}

export async function dbDeleteItem(id: string): Promise<void> {
  try {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  } catch (error) {
    console.error('dbDeleteItem error:', error);
    throw new Error(`Gagal menghapus alat ${id} dari server database.`, { cause: error });
  }
}

// ==========================================
// LOAN REQUESTS QUERIES
// ==========================================

export async function dbGetLoans(): Promise<LoanRequest[]> {
  try {
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
  } catch (error) {
    console.error('dbGetLoans error:', error);
    throw new Error('Gagal mengambil daftar peminjaman dari server database.', { cause: error });
  }
}

export async function dbCreateLoan(loan: LoanRequest): Promise<LoanRequest> {
  try {
    await db.insert(loanRequests).values({
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
    });
    return loan;
  } catch (error) {
    console.error('dbCreateLoan error:', error);
    throw new Error(`Gagal menyimpan permohonan pinjam ${loan.id} ke database.`, { cause: error });
  }
}

export async function dbUpdateLoan(id: string, patch: Partial<LoanRequest>): Promise<void> {
  try {
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
  } catch (error) {
    console.error('dbUpdateLoan error:', error);
    throw new Error(`Gagal memperbarui status pinjaman ${id} di database.`, { cause: error });
  }
}

// ==========================================
// MEDIA EVENTS QUERIES
// ==========================================

export async function dbGetEvents(): Promise<MediaEvent[]> {
  try {
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
  } catch (error) {
    console.error('dbGetEvents error:', error);
    throw new Error('Gagal mengambil agenda kegiatan dari database.', { cause: error });
  }
}

export async function dbCreateEvent(evt: MediaEvent): Promise<MediaEvent> {
  try {
    await db.insert(mediaEvents).values({
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
    });
    return evt;
  } catch (error) {
    console.error('dbCreateEvent error:', error);
    throw new Error(`Gagal menambah agenda kegiatan ${evt.title} ke database.`, { cause: error });
  }
}

// ==========================================
// SETTINGS QUERIES
// ==========================================

export async function dbGetSettings(): Promise<AppSettings> {
  try {
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
  } catch (error) {
    console.error('dbGetSettings error:', error);
    return initialSettings;
  }
}

export async function dbUpdateSettings(settings: AppSettings): Promise<void> {
  try {
    const existing = await db.select().from(appSettings).limit(1);
    if (existing.length === 0) {
      await db.insert(appSettings).values({
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
      });
    } else {
      await db.update(appSettings).set({
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
      }).where(eq(appSettings.id, existing[0].id));
    }
  } catch (error) {
    console.error('dbUpdateSettings error:', error);
    throw new Error('Gagal menyimpan pengaturan ke database.', { cause: error });
  }
}
