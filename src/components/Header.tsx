/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Plus, Calendar } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobile: () => void;
  onQuickNewReceivable: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Ringkasan Dashboard',
    subtitle: 'Pantau status piutang usaha, tagihan jatuh tempo, dan mutasi pembayaran',
  },
  customers: {
    title: 'Data Pelanggan',
    subtitle: 'Kelola direktori kontak pelanggan dan rekap akumulasi piutang',
  },
  receivables: {
    title: 'Data Piutang',
    subtitle: 'Daftar pencatatan faktur, jatuh tempo, dan rincian saldo piutang',
  },
  payments: {
    title: 'Riwayat Pembayaran',
    subtitle: 'Catat setoran pembayaran piutang pelanggan via tunai atau transfer',
  },
  reports: {
    title: 'Laporan Piutang',
    subtitle: 'Filter periode, analisis rekapitulasi, export Excel dan cetak PDF',
  },
  database: {
    title: 'Database & Supabase',
    subtitle: 'Struktur tabel (customers, receivables, payments) dan sinkronisasi',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobile,
  onQuickNewReceivable,
}) => {
  const info = TAB_TITLES[currentTab] || { title: 'Rekap Piutang', subtitle: '' };

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3.5 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {info.title}
            </h2>
            <p className="hidden sm:block text-xs text-slate-500">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Date & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{todayStr}</span>
          </div>

          <button
            onClick={onQuickNewReceivable}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Piutang Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};
