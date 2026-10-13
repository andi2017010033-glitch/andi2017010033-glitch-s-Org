/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  CreditCard
} from 'lucide-react';
import { ReceivableWithCustomer, Customer } from '../types/database';
import { formatRupiah, formatTanggal, getStatusStyle } from '../lib/formatters';
import { exportReceivablesToExcel, triggerPrint } from '../lib/exportUtils';

interface ReportViewProps {
  receivables: ReceivableWithCustomer[];
  customers: Customer[];
  onViewInvoice: (receivable: ReceivableWithCustomer) => void;
  onOpenQuickPayment: (receivable: ReceivableWithCustomer) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  receivables,
  customers,
  onViewInvoice,
  onOpenQuickPayment,
  showToast,
}) => {
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedCustomerId, setSelectedCustomerId] = useState('Semua');

  // Reset Filter
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedStatus('Semua');
    setSelectedCustomerId('Semua');
  };

  // Filtered Receivables
  const filteredData = useMemo(() => {
    return receivables.filter((r) => {
      // Tanggal Mulai
      if (startDate && r.transaction_date < startDate) {
        return false;
      }
      // Tanggal Akhir
      if (endDate && r.transaction_date > endDate) {
        return false;
      }
      // Status
      if (selectedStatus !== 'Semua' && r.status !== selectedStatus) {
        return false;
      }
      // Pelanggan
      if (selectedCustomerId !== 'Semua' && r.customer_id !== selectedCustomerId) {
        return false;
      }
      return true;
    });
  }, [receivables, startDate, endDate, selectedStatus, selectedCustomerId]);

  // Ringkasan Laporan
  const totalTransaksi = filteredData.length;
  const totalNilaiPiutang = filteredData.reduce((sum, r) => sum + r.total_amount, 0);
  const totalPembayaran = filteredData.reduce((sum, r) => sum + r.paid_amount, 0);
  const totalSisaPiutang = filteredData.reduce((sum, r) => sum + r.remaining_amount, 0);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      showToast('Tidak ada data piutang untuk diekspor pada filter ini.', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    exportReceivablesToExcel(filteredData, `Rekap_Piutang_${today}.csv`);
    showToast('File laporan Excel (.csv) berhasil diunduh.', 'success');
  };

  // Handle Cetak PDF
  const handlePrint = () => {
    if (filteredData.length === 0) {
      showToast('Tidak ada data piutang untuk dicetak.', 'error');
      return;
    }
    triggerPrint();
  };

  return (
    <div className="space-y-6">
      {/* Box Filter Laporan */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Parameter Laporan</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Dari Tanggal */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dari Tanggal</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sampai Tanggal</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Piutang */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status Piutang</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="Sebagian Dibayar">Sebagian Dibayar</option>
              <option value="Jatuh Tempo">Jatuh Tempo</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>

          {/* Filter Pelanggan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pilih Pelanggan</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Semua">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Export Excel & PDF */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Menampilkan <strong className="text-slate-800">{filteredData.length}</strong> dari {receivables.length} transaksi
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel (.csv)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Export PDF / Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Laporan 4 Card Sederhana */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Transaksi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Transaksi
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalTransaksi} <span className="text-xs font-normal text-slate-500">Faktur</span>
          </div>
        </div>

        {/* Total Nilai Piutang */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Nilai Piutang
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-blue-700 tabular-nums">
            {formatRupiah(totalNilaiPiutang)}
          </div>
        </div>

        {/* Total Pembayaran */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Pembayaran
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatRupiah(totalPembayaran)}
          </div>
        </div>

        {/* Total Sisa Piutang */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Sisa Piutang
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {formatRupiah(totalSisaPiutang)}
          </div>
        </div>
      </div>

      {/* Dokumen Laporan Tabel Siap Cetak */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs print:border-none print:shadow-none">
        {/* Header Khusus Print */}
        <div className="p-6 border-b border-slate-200 print-only">
          <h1 className="text-xl font-bold text-slate-900">REKAPITULASI PIUTANG USAHA</h1>
          <p className="text-xs text-slate-600 mt-1">
            Periode: {startDate ? formatTanggal(startDate, 'pendek') : 'Semua'} s/d {endDate ? formatTanggal(endDate, 'pendek') : 'Hari ini'} · Status: {selectedStatus}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-4">No. Faktur</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data piutang yang memenuhi filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredData.map((rec, index) => {
                  const statusStyle = getStatusStyle(rec.status);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.invoice_number}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatTanggal(rec.transaction_date, 'pendek')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{rec.customer?.name}</div>
                        {rec.customer?.phone && (
                          <div className="text-xs text-slate-500 font-mono font-normal">
                            {rec.customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatRupiah(rec.total_amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-600 whitespace-nowrap">
                        {formatRupiah(rec.paid_amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={rec.remaining_amount > 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {formatRupiah(rec.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border ${statusStyle.badgeBg}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onViewInvoice(rec)}
                            title="Lihat Faktur"
                            className="p-1 text-slate-500 hover:text-blue-600 rounded-md"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {rec.remaining_amount > 0 && (
                            <button
                              onClick={() => onOpenQuickPayment(rec)}
                              title="Bayar Piutang"
                              className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Bayar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Summary Footer Row */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={4} className="py-3 px-4 text-right">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatRupiah(totalNilaiPiutang)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600">
                    {formatRupiah(totalPembayaran)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-600">
                    {formatRupiah(totalSisaPiutang)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
