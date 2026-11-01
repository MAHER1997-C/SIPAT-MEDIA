import { LoanRequest, AppSettings } from '../types';

/**
 * Format tanggal dalam format Indonesia
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${monthNames[monthIndex] || parts[1]} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Membuat draf pesan resmi WhatsApp yang rapi dan siap kirim ke grup media pesantren
 */
export function generateWhatsAppMessage(request: LoanRequest, settings: AppSettings): string {
  const itemList = request.items
    .map((item, idx) => `  ${idx + 1}. *${item.itemName}* (${item.category})`)
    .join('\n');

  const startFormatted = `${formatDateIndo(request.startDate)} pukul ${request.startTime || '08:00'} WIB`;
  const endFormatted = `${formatDateIndo(request.endDate)} pukul ${request.endTime || '17:00'} WIB`;

  return `*BISMILLAHIRRAHMANIRRAHIM*
*PENGAJUAN PEMINJAMAN ALAT MEDIA*
_${settings.pesantrenName}_
*${settings.mediaTeamName}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Izin mengajukan permohonan peminjaman alat inventaris media untuk keperluan kegiatan unit dengan rincian berikut:

📋 *KODE BOOKING*: *${request.id}*
🏛️ *Unit / Lembaga*: *${request.unitName}*
👤 *Penanggung Jawab*: *${request.borrowerName}*
📱 *No. WhatsApp Pemohon*: ${request.borrowerPhone}

🎯 *Keperluan / Agenda*:
"${request.purpose}"

⏱️ *Jadwal Penggunaan*:
• *Mulai*: ${startFormatted}
• *Rencana Kembali*: ${endFormatted}

📦 *Checklist Alat yang Dipinjam (${request.items.length} item)*:
${itemList}

// Komitmen Peminjam
⚠️ *Komitmen Peminjam*:
1. Menjaga kebersihan dan keselamatan unit alat media pesantren.
2. Tidak memindahtangankan alat ke pihak luar tanpa persetujuan tim media.
3. Melaporkan segera bila ada kendala teknis atau baterai habis.
4. Mengembalikan alat tepat waktu sesuai jadwal di atas.

Mohon konfirmasi dan persetujuan dari Admin / Tim Media.
_Jazakumullahu Khairan Katsiran._
Wassalamu'alaikum Warahmatullahi Wabarakatuh.

---
_Dikirim via ${settings.appTitle || 'SIPAT Media'}_`;
}

/**
 * Format pesan konfirmasi persetujuan oleh Admin untuk dikirim ke peminjam
 */
export function generateApprovalWhatsAppMessage(request: LoanRequest, adminName: string): string {
  const itemList = request.items
    .map((item, idx) => `  ${idx + 1}. ${item.itemName}`)
    .join('\n');

  return `*KONFIRMASI PERSETUJUAN PEMINJAMAN ALAT MEDIA*

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Alhamdulillah, pengajuan peminjaman alat dengan rincian:

📋 *Kode Booking*: *${request.id}*
🏛️ *Unit*: *${request.unitName}*
👤 *Penanggung Jawab*: *${request.borrowerName}*
STATUS: ✅ *DISETUJUI & SIAP DIAMBIL*

📦 *Item*:
${itemList}

📍 *Pengambilan*: Studio Biro Media & Dokumentasi
👤 *Disetujui Oleh*: ${adminName}
Jadwal Pengambilan: ${formatDateIndo(request.startDate)} pk ${request.startTime || '08:00'} WIB.

_Mohon periksa kondisi fisik dan kelengkapan baterai/kabel sebelum dibawa._
Terima kasih. Wassalamu'alaikum Wr. Wb.`;
}

/**
 * Membuka WhatsApp secara langsung dengan encode text
 */
export function openWhatsAppDirect(message: string, recipientPhone?: string): void {
  const encodedText = encodeURIComponent(message);
  let url = `https://api.whatsapp.com/send?text=${encodedText}`;
  
  if (recipientPhone && recipientPhone.trim() !== '') {
    // Normalisasi nomor telepon format internasional
    let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Menyalin teks ke clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Gagal menyalin teks:', err);
    return false;
  }
}
