import React, { useState } from 'react';
import { AppSettings } from '../types';
import { 
  X, Save, Settings, Download, Upload, RefreshCw, KeyRound, 
  MessageSquare, CheckCircle, Camera, Video, Radio, Landmark, 
  Film, Tv, Sparkles, Image as ImageIcon, Trash2,
  Link, Copy, Check, Share2
} from 'lucide-react';
import { 
  exportBackupData, importBackupData, resetToSeedData,
  encodeSettingsToCode, decodeSettingsFromCode 
} from '../utils/storage';
import { copyToClipboard } from '../utils/whatsapp';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onDataReset: () => void;
}

const PRESET_ICONS = [
  { id: 'camera', label: 'Kamera', icon: Camera },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'radio', label: 'Siaran', icon: Radio },
  { id: 'mosque', label: 'Pesantren', icon: Landmark },
  { id: 'film', label: 'Dokumenter', icon: Film },
  { id: 'tv', label: 'Layar TV', icon: Tv },
  { id: 'sparkles', label: 'Kreatif', icon: Sparkles },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onDataReset,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [successMsg, setSuccessMsg] = useState('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [pasteCodeInput, setPasteCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleCopySyncLink = async () => {
    const code = encodeSettingsToCode(formData);
    const syncUrl = `${window.location.origin}${window.location.pathname}?sync_settings=${code}`;
    const ok = await copyToClipboard(syncUrl);
    if (ok) {
      setCopiedLink(true);
      setSuccessMsg('Tautan sinkronisasi disalin! Buka tautan ini di Laptop/HP lain untuk menerapkan pengaturan.');
      setTimeout(() => setCopiedLink(false), 3000);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleCopySyncCode = async () => {
    const code = encodeSettingsToCode(formData);
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(true);
      setSuccessMsg('Kode teks pengaturan berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedCode(false), 3000);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleApplyPasteCode = () => {
    if (!pasteCodeInput.trim()) return;
    const decoded = decodeSettingsFromCode(pasteCodeInput);
    if (decoded) {
      setFormData(decoded);
      onSaveSettings(decoded);
      setPasteCodeInput('');
      setSuccessMsg(`Berhasil! Pengaturan lembaga "${decoded.pesantrenName}" berhasil diterapkan.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } else {
      setImportStatus('Kode tidak valid atau format salah.');
      setTimeout(() => setImportStatus(''), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSuccessMsg('Pengaturan lembaga & tampilan berhasil disimpan!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sipat_media_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('File backup JSON berhasil diunduh!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupData(content);
      if (success) {
        setImportStatus('Data berhasil diimpor!');
        onDataReset();
        setTimeout(() => setImportStatus(''), 2500);
      } else {
        setImportStatus('Gagal membaca file JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert uploaded image to base64 data url
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoType: 'custom_url',
        logoCustomUrl: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetSeed = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke data contoh bawaan?')) {
      resetToSeedData();
      onDataReset();
      setSuccessMsg('Data telah direset ke data contoh.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Fresh, Bright Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Pengaturan Lembaga & Tampilan
              </h3>
              <p className="text-xs text-emerald-100">
                Ubah judul atas aplikasi, logo, nama pondok pesantren, dan integrasi WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: IDENTITAS APLIKASI & PONDOK PESANTREN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                1. Judul Header & Identitas Lembaga
              </h4>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                Dapat Diubah Kapan Saja
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Judul Aplikasi (Header Atas)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SIPAT Media"
                  value={formData.appTitle || ''}
                  onChange={(e) => setFormData({ ...formData, appTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Judul yang tampil besar di bilah navigasi atas aplikasi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Pondok Pesantren
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pondok Pesantren Darul Hikmah"
                  value={formData.pesantrenName}
                  onChange={(e) => setFormData({ ...formData, pesantrenName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama pesantren resmi yang tampil di bawah judul dan di laporan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Biro / Tim Media Pesantren
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Biro Media & Dokumentasi"
                  value={formData.mediaTeamName}
                  onChange={(e) => setFormData({ ...formData, mediaTeamName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Lokasi Standar Pengambilan Alat</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Studio Biro Media & Dokumentasi"
                  value={formData.defaultPickupLocation || ''}
                  onChange={(e) => setFormData({ ...formData, defaultPickupLocation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis disarankan saat admin konfirmasi peminjaman.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: PENGATURAN LOGO APLIKASI */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                2. Pengaturan Logo Aplikasi
              </h4>
              <p className="text-[11px] text-slate-500">Pilih icon preset atau unggah gambar logo pesantren Anda sendiri</p>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs overflow-hidden">
                  {formData.logoType === 'custom_url' && formData.logoCustomUrl ? (
                    <img
                      src={formData.logoCustomUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (() => {
                      const selected = PRESET_ICONS.find((p) => p.id === (formData.logoPreset || 'camera'));
                      const IconComp = selected ? selected.icon : Camera;
                      return <IconComp className="w-6 h-6 text-white" />;
                    })()
                  )}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {formData.appTitle || 'SIPAT Media'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formData.pesantrenName}
                  </span>
                </div>
              </div>

              {formData.logoType === 'custom_url' && formData.logoCustomUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoType: 'preset', logoCustomUrl: '' })}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Gambar Logo</span>
                </button>
              )}
            </div>

            {/* Logo Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoType: 'preset' })}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    formData.logoType !== 'custom_url'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pilihan Icon Preset
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoType: 'custom_url' })}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    formData.logoType === 'custom_url'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Unggah Gambar / Link Logo</span>
                </button>
              </div>

              {/* Option A: Preset Icons Grid */}
              {formData.logoType !== 'custom_url' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {PRESET_ICONS.map((preset) => {
                    const IconComp = preset.icon;
                    const isSelected = (formData.logoPreset || 'camera') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, logoPreset: preset.id, logoType: 'preset' })}
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-950 ring-2 ring-emerald-600 font-extrabold shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Option B: Custom Image Upload / URL */
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unggah File Logo dari Komputer / HP
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Format PNG, JPG, atau SVG (direkomendasikan rasio 1:1 persegi transparan).
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Atau Tempel URL Gambar Logo
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo-pesantren.png"
                      value={formData.logoCustomUrl || ''}
                      onChange={(e) => setFormData({ ...formData, logoType: 'custom_url', logoCustomUrl: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: INTEGRASI WHATSAPP */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>3. Integrasi Grup WhatsApp Media</span>
              </h4>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tautan Undangan Grup WhatsApp Tim Media
                </label>
                <input
                  type="text"
                  placeholder="https://chat.whatsapp.com/XXXXX..."
                  value={formData.whatsappGroupLink}
                  onChange={(e) => setFormData({ ...formData, whatsappGroupLink: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-2xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Peminjam unit yang klik "Gabung / Kirim ke Grup" akan langsung diarahkan ke grup ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  No. WhatsApp Koordinator / Admin Media (Awali 62 atau 08)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formData.mediaLeaderPhone}
                  onChange={(e) => setFormData({ ...formData, mediaLeaderPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: PIN SANDI ADMIN & BACKUP */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                4. Keamanan Admin & Pencadangan Data
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ganti PIN Sandi Admin
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.adminPin}
                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">PIN untuk masuk mode Admin (bawaan: 1234).</p>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleResetSeed}
                  className="w-full px-3 py-2.5 text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-800" />
                  <span>Reset ke Data Contoh Bawaan</span>
                </button>
              </div>
            </div>

            {/* Quick Cross-Device Settings Sync Card */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-700" />
                  <span>Sinkronisasi Pengaturan ke Laptop / HP Lain</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                  1-Klik Cepat
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Salin tautan atau kode di bawah ini dari HP yang sudah Anda atur, lalu buka di Laptop atau kirim via WhatsApp ke perangkat lain untuk langsung menyinkronkan nama pesantren, logo, lokasi, dan nomor kontak seketika.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopySyncLink}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tautan Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-3.5 h-3.5" />
                      <span>Salin Tautan Sinkronisasi</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySyncCode}
                  className="px-3 py-2 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 border border-emerald-200"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kode Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Salin Kode Teks</span>
                    </>
                  )}
                </button>
              </div>

              {/* Paste code input */}
              <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Atau tempel kode sinkronisasi dari HP lain di sini..."
                  value={pasteCodeInput}
                  onChange={(e) => setPasteCodeInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-emerald-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleApplyPasteCode}
                  disabled={!pasteCodeInput.trim()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all shadow-2xs shrink-0"
                >
                  Terapkan
                </button>
              </div>
            </div>

            {/* Backup & Restore Action Buttons */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Cadangkan & Pulihkan Seluruh Data Sistem
              </span>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Unduh File Backup JSON</span>
                </button>

                <label className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Impor File Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
              {importStatus && (
                <p className="text-xs text-emerald-700 font-bold mt-1.5">{importStatus}</p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-2xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4 text-emerald-950" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
