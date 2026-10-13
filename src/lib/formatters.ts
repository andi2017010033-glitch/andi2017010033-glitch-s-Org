/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReceivableStatus } from '../types/database';

/**
 * Format angka ke mata uang Rupiah Indonesia (Rp)
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal YYYY-MM-DD ke Bahasa Indonesia (misal: "17 September 2026")
 */
export function formatTanggal(dateString: string | null | undefined, format: 'panjang' | 'pendek' = 'panjang'): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: format === 'panjang' ? 'long' : 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Cek apakah piutang sudah melewati tanggal jatuh tempo
 */
export function isPassedDueDate(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  } catch {
    return false;
  }
}

/**
 * Hitung selisih hari dari hari ini ke tanggal jatuh tempo
 */
export function getDaysRemaining(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Menghasilkan UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Dapatkan warna & gaya teks untuk status piutang
 */
export function getStatusStyle(status: ReceivableStatus): {
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  border: string;
} {
  switch (status) {
    case 'Lunas':
      return {
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeText: 'text-emerald-700',
        dotColor: 'bg-emerald-500',
        border: 'border-emerald-200',
      };
    case 'Sebagian Dibayar':
      return {
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeText: 'text-amber-700',
        dotColor: 'bg-amber-500',
        border: 'border-amber-200',
      };
    case 'Jatuh Tempo':
      return {
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        badgeText: 'text-rose-700',
        dotColor: 'bg-rose-500',
        border: 'border-rose-200',
      };
    case 'Belum Lunas':
    default:
      return {
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeText: 'text-slate-700',
        dotColor: 'bg-slate-500',
        border: 'border-slate-200',
      };
  }
}
