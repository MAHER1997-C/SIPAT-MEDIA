import React, { useState, useMemo } from 'react';
import { MediaItem, LoanRequest, MediaEvent, AppSettings, ItemCategory } from '../types';
import { 
  FileSpreadsheet, Printer, Send, Copy, Check, 
  Calendar, Layers, CheckCircle2, AlertTriangle, 
  Building2, Download, Award, MapPin, Users
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
    const cats: ItemCategory[] = [
      'Kamera', 'Lensa', 'Audio & Mic', 'Lighting', 
      'Stabilizer & Tripod', 'Drone & Stream', 'Aksesoris & Kabel'
    ];
    return cats.map((cat) => {
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
  
  // Total item borrow frequency count
  const itemBorrowFrequency = useMemo(() => {
    const counts: { [itemName: string]: { count: number; category: string } } = {};
    monthlyLoans.forEach((loan) => {
      loan.items.forEach((item) => {
        if (!counts[item.itemName]) {
          counts[item.itemName] = { count: 0, category: item.category };
        }
        counts[item.itemName].count += 1;
      });
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [monthlyLoans]);

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
    
    let text = `*LAPORAN BULANAN TIM MEDIA & INVENTARIS*\n`;
    text += `_${settings.pesantrenName}_\n`;
    text += `*${settings.mediaTeamName}*\n`;
    text += `Periode: *${monthLabel}*\n\n`;

    text += `*1. REKAPITULASI KONDISI INVENTARIS ALAT MEDIA*\n`;
    text += `• Total Aset Alat: *${totalItemsCount} unit*\n`;
    text += `• Kondisi Siap Pakai (Baik): *${goodConditionCount} unit* (${readinessPercent}%)\n`;
    text += `• Perlu Servis / Perawatan: *${needsServiceCount} unit*\n`;
    text += `• Kondisi Rusak: *${brokenCount} unit*\n\n`;

    if (problematicItems.length > 0) {
      text += `_Catatan Alat Bermasalah:_\n`;
      problematicItems.forEach((i, idx) => {
        text += `  ${idx + 1}. *${i.name}* [${i.condition}] - ${i.notes || 'Perlu penanganan'}\n`;
      });
      text += `\n`;
    }

    text += `*2. REKAPITULASI PEMINJAMAN ALAT & KEGIATAN UNIT*\n`;
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

    if (itemBorrowFrequency.length > 0) {
      text += `_Alat Paling Sering Digunakan:_\n`;
      itemBorrowFrequency.slice(0, 3).forEach((it, idx) => {
        text += `  ${idx + 1}. ${it.name} (${it.count}x)\n`;
      });
      text += `\n`;
    }

    text += `_Laporan disampaikan untuk evaluasi pimpinan pondok._\n`;
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
      csvContent += "Nama Alat,Kategori,Kondisi,Catatan,Status\n";
      items.forEach((item) => {
        csvContent += `"${item.name}","${item.category}","${item.condition}","${(item.notes || '').replace(/"/g, '""')}","${item.status}"\n`;
      });
    } else {
      csvContent += "ID Pinjam,Unit Peminjam,Penanggung Jawab,No WA,Tgl Pinjam,Tgl Kembali,Jumlah Alat,Status,Keperluan\n";
      monthlyLoans.forEach((loan) => {
        csvContent += `"${loan.id}","${loan.unitName}","${loan.borrowerName}","${loan.borrowerPhone}","${loan.startDate}","${loan.endDate}","${loan.items.length}","${loan.status}","${loan.purpose.replace(/"/g, '""')}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_media_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header Card (Responsive, No Overflow, Clean Colors) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5">
              <FileSpreadsheet className="w-3 h-3 text-amber-300" />
              <span>Biro Media & Dokumentasi</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
              Laporan Bulanan
            </h1>
            <p className="text-emerald-50 text-xs mt-0.5 max-w-2xl leading-relaxed hidden sm:block">
              Rekapitulasi kondisi kesehatan inventaris peralatan dan riwayat peminjaman serta kegiatan liputan media.
            </p>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-white/20 p-1.5 rounded-2xl backdrop-blur-xs self-start md:self-auto shrink-0">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls Bar - Full responsive on Mobile & Desktop */}
        <div className="relative z-10 mt-4 sm:mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Responsive Tabs: 2 Equal Columns on Mobile, Never Cut Off */}
          <div className="grid grid-cols-2 w-full sm:w-auto bg-white/15 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setActiveReportTab('inventory-condition')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${
                activeReportTab === 'inventory-condition'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Kondisi Alat
            </button>
            <button
              onClick={() => setActiveReportTab('usage-loans')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all text-center truncate ${
                activeReportTab === 'usage-loans'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Pinjam & Kegiatan ({monthlyLoans.length})
            </button>
          </div>

          {/* Action Buttons: Responsive Grid on Mobile so 'Cetak' is never cut off */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={handleSendToWhatsApp}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
              title="Kirim ringkasan laporan ke WhatsApp Pengasuh/Pimpinan"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Kirim WA</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="col-span-1 px-2.5 py-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center gap-1"
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
              className="col-span-1 px-2.5 py-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl transition-colors flex items-center justify-center gap-1"
              title="Unduh data dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="col-span-4 sm:col-span-1 px-3 py-2 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center gap-1"
              title="Cetak laporan"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT 1: REKAP KONDISI ALAT */}
      {activeReportTab === 'inventory-condition' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Inventaris
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">{totalItemsCount}</span>
                <span className="text-xs text-slate-500">unit</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">7 kategori peralatan</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Kondisi Baik
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-700">{goodConditionCount}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                  {readinessPercent}%
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Siap operasional</p>
            </div>

            <div className="bg-amber-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Perlu Servis
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-700">{needsServiceCount}</span>
                <span className="text-xs text-amber-700">unit</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">Perawatan / suku cadang</p>
            </div>

            <div className="bg-rose-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Kondisi Rusak
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-rose-700">{brokenCount}</span>
                <span className="text-xs text-rose-700">unit</span>
              </div>
              <p className="text-[10px] text-rose-600 mt-1">Perbaikan teknisi</p>
            </div>
          </div>

          {/* Breakdown per Kategori */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Rekapitulasi Fisik per Kategori
                </h3>
                <p className="text-xs text-slate-500">
                  Rincian kesiapan peralatan audio, visual, lighting, dan rigging studio.
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
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-center">Total</th>
                    <th className="py-3 px-3 text-center">Baik</th>
                    <th className="py-3 px-3 text-center">Servis</th>
                    <th className="py-3 px-3 text-center">Rusak</th>
                    <th className="py-3 px-3 text-right">Kesiapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryStats.map((cat) => {
                    const pct = cat.total > 0 ? Math.round((cat.good / cat.total) * 100) : 100;
                    return (
                      <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800">{cat.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-900">{cat.total}</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold">{cat.good}</td>
                        <td className="py-3 px-3 text-center font-mono text-amber-700 font-bold">
                          {cat.service > 0 ? cat.service : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">
                          {cat.broken > 0 ? cat.broken : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
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
            <p className="text-[10px] text-slate-400 text-right sm:hidden">Geser ke kanan untuk melihat tabel lengkap →</p>
          </div>

          {/* Problematic Items Callout */}
          {problematicItems.length > 0 && (
            <div className="bg-amber-50/70 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                  Daftar Alat Bermasalah & Catatan Servis Bulan Ini
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                {problematicItems.map((item) => (
                  <div key={item.id} className="bg-white p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        item.condition === 'Rusak' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Kategori: <span className="font-semibold text-slate-700">{item.category}</span>
                    </div>
                    {item.notes && (
                      <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-xl mt-1 leading-relaxed">
                        Kendala: {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT CONTENT 2: REKAP PENGGUNAAN, PEMINJAMAN & KEGIATAN */}
      {activeReportTab === 'usage-loans' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Peminjaman
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">{totalLoansInMonth}</span>
                <span className="text-xs text-slate-500">kali</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Disetujui
              </span>
              <div className="flex items-baseline gap-1.5 mt-1 sm:mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-700">{approvedLoansCount}</span>
                <span className="text-xs text-emerald-600">berkas</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Realisasi peminjaman</p>
            </div>

            <div className="bg-amber-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Unit Teraktif
              </span>
              <div className="mt-1 sm:mt-2">
                <span className="text-xs sm:text-sm font-extrabold text-amber-950 truncate block">
                  {unitBorrowFrequency[0]?.unit || '-'}
                </span>
                <span className="text-[11px] font-semibold text-amber-700">
                  {unitBorrowFrequency[0] ? `${unitBorrowFrequency[0].count}x pinjam` : 'Belum ada'}
                </span>
              </div>
            </div>

            <div className="bg-sky-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
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
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Frekuensi Pinjam Berdasarkan Unit</span>
              </h4>
              {unitBorrowFrequency.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada peminjaman di bulan ini.</p>
              ) : (
                <div className="space-y-2">
                  {unitBorrowFrequency.map((u, idx) => (
                    <div key={u.unit} className="flex items-center justify-between text-xs p-2.5 sm:p-3 bg-slate-50 rounded-2xl">
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
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Peralatan Paling Sering Digunakan</span>
              </h4>
              {itemBorrowFrequency.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada peminjaman di bulan ini.</p>
              ) : (
                <div className="space-y-2">
                  {itemBorrowFrequency.slice(0, 5).map((it, idx) => (
                    <div key={it.name} className="flex items-center justify-between text-xs p-2.5 sm:p-3 bg-amber-50/60 rounded-2xl">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-400 text-emerald-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{it.name}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-800 shrink-0">{it.count} kali</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Rekapitulasi Riwayat Peminjaman (Mobile Card View + Desktop Table) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Rekap Riwayat Peminjaman Bulan Ini
              </h3>
              <span className="text-xs text-slate-500">
                {monthlyLoans.length} berkas
              </span>
            </div>

            {monthlyLoans.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada catatan peminjaman pada periode {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </div>
            ) : (
              <>
                {/* Mobile View: Clean, readable cards - no cutoff! */}
                <div className="space-y-3 sm:hidden">
                  {monthlyLoans.map((loan) => (
                    <div key={loan.id} className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded-lg shadow-2xs">
                          {loan.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl">
                        <div className="font-semibold text-slate-700">Jadwal:</div>
                        <div>{formatDateIndo(loan.startDate)} s/d {formatDateIndo(loan.endDate)}</div>
                      </div>

                      {loan.pickupLocation && (
                        <div className="text-[11px] text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Lokasi Pengambilan: <strong>{loan.pickupLocation}</strong></span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800">{loan.items.length} alat: </span>
                        <span>{loan.items.map((i) => i.itemName).join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table with scroll container */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3">Kode Booking</th>
                        <th className="py-3 px-3">Unit & Penanggung Jawab</th>
                        <th className="py-3 px-3">Jadwal Penggunaan</th>
                        <th className="py-3 px-3">Daftar Alat</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{loan.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{loan.unitName}</div>
                            <div className="text-[11px] text-slate-500">PJ: {loan.borrowerName} ({loan.borrowerPhone})</div>
                            {loan.pickupLocation && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{loan.pickupLocation}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <div>{formatDateIndo(loan.startDate)}</div>
                            <div className="text-[11px] text-slate-400">s/d {formatDateIndo(loan.endDate)}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span className="font-semibold text-slate-900">{loan.items.length} alat:</span>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {loan.items.map((i) => i.itemName).join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-3">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Section: Rekapitulasi Agenda Kegiatan & Liputan Bulan Ini */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rekap Kegiatan & Liputan Media Bulan Ini</span>
              </h3>
              <span className="text-xs text-slate-500">
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
                  <div key={evt.id} className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2">
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
