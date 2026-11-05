import React, { useState, useMemo } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings, ItemCategory, ItemCondition, ItemStatus, LoanStatus } from '../types';
import { 
  FileSpreadsheet, Printer, Send, Copy, Check, 
  Calendar, CheckCircle2, AlertTriangle, 
  Building2, Download, Award, MapPin, Users,
  Search, Clock, Box, Filter, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDateIndo, openWhatsAppDirect, copyToClipboard } from '../utils/whatsapp';

interface MonthlyReportsViewProps {
  items: MediaItem[];
  loans: LoanRequest[];
  events: MediaEvent[];
  settings: AppSettings;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Rentang tahun lebih panjang untuk arsip dan proyeksi masa depan (2023 s/d 2040)
const AVAILABLE_YEARS = Array.from({ length: 18 }, (_, i) => 2023 + i);

const ALL_CATEGORIES: ItemCategory[] = [
  'Kamera', 'Lensa', 'Audio & Mic', 'Lighting', 
  'Stabilizer & Tripod', 'Drone & Stream', 'Aksesoris & Kabel'
];

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  items,
  loans,
  events,
  settings,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeReportTab, setActiveReportTab] = useState<'inventory-condition' | 'usage-loans'>('inventory-condition');
  const [copiedText, setCopiedText] = useState(false);

  // Filter state for "Rincian Semua Alat"
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState<string>('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');

  // Filter state for "Rincian Pemakaian"
  const [usageSearchQuery, setUsageSearchQuery] = useState('');
  const [usageStatusFilter, setUsageStatusFilter] = useState<string>('Semua');
  const [usageViewMode, setUsageViewMode] = useState<'per-alat' | 'per-transaksi'>('per-alat');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Helper to calculate duration in days
  const calculateDurationDays = (start: string, end: string): number => {
    try {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff + 1);
    } catch {
      return 1;
    }
  };

  // Filter loans for selected month & year
  const monthlyLoans = useMemo(() => {
    return loans.filter((loan) => {
      const date = new Date(loan.startDate || loan.createdAt);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [loans, selectedMonth, selectedYear]);

  // Filter events for selected month & year
  const monthlyEvents = useMemo(() => {
    return events.filter((evt) => {
      const date = new Date(evt.startDate);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [events, selectedMonth, selectedYear]);

  // Inventory Condition Metrics
  const totalItemsCount = items.length;
  const goodConditionCount = items.filter((i) => i.condition === 'Baik').length;
  const needsServiceCount = items.filter((i) => i.condition === 'Perlu Servis').length;
  const brokenCount = items.filter((i) => i.condition === 'Rusak').length;
  const readinessPercent = totalItemsCount > 0 ? Math.round((goodConditionCount / totalItemsCount) * 100) : 0;

  // Category breakdown for inventory condition
  const categoryStats = useMemo(() => {
    return ALL_CATEGORIES.map((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      return {
        category: cat,
        total: catItems.length,
        good: catItems.filter((i) => i.condition === 'Baik').length,
        service: catItems.filter((i) => i.condition === 'Perlu Servis').length,
        broken: catItems.filter((i) => i.condition === 'Rusak').length,
      };
    });
  }, [items]);

  // Problematic items
  const problematicItems = useMemo(() => {
    return items.filter((i) => i.condition !== 'Baik');
  }, [items]);

  // Usage & Loans statistics
  const totalLoansInMonth = monthlyLoans.length;
  const approvedLoansCount = monthlyLoans.filter((l) => l.status === 'Disetujui' || l.status === 'Selesai').length;
  
  // Total item borrow frequency count & usage mapping for all equipment
  const itemUsageStats = useMemo(() => {
    return items.map((item) => {
      const itemLoans = monthlyLoans.filter((loan) =>
        loan.items.some(
          (borrowed) => borrowed.itemId === item.id || borrowed.itemName.toLowerCase() === item.name.toLowerCase()
        )
      );
      const totalTimes = itemLoans.length;
      const totalDays = itemLoans.reduce((sum, loan) => {
        return sum + calculateDurationDays(loan.startDate, loan.endDate);
      }, 0);
      const borrowingUnits = Array.from(new Set(itemLoans.map((l) => l.unitName)));

      return {
        item,
        totalTimes,
        totalDays,
        borrowingUnits,
        itemLoans,
      };
    }).sort((a, b) => b.totalTimes - a.totalTimes);
  }, [items, monthlyLoans]);

  // Filtered equipment list for "Rincian Semua Alat"
  const filteredAllItems = useMemo(() => {
    return itemUsageStats.filter(({ item }) => {
      const matchQuery = 
        !itemSearchQuery ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(itemSearchQuery.toLowerCase()));

      const matchCategory = selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
      const matchCondition = selectedConditionFilter === 'Semua' || item.condition === selectedConditionFilter;
      const matchStatus = selectedStatusFilter === 'Semua' || item.status === selectedStatusFilter;

      return matchQuery && matchCategory && matchCondition && matchStatus;
    });
  }, [itemUsageStats, itemSearchQuery, selectedCategoryFilter, selectedConditionFilter, selectedStatusFilter]);

  // Filtered usage data for "Rincian Pemakaian Alat"
  const filteredUsageItems = useMemo(() => {
    return itemUsageStats.filter(({ item, borrowingUnits }) => {
      const matchQuery = 
        !usageSearchQuery ||
        item.name.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        borrowingUnits.some((u) => u.toLowerCase().includes(usageSearchQuery.toLowerCase()));

      return matchQuery;
    });
  }, [itemUsageStats, usageSearchQuery]);

  // Filtered loan requests for "Rincian Transaksi Peminjaman"
  const filteredMonthlyLoans = useMemo(() => {
    return monthlyLoans.filter((loan) => {
      const matchQuery =
        !usageSearchQuery ||
        loan.id.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        loan.unitName.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        loan.borrowerName.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        loan.purpose.toLowerCase().includes(usageSearchQuery.toLowerCase()) ||
        loan.items.some((it) => it.itemName.toLowerCase().includes(usageSearchQuery.toLowerCase()));

      const matchStatus = usageStatusFilter === 'Semua' || loan.status === usageStatusFilter;

      return matchQuery && matchStatus;
    });
  }, [monthlyLoans, usageSearchQuery, usageStatusFilter]);

  // Unit borrow frequency
  const unitBorrowFrequency = useMemo(() => {
    const counts: { [unit: string]: number } = {};
    monthlyLoans.forEach((loan) => {
      counts[loan.unitName] = (counts[loan.unitName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([unit, count]) => ({ unit, count }))
      .sort((a, b) => b.count - a.count);
  }, [monthlyLoans]);

  // Generate WhatsApp Monthly Recap Message to Leadership
  const generateMonthlySummaryWhatsApp = (): string => {
    const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    
    let text = `*LAPORAN BULANAN INVENTARIS & PEMAKAIAN ALAT*\n`;
    text += `_${settings.pesantrenName}_\n`;
    text += `*${settings.mediaTeamName}*\n`;
    text += `Periode: *${monthLabel}*\n\n`;

    text += `*1. RINCIAN KONDISI SEMUA ALAT INVENTARIS*\n`;
    text += `• Total Aset Alat: *${totalItemsCount} unit*\n`;
    text += `• Kondisi Siap Pakai (Baik): *${goodConditionCount} unit* (${readinessPercent}%)\n`;
    text += `• Perlu Servis / Perawatan: *${needsServiceCount} unit*\n`;
    text += `• Kondisi Rusak: *${brokenCount} unit*\n`;
    text += `• Lokasi Standar Pengambilan: *${settings.defaultPickupLocation || 'Kantor Media'}*\n\n`;

    if (problematicItems.length > 0) {
      text += `_Catatan Alat Bermasalah:_\n`;
      problematicItems.forEach((i, idx) => {
        text += `  ${idx + 1}. *${i.name}* [${i.condition}] - ${i.notes || 'Perlu penanganan'}\n`;
      });
      text += `\n`;
    }

    text += `*2. RINCIAN PEMAKAIAN ALAT BULAN INI*\n`;
    text += `• Total Pengajuan Peminjaman: *${totalLoansInMonth} kali*\n`;
    text += `• Peminjaman Terealisasi: *${approvedLoansCount} kali*\n`;
    text += `• Total Agenda Liputan Media: *${monthlyEvents.length} kegiatan*\n\n`;

    if (unitBorrowFrequency.length > 0) {
      text += `_Unit Teraktif Meminjam Alat:_\n`;
      unitBorrowFrequency.slice(0, 3).forEach((u, idx) => {
        text += `  ${idx + 1}. *${u.unit}*: ${u.count} kali peminjaman\n`;
      });
      text += `\n`;
    }

    const usedItems = itemUsageStats.filter((u) => u.totalTimes > 0);
    if (usedItems.length > 0) {
      text += `_Rincian Pemakaian per Item Alat:_\n`;
      usedItems.slice(0, 8).forEach((u, idx) => {
        text += `  ${idx + 1}. *${u.item.name}* (${u.item.category}) - ${u.totalTimes}x pinjam (~${u.totalDays} hari)\n`;
      });
      if (usedItems.length > 8) {
        text += `  ... dan ${usedItems.length - 8} alat lainnya.\n`;
      }
      text += `\n`;
    }

    if (monthlyLoans.length > 0) {
      text += `_Rincian Transaksi Peminjaman:_\n`;
      monthlyLoans.slice(0, 5).forEach((loan, idx) => {
        text += `  ${idx + 1}. *[${loan.id}] ${loan.unitName}* (PJ: ${loan.borrowerName})\n`;
        text += `     • Waktu: ${formatDateIndo(loan.startDate)} s/d ${formatDateIndo(loan.endDate)}\n`;
        text += `     • Alat: ${loan.items.map((i) => i.itemName).join(', ')}\n`;
        text += `     • Lokasi Ambil: ${loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}\n`;
        text += `     • Keperluan: ${loan.purpose}\n`;
        text += `     • Status: *${loan.status}*\n`;
      });
      if (monthlyLoans.length > 5) {
        text += `  ... (${monthlyLoans.length - 5} peminjaman lainnya tercatat di aplikasi).\n`;
      }
      text += `\n`;
    }

    text += `_Laporan bulanan resmi disampaikan untuk evaluasi pimpinan pondok._\n`;
    text += `Jazakumullahu Khairan Katsiran.\n`;
    text += `--- ${settings.appTitle || 'SIPAT Media'} ---`;

    return text;
  };

  const handleCopyReport = async () => {
    const text = generateMonthlySummaryWhatsApp();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleSendToWhatsApp = () => {
    const text = generateMonthlySummaryWhatsApp();
    openWhatsAppDirect(text, settings.mediaLeaderPhone);
  };

  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeReportTab === 'inventory-condition') {
      csvContent += "ID Alat,Nama Alat,Kategori,Merk,Model,No Seri,Lokasi Simpan,Kondisi Fisik,Status Ketersediaan,Dipinjam Bulan Ini (Kali),Total Hari Pakai,Catatan\n";
      itemUsageStats.forEach(({ item, totalTimes, totalDays }) => {
        csvContent += `"${item.id}","${item.name}","${item.category}","${item.brand}","${item.model}","${item.serialNumber}","${item.location || 'Kantor Media'}","${item.condition}","${item.status}","${totalTimes}","${totalDays}","${(item.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csvContent += "ID Pinjam,Unit Peminjam,Penanggung Jawab,No WhatsApp,Tgl Pinjam,Jam Pinjam,Tgl Kembali,Jam Kembali,Durasi (Hari),Lokasi Pengambilan,Jumlah Alat,Daftar Alat,Keperluan Kegiatan,Status,Catatan Pengembalian\n";
      monthlyLoans.forEach((loan) => {
        const days = calculateDurationDays(loan.startDate, loan.endDate);
        const itemNames = loan.items.map((i) => i.itemName).join('; ');
        csvContent += `"${loan.id}","${loan.unitName}","${loan.borrowerName}","${loan.borrowerPhone}","${loan.startDate}","${loan.startTime}","${loan.endDate}","${loan.endTime}","${days}","${loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}","${loan.items.length}","${itemNames.replace(/"/g, '""')}","${loan.purpose.replace(/"/g, '""')}","${loan.status}","${(loan.returnNotes || '').replace(/"/g, '""')}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_media_${activeReportTab === 'inventory-condition' ? 'semua_alat' : 'pemakaian'}_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header Card (Responsive, No Overflow, Clean Colors) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs relative overflow-hidden print:bg-none print:text-black print:p-0 print:border-b-2 print:border-black print:rounded-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5 print:hidden">
              <FileSpreadsheet className="w-3 h-3 text-amber-300" />
              <span>Biro Media & Dokumentasi</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white print:text-black">
              Laporan Bulanan & Rincian Inventaris
            </h1>
            <p className="text-emerald-50 text-xs mt-0.5 max-w-2xl leading-relaxed hidden sm:block print:block print:text-gray-600">
              {settings.pesantrenName} · {settings.mediaTeamName} · Periode {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-white/20 p-1.5 rounded-2xl backdrop-blur-xs self-start md:self-auto shrink-0 print:hidden">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls Bar - Full responsive on Mobile & Desktop */}
        <div className="relative z-10 mt-4 sm:mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          
          {/* Responsive Tabs: 2 Equal Columns on Mobile */}
          <div className="grid grid-cols-2 w-full sm:w-auto bg-white/15 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setActiveReportTab('inventory-condition')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${
                activeReportTab === 'inventory-condition'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Rincian Semua Alat ({items.length})
            </button>
            <button
              onClick={() => setActiveReportTab('usage-loans')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${
                activeReportTab === 'usage-loans'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Rincian Pemakaian ({monthlyLoans.length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={handleSendToWhatsApp}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Kirim ringkasan laporan ke WhatsApp Pengasuh/Pimpinan"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Kirim WA</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="col-span-1 px-2.5 py-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Salin ringkasan ke clipboard"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Salin</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="col-span-1 px-2.5 py-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Unduh data dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="col-span-4 sm:col-span-1 px-3 py-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Cetak laporan resmi"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAPORAN BAGIAN 1: RINCIAN SEMUA ALAT & KESEHATAN FISIK INVENTARIS         */}
      {/* ========================================================================= */}
      {activeReportTab === 'inventory-condition' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Aset Alat
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">{totalItemsCount}</span>
                <span className="text-xs text-slate-500">unit</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">7 kategori peralatan aktif</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Kondisi Baik
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-700">{goodConditionCount}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                  {readinessPercent}%
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Siap operasional santri</p>
            </div>

            <div className="bg-amber-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-amber-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Perlu Servis
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-700">{needsServiceCount}</span>
                <span className="text-xs text-amber-700">unit</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">Perawatan / sparepart</p>
            </div>

            <div className="bg-rose-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-rose-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Kondisi Rusak
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-rose-700">{brokenCount}</span>
                <span className="text-xs text-rose-700">unit</span>
              </div>
              <p className="text-[10px] text-rose-600 mt-1">Perbaikan teknisi resmi</p>
            </div>
          </div>

          {/* Breakdown per Kategori */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Rekapitulasi Fisik per Kategori
                </h3>
                <p className="text-xs text-slate-500">
                  Ringkasan kondisi kesiapan alat audio, visual, lighting, dan rigging.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center">Baik</th>
                    <th className="py-2.5 px-3 text-center">Servis</th>
                    <th className="py-2.5 px-3 text-center">Rusak</th>
                    <th className="py-2.5 px-3 text-right">Kesiapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryStats.map((cat) => {
                    const pct = cat.total > 0 ? Math.round((cat.good / cat.total) * 100) : 100;
                    return (
                      <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{cat.category}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900">{cat.total}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">{cat.good}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-700 font-bold">
                          {cat.service > 0 ? cat.service : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-700 font-bold">
                          {cat.broken > 0 ? cat.broken : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 sm:w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-slate-700">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Problematic Items Callout */}
          {problematicItems.length > 0 && (
            <div className="bg-amber-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-amber-200 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                  Daftar Alat Bermasalah & Catatan Servis Bulan Ini ({problematicItems.length} unit)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                {problematicItems.map((item) => (
                  <div key={item.id} className="bg-white p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs border border-amber-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        item.condition === 'Rusak' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Kategori: <span className="font-semibold text-slate-700">{item.category}</span> · Lokasi: <span className="font-semibold text-slate-700">{item.location || 'Kantor Media'}</span>
                    </div>
                    {item.notes && (
                      <p className="text-slate-700 text-[11px] bg-amber-50/50 p-2 rounded-xl mt-1 leading-relaxed border border-amber-100">
                        <strong>Kendala:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TABEL / KARTU RINCIAN SEMUA ALAT (REQUEST KHUSUS USER)                   */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Tabel Rincian Semua Alat Inventaris
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] px-2 py-0.5 rounded-full">
                    {filteredAllItems.length} dari {totalItemsCount} Unit
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar lengkap seluruh 27 unit inventaris Qoryah TV beserta kondisi fisik, status ketersediaan, lokasi simpan, dan riwayat pemakaian bulan {MONTH_NAMES[selectedMonth]} {selectedYear}.
                </p>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {/* Search */}
                <div className="relative min-w-[180px] sm:min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Cari kode, nama, merk..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Semua">Semua Kategori</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Condition Filter */}
                <select
                  value={selectedConditionFilter}
                  onChange={(e) => setSelectedConditionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Semua">Semua Kondisi</option>
                  <option value="Baik">Baik</option>
                  <option value="Perlu Servis">Perlu Servis</option>
                  <option value="Rusak">Rusak</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Tersedia">Tersedia</option>
                  <option value="Sedang Dipinjam">Sedang Dipinjam</option>
                  <option value="Dalam Perawatan">Dalam Perawatan</option>
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-emerald-50 text-emerald-950 font-bold uppercase text-[10px] tracking-wider border-b border-emerald-100">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Kode & Nama Alat</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Lokasi Simpan</th>
                    <th className="py-2.5 px-3 text-center">Kondisi</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Pemakaian Bulan Ini</th>
                    <th className="py-2.5 px-3">Catatan / Spesifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        Tidak ada alat yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAllItems.map(({ item, totalTimes, totalDays, borrowingUnits }, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">{item.id}</span>
                            <span>{item.brand} {item.model}</span>
                            {item.serialNumber && (
                              <span className="text-slate-400">· SN: {item.serialNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{item.location || settings.defaultPickupLocation || 'Kantor Media'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' :
                            item.condition === 'Perlu Servis' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Tersedia' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            item.status === 'Sedang Dipinjam' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {totalTimes > 0 ? (
                            <div>
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                                {totalTimes}x pinjam
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                ~{totalDays} hari ({borrowingUnits.length} unit)
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              0x (Standby)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {item.notes ? (
                            <div className="text-slate-700 font-medium line-clamp-2">{item.notes}</div>
                          ) : item.specs ? (
                            <div className="text-slate-400 line-clamp-1">{item.specs}</div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero Horizontal Scroll Clutter, Clean & Informative) */}
            <div className="md:hidden space-y-2.5">
              {filteredAllItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada alat yang cocok dengan filter pencarian.
                </div>
              ) : (
                filteredAllItems.map(({ item, totalTimes, totalDays, borrowingUnits }) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[10px] text-slate-700 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-slate-200 mr-1.5">
                          {item.id}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' :
                          item.condition === 'Perlu Servis' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.condition}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kategori</span>
                        <span className="font-semibold text-slate-800">{item.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Status Saat Ini</span>
                        <span className="font-semibold text-slate-800">{item.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lokasi</span>
                        <span className="font-semibold text-slate-800">{item.location || 'Kantor Media'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Dipakai Bulan Ini</span>
                        <span className={`font-mono font-bold ${totalTimes > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {totalTimes > 0 ? `${totalTimes}x (~${totalDays} hari)` : '0x (Standby)'}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-xl border border-amber-100 leading-relaxed">
                        <strong className="text-amber-900">Catatan:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* LAPORAN BAGIAN 2: RINCIAN PEMAKAIAN ALAT, DURASI & TRANSAKSI PEMINJAMAN   */}
      {/* ========================================================================= */}
      {activeReportTab === 'usage-loans' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Peminjaman
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">{totalLoansInMonth}</span>
                <span className="text-xs text-slate-500">kali</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Disetujui / Selesai
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-700">{approvedLoansCount}</span>
                <span className="text-xs text-emerald-600">berkas</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Terealisasi penuh</p>
            </div>

            <div className="bg-amber-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-amber-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Unit Teraktif
              </span>
              <div className="mt-1 sm:mt-2">
                <span className="text-xs sm:text-sm font-extrabold text-amber-950 truncate block">
                  {unitBorrowFrequency[0]?.unit || '-'}
                </span>
                <span className="text-[11px] font-semibold text-amber-700">
                  {unitBorrowFrequency[0] ? `${unitBorrowFrequency[0].count}x peminjaman` : 'Belum ada'}
                </span>
              </div>
            </div>

            <div className="bg-sky-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-sky-100">
              <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
                Agenda Kegiatan
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-sky-700">{monthlyEvents.length}</span>
                <span className="text-xs text-sky-600">acara</span>
              </div>
              <p className="text-[10px] text-sky-600 mt-1">Liputan & streaming</p>
            </div>
          </div>

          {/* Unit & Top Equipment Ranking Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Unit Ranking */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Frekuensi Pinjam Berdasarkan Unit Lembaga</span>
              </h4>
              {unitBorrowFrequency.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada peminjaman di bulan ini.</p>
              ) : (
                <div className="space-y-2">
                  {unitBorrowFrequency.map((u, idx) => (
                    <div key={u.unit} className="flex items-center justify-between text-xs p-2.5 sm:p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{u.unit}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">{u.count}x pinjam</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Borrowed Gear */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Peralatan Paling Sering Digunakan</span>
              </h4>
              {itemUsageStats.filter((i) => i.totalTimes > 0).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada pemakaian alat di bulan ini.</p>
              ) : (
                <div className="space-y-2">
                  {itemUsageStats.filter((i) => i.totalTimes > 0).slice(0, 5).map(({ item, totalTimes, totalDays }, idx) => (
                    <div key={item.id} className="flex items-center justify-between text-xs p-2.5 sm:p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-400 text-emerald-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400 block">{item.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-800 block">{totalTimes} kali</span>
                        <span className="text-[10px] text-slate-500">~{totalDays} hari</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: RINCIAN PEMAKAIAN ALAT LENGKAP (REQUEST KHUSUS USER)             */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-4">
            
            {/* Header & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Rincian Pemakaian Alat & Durasi Peminjaman
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laporan detail intensitas penggunaan per alat inventaris dan riwayat transaksi peminjaman santri/unit.
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto print:hidden">
                <button
                  onClick={() => setUsageViewMode('per-alat')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    usageViewMode === 'per-alat'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rincian per Alat
                </button>
                <button
                  onClick={() => setUsageViewMode('per-transaksi')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    usageViewMode === 'per-transaksi'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rincian per Berkas ({monthlyLoans.length})
                </button>
              </div>
            </div>

            {/* Filter & Search Bar for Usage */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usageSearchQuery}
                  onChange={(e) => setUsageSearchQuery(e.target.value)}
                  placeholder={usageViewMode === 'per-alat' ? "Cari nama alat, kode, unit peminjam..." : "Cari kode booking, unit, PJ, agenda..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {usageViewMode === 'per-transaksi' && (
                <select
                  value={usageStatusFilter}
                  onChange={(e) => setUsageStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              )}
            </div>

            {/* VIEW MODE 1: RINCIAN PER ALAT (Usage Breakdown per Gear Item) */}
            {usageViewMode === 'per-alat' && (
              <div className="space-y-3">
                {filteredUsageItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data pemakaian alat yang sesuai pencarian.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUsageItems.map(({ item, totalTimes, totalDays, borrowingUnits, itemLoans }) => {
                      const isExpanded = expandedItemId === item.id;
                      return (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                          <div 
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 p-2.5 rounded-2xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                totalTimes > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {totalTimes > 0 ? `${totalTimes}x` : '0x'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold">
                                    {item.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                  <span>{item.category}</span>
                                  <span>·</span>
                                  <span>Lokasi: {item.location || 'Kantor Media'}</span>
                                  <span>·</span>
                                  <span className={`font-semibold ${
                                    item.condition === 'Baik' ? 'text-emerald-700' :
                                    item.condition === 'Perlu Servis' ? 'text-amber-700' : 'text-rose-700'
                                  }`}>
                                    Kondisi: {item.condition}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-1 sm:pt-0 border-t sm:border-0 border-slate-100">
                              <div className="text-left sm:text-right">
                                <span className="font-bold text-xs text-slate-800 block">
                                  {totalTimes > 0 ? `${totalTimes} kali dipinjam` : 'Standby / Siap Pakai'}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {totalTimes > 0 ? `Total durasi: ~${totalDays} hari` : '0 hari pemakaian'}
                                </span>
                              </div>
                              <div className="text-slate-400 print:hidden">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Detail: Log Riwayat Pemakaian Alat Ini */}
                          {(isExpanded || itemLoans.length > 0) && (
                            <div className={`pl-2 sm:pl-12 pr-2 pb-2 space-y-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                              {itemLoans.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl">
                                  Alat ini standby di {item.location || 'Kantor Media'} sepanjang bulan {MONTH_NAMES[selectedMonth]} {selectedYear} tanpa pengajuan peminjaman.
                                </p>
                              ) : (
                                <div className="bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-100">
                                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                    <span>Riwayat Unit & Agenda yang Menggunakan Alat Ini:</span>
                                    <span className="text-emerald-700 font-mono">{itemLoans.length} riwayat</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {itemLoans.map((loan) => (
                                      <div key={loan.id} className="bg-white p-2.5 rounded-xl text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs border border-slate-100">
                                        <div>
                                          <span className="font-bold text-slate-900">{loan.unitName}</span>
                                          <span className="text-slate-400 mx-1">·</span>
                                          <span className="text-slate-600">PJ: {loan.borrowerName}</span>
                                          <p className="text-slate-500 text-[10px] mt-0.5">
                                            <strong>Keperluan:</strong> {loan.purpose}
                                          </p>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                          <div className="font-medium text-slate-700">
                                            {formatDateIndo(loan.startDate)} s/d {formatDateIndo(loan.endDate)}
                                          </div>
                                          <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-slate-400">
                                              ({calculateDurationDays(loan.startDate, loan.endDate)} hari)
                                            </span>
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                              loan.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                                              loan.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                                              'bg-amber-100 text-amber-800'
                                            }`}>
                                              {loan.status}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 2: RINCIAN PER BERKAS / TRANSAKSI (Granular Loan Records) */}
            {usageViewMode === 'per-transaksi' && (
              <div className="space-y-3">
                {filteredMonthlyLoans.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada catatan peminjaman pada periode {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </div>
                ) : (
                  <>
                    {/* Mobile View: Clean, structured card layout with full details */}
                    <div className="space-y-3 sm:hidden">
                      {filteredMonthlyLoans.map((loan) => {
                        const duration = calculateDurationDays(loan.startDate, loan.endDate);
                        return (
                          <div key={loan.id} className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-100 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-slate-200">
                                {loan.id}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                loan.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                                loan.status === 'Menunggu Konfirmasi' ? 'bg-amber-100 text-amber-800' :
                                loan.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {loan.status}
                              </span>
                            </div>

                            <div>
                              <div className="font-bold text-slate-900 text-sm">{loan.unitName}</div>
                              <div className="text-[11px] text-slate-500">PJ: {loan.borrowerName} ({loan.borrowerPhone})</div>
                            </div>

                            <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">Jadwal Pakai:</span>
                                <span className="font-bold text-emerald-800 font-mono text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded">
                                  {duration} Hari
                                </span>
                              </div>
                              <div>{formatDateIndo(loan.startDate)} {loan.startTime} s/d {formatDateIndo(loan.endDate)} {loan.endTime} WIB</div>
                              <p className="text-[11px] text-slate-600 mt-1">
                                <strong>Keperluan:</strong> {loan.purpose}
                              </p>
                            </div>

                            {/* Tempat Pengambilan Alat */}
                            <div className="text-[11px] text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-emerald-100">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Tempat Pengambilan: <strong>{loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}</strong></span>
                            </div>

                            {/* Rincian Alat yang Dipinjam */}
                            <div className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-900 block mb-1">
                                Rincian Alat ({loan.items.length} item):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {loan.items.map((it, idx) => (
                                  <span key={idx} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                                    {it.itemName}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {loan.returnNotes && (
                              <div className="text-[11px] text-slate-600 bg-blue-50 p-2 rounded-xl border border-blue-100">
                                <strong className="text-blue-900">Catatan Pengembalian:</strong> {loan.returnNotes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View: Full Granular Table with Scroll */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[780px]">
                        <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider border-b border-emerald-100">
                          <tr>
                            <th className="py-2.5 px-3">Kode Booking</th>
                            <th className="py-2.5 px-3">Unit & Penanggung Jawab</th>
                            <th className="py-2.5 px-3">Jadwal & Durasi</th>
                            <th className="py-2.5 px-3">Tempat Pengambilan</th>
                            <th className="py-2.5 px-3">Rincian Alat & Keperluan</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredMonthlyLoans.map((loan) => {
                            const duration = calculateDurationDays(loan.startDate, loan.endDate);
                            return (
                              <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                  {loan.id}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900">{loan.unitName}</div>
                                  <div className="text-[11px] text-slate-500">PJ: {loan.borrowerName} ({loan.borrowerPhone})</div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  <div className="font-medium">{formatDateIndo(loan.startDate)}</div>
                                  <div className="text-[11px] text-slate-400">s/d {formatDateIndo(loan.endDate)}</div>
                                  <span className="font-mono font-bold text-emerald-700 text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                    {duration} Hari
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                                  <div className="font-semibold text-slate-900">
                                    {loan.items.length} alat: {loan.items.map((i) => i.itemName).join(', ')}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                    <strong>Keperluan:</strong> {loan.purpose}
                                  </p>
                                  {loan.returnNotes && (
                                    <p className="text-[10px] text-blue-700 mt-1 italic">
                                      Kembali: {loan.returnNotes}
                                    </p>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    loan.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                                    loan.status === 'Menunggu Konfirmasi' ? 'bg-amber-100 text-amber-800' :
                                    loan.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {loan.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>

          {/* Section: Rekapitulasi Agenda Kegiatan & Liputan Bulan Ini */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-100 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rekap Kegiatan & Liputan Media Bulan Ini</span>
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {monthlyEvents.length} kegiatan
              </span>
            </div>

            {monthlyEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada agenda kegiatan liputan pada periode {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {monthlyEvents.map((evt) => (
                  <div key={evt.id} className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{evt.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {evt.category}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateIndo(evt.startDate)} · {evt.startTime} - {evt.endTime} WIB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{evt.location}</span>
                      </div>
                      {evt.crewAssigned && evt.crewAssigned.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Kru: {evt.crewAssigned.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

