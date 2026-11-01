import React from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from '../types';
import { 
  Camera, Calendar, PackagePlus, FileText, BarChart3, 
  Clock, CheckCircle2, AlertTriangle, ArrowRight, 
  Send, Shield, Sparkles 
} from 'lucide-react';

interface DashboardHomeViewProps {
  items: MediaItem[];
  loans: LoanRequest[];
  events: MediaEvent[];
  settings: AppSettings;
  isAdmin: boolean;
  onNavigate: (tab: 'inventory' | 'calendar' | 'loan-form' | 'loans-management' | 'reports') => void;
  onOpenAdminModal: () => void;
  onOpenSettings: () => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  items,
  loans,
  events,
  settings,
  isAdmin,
  onNavigate,
  onOpenAdminModal,
  onOpenSettings,
}) => {
  // Counts
  const totalCount = items.length;
  const availableCount = items.filter((i) => i.status === 'Tersedia').length;
  const borrowedCount = items.filter((i) => i.status === 'Sedang Dipinjam').length;
  const maintenanceCount = items.filter((i) => i.status === 'Dalam Perawatan').length;

  const pendingLoans = loans.filter((l) => l.status === 'Menunggu Konfirmasi');

  return (
    <div className="space-y-3 sm:space-y-4">
      
      {/* 1. COMPACT WELCOME BANNER (Fits completely above fold on mobile) */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Portal Tim Media</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {settings.appTitle || 'SIPAT Media'}
              </h1>
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-100 bg-white/15 px-2 py-0.5 rounded-md">
                (Sistem Informasi Peminjaman Alat dan Tim)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100 font-medium truncate">
              {settings.pesantrenName}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('loan-form')}
              className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl sm:rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
            >
              <PackagePlus className="w-3.5 h-3.5 text-emerald-950" />
              <span>Pinjam Alat</span>
            </button>

            {settings.whatsappGroupLink && (
              <a
                href={settings.whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded-xl sm:rounded-2xl transition-all flex items-center gap-1"
                title="Grup WhatsApp Tim Media"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="text-[11px]">Grup</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. RINGKASAN STATUS INVENTARIS DENGAN WARNA TEBAL & KONTRAS (Single compact strip) */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
            Status Inventaris
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">Klik untuk lihat katalog</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          
          {/* Total Alat - Biru Terang */}
          <div 
            onClick={() => onNavigate('inventory')}
            className="bg-blue-100 hover:bg-blue-200/90 text-blue-950 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Total Alat</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-blue-950 tabular-nums">{totalCount}</span>
                <span className="text-[10px] font-bold text-blue-800">unit</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-200 flex items-center justify-center text-blue-800 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          {/* Siap Pakai - Hijau Segar */}
          <div 
            onClick={() => onNavigate('inventory')}
            className="bg-emerald-100 hover:bg-emerald-200/90 text-emerald-950 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Tersedia</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-950 tabular-nums">{availableCount}</span>
                <span className="text-[10px] font-bold text-emerald-800">unit</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Sedang Dipinjam - KUNING TEBAL MENCILOK */}
          <div 
            onClick={() => onNavigate('inventory')}
            className="bg-amber-300 hover:bg-amber-400 text-amber-950 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="text-[10px] sm:text-[11px] font-black text-amber-950 uppercase tracking-wider block">Dipinjam</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-950 tabular-nums">{borrowedCount}</span>
                <span className="text-[10px] font-black text-amber-900">unit</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-400/90 flex items-center justify-center text-amber-950 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Perlu Service - MERAH TEBAL MENCILOK */}
          <div 
            onClick={() => onNavigate('inventory')}
            className="bg-rose-200 hover:bg-rose-300 text-rose-950 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div>
              <span className="text-[10px] sm:text-[11px] font-black text-rose-950 uppercase tracking-wider block">Perlu Servis</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-rose-950 tabular-nums">{maintenanceCount}</span>
                <span className="text-[10px] font-extrabold text-rose-900">unit</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-300 flex items-center justify-center text-rose-950 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. MENU KOTAK UTAMA (SIMPEL: HANYA IKON & JUDUL UTAMA - SANGAT RAMAH HP & SATU HALAMAN) */}
      <div>
        <div className="mb-1.5 px-0.5 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
            Menu Utama
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">Pilih menu navigasi</span>
        </div>

        {/* 2-Column Grid on Mobile, 3-Column on Tablet/Desktop (Cukup Judul Utama & Ikon) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          
          {/* Menu 1: Kotak Inventaris Alat */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bg-white hover:bg-emerald-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight truncate">
                  Katalog Inventaris
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700">
                  {totalCount} alat
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

          {/* Menu 2: Kotak Kalender Kegiatan (CUKUP JUDUL UTAMA & IKON) */}
          <div
            onClick={() => onNavigate('calendar')}
            className="bg-white hover:bg-teal-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight truncate">
                  Kalender Kegiatan
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold text-teal-700">
                  {events.length} agenda
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

          {/* Menu 3: Kotak Formulir Peminjaman (WARNA KUNING TEBAL MENCILOK) */}
          <div
            onClick={() => onNavigate('loan-form')}
            className="bg-amber-200 hover:bg-amber-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-amber-950 leading-tight truncate">
                  Formulir Peminjaman
                </h3>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-900">
                  Ajukan Pinjam
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

          {/* Menu 4: Kotak Status Peminjaman */}
          <div
            onClick={() => onNavigate('loans-management')}
            className="bg-white hover:bg-blue-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight truncate">
                  Status Peminjaman
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-700">
                  {pendingLoans.length > 0 ? `${pendingLoans.length} Menunggu` : 'Pantau Status'}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

          {/* Menu 5: Kotak Laporan Bulanan (CUKUP JUDUL UTAMA & IKON) */}
          <div
            onClick={() => onNavigate('reports')}
            className="bg-white hover:bg-purple-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight truncate">
                  Laporan Bulanan
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-700">
                  Rekapitulasi
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

          {/* Menu 6: Info Hub & Akses Admin */}
          <div
            onClick={isAdmin ? onOpenSettings : onOpenAdminModal}
            className="bg-emerald-50 hover:bg-emerald-100/70 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 leading-tight truncate">
                  {isAdmin ? 'Pengaturan Lembaga' : 'Akses Admin'}
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800">
                  {isAdmin ? 'Edit Identitas' : 'Masuk PIN'}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>

        </div>
      </div>

    </div>
  );
};
