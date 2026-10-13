/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReceivableStatus = 'Belum Lunas' | 'Sebagian Dibayar' | 'Lunas' | 'Jatuh Tempo';

export type PaymentMethod = 'Tunai' | 'Transfer' | 'Lainnya';

export interface Customer {
  id: string; // UUID primary key
  name: string; // TEXT NOT NULL
  phone: string; // TEXT
  address: string; // TEXT
  created_at: string; // TIMESTAMP
}

export interface Receivable {
  id: string; // UUID primary key
  customer_id: string; // UUID foreign key ke customers
  invoice_number: string; // TEXT UNIQUE NOT NULL
  transaction_date: string; // DATE NOT NULL (YYYY-MM-DD)
  due_date: string | null; // DATE (YYYY-MM-DD)
  total_amount: number; // NUMERIC
  paid_amount: number; // NUMERIC DEFAULT 0
  remaining_amount: number; // NUMERIC DEFAULT 0
  status: ReceivableStatus; // TEXT DEFAULT 'Belum Lunas'
  notes: string | null; // TEXT
  created_at: string; // TIMESTAMP
}

export interface Payment {
  id: string; // UUID primary key
  receivable_id: string; // UUID foreign key ke receivables
  payment_date: string; // DATE NOT NULL (YYYY-MM-DD)
  amount: number; // NUMERIC NOT NULL
  payment_method: PaymentMethod; // TEXT ('Tunai' | 'Transfer' | 'Lainnya')
  notes: string | null; // TEXT
  created_at: string; // TIMESTAMP
}

export interface ReceivableWithCustomer extends Receivable {
  customer: Customer;
  payments?: Payment[];
}

export interface CustomerWithStats extends Customer {
  total_receivables: number;
  total_paid: number;
  total_remaining: number;
  count_invoices: number;
}

export interface PaymentWithDetails extends Payment {
  invoice_number: string;
  customer_name: string;
  customer_id: string;
  receivable_total: number;
}
