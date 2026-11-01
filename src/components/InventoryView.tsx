import React, { useState, useMemo } from 'react';
import { MediaItem, ItemCategory, ItemStatus, ItemCondition } from '../types';
import { 
  Search, Plus, LayoutGrid, List, Clock, AlertTriangle, 
  Edit3, Trash2, ArrowUpRight, CheckCircle2, Sparkles, Camera
} from 'lucide-react';

interface InventoryViewProps {
  items: MediaItem[];
  isAdmin: boolean;
  onAddItem: () => void;
  onEditItem: (item: MediaItem) => void;
  onDeleteItem: (id: string) => void;
  onQuickBorrow: (item: MediaItem) => void;
  onUpdateItemStatus?: (id: string, status: ItemStatus) => void;
}

const CATEGORIES: ('Semua' | ItemCategory)[] = [
  'Semua',
  'Kamera',
  'Lensa',
  'Audio & Mic',
  'Lighting',
  'Stabilizer & Tripod',
  'Drone & Stream',
  'Aksesoris & Kabel',
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  isAdmin,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onQuickBorrow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | ItemCategory>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<'Semua' | ItemStatus>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, searchQuery, selectedCategory, selectedStatus]);

  // Metric counts
  const totalCount = items.length;
  const availableCount = items.filter((i) => i.status === 'Tersedia').length;
  const borrowedCount = items.filter((i) => i.status === 'Sedang Dipinjam').length;
  const maintenanceCount = items.filter((i) => i.status === 'Dalam Perawatan').length;

  const getCategoryBadge = (cat: ItemCategory) => {
    switch (cat) {
      case 'Kamera':
        return 'bg-blue-100 text-blue-800';
      case 'Lensa':
        return 'bg-teal-100 text-teal-800';
      case 'Audio & Mic':
        return 'bg-violet-100 text-violet-800';
      case 'Lighting':
        return 'bg-amber-100 text-amber-800';
      case 'Stabilizer & Tripod':
        return 'bg-sky-100 text-sky-800';
      case 'Drone & Stream':
        return 'bg-emerald-100 text-emerald-800';
      case 'Aksesoris & Kabel':
        return 'bg-slate-200 text-slate-800';
      default:
        return 'bg-slate-200 text-slate-800';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Fresh, Bright Hero Card */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
        {/* Soft light decorative orbs */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-60 h-60 bg-teal-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full mb-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Inventaris Media Pondok Pesantren</span>
            </div>
            <h1 className="text-base sm:text-2xl font-extrabold text-white tracking-tight">
              Katalog Alat Tim Media
            </h1>
          </div>

          {isAdmin && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Alat</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KOTAK STATUS DIPERKECIL & KOMPAK (1 baris 4 kolom padat) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
        {/* Kotak Total */}
        <div 
          onClick={() => setSelectedStatus('Semua')}
          className={`bg-blue-100 hover:bg-blue-200/90 text-blue-950 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${selectedStatus === 'Semua' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] sm:text-[11px] font-bold text-blue-800 uppercase tracking-wider truncate">Total</span>
            <div className="hidden sm:flex w-5 h-5 rounded-md bg-blue-200 items-center justify-center text-blue-800">
              <Camera className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-xl font-black font-mono text-blue-950 tabular-nums">{totalCount}</span>
            <span className="text-[9px] sm:text-xs font-semibold text-blue-800 hidden sm:inline">unit</span>
          </div>
        </div>

        {/* Kotak Siap Pakai */}
        <div 
          onClick={() => setSelectedStatus('Tersedia')}
          className={`bg-emerald-100 hover:bg-emerald-200/90 text-emerald-950 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${selectedStatus === 'Tersedia' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate">Tersedia</span>
            <div className="hidden sm:flex w-5 h-5 rounded-md bg-emerald-200 items-center justify-center text-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-xl font-black font-mono text-emerald-950 tabular-nums">{availableCount}</span>
            <span className="text-[9px] sm:text-xs font-semibold text-emerald-800 hidden sm:inline">unit</span>
          </div>
        </div>

        {/* Kotak Sedang Dipinjam */}
        <div 
          onClick={() => setSelectedStatus('Sedang Dipinjam')}
          className={`bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${selectedStatus === 'Sedang Dipinjam' ? 'ring-2 ring-amber-600' : ''}`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] sm:text-[11px] font-black text-amber-950 uppercase tracking-wider truncate">Dipinjam</span>
            <div className="hidden sm:flex w-5 h-5 rounded-md bg-amber-300 items-center justify-center text-amber-950">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-xl font-black font-mono text-amber-950 tabular-nums">{borrowedCount}</span>
            <span className="text-[9px] sm:text-xs font-bold text-amber-900 hidden sm:inline">unit</span>
          </div>
        </div>

        {/* Kotak Perlu Service */}
        <div 
          onClick={() => setSelectedStatus('Dalam Perawatan')}
          className={`bg-rose-200 hover:bg-rose-300 text-rose-950 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${selectedStatus === 'Dalam Perawatan' ? 'ring-2 ring-rose-600' : ''}`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] sm:text-[11px] font-black text-rose-950 uppercase tracking-wider truncate">Servis</span>
            <div className="hidden sm:flex w-5 h-5 rounded-md bg-rose-300 items-center justify-center text-rose-950">
              <AlertTriangle className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-xl font-black font-mono text-rose-950 tabular-nums">{maintenanceCount}</span>
            <span className="text-[9px] sm:text-xs font-bold text-rose-900 hidden sm:inline">unit</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama alat atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 sm:py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Grid / Table View Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Tampilan Kartu"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Horizontal Filter without harsh borders */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 border-t border-slate-100">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: BORDERLESS DENSE CARDS to fit many items in 1 screen */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada alat yang cocok</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Silakan sesuaikan kata kunci pencarian atau pilih filter kategori lainnya.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
          {filteredItems.map((item) => {
            const isBorrowed = item.status === 'Sedang Dipinjam';
            const isMaintenance = item.status === 'Dalam Perawatan';
            const isAvailable = item.status === 'Tersedia';

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-2.5 sm:p-3 transition-all flex flex-col justify-between ${
                  isBorrowed
                    ? 'bg-amber-100 hover:bg-amber-200/90 text-amber-950 shadow-2xs'
                    : isMaintenance
                    ? 'bg-rose-100 hover:bg-rose-200/90 text-rose-950 shadow-2xs'
                    : 'bg-white hover:bg-emerald-50/40 text-slate-900 shadow-2xs'
                }`}
              >
                <div>
                  {/* Top Bar: Category badge & Status indicator */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider truncate max-w-[65%] ${
                      isBorrowed 
                        ? 'bg-amber-300 text-amber-950 font-black' 
                        : isMaintenance 
                        ? 'bg-rose-300 text-rose-950 font-black' 
                        : getCategoryBadge(item.category)
                    }`}>
                      {item.category}
                    </span>

                    {isAvailable && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Tersedia
                      </span>
                    )}
                    {isBorrowed && (
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-950 bg-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5 text-amber-950" />
                        Dipinjam
                      </span>
                    )}
                    {isMaintenance && (
                      <span className="text-[9px] sm:text-[10px] font-black text-rose-950 bg-rose-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-950" />
                        Servis
                      </span>
                    )}
                  </div>

                  {/* 1. Nama Alat (2 baris maksimal) */}
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 min-h-[2rem]">
                    {item.name}
                  </h3>

                  {/* 2. Kondisi Alat & Catatan Ringkas */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <span className={`font-bold px-1.5 py-0.2 rounded ${
                      item.condition === 'Baik' 
                        ? 'text-emerald-800 bg-emerald-100' 
                        : item.condition === 'Perlu Servis'
                        ? 'text-amber-950 bg-amber-300 font-bold'
                        : 'text-rose-950 bg-rose-300 font-bold'
                    }`}>
                      {item.condition}
                    </span>
                    {item.notes && (
                      <span className="truncate text-slate-500 text-[10px]" title={item.notes}>
                        · {item.notes}
                      </span>
                    )}
                  </div>

                  {/* Info Peminjam jika sedang dipinjam */}
                  {isBorrowed && item.currentBorrower && (
                    <div className="mt-1.5 p-1.5 bg-amber-200/90 rounded-lg text-[10px] text-amber-950 leading-tight">
                      <div className="font-black truncate">{item.currentBorrower.unitName}</div>
                      <div className="text-[9px] text-amber-900 truncate">
                        PJ: {item.currentBorrower.borrowerName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between gap-1">
                  {isAdmin ? (
                    <div className="flex items-center gap-1 w-full">
                      <button
                        onClick={() => onEditItem(item)}
                        className="flex-1 py-1 px-1.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-md transition-all shadow-2xs flex items-center justify-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="py-1 px-1.5 text-[10px] font-bold text-rose-600 bg-white hover:bg-rose-50 rounded-md transition-all shadow-2xs"
                        title="Hapus Alat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {isAvailable && (
                        <button
                          onClick={() => onQuickBorrow(item)}
                          className="py-1 px-2 text-[10px] font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-md transition-all flex items-center gap-0.5 shrink-0 shadow-2xs"
                        >
                          <span>Pinjam</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full">
                      {isAvailable ? (
                        <button
                          onClick={() => onQuickBorrow(item)}
                          className="w-full py-1.5 px-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <span>Pinjam</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : isBorrowed ? (
                        <div className="text-center py-1 text-[10px] text-amber-950 font-bold bg-amber-200 rounded-md">
                          Dipakai Unit
                        </div>
                      ) : (
                        <div className="text-center py-1 text-[10px] text-rose-950 font-bold bg-rose-200 rounded-md">
                          Perawatan
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Borderless, soft row colors) */
        <div className="bg-white rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-4">Nama Alat</th>
                  <th className="py-4 px-4">Kategori</th>
                  <th className="py-4 px-4">Kondisi</th>
                  <th className="py-4 px-4">Catatan</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`transition-colors ${
                      item.status === 'Sedang Dipinjam' ? 'bg-amber-50/50 hover:bg-amber-50' :
                      item.status === 'Dalam Perawatan' ? 'bg-rose-50/50 hover:bg-rose-50' :
                      'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{item.name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${getCategoryBadge(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${
                        item.condition === 'Baik' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'Tersedia' && (
                        <span className="text-emerald-700 font-bold">Tersedia</span>
                      )}
                      {item.status === 'Sedang Dipinjam' && (
                        <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-lg">
                          Dipinjam ({item.currentBorrower?.unitName || 'Unit'})
                        </span>
                      )}
                      {item.status === 'Dalam Perawatan' && (
                        <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-lg">
                          Perawatan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEditItem(item)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {item.status === 'Tersedia' ? (
                          <button
                            onClick={() => onQuickBorrow(item)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Pinjam
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tidak tersedia</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
