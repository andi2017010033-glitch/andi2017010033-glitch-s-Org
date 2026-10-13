/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  BarChart3,
  Database,
  Store,
  X,
  AlertTriangle
} from 'lucide-react';

export type NavTab = 'dashboard' | 'customers' | 'receivables' | 'payments' | 'reports' | 'database';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  overdueCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  overdueCount,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'customers',
      label: 'Data Pelanggan',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'receivables',
      label: 'Data Piutang',
      icon: <Receipt className="w-5 h-5" />,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      id: 'payments',
      label: 'Pembayaran',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'database',
      label: 'Database & Supabase',
      icon: <Database className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out no-print ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Rekap Piutang</h1>
                <p className="text-xs text-slate-500">Pencatatan Usaha & Toko</p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-slate-600 p-1"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigasi Utama */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-slate-600 tracking-wider">
              MENU UTAMA
            </div>
            {menuItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">
                      <AlertTriangle className="w-3 h-3" />
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Sidebar */}
        <div className="p-4 border-t border-slate-200">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Sistem Piutang Sederhana</p>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Faktur · Pembayaran · Pelanggan · Laporan
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
