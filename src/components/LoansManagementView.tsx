import React, { useState, useMemo } from 'react';
import { LoanRequest, LoanStatus, MediaItem, AppSettings } from '../types';
import { 
  Search, CheckCircle2, Clock, XCircle, RotateCcw, 
  Send, Copy, Check, MessageSquare, Phone, Calendar, 
  Shield, ArrowRight, MapPin 
} from 'lucide-react';
import { 
  generateWhatsAppMessage, 
  generateApprovalWhatsAppMessage, 
  openWhatsAppDirect, 
  copyToClipboard, 
  formatDateIndo 
} from '../utils/whatsapp';

interface LoansManagementViewProps {
  loans: LoanRequest[];
  items: MediaItem[];
  isAdmin: boolean;
  settings: AppSettings;
  onApproveLoan: (loanId: string, adminName: string, pickupLocation?: string) => void;
  onReturnLoan: (loanId: string, returnNotes: string) => void;
  onRejectLoan: (loanId: string, reason: string) => void;
  onOpenAdminAuth: () => void;
}

export const LoansManagementView: React.FC<LoansManagementViewProps> = ({
  loans,
  items,
  isAdmin,
  settings,
  onApproveLoan,
  onReturnLoan,
  onRejectLoan,
  onOpenAdminAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | LoanStatus>('Semua');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Approval dialog state (with pickup location)
  const [approvingLoan, setApprovingLoan] = useState<LoanRequest | null>(null);
  const [pickupLocationInput, setPickupLocationInput] = useState(
    settings.defaultPickupLocation || 'Studio Biro Media & Dokumentasi'
  );
  const [approverNameInput, setApproverNameInput] = useState('Admin Media Pondok');
  const [sendWaOnApproval, setSendWaOnApproval] = useState(true);

  // Return dialog state
  const [returningLoan, setReturningLoan] = useState<LoanRequest | null>(null);
  const [returnNotes, setReturnNotes] = useState('Kondisi alat lengkap dan berfungsi dengan baik.');

  // Reject dialog state
  const [rejectingLoan, setRejectingLoan] = useState<LoanRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Jadwal bentrok dengan kegiatan liputan utama pondok.');

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchSearch =
        loan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loan.pickupLocation && loan.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        loan.items.some((i) => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'Semua' || loan.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [loans, searchQuery, statusFilter]);

  // Counts
  const pendingCount = loans.filter((l) => l.status === 'Menunggu Konfirmasi').length;
  const activeCount = loans.filter((l) => l.status === 'Disetujui').length;
  const completedCount = loans.filter((l) => l.status === 'Selesai').length;

  const handleCopyText = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleOpenApprovalDialog = (loan: LoanRequest) => {
    setApprovingLoan(loan);
    setPickupLocationInput(settings.defaultPickupLocation || 'Studio Biro Media & Dokumentasi');
    setApproverNameInput('Admin Media Pondok');
    setSendWaOnApproval(true);
  };

  const handleConfirmApprovalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingLoan) return;

    const chosenLocation = pickupLocationInput.trim() || settings.defaultPickupLocation || 'Studio Biro Media & Dokumentasi';
    const adminName = approverNameInput.trim() || 'Admin Media Pondok';

    onApproveLoan(approvingLoan.id, adminName, chosenLocation);

    if (sendWaOnApproval) {
      const approvalMsg = generateApprovalWhatsAppMessage(approvingLoan, adminName, chosenLocation);
      openWhatsAppDirect(approvalMsg, approvingLoan.borrowerPhone);
    }

    setApprovingLoan(null);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLoan) return;
    onReturnLoan(returningLoan.id, returnNotes);
    setReturningLoan(null);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingLoan) return;
    onRejectLoan(rejectingLoan.id, rejectReason);
    setRejectingLoan(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card (Fresh Teal & Emerald, no dark gloomy colors) */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-emerald-700 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full mb-2 sm:mb-3">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Pusat Kendali Peminjaman Alat</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              Status & Verifikasi Peminjaman
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 mt-1 max-w-2xl leading-relaxed hidden sm:block">
              Verifikasi persetujuan peminjaman dari unit MTs, MI, MA, dan panitia acara pesantren, cetak bukti, serta catat pengembalian alat ke studio.
            </p>
          </div>

          {!isAdmin && (
            <button
              onClick={onOpenAdminAuth}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-2xl transition-all shadow-sm shrink-0"
            >
              <Shield className="w-4 h-4 text-emerald-950" />
              <span>Masuk Admin</span>
            </button>
          )}
        </div>

        {/* Counter cards with soft pastel tints (No harsh borders) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/20">
          <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-emerald-100 block">Total Permohonan</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">{loans.length}</span>
              <span className="text-xs text-emerald-100">berkas</span>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-amber-200 block">Menunggu Konfirmasi</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-200 tabular-nums">{pendingCount}</span>
              <span className="text-xs text-emerald-100">berkas</span>
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-emerald-100 block">Sedang Berjalan</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">{activeCount}</span>
              <span className="text-xs text-emerald-100">berkas</span>
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-blue-100 block">Sudah Kembali</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-100 tabular-nums">{completedCount}</span>
              <span className="text-xs text-emerald-100">berkas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Borderless, soft shadow) */}
      <div className="bg-white rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode booking (PJM-xxx), nama unit, peminjam, atau alat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl shrink-0 overflow-x-auto">
          {(['Semua', 'Menunggu Konfirmasi', 'Disetujui', 'Selesai', 'Ditolak'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
              {status === 'Menunggu Konfirmasi' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[9px] bg-amber-400 text-amber-950 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loans List (BORDERLESS CARDS with soft shadow and airy pastel accents) */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xs">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Tidak ada data peminjaman</h3>
          <p className="text-xs text-slate-500 mt-1">
            Belum ada permohonan yang sesuai dengan filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const rawWaText = generateWhatsAppMessage(loan, settings);
            const isPending = loan.status === 'Menunggu Konfirmasi';
            const isActive = loan.status === 'Disetujui';
            const isDone = loan.status === 'Selesai';
            const isRejected = loan.status === 'Ditolak';

            return (
              <div
                key={loan.id}
                className={`rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:shadow-md ${
                  isPending
                    ? 'bg-amber-50/70'
                    : isActive
                    ? 'bg-emerald-50/70'
                    : isDone
                    ? 'bg-white'
                    : 'bg-rose-50/60'
                }`}
              >
                {/* Header row: ID, Unit, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-800 bg-white/90 px-3 py-1 rounded-xl shadow-2xs">
                      {loan.id}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-extrabold text-slate-900 text-base">{loan.unitName}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500 font-semibold">PJ: {loan.borrowerName}</span>
                  </div>

                  {/* Status tag */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-amber-300 px-3.5 py-1 rounded-full shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-950" />
                        <span>Menunggu Konfirmasi</span>
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-950 bg-emerald-200 px-3.5 py-1 rounded-full shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Disetujui (Sedang Dipinjam)</span>
                      </span>
                    )}
                    {isDone && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-200 px-3.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5 text-slate-600" />
                        <span>Selesai / Dikembalikan</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-950 bg-rose-200 px-3.5 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Ditolak</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  {/* Left Column: Purpose & Dates */}
                  <div className="md:col-span-7 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Keperluan Kegiatan:
                      </span>
                      <p className="text-slate-900 font-semibold text-xs mt-0.5 leading-relaxed">
                        "{loan.purpose}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-slate-700 pt-1">
                      <div className="flex items-center gap-1.5 bg-white/80 p-2 rounded-xl shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pinjam: <strong>{formatDateIndo(loan.startDate)}</strong> ({loan.startTime})</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 p-2 rounded-xl shadow-2xs">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kembali: <strong>{formatDateIndo(loan.endDate)}</strong> ({loan.endTime})</span>
                      </div>
                    </div>

                    {/* Tempat Pengambilan Alat Badge (Bila Sudah Disetujui/Ditetapkan Admin) */}
                    {loan.pickupLocation ? (
                      <div className="flex items-center gap-2 bg-emerald-100 text-emerald-950 font-semibold p-2.5 rounded-2xl shadow-2xs">
                        <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs">
                          Tempat Pengambilan: <strong className="text-emerald-900">{loan.pickupLocation}</strong>
                        </span>
                      </div>
                    ) : isPending ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-xl">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Tempat pengambilan akan ditentukan oleh Admin saat konfirmasi.</span>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 pt-1 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kontak: {loan.borrowerPhone}</span>
                      <button
                        onClick={() => openWhatsAppDirect(`Assalamu'alaikum ${loan.borrowerName}, terkait peminjaman alat media di pondok...`, loan.borrowerPhone)}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>Chat WhatsApp</span>
                      </button>
                    </div>

                    {loan.returnNotes && (
                      <div className="p-2.5 bg-white/80 rounded-2xl text-[11px] text-blue-900 shadow-2xs">
                        <strong>Catatan Pengembalian:</strong> {loan.returnNotes}
                      </div>
                    )}

                    {loan.rejectionReason && (
                      <div className="p-2.5 bg-white/80 rounded-2xl text-[11px] text-rose-800 shadow-2xs">
                        <strong>Alasan Penolakan:</strong> {loan.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Borrowed Items Checklist List */}
                  <div className="md:col-span-5 bg-white/80 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-2">
                      Daftar Alat Dipinjam ({loan.items.length} item):
                    </span>
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {loan.items.map((item, idx) => (
                        <li key={idx} className="flex items-start justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-800">
                            {idx + 1}. {item.itemName}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">
                            {item.category}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Controls / Action Bar */}
                <div className="pt-3 border-t border-black/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openWhatsAppDirect(rawWaText)}
                      className="px-4 py-2 text-xs font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-950" />
                      <span>Kirim ke Grup WA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(loan.id, rawWaText)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      {copiedId === loan.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Format WA</span>
                        </>
                      )}
                    </button>

                    {/* Quick resend approval button with pickup location included */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          const msg = generateApprovalWhatsAppMessage(loan, loan.approvedBy || 'Admin Media', loan.pickupLocation);
                          openWhatsAppDirect(msg, loan.borrowerPhone);
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                        title="Kirim ulang info lokasi pengambilan ke WA pemohon"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Kirim Info Pengambilan ke WA</span>
                      </button>
                    )}
                  </div>

                  {/* Right Admin Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenApprovalDialog(loan)}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui & Tentukan Pengambilan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingLoan(loan)}
                            className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 rounded-xl transition-colors shadow-2xs"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {isActive && (
                        <button
                          type="button"
                          onClick={() => setReturningLoan(loan)}
                          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Tandai Sudah Dikembalikan</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returningLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Pengembalian Alat</h3>
                <p className="text-xs text-slate-500">Peminjaman: {returningLoan.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Memverifikasi bahwa seluruh unit barang dari <strong className="text-slate-900">{returningLoan.unitName}</strong> telah diterima kembali di Studio Media. Status inventaris akan otomatis diubah menjadi <strong>Tersedia</strong>.
            </p>

            <form onSubmit={handleConfirmReturn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Kondisi Pengembalian
                </label>
                <textarea
                  rows={2}
                  required
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl focus:ring-1 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturningLoan(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Selesaikan & Kembalikan ke Rak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tolak Permohonan Peminjaman</h3>
                <p className="text-xs text-slate-500">Peminjaman: {rejectingLoan.id}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan
                </label>
                <textarea
                  rows={2}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl focus:ring-1 focus:ring-rose-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingLoan(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Tolak Permohonan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval & Pickup Location Modal */}
      {approvingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Konfirmasi Persetujuan Peminjaman
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {approvingLoan.id} · {approvingLoan.unitName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingLoan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Loan Summary Preview */}
            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 text-slate-700">
                <span>Pemohon: <strong className="text-slate-900">{approvingLoan.borrowerName}</strong> ({approvingLoan.borrowerPhone})</span>
                <span>Jadwal: <strong>{formatDateIndo(approvingLoan.startDate)}</strong> ({approvingLoan.startTime})</span>
              </div>
              <div className="text-[11px] text-slate-600 border-t border-slate-200/60 pt-1.5">
                <strong className="text-slate-800">Alat ({approvingLoan.items.length} item):</strong>{' '}
                {approvingLoan.items.map((i) => i.itemName).join(', ')}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmApprovalSubmit} className="space-y-4">
              {/* Pickup Location input with preset chips */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-950">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Tempat Pengambilan Alat *</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Wajib ditentukan</span>
                  </div>
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Studio Biro Media & Dokumentasi',
                    'Ruang Media Center Lt. 2',
                    'Studio Podcast',
                    'Gudang Alat Media',
                    'Kantor Sekretariat Pondok',
                    'Pos Keamanan Utama',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPickupLocationInput(preset)}
                      className={`px-2.5 py-1 text-[11px] rounded-xl font-bold transition-all ${
                        pickupLocationInput === preset
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Free input field */}
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Tulis tempat pengambilan (misal: Ruang Media Center Lt. 2, Lemari B)..."
                    value={pickupLocationInput}
                    onChange={(e) => setPickupLocationInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Keterangan ini akan langsung dicantumkan pada konfirmasi WhatsApp peminjam agar unit bersangkutan tahu ke mana harus mengambil barang.
                </p>
              </div>

              {/* Admin Approver Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Petugas / Admin Penyetuju
                </label>
                <input
                  type="text"
                  value={approverNameInput}
                  onChange={(e) => setApproverNameInput(e.target.value)}
                  placeholder="Admin Media Pondok"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                />
              </div>

              {/* Checkbox send WhatsApp */}
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50/70 rounded-2xl">
                <input
                  type="checkbox"
                  id="sendWaApproval"
                  checked={sendWaOnApproval}
                  onChange={(e) => setSendWaOnApproval(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="sendWaApproval" className="text-xs text-emerald-950 font-medium cursor-pointer">
                  <strong>Buka WhatsApp otomatis untuk kirim konfirmasi ke peminjam</strong>
                  <span className="block text-[11px] text-emerald-800 mt-0.5">
                    Pesan otomatis mencakup rincian item, jadwal, dan tempat pengambilan: <em>"{pickupLocationInput || 'Studio Media'}"</em>
                  </span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui & Konfirmasi Lokasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
