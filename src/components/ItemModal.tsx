import React, { useState, useEffect } from 'react';
import { MediaItem, ItemCategory, ItemCondition, ItemStatus } from '../types';
import { X, Save, Camera } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MediaItem) => void;
  initialItem?: MediaItem | null;
}

const CATEGORIES: ItemCategory[] = [
  'Kamera',
  'Lensa',
  'Audio & Mic',
  'Lighting',
  'Stabilizer & Tripod',
  'Drone & Stream',
  'Aksesoris & Kabel',
];

const CONDITIONS: ItemCondition[] = ['Baik', 'Perlu Servis', 'Rusak'];
const STATUSES: ItemStatus[] = ['Tersedia', 'Sedang Dipinjam', 'Dalam Perawatan'];

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    name: '',
    category: 'Kamera',
    condition: 'Baik',
    status: 'Tersedia',
    notes: '',
  });

  useEffect(() => {
    if (initialItem) {
      setFormData(initialItem);
    } else {
      setFormData({
        name: '',
        category: 'Kamera',
        condition: 'Baik',
        status: 'Tersedia',
        notes: '',
      });
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    onSave({
      id: initialItem?.id || `ALAT-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      category: formData.category || 'Kamera',
      brand: initialItem?.brand || 'Umum',
      model: initialItem?.model || '-',
      serialNumber: initialItem?.serialNumber || '-',
      condition: formData.condition || 'Baik',
      status: formData.status || 'Tersedia',
      location: initialItem?.location || 'Kantor Media',
      notes: formData.notes?.trim() || '',
      currentBorrower: initialItem?.currentBorrower,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-teal-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <Camera className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialItem ? 'Edit Alat Media' : 'Tambah Alat Media Baru'}
              </h3>
              <p className="text-xs text-emerald-200">Inventaris Biro Media Pesantren</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simplified Form Body: Hanya Nama, Kategori, Kondisi, Catatan, Status */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Alat <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kamera Sony FX30, Tripod Libec, Mic Boya..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-slate-50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kategori Alat
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
              className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kondisi Alat
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Ketersediaan
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan Alat
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Lengkap dengan charger. Wajib kembalikan sebelum Maghrib..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 bg-slate-50 leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-extrabold text-emerald-950 bg-amber-400 hover:bg-amber-300 border border-amber-300 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Alat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
