import React, { useState, useEffect, useCallback } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings, SocialMediaMonthlyReport } from './types';
import { 
  getStoredItems, saveStoredItems, 
  getStoredLoans, saveStoredLoans, 
  getStoredEvents, saveStoredEvents, 
  getStoredSettings, saveStoredSettings,
  getStoredSocialReports, saveStoredSocialReports,
  getAdminSession, setAdminSession,
  decodeSettingsFromCode,
  decodeFullSyncBundle,
  applyWhatsAppSyncDelta
} from './utils/storage';
import {
  checkServerHealth,
  fetchCloudItems, saveCloudItem, deleteCloudItem,
  fetchCloudLoans, createCloudLoan, updateCloudLoan, deleteCloudLoan,
  fetchCloudEvents, createCloudEvent, deleteCloudEvent,
  fetchCloudSettings, saveCloudSettings,
  fetchCloudSocialReports, saveCloudSocialReport, botFetchSocialReport, botParseSocialInsight,
  sendFullSyncBundle
} from './services/api';
import { Navbar } from './components/Navbar';
import { DashboardHomeView } from './components/DashboardHomeView';
import { InventoryView } from './components/InventoryView';
import { LoanFormView } from './components/LoanFormView';
import { LoansManagementView } from './components/LoansManagementView';
import { CalendarView } from './components/CalendarView';
import { MonthlyReportsView } from './components/MonthlyReportsView';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ItemModal } from './components/ItemModal';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Application Data States
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [events, setEvents] = useState<MediaEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [socialReports, setSocialReports] = useState<SocialMediaMonthlyReport[]>(getStoredSocialReports());

  // Role State (Admin vs Unit/General)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Active Navigation Tab: dashboard, inventory, calendar, loan-form, loans-management, reports
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'calendar' | 'loan-form' | 'loans-management' | 'reports'>('dashboard');

  // Pre-selected item when user clicks "Pinjam" from inventory
  const [preSelectedItemId, setPreSelectedItemId] = useState<string | null>(null);

  // Modals visibility
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MediaEvent | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Cloud connectivity status
  const [cloudStatus, setCloudStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [dbProvider, setDbProvider] = useState<string | undefined>(undefined);

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Centralized sync loader: loads from Supabase / Cloud SQL PostgreSQL, falls back to local cache
  const loadCloudData = useCallback(async (isBackground = false) => {
    try {
      const [health, cloudItems, cloudLoans, cloudEvents, cloudSettings, cloudSocialReports] = await Promise.all([
        !isBackground ? checkServerHealth().catch(() => null) : Promise.resolve(null),
        fetchCloudItems().catch(() => null),
        fetchCloudLoans().catch(() => null),
        fetchCloudEvents().catch(() => null),
        fetchCloudSettings().catch(() => null),
        fetchCloudSocialReports().catch(() => null),
      ]);

      const anyCloudOk = Boolean(cloudItems || cloudLoans || cloudEvents || cloudSettings || cloudSocialReports);

      if (health) {
        if (health.database === 'connected') {
          setCloudStatus('connected');
          setDbProvider(health.provider || 'Supabase / PostgreSQL');
        } else {
          setCloudStatus('offline');
          setDbProvider(health.provider);
        }
      } else if (anyCloudOk) {
        setCloudStatus('connected');
      } else if (!isBackground) {
        setCloudStatus('offline');
      }

      if (cloudItems && cloudItems.length > 0) {
        setItems(cloudItems);
        saveStoredItems(cloudItems);
      } else if (!isBackground) {
        setItems(getStoredItems());
      }

      if (cloudLoans) {
        setLoans(cloudLoans);
        saveStoredLoans(cloudLoans);
      } else if (!isBackground) {
        setLoans(getStoredLoans());
      }

      if (cloudEvents) {
        setEvents(cloudEvents);
        saveStoredEvents(cloudEvents);
      } else if (!isBackground) {
        setEvents(getStoredEvents());
      }

      if (cloudSettings) {
        setSettings(cloudSettings);
        saveStoredSettings(cloudSettings);
      } else if (!isBackground) {
        setSettings(getStoredSettings());
      }

      if (cloudSocialReports && cloudSocialReports.length > 0) {
        setSocialReports(cloudSocialReports);
        saveStoredSocialReports(cloudSocialReports);
      } else if (!isBackground) {
        setSocialReports(getStoredSocialReports());
      }
    } catch (e) {
      if (!isBackground) {
        setCloudStatus('offline');
        setItems(getStoredItems());
        setLoans(getStoredLoans());
        setEvents(getStoredEvents());
        setSettings(getStoredSettings());
        setSocialReports(getStoredSocialReports());
      }
    }
  }, []);

  // Load stored data on mount & start auto-sync polling
  useEffect(() => {
    setIsAdmin(getAdminSession());
    loadCloudData(false);

    // Auto-sync polling every 6 seconds so updates on one phone reflect across all devices
    const interval = setInterval(() => {
      loadCloudData(true);
    }, 6000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCloudData(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Check for sync_wa (WhatsApp Delta Sync), sync_bundle, or sync_settings URL param
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const syncWaCode = urlParams.get('sync_wa');
      const syncBundleCode = urlParams.get('sync_bundle');
      const syncSettingsCode = urlParams.get('sync_settings');

      if (syncWaCode) {
        const curItems = getStoredItems();
        const curLoans = getStoredLoans();
        const curSettings = getStoredSettings();
        const res = applyWhatsAppSyncDelta(syncWaCode, curItems, curLoans, curSettings);
        if (res) {
          setItems(res.newItems);
          setLoans(res.newLoans);
          setSettings(res.newSettings);
          sendFullSyncBundle({
            settings: res.newSettings,
            items: res.newItems,
            loans: res.newLoans,
          }).catch(() => {});
          const activeBorrowed = res.newLoans.filter((l) => l.status === 'Disetujui').length;
          showToast(`Data Web Terupdate dari WhatsApp! (${res.newItems.length} Alat • ${activeBorrowed} Dipinjam).`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (syncBundleCode) {
        const decoded = decodeFullSyncBundle(syncBundleCode);
        if (decoded) {
          if (decoded.items && Array.isArray(decoded.items)) {
            setItems(decoded.items);
            saveStoredItems(decoded.items);
          }
          if (decoded.loans && Array.isArray(decoded.loans)) {
            setLoans(decoded.loans);
            saveStoredLoans(decoded.loans);
          }
          if (decoded.events && Array.isArray(decoded.events)) {
            setEvents(decoded.events);
            saveStoredEvents(decoded.events);
          }
          if (decoded.settings && typeof decoded.settings === 'object') {
            setSettings(decoded.settings);
            saveStoredSettings(decoded.settings);
          }
          sendFullSyncBundle({
            settings: decoded.settings,
            items: decoded.items,
            loans: decoded.loans,
            events: decoded.events,
          }).catch(() => {});
          showToast(`Sinkronisasi Berhasil! Data inventaris ${decoded.settings?.pesantrenName || "PPTQ Qoryatul Qur'an"} telah diselaraskan.`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (syncSettingsCode) {
        const decoded = decodeSettingsFromCode(syncSettingsCode);
        if (decoded) {
          saveStoredSettings(decoded);
          setSettings(decoded);
          saveCloudSettings(decoded).catch(() => {});
          showToast(`Sinkronisasi berhasil! Data pesantren: "${decoded.pesantrenName}" telah diterapkan.`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Error auto-syncing data from URL', e);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadCloudData]);

  // Local & Cloud Update Handlers
  const handleUpdateItems = (updated: MediaItem[]) => {
    setItems(updated);
    saveStoredItems(updated);
  };

  const handleUpdateLoans = (updated: LoanRequest[]) => {
    setLoans(updated);
    saveStoredLoans(updated);
  };

  const handleUpdateEvents = (updated: MediaEvent[]) => {
    setEvents(updated);
    saveStoredEvents(updated);
  };

  const handleSaveSettings = async (newSettings: AppSettings): Promise<boolean> => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    try {
      await saveCloudSettings(newSettings);
      setCloudStatus('connected');
      showToast('Pengaturan berhasil disimpan & tersinkron online ke database.');
      return true;
    } catch (e: any) {
      console.error('Failed to sync settings to database:', e);
      setCloudStatus('offline');
      showToast('Tersimpan lokal, gagal sinkron ke database online.');
      return false;
    }
  };

  // Social Media & Content Production Report Handlers (Admin + Bot)
  const upsertLocalSocialReport = (saved: SocialMediaMonthlyReport) => {
    setSocialReports((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      const next = idx >= 0 ? prev.map((r, i) => (i === idx ? saved : r)) : [saved, ...prev];
      saveStoredSocialReports(next);
      return next;
    });
  };

  const handleSaveSocialReport = async (report: SocialMediaMonthlyReport): Promise<void> => {
    upsertLocalSocialReport(report);
    try {
      const saved = await saveCloudSocialReport(report);
      upsertLocalSocialReport(saved);
      setCloudStatus('connected');
      showToast(`Laporan Medsos & Konten (${report.id}) disimpan & tersinkron ke Supabase.`);
    } catch (e) {
      console.error('Failed to sync social report to database:', e);
      setCloudStatus('offline');
      showToast(`Laporan Medsos (${report.id}) tersimpan lokal.`);
    }
  };

  const handleBotFetchSocialReport = async (payload: {
    id: string;
    month: number;
    year: number;
    igAccount: string;
    ttAccount: string;
    currentReport?: Partial<SocialMediaMonthlyReport>;
    prevReport?: Partial<SocialMediaMonthlyReport>;
  }) => {
    const res = await botFetchSocialReport(payload);
    if (res?.report) {
      upsertLocalSocialReport(res.report);
      setCloudStatus('connected');
      showToast(res.botMessage || `Bot berhasil memperbarui data @${res.report.igAccount} & @${res.report.ttAccount}.`);
    }
    return res;
  };

  const handleBotParseSocialInsight = async (payload: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    currentReport: SocialMediaMonthlyReport;
  }) => {
    const res = await botParseSocialInsight(payload);
    if (res?.report) {
      upsertLocalSocialReport(res.report);
      setCloudStatus('connected');
      showToast(res.botMessage || `Bot AI berhasil mengekstrak metrik insight (${res.report.id}).`);
    }
    return res;
  };

  const handleDataReset = () => {
    loadCloudData(false);
    showToast('Data sistem telah dimuat ulang dari database online.');
  };

  // Admin Auth Handlers
  const handleAdminSuccess = async (updatedAdminPhone?: string) => {
    setIsAdmin(true);
    setAdminSession(true);

    const cleanedPhone = updatedAdminPhone?.trim();
    if (cleanedPhone && cleanedPhone !== (settings.mediaLeaderPhone || '').trim()) {
      const nextSettings: AppSettings = {
        ...settings,
        mediaLeaderPhone: cleanedPhone,
      };
      setSettings(nextSettings);
      saveStoredSettings(nextSettings);
      try {
        await saveCloudSettings(nextSettings);
        setCloudStatus('connected');
        showToast(`Masuk Admin & No. WA Admin diubah ke ${cleanedPhone} (tersinkron ke Supabase).`);
      } catch (e) {
        console.error('Failed to sync updated admin phone to database:', e);
        setCloudStatus('offline');
        showToast(`Masuk Admin & No. WA Admin diubah ke ${cleanedPhone} (lokal).`);
      }
      return;
    }

    showToast('Berhasil masuk sebagai Admin Media.');
  };

  const handleQuickUpdateAdminPhone = async (newPhone: string): Promise<boolean> => {
    const cleanedPhone = newPhone.trim();
    if (!cleanedPhone) return false;
    return await handleSaveSettings({
      ...settings,
      mediaLeaderPhone: cleanedPhone,
    });
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminSession(false);
    showToast('Telah keluar dari mode Admin.');
  };

  // Item Management (Admin) with Cloud Database Sync
  const handleSaveItem = async (itemToSave: MediaItem) => {
    const existingIndex = items.findIndex((i) => i.id === itemToSave.id);
    const isNew = existingIndex < 0;
    let newItems: MediaItem[];
    if (existingIndex >= 0) {
      newItems = [...items];
      newItems[existingIndex] = itemToSave;
    } else {
      newItems = [itemToSave, ...items];
    }
    handleUpdateItems(newItems);

    try {
      await saveCloudItem(itemToSave, isNew);
      setCloudStatus('connected');
      showToast(
        isNew
          ? `Alat baru ${itemToSave.name} berhasil ditambahkan & disinkronkan.`
          : `Alat ${itemToSave.name} berhasil diperbarui & disinkronkan.`
      );
    } catch (e) {
      console.error('Failed to sync item to database:', e);
      setCloudStatus('offline');
      showToast(`Alat ${itemToSave.name} disimpan lokal (database online belum terjangkau).`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (window.confirm(`Yakin ingin menghapus alat "${item?.name || id}" dari inventaris?`)) {
      const newItems = items.filter((i) => i.id !== id);
      handleUpdateItems(newItems);

      try {
        await deleteCloudItem(id);
        setCloudStatus('connected');
        showToast('Alat telah dihapus dari database online.');
      } catch (e) {
        console.error('Failed to delete item from database:', e);
        setCloudStatus('offline');
        showToast('Alat dihapus lokal (gagal hapus di database online).');
      }
    }
  };

  // Event Management (Admin) with Cloud Database Sync
  const handleSaveEvent = async (eventToSave: MediaEvent) => {
    const existingIndex = events.findIndex((e) => e.id === eventToSave.id);
    const isUpdate = existingIndex >= 0;
    let newEvents: MediaEvent[];
    if (isUpdate) {
      newEvents = [...events];
      newEvents[existingIndex] = eventToSave;
    } else {
      newEvents = [eventToSave, ...events];
    }
    handleUpdateEvents(newEvents);

    try {
      await createCloudEvent(eventToSave);
      setCloudStatus('connected');
      showToast(
        isUpdate
          ? `Jadwal "${eventToSave.title}" berhasil diperbarui & disinkronkan.`
          : `Jadwal liputan "${eventToSave.title}" berhasil ditambahkan & disinkronkan.`
      );
    } catch (e) {
      console.error('Failed to sync event to database:', e);
      setCloudStatus('offline');
      showToast(`Jadwal "${eventToSave.title}" disimpan lokal (database online belum terjangkau).`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (window.confirm(`Yakin ingin menghapus agenda "${event?.title || id}"?`)) {
      const newEvents = events.filter((e) => e.id !== id);
      handleUpdateEvents(newEvents);

      try {
        await deleteCloudEvent(id);
        setCloudStatus('connected');
        showToast('Agenda telah dihapus dari database online.');
      } catch (e) {
        console.error('Failed to delete event from database:', e);
        setCloudStatus('offline');
        showToast('Agenda dihapus lokal (gagal hapus di database online).');
      }
    }
  };

  // Loan Request Submissions (Unit) with Cloud Database Sync
  const handleSubmitLoan = async (newLoan: LoanRequest) => {
    const newLoans = [newLoan, ...loans];
    handleUpdateLoans(newLoans);

    try {
      await createCloudLoan(newLoan);
      setCloudStatus('connected');
      showToast(`Pengajuan ${newLoan.id} dari ${newLoan.unitName} berhasil dikirim ke database.`);
    } catch (e) {
      console.error('Failed to sync loan to database:', e);
      setCloudStatus('offline');
      showToast(`Pengajuan ${newLoan.id} tersimpan lokal (gagal kirim ke database online).`);
    }
  };

  // Loan Approval by Admin with Cloud Database Sync
  const handleApproveLoan = async (loanId: string, adminName: string, pickupLocation?: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    const finalPickupLocation = (pickupLocation && pickupLocation.trim()) || settings.defaultPickupLocation || 'Kantor Media';
    const approvedAt = new Date().toISOString();

    // Update loan status
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'Disetujui' as const,
          approvedAt,
          approvedBy: adminName,
          pickupLocation: finalPickupLocation,
        };
      }
      return l;
    });
    handleUpdateLoans(updatedLoans);

    // Update borrowed items status in inventory
    const itemIds = new Set(loan.items.map((i) => i.itemId));
    const updatedItems = items.map((item) => {
      if (itemIds.has(item.id)) {
        return {
          ...item,
          status: 'Sedang Dipinjam' as const,
          currentBorrower: {
            loanId: loan.id,
            unitName: loan.unitName,
            borrowerName: loan.borrowerName,
            returnDate: loan.endDate,
          },
        };
      }
      return item;
    });
    handleUpdateItems(updatedItems);

    try {
      await updateCloudLoan(loanId, {
        status: 'Disetujui',
        approvedAt,
        approvedBy: adminName,
        pickupLocation: finalPickupLocation,
      });
      for (const it of updatedItems.filter((i) => itemIds.has(i.id))) {
        await saveCloudItem(it, false);
      }
      setCloudStatus('connected');
      showToast(`Peminjaman ${loanId} disetujui & tersinkron. Pengambilan di: ${finalPickupLocation}`);
    } catch (e) {
      console.error('Failed to sync loan approval to database:', e);
      setCloudStatus('offline');
      showToast(`Peminjaman ${loanId} disetujui lokal (gagal sinkron ke database online).`);
    }
  };

  // Loan Return by Admin with Cloud Database Sync
  const handleReturnLoan = async (loanId: string, returnNotes: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    const returnedAt = new Date().toISOString();

    // Update loan status
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'Selesai' as const,
          returnedAt,
          returnNotes,
        };
      }
      return l;
    });
    handleUpdateLoans(updatedLoans);

    // Update items back to 'Tersedia'
    const itemIds = new Set(loan.items.map((i) => i.itemId));
    const updatedItems = items.map((item) => {
      if (itemIds.has(item.id)) {
        return {
          ...item,
          status: 'Tersedia' as const,
          currentBorrower: undefined,
        };
      }
      return item;
    });
    handleUpdateItems(updatedItems);

    try {
      await updateCloudLoan(loanId, {
        status: 'Selesai',
        returnedAt,
        returnNotes,
      });
      for (const it of updatedItems.filter((i) => itemIds.has(i.id))) {
        await saveCloudItem(it, false);
      }
      setCloudStatus('connected');
      showToast(`Alat peminjaman ${loanId} dikembalikan & tersinkron online.`);
    } catch (e) {
      console.error('Failed to sync loan return to database:', e);
      setCloudStatus('offline');
      showToast(`Pengembalian ${loanId} dicatat lokal (gagal sinkron ke database online).`);
    }
  };

  // Loan Rejection by Admin with Cloud Database Sync
  const handleRejectLoan = async (loanId: string, reason: string) => {
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'Ditolak' as const,
          rejectionReason: reason,
        };
      }
      return l;
    });
    handleUpdateLoans(updatedLoans);

    try {
      await updateCloudLoan(loanId, {
        status: 'Ditolak',
        rejectionReason: reason,
      });
      setCloudStatus('connected');
      showToast(`Peminjaman ${loanId} ditolak & tersinkron online.`);
    } catch (e) {
      console.error('Failed to sync loan rejection to database:', e);
      setCloudStatus('offline');
      showToast(`Penolakan ${loanId} dicatat lokal (gagal sinkron ke database online).`);
    }
  };

  // Delete Loan History by Admin (releases active items back to Tersedia if needed)
  const handleDeleteLoan = async (loanId: string) => {
    const loanToDelete = loans.find((l) => l.id === loanId);
    if (!loanToDelete) return;

    const updatedLoans = loans.filter((l) => l.id !== loanId);
    handleUpdateLoans(updatedLoans);

    // Jika berkas yang dihapus berstatus Disetujui, kembalikan status alat yang terikat ke Tersedia
    const itemIds = new Set(loanToDelete.items.map((i) => i.itemId));
    const affectedItems =
      loanToDelete.status === 'Disetujui'
        ? items.filter(
            (item) => itemIds.has(item.id) || item.currentBorrower?.loanId === loanId
          )
        : [];

    if (affectedItems.length > 0) {
      const affectedIds = new Set(affectedItems.map((i) => i.id));
      const updatedItems = items.map((item) => {
        if (affectedIds.has(item.id)) {
          return {
            ...item,
            status: 'Tersedia' as const,
            currentBorrower: undefined,
          };
        }
        return item;
      });
      handleUpdateItems(updatedItems);
    }

    try {
      await deleteCloudLoan(loanId);
      for (const it of affectedItems) {
        await saveCloudItem(
          {
            ...it,
            status: 'Tersedia',
            currentBorrower: undefined,
          },
          false
        );
      }
      setCloudStatus('connected');
      showToast(`Riwayat peminjaman ${loanId} telah dihapus dari database.`);
    } catch (e) {
      console.error('Failed to delete loan from database:', e);
      setCloudStatus('offline');
      showToast(`Riwayat ${loanId} dihapus lokal (gagal hapus di database online).`);
    }
  };

  // Quick borrow from inventory card
  const handleQuickBorrow = (item: MediaItem) => {
    setPreSelectedItemId(item.id);
    setActiveTab('loan-form');
  };

  const pendingLoansCount = loans.filter((l) => l.status === 'Menunggu Konfirmasi').length;

  return (
    <div className="min-h-screen bg-[#F7FAF8] print:bg-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2.5 print:hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        {/* Navigation Bar - Hidden on print */}
        <div className="print:hidden">
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isAdmin={isAdmin}
            onOpenAdminModal={() => setIsAdminModalOpen(true)}
            onAdminLogout={handleAdminLogout}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            pendingLoansCount={pendingLoansCount}
            settings={settings}
            cloudStatus={cloudStatus}
            dbProvider={dbProvider}
          />
        </div>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 print:p-0 print:m-0 print:max-w-none">
          {activeTab === 'dashboard' && (
            <DashboardHomeView
              items={items}
              loans={loans}
              events={events}
              settings={settings}
              isAdmin={isAdmin}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAdminModal={() => setIsAdminModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              items={items}
              isAdmin={isAdmin}
              onAddItem={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingItem(item);
                setIsItemModalOpen(true);
              }}
              onDeleteItem={handleDeleteItem}
              onQuickBorrow={handleQuickBorrow}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              events={events}
              isAdmin={isAdmin}
              onAddEvent={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              onEditEvent={(evt) => {
                setEditingEvent(evt);
                setIsEventModalOpen(true);
              }}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {activeTab === 'loan-form' && (
            <LoanFormView
              items={items}
              settings={settings}
              onSubmitLoan={handleSubmitLoan}
              preSelectedItemId={preSelectedItemId}
              onClearPreSelected={() => setPreSelectedItemId(null)}
              onViewLoanStatus={() => setActiveTab('loans-management')}
            />
          )}

          {activeTab === 'loans-management' && (
            <LoansManagementView
              loans={loans}
              items={items}
              isAdmin={isAdmin}
              settings={settings}
              onApproveLoan={handleApproveLoan}
              onReturnLoan={handleReturnLoan}
              onRejectLoan={handleRejectLoan}
              onDeleteLoan={handleDeleteLoan}
              onOpenAdminAuth={() => setIsAdminModalOpen(true)}
              onUpdateAdminPhone={handleQuickUpdateAdminPhone}
            />
          )}

          {activeTab === 'reports' && (
            <MonthlyReportsView
              items={items}
              loans={loans}
              events={events}
              settings={settings}
              socialReports={socialReports}
              isAdmin={isAdmin}
              onSaveSocialReport={handleSaveSocialReport}
              onBotFetchSocialReport={handleBotFetchSocialReport}
              onBotParseSocialInsight={handleBotParseSocialInsight}
              onOpenAdminAuth={() => setIsAdminModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Footer (Hidden on print) */}
      <footer className="mt-12 bg-white text-slate-500 py-6 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-emerald-700">{settings.appTitle || 'SIPAT Media'}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-700 font-medium">{settings.mediaTeamName}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{settings.pesantrenName}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Sistem Peminjaman Alat & Inventaris Multimedia Terintegrasi WhatsApp</span>
          </div>
        </div>
      </footer>

      {/* Admin Auth PIN Modal */}
      <AdminAuthModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminSuccess}
        currentPin={settings.adminPin}
        currentAdminPhone={settings.mediaLeaderPhone}
      />

      {/* Add / Edit Inventory Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
      />

      {/* Add / Edit Calendar Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
        items={items}
      />

      {/* Settings & WhatsApp Group Link Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onDataReset={handleDataReset}
      />
    </div>
  );
}
