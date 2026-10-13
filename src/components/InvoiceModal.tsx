/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, Store, CheckCircle, Clock } from 'lucide-react';
import { ReceivableWithCustomer } from '../types/database';
import { formatRupiah, formatTanggal, getStatusStyle } from '../lib/formatters';
import { triggerPrint } from '../lib/exportUtils';

interface InvoiceModalProps {
  receivable: ReceivableWithCustomer | null;
  onClose: () => void;
  onOpenPayment?: (receivable: ReceivableWithCustomer) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  receivable,
  onClose,
  onOpenPayment,
}) => {
  if (!receivable) return null;

  const statusStyle = getStatusStyle(receivable.status);
  const payments = receivable.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Faktur / Nota Piutang</span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {receivable.invoice_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-sm print:p-0">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-blue-600">
                <Store className="w-6 h-6" />
                <span className="text-xl font-bold tracking-tight text-slate-900">REKAP PIUTANG</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Bukti Pencatatan Transaksi & Piutang Usaha
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Nomor Faktur
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {receivable.invoice_number}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md border tracking-wide uppercase">
                <span className={`w-2 h-2 rounded-full ${statusStyle.dotColor}`} />
                <span className={statusStyle.badgeText}>{receivable.status}</span>
              </div>
            </div>
          </div>

          {/* Grid Informasi Tanggal & Pelanggan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
            {/* Pelanggan */}
            <div>
              <span className="font-semibold text-slate-500 block uppercase tracking-wider mb-1">
                Tagihan Kepada:
              </span>
              <div className="text-sm font-bold text-slate-900">{receivable.customer?.name}</div>
              <div className="mt-1 font-mono text-slate-700">
                {receivable.customer?.phone || 'No. Telp: -'}
              </div>
              <div className="mt-1 text-slate-600 leading-relaxed">
                {receivable.customer?.address || 'Alamat: -'}
              </div>
            </div>

            {/* Parameter Tanggal */}
            <div className="sm:text-right space-y-1.5">
              <div>
                <span className="text-slate-500">Tanggal Transaksi: </span>
                <span className="font-semibold text-slate-900">
                  {formatTanggal(receivable.transaction_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Jatuh Tempo: </span>
                <span className="font-semibold text-slate-900">
                  {receivable.due_date ? formatTanggal(receivable.due_date) : '-'}
                </span>
              </div>
              {receivable.notes && (
                <div className="pt-1 text-slate-600 italic">
                  Catatan: {receivable.notes}
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan Nilai Belanja & Piutang */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-2.5 font-bold text-xs text-slate-700 uppercase tracking-wider">
              Rincian Keuangan Faktur
            </div>
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-slate-700">
                <span>Total Belanja Barang / Jasa</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {formatRupiah(receivable.total_amount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span>Sudah Dibayar (Akumulasi Pembayaran)</span>
                <span className="font-mono font-semibold tabular-nums">
                  - {formatRupiah(receivable.paid_amount)}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center font-bold text-base">
                <span className="text-slate-900">Sisa Piutang yang Harus Dibayar</span>
                <span className="font-mono text-rose-600 tabular-nums">
                  {formatRupiah(receivable.remaining_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Riwayat Pembayaran untuk Faktur Ini */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Riwayat Pembayaran Faktur Ini ({payments.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Jumlah Setoran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Belum ada riwayat pembayaran yang tercatat pada faktur ini.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-700 font-medium whitespace-nowrap">
                          {formatTanggal(p.payment_date, 'pendek')}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{p.payment_method}</td>
                        <td className="py-2 px-3 text-slate-500">{p.notes || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatRupiah(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tanda Tangan Khusus Cetak */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-600 print-only">
            <div>
              <p>Penerima / Pelanggan</p>
              <div className="h-16"></div>
              <p className="font-bold underline">{receivable.customer?.name}</p>
            </div>
            <div>
              <p>Kasir / Pemilik Usaha</p>
              <div className="h-16"></div>
              <p className="font-bold underline">(.......................................)</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden when printed) */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50 no-print shrink-0">
          <div>
            {receivable.remaining_amount > 0 && onOpenPayment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayment(receivable);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                + Catat Pembayaran Piutang Ini
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
