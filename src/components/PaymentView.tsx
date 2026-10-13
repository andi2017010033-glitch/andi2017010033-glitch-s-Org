/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  X,
  Banknote,
  ArrowRightLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { PaymentWithDetails, ReceivableWithCustomer, PaymentMethod } from '../types/database';
import { db } from '../lib/database';
import { formatRupiah, formatTanggal } from '../lib/formatters';

interface PaymentViewProps {
  payments: PaymentWithDetails[];
  receivables: ReceivableWithCustomer[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  quickPaymentReceivable?: ReceivableWithCustomer | null;
  onClearQuickPayment?: () => void;
}

export const PaymentView: React.FC<PaymentViewProps> = ({
  payments,
  receivables,
  showToast,
  quickPaymentReceivable,
  onClearQuickPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('Semua');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    receivable_id: string;
    payment_date: string;
    amount: string;
    payment_method: PaymentMethod;
    notes: string;
  }>({
    receivable_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'Tunai',
    notes: '',
  });

  // Delete State
  const [deletingPayment, setDeletingPayment] = useState<PaymentWithDetails | null>(null);

  // When quickPaymentReceivable is passed from another view
  React.useEffect(() => {
    if (quickPaymentReceivable) {
      setEditingPayment(null);
      setFormData({
        receivable_id: quickPaymentReceivable.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount: String(quickPaymentReceivable.remaining_amount),
        payment_method: 'Tunai',
        notes: `Pembayaran faktur ${quickPaymentReceivable.invoice_number}`,
      });
      setIsFormOpen(true);
      if (onClearQuickPayment) onClearQuickPayment();
    }
  }, [quickPaymentReceivable]);

  // Receivable aktif yang masih memiliki sisa piutang (atau yang sedang diedit)
  const availableReceivables = useMemo(() => {
    return receivables.filter(
      (r) => r.remaining_amount > 0 || (editingPayment && r.id === editingPayment.receivable_id)
    );
  }, [receivables, editingPayment]);

  // Info faktur piutang yang dipilih dalam form
  const selectedReceivable = useMemo(() => {
    if (!formData.receivable_id) return null;
    return receivables.find((r) => r.id === formData.receivable_id);
  }, [receivables, formData.receivable_id]);

  // Maksimal bayar yang diizinkan untuk form
  const maxAllowedPayment = useMemo(() => {
    if (!selectedReceivable) return 0;
    if (editingPayment && editingPayment.receivable_id === selectedReceivable.id) {
      return selectedReceivable.remaining_amount + editingPayment.amount;
    }
    return selectedReceivable.remaining_amount;
  }, [selectedReceivable, editingPayment]);

  // Filter riwayat pembayaran
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== 'Semua' && p.payment_method !== methodFilter) {
        return false;
      }
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        p.invoice_number.toLowerCase().includes(term) ||
        p.customer_name.toLowerCase().includes(term) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    });
  }, [payments, methodFilter, searchTerm]);

  // Buka Form Tambah Baru
  const handleOpenAdd = () => {
    if (availableReceivables.length === 0) {
      showToast('Seluruh faktur piutang sudah lunas. Tidak ada tagihan yang perlu dibayar.', 'info');
      return;
    }

    const firstRec = availableReceivables[0];
    setEditingPayment(null);
    setFormData({
      receivable_id: firstRec.id,
      payment_date: new Date().toISOString().split('T')[0],
      amount: String(firstRec.remaining_amount),
      payment_method: 'Tunai',
      notes: '',
    });
    setIsFormOpen(true);
  };

  // Buka Form Edit
  const handleOpenEdit = (payment: PaymentWithDetails) => {
    setEditingPayment(payment);
    setFormData({
      receivable_id: payment.receivable_id,
      payment_date: payment.payment_date,
      amount: String(payment.amount),
      payment_method: payment.payment_method,
      notes: payment.notes || '',
    });
    setIsFormOpen(true);
  };

  // Simpan Pembayaran
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.receivable_id) {
      showToast('Silakan pilih faktur piutang.', 'error');
      return;
    }

    const amountNum = parseFloat(formData.amount) || 0;
    if (amountNum <= 0) {
      showToast('Jumlah pembayaran harus lebih besar dari Rp 0.', 'error');
      return;
    }

    if (amountNum > maxAllowedPayment) {
      showToast(
        `Jumlah pembayaran tidak boleh lebih besar dari sisa piutang (Maksimal: ${formatRupiah(maxAllowedPayment)}).`,
        'error'
      );
      return;
    }

    const res = db.savePayment({
      id: editingPayment?.id,
      receivable_id: formData.receivable_id,
      payment_date: formData.payment_date,
      amount: amountNum,
      payment_method: formData.payment_method,
      notes: formData.notes,
    });

    if (res.success) {
      showToast(res.message || 'Pembayaran berhasil disimpan.', 'success');
      setIsFormOpen(false);
    } else {
      showToast(res.message || 'Gagal mencatat pembayaran.', 'error');
    }
  };

  // Konfirmasi Hapus Pembayaran
  const handleConfirmDelete = () => {
    if (!deletingPayment) return;
    const res = db.deletePayment(deletingPayment.id);
    if (res.success) {
      showToast(res.message, 'success');
      setDeletingPayment(null);
    } else {
      showToast(res.message, 'error');
      setDeletingPayment(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari faktur, pelanggan, atau catatan..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter Metode */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['Semua', 'Tunai', 'Transfer', 'Lainnya'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  methodFilter === m
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pembayaran</span>
        </button>
      </div>

      {/* Tabel Riwayat Pembayaran */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-4">Tanggal Pembayaran</th>
                <th className="py-3 px-4">Nomor Faktur</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4 text-right">Jumlah Pembayaran</th>
                <th className="py-3 px-4 text-center">Metode</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-base font-medium text-slate-600">Belum ada riwayat pembayaran</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Klik "Tambah Pembayaran" untuk mencatat setoran piutang pelanggan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, index) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-600 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTanggal(p.payment_date, 'pendek')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {p.customer_name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-600 whitespace-nowrap">
                        {formatRupiah(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {p.payment_method === 'Tunai' ? (
                            <Banknote className="w-3 h-3 text-emerald-600" />
                          ) : p.payment_method === 'Transfer' ? (
                            <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                          ) : (
                            <CreditCard className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{p.payment_method}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate" title={p.notes || '-'}>
                        {p.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Pembayaran"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingPayment(p)}
                            title="Hapus Pembayaran"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL TAMBAH / EDIT PEMBAYARAN */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPayment ? 'Edit Pembayaran Piutang' : 'Catat Pembayaran Piutang'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setoran akan otomatis mengurangi sisa piutang faktur
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              {/* Pilih Transaksi Piutang */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Faktur Piutang <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={!!editingPayment}
                  value={formData.receivable_id}
                  onChange={(e) => {
                    const rId = e.target.value;
                    const rec = receivables.find((r) => r.id === rId);
                    setFormData({
                      ...formData,
                      receivable_id: rId,
                      amount: rec ? String(rec.remaining_amount) : '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="" disabled>-- Pilih Faktur Piutang --</option>
                  {availableReceivables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.invoice_number} - {r.customer?.name} (Sisa: {formatRupiah(r.remaining_amount)})
                    </option>
                  ))}
                </select>

                {/* Info Faktur Terpilih */}
                {selectedReceivable && (
                  <div className="mt-2.5 p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-blue-900">
                      Pelanggan: {selectedReceivable.customer?.name}
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Belanja:</span>
                      <span className="font-mono">{formatRupiah(selectedReceivable.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Sudah Dibayar:</span>
                      <span className="font-mono text-emerald-600">
                        {formatRupiah(selectedReceivable.paid_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-blue-200/60">
                      <span>Sisa Piutang Saat Ini:</span>
                      <span className="font-mono text-sm">{formatRupiah(selectedReceivable.remaining_amount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tanggal Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pembayaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Jumlah Pembayaran */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Jumlah Pembayaran (Rp) <span className="text-rose-500">*</span>
                  </label>
                  {selectedReceivable && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: String(maxAllowedPayment) })}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Bayar Lunas ({formatRupiah(maxAllowedPayment)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxAllowedPayment}
                  required
                  placeholder="Contoh: 100000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Maksimal pembayaran yang diperbolehkan: <span className="font-semibold text-slate-800">{formatRupiah(maxAllowedPayment)}</span>
                </p>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tunai', 'Transfer', 'Lainnya'] as PaymentMethod[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setFormData({ ...formData, payment_method: m })}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        formData.payment_method === m
                          ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bukti transfer BCA / titipan kurir"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Footer Modal */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  {editingPayment ? 'Simpan Perubahan' : 'Catat Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PEMBAYARAN */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus Riwayat Pembayaran</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus pembayaran sebesar <strong className="text-slate-900 font-mono">{formatRupiah(deletingPayment.amount)}</strong> untuk faktur <strong className="text-slate-900 font-mono">{deletingPayment.invoice_number}</strong>?
            </p>
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Sisa piutang pada faktur terkait akan otomatis bertambah kembali sesuai nilai ini.</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingPayment(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
