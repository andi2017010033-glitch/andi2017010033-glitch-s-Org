/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Receivable, Payment, ReceivableStatus, ReceivableWithCustomer, CustomerWithStats, PaymentWithDetails } from '../types/database';
import { generateUUID, isPassedDueDate } from './formatters';

const STORAGE_KEY_CUSTOMERS = 'rekap_piutang_customers_v1';
const STORAGE_KEY_RECEIVABLES = 'rekap_piutang_receivables_v1';
const STORAGE_KEY_PAYMENTS = 'rekap_piutang_payments_v1';
const STORAGE_KEY_SUPABASE_CONFIG = 'rekap_piutang_supabase_cfg_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

// Initial seed data as required in user specification
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    name: 'BD RENI OKTARIA',
    phone: '082178348387',
    address: 'DESA WARGA BARU KEC. MUARA LAKITAN',
    created_at: '2026-09-17T08:30:00.000Z',
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    name: 'APOTEK SEHAT SENTOSA',
    phone: '081298765432',
    address: 'Jl. Merdeka No. 45, Palembang',
    created_at: '2026-09-20T10:15:00.000Z',
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'TOKO BERKAH JAYA (PAK SLAMET)',
    phone: '081377889900',
    address: 'Pasar Inpres Blok B No. 12, Lubuklinggau',
    created_at: '2026-09-10T09:00:00.000Z',
  },
];

const SEED_RECEIVABLES: Receivable[] = [
  {
    id: 'r1111111-1111-4111-8111-111111111111',
    customer_id: 'c1111111-1111-4111-8111-111111111111',
    invoice_number: 'PJ2609170026',
    transaction_date: '2026-09-17',
    due_date: '2026-10-17',
    total_amount: 208000,
    paid_amount: 0,
    remaining_amount: 208000,
    status: 'Belum Lunas',
    notes: 'Nota pembelian barang toko (17 September 2026)',
    created_at: '2026-09-17T08:35:00.000Z',
  },
  {
    id: 'r2222222-2222-4222-8222-222222222222',
    customer_id: 'c2222222-2222-4222-8222-222222222222',
    invoice_number: 'PJ2609200004',
    transaction_date: '2026-09-20',
    due_date: '2026-10-20',
    total_amount: 1550000,
    paid_amount: 500000,
    remaining_amount: 1050000,
    status: 'Sebagian Dibayar',
    notes: 'Pengambilan suplemen dan vitamin farmasi',
    created_at: '2026-09-20T10:30:00.000Z',
  },
  {
    id: 'r3333333-3333-4333-8333-333333333333',
    customer_id: 'c3333333-3333-4333-8333-333333333333',
    invoice_number: 'PJ2609100015',
    transaction_date: '2026-09-10',
    due_date: '2026-09-25', // Sudah lewat jatuh tempo
    total_amount: 450000,
    paid_amount: 0,
    remaining_amount: 450000,
    status: 'Jatuh Tempo',
    notes: 'Nota pesanan grosir sembako',
    created_at: '2026-09-10T09:10:00.000Z',
  },
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'p2222222-2222-4222-8222-222222222222',
    receivable_id: 'r2222222-2222-4222-8222-222222222222',
    payment_date: '2026-09-25',
    amount: 500000,
    payment_method: 'Transfer',
    notes: 'Pembayaran DP transfer BCA',
    created_at: '2026-09-25T14:00:00.000Z',
  },
];

// Helper to determine status based on business rules
export function determineStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: string | null | undefined
): ReceivableStatus {
  const remaining = Math.max(0, totalAmount - paidAmount);

  if (remaining === 0) {
    return 'Lunas';
  }

  // Jika tanggal jatuh tempo sudah lewat dan belum lunas
  if (dueDate && isPassedDueDate(dueDate)) {
    return 'Jatuh Tempo';
  }

  // Jika sisa piutang > 0 dan sudah ada pembayaran
  if (paidAmount > 0) {
    return 'Sebagian Dibayar';
  }

  // Jika belum ada pembayaran
  return 'Belum Lunas';
}

class LocalDB {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEY_CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEY_RECEIVABLES)) {
      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(SEED_RECEIVABLES));
    }
    if (!localStorage.getItem(STORAGE_KEY_PAYMENTS)) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    }

    // Refresh statuses on load (e.g. check current date against due dates)
    this.refreshAllStatuses();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // CUSTOMERS
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public getCustomersWithStats(): CustomerWithStats[] {
    const customers = this.getCustomers();
    const receivables = this.getReceivables();

    return customers.map((customer) => {
      const custReceivables = receivables.filter((r) => r.customer_id === customer.id);
      const total_receivables = custReceivables.reduce((acc, r) => acc + (r.total_amount || 0), 0);
      const total_paid = custReceivables.reduce((acc, r) => acc + (r.paid_amount || 0), 0);
      const total_remaining = custReceivables.reduce((acc, r) => acc + (r.remaining_amount || 0), 0);

      return {
        ...customer,
        total_receivables,
        total_paid,
        total_remaining,
        count_invoices: custReceivables.length,
      };
    });
  }

  public saveCustomer(customer: Omit<Customer, 'id' | 'created_at'> & { id?: string }): { success: boolean; data?: Customer; message?: string } {
    const customers = this.getCustomers();

    if (!customer.name.trim()) {
      return { success: false, message: 'Nama pelanggan wajib diisi.' };
    }

    if (customer.id) {
      // Update
      const index = customers.findIndex((c) => c.id === customer.id);
      if (index === -1) {
        return { success: false, message: 'Pelanggan tidak ditemukan.' };
      }
      customers[index] = {
        ...customers[index],
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      };
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
      this.notify();
      return { success: true, data: customers[index], message: 'Data pelanggan berhasil diperbarui.' };
    } else {
      // Create
      const newCustomer: Customer = {
        id: generateUUID(),
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        created_at: new Date().toISOString(),
      };
      customers.unshift(newCustomer);
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
      this.notify();
      return { success: true, data: newCustomer, message: 'Pelanggan baru berhasil ditambahkan.' };
    }
  }

  public deleteCustomer(id: string): { success: boolean; message: string } {
    const receivables = this.getReceivables().filter((r) => r.customer_id === id);
    const hasUnpaid = receivables.some((r) => r.remaining_amount > 0);

    if (hasUnpaid) {
      return {
        success: false,
        message: 'Tidak dapat menghapus pelanggan yang masih memiliki sisa piutang aktif.',
      };
    }

    // Check if has any receivables
    if (receivables.length > 0) {
      return {
        success: false,
        message: 'Pelanggan memiliki riwayat transaksi faktur. Hapus atau arsipkan transaksi terkait terlebih dahulu.',
      };
    }

    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    this.notify();
    return { success: true, message: 'Pelanggan berhasil dihapus.' };
  }

  // RECEIVABLES
  public getReceivables(): Receivable[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECEIVABLES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getReceivableById(id: string): Receivable | undefined {
    return this.getReceivables().find((r) => r.id === id);
  }

  public getReceivablesWithDetails(): ReceivableWithCustomer[] {
    const receivables = this.getReceivables();
    const customers = this.getCustomers();
    const payments = this.getPayments();

    return receivables.map((r) => {
      const customer = customers.find((c) => c.id === r.customer_id) || {
        id: r.customer_id,
        name: 'Pelanggan Tidak Diketahui',
        phone: '-',
        address: '-',
        created_at: r.created_at,
      };

      const relPayments = payments.filter((p) => p.receivable_id === r.id);

      return {
        ...r,
        customer,
        payments: relPayments,
      };
    });
  }

  public saveReceivable(
    receivableData: {
      id?: string;
      customer_id: string;
      invoice_number: string;
      transaction_date: string;
      due_date: string | null;
      total_amount: number;
      initial_payment?: number;
      notes?: string | null;
    }
  ): { success: boolean; data?: Receivable; message?: string } {
    const receivables = this.getReceivables();
    const cleanInvoiceNumber = receivableData.invoice_number.trim().toUpperCase();

    if (!cleanInvoiceNumber) {
      return { success: false, message: 'Nomor faktur wajib diisi.' };
    }
    if (!receivableData.customer_id) {
      return { success: false, message: 'Pelanggan wajib dipilih.' };
    }
    if (!receivableData.transaction_date) {
      return { success: false, message: 'Tanggal transaksi wajib diisi.' };
    }
    if (receivableData.total_amount <= 0) {
      return { success: false, message: 'Total belanja harus lebih besar dari 0.' };
    }

    // Check duplicate invoice number
    const duplicate = receivables.find(
      (r) => r.invoice_number.toLowerCase() === cleanInvoiceNumber.toLowerCase() && r.id !== receivableData.id
    );
    if (duplicate) {
      return { success: false, message: `Nomor faktur "${cleanInvoiceNumber}" sudah digunakan.` };
    }

    if (receivableData.id) {
      // Edit existing receivable
      const index = receivables.findIndex((r) => r.id === receivableData.id);
      if (index === -1) {
        return { success: false, message: 'Data piutang tidak ditemukan.' };
      }

      const existing = receivables[index];
      // Keep existing payments
      const payments = this.getPayments().filter((p) => p.receivable_id === existing.id);
      const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);

      if (receivableData.total_amount < paidAmount) {
        return {
          success: false,
          message: `Total belanja baru tidak boleh lebih kecil dari total yang sudah dibayar (${paidAmount}).`,
        };
      }

      const remainingAmount = Math.max(0, receivableData.total_amount - paidAmount);
      const status = determineStatus(receivableData.total_amount, paidAmount, receivableData.due_date);

      receivables[index] = {
        ...existing,
        customer_id: receivableData.customer_id,
        invoice_number: cleanInvoiceNumber,
        transaction_date: receivableData.transaction_date,
        due_date: receivableData.due_date,
        total_amount: receivableData.total_amount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        status,
        notes: receivableData.notes || null,
      };

      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));
      this.notify();
      return { success: true, data: receivables[index], message: 'Transaksi piutang berhasil diperbarui.' };
    } else {
      // Create new receivable
      const initialPayment = Math.max(0, receivableData.initial_payment || 0);

      if (initialPayment > receivableData.total_amount) {
        return {
          success: false,
          message: 'Jumlah pembayaran awal tidak boleh melebihi total belanja.',
        };
      }

      const remainingAmount = Math.max(0, receivableData.total_amount - initialPayment);
      const status = determineStatus(receivableData.total_amount, initialPayment, receivableData.due_date);

      const newId = generateUUID();
      const newReceivable: Receivable = {
        id: newId,
        customer_id: receivableData.customer_id,
        invoice_number: cleanInvoiceNumber,
        transaction_date: receivableData.transaction_date,
        due_date: receivableData.due_date,
        total_amount: receivableData.total_amount,
        paid_amount: initialPayment,
        remaining_amount: remainingAmount,
        status,
        notes: receivableData.notes || null,
        created_at: new Date().toISOString(),
      };

      receivables.unshift(newReceivable);
      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));

      // Record initial payment as first payment record if initialPayment > 0
      if (initialPayment > 0) {
        const payments = this.getPayments();
        const initialPayRecord: Payment = {
          id: generateUUID(),
          receivable_id: newId,
          payment_date: receivableData.transaction_date,
          amount: initialPayment,
          payment_method: 'Tunai',
          notes: 'Pembayaran awal transaksi saat faktur dibuat',
          created_at: new Date().toISOString(),
        };
        payments.unshift(initialPayRecord);
        localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
      }

      this.notify();
      return { success: true, data: newReceivable, message: 'Transaksi piutang berhasil dicatat.' };
    }
  }

  public deleteReceivable(id: string): { success: boolean; message: string } {
    const receivables = this.getReceivables();
    const index = receivables.findIndex((r) => r.id === id);
    if (index === -1) {
      return { success: false, message: 'Data piutang tidak ditemukan.' };
    }

    // Delete associated payments
    const payments = this.getPayments().filter((p) => p.receivable_id !== id);
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));

    // Delete receivable
    const filteredReceivables = receivables.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(filteredReceivables));

    this.notify();
    return { success: true, message: 'Transaksi piutang beserta riwayat pembayarannya berhasil dihapus.' };
  }

  // PAYMENTS
  public getPayments(): Payment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PAYMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getPaymentsWithDetails(): PaymentWithDetails[] {
    const payments = this.getPayments();
    const receivables = this.getReceivables();
    const customers = this.getCustomers();

    return payments.map((p) => {
      const rec = receivables.find((r) => r.id === p.receivable_id);
      const cust = rec ? customers.find((c) => c.id === rec.customer_id) : undefined;

      return {
        ...p,
        invoice_number: rec?.invoice_number || 'Faktur Terhapus',
        customer_name: cust?.name || 'Pelanggan Tidak Diketahui',
        customer_id: cust?.id || '',
        receivable_total: rec?.total_amount || 0,
      };
    });
  }

  public savePayment(paymentData: {
    id?: string;
    receivable_id: string;
    payment_date: string;
    amount: number;
    payment_method: 'Tunai' | 'Transfer' | 'Lainnya';
    notes?: string | null;
  }): { success: boolean; data?: Payment; message?: string } {
    const receivable = this.getReceivableById(paymentData.receivable_id);
    if (!receivable) {
      return { success: false, message: 'Faktur transaksi piutang tidak ditemukan.' };
    }

    if (paymentData.amount <= 0) {
      return { success: false, message: 'Jumlah pembayaran harus lebih besar dari Rp 0.' };
    }
    if (!paymentData.payment_date) {
      return { success: false, message: 'Tanggal pembayaran wajib diisi.' };
    }

    const payments = this.getPayments();

    if (paymentData.id) {
      // Edit payment
      const pIndex = payments.findIndex((p) => p.id === paymentData.id);
      if (pIndex === -1) {
        return { success: false, message: 'Data pembayaran tidak ditemukan.' };
      }

      // Calculate total paid excluding this payment
      const otherPayments = payments.filter((p) => p.receivable_id === receivable.id && p.id !== paymentData.id);
      const otherPaid = otherPayments.reduce((acc, p) => acc + p.amount, 0);
      const remainingAllowed = receivable.total_amount - otherPaid;

      if (paymentData.amount > remainingAllowed) {
        return {
          success: false,
          message: `Jumlah pembayaran melebihi sisa piutang maksimal (Maksimal: Rp ${remainingAllowed.toLocaleString('id-ID')}).`,
        };
      }

      payments[pIndex] = {
        ...payments[pIndex],
        payment_date: paymentData.payment_date,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes || null,
      };

      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
      this.recalculateReceivable(receivable.id);
      this.notify();
      return { success: true, data: payments[pIndex], message: 'Pembayaran berhasil diperbarui.' };
    } else {
      // Create new payment
      if (paymentData.amount > receivable.remaining_amount) {
        return {
          success: false,
          message: `Jumlah pembayaran (Rp ${paymentData.amount.toLocaleString('id-ID')}) tidak boleh lebih besar dari sisa piutang (Rp ${receivable.remaining_amount.toLocaleString('id-ID')}).`,
        };
      }

      const newPayment: Payment = {
        id: generateUUID(),
        receivable_id: paymentData.receivable_id,
        payment_date: paymentData.payment_date,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes || null,
        created_at: new Date().toISOString(),
      };

      payments.unshift(newPayment);
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
      this.recalculateReceivable(receivable.id);
      this.notify();
      return { success: true, data: newPayment, message: 'Pembayaran piutang berhasil dicatat.' };
    }
  }

  public deletePayment(id: string): { success: boolean; message: string } {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === id);
    if (!payment) {
      return { success: false, message: 'Pembayaran tidak ditemukan.' };
    }

    const receivableId = payment.receivable_id;
    const remainingPayments = payments.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(remainingPayments));

    this.recalculateReceivable(receivableId);
    this.notify();
    return { success: true, message: 'Pembayaran berhasil dihapus.' };
  }

  public recalculateReceivable(receivableId: string) {
    const receivables = this.getReceivables();
    const rIndex = receivables.findIndex((r) => r.id === receivableId);
    if (rIndex === -1) return;

    const payments = this.getPayments().filter((p) => p.receivable_id === receivableId);
    const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalAmount = receivables[rIndex].total_amount;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const status = determineStatus(totalAmount, paidAmount, receivables[rIndex].due_date);

    receivables[rIndex] = {
      ...receivables[rIndex],
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      status,
    };

    localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));
  }

  public refreshAllStatuses() {
    const receivables = this.getReceivables();
    const payments = this.getPayments();
    let changed = false;

    for (let i = 0; i < receivables.length; i++) {
      const rec = receivables[i];
      const recPayments = payments.filter((p) => p.receivable_id === rec.id);
      const paid = recPayments.reduce((acc, p) => acc + p.amount, 0);
      const remaining = Math.max(0, rec.total_amount - paid);
      const newStatus = determineStatus(rec.total_amount, paid, rec.due_date);

      if (rec.paid_amount !== paid || rec.remaining_amount !== remaining || rec.status !== newStatus) {
        receivables[i] = {
          ...rec,
          paid_amount: paid,
          remaining_amount: remaining,
          status: newStatus,
        };
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));
      this.notify();
    }
  }

  // SUGGEST NEXT INVOICE NUMBER
  public suggestNextInvoiceNumber(): string {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `PJ${yy}${mm}${dd}`;

    const existing = this.getReceivables().filter((r) => r.invoice_number.startsWith(prefix));
    const nextSeq = String(existing.length + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  // BACKUP & RESTORE & RESET
  public resetToDefault(): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(SEED_RECEIVABLES));
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    this.refreshAllStatuses();
    this.notify();
  }

  public exportBackup(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exported_at: new Date().toISOString(),
        customers: this.getCustomers(),
        receivables: this.getReceivables(),
        payments: this.getPayments(),
      },
      null,
      2
    );
  }

  public importBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.receivables) || !Array.isArray(parsed.payments)) {
        return { success: false, message: 'Format file cadangan tidak valid (struktur data tidak sesuai).' };
      }

      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(parsed.customers));
      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(parsed.receivables));
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(parsed.payments));
      this.refreshAllStatuses();
      this.notify();
      return { success: true, message: 'Data cadangan berhasil dipulihkan.' };
    } catch {
      return { success: false, message: 'Gagal membaca file JSON. Pastikan format teks valid.' };
    }
  }

  // SUPABASE CONFIGURATION
  public getSupabaseConfig(): SupabaseConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
      return data ? JSON.parse(data) : { url: '', anonKey: '', enabled: false };
    } catch {
      return { url: '', anonKey: '', enabled: false };
    }
  }

  public saveSupabaseConfig(cfg: SupabaseConfig): void {
    localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(cfg));
    this.notify();
  }

  // GENERATE SUPABASE SQL SCRIPT
  public generateSupabaseSQL(): string {
    return `-- ==========================================
-- SKRIP TABEL DATABASE SUPABASE "REKAP PIUTANG"
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ==========================================

-- 1. TABEL CUSTOMERS (DATA PELANGGAN)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL RECEIVABLES (DATA PIUTANG)
CREATE TABLE IF NOT EXISTS public.receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    due_date DATE,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Belum Lunas',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL PAYMENTS (PEMBAYARAN)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Tunai',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- POLISI AKSES PUBLIK / ANON (BISA DIATUR SESUAI KEBUTUHAN)
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on receivables" ON public.receivables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- CONTOH DATA AWAL (SEED DATA NOTA BD RENI OKTARIA)
INSERT INTO public.customers (id, name, phone, address)
VALUES ('c1111111-1111-4111-8111-111111111111', 'BD RENI OKTARIA', '082178348387', 'DESA WARGA BARU KEC. MUARA LAKITAN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.receivables (id, customer_id, invoice_number, transaction_date, due_date, total_amount, paid_amount, remaining_amount, status, notes)
VALUES ('r1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'PJ2609170026', '2026-09-17', '2026-10-17', 208000, 0, 208000, 'Belum Lunas', 'Nota pesanan pelanggan')
ON CONFLICT (invoice_number) DO NOTHING;
`;
  }
}

export const db = new LocalDB();
