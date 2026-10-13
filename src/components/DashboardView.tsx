/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Wallet,
  Clock,
  AlertTriangle,
  Users,
  ArrowRight,
  PlusCircle,
  CreditCard,
  FileText
} from 'lucide-react';
import { ReceivableWithCustomer } from '../types/database';
import { formatRupiah, formatTanggal, getStatusStyle } from '../lib/formatters';

interface DashboardViewProps {
  receivables: ReceivableWithCustomer[];
  onNavigateToReceivables: () => void;
  onNavigateToCustomers: () => void;
  onOpenNewReceivable: () => void;
  onOpenQuickPayment: (receivable: ReceivableWithCustomer) => void;
  onViewInvoice: (receivable: ReceivableWithCustomer) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  receivables,
  onNavigateToReceivables,
  onNavigateToCustomers,
  onOpenNewReceivable,
  onOpenQuickPayment,
  onViewInvoice,
}) => {
  // Hitung ringkasan statistik
  const totalSeluruhPiutang = receivables.reduce((sum, r) => sum + r.total_amount, 0);

  // Total piutang yang belum lunas (sisa piutang > 0)
  const totalBelumLunas = receivables.reduce((sum, r) => sum + r.remaining_amount, 0);

  // Total piutang yang sudah jatuh tempo (status === 'Jatuh Tempo')
  const piutangJatuhTempo = receivables.filter((r) => r.status === 'Jatuh Tempo');
  const totalJatuhTempo = piutangJatuhTempo.reduce((sum, r) => sum + r.remaining_amount, 0);

  // Jumlah pelanggan unik yang masih memiliki sisa piutang
  const pelangganBerpiutangSet = new Set(
    receivables.filter((r) => r.remaining_amount > 0).map((r) => r.customer_id)
  );
  const jumlahPelangganBerpiutang = pelangganBerpiutangSet.size;

  // 7 Transaksi piutang terbaru
  const piutangTerbaru = [...receivables]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Peringatan Jatuh Tempo jika ada */}
      {piutangJatuhTempo.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Perhatian: Piutang Jatuh Tempo</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Ada {piutangJatuhTempo.length} transaksi senilai{' '}
                <span className="font-semibold">{formatRupiah(totalJatuhTempo)}</span> yang telah melewati batas tanggal jatuh tempo.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToReceivables}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Tinjau Jatuh Tempo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Cards Statistik Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Seluruh Piutang */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Seluruh Piutang
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatRupiah(totalSeluruhPiutang)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Akumulasi dari {receivables.length} transaksi faktur
            </p>
          </div>
        </div>

        {/* Card 2: Total Belum Lunas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sisa Belum Lunas
            </span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
              {formatRupiah(totalBelumLunas)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Total tagihan aktif yang belum dilunasi
            </p>
          </div>
        </div>

        {/* Card 3: Jatuh Tempo */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Piutang Jatuh Tempo
            </span>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
              {formatRupiah(totalJatuhTempo)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {piutangJatuhTempo.length} transaksi perlu penagihan
            </p>
          </div>
        </div>

        {/* Card 4: Pelanggan Berpiutang */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pelanggan Berpiutang
            </span>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">
              {jumlahPelangganBerpiutang}{' '}
              <span className="text-sm font-normal text-slate-500">Pelanggan</span>
            </div>
            <button
              onClick={onNavigateToCustomers}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
            >
              <span>Lihat daftar pelanggan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcut Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-800">
          Aksi Cepat Transaksi
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewReceivable}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Piutang Baru</span>
          </button>
          <button
            onClick={onNavigateToReceivables}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Semua Faktur</span>
          </button>
        </div>
      </div>

      {/* Tabel Piutang Terbaru */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Piutang Terbaru</h3>
            <p className="text-xs text-slate-500">
              Transaksi transaksi piutang terakhir yang dicatat dalam sistem
            </p>
          </div>
          <button
            onClick={onNavigateToReceivables}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Buka Semua Piutang ({receivables.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                <th className="py-3 px-4">Nomor Faktur</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {piutangTerbaru.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    Belum ada data piutang yang dicatat.
                  </td>
                </tr>
              ) : (
                piutangTerbaru.map((rec) => {
                  const statusStyle = getStatusStyle(rec.status);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {rec.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <div>{rec.customer?.name || '-'}</div>
                        {rec.customer?.phone && (
                          <div className="text-xs text-slate-600 font-mono">
                            {rec.customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatTanggal(rec.transaction_date, 'pendek')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatRupiah(rec.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={rec.remaining_amount > 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {formatRupiah(rec.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${statusStyle.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotColor}`} />
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onViewInvoice(rec)}
                            title="Lihat Faktur / Nota"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {rec.remaining_amount > 0 && (
                            <button
                              onClick={() => onOpenQuickPayment(rec)}
                              title="Catat Pembayaran"
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
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
          </table>
        </div>
      </div>
    </div>
  );
};
