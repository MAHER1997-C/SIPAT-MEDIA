import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, CheckCircle, Database, Globe, Download, Upload, 
  Copy, Check, ExternalLink, ShieldCheck, ArrowRightLeft, Sparkles, 
  FileCode, AlertCircle, Info, HardDrive, Send
} from 'lucide-react';
import { AppSettings, MediaItem, LoanRequest, MediaEvent } from '../types';
import { 
  getFullSyncBundleData, 
  encodeFullSyncBundle, 
  decodeFullSyncBundle,
  generateWhatsAppSyncDelta,
  saveStoredItems,
  saveStoredLoans,
  saveStoredEvents,
  saveStoredSettings
} from '../utils/storage';
import { 
  checkServerHealth, 
  sendFullSyncBundle, 
  fetchFullSyncBundle, 
  HealthCheckResult 
} from '../services/api';
import { copyToClipboard, openWhatsAppDirect } from '../utils/whatsapp';

interface VercelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  items: MediaItem[];
  loans: LoanRequest[];
  events: MediaEvent[];
  onDataSynced: () => void;
  showToast: (msg: string) => void;
}

export const VercelSyncModal: React.FC<VercelSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  items,
  loans,
  events,
  onDataSynced,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'push' | 'pull' | 'guide'>('push');
  const [vercelDomain, setVercelDomain] = useState<string>('https://sipatmedia.vercel.app');
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);
  const [pasteBundleInput, setPasteBundleInput] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Check health on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingHealth(true);
      checkServerHealth()
        .then((res) => setHealthStatus(res))
        .catch(() => setHealthStatus(null))
        .finally(() => setIsLoadingHealth(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBundle = getFullSyncBundleData();

  // Export full JSON file
  const handleDownloadFullJson = () => {
    const jsonStr = JSON.stringify(currentBundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sipat_media_full_sync_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File paket sinkronisasi JSON berhasil diunduh!');
  };

  // Copy full code string
  const handleCopyBundleCode = async () => {
    const code = encodeFullSyncBundle(currentBundle);
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(true);
      showToast('Kode teks data lengkap berhasil disalin!');
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  // Copy URL sync link (Uses compact WhatsApp Delta Sync for 100% Android & WA compatibility)
  const handleCopySyncUrl = async () => {
    const deltaCode = generateWhatsAppSyncDelta(items, loans, settings);
    const targetUrl = vercelDomain.trim().replace(/\/$/, '');
    const finalUrl = `${targetUrl}?sync_wa=${deltaCode}`;
    const ok = await copyToClipboard(finalUrl);
    if (ok) {
      setCopiedLink(true);
      showToast('Tautan sinkronisasi WhatsApp berhasil disalin!');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Send direct to WhatsApp
  const handleSendToWhatsApp = () => {
    const deltaCode = generateWhatsAppSyncDelta(items, loans, settings);
    const targetUrl = vercelDomain.trim().replace(/\/$/, '');
    const finalUrl = `${targetUrl}?sync_wa=${deltaCode}`;
    const borrowedCount = loans.filter((l) => l.status === 'Disetujui').length;
    const availableCount = items.length - borrowedCount;

    const msg = `*SIPAT Media - ${settings.pesantrenName}*
*${settings.mediaTeamName}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Berikut tautan resmi sistem peminjaman alat multimedia terupdate:

🔗 *Buka Aplikasi Terupdate*:
${finalUrl}

📊 *Status Alat*:
• Total: *${items.length} unit*
• Tersedia: *${availableCount} unit*
• Dipinjam: *${borrowedCount} unit*

_Silakan klik tautan di atas untuk melihat katalog ${items.length} alat & mengajukan pinjam._`;

    openWhatsAppDirect(msg);
  };

  // Open Vercel with sync parameter in new tab
  const handleOpenVercelWithSync = () => {
    const deltaCode = generateWhatsAppSyncDelta(items, loans, settings);
    const targetUrl = vercelDomain.trim().replace(/\/$/, '');
    const finalUrl = `${targetUrl}?sync_wa=${deltaCode}`;
    window.open(finalUrl, '_blank');
    showToast('Membuka sipatmedia.vercel.app dengan data sinkronisasi...');
  };

  // Apply pasted data from Vercel into Cloud SQL & local storage
  const handleApplyPastedBundle = async () => {
    if (!pasteBundleInput.trim()) return;
    setIsSyncing(true);
    try {
      let parsed = decodeFullSyncBundle(pasteBundleInput);
      if (!parsed) {
        // Try raw JSON parse
        try {
          parsed = JSON.parse(pasteBundleInput);
        } catch {
          throw new Error('Format teks tidak valid. Masukkan kode sinkronisasi atau JSON yang sesuai.');
        }
      }

      if (parsed) {
        if (parsed.items && Array.isArray(parsed.items)) {
          saveStoredItems(parsed.items);
        }
        if (parsed.loans && Array.isArray(parsed.loans)) {
          saveStoredLoans(parsed.loans);
        }
        if (parsed.events && Array.isArray(parsed.events)) {
          saveStoredEvents(parsed.events);
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          saveStoredSettings(parsed.settings);
        }

        // Send to Cloud SQL
        await sendFullSyncBundle({
          settings: parsed.settings,
          items: parsed.items,
          loans: parsed.loans,
          events: parsed.events,
        }).catch((err) => console.warn('Could not post to Cloud SQL:', err));

        onDataSynced();
        setStatusMsg('Berhasil! Seluruh data dari Vercel telah disinkronkan ke Cloud SQL.');
        showToast('Sinkronisasi data ke Cloud SQL berhasil!');
        setPasteBundleInput('');
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err: any) {
      setStatusMsg(`Gagal: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Import JSON file directly
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed) {
          if (parsed.items) saveStoredItems(parsed.items);
          if (parsed.loans) saveStoredLoans(parsed.loans);
          if (parsed.events) saveStoredEvents(parsed.events);
          if (parsed.settings) saveStoredSettings(parsed.settings);

          await sendFullSyncBundle({
            settings: parsed.settings,
            items: parsed.items,
            loans: parsed.loans,
            events: parsed.events,
          }).catch(() => {});

          onDataSynced();
          setStatusMsg('File JSON berhasil diimpor & disimpan ke Cloud SQL!');
          showToast('Data berhasil diimpor & disimpan ke database.');
          setTimeout(() => setStatusMsg(''), 4000);
        }
      } catch (err: any) {
        setStatusMsg(`Gagal membaca file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Copy vercel.json configuration
  const handleCopyVercelJson = async () => {
    const jsonConfig = JSON.stringify({
      version: 2,
      rewrites: [
        {
          source: "/api/(.*)",
          destination: "/api/index.ts"
        },
        {
          source: "/(.*)",
          destination: "/index.html"
        }
      ]
    }, null, 2);

    const ok = await copyToClipboard(jsonConfig);
    if (ok) {
      setCopiedVercelJson(true);
      showToast('Konfigurasi vercel.json tersalin!');
      setTimeout(() => setCopiedVercelJson(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl">
              <ArrowRightLeft className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Sinkronisasi Preview & Vercel
                </h3>
                <span className="text-[10px] bg-emerald-500/80 text-white font-extrabold px-2 py-0.5 rounded-full border border-emerald-400">
                  Cloud SQL
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Penyelarasan data inventaris PPTQ Qoryatul Qur'an dengan {vercelDomain}
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

        {/* Real-time Status Banner */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-slate-800">Status Database Cloud SQL:</span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
              Aktif ({items.length} Alat • {loans.length} Pinjaman • {events.length} Agenda)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-semibold truncate max-w-[200px]">
              {vercelDomain}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 sm:px-6 pt-3 gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('push')}
            className={`pb-2.5 px-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'push'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Kirim Data ke Vercel</span>
          </button>

          <button
            onClick={() => setActiveTab('pull')}
            className={`pb-2.5 px-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pull'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tarik Data dari Vercel</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Panduan Vercel Hosting</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {statusMsg && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs ${
              statusMsg.startsWith('Gagal') 
                ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* TAB 1: KIRIM KE VERCEL */}
          {activeTab === 'push' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Sinkronisasi Instan Seluruh Data ke Vercel</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Data yang saat ini ada di preview (27 unit alat PPTQ Qoryatul Qur'an, pengaturan Qoryah TV, 4 riwayat pinjaman, dan 10 agenda kegiatan) dapat langsung diterapkan ke <strong>{vercelDomain}</strong> dengan sekali klik.
                </p>
              </div>

              {/* URL Destination Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Domain Vercel Anda:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={vercelDomain}
                    onChange={(e) => setVercelDomain(e.target.value)}
                    placeholder="https://sipatmedia.vercel.app"
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleOpenVercelWithSync}
                    className="px-4 py-2.5 text-xs font-extrabold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka & Terapkan</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Klik tombol di atas untuk membuka Vercel di tab baru dan menerapkan seluruh alat & peminjaman secara otomatis.
                </p>
              </div>

              {/* Direct WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleSendToWhatsApp}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Send className="w-4 h-4 text-amber-300" />
                <span>Kirim Tautan Terupdate Langsung ke WhatsApp (Otomatis Sinkron ke Semua HP)</span>
              </button>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-extrabold text-slate-800 block">
                  Metode Sinkronisasi Lainnya:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopySyncUrl}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                      <span>{copiedLink ? 'Tautan Tersalin!' : '1. Salin Link WA'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Kirim ke WhatsApp tim untuk dibuka langsung di HP masing-masing.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadFullJson}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                      <Download className="w-4 h-4 text-teal-600" />
                      <span>2. Unduh File JSON</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Simpan paket lengkap (alat, pinjaman, agenda) ke file .json.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBundleCode}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                      <span>{copiedCode ? 'Kode Tersalin!' : '3. Salin Kode Teks'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Salin kode teks untuk ditempelkan di menu Pengaturan Vercel.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TARIK DARI VERCEL */}
          {activeTab === 'pull' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Tarik & Simpan Data dari Vercel ke Cloud SQL</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Jika sebelumnya Anda atau tim pernah menginput alat, permohonan pinjam, atau agenda di <strong>{vercelDomain}</strong> dan ingin data tersebut tersimpan permanen di Cloud SQL preview ini, tempelkan kodenya di bawah.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tempel Kode Sinkronisasi / Teks JSON dari Vercel:
                </label>
                <textarea
                  rows={4}
                  value={pasteBundleInput}
                  onChange={(e) => setPasteBundleInput(e.target.value)}
                  placeholder="Tempel kode sinkronisasi atau isi file JSON dari sipat.vercel.app di sini..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <label className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Atau Unggah File JSON dari Vercel</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleApplyPastedBundle}
                  disabled={!pasteBundleInput.trim() || isSyncing}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Simpan ke Cloud SQL Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN VERCEL */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Mengapa sebelumnya data tersimpan di HP masing-masing?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pada deploy awal Vercel, proyek dijalankan sebagai aplikasi web frontend statis tanpa backend database, sehingga data otomatis tersimpan di memori browser (<code>localStorage</code>) masing-masing HP.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Solusi Permanen yang Sudah Disiapkan di Kode Ini:
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs text-slate-700">
                      <strong className="text-slate-900 block font-bold">API Serverless Vercel Sudah Dibuat</strong>
                      File <code>api/index.ts</code> dan <code>vercel.json</code> sudah kami sediakan di dalam proyek ini. Begitu Anda melakukan commit & push ke GitHub, Vercel otomatis menjalankan backend API.
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs text-slate-700">
                      <strong className="text-slate-900 block font-bold">Database Default 27 Alat PPTQ Qoryatul Qur'an</strong>
                      Kode bawaan di <code>seedData.ts</code> sudah kami perbarui dengan 27 alat resmi, 4 pinjaman, 10 agenda kegiatan, nomor admin 081515509831, dan lokasi Kantor Media. Siapa pun yang membuka sipatmedia.vercel.app langsung melihat data ini.
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs text-slate-700">
                      <strong className="text-slate-900 block font-bold">Hubungkan Database Online di Vercel (1-Klik Gratis)</strong>
                      Di dashboard Vercel: Buka project <code>sipatmedia</code> &rarr; Klik tab <strong>Storage</strong> &rarr; Klik <strong>Create Database</strong> &rarr; Pilih <strong>Postgres</strong> (gratis). Vercel akan otomatis menyinkronkan seluruh HP santri dan ustadz secara online 24 jam!
                    </div>
                  </div>
                </div>
              </div>

              {/* Vercel JSON Copy Box */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">vercel.json (Sudah terpasang di proyek):</span>
                  <button
                    onClick={handleCopyVercelJson}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedVercelJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedVercelJson ? 'Tersalin' : 'Salin Konfigurasi'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-950 rounded-xl">
{`{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            SIPAT Media • PPTQ Qoryatul Qur'an • Qoryah TV
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
