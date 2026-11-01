import React, { useState } from 'react';
import { Lock, X, Shield, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPin: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === currentPin.trim()) {
      setError('');
      setPin('');
      onSuccess();
      onClose();
    } else {
      setError('PIN sandi admin salah. Silakan coba lagi.');
    }
  };

  const handleQuickFill = () => {
    setPin(currentPin);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-900/60 rounded-lg">
                <Shield className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Autentikasi Admin</h3>
                <p className="text-xs text-emerald-200">Kru Media & Pengurus Inventaris</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Masukkan PIN Sandi Admin
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••"
                autoFocus
                className="w-full px-3.5 py-2.5 text-center text-xl tracking-widest font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all bg-slate-50"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Helper hint for default PIN */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold block mb-0.5">Petunjuk Default:</span>
              <span>PIN bawaan adalah <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{currentPin}</code></span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors shrink-0"
            >
              Isi Cepat
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verifikasi Masuk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
