import React, { useState, useEffect, useMemo } from 'react';
import { MediaEvent, EventCategory, MediaItem } from '../types';
import { X, Save, Calendar, Search, Check, Wrench, RotateCcw } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: MediaEvent) => void;
  initialEvent?: MediaEvent | null;
  items?: MediaItem[];
}

const CATEGORIES: EventCategory[] = [
  'Liputan Santri',
  'Live Streaming',
  'Kajian / Tabligh',
  'Produksi Konten',
  'Internal Pesantren',
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  items = [],
}) => {
  const [formData, setFormData] = useState<Partial<MediaEvent>>({
    id: '',
    title: '',
    category: 'Liputan Santri',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '12:00',
    location: 'Aula Utama Pesantren',
    crewAssigned: [],
    requiredGear: [],
    description: '',
  });

  const [crewInput, setCrewInput] = useState('');
  const [selectedGear, setSelectedGear] = useState<string[]>([]);
  const [gearSearch, setGearSearch] = useState('');
  const [gearCategory, setGearCategory] = useState<string>('Semua');

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setFormData(initialEvent);
      setCrewInput(initialEvent.crewAssigned?.join(', ') || '');
      setSelectedGear(Array.isArray(initialEvent.requiredGear) ? initialEvent.requiredGear : []);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        id: `EVT-${Date.now().toString().slice(-4)}`,
        title: '',
        category: 'Liputan Santri',
        startDate: today,
        startTime: '08:00',
        endDate: today,
        endTime: '12:00',
        location: "Masjid Jami' Pesantren",
        crewAssigned: [],
        requiredGear: [],
        description: '',
      });
      setCrewInput('');
      setSelectedGear([]);
    }
    setGearSearch('');
    setGearCategory('Semua');
  }, [initialEvent, isOpen]);

  // Daftar kategori unik dari inventaris tersimpan
  const availableCategories = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.category))).filter(Boolean);
    return ['Semua', ...unique];
  }, [items]);

  // Saring inventaris berdasarkan pencarian dan kategori
  const filteredItems = useMemo(() => {
    const query = gearSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = gearCategory === 'Semua' || item.category === gearCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [items, gearSearch, gearCategory]);

  // Item terpilih lama yang belum/tidak ada di katalog inventaris saat ini
  const inventoryNames = useMemo(() => new Set(items.map((item) => item.name)), [items]);
  const legacyGear = useMemo(
    () => selectedGear.filter((gearName) => !inventoryNames.has(gearName)),
    [selectedGear, inventoryNames]
  );

  if (!isOpen) return null;

  const toggleGearItem = (itemName: string) => {
    setSelectedGear((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const crewList = crewInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onSave({
      id: formData.id || `EVT-${Date.now().toString().slice(-4)}`,
      title: formData.title.trim(),
      category: formData.category || 'Liputan Santri',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      startTime: formData.startTime || '08:00',
      endDate: formData.endDate || formData.startDate || new Date().toISOString().split('T')[0],
      endTime: formData.endTime || '12:00',
      location: formData.location?.trim() || 'Pesantren',
      crewAssigned: crewList,
      requiredGear: selectedGear,
      description: formData.description?.trim(),
      relatedLoanId: formData.relatedLoanId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialEvent ? 'Edit Agenda Kegiatan Media' : 'Tambah Jadwal Liputan & Dokumentasi'}
              </h3>
              <p className="text-xs text-emerald-200">Kalender Operasional Tim Media Pondok</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Kegiatan / Acara Pesantren
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Wisuda Tahfidz 30 Juz & Khotmil Al-Qur'an"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Agenda
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi Pelaksanaan
              </label>
              <input
                type="text"
                placeholder="Aula Masjid Utama, Gedung MTs, Lapangan..."
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Mulai
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Selesai
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kru Media yang Ditugaskan (Pisahkan koma)
            </label>
            <input
              type="text"
              placeholder="Ust. Ahmad (Director), Ihsan (Kamera 1), Farhan (Audio)..."
              value={crewInput}
              onChange={(e) => setCrewInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Pemilih Alat Inventaris Tersimpan */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                <span>Alat yang Dibutuhkan dari Inventaris</span>
              </label>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-600 font-semibold tabular-nums">
                  {selectedGear.length} alat dipilih
                </span>
                {selectedGear.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGear([])}
                    className="text-rose-700 hover:text-rose-900 font-semibold underline-offset-2 hover:underline"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden">
              {/* Bilah Pencarian & Filter Kategori */}
              <div className="p-2.5 bg-white border-b border-slate-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={gearSearch}
                    onChange={(e) => setGearSearch(e.target.value)}
                    placeholder="Cari nama, merek, atau kode alat inventaris..."
                    className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                  {gearSearch && (
                    <button
                      type="button"
                      onClick={() => setGearSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Kategori Segmented Controls */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {availableCategories.map((cat) => {
                    const isActive = gearCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setGearCategory(cat)}
                        className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                          isActive
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daftar Centang Alat Inventaris */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-200/80 bg-white">
                {items.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-500">
                    Belum ada daftar alat yang tersimpan di inventaris media.
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-5 text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      Tidak ada alat yang cocok dengan pencarian atau kategori tersebut.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGearSearch('');
                        setGearCategory('Semua');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filter</span>
                    </button>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isChecked = selectedGear.includes(item.name);
                    const conditionTone =
                      item.condition === 'Baik'
                        ? 'text-emerald-700'
                        : item.condition === 'Perlu Servis'
                        ? 'text-amber-700'
                        : 'text-rose-700';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleGearItem(item.name)}
                        aria-pressed={isChecked}
                        className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                          isChecked ? 'bg-emerald-50/80 hover:bg-emerald-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                              {item.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            <span>{item.category}</span>
                            {item.brand && item.brand !== 'Universal' && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span>{item.brand}</span>
                              </>
                            )}
                            <span aria-hidden="true"> · </span>
                            <span className={`font-semibold ${conditionTone}`}>{item.condition}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{item.status}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Catatan jika ada nama alat dari agenda lama yang tidak ada di inventaris saat ini */}
              {legacyGear.length > 0 && (
                <div className="px-3 py-2 bg-amber-50/70 border-t border-amber-200/80 text-[11px] text-amber-950 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">Tercatat sebelumnya:</span>
                  {legacyGear.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleGearItem(name)}
                      title="Klik untuk menghapus dari daftar kebutuhan"
                      className="inline-flex items-center gap-1 font-medium text-amber-900 hover:text-rose-700 underline decoration-amber-400/70 underline-offset-2"
                    >
                      <span>{name}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Acara & Rundown Liputan
            </label>
            <textarea
              rows={2}
              placeholder="Catatan rundown, kebutuhan live streaming, atau angle kamera..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Agenda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
