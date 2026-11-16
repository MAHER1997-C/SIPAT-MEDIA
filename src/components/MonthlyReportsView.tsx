import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MediaItem,
  LoanRequest,
  MediaEvent,
  AppSettings,
  ItemCategory,
  SocialMediaMonthlyReport,
} from '../types';
import {
  Printer,
  Send,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Download,
  MapPin,
  Users,
  Search,
  Clock,
  Box,
  TrendingUp,
  Video,
  FileImage,
  RefreshCw,
  Upload,
  Edit3,
  Plus,
  Minus,
  Save,
  Shield,
  X,
  ExternalLink,
  HelpCircle,
  Key,
  RotateCcw,
} from 'lucide-react';
import { formatDateIndo, openWhatsAppDirect, copyToClipboard } from '../utils/whatsapp';
import { fetchSocialBotApiStatus, SocialBotApiStatus } from '../services/api';

interface MonthlyReportsViewProps {
  items: MediaItem[];
  loans: LoanRequest[];
  events: MediaEvent[];
  settings: AppSettings;
  socialReports: SocialMediaMonthlyReport[];
  isAdmin: boolean;
  onSaveSocialReport: (report: SocialMediaMonthlyReport) => Promise<boolean | void> | void;
  onBotFetchSocialReport: (payload: {
    id: string;
    month: number;
    year: number;
    igAccount: string;
    ttAccount: string;
    currentReport?: Partial<SocialMediaMonthlyReport>;
    prevReport?: Partial<SocialMediaMonthlyReport>;
  }) => Promise<{
    report: SocialMediaMonthlyReport;
    botMessage: string;
    verified?: boolean;
    apiStatus?: SocialBotApiStatus;
  }>;
  onBotParseSocialInsight: (payload: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    currentReport: SocialMediaMonthlyReport;
  }) => Promise<{ report: SocialMediaMonthlyReport; botMessage: string }>;
  onOpenAdminAuth?: () => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const AVAILABLE_YEARS = Array.from({ length: 18 }, (_, i) => 2023 + i);

const ALL_CATEGORIES: ItemCategory[] = [
  'Kamera',
  'Lensa',
  'Audio & Mic',
  'Lighting',
  'Stabilizer & Tripod',
  'Drone & Stream',
  'Aksesoris & Kabel',
];

function makeMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  items,
  loans,
  events,
  settings,
  socialReports,
  isAdmin,
  onSaveSocialReport,
  onBotFetchSocialReport,
  onBotParseSocialInsight,
  onOpenAdminAuth,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeReportTab, setActiveReportTab] = useState<
    'inventory-condition' | 'usage-loans' | 'social-media'
  >('inventory-condition');
  const [copiedText, setCopiedText] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const printDocumentRef = useRef<HTMLDivElement>(null);

  // Filters for Screen View
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedConditionFilter] = useState<string>('Semua');

  // 2-Month Window Calculation (Bulan Terpilih + 1 Bulan Sebelumnya)
  const prevMonthIndex = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYearNumber = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const twoMonthsLabel = `${MONTH_NAMES[prevMonthIndex]} ${prevYearNumber} – ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  const currentPeriodId = makeMonthKey(selectedYear, selectedMonth);
  const prevPeriodId = makeMonthKey(prevYearNumber, prevMonthIndex);

  // Find current month's social media report or build a sensible default from latest/previous report
  const prevMonthSocialReport = useMemo(() => {
    return socialReports.find((r) => r.id === prevPeriodId);
  }, [socialReports, prevPeriodId]);

  const currentSocialReport = useMemo<SocialMediaMonthlyReport>(() => {
    const found = socialReports.find(
      (r) => r.id === currentPeriodId || (r.month === selectedMonth && r.year === selectedYear)
    );
    if (found) return found;

    return {
      id: currentPeriodId,
      month: selectedMonth,
      year: selectedYear,
      producedVideosCount: 0,
      producedFlyersCount: 0,
      unUploadedFlyersCount: 0,
      productionNotes:
        'Silakan unggah Screenshot Insight @pondokqq, hubungkan API Resmi, atau input manual jumlah Video & Flyer.',
      igAccount: '@pondokqq',
      igFollowers: prevMonthSocialReport?.igFollowers ?? 0,
      igFollowersGrowth: 0,
      igPostsCount: 0,
      igTotalViews: 0,
      igTopContentTitle: '-',
      igTopContentViews: 0,
      igTopContentUrl: 'https://www.instagram.com/pondokqq',
      ttAccount: '@pondokqq',
      ttFollowers: prevMonthSocialReport?.ttFollowers ?? 0,
      ttFollowersGrowth: 0,
      ttPostsCount: 0,
      ttTotalViews: 0,
      ttTopContentTitle: '-',
      ttTopContentViews: 0,
      ttTopContentUrl: 'https://www.tiktok.com/@pondokqq',
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };
  }, [socialReports, currentPeriodId, selectedMonth, selectedYear, prevMonthSocialReport]);

  // State for editing Social Media & Content Production
  const [socialDraft, setSocialDraft] = useState<SocialMediaMonthlyReport>(currentSocialReport);
  const [isSocialEditModalOpen, setIsSocialEditModalOpen] = useState(false);
  const [isBotScanModalOpen, setIsBotScanModalOpen] = useState(false);
  const [isApiGuideModalOpen, setIsApiGuideModalOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<SocialBotApiStatus | null>(null);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState<string>('');
  const [botStatusIsWarning, setBotStatusIsWarning] = useState<boolean>(false);
  const [botRawTextInput, setBotRawTextInput] = useState<string>('');
  const [botImagePreview, setBotImagePreview] = useState<string>('');
  const [botImageMime, setBotImageMime] = useState<string>('image/png');

  // Keep socialDraft synced when selected month/year or cloud report changes (unless modal is open)
  useEffect(() => {
    if (!isSocialEditModalOpen && !isBotScanModalOpen) {
      setSocialDraft(currentSocialReport);
    }
  }, [currentSocialReport, isSocialEditModalOpen, isBotScanModalOpen]);

  // Load API configuration status when viewing social media tab
  useEffect(() => {
    if (activeReportTab === 'social-media' || isApiGuideModalOpen) {
      fetchSocialBotApiStatus().then((st) => {
        if (st) setApiStatus(st);
      });
    }
  }, [activeReportTab, isApiGuideModalOpen]);

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
    return events
      .filter((evt) => {
        const d = new Date(evt.startDate);
        const m = d.getMonth();
        const y = d.getFullYear();
        const isCurrent = m === selectedMonth && y === selectedYear;
        const isPrev = m === prevMonthIndex && y === prevYearNumber;
        return isCurrent || isPrev;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events, selectedMonth, selectedYear, prevMonthIndex, prevYearNumber]);

  // Inventory Condition Metrics
  const totalItemsCount = items.length;
  const goodConditionCount = items.filter((i) => i.condition === 'Baik').length;
  const needsServiceCount = items.filter((i) => i.condition === 'Perlu Servis').length;
  const brokenCount = items.filter((i) => i.condition === 'Rusak').length;
  const readinessPercent =
    totalItemsCount > 0 ? Math.round((goodConditionCount / totalItemsCount) * 100) : 0;

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
    return items
      .map((item) => {
        const itemLoans = monthlyLoans.filter((loan) =>
          loan.items.some(
            (borrowed) =>
              borrowed.itemId === item.id ||
              borrowed.itemName.toLowerCase() === item.name.toLowerCase()
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
      })
      .sort((a, b) => b.totalTimes - a.totalTimes);
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

      const matchCategory =
        selectedCategoryFilter === 'Semua' || item.category === selectedCategoryFilter;
      const matchCondition =
        selectedConditionFilter === 'Semua' || item.condition === selectedConditionFilter;

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

  // Compute effective followers growth vs previous month if available
  const computedIgGrowth = useMemo(() => {
    if (prevMonthSocialReport && prevMonthSocialReport.igFollowers > 0) {
      return currentSocialReport.igFollowers - prevMonthSocialReport.igFollowers;
    }
    return currentSocialReport.igFollowersGrowth;
  }, [currentSocialReport, prevMonthSocialReport]);

  const computedTtGrowth = useMemo(() => {
    if (prevMonthSocialReport && prevMonthSocialReport.ttFollowers > 0) {
      return currentSocialReport.ttFollowers - prevMonthSocialReport.ttFollowers;
    }
    return currentSocialReport.ttFollowersGrowth;
  }, [currentSocialReport, prevMonthSocialReport]);

  // Quick update handler for Video & Flyer production counts
  const handleQuickSaveProductionCounts = async (
    nextVideos: number,
    nextFlyers: number,
    nextUnuploadedFlyers?: number
  ) => {
    const updatedReport: SocialMediaMonthlyReport = {
      ...currentSocialReport,
      id: currentPeriodId,
      month: selectedMonth,
      year: selectedYear,
      producedVideosCount: Math.max(0, nextVideos),
      producedFlyersCount: Math.max(0, nextFlyers),
      unUploadedFlyersCount:
        nextUnuploadedFlyers !== undefined
          ? Math.max(0, nextUnuploadedFlyers)
          : currentSocialReport.unUploadedFlyersCount,
      updatedAt: new Date().toISOString(),
    };
    setSocialDraft(updatedReport);
    setIsSavingSocial(true);
    try {
      await onSaveSocialReport(updatedReport);
      setBotStatusMessage(
        `Jumlah produksi konten (${updatedReport.producedVideosCount} Video, ${updatedReport.producedFlyersCount} Flyer) berhasil disimpan ke Supabase.`
      );
      setTimeout(() => setBotStatusMessage(''), 4000);
    } finally {
      setIsSavingSocial(false);
    }
  };

  // Run Bot 1: Fetch public profile stats by username / Official API
  const handleRunBotUsernameSync = async () => {
    setIsBotLoading(true);
    setBotStatusIsWarning(false);
    setBotStatusMessage('Bot sedang memeriksa API Resmi & profil @pondokqq...');
    try {
      const res = await onBotFetchSocialReport({
        id: currentPeriodId,
        month: selectedMonth,
        year: selectedYear,
        igAccount: socialDraft.igAccount || '@pondokqq',
        ttAccount: socialDraft.ttAccount || '@pondokqq',
        currentReport: socialDraft,
        prevReport: prevMonthSocialReport,
      });
      setSocialDraft(res.report);
      if (res.apiStatus) setApiStatus(res.apiStatus);
      setBotStatusIsWarning(res.verified === false);
      setBotStatusMessage(res.botMessage);
    } catch (err: any) {
      setBotStatusIsWarning(true);
      setBotStatusMessage(err?.message || 'Gagal menjalankan sinkronisasi Bot.');
    } finally {
      setIsBotLoading(false);
    }
  };

  // Reset current month social report to 0 & @pondokqq (clears any old sample data)
  const handleResetSocialReportToZero = async () => {
    const cleanReport: SocialMediaMonthlyReport = {
      id: currentPeriodId,
      month: selectedMonth,
      year: selectedYear,
      producedVideosCount: 0,
      producedFlyersCount: 0,
      unUploadedFlyersCount: 0,
      productionNotes: 'Silakan unggah Screenshot Insight @pondokqq atau input manual.',
      igAccount: '@pondokqq',
      igFollowers: 0,
      igFollowersGrowth: 0,
      igPostsCount: 0,
      igTotalViews: 0,
      igTopContentTitle: '-',
      igTopContentViews: 0,
      igTopContentUrl: 'https://www.instagram.com/pondokqq',
      ttAccount: '@pondokqq',
      ttFollowers: 0,
      ttFollowersGrowth: 0,
      ttPostsCount: 0,
      ttTotalViews: 0,
      ttTopContentTitle: '-',
      ttTopContentViews: 0,
      ttTopContentUrl: 'https://www.tiktok.com/@pondokqq',
      updatedAt: new Date().toISOString(),
      source: 'manual',
    };
    setSocialDraft(cleanReport);
    setIsSavingSocial(true);
    try {
      await onSaveSocialReport(cleanReport);
      setBotStatusIsWarning(false);
      setBotStatusMessage(
        `Data bulan ${MONTH_NAMES[selectedMonth]} ${selectedYear} telah di-reset ke 0 dengan akun @pondokqq.`
      );
    } finally {
      setIsSavingSocial(false);
    }
  };

  // Handle Screenshot file upload for Bot 2
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBotImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBotImagePreview((ev.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  // Run Bot 2: Parse uploaded screenshot / raw text with AI Vision Bot
  const handleRunBotInsightParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botImagePreview && !botRawTextInput.trim()) return;
    setIsBotLoading(true);
    try {
      const res = await onBotParseSocialInsight({
        imageBase64: botImagePreview || undefined,
        mimeType: botImageMime,
        rawText: botRawTextInput.trim() || undefined,
        currentReport: socialDraft,
      });
      setSocialDraft(res.report);
      await onSaveSocialReport(res.report);
      setBotStatusMessage(res.botMessage);
      setIsBotScanModalOpen(false);
      setBotImagePreview('');
      setBotRawTextInput('');
    } catch (err: any) {
      setBotStatusMessage(err?.message || 'Bot gagal mengekstrak data dari screenshot/teks.');
    } finally {
      setIsBotLoading(false);
    }
  };

  // Save full manual/edited social media report
  const handleSaveFullSocialModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSocial(true);
    try {
      const reportToSave: SocialMediaMonthlyReport = {
        ...socialDraft,
        id: currentPeriodId,
        month: selectedMonth,
        year: selectedYear,
        igFollowersGrowth:
          prevMonthSocialReport && prevMonthSocialReport.igFollowers > 0
            ? socialDraft.igFollowers - prevMonthSocialReport.igFollowers
            : socialDraft.igFollowersGrowth,
        ttFollowersGrowth:
          prevMonthSocialReport && prevMonthSocialReport.ttFollowers > 0
            ? socialDraft.ttFollowers - prevMonthSocialReport.ttFollowers
            : socialDraft.ttFollowersGrowth,
        updatedAt: new Date().toISOString(),
      };
      await onSaveSocialReport(reportToSave);
      setIsSocialEditModalOpen(false);
      setBotStatusMessage('Data perkembangan medsos & produksi konten berhasil disimpan ke Supabase!');
      setTimeout(() => setBotStatusMessage(''), 4000);
    } finally {
      setIsSavingSocial(false);
    }
  };

  // Generate WhatsApp Monthly Recap Message (Includes Section 4: Social Media & Video/Flyer Production)
  const generateMonthlySummaryWhatsApp = (): string => {
    const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

    let text = `*LAPORAN RESMI INVENTARIS, AGENDA & MEDSOS TIM MEDIA*\n`;
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
    text += `\n`;

    const igSign = computedIgGrowth >= 0 ? `+${computedIgGrowth.toLocaleString('id-ID')}` : computedIgGrowth.toLocaleString('id-ID');
    const ttSign = computedTtGrowth >= 0 ? `+${computedTtGrowth.toLocaleString('id-ID')}` : computedTtGrowth.toLocaleString('id-ID');

    text += `*4. PERKEMBANGAN MEDIA SOSIAL & PRODUKSI KONTEN*\n`;
    text += `*Jumlah Produksi Konten:*\n`;
    text += `• Video: *${currentSocialReport.producedVideosCount} konten*\n`;
    text += `• Flyer: *${currentSocialReport.producedFlyersCount} desain* (termasuk ${currentSocialReport.unUploadedFlyersCount || 0} flyer internal/tidak terupload)\n\n`;

    text += `*Instagram (${currentSocialReport.igAccount}):*\n`;
    text += `• Followers: *${currentSocialReport.igFollowers.toLocaleString('id-ID')}* (${igSign} bulan ini)\n`;
    text += `• Konten Terupload: *${currentSocialReport.igPostsCount} postingan* · Total Views: *${currentSocialReport.igTotalViews.toLocaleString('id-ID')}*\n`;
    if (currentSocialReport.igTopContentTitle) {
      text += `• Konten Terpopuler: _"${currentSocialReport.igTopContentTitle}"_ (${currentSocialReport.igTopContentViews.toLocaleString('id-ID')} views)\n`;
    }
    text += `\n`;

    text += `*TikTok (${currentSocialReport.ttAccount}):*\n`;
    text += `• Followers: *${currentSocialReport.ttFollowers.toLocaleString('id-ID')}* (${ttSign} bulan ini)\n`;
    text += `• Konten Terupload: *${currentSocialReport.ttPostsCount} video* · Total Views: *${currentSocialReport.ttTotalViews.toLocaleString('id-ID')}*\n`;
    if (currentSocialReport.ttTopContentTitle) {
      text += `• Konten Terpopuler: _"${currentSocialReport.ttTopContentTitle}"_ (${currentSocialReport.ttTopContentViews.toLocaleString('id-ID')} views)\n`;
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

  const executeDirectPrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Direct window.print warning:', err);
    }
  };

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      executeDirectPrint();
    }, 250);
  };

  const handleDownloadPrintableHtml = () => {
    if (!printDocumentRef.current) return;
    const contentHtml = printDocumentRef.current.innerHTML;
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan Resmi Media - ${MONTH_NAMES[selectedMonth]} ${selectedYear}</title>
  ${styleTags}
  <style>
    body { background: #f1f5f9; margin: 0; padding: 16px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .print-toolbar { max-width: 210mm; margin: 0 auto 16px auto; background: #064e3b; color: white; padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    .print-toolbar button { background: #fcd34d; color: #064e3b; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; }
    .a4-wrapper { max-width: 210mm; margin: 0 auto; background: white; padding: 8mm; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    @media print {
      body { background: white !important; padding: 0 !important; }
      .print-toolbar { display: none !important; }
      .a4-wrapper { max-width: none !important; box-shadow: none !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div><strong>Laporan Resmi ${settings.pesantrenName}</strong> · ${MONTH_NAMES[selectedMonth]} ${selectedYear}</div>
    <button onclick="window.print()">Cetak / Simpan PDF (Ctrl+P)</button>
  </div>
  <div class="a4-wrapper">
    ${contentHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Resmi_Media_${MONTH_NAMES[selectedMonth]}_${selectedYear}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent +=
      'ID Alat,Nama Alat,Kategori,Merk,Model,No Seri,Lokasi Simpan,Kondisi Fisik,Status Ketersediaan,Catatan\n';
    items.forEach((item) => {
      csvContent += `"${item.id}","${item.name}","${item.category}","${item.brand}","${item.model}","${item.serialNumber}","${item.location || 'Kantor Media'}","${item.condition}","${item.status}","${(item.notes || '').replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `laporan_media_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`
    );
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
          .sipat-print-only {
            display: block !important;
            visibility: visible !important;
          }
          .sipat-screen-only {
            display: none !important;
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
          .a4-sheet-preview {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 2. MENU ATAS (LAYAR NORMAL) - OTOMATIS HILANG DI CETAKAN                 */}
      {/* ========================================================================= */}
      <div className="sipat-screen-only bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">
              <span>Biro Media & Dokumentasi</span>
            </div>
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white">
              Laporan Bulanan, Liputan & Progres Medsos
            </h1>
            <p className="text-emerald-50 text-xs mt-0.5">
              {settings.pesantrenName} · {settings.mediaTeamName} · Periode{' '}
              {MONTH_NAMES[selectedMonth]} {selectedYear}
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
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-emerald-950 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-3 pt-3 border-t border-white/20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Responsive 3 Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 w-full lg:w-auto bg-white/15 p-1 rounded-xl gap-1">
            <button
              onClick={() => {
                setIsPrintPreviewOpen(false);
                setActiveReportTab('inventory-condition');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                !isPrintPreviewOpen && activeReportTab === 'inventory-condition'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              1. Kondisi Alat ({items.length})
            </button>
            <button
              onClick={() => {
                setIsPrintPreviewOpen(false);
                setActiveReportTab('usage-loans');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                !isPrintPreviewOpen && activeReportTab === 'usage-loans'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              2. History Liputan & Pinjam ({twoMonthsEvents.length})
            </button>
            <button
              onClick={() => {
                setIsPrintPreviewOpen(false);
                setActiveReportTab('social-media');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate cursor-pointer flex items-center justify-center gap-1.5 ${
                !isPrintPreviewOpen && activeReportTab === 'social-media'
                  ? 'bg-amber-300 text-emerald-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>3. Progres Medsos & Konten</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 w-full lg:w-auto shrink-0">
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
              className={`col-span-4 sm:col-span-1 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                isPrintPreviewOpen
                  ? 'bg-amber-300 text-emerald-950'
                  : 'text-white bg-emerald-800 hover:bg-emerald-900 border border-emerald-400/40'
              }`}
              title="Tampilkan & Cetak Laporan Format Pas 2 Halaman A4"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak (2 Halaman)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2B. BAR PRATINJAU CETAK (MUNCUL SAAT TOMBOL CETAK DIKLIK DI LAYAR)        */}
      {/* ========================================================================= */}
      {isPrintPreviewOpen && (
        <div className="sipat-screen-only bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Mode Lembar Cetak Resmi A4 (2 Halaman)
            </span>
            <p className="text-xs text-slate-200 mt-0.5">
              Dokumen laporan 2 halaman sudah tampil di bawah. Klik <strong>Dialog Cetak Browser</strong> (atau tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[11px]">Ctrl+P</kbd>), atau klik <strong>Unduh File Cetak A4</strong> jika browser memblokir pop-up cetak.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={executeDirectPrint}
              className="px-3.5 py-2 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Buka Dialog Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPrintableHtml}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File Cetak A4 (.html)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintPreviewOpen(false)}
              className="px-3 py-2 text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup Pratinjau</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DOKUMEN CETAK RESMI FORMAT PAS 2 HALAMAN (TAMPIL SAAT CETAK/PRATINJAU) */}
      {/* ========================================================================= */}
      <div
        ref={printDocumentRef}
        className={`sipat-print-only text-slate-900 ${
          isPrintPreviewOpen
            ? 'block a4-sheet-preview bg-white rounded-2xl p-5 sm:p-8 shadow-lg border border-slate-300 max-w-[215mm] mx-auto space-y-6 print:space-y-0'
            : 'hidden print:block bg-white'
        }`}
      >
        {/* ----------------------------------------------------------------------- */}
        {/* >>> HALAMAN 1 CETAK: KOP + 4 KPI KECIL + KATEGORI + 27 UNIT ALAT        */}
        {/* ----------------------------------------------------------------------- */}
        <div className="min-h-[960px] flex flex-col justify-between">
          <div>
            {/* Kop Laporan Resmi PPTQ Qoryatul Qur'an */}
            <div className="text-center pb-2 mb-2 border-b-2 border-double border-slate-900">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-600">
                Laporan Pertanggungjawaban Inventarisasi Sarana, Liputan & Media Sosial
              </div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                {settings.pesantrenName || "PPTQ Qoryatul Qur'an"}
              </h2>
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                {settings.mediaTeamName || 'Qoryah TV (Biro Media & Dokumentasi)'}
              </h3>
              <div className="text-[9px] text-slate-600 flex items-center justify-center gap-2 mt-0.5 font-medium">
                <span>
                  Periode: <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong>
                </span>
                <span>·</span>
                <span>
                  Lokasi Penyimpanan: <strong>{settings.defaultPickupLocation || 'Kantor Media'}</strong>
                </span>
                <span>·</span>
                <span>
                  WhatsApp Admin: <strong>{settings.mediaLeaderPhone || '081515509831'}</strong>
                </span>
              </div>
            </div>

            {/* Bagian 1: 4 Kotak KPI Ringkas (Horizontal 1 Baris, Super Kompak) */}
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              <div className="border border-slate-300 rounded-lg p-1.5 text-center bg-slate-50">
                <div className="text-[8.5px] uppercase font-bold text-slate-500">Total Inventaris</div>
                <div className="text-base font-black text-slate-900 font-mono leading-tight">
                  {totalItemsCount}
                </div>
                <div className="text-[8px] text-slate-500">7 Kategori Aktif</div>
              </div>
              <div className="border border-emerald-300 rounded-lg p-1.5 text-center bg-emerald-50/50">
                <div className="text-[8.5px] uppercase font-bold text-emerald-800">Kondisi Baik</div>
                <div className="text-base font-black text-emerald-700 font-mono leading-tight">
                  {goodConditionCount}{' '}
                  <span className="text-[9px] font-bold text-emerald-800">({readinessPercent}%)</span>
                </div>
                <div className="text-[8px] text-emerald-600">Siap Operasional</div>
              </div>
              <div className="border border-amber-300 rounded-lg p-1.5 text-center bg-amber-50/50">
                <div className="text-[8.5px] uppercase font-bold text-amber-800">Perlu Servis</div>
                <div className="text-base font-black text-amber-700 font-mono leading-tight">
                  {needsServiceCount}
                </div>
                <div className="text-[8px] text-amber-700">Perawatan Ringan</div>
              </div>
              <div className="border border-rose-300 rounded-lg p-1.5 text-center bg-rose-50/50">
                <div className="text-[8.5px] uppercase font-bold text-rose-800">Kondisi Rusak</div>
                <div className="text-base font-black text-rose-700 font-mono leading-tight">
                  {brokenCount}
                </div>
                <div className="text-[8px] text-rose-700">Perbaikan Teknisi</div>
              </div>
            </div>

            {/* Bagian 2: Rekapitulasi Fisik per Kategori (Tabel Kompak) */}
            <div className="mb-2">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>1. Rekapitulasi Kondisi Fisik Alat per Kategori</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  Kesiapan: {readinessPercent}%
                </span>
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
                        <td className="py-0.5 px-1.5 font-semibold text-slate-800">
                          {cat.category}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900">
                          {cat.total}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-emerald-700">
                          {cat.good}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-mono text-amber-700 font-bold">
                          {cat.service > 0 ? cat.service : '-'}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-mono text-rose-700 font-bold">
                          {cat.broken > 0 ? cat.broken : '-'}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-700">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bagian 3: Daftar Alat Bermasalah & Catatan Servis */}
            {problematicItems.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-amber-900 mb-0.5 flex items-center justify-between">
                  <span>
                    2. Catatan Alat yang Memerlukan Servis / Perawatan ({problematicItems.length}{' '}
                    Unit)
                  </span>
                  <span className="text-[8.5px] font-normal text-amber-800">
                    Prioritas Perbaikan
                  </span>
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
                        <td className="py-0.5 px-1.5 font-mono font-bold text-slate-800">
                          {item.id}
                        </td>
                        <td className="py-0.5 px-1.5 font-bold text-slate-900">{item.name}</td>
                        <td className="py-0.5 px-1.5 text-slate-600">{item.category}</td>
                        <td className="py-0.5 px-1.5 text-center">
                          <span
                            className={`px-1 rounded text-[8px] font-bold ${
                              item.condition === 'Rusak' ? 'text-rose-800' : 'text-amber-800'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-800">
                          {item.notes || 'Perlu pemeliharaan'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bagian 4: Tabel Rincian Semua Alat (27 Unit) - Split 2 Kolom Kompak */}
            <div>
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>
                  3. Rincian Seluruh Alat Inventaris ({items.length} Unit Peralatan Media)
                </span>
                <span className="text-[8.5px] text-slate-500 font-mono">Kantor Media</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                        <td className="py-0.5 px-1 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-1 font-semibold text-slate-900 truncate max-w-[120px]">
                          {item.name}
                        </td>
                        <td className="py-0.5 px-1 text-slate-500 truncate max-w-[80px]">
                          {item.category}
                        </td>
                        <td className="py-0.5 px-1 text-center font-bold">
                          <span
                            className={
                              item.condition === 'Baik'
                                ? 'text-emerald-700'
                                : item.condition === 'Perlu Servis'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {item.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
                        <td className="py-0.5 px-1 text-center font-mono text-slate-400 font-bold">
                          {idx + 15}
                        </td>
                        <td className="py-0.5 px-1 font-semibold text-slate-900 truncate max-w-[120px]">
                          {item.name}
                        </td>
                        <td className="py-0.5 px-1 text-slate-500 truncate max-w-[80px]">
                          {item.category}
                        </td>
                        <td className="py-0.5 px-1 text-center font-bold">
                          <span
                            className={
                              item.condition === 'Baik'
                                ? 'text-emerald-700'
                                : item.condition === 'Perlu Servis'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
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
            <span>
              {settings.pesantrenName} · {settings.mediaTeamName}
            </span>
            <span>Halaman 1 dari 2</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PEMBATAS TEGAS HALAMAN CETAK A4 (PAGE BREAK TO PAGE 2)                  */}
        {/* ======================================================================= */}
        <div
          className="print-page-break"
          style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        />

        {/* ----------------------------------------------------------------------- */}
        {/* >>> HALAMAN 2 CETAK: KEGIATAN + PINJAM + MEDSOS & KONTEN + TTD          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="min-h-[960px] flex flex-col justify-between pt-2">
          <div>
            {/* Header Mini Halaman 2 */}
            <div className="flex justify-between items-center pb-1 mb-2 border-b-2 border-slate-900">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900">
                  History Liputan, Peminjaman Alat & Perkembangan Media Sosial
                </h3>
                <div className="text-[9px] text-slate-600">
                  {settings.pesantrenName} · {settings.mediaTeamName} (Lanjutan Laporan)
                </div>
              </div>
              <div className="text-right text-[8.5px] font-bold text-emerald-800">
                Periode: {MONTH_NAMES[selectedMonth]} {selectedYear}
              </div>
            </div>

            {/* Bagian 4 Cetak: HISTORY AGENDA KEGIATAN TIM MEDIA 2 BULAN TERAKHIR */}
            <div className="mb-2.5">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>
                  4. History Agenda & Liputan Tim Media Selama 2 Bulan Terakhir (
                  {twoMonthsEvents.length} Kegiatan)
                </span>
                <span className="text-[8.5px] text-slate-500">{twoMonthsLabel}</span>
              </div>
              {twoMonthsEvents.length === 0 ? (
                <div className="text-[9px] italic text-slate-400 p-2 border border-slate-200 rounded">
                  Belum ada agenda kegiatan liputan media yang tercatat pada periode ini.
                </div>
              ) : (
                <table className="w-full text-left text-[8px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[7.5px]">
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
                    {twoMonthsEvents.slice(0, 10).map((evt, idx) => (
                      <tr key={evt.id} className="leading-tight">
                        <td className="py-0.5 px-1.5 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-1.5 font-medium text-slate-800 whitespace-nowrap">
                          {formatDateIndo(evt.startDate)}{' '}
                          <span className="text-slate-400 text-[7px]">({evt.startTime})</span>
                        </td>
                        <td className="py-0.5 px-1.5 font-bold text-slate-900">{evt.title}</td>
                        <td className="py-0.5 px-1.5 font-semibold text-slate-700 whitespace-nowrap">
                          {evt.category}
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-600 truncate max-w-[130px]">
                          {evt.location}
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-600 truncate max-w-[110px]">
                          {evt.crewAssigned?.length ? evt.crewAssigned.join(', ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bagian 5 Cetak: Rekapitulasi Riwayat Peminjaman & Pemakaian Alat */}
            <div className="mb-2.5">
              <div className="text-[10px] font-bold text-slate-900 mb-0.5 flex justify-between items-center">
                <span>
                  5. Rekapitulasi Riwayat Peminjaman & Pemakaian Alat ({monthlyLoans.length} Berkas)
                </span>
                <span className="text-[8.5px] text-slate-500 font-mono">
                  Bulan {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>
              {monthlyLoans.length === 0 ? (
                <div className="text-[9px] italic text-slate-400 p-1.5 border border-slate-200 rounded">
                  Tidak ada catatan peminjaman alat pada bulan {MONTH_NAMES[selectedMonth]}{' '}
                  {selectedYear}.
                </div>
              ) : (
                <table className="w-full text-left text-[8px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[7.5px]">
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
                    {monthlyLoans.slice(0, 8).map((loan) => (
                      <tr key={loan.id} className="leading-tight">
                        <td className="py-0.5 px-1.5 font-mono font-bold text-slate-800">
                          {loan.id}
                        </td>
                        <td className="py-0.5 px-1.5">
                          <span className="font-bold text-slate-900">{loan.unitName}</span>
                          <span className="text-[7px] text-slate-500 block">
                            PJ: {loan.borrowerName}
                          </span>
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-700 whitespace-nowrap">
                          {formatDateIndo(loan.startDate)} (
                          {calculateDurationDays(loan.startDate, loan.endDate)} hr)
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-800">
                          {loan.items.map((i) => i.itemName).join(', ')}
                        </td>
                        <td className="py-0.5 px-1.5 text-slate-700 font-medium">
                          {loan.pickupLocation || settings.defaultPickupLocation || 'Kantor Media'}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-bold text-[7.5px]">
                          <span
                            className={
                              loan.status === 'Disetujui' || loan.status === 'Selesai'
                                ? 'text-emerald-800'
                                : 'text-amber-800'
                            }
                          >
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bagian 6 Cetak: LAPORAN PERKEMBANGAN MEDIA SOSIAL (IG & TIKTOK) & PRODUKSI KONTEN */}
            <div className="mb-2 print-avoid-break">
              <div className="text-[10px] font-bold text-slate-900 mb-1 flex justify-between items-center">
                <span>
                  6. Laporan Perkembangan Media Sosial (Instagram & TikTok) & Produksi Konten
                </span>
                <span className="text-[8.5px] text-emerald-800 font-bold">
                  Periode {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              {/* Box Jumlah Produksi Konten (Video & Flyer) */}
              <div className="grid grid-cols-3 gap-2 mb-1.5">
                <div className="border border-emerald-300 bg-emerald-50/40 rounded p-1.5">
                  <div className="text-[8px] font-bold uppercase text-emerald-900">
                    Jumlah Produksi Konten
                  </div>
                  <div className="text-[9px] font-bold text-slate-900 mt-0.5 flex items-center gap-3">
                    <span>
                      Video:{' '}
                      <strong className="font-mono text-[10px] text-emerald-800">
                        {currentSocialReport.producedVideosCount}
                      </strong>{' '}
                      konten
                    </span>
                    <span>·</span>
                    <span>
                      Flyer:{' '}
                      <strong className="font-mono text-[10px] text-emerald-800">
                        {currentSocialReport.producedFlyersCount}
                      </strong>{' '}
                      desain
                    </span>
                  </div>
                </div>
                <div className="col-span-2 border border-slate-300 bg-slate-50 rounded p-1.5 flex flex-col justify-center">
                  <div className="text-[8px] font-bold text-slate-700">
                    Keterangan Produksi Konten & Flyer Internal:
                  </div>
                  <div className="text-[8px] text-slate-600 leading-tight mt-0.5">
                    Total {currentSocialReport.producedFlyersCount} desain flyer sudah mencakup{' '}
                    <strong>
                      {currentSocialReport.unUploadedFlyersCount || 0} flyer internal/cetak
                    </strong>{' '}
                    yang tidak diupload ke medsos.{' '}
                    {currentSocialReport.productionNotes || ''}
                  </div>
                </div>
              </div>

              {/* Tabel Kompak Instagram & TikTok */}
              <table className="w-full text-left text-[8px] border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300 uppercase text-[7.5px]">
                  <tr>
                    <th className="py-0.5 px-1.5 w-24">Platform & Akun</th>
                    <th className="py-0.5 px-1.5 text-right w-24">Total Followers</th>
                    <th className="py-0.5 px-1.5 text-right w-20">Pertumbuhan</th>
                    <th className="py-0.5 px-1.5 text-center w-20">Konten Upload</th>
                    <th className="py-0.5 px-1.5 text-right w-24">Total Views</th>
                    <th className="py-0.5 px-1.5">Konten Terpopuler Bulan Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="leading-tight">
                    <td className="py-1 px-1.5 font-bold text-slate-900">
                      Instagram{' '}
                      <span className="font-mono text-[7.5px] text-slate-500 block">
                        {currentSocialReport.igAccount}
                      </span>
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                      {currentSocialReport.igFollowers.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700">
                      {computedIgGrowth >= 0 ? `+${computedIgGrowth.toLocaleString('id-ID')}` : computedIgGrowth.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-800">
                      {currentSocialReport.igPostsCount}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                      {currentSocialReport.igTotalViews.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-slate-800">
                      <span className="font-semibold">{currentSocialReport.igTopContentTitle || '-'}</span>{' '}
                      <span className="font-mono text-[7.5px] text-slate-500">
                        ({currentSocialReport.igTopContentViews.toLocaleString('id-ID')} views)
                      </span>
                    </td>
                  </tr>
                  <tr className="leading-tight">
                    <td className="py-1 px-1.5 font-bold text-slate-900">
                      TikTok{' '}
                      <span className="font-mono text-[7.5px] text-slate-500 block">
                        {currentSocialReport.ttAccount}
                      </span>
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                      {currentSocialReport.ttFollowers.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700">
                      {computedTtGrowth >= 0 ? `+${computedTtGrowth.toLocaleString('id-ID')}` : computedTtGrowth.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-800">
                      {currentSocialReport.ttPostsCount}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                      {currentSocialReport.ttTotalViews.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1 px-1.5 text-slate-800">
                      <span className="font-semibold">{currentSocialReport.ttTopContentTitle || '-'}</span>{' '}
                      <span className="font-mono text-[7.5px] text-slate-500">
                        ({currentSocialReport.ttTopContentViews.toLocaleString('id-ID')} views)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bagian 7: Kolom Tanda Tangan Resmi Pengesahan Dokumen */}
          <div className="pt-2 border-t-2 border-slate-900 print-avoid-break">
            <div className="text-[9px] text-right text-slate-600 mb-2 font-medium">
              Ditetapkan di: {settings.defaultPickupLocation || 'Kantor Media'},{' '}
              {formatDateIndo(new Date().toISOString().split('T')[0])}
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
                <div className="text-slate-500 text-[8.5px] uppercase font-bold">
                  Penanggung Jawab,
                </div>
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
              <span>
                Dicetak via {settings.appTitle || 'SIPAT Media'} · Resmi PPTQ Qoryatul Qur&apos;an
              </span>
              <span>Halaman 2 dari 2 (Selesai)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAMPILAN INTERAKTIF DI LAYAR (SCREEN MODE SAJA)                        */}
      {/* ========================================================================= */}
      <div className={`sipat-screen-only ${isPrintPreviewOpen ? 'hidden' : 'print:hidden space-y-4'}`}>
        {/* TAB 1: KONDISI & DAFTAR ALAT */}
        {activeReportTab === 'inventory-condition' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-2xs border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Inventaris
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
                    {totalItemsCount}
                  </span>
                  <span className="text-xs text-slate-500">unit</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">7 kategori peralatan aktif</p>
              </div>

              <div className="bg-emerald-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Kondisi Baik
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tabular-nums">
                    {goodConditionCount}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800">
                    ({readinessPercent}%)
                  </span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-0.5">Siap operasional santri</p>
              </div>

              <div className="bg-amber-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-amber-200/70">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Perlu Servis
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 tabular-nums">
                    {needsServiceCount}
                  </span>
                  <span className="text-xs text-amber-700">unit</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-0.5">Perawatan / suku cadang</p>
              </div>

              <div className="bg-rose-50/70 rounded-xl p-3 sm:p-3.5 shadow-2xs border border-rose-200/70">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Kondisi Rusak
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-rose-700 tabular-nums">
                    {brokenCount}
                  </span>
                  <span className="text-xs text-rose-700">unit</span>
                </div>
                <p className="text-[10px] text-rose-600 mt-0.5">Perbaikan teknisi</p>
              </div>
            </div>

            {/* Rekapitulasi Fisik per Kategori */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Rekapitulasi Kesiapan per Kategori
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700">
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
                          <td className="py-1.5 px-2.5 font-bold text-slate-800 text-[11px]">
                            {cat.category}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-900 text-[11px] tabular-nums">
                            {cat.total}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-emerald-700 font-bold text-[11px] tabular-nums">
                            {cat.good}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-amber-700 font-bold text-[11px] tabular-nums">
                            {cat.service > 0 ? cat.service : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-rose-700 font-bold text-[11px] tabular-nums">
                            {cat.broken > 0 ? cat.broken : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[11px] text-slate-700 tabular-nums">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {problematicItems.length > 0 && (
              <div className="bg-amber-50/70 rounded-xl p-3 sm:p-4 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Daftar Alat Bermasalah & Catatan Servis ({problematicItems.length} Unit)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {problematicItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-2.5 rounded-lg text-xs space-y-1 border border-amber-100 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        <span
                          className={`text-[10px] font-bold ${
                            item.condition === 'Rusak' ? 'text-rose-700' : 'text-amber-800'
                          }`}
                        >
                          {item.condition}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10.5px]">
                        {item.category} · Lokasi:{' '}
                        <span className="font-semibold text-slate-700">
                          {item.location || 'Kantor Media'}
                        </span>
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
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                        <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 text-[11px] tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span className="font-bold text-slate-900 text-[11px] block">
                            {item.name}
                          </span>
                          <span className="font-mono text-[9.5px] text-slate-400">
                            {item.id} · {item.model}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-[11px] text-slate-600">
                          {item.category}
                        </td>
                        <td className="py-1.5 px-2.5 text-[11px] text-slate-600">
                          {item.location || 'Kantor Media'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span
                            className={`text-[10px] font-bold ${
                              item.condition === 'Baik'
                                ? 'text-emerald-700'
                                : item.condition === 'Perlu Servis'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className="text-[10px] font-semibold text-slate-700">
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
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>
                      History Agenda & Liputan Media Selama 2 Bulan ({twoMonthsEvents.length}{' '}
                      Kegiatan)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rekapitulasi seluruh agenda liputan, streaming, dan produksi media periode:{' '}
                    <strong>{twoMonthsLabel}</strong>
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 self-start sm:self-auto">
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
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {evt.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 self-start sm:self-auto">
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
                  Tidak ada catatan peminjaman pada bulan {MONTH_NAMES[selectedMonth]}{' '}
                  {selectedYear}.
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-800">{loan.id}</span>
                        <span
                          className={`text-[11px] font-bold ${
                            loan.status === 'Disetujui'
                              ? 'text-emerald-700'
                              : loan.status === 'Selesai'
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">
                        {loan.unitName} (PJ: {loan.borrowerName})
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Jadwal: {formatDateIndo(loan.startDate)} s/d {formatDateIndo(loan.endDate)}{' '}
                        · Lokasi: <strong>{loan.pickupLocation || 'Kantor Media'}</strong>
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

        {/* ===================================================================== */}
        {/* TAB 3: PROGRES MEDIA SOSIAL (INSTAGRAM & TIKTOK) + PRODUKSI KONTEN    */}
        {/* ===================================================================== */}
        {activeReportTab === 'social-media' && (
          <div className="space-y-4">
            {/* Bot / Status Feedback Banner */}
            {botStatusMessage && (
              <div
                className={`rounded-2xl p-3.5 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border ${
                  botStatusIsWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      botStatusIsWarning ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  />
                  <span>{botStatusMessage}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {botStatusIsWarning && (
                    <button
                      type="button"
                      onClick={() => setIsApiGuideModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-300 hover:bg-amber-200 text-amber-950 font-extrabold text-[11px]"
                    >
                      Buka Panduan API
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBotStatusMessage('')}
                    className="p-1 opacity-75 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 1. KARTU UTAMA: JUMLAH PRODUKSI KONTEN (VIDEO & FLYER) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Jumlah Produksi Konten — {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rekapitulasi total karya produksi kru media (Video & Flyer, termasuk flyer internal/cetak yang tidak diupload ke medsos)
                  </p>
                </div>

                {!isAdmin && onOpenAdminAuth && (
                  <button
                    type="button"
                    onClick={onOpenAdminAuth}
                    className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Masuk Admin untuk Edit / Jalankan Bot</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Kotak Produksi VIDEO */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">
                        Video:
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 tabular-nums">
                          {currentSocialReport.producedVideosCount}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800">
                          konten video diproduksi
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Mencakup Reels IG, Video TikTok, liputan dokumentasi & kajian
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-emerald-900">
                        Ubah Cepat Jumlah Video:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSavingSocial}
                          onClick={() =>
                            handleQuickSaveProductionCounts(
                              currentSocialReport.producedVideosCount - 1,
                              currentSocialReport.producedFlyersCount
                            )
                          }
                          className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors"
                          title="Kurangi 1 Video"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={socialDraft.producedVideosCount}
                          onChange={(e) =>
                            setSocialDraft({
                              ...socialDraft,
                              producedVideosCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          onBlur={() => {
                            if (
                              socialDraft.producedVideosCount !==
                              currentSocialReport.producedVideosCount
                            ) {
                              handleQuickSaveProductionCounts(
                                socialDraft.producedVideosCount,
                                currentSocialReport.producedFlyersCount
                              );
                            }
                          }}
                          className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-emerald-300 rounded-lg text-slate-900"
                        />
                        <button
                          type="button"
                          disabled={isSavingSocial}
                          onClick={() =>
                            handleQuickSaveProductionCounts(
                              currentSocialReport.producedVideosCount + 1,
                              currentSocialReport.producedFlyersCount
                            )
                          }
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          title="Tambah 1 Video"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kotak Produksi FLYER (Termasuk yang tidak terupload) */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        Flyer:
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-amber-950 tabular-nums">
                          {currentSocialReport.producedFlyersCount}
                        </span>
                        <span className="text-xs font-semibold text-amber-900">
                          desain flyer diproduksi
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Termasuk <strong>{currentSocialReport.unUploadedFlyersCount || 0} flyer</strong> internal/grup WA/cetak yang tidak terupload ke medsos
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                      <FileImage className="w-5 h-5" />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-amber-950">
                          Total Flyer (Upload + Non-Upload):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isSavingSocial}
                            onClick={() =>
                              handleQuickSaveProductionCounts(
                                currentSocialReport.producedVideosCount,
                                currentSocialReport.producedFlyersCount - 1
                              )
                            }
                            className="p-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 transition-colors"
                            title="Kurangi 1 Flyer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={socialDraft.producedFlyersCount}
                            onChange={(e) =>
                              setSocialDraft({
                                ...socialDraft,
                                producedFlyersCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                            onBlur={() => {
                              if (
                                socialDraft.producedFlyersCount !==
                                currentSocialReport.producedFlyersCount
                              ) {
                                handleQuickSaveProductionCounts(
                                  currentSocialReport.producedVideosCount,
                                  socialDraft.producedFlyersCount
                                );
                              }
                            }}
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-amber-300 rounded-lg text-slate-900"
                          />
                          <button
                            type="button"
                            disabled={isSavingSocial}
                            onClick={() =>
                              handleQuickSaveProductionCounts(
                                currentSocialReport.producedVideosCount,
                                currentSocialReport.producedFlyersCount + 1,
                                (currentSocialReport.unUploadedFlyersCount || 0) + 1
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs transition-colors flex items-center gap-1"
                            title="Tambah 1 Flyer (Termasuk Flyer Tidak Terupload)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Flyer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. PANEL KENDALI BOT OTOMATIS & EDIT MANUAL (KHUSUS ADMIN) */}
            {isAdmin && (
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                      Otomatisasi Bot Akurat (Tanpa Angka Karangan) · @pondokqq
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                      Update Progres Instagram & TikTok ({MONTH_NAMES[selectedMonth]}{' '}
                      {selectedYear})
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Gunakan <strong>Scan Screenshot Insight (Bot AI)</strong> untuk menyalin angka persis dari layar HP, atau hubungkan <strong>Token API Resmi</strong> untuk tarik 1-klik.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsBotScanModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>1. Scan Screenshot Insight (Bot AI)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBotLoading}
                      onClick={handleRunBotUsernameSync}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 disabled:opacity-60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-amber-300 ${isBotLoading ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {isBotLoading ? 'Memeriksa API...' : '2. Tarik via API Resmi'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsApiGuideModalOpen(true)}
                      className="px-3 py-2 text-xs font-bold text-amber-200 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Panduan & Status API</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSocialDraft(currentSocialReport);
                        setIsSocialEditModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Manual</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingSocial}
                      onClick={handleResetSocialReportToZero}
                      className="px-3 py-2 text-xs font-semibold text-rose-200 bg-rose-950/60 hover:bg-rose-900/80 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      title="Reset angka contoh ke 0 dan set akun ke @pondokqq"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset ke 0</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. KARTU PERKEMBANGAN INSTAGRAM & TIKTOK BERDAMPINGAN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Kartu Instagram */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                      Platform Resmi 1
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      Instagram · <span className="font-mono">{currentSocialReport.igAccount}</span>
                    </h4>
                  </div>
                  {currentSocialReport.igTopContentUrl && (
                    <a
                      href={currentSocialReport.igTopContentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>Buka Profil</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Followers
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.igFollowers.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 tabular-nums">
                      {computedIgGrowth >= 0
                        ? `+${computedIgGrowth.toLocaleString('id-ID')}`
                        : computedIgGrowth.toLocaleString('id-ID')}{' '}
                      bln ini
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Konten Upload
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.igPostsCount}
                    </span>
                    <span className="text-[10px] text-slate-500">Reels & Feed</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Total Views
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.igTotalViews.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-500">Tayangan bln ini</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
                    <span>Konten Instagram Terpopuler Bulan Ini</span>
                    <span className="font-mono tabular-nums">
                      {currentSocialReport.igTopContentViews.toLocaleString('id-ID')} views
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {currentSocialReport.igTopContentTitle || 'Belum ada catatan konten terpopuler'}
                  </p>
                </div>
              </div>

              {/* Kartu TikTok */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
                      Platform Resmi 2
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      TikTok · <span className="font-mono">{currentSocialReport.ttAccount}</span>
                    </h4>
                  </div>
                  {currentSocialReport.ttTopContentUrl && (
                    <a
                      href={currentSocialReport.ttTopContentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>Buka Profil</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Followers
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.ttFollowers.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 tabular-nums">
                      {computedTtGrowth >= 0
                        ? `+${computedTtGrowth.toLocaleString('id-ID')}`
                        : computedTtGrowth.toLocaleString('id-ID')}{' '}
                      bln ini
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Video Upload
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.ttPostsCount}
                    </span>
                    <span className="text-[10px] text-slate-500">Video TikTok</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Total Views
                    </span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                      {currentSocialReport.ttTotalViews.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-500">Tayangan bln ini</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                    <span>Konten TikTok Terpopuler Bulan Ini</span>
                    <span className="font-mono tabular-nums">
                      {currentSocialReport.ttTopContentViews.toLocaleString('id-ID')} views
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {currentSocialReport.ttTopContentTitle || 'Belum ada catatan konten terpopuler'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. TABEL RIWAYAT PROGRES MEDIA SOSIAL & PRODUKSI KONTEN ANTARBULAN */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Riwayat Perkembangan Bulanan (Instagram, TikTok & Produksi Konten)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Perbandingan progres antarbulan yang tersimpan di database Supabase
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-2.5">Periode Bulan</th>
                      <th className="py-2 px-2.5 text-center">Produksi Video</th>
                      <th className="py-2 px-2.5 text-center">Produksi Flyer</th>
                      <th className="py-2 px-2.5 text-right">IG Followers</th>
                      <th className="py-2 px-2.5 text-right">IG Views</th>
                      <th className="py-2 px-2.5 text-right">TikTok Followers</th>
                      <th className="py-2 px-2.5 text-right">TikTok Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {socialReports.map((rep) => (
                      <tr
                        key={rep.id}
                        onClick={() => {
                          setSelectedMonth(rep.month);
                          setSelectedYear(rep.year);
                        }}
                        className={`cursor-pointer transition-colors ${
                          rep.id === currentPeriodId
                            ? 'bg-emerald-50/60 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          {MONTH_NAMES[rep.month] || rep.id} {rep.year}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-700 tabular-nums">
                          {rep.producedVideosCount} video
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-amber-800 tabular-nums">
                          {rep.producedFlyersCount} flyer
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-900 tabular-nums">
                          {rep.igFollowers.toLocaleString('id-ID')}{' '}
                          <span className="text-[10px] text-emerald-700">
                            ({rep.igFollowersGrowth >= 0 ? `+${rep.igFollowersGrowth}` : rep.igFollowersGrowth})
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 tabular-nums">
                          {rep.igTotalViews.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-900 tabular-nums">
                          {rep.ttFollowers.toLocaleString('id-ID')}{' '}
                          <span className="text-[10px] text-emerald-700">
                            ({rep.ttFollowersGrowth >= 0 ? `+${rep.ttFollowersGrowth}` : rep.ttFollowersGrowth})
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 tabular-nums">
                          {rep.ttTotalViews.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SCAN SCREENSHOT INSIGHT / TEKS LAPORAN DENGAN BOT AI             */}
      {/* ========================================================================= */}
      {isBotScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold">
                  Bot AI Pembaca Screenshot Insight & Laporan
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Upload screenshot Instagram Insights / TikTok Studio atau tempel teks laporan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBotScanModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRunBotInsightParse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  1. Upload Gambar Screenshot Insight IG / TikTok (Opsional)
                </label>
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold text-emerald-900">
                    {botImagePreview
                      ? 'Gambar Screenshot Siap Dipindai (Klik untuk ganti)'
                      : 'Pilih Gambar Screenshot dari HP / Laptop'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </label>
                {botImagePreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 max-h-40 bg-slate-100 flex justify-center">
                    <img
                      src={botImagePreview}
                      alt="Preview Screenshot Insight"
                      referrerPolicy="no-referrer"
                      className="max-h-40 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  2. Atau Tempel Teks Laporan / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={botRawTextInput}
                  onChange={(e) => setBotRawTextInput(e.target.value)}
                  placeholder="Contoh: Video bulan ini 25, Flyer 38 (15 flyer internal). IG followers 15.100, views 98.000. TikTok followers 10.800, views 175.000..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBotScanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBotLoading || (!botImagePreview && !botRawTextInput.trim())}
                  className="px-5 py-2 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 rounded-xl transition-all shadow-xs"
                >
                  {isBotLoading ? 'Bot Sedang Membaca...' : 'Ekstrak & Simpan Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT LENGKAP DATA PROGRES MEDSOS & PRODUKSI KONTEN               */}
      {/* ========================================================================= */}
      {isSocialEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold">
                  Edit Laporan Medsos & Produksi Konten — {MONTH_NAMES[selectedMonth]}{' '}
                  {selectedYear}
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Data langsung tersinkron ke database Supabase dan tercetak di laporan resmi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSocialEditModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveFullSocialModal}
              className="p-6 space-y-5 max-h-[78vh] overflow-y-auto"
            >
              {/* Bagian 1: Jumlah Produksi Konten (Video & Flyer) */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                  1. Jumlah Produksi Konten Bulanan (Video & Flyer)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Jumlah Produksi Video
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={socialDraft.producedVideosCount}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          producedVideosCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Total Produksi Flyer
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={socialDraft.producedFlyersCount}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          producedFlyersCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Termasuk flyer yang tidak diupload
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Flyer Tidak Terupload (Internal)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.unUploadedFlyersCount ?? 0}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          unUploadedFlyersCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Flyer grup WA / cetak / internal
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Catatan Produksi Konten / Flyer
                  </label>
                  <input
                    type="text"
                    value={socialDraft.productionNotes || ''}
                    onChange={(e) =>
                      setSocialDraft({ ...socialDraft, productionNotes: e.target.value })
                    }
                    placeholder="Contoh: Termasuk 14 flyer wisuda, pengumuman santri, dan spanduk kegiatan..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>

              {/* Bagian 2: Metrik Instagram */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">
                  2. Perkembangan Akun Instagram
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Username IG
                    </label>
                    <input
                      type="text"
                      value={socialDraft.igAccount}
                      onChange={(e) =>
                        setSocialDraft({ ...socialDraft, igAccount: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Total Followers IG
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.igFollowers}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          igFollowers: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Konten IG Terupload
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.igPostsCount}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          igPostsCount: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Total Views IG
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.igTotalViews}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          igTotalViews: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Judul Konten IG Terpopuler Bulan Ini
                    </label>
                    <input
                      type="text"
                      value={socialDraft.igTopContentTitle}
                      onChange={(e) =>
                        setSocialDraft({ ...socialDraft, igTopContentTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Views Konten Terpopuler
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.igTopContentViews}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          igTopContentViews: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Metrik TikTok */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-teal-800 uppercase tracking-wider">
                  3. Perkembangan Akun TikTok
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Username TikTok
                    </label>
                    <input
                      type="text"
                      value={socialDraft.ttAccount}
                      onChange={(e) =>
                        setSocialDraft({ ...socialDraft, ttAccount: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Total Followers TikTok
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.ttFollowers}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          ttFollowers: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Video TikTok Terupload
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.ttPostsCount}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          ttPostsCount: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Total Views TikTok
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.ttTotalViews}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          ttTotalViews: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Judul Konten TikTok Terpopuler Bulan Ini
                    </label>
                    <input
                      type="text"
                      value={socialDraft.ttTopContentTitle}
                      onChange={(e) =>
                        setSocialDraft({ ...socialDraft, ttTopContentTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Views Konten Terpopuler
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialDraft.ttTopContentViews}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          ttTopContentViews: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSocialEditModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSocial}
                  className="px-5 py-2.5 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSocial ? 'Menyimpan ke Supabase...' : 'Simpan Laporan Medsos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PANDUAN CARA MENDAPATKAN API KEY IG & TIKTOK (@pondokqq)          */}
      {/* ========================================================================= */}
      {isApiGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold">
                    Panduan Koneksi API Resmi Instagram & TikTok (@pondokqq)
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Status integrasi server & cara mendapatkan Access Token resmi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiGuideModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs text-slate-700">
              {/* Status Koneksi Server Saat Ini */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                  Status Koneksi API di Server Saat Ini
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">1. Bot AI Scan Screenshot</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        apiStatus?.geminiVisionConfigured ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {apiStatus?.geminiVisionConfigured ? 'AKTIF (Siap Pakai)' : 'Mode Teks'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">2. Instagram Graph API</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        apiStatus?.instagramGraphConfigured ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {apiStatus?.instagramGraphConfigured ? 'TERHUBUNG' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">3. TikTok Display API</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        apiStatus?.tiktokDisplayConfigured ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {apiStatus?.tiktokDisplayConfigured ? 'TERHUBUNG' : 'Belum Diisi'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">4. RapidAPI Scraper</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        apiStatus?.rapidApiConfigured ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {apiStatus?.rapidApiConfigured ? 'TERHUBUNG' : 'Belum Diisi'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cara Paling Praktis Tanpa API Key */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                <h4 className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-700" />
                  <span>Rekomendasi Tercepat (Tanpa Perlu Daftar Developer API)</span>
                </h4>
                <p className="text-emerald-900 leading-relaxed">
                  Buka aplikasi Instagram dan TikTok <strong>@pondokqq</strong> di HP Anda, lalu screenshot halaman <strong>Professional Dashboard / Insights</strong> (IG) dan <strong>TikTok Studio Analytics</strong>. Klik tombol <strong>1. Scan Screenshot Insight (Bot AI)</strong> untuk menyalin seluruh angka secara otomatis dan 100% akurat.
                </p>
              </div>

              {/* Langkah Mendapatkan API Resmi Instagram */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-rose-800 text-xs">
                  A. Cara Mendapatkan Instagram Graph API Key (@pondokqq)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed">
                  <li>
                    Pastikan akun Instagram <strong>@pondokqq</strong> sudah berjenis <strong>Business / Creator</strong> dan tertaut ke <strong>Facebook Page</strong> resmi pesantren.
                  </li>
                  <li>
                    Buka <strong>developers.facebook.com</strong> → klik <strong>My Apps</strong> → <strong>Create App</strong> (pilih tipe <em>Business</em>).
                  </li>
                  <li>
                    Buka menu <strong>Tools &gt; Graph API Explorer</strong>, pilih aplikasi Anda, lalu centang izin: <code className="font-mono bg-slate-100 px-1 rounded">instagram_basic</code>, <code className="font-mono bg-slate-100 px-1 rounded">instagram_manage_insights</code>, dan <code className="font-mono bg-slate-100 px-1 rounded">pages_show_list</code>.
                  </li>
                  <li>
                    Klik <strong>Generate Access Token</strong>, lalu salin nilai token ke variabel server <code className="font-mono font-bold text-slate-900">IG_ACCESS_TOKEN</code> dan ID akun ke <code className="font-mono font-bold text-slate-900">IG_BUSINESS_ACCOUNT_ID</code>.
                  </li>
                </ol>
              </div>

              {/* Langkah Mendapatkan API Resmi TikTok / RapidAPI */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-teal-800 text-xs">
                  B. Cara Mendapatkan TikTok API Token / RapidAPI Key (@pondokqq)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed">
                  <li>
                    <strong>Jalur Resmi TikTok Developers</strong>: Buka <strong>developers.tiktok.com</strong>, login dengan akun <strong>@pondokqq</strong>, buat aplikasi dengan izin <code className="font-mono bg-slate-100 px-1 rounded">user.info.stats</code> &amp; <code className="font-mono bg-slate-100 px-1 rounded">video.list</code>, lalu masukkan token ke <code className="font-mono font-bold text-slate-900">TIKTOK_ACCESS_TOKEN</code>.
                  </li>
                  <li>
                    <strong>Jalur Cepat Tanpa Review Bisnis (RapidAPI)</strong>: Daftar gratis di <strong>rapidapi.com</strong>, berlangganan paket gratis (<em>Free Tier</em>) pada <em>TikTok Scraper7 API</em>, lalu masukkan kunci Anda ke variabel environment <code className="font-mono font-bold text-slate-900">RAPIDAPI_KEY</code>.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsApiGuideModalOpen(false);
                    setIsBotScanModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl"
                >
                  Scan Screenshot Insight Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setIsApiGuideModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
