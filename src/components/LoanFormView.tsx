import React, { useState, useEffect, useMemo } from 'react';
import { MediaItem, LoanRequest, AppSettings, ItemCategory } from '../types';
import { 
  CheckSquare, Square, Send, Copy, Check, AlertCircle, 
  User, Phone, Building2, CheckCircle2, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { generateWhatsAppMessage, openWhatsAppDirect, copyToClipboard, formatDateIndo } from '../utils/whatsapp';

interface LoanFormViewProps {
  items: MediaItem[];
  settings: AppSettings;
  onSubmitLoan: (loan: LoanRequest) => void;
  preSelectedItemId?: string | null;
  onClearPreSelected?: () => void;
  onViewLoanStatus: () => void;
}

const COMMON_UNITS = ['Unit MTs', 'Unit MA', 'Unit MI', 'Kesantrian Putra', 'Kesantrian Putri', 'Panitia Acara'];

export const LoanFormView: React.FC<LoanFormViewProps> = ({
  items,
  settings,
  onSubmitLoan,
  preSelectedItemId,
  onClearPreSelected,
  onViewLoanStatus,
}) => {
  // Form fields
  const [unitName, setUnitName] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('17:00');
  const [purpose, setPurpose] = useState('');
  
  // Selected items ID set
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Checklist search & category filter
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | ItemCategory>('Semua');

  // Preview toggle for mobile
  const [showPreview, setShowPreview] = useState(false);

  // UI state for success modal
  const [submittedLoan, setSubmittedLoan] = useState<LoanRequest | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle preSelectedItemId
  useEffect(() => {
    if (preSelectedItemId) {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.add(preSelectedItemId);
        return next;
      });
      if (onClearPreSelected) onClearPreSelected();
    }
  }, [preSelectedItemId, onClearPreSelected]);

  // Toggle item selection
  const handleToggleItem = (item: MediaItem) => {
    if (item.status !== 'Tersedia') return;
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  // Filter items in checklist
  const filteredChecklistItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(itemSearch.toLowerCase()));
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [items, itemSearch, selectedCategory]);

  // Selected items array
  const selectedItemsData = useMemo(() => {
    return items
      .filter((i) => selectedItemIds.has(i.id))
      .map((i) => ({
        itemId: i.id,
        itemName: i.name,
        category: i.category,
      }));
  }, [items, selectedItemIds]);

  // Construct draft object for live preview
  const liveDraftRequest = useMemo<LoanRequest>(() => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return {
      id: `PJM-${todayStr}-${randomSuffix}`,
      unitName: unitName.trim() || '[Nama Unit]',
      borrowerName: borrowerName.trim() || '[Nama Penanggung Jawab]',
      borrowerPhone: borrowerPhone.trim() || '[Nomor WA]',
      items: selectedItemsData,
      startDate: startDate || new Date().toISOString().split('T')[0],
      startTime: startTime || '08:00',
      endDate: endDate || startDate || new Date().toISOString().split('T')[0],
      endTime: endTime || '17:00',
      purpose: purpose.trim() || '[Keperluan Kegiatan]',
      status: 'Menunggu Konfirmasi',
      createdAt: new Date().toISOString(),
      whatsappDraft: '',
    };
  }, [unitName, borrowerName, borrowerPhone, selectedItemsData, startDate, startTime, endDate, endTime, purpose]);

  const liveWhatsAppText = useMemo(() => {
    return generateWhatsAppMessage(liveDraftRequest, settings);
  }, [liveDraftRequest, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) {
      setErrorMessage('Mohon isi nama unit peminjam.');
      return;
    }
    if (!borrowerName.trim()) {
      setErrorMessage('Mohon cantumkan nama penanggung jawab.');
      return;
    }
    if (!borrowerPhone.trim()) {
      setErrorMessage('Mohon cantumkan nomor WhatsApp yang aktif.');
      return;
    }
    if (selectedItemIds.size === 0) {
      setErrorMessage('Pilih minimal 1 (satu) alat pada checklist.');
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage('Mohon tuliskan keperluan peminjaman.');
      return;
    }

    setErrorMessage('');

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `PJM-${todayStr}-${randomSuffix}`;

    const newLoan: LoanRequest = {
      ...liveDraftRequest,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    onSubmitLoan(newLoan);
    setSubmittedLoan(newLoan);
    openWhatsAppDirect(generateWhatsAppMessage(newLoan, settings), settings.mediaLeaderPhone);
  };

  const handleCopyDraft = async (textToCopy: string) => {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      
      {/* Compact Header Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-300 shrink-0" />
            <span>Formulir Peminjaman</span>
          </h1>
          <p className="text-emerald-100 text-xs mt-0.5">
            Pilih alat & kirim pengajuan ke WhatsApp Admin Media
          </p>
        </div>
        <button
          type="button"
          onClick={onViewLoanStatus}
          className="px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors shrink-0"
        >
          Status Pinjam →
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 rounded-2xl flex items-center gap-2 text-xs text-rose-800 font-bold shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Streamlined Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Card 1: Data Peminjam (Compact layout) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Identitas Peminjam & Jadwal
            </h3>
          </div>

          {/* Unit selection with quick preset chips */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700">
              Nama Unit / Lembaga <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitName(u)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                    unitName === u 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="Atau ketik nama unit lainnya..."
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Name & Phone in 2 compact columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama PJ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nama Penanggung Jawab"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nomor WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Schedule: Pinjam & Kembali compact side-by-side */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-50/80 p-2.5 rounded-xl space-y-1.5">
              <span className="block text-[10px] font-bold uppercase text-slate-500">Mulai Pinjam</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-white"
                />
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50/80 p-2.5 rounded-xl space-y-1.5">
              <span className="block text-[10px] font-bold uppercase text-slate-500">Selesai / Kembali</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-white"
                />
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* Keperluan Kegiatan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Keperluan / Agenda Acara <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Dokumentasi & Liputan Acara Haflah Khotmil Qur'an..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Card 2: Checklist Peralatan (Streamlined & Compact) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">
                2
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Pilih Alat Media
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-950 bg-amber-300 px-2.5 py-0.5 rounded-lg">
              {selectedItemIds.size} dipilih
            </span>
          </div>

          {/* Quick Filter: Search and Category chips */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama alat..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {(['Semua', 'Kamera', 'Lensa', 'Audio & Mic', 'Lighting', 'Stabilizer & Tripod', 'Drone & Stream'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Compact items list */}
          <div className="max-h-64 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-xl bg-slate-50/60 p-1">
            {filteredChecklistItems.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              const isAvailable = item.status === 'Tersedia';

              return (
                <div
                  key={item.id}
                  onClick={() => isAvailable && handleToggleItem(item)}
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors ${
                    !isAvailable
                      ? 'opacity-60 cursor-not-allowed bg-slate-100/50'
                      : isSelected
                      ? 'bg-emerald-100/80 cursor-pointer'
                      : 'hover:bg-white cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      disabled={!isAvailable}
                      className="text-emerald-600 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.category} · Kondisi: {item.condition}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isAvailable ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Tersedia
                      </span>
                    ) : item.status === 'Sedang Dipinjam' ? (
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                        Dipinjam
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        Servis
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Send Action (Prominent & Clean, No long fluff text) */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-emerald-100 block text-[10px]">Tujuan Permohonan:</span>
              <span className="font-bold text-white">WA Admin ({settings.mediaLeaderPhone || '081515509831'})</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyDraft(liveWhatsAppText)}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-1"
            >
              {copiedDraft ? (
                <>
                  <Check className="w-3 h-3 text-amber-300" />
                  <span>Format Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin Draf</span>
                </>
              )}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-950" />
            <span>KIRIM KE WHATSAPP ADMIN</span>
          </button>
        </div>

        {/* Collapsible WhatsApp Message Preview (Avoids mobile clutter) */}
        <div className="bg-white rounded-2xl p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1"
          >
            <span>Preview Draf Pesan WhatsApp</span>
            {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showPreview && (
            <div className="mt-2.5 bg-[#EFEAE2] p-2.5 rounded-xl">
              <div className="bg-white rounded-lg p-3 text-[11px] font-mono leading-relaxed text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {liveWhatsAppText}
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Confirmation Modal when successfully submitted */}
      {submittedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Permohonan Berhasil Terkirim!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ID: <span className="font-mono font-bold text-emerald-700">{submittedLoan.id}</span>
              </p>
              <p className="text-xs text-slate-600 mt-1.5">
                Draf permohonan telah dibuka di WhatsApp Admin ({settings.mediaLeaderPhone}).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Unit:</span>
                <span className="font-bold text-slate-900">{submittedLoan.unitName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="font-bold text-slate-900">{submittedLoan.items.length} alat</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jadwal:</span>
                <span className="font-bold text-slate-900">{formatDateIndo(submittedLoan.startDate)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  openWhatsAppDirect(generateWhatsAppMessage(submittedLoan, settings), settings.mediaLeaderPhone);
                }}
                className="w-full py-2.5 px-4 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Ulang ke WA Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmittedLoan(null);
                  onViewLoanStatus();
                }}
                className="w-full py-2 px-4 text-xs font-bold text-emerald-700 hover:underline text-center block"
              >
                Lihat Status Peminjaman →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
