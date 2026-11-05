import React from 'react';
import { 
  LayoutDashboard, Camera, Calendar, ShieldCheck, Lock, Unlock, 
  Settings as SettingsIcon, PackagePlus, FileText, BarChart3, 
  Edit3, Video, Radio, Landmark, Film, Sparkles, Tv, Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { AppSettings } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'inventory' | 'calendar' | 'loan-form' | 'loans-management' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'calendar' | 'loan-form' | 'loans-management' | 'reports') => void;
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onAdminLogout: () => void;
  onOpenSettings: () => void;
  onOpenSyncModal: () => void;
  pendingLoansCount: number;
  settings: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenAdminModal,
  onAdminLogout,
  onOpenSettings,
  onOpenSyncModal,
  pendingLoansCount,
  settings,
}) => {
  // Render logo based on admin settings
  const renderLogoIcon = () => {
    if (settings.logoType === 'custom_url' && settings.logoCustomUrl) {
      return (
        <img
          src={settings.logoCustomUrl}
          alt={settings.pesantrenName}
          className="w-10 h-10 rounded-2xl object-cover shadow-xs bg-white"
        />
      );
    }

    const preset = settings.logoPreset || 'camera';
    const iconClass = "w-5 h-5 text-white";

    switch (preset) {
      case 'video':
        return <Video className={iconClass} />;
      case 'radio':
        return <Radio className={iconClass} />;
      case 'mosque':
        return <Landmark className={iconClass} />;
      case 'film':
        return <Film className={iconClass} />;
      case 'sparkles':
        return <Sparkles className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      case 'camera':
      default:
        return <Camera className={iconClass} />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs w-full overflow-hidden">
      {/* Fresh Mint-Teal top accent stripe */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400" />
      
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 h-13 sm:h-16">
          
          {/* Zone 1: Brand wordmark & emblem (clicking navigates to dashboard) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-1 min-w-0"
              title="Kembali ke Dashboard Utama"
            >
              {settings.logoType === 'custom_url' && settings.logoCustomUrl ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src={settings.logoCustomUrl}
                    alt={settings.pesantrenName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700 transition-colors shrink-0">
                  {renderLogoIcon()}
                </div>
              )}

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 leading-tight truncate">
                  {settings.appTitle || 'SIPAT Media'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-tight truncate block">
                  {settings.pesantrenName}
                </span>
              </div>
            </div>

            {/* Quick edit button for Admin to change Title, Logo, or Pesantren Name */}
            {isAdmin && (
              <button
                onClick={onOpenSettings}
                title="Ubah Judul, Logo, & Nama Pondok Pesantren"
                className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg sm:rounded-xl transition-colors shrink-0 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden md:inline-block text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md font-bold">Edit Identitas</span>
              </button>
            )}
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Inventaris Alat</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Kalender Kegiatan</span>
            </button>

            <button
              onClick={() => setActiveTab('loan-form')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'loan-form'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Formulir Pinjam</span>
            </button>

            <button
              onClick={() => setActiveTab('loans-management')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'loans-management'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Status Peminjaman</span>
              {pendingLoansCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-black bg-amber-400 text-amber-950 rounded-full shadow-xs">
                  {pendingLoansCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Laporan Bulanan</span>
            </button>
          </nav>

          {/* Zone 3: Role Switcher / Admin Login Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sync Cloud & Vercel Button */}
            <button
              onClick={onOpenSyncModal}
              title="Sinkronisasi Data dengan Vercel (sipatmedia.vercel.app)"
              className="px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs border border-emerald-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Sync Vercel</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Cloud SQL Terhubung" />
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-1 bg-emerald-50 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 shadow-2xs">
                <span className="hidden md:inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 px-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Admin
                </span>
                <button
                  onClick={onOpenSettings}
                  title="Pengaturan Lembaga & Logo"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-emerald-100 rounded-lg sm:rounded-xl transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
                </button>
                <button
                  onClick={onAdminLogout}
                  title="Keluar dari Admin"
                  className="px-2 py-1 text-[10px] sm:text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shadow-2xs"
                >
                  <Unlock className="w-3 h-3 text-rose-500" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminModal}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center gap-1 whitespace-nowrap shadow-xs"
              >
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-950" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation: 4-Column Full-Width Grid so "Pinjam" is never cut off on phone screens */}
        <div className="lg:hidden py-1.5 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-1 w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all truncate flex items-center justify-center ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all truncate flex items-center justify-center ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Inventaris
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all truncate flex items-center justify-center ${
                activeTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Kalender
            </button>
            <button
              onClick={() => setActiveTab('loan-form')}
              className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all truncate flex items-center justify-center ${
                activeTab === 'loan-form'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pinjam
            </button>
          </div>

          {/* Secondary Sub-Row for Status & Laporan */}
          <div className="grid grid-cols-2 gap-1 w-full mt-1">
            <button
              onClick={() => setActiveTab('loans-management')}
              className={`py-1.5 px-2 rounded-xl text-center text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'loans-management'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Status Peminjaman</span>
              {pendingLoansCount > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-amber-400 text-emerald-950 font-black rounded-full shrink-0">
                  {pendingLoansCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-1.5 px-2 rounded-xl text-center text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 truncate ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Laporan Bulanan</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
