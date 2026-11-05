import React, { useState, useMemo } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings, ItemCategory } from '../types';
import { 
  Printer, Send, Copy, Check, 
  Calendar, CheckCircle2, AlertTriangle, 
  Building2, Download, Award, MapPin, Users,
  Search, Clock, Box, Eye
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

  // Filters for Screen View
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState<string>('Semua');
  const [usageSearchQuery, setUsageSearchQuery] = useState('');

  // 2-Month Window Calculation (Bulan Terpilih + 1 Bulan Sebelumnya)
  const prevMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYearNumber = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const twoMonthsLabel = `${MONTH_NAMES[prevMonthIndex]} ${prevYearNumber} – ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  // Helper duration in days
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

  // Filter loans for selected month
  const monthlyLoans = useMemo(() => {
    return loans.filter((loan) => {
      const date = new Date(loan.startDate || loan.createdAt);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [loans, selectedMonth, selectedYear]);

  // Filter 2-month media events (Current Month + Preceding Month)
  const twoMonthsEvents = useMemo(() => {
    return events.filter((evt) => {
      const d = new Date(evt.startDate);
      const m = d.getMonth();
      const y = d.getFullYear();
      const isCurrent = m === selectedMonth && y === selectedYear;
      const isPrev = m === prevMonthIndex && y === prevYearNumber;
      return isCurrent || isPrev;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, selectedMonth, selectedYear, prevMonthIndex, prevYearNumber]);

  // Events in current selected month
  const currentMonthEvents = useMemo(() => {
    return twoMonthsEvents.filter((evt) => {
      const d = new Date(evt.startDate);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [twoMonthsEvents, selectedMonth, selectedYear]);

  // Inventory Condition Metrics
  const totalItemsCount = items.length;
  const goodConditionCount = items.filter((i) => i.condition === 'Baik').length;
  const needsServiceCount = items.filter((i) => i.condition === 'Perlu Servis').length;
  const brokenCount = items.filter((i) => i.condition === 'Rusak').length;
  const readinessPercent = totalItemsCount > 0 ? Math.round((goodConditionCount / totalItemsCount) * 100) : 0;

  // Category breakdown
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

  // Problematic items (Perlu Servis / Rusak)
  const problematicItems = useMemo(() => {
    return items.filter((i) => i.condition !== 'Baik');
  }, [items]);

  // Item usage mapping (how many times borrowed in this month)
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
      };
    }).sort((a, b) => b.totalTimes - a.totalTimes);
  }, [items, monthlyLoans]);

  // Filtered equipment list for Screen View
  const filteredAllItems = useMemo(() => {
    return itemUsageStats.filter(({ item }) => {
      const matchQuery = 
        !itemSearchQuery ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(itemSearchQuery.toLowerCase());

      const matchCategory = selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
      const matchCondition = selectedConditionFilter === 'Semua' || item.condition === selectedConditionFilter;

      return matchQuery && matchCategory && matchCondition;
    });
  }, [itemUsageStats, itemSearchQuery, selectedCategoryFilter, selectedConditionFilter]);

  // Split items for print 2-column layout (Unit 1-14, Unit 15-27)
  const printItemsCol1 = items.slice(0, 14);
  const printItemsCol2 = items.slice(14);

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

  // Generate WhatsApp Monthly Recap Message
  const generateMonthlySummaryWhatsApp = (): string => {
    const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    
    let text = `*LAPORAN RESMI INVENTARIS & AGENDA TIM MEDIA*\n`;
    text += `_${settings.pesantrenName}_\n`;
    text += `*${settings.mediaTeamName}*\n`;
    text += `Periode: *${monthLabel}*\n\n`;

    text += `*1. REKAPITULASI KONDISI INVENTARIS ALAT*\n`;
    text += `• Total Aset: *${totalItemsCount} unit*\n`;
    text += `• Siap Operasional (Baik): *${goodConditionCount} unit* (${readinessPercent}%)\n`;
    text += `• Perlu Servis: *${needsServiceCount} unit*\n`;
    text += `• Kondisi Rusak: *${brokenCount} unit*\n`;
    text += `• Lokasi Standar Pengambilan: *${settings.defaultPickupLocation || 'Kantor Media'}*\n\n`;

    if (problematicItems.length > 0) {
      text += `_Catatan Alat Bermasalah:_\n`;
      problematicItems.forEach((i, idx) => {
        text += `  ${idx + 1}. *${i.name}* [${i.condition}] - ${i.notes || 'Perlu servis'}\n`;
      });
      text += `\n`;
    }

    text += `*2. HISTORY AGENDA LIPUTAN 2 BULAN TERAKHIR (${twoMonthsLabel})*\n`;
    text += `• Total Kegiatan Terlaksana: *${twoMonthsEvents.length} kegiatan*\n`;
    twoMonthsEvents.slice(0, 6).forEach((evt, idx) => {
      text += `  ${idx + 1}. [${formatDateIndo(evt.startDate)}] *${evt.title}* (${evt.category})\n`;
    });
    if (twoMonthsEvents.length > 6) {
      text += `  ... dan ${twoMonthsEvents.length - 6} kegiatan liputan lainnya.\n`;
    }
    text += `\n`;

    text += `*3. REKAPITULASI PEMINJAMAN ALAT*\n`;
    text += `• Total Berkas Peminjaman Bulan Ini: *${monthlyLoans.length} kali*\n`;
    if (unitBorrowFrequency.length > 0) {
      text += `• Unit Paling Aktif: *${unitBorrowFrequency[0].unit}* (${unitBorrowFrequency[0].count}x)\n`;
    }

    text += `\n_Laporan resmi disampaikan untuk evaluasi pimpinan pondok._\n`;
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
    csvContent += "ID Alat,Nama Alat,Kategori,Merk,Model,No Seri,Lokasi Simpan,Kondisi Fisik,Status Ketersediaan,Catatan\n";
    items.forEach((item) => {
      csvContent += `"${item.id}","${item.name}","${item.category}","${item.brand}","${item.model}","${item.serialNumber}","${item.location || 'Kantor Media'}","${item.condition}","${item.status}","${(item.notes || '').replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_media_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* ========================================================================= */}
      {/* 1. CSS KHUSUS PRINT: MENJAMIN MAKSIMAL 2 HALAMAN (A4 PORTRAIT)           */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            font-size: 10px !important;
            color: #000000 !important;
          }
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            height: 0px !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 2. MENU ATAS (LAYAR NORMAL) - OTOMATIS HILANG DI CETAKAN (print:hidden)  */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">
              <span>Biro Media & Dokumentasi</span>
            </div>
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white">
              Laporan Bulanan & History Kegiatan Media
            </h1>
            <p className="text-emerald-50 text-xs mt-0.5">
              {settings.pesantrenName} · {settings.mediaTeamName} · Periode {MONTH_NAMES[selectedMonth]} {selectedYear}
            </p>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-white/20 p-1 rounded-xl backdrop-blur-xs self-start md:self-auto shrink-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-3 pt-3 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Responsive Tabs */}
          <div className="grid grid-cols-2 w-full sm:w-auto bg-white/15 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveReportTab('inventory-condition')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                activeReportTab === 'inventory-condition'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Kondisi & Semua Alat ({items.length})
            </button>
            <button
              onClick={() => setActiveReportTab('usage-loans')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                activeReportTab === 'usage-loans'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              History Kegiatan & Pinjam ({twoMonthsEvents.length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={handleSendToWhatsApp}
              className="col-span-2 sm:col-span-1 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Kirim ringkasan laporan ke WhatsApp Pengasuh/Pimpinan"
            >
              <Send className="w-3 h-3 shrink-0" />
              <span>Kirim WA</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="col-span-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Salin ringkasan ke clipboard"
            >
              {copiedText ? (
                <>
                  <Check className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 shrink-0" />
                  <span>Salin</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="col-span-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Unduh data dalam format CSV"
            >
              <Download className="w-3 h-3 shrink-0" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="col-span-4 sm:col-span-1 px-3 py-1.5 text-xs font-extrabold text-white bg-emerald-800 hover:bg-emerald-900 border border-emerald-400/40 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Cetak Laporan Format Pas 2 Halaman A4"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak (2 Halaman)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DOKUMEN CETAK RESMI FORMAT PAS 2 HALAMAN (PRINT MODE SAJA)            */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-slate-900 bg-white">
        
        {/* ----------------------------------------------------------------------- */}
        {/* >>> HALAMAN 1 CETAK: KOP + 4 KPI KECIL + KATEGORI + 27 UNIT ALAT        */}
        {/* ----------------------------------------------------------------------- */}
        <div className="min-h-[960px] flex flex-col justify-between">
          <div>
            {/* Kop Laporan Resmi PPTQ Qoryatul Qur'an */}
            <div className="text-center pb-2 mb-2 border-b-2 border-double border-slate-900">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-600">
                Laporan Pertanggungjawaban Inventarisasi Sarana & Prasarana Media
              </div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                {settings.pesantrenName || "PPTQ Qoryatul Qur'an"}
              </h2>
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                {settings.mediaTeamName || "Qoryah TV (Biro Media & Dokumentasi)"}
              </h3>
              <div className="text-[9px] text-slate-600 flex items-center justify-center gap-2 mt-0.5 font-medium">
                <span>Periode: <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong></span>
                <span>·</span>
                <span>Lokasi Penyimpanan: <strong>{settings.defaultPickupLocation || "Kantor Media"}</strong></span>
                <span>·</span>
                <span>WhatsApp Admin: <strong>{settings.mediaLeaderPhone || "081515509831"}</strong></span>
              </div>
            </div>

            {/* Bagian 1: 4 Kotak KPI Ringkas (Horizontal 1 Baris, Super Kompak) */}
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              <div className="border border-slate-300 rounded-lg p-1.5 text-center bg-slate-50">
                <div className="text-[8.5px] uppercase font-bold text-slate-500">Total Inventaris</div>
                <div className="text-base font-black text-slate-900 font-mono leading-tight">{totalItemsCount}</div>
                <div className="text-[8px] text-slate-500">7 Kategori Aktif</div>
              </div>
              <div className="border border-emerald-300 rounded-lg p-1.5 text-center bg-emerald-50/50">
                <div className="text-[8.5px] uppercase font-bold text-emerald-800">Kondisi Baik</div>
                <div className="text-base font-black text-emerald-700 font-mono leading-tight">
                  {goodConditionCount} <span className="text-[9px] font-bold text-emerald-800">({readinessPercent}%)</span>
                </div>
                <div className="text-[8px] text-emerald-600">Siap Operasional</div>
              </div>
              <div className="border border-amber-300 rounded-lg p-1.5 text-center bg-amber-50/50">
                <div className="text-[8.5px] uppercase font-bold text-amber-800">Perlu Servis</div>
                <div className="text-base font-black text-amber-700 font-mono leading-tight">{needsServiceCount}</div>
                <div className="text-[8px] text-amber-700">Perawatan Ringan</div>
              </div>
              <div className="border border-rose-300 rounded-lg p-1.5 text-center bg-rose-50/50">
                <div className="text-[8.5px] uppercase font-bold text-rose-800">Kondisi Rusak</div>
                <div className="text-base font-black text-rose-700 font-mono leading-tight">{brokenCount}</div>
                <div className="text-[8px] text-rose-700">Perbaikan Teknisi</div>
              </div>
            </div>

            {/* Bagian 2: Rekapitulasi Fisik per Kategori (Tabel Kompak) */}
            <div className="mb-2">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>1. Rekapitulasi Kondisi Fisik Alat per Kategori</span>
                <span className="text-[9px] text-slate-500 font-normal">Kesiapan: {readinessPercent}%</span>
              </div>
              <table className="w-full text-left text-[9px] border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[8.5px]">
                  <tr>
                    <th className="py-0.5 px-1.5">Kategori Alat</th>
                    <th className="py-0.5 px-1.5 text-center">Total</th>
                    <th className="py-0.5 px-1.5 text-center">Baik</th>
                    <th className="py-0.5 px-1.5 text-center">Servis</th>
                    <th className="py-0.5 px-1.5 text-center">Rusak</th>
                    <th className="py-0.5 px-1.5 text-right">Kesiapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categoryStats.map((cat) => {
                    const pct = cat.total > 0 ? Math.round((cat.good / cat.total) * 100) : 100;
                    return (
                      <tr key={cat.category} className="leading-tight">
                        <td className="py-0.5 px-1.5 font-semibold text-slate-800">{cat.category}</td>
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900">{cat.total}</td>
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-emerald-700">{cat.good}</td>
                        <td className="py-0.5 px-1.5 text-center font-mono text-amber-700 font-bold">{cat.service > 0 ? cat.service : '-'}</td>
                        <td className="py-0.5 px-1.5 text-center font-mono text-rose-700 font-bold">{cat.broken > 0 ? cat.broken : '-'}</td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-700">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bagian 3: Daftar Alat Bermasalah & Catatan Servis (Tabel Kompak, Bukan Card Raksasa) */}
            {problematicItems.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-amber-900 mb-0.5 flex items-center justify-between">
                  <span>2. Catatan Alat yang Memerlukan Servis / Perawatan ({problematicItems.length} Unit)</span>
                  <span className="text-[8.5px] font-normal text-amber-800">Prioritas Perbaikan</span>
                </div>
                <table className="w-full text-left text-[8.5px] border border-amber-300 bg-amber-50/20">
                  <thead className="bg-amber-100/70 font-bold text-amber-950 border-b border-amber-300 uppercase text-[8px]">
                    <tr>
                      <th className="py-0.5 px-1.5 w-16">Kode</th>
                      <th className="py-0.5 px-1.5">Nama Alat</th>
                      <th className="py-0.5 px-1.5">Kategori</th>
                      <th className="py-0.5 px-1.5 text-center w-20">Kondisi</th>
                      <th className="py-0.5 px-1.5">Catatan Kendala Fisik / Sparepart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {problematicItems.map((item) => (
                      <tr key={item.id} className="leading-tight">
                        <td className="py-0.5 px-1.5 font-mono font-bold text-slate-800">{item.id}</td>
                        <td className="py-0.5 px-1.5 font-bold text-slate-900">{item.name}</td>
                        <td className="py-0.5 px-1.5 text-slate-600">{item.category}</td>
                        <td className="py-0.5 px-1.5 text-center">
                          <span className={`px-1 rounded text-[8px] font-bold ${item.condition === 'Rusak' ? 'text-rose-800' : 'text-amber-800'}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-800">{item.notes || 'Perlu pemeliharaan'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bagian 4: Tabel Rincian Semua Alat (27 Unit) - Menggunakan Split 2 Kolom Kompak */}
            <div>
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>3. Rincian Seluruh Alat Inventaris ({items.length} Unit Peralatan Media)</span>
                <span className="text-[8.5px] text-slate-500 font-mono">Kantor Media</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Kolom Kiri: Unit 1 s/d 14 */}
                <table className="w-full text-left text-[8px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 text-[7.5px] uppercase">
                    <tr>
                      <th className="py-0.5 px-1 w-6 text-center">No</th>
                      <th className="py-0.5 px-1">Nama Alat</th>
                      <th className="py-0.5 px-1">Kategori</th>
                      <th className="py-0.5 px-1 text-center">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printItemsCol1.map((item, idx) => (
                      <tr key={item.id} className="leading-none">
                        <td className="py-0.5 px-1 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-0.5 px-1 font-semibold text-slate-900 truncate max-w-[120px]">{item.name}</td>
                        <td className="py-0.5 px-1 text-slate-500 truncate max-w-[80px]">{item.category}</td>
                        <td className="py-0.5 px-1 text-center font-bold">
                          <span className={item.condition === 'Baik' ? 'text-emerald-700' : item.condition === 'Perlu Servis' ? 'text-amber-700' : 'text-rose-700'}>
                            {item.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Kolom Kanan: Unit 15 s/d 27 */}
                <table className="w-full text-left text-[8px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 text-[7.5px] uppercase">
                    <tr>
                      <th className="py-0.5 px-1 w-6 text-center">No</th>
                      <th className="py-0.5 px-1">Nama Alat</th>
                      <th className="py-0.5 px-1">Kategori</th>
                      <th className="py-0.5 px-1 text-center">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printItemsCol2.map((item, idx) => (
                      <tr key={item.id} className="leading-none">
                        <td className="py-0.5 px-1 text-center font-mono text-slate-400 font-bold">{idx + 15}</td>
                        <td className="py-0.5 px-1 font-semibold text-slate-900 truncate max-w-[120px]">{item.name}</td>
                        <td className="py-0.5 px-1 text-slate-500 truncate max-w-[80px]">{item.category}</td>
                        <td className="py-0.5 px-1 text-center font-bold">
                          <span className={item.condition === 'Baik' ? 'text-emerald-700' : item.condition === 'Perlu Servis' ? 'text-amber-700' : 'text-rose-700'}>
                            {item.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Halaman 1 */}
          <div className="pt-1 mt-1 border-t border-slate-300 flex justify-between text-[8px] text-slate-500 font-medium">
            <span>{settings.pesantrenName} · {settings.mediaTeamName}</span>
            <span>Halaman 1 dari 2</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PEMBATAS TEGAS HALAMAN CETAK A4 (PAGE BREAK TO PAGE 2)                  */}
        {/* ======================================================================= */}
        <div className="print-page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }} />

        {/* ----------------------------------------------------------------------- */}
        {/* >>> HALAMAN 2 CETAK: HISTORY KEGIATAN 2 BULAN + PEMINJAMAN + TTD       */}
        {/* ----------------------------------------------------------------------- */}
        <div className="min-h-[960px] flex flex-col justify-between pt-2">
          <div>
            {/* Header Mini Halaman 2 */}
            <div className="flex justify-between items-center pb-1 mb-2 border-b-2 border-slate-900">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900">
                  History Agenda Kegiatan & Pemakaian Alat Media
                </h3>
                <div className="text-[9px] text-slate-600">
                  {settings.pesantrenName} · {settings.mediaTeamName} (Lanjutan Laporan)
                </div>
              </div>
              <div className="text-right text-[8.5px] font-bold text-emerald-800">
                Rentang Waktu: {twoMonthsLabel}
              </div>
            </div>

            {/* Bagian 5: HISTORY AGENDA KEGIATAN TIM MEDIA 2 BULAN TERAKHIR */}
            <div className="mb-3">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>4. History Agenda & Liputan Tim Media Selama 2 Bulan Terakhir ({twoMonthsEvents.length} Kegiatan)</span>
                <span className="text-[8.5px] text-slate-500">{twoMonthsLabel}</span>
              </div>
              {twoMonthsEvents.length === 0 ? (
                <div className="text-[9px] italic text-slate-400 p-2 border border-slate-200 rounded">
                  Belum ada agenda kegiatan liputan media yang tercatat pada periode ini.
                </div>
              ) : (
                <table className="w-full text-left text-[8.5px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[8px]">
                    <tr>
                      <th className="py-0.5 px-1.5 w-6 text-center">No</th>
                      <th className="py-0.5 px-1.5 w-24">Tanggal & Jam</th>
                      <th className="py-0.5 px-1.5">Agenda Kegiatan Media</th>
                      <th className="py-0.5 px-1.5 w-24">Kategori</th>
                      <th className="py-0.5 px-1.5">Lokasi Acara</th>
                      <th className="py-0.5 px-1.5">Kru Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {twoMonthsEvents.map((evt, idx) => (
                      <tr key={evt.id} className="leading-tight">
                        <td className="py-0.5 px-1.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-0.5 px-1.5 font-medium text-slate-800 whitespace-nowrap">
                          {formatDateIndo(evt.startDate)} <span className="text-slate-400 text-[7.5px] block">{evt.startTime} WIB</span>
                        </td>
                        <td className="py-0.5 px-1.5 font-bold text-slate-900">{evt.title}</td>
                        <td className="py-0.5 px-1.5 font-semibold text-slate-700 whitespace-nowrap">{evt.category}</td>
                        <td className="py-0.5 px-1.5 text-slate-600 truncate max-w-[140px]">{evt.location}</td>
                        <td className="py-0.5 px-1.5 text-slate-600 truncate max-w-[120px]">
                          {evt.crewAssigned?.length ? evt.crewAssigned.join(', ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bagian 6: Rekapitulasi Riwayat Peminjaman & Pemakaian Alat */}
            <div className="mb-3">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>5. Rekapitulasi Riwayat Peminjaman & Pemakaian Alat ({monthlyLoans.length} Berkas)</span>
                <span className="text-[8.5px] text-slate-500 font-mono">Bulan {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
              </div>
              {monthlyLoans.length === 0 ? (
                <div className="text-[9px] italic text-slate-400 p-2 border border-slate-200 rounded">
                  Tidak ada catatan peminjaman alat pada bulan {MONTH_NAMES[selectedMonth]} {selectedYear}.
                </div>
              ) : (
                <table className="w-full text-left text-[8.5px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[8px]">
                    <tr>
                      <th className="py-0.5 px-1.5 w-18">Kode Booking</th>
                      <th className="py-0.5 px-1.5">Unit & Penanggung Jawab</th>
                      <th className="py-0.5 px-1.5 w-24">Jadwal Pakai</th>
                      <th className="py-0.5 px-1.5">Daftar Alat yang Digunakan</th>
                      <th className="py-0.5 px-1.5">Tempat Ambil</th>
                      <th className="py-0.5 px-1.5 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyLoans.map((loan) => (
                      <tr key={loan.id} className="leading-tight">
                        <td className="py-0.5 px-1.5 font-mono font-bold text-slate-800">{loan.id}</td>
                        <td className="py-0.5 px-1.5">
                          <span className="font-bold text-slate-900">{loan.unitName}</span>
                          <span className="text-[7.5px] text-slate-500 block">PJ: {loan.borrowerName}</span>
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-700 whitespace-nowrap">
                          {formatDateIndo(loan.startDate)}
                          <span className="text-[7.5px] text-emerald-700 block font-bold">
                            {calculateDurationDays(loan.startDate, loan.endDate)} Hari
                          </span>
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-800">
                          {loan.items.map((i) => i.itemName).join(', ')}
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-700 font-medium">
                          {loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-bold text-[8px]">
                          <span className={loan.status === 'Disetujui' || loan.status === 'Selesai' ? 'text-emerald-800' : 'text-amber-800'}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Bagian 7: Kolom Tanda Tangan Resmi Pengesahan Dokumen */}
          <div className="pt-2 border-t-2 border-slate-900 print-avoid-break">
            <div className="text-[9px] text-right text-slate-600 mb-2 font-medium">
              Ditetapkan di: {settings.defaultPickupLocation || "Kantor Media"}, {formatDateIndo(new Date().toISOString().split('T')[0])}
            </div>
            <div className="grid grid-cols-2 text-center text-[9.5px]">
              <div>
                <div className="text-slate-500 text-[8.5px] uppercase font-bold">Mengetahui,</div>
                <div className="font-bold text-slate-900 mt-0.5">Pimpinan Pondok Pesantren</div>
                <div className="text-[8.5px] text-slate-600">{settings.pesantrenName}</div>
                <div className="h-12 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-900 font-bold text-slate-900 pb-0.5">
                    ( ........................................ )
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-[8.5px] uppercase font-bold">Penanggung Jawab,</div>
                <div className="font-bold text-slate-900 mt-0.5">Koordinator Tim Media</div>
                <div className="text-[8.5px] text-slate-600">{settings.mediaTeamName}</div>
                <div className="h-12 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-900 font-bold text-slate-900 pb-0.5">
                    ( ........................................ )
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-slate-200 flex justify-between text-[8px] text-slate-400">
              <span>Dicetak via {settings.appTitle || "SIPAT Media"} · Resmi PPTQ Qoryatul Qur'an</span>
              <span>Halaman 2 dari 2 (Selesai)</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. TAMPILAN INTERAKTIF DI LAYAR (SCREEN MODE SAJA) - LEBIH RAMPING       */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-4">
        
        {/* TAB 1: KONDISI & DAFTAR ALAT */}
        {activeReportTab === 'inventory-condition' && (
          <div className="space-y-4">
            
            {/* KPI Cards: Lebih Ramping & Rapi */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-2xs border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Inventaris
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">{totalItemsCount}</span>
                  <span className="text-xs text-slate-500">unit</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">7 kategori peralatan aktif</p>
              </div>

              <div className="bg-emerald-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Kondisi Baik
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">{goodConditionCount}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    {readinessPercent}%
                  </span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-0.5">Siap operasional santri</p>
              </div>

              <div className="bg-amber-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-amber-200/70">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Perlu Servis
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-700">{needsServiceCount}</span>
                  <span className="text-xs text-amber-700">unit</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5">Perawatan / suku cadang</p>
              </div>

              <div className="bg-rose-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-rose-200/70">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Kondisi Rusak
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">{brokenCount}</span>
                  <span className="text-xs text-rose-700">unit</span>
                </div>
                <p className="text-[10px] text-rose-600 mt-0.5">Perbaikan teknisi</p>
              </div>
            </div>

            {/* Rekapitulasi Fisik per Kategori (Tabel Ringkas) */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Rekapitulasi Kesiapan per Kategori
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-2.5">Kategori</th>
                      <th className="py-2 px-2 text-center">Total</th>
                      <th className="py-2 px-2 text-center">Baik</th>
                      <th className="py-2 px-2 text-center">Servis</th>
                      <th className="py-2 px-2 text-center">Rusak</th>
                      <th className="py-2 px-2.5 text-right">Kesiapan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryStats.map((cat) => {
                      const pct = cat.total > 0 ? Math.round((cat.good / cat.total) * 100) : 100;
                      return (
                        <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 px-2.5 font-bold text-slate-800 text-[11px]">{cat.category}</td>
                          <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-900 text-[11px]">{cat.total}</td>
                          <td className="py-1.5 px-2 text-center font-mono text-emerald-700 font-bold text-[11px]">{cat.good}</td>
                          <td className="py-1.5 px-2 text-center font-mono text-amber-700 font-bold text-[11px]">{cat.service > 0 ? cat.service : '-'}</td>
                          <td className="py-1.5 px-2 text-center font-mono text-rose-700 font-bold text-[11px]">{cat.broken > 0 ? cat.broken : '-'}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[11px] text-slate-700">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Problematic Items Callout */}
            {problematicItems.length > 0 && (
              <div className="bg-amber-50/70 rounded-xl p-3 sm:p-4 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Daftar Alat Bermasalah & Catatan Servis ({problematicItems.length} Unit)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {problematicItems.map((item) => (
                    <div key={item.id} className="bg-white p-2.5 rounded-lg text-xs space-y-1 border border-amber-100 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${item.condition === 'Rusak' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                          {item.condition}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10.5px]">
                        {item.category} · Lokasi: <span className="font-semibold text-slate-700">{item.location || 'Kantor Media'}</span>
                      </div>
                      {item.notes && (
                        <p className="text-slate-700 text-[10.5px] bg-amber-50/50 p-1.5 rounded mt-1 border border-amber-100">
                          <strong>Kendala:</strong> {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rincian Semua Alat (Layar) */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Tabel Rincian Seluruh Alat ({filteredAllItems.length} Unit)
                  </h3>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative min-w-[140px] sm:min-w-[180px]">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder="Cari alat..."
                      className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs py-1 px-2 rounded-lg"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table List on Screen */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center">No</th>
                      <th className="py-2 px-2.5">Kode & Nama Alat</th>
                      <th className="py-2 px-2.5">Kategori</th>
                      <th className="py-2 px-2.5">Lokasi</th>
                      <th className="py-2 px-2.5 text-center">Kondisi</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllItems.map(({ item }, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <span className="font-bold text-slate-900 text-[11px] block">{item.name}</span>
                          <span className="font-mono text-[9.5px] text-slate-400">{item.id} · {item.model}</span>
                        </td>
                        <td className="py-1.5 px-2.5 text-[11px] text-slate-600">{item.category}</td>
                        <td className="py-1.5 px-2.5 text-[11px] text-slate-600">{item.location || 'Kantor Media'}</td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            item.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' :
                            item.condition === 'Perlu Servis' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: HISTORY KEGIATAN 2 BULAN & PINJAM */}
        {activeReportTab === 'usage-loans' && (
          <div className="space-y-4">
            
            {/* Bagian History Agenda Kegiatan Tim Media Selama 2 Bulan */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>History Agenda & Liputan Media Selama 2 Bulan ({twoMonthsEvents.length} Kegiatan)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rekapitulasi seluruh agenda liputan, streaming, dan produksi media periode: <strong>{twoMonthsLabel}</strong>
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {twoMonthsEvents.length} Terlaksana
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {twoMonthsEvents.map((evt, idx) => (
                  <div key={evt.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{evt.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                        {evt.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateIndo(evt.startDate)} ({evt.startTime} WIB)
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {evt.location}
                      </span>
                      {evt.crewAssigned?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          Kru: {evt.crewAssigned.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rekapitulasi Riwayat Peminjaman Bulan Ini */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Rekap Riwayat Peminjaman Bulan Ini ({monthlyLoans.length} Berkas)</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              {monthlyLoans.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada catatan peminjaman pada bulan {MONTH_NAMES[selectedMonth]} {selectedYear}.
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyLoans.map((loan) => (
                    <div key={loan.id} className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {loan.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          loan.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          loan.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{loan.unitName} (PJ: {loan.borrowerName})</div>
                      <div className="text-[11px] text-slate-600">
                        Jadwal: {formatDateIndo(loan.startDate)} s/d {formatDateIndo(loan.endDate)} · Lokasi: <strong>{loan.pickupLocation || 'Kantor Media'}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Alat: {loan.items.map((i) => i.itemName).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
