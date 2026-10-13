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
  Eye,
  Phone,
  MapPin,
  X,
  CreditCard,
  FileText
} from 'lucide-react';
import { Customer, CustomerWithStats, ReceivableWithCustomer } from '../types/database';
import { db } from '../lib/database';
import { formatRupiah, formatTanggal, getStatusStyle } from '../lib/formatters';

interface CustomerViewProps {
  customers: CustomerWithStats[];
  receivables: ReceivableWithCustomer[];
  onOpenQuickPayment: (receivable: ReceivableWithCustomer) => void;
  onViewInvoice: (receivable: ReceivableWithCustomer) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  receivables,
  onOpenQuickPayment,
  onViewInvoice,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  // Detail Modal State
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerWithStats | null>(null);

  // Delete Confirm Modal State
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithStats | null>(null);

  // Filter pelanggan berdasarkan nama atau nomor telepon
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
    setIsFormOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ name: c.name, phone: c.phone || '', address: c.address || '' });
    setIsFormOpen(true);
  };

  // Handle save customer
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama pelanggan wajib diisi.', 'error');
      return;
    }

    const res = db.saveCustomer({
      id: editingCustomer?.id,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });

    if (res.success) {
      showToast(res.message || 'Data pelanggan berhasil disimpan.', 'success');
      setIsFormOpen(false);
      // update detail if open
      if (selectedCustomerDetail && editingCustomer && selectedCustomerDetail.id === editingCustomer.id) {
        setSelectedCustomerDetail((prev) => (prev ? { ...prev, ...formData } : null));
      }
    } else {
      showToast(res.message || 'Gagal menyimpan data.', 'error');
    }
  };

  // Handle delete customer
  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    const res = db.deleteCustomer(deletingCustomer.id);
    if (res.success) {
      showToast(res.message, 'success');
      setDeletingCustomer(null);
      if (selectedCustomerDetail?.id === deletingCustomer.id) {
        setSelectedCustomerDetail(null);
      }
    } else {
      showToast(res.message, 'error');
      setDeletingCustomer(null);
    }
  };

  // Invoices for selected detail customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerDetail) return [];
    return receivables.filter((r) => r.customer_id === selectedCustomerDetail.id);
  }, [receivables, selectedCustomerDetail]);

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pelanggan berdasarkan nama atau telepon..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Tabel Pelanggan */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Nomor Telepon</th>
                <th className="py-3 px-4">Alamat</th>
                <th className="py-3 px-4 text-right">Total Piutang</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-base font-medium text-slate-600">Tidak ada data pelanggan ditemukan</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm ? 'Coba gunakan kata kunci pencarian lain.' : 'Klik "Tambah Pelanggan" untuk mulai mencatat.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, index) => {
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-600 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {cust.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate" title={cust.address}>
                        {cust.address ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        <span className={cust.total_remaining > 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {formatRupiah(cust.total_remaining)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedCustomerDetail(cust)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center gap-1"
                            title="Lihat Detail Transaksi Piutang"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Pelanggan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingCustomer(cust)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus Pelanggan"
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

      {/* MODAL FORM TAMBAH / EDIT PELANGGAN */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BD RENI OKTARIA / APOTEK SEHAT"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 082178348387"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: DESA WARGA BARU KEC. MUARA LAKITAN"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

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
                  {editingCustomer ? 'Simpan Perubahan' : 'Tambahkan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT DETAIL PELANGGAN */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Detail */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detail Transaksi: {selectedCustomerDetail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informasi kontak dan seluruh riwayat faktur piutang pelanggan
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Detail */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Info Pelanggan Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Nomor Telepon</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedCustomerDetail.phone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Alamat</span>
                  <span className="text-slate-800 text-xs font-medium">
                    {selectedCustomerDetail.address || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Sisa Piutang Saat Ini</span>
                  <span className="font-mono font-bold text-rose-600 text-base">
                    {formatRupiah(selectedCustomerDetail.total_remaining)}
                  </span>
                </div>
              </div>

              {/* Rincian Ringkasan Angka */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-xs text-slate-500">Total Akumulasi Faktur</div>
                  <div className="text-sm font-bold font-mono text-slate-800 mt-1">
                    {formatRupiah(selectedCustomerDetail.total_receivables)}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-xs text-slate-500">Sudah Terbayar</div>
                  <div className="text-sm font-bold font-mono text-emerald-600 mt-1">
                    {formatRupiah(selectedCustomerDetail.total_paid)}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-xs text-slate-500">Jumlah Faktur</div>
                  <div className="text-sm font-bold font-mono text-blue-600 mt-1">
                    {customerInvoices.length} Faktur
                  </div>
                </div>
              </div>

              {/* Daftar Faktur Pelanggan */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Transaksi Faktur ({customerInvoices.length})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">No. Faktur</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3 text-right">Total Belanja</th>
                        <th className="py-2.5 px-3 text-right">Sisa Piutang</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {customerInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Belum ada riwayat transaksi piutang untuk pelanggan ini.
                          </td>
                        </tr>
                      ) : (
                        customerInvoices.map((inv) => {
                          const statusStyle = getStatusStyle(inv.status);
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                {inv.invoice_number}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {formatTanggal(inv.transaction_date, 'pendek')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {formatRupiah(inv.total_amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                                <span className={inv.remaining_amount > 0 ? 'text-rose-600' : 'text-slate-500'}>
                                  {formatRupiah(inv.remaining_amount)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border ${statusStyle.badgeBg}`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => onViewInvoice(inv)}
                                    title="Lihat Faktur / Nota"
                                    className="p-1 text-slate-500 hover:text-blue-600 rounded-md"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  {inv.remaining_amount > 0 && (
                                    <button
                                      onClick={() => {
                                        setSelectedCustomerDetail(null);
                                        onOpenQuickPayment(inv);
                                      }}
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
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Detail */}
            <div className="px-6 py-3 border-t border-slate-200 flex justify-end bg-slate-50 shrink-0">
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus pelanggan <strong className="text-slate-900">{deletingCustomer.name}</strong>?
            </p>
            {deletingCustomer.total_remaining > 0 && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                Peringatan: Pelanggan ini masih memiliki sisa piutang sebesar {formatRupiah(deletingCustomer.total_remaining)}.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCustomer(null)}
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
