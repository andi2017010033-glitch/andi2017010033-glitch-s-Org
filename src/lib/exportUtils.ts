/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReceivableWithCustomer } from '../types/database';
import { formatTanggal } from './formatters';

/**
 * Export data piutang ke format CSV / Excel
 */
export function exportReceivablesToExcel(receivables: ReceivableWithCustomer[], filename = 'Laporan_Rekap_Piutang.csv') {
  // Header tabel
  const headers = [
    'No',
    'Nomor Faktur',
    'Tanggal Transaksi',
    'Jatuh Tempo',
    'Nama Pelanggan',
    'Nomor Telepon',
    'Alamat Pelanggan',
    'Total Belanja (Rp)',
    'Sudah Dibayar (Rp)',
    'Sisa Piutang (Rp)',
    'Status',
    'Catatan',
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = receivables.map((r, index) => [
    escapeCSV(index + 1),
    escapeCSV(r.invoice_number),
    escapeCSV(formatTanggal(r.transaction_date, 'pendek')),
    escapeCSV(r.due_date ? formatTanggal(r.due_date, 'pendek') : '-'),
    escapeCSV(r.customer?.name || '-'),
    escapeCSV(r.customer?.phone || '-'),
    escapeCSV(r.customer?.address || '-'),
    escapeCSV(r.total_amount),
    escapeCSV(r.paid_amount),
    escapeCSV(r.remaining_amount),
    escapeCSV(r.status),
    escapeCSV(r.notes || '-'),
  ]);

  // Tambahkan baris ringkasan di bawah
  const totalBelanja = receivables.reduce((sum, r) => sum + r.total_amount, 0);
  const totalBayar = receivables.reduce((sum, r) => sum + r.paid_amount, 0);
  const totalSisa = receivables.reduce((sum, r) => sum + r.remaining_amount, 0);

  const summaryRow = [
    escapeCSV(''),
    escapeCSV('TOTAL KESELURUHAN'),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(totalBelanja),
    escapeCSV(totalBayar),
    escapeCSV(totalSisa),
    escapeCSV(''),
    escapeCSV(''),
  ];

  const csvContent =
    '\uFEFF' + // UTF-8 BOM untuk Microsoft Excel
    [headers.join(';'), ...rows.map((r) => r.join(';')), summaryRow.join(';')].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger print dialog window untuk mencetak laporan atau faktur
 */
export function triggerPrint() {
  window.print();
}
