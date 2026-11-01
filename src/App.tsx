import React, { useState, useEffect } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from './types';
import { 
  getStoredItems, saveStoredItems, 
  getStoredLoans, saveStoredLoans, 
  getStoredEvents, saveStoredEvents, 
  getStoredSettings, saveStoredSettings, 
  getAdminSession, setAdminSession 
} from './utils/storage';
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

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load stored data on mount
  useEffect(() => {
    setItems(getStoredItems());
    setLoans(getStoredLoans());
    setEvents(getStoredEvents());
    setSettings(getStoredSettings());
    setIsAdmin(getAdminSession());
  }, []);

  // Save changes to storage
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

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    showToast('Pengaturan lembaga berhasil diperbarui.');
  };

  const handleDataReset = () => {
    setItems(getStoredItems());
    setLoans(getStoredLoans());
    setEvents(getStoredEvents());
    setSettings(getStoredSettings());
    showToast('Data sistem telah dimuat ulang.');
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

  // Item Management (Admin)
  const handleSaveItem = (itemToSave: MediaItem) => {
    const existingIndex = items.findIndex((i) => i.id === itemToSave.id);
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
  };

  const handleDeleteItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (window.confirm(`Yakin ingin menghapus alat "${item?.name || id}" dari inventaris?`)) {
      const newItems = items.filter((i) => i.id !== id);
      handleUpdateItems(newItems);
      showToast('Alat telah dihapus dari inventaris.');
    }
  };

  // Event Management (Admin)
  const handleSaveEvent = (eventToSave: MediaEvent) => {
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
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (window.confirm(`Yakin ingin menghapus agenda "${event?.title || id}"?`)) {
      const newEvents = events.filter((e) => e.id !== id);
      handleUpdateEvents(newEvents);
      showToast('Agenda telah dihapus.');
    }
  };

  // Loan Request Submissions (Unit)
  const handleSubmitLoan = (newLoan: LoanRequest) => {
    const newLoans = [newLoan, ...loans];
    handleUpdateLoans(newLoans);
    showToast(`Pengajuan ${newLoan.id} dari ${newLoan.unitName} berhasil dibuat.`);
  };

  // Loan Approval by Admin
  const handleApproveLoan = (loanId: string, adminName: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    // Update loan status
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'Disetujui' as const,
          approvedAt: new Date().toISOString(),
          approvedBy: adminName,
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

    showToast(`Peminjaman ${loanId} telah disetujui.`);
  };

  // Loan Return by Admin
  const handleReturnLoan = (loanId: string, returnNotes: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    // Update loan status
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        return {
          ...l,
          status: 'Selesai' as const,
          returnedAt: new Date().toISOString(),
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
  };

  // Loan Rejection by Admin
  const handleRejectLoan = (loanId: string, reason: string) => {
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
  };

  // Quick borrow from inventory card
  const handleQuickBorrow = (item: MediaItem) => {
    setPreSelectedItemId(item.id);
    setActiveTab('loan-form');
  };

  const pendingLoansCount = loans.filter((l) => l.status === 'Menunggu Konfirmasi').length;

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onAdminLogout={handleAdminLogout}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          pendingLoansCount={pendingLoansCount}
          settings={settings}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
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

      {/* Footer (Clean, bright, modern, friendly) */}
      <footer className="mt-12 bg-white text-slate-500 py-6 shadow-2xs">
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
      />
    </div>
  );
}
