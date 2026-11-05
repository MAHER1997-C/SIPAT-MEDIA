import React, { useState, useEffect, useCallback } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from './types';
import { 
  getStoredItems, saveStoredItems, 
  getStoredLoans, saveStoredLoans, 
  getStoredEvents, saveStoredEvents, 
  getStoredSettings, saveStoredSettings, 
  getAdminSession, setAdminSession,
  decodeSettingsFromCode,
  decodeFullSyncBundle,
  applyWhatsAppSyncDelta
} from './utils/storage';
import {
  fetchCloudItems, saveCloudItem, deleteCloudItem,
  fetchCloudLoans, createCloudLoan, updateCloudLoan,
  fetchCloudEvents, createCloudEvent,
  fetchCloudSettings, saveCloudSettings,
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
import { VercelSyncModal } from './components/VercelSyncModal';

export default function App() {
  // Application Data States
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [events, setEvents] = useState<MediaEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());

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
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Centralized sync loader: loads from Cloud SQL PostgreSQL, falls back to local cache
  const loadCloudData = useCallback(async (isBackground = false) => {
    try {
      const [cloudItems, cloudLoans, cloudEvents, cloudSettings] = await Promise.all([
        fetchCloudItems().catch(() => null),
        fetchCloudLoans().catch(() => null),
        fetchCloudEvents().catch(() => null),
        fetchCloudSettings().catch(() => null),
      ]);

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
    } catch (e) {
      if (!isBackground) {
        setItems(getStoredItems());
        setLoans(getStoredLoans());
        setEvents(getStoredEvents());
        setSettings(getStoredSettings());
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

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    showToast('Pengaturan lembaga berhasil diperbarui.');
    try {
      await saveCloudSettings(newSettings);
    } catch (e) {
      console.error('Failed to sync settings to Cloud SQL:', e);
    }
  };

  const handleDataReset = () => {
    loadCloudData(false);
    showToast('Data sistem telah dimuat ulang dari database cloud.');
  };

  // Admin Auth Handlers
  const handleAdminSuccess = () => {
    setIsAdmin(true);
    setAdminSession(true);
    showToast('Berhasil masuk sebagai Admin Media.');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminSession(false);
    showToast('Telah keluar dari mode Admin.');
  };

  // Item Management (Admin) with Cloud SQL Sync
  const handleSaveItem = async (itemToSave: MediaItem) => {
    const existingIndex = items.findIndex((i) => i.id === itemToSave.id);
    const isNew = existingIndex < 0;
    let newItems: MediaItem[];
    if (existingIndex >= 0) {
      newItems = [...items];
      newItems[existingIndex] = itemToSave;
      showToast(`Alat ${itemToSave.name} berhasil diperbarui.`);
    } else {
      newItems = [itemToSave, ...items];
      showToast(`Alat baru ${itemToSave.name} berhasil ditambahkan.`);
    }
    handleUpdateItems(newItems);

    try {
      await saveCloudItem(itemToSave, isNew);
    } catch (e) {
      console.error('Failed to sync item to Cloud SQL:', e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (window.confirm(`Yakin ingin menghapus alat "${item?.name || id}" dari inventaris?`)) {
      const newItems = items.filter((i) => i.id !== id);
      handleUpdateItems(newItems);
      showToast('Alat telah dihapus dari inventaris.');

      try {
        await deleteCloudItem(id);
      } catch (e) {
        console.error('Failed to delete item from Cloud SQL:', e);
      }
    }
  };

  // Event Management (Admin) with Cloud SQL Sync
  const handleSaveEvent = async (eventToSave: MediaEvent) => {
    const existingIndex = events.findIndex((e) => e.id === eventToSave.id);
    let newEvents: MediaEvent[];
    if (existingIndex >= 0) {
      newEvents = [...events];
      newEvents[existingIndex] = eventToSave;
      showToast(`Jadwal "${eventToSave.title}" berhasil diperbarui.`);
    } else {
      newEvents = [eventToSave, ...events];
      showToast(`Jadwal liputan "${eventToSave.title}" berhasil ditambahkan.`);
    }
    handleUpdateEvents(newEvents);

    try {
      await createCloudEvent(eventToSave);
    } catch (e) {
      console.error('Failed to sync event to Cloud SQL:', e);
    }
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (window.confirm(`Yakin ingin menghapus agenda "${event?.title || id}"?`)) {
      const newEvents = events.filter((e) => e.id !== id);
      handleUpdateEvents(newEvents);
      showToast('Agenda telah dihapus.');
    }
  };

  // Loan Request Submissions (Unit) with Cloud SQL Sync
  const handleSubmitLoan = async (newLoan: LoanRequest) => {
    const newLoans = [newLoan, ...loans];
    handleUpdateLoans(newLoans);
    showToast(`Pengajuan ${newLoan.id} dari ${newLoan.unitName} berhasil dibuat.`);

    try {
      await createCloudLoan(newLoan);
    } catch (e) {
      console.error('Failed to sync loan to Cloud SQL:', e);
    }
  };

  // Loan Approval by Admin with Cloud SQL Sync
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
    showToast(`Peminjaman ${loanId} disetujui. Pengambilan di: ${finalPickupLocation}`);

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
    } catch (e) {
      console.error('Failed to sync loan approval to Cloud SQL:', e);
    }
  };

  // Loan Return by Admin with Cloud SQL Sync
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
    showToast(`Alat peminjaman ${loanId} telah dikembalikan ke inventaris.`);

    try {
      await updateCloudLoan(loanId, {
        status: 'Selesai',
        returnedAt,
        returnNotes,
      });
      for (const it of updatedItems.filter((i) => itemIds.has(i.id))) {
        await saveCloudItem(it, false);
      }
    } catch (e) {
      console.error('Failed to sync loan return to Cloud SQL:', e);
    }
  };

  // Loan Rejection by Admin with Cloud SQL Sync
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
    showToast(`Peminjaman ${loanId} telah ditolak.`);

    try {
      await updateCloudLoan(loanId, {
        status: 'Ditolak',
        rejectionReason: reason,
      });
    } catch (e) {
      console.error('Failed to sync loan rejection to Cloud SQL:', e);
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
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            pendingLoansCount={pendingLoansCount}
            settings={settings}
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
              onOpenAdminAuth={() => setIsAdminModalOpen(true)}
            />
          )}

          {activeTab === 'reports' && (
            <MonthlyReportsView
              items={items}
              loans={loans}
              events={events}
              settings={settings}
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
      />

      {/* Settings & WhatsApp Group Link Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onDataReset={handleDataReset}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Vercel & Cloud SQL Bidirectional Sync Modal */}
      <VercelSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        settings={settings}
        items={items}
        loans={loans}
        events={events}
        onDataSynced={() => loadCloudData(false)}
        showToast={showToast}
      />
    </div>
  );
}
