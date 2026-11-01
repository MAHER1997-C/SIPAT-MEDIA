import React, { useState, useEffect } from 'react';
import { MediaEvent, EventCategory } from '../types';
import { X, Save, Calendar, Clock, MapPin, Users, Wrench } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: MediaEvent) => void;
  initialEvent?: MediaEvent | null;
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
  const [gearInput, setGearInput] = useState('');

  useEffect(() => {
    if (initialEvent) {
      setFormData(initialEvent);
      setCrewInput(initialEvent.crewAssigned?.join(', ') || '');
      setGearInput(initialEvent.requiredGear?.join(', ') || '');
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
        location: 'Masjid Jami\' Pesantren',
        crewAssigned: [],
        requiredGear: [],
        description: '',
      });
      setCrewInput('');
      setGearInput('');
    }
  }, [initialEvent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const crewList = crewInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const gearList = gearInput
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
      requiredGear: gearList,
      description: formData.description?.trim(),
      relatedLoanId: formData.relatedLoanId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
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
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 bg-white"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
                className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
                className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alat Utama yang Dipesan / Dibutuhkan (Pisahkan koma)
            </label>
            <input
              type="text"
              placeholder="Sony FX30, DJI RS3 Pro, DJI Mic 2, ATEM Mini..."
              value={gearInput}
              onChange={(e) => setGearInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
            />
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
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
