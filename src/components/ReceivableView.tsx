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
  FileText,
  X,
  UserPlus,
  Info,
  Calendar
} from 'lucide-react';
import { ReceivableWithCustomer, ReceivableStatus, Customer } from '../types/database';
import { db } from '../lib/database';
import { formatRupiah, formatTanggal, getStatusStyle } from '../lib/formatters';

interface ReceivableViewProps {
  receivables: ReceivableWithCustomer[];
  customers: Customer[];
  onOpenQuickPayment: (receivable: ReceivableWithCustomer) => void;
  onViewInvoice: (receivable: ReceivableWithCustomer) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialAddModalOpen?: boolean;
  onCloseInitialAdd?: () => void;
}

export const ReceivableView: React.FC<ReceivableViewProps> = ({
  receivables,
  customers,
  onOpenQuickPayment,
  onViewInvoice,
  showToast,
  initialAddModalOpen = false,
  onCloseInitialAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(initialAddModalOpen);
  const [editingReceivable, setEditingReceivable] = useState<ReceivableWithCustomer | null>(null);

  // Delete Confirm State
  const [deletingReceivable, setDeletingReceivable] = useState<ReceivableWithCustomer | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_amount: '',
    initial_payment: '0',
    notes: '',
  });

  // Inline Quick Add Customer inside the modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustData, setQuickCustData] = useState({ name: '', phone: '', address: '' });

  // When initialAddModalOpen changes externally
  React.useEffect(() => {
    if (initialAddModalOpen) {
      handleOpenAdd();
      if (onCloseInitialAdd) onCloseInitialAdd();
    }
  }, [initialAddModalOpen]);

  // Filter piutang
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      // Filter status
      if (statusFilter !== 'Semua' && r.status !== statusFilter) {
        return false;
      }
      // Search
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      const invoiceMatch = r.invoice_number.toLowerCase().includes(term);
      const custMatch = r.customer?.name.toLowerCase().includes(term);
      return invoiceMatch || custMatch;
    });
  }, [receivables, statusFilter, searchTerm]);

  // Selected customer for info display in form
  const selectedCustomerInfo = useMemo(() => {
    if (!formData.customer_id) return null;
    return customers.find((c) => c.id === formData.customer_id);
  }, [customers, formData.customer_id]);

  // Open Add modal
  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    // Default jatuh tempo 30 hari ke depan
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const defaultDueDate = due.toISOString().split('T')[0];

    setEditingReceivable(null);
    setFormData({
      invoice_number: db.suggestNextInvoiceNumber(),
      customer_id: customers.length > 0 ? customers[0].id : '',
      transaction_date: today,
      due_date: defaultDueDate,
      total_amount: '',
      initial_payment: '0',
      notes: '',
    });
    setIsFormOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (rec: ReceivableWithCustomer) => {
    setEditingReceivable(rec);
    setFormData({
      invoice_number: rec.invoice_number,
      customer_id: rec.customer_id,
      transaction_date: rec.transaction_date,
      due_date: rec.due_date || '',
      total_amount: String(rec.total_amount),
      initial_payment: '0', // Initial payment is only for creation
      notes: rec.notes || '',
    });
    setIsFormOpen(true);
  };

  // Quick save inline customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustData.name.trim()) {
      showToast('Nama pelanggan wajib diisi.', 'error');
      return;
    }
    const res = db.saveCustomer({
      name: quickCustData.name,
      phone: quickCustData.phone,
      address: quickCustData.address,
    });
    if (res.success && res.data) {
      showToast('Pelanggan berhasil ditambahkan.', 'success');
      setFormData((prev) => ({ ...prev, customer_id: res.data!.id }));
      setIsQuickCustomerOpen(false);
      setQuickCustData({ name: '', phone: '', address: '' });
    } else {
      showToast(res.message || 'Gagal menambah pelanggan.', 'error');
    }
  };

  // Save Receivable
  const handleSaveReceivable = (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = parseFloat(formData.total_amount) || 0;
    const initialPayment = parseFloat(formData.initial_payment) || 0;

    if (!formData.invoice_number.trim()) {
      showToast('Nomor faktur wajib diisi.', 'error');
      return;
    }
    if (!formData.customer_id) {
      showToast('Silakan pilih pelanggan terlebih dahulu.', 'error');
      return;
    }
    if (totalAmount <= 0) {
      showToast('Total belanja harus lebih besar dari Rp 0.', 'error');
      return;
    }
    if (!editingReceivable && initialPayment > totalAmount) {
      showToast('Pembayaran awal tidak boleh melebihi total belanja.', 'error');
      return;
    }

    const res = db.saveReceivable({
      id: editingReceivable?.id,
      customer_id: formData.customer_id,
      invoice_number: formData.invoice_number,
      transaction_date: formData.transaction_date,
      due_date: formData.due_date ? formData.due_date : null,
      total_amount: totalAmount,
      initial_payment: initialPayment,
      notes: formData.notes,
    });

    if (res.success) {
      showToast(res.message || 'Piutang berhasil disimpan.', 'success');
      setIsFormOpen(false);
    } else {
      showToast(res.message || 'Gagal menyimpan piutang.', 'error');
    }
  };

  // Delete Receivable
  const handleConfirmDelete = () => {
    if (!deletingReceivable) return;
    const res = db.deleteReceivable(deletingReceivable.id);
    if (res.success) {
      showToast(res.message, 'success');
      setDeletingReceivable(null);
    } else {
      showToast(res.message, 'error');
      setDeletingReceivable(null);
    }
  };

  // Calculated preview in form
  const previewTotal = parseFloat(formData.total_amount) || 0;
  const previewInitial = parseFloat(formData.initial_payment) || 0;
  const previewRemaining = Math.max(0, previewTotal - (editingReceivable ? editingReceivable.paid_amount : previewInitial));

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no. faktur atau pelanggan..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['Semua', 'Belum Lunas', 'Sebagian Dibayar', 'Jatuh Tempo', 'Lunas'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Piutang</span>
        </button>
      </div>

      {/* Tabel Data Piutang */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-4">Nomor Faktur</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-base font-medium text-slate-600">Tidak ada transaksi piutang ditemukan</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || statusFilter !== 'Semua'
                        ? 'Coba sesuaikan kata kunci pencarian atau ubah filter status.'
                        : 'Klik "Tambah Piutang" untuk membuat transaksi faktur baru.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((rec, index) => {
                  const statusStyle = getStatusStyle(rec.status);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-600 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {formatTanggal(rec.transaction_date, 'pendek')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{rec.customer?.name || '-'}</div>
                        {rec.customer?.phone && (
                          <div className="text-xs text-slate-600 font-mono font-normal">
                            {rec.customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatRupiah(rec.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 whitespace-nowrap">
                        {formatRupiah(rec.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={rec.remaining_amount > 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {formatRupiah(rec.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.due_date ? formatTanggal(rec.due_date, 'pendek') : '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md border ${statusStyle.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotColor}`} />
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onViewInvoice(rec)}
                            title="Lihat & Cetak Faktur"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {rec.remaining_amount > 0 && (
                            <button
                              onClick={() => onOpenQuickPayment(rec)}
                              title="Catat Pembayaran"
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Transaksi"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingReceivable(rec)}
                            title="Hapus Transaksi"
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

      {/* MODAL FORM TAMBAH / EDIT PIUTANG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingReceivable ? 'Edit Transaksi Piutang' : 'Catat Transaksi Piutang Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi data faktur, pelanggan, dan rincian nilai transaksi
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceivable} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Nomor Faktur & Tanggal Transaksi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Faktur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PJ2609170026"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Pelanggan Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(!isQuickCustomerOpen)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Pelanggan Baru</span>
                  </button>
                </div>

                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>

                {/* Form Quick Add Customer Inline */}
                {isQuickCustomerOpen && (
                  <div className="mt-2.5 p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-blue-900">Tambah Cepat Pelanggan Baru</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Pelanggan"
                        value={quickCustData.name}
                        onChange={(e) => setQuickCustData({ ...quickCustData, name: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="No. Telepon / WA"
                        value={quickCustData.phone}
                        onChange={(e) => setQuickCustData({ ...quickCustData, phone: e.target.value })}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Alamat Pelanggan"
                      value={quickCustData.address}
                      onChange={(e) => setQuickCustData({ ...quickCustData, address: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsQuickCustomerOpen(false)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveQuickCustomer}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-xs"
                      >
                        Simpan & Gunakan
                      </button>
                    </div>
                  </div>
                )}

                {/* Tampilkan Info Pelanggan Terpilih Sesuai Prompt */}
                {selectedCustomerInfo && !isQuickCustomerOpen && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      <span>Informasi Pelanggan:</span>
                    </div>
                    <div><span className="text-slate-500">Telepon:</span> {selectedCustomerInfo.phone || '-'}</div>
                    <div><span className="text-slate-500">Alamat:</span> {selectedCustomerInfo.address || '-'}</div>
                  </div>
                )}
              </div>

              {/* Tanggal Jatuh Tempo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Total Belanja & Pembayaran Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Belanja (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 208000"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  />
                </div>

                {!editingReceivable && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jumlah Pembayaran Awal (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 jika belum ada bayar"
                      value={formData.initial_payment}
                      onChange={(e) => setFormData({ ...formData, initial_payment: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Transaksi
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan (opsional)..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Preview Kalkulasi Otomatis Sisa Piutang */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800">Kalkulasi Otomatis Sistem:</div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Belanja:</span>
                  <span className="font-mono font-medium">{formatRupiah(previewTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    {editingReceivable ? 'Total Sudah Terbayar:' : 'Pembayaran Awal (DP):'}
                  </span>
                  <span className="font-mono font-medium text-emerald-600">
                    {formatRupiah(editingReceivable ? editingReceivable.paid_amount : previewInitial)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-slate-900">
                  <span>Sisa Piutang:</span>
                  <span className="font-mono text-rose-600 text-sm">
                    {formatRupiah(previewRemaining)}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
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
                  {editingReceivable ? 'Simpan Perubahan' : 'Simpan Transaksi Piutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PIUTANG */}
      {deletingReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus Transaksi Piutang</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus faktur <strong className="text-slate-900 font-mono">{deletingReceivable.invoice_number}</strong> milik <strong className="text-slate-900">{deletingReceivable.customer?.name}</strong>?
            </p>
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              Perhatian: Tindakan ini juga akan menghapus seluruh data riwayat pembayaran terkait faktur ini.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingReceivable(null)}
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
