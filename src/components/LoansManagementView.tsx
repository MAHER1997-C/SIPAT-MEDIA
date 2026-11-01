import React, { useState, useMemo } from 'react';
import { LoanRequest, LoanStatus, MediaItem, AppSettings } from '../types';
import { 
  Search, CheckCircle2, Clock, XCircle, RotateCcw, 
  Send, Copy, Check, MessageSquare, Phone, Calendar, 
  Shield, ArrowRight 
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
  onApproveLoan: (loanId: string, adminName: string) => void;
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

  const handleConfirmApproval = (loan: LoanRequest) => {
    const adminName = 'Admin Media Pondok';
    onApproveLoan(loan.id, adminName);
    const approvalMsg = generateApprovalWhatsAppMessage(loan, adminName);
    openWhatsAppDirect(approvalMsg, loan.borrowerPhone);
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
                  <div className="flex items-center gap-2">
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
                  </div>

                  {/* Right Admin Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmApproval(loan)}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui Peminjaman</span>
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
    </div>
  );
};
