/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CustomerView } from './components/CustomerView';
import { ReceivableView } from './components/ReceivableView';
import { PaymentView } from './components/PaymentView';
import { ReportView } from './components/ReportView';
import { DatabaseSettingsView } from './components/DatabaseSettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { db } from './lib/database';
import { ReceivableWithCustomer } from './types/database';
import { generateUUID } from './lib/formatters';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Database snapshot state
  const [, setDbVersion] = useState(0);

  // Active Modals & Cross-tab interactions
  const [selectedInvoice, setSelectedInvoice] = useState<ReceivableWithCustomer | null>(null);
  const [quickPaymentTarget, setQuickPaymentTarget] = useState<ReceivableWithCustomer | null>(null);
  const [initialOpenNewReceivable, setInitialOpenNewReceivable] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = generateUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Re-fetch data whenever db updates
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbVersion((v) => v + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Fresh data getters
  const receivables = useMemo(() => db.getReceivablesWithDetails(), [db, setDbVersion]);
  const customers = useMemo(() => db.getCustomersWithStats(), [db, setDbVersion]);
  const rawCustomers = useMemo(() => db.getCustomers(), [db, setDbVersion]);
  const payments = useMemo(() => db.getPaymentsWithDetails(), [db, setDbVersion]);

  // Keep selectedInvoice in sync if data changes
  useEffect(() => {
    if (selectedInvoice) {
      const updated = receivables.find((r) => r.id === selectedInvoice.id);
      if (updated) setSelectedInvoice(updated);
    }
  }, [receivables]);

  // Overdue count for sidebar badge
  const overdueCount = useMemo(() => {
    return receivables.filter((r) => r.status === 'Jatuh Tempo').length;
  }, [receivables]);

  // Handlers for cross-view actions
  const handleOpenQuickPayment = (rec: ReceivableWithCustomer) => {
    setQuickPaymentTarget(rec);
    setCurrentTab('payments');
  };

  const handleQuickNewReceivable = () => {
    setInitialOpenNewReceivable(true);
    setCurrentTab('receivables');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Nav */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        overdueCount={overdueCount}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          onQuickNewReceivable={handleQuickNewReceivable}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              receivables={receivables}
              onNavigateToReceivables={() => setCurrentTab('receivables')}
              onNavigateToCustomers={() => setCurrentTab('customers')}
              onOpenNewReceivable={handleQuickNewReceivable}
              onOpenQuickPayment={handleOpenQuickPayment}
              onViewInvoice={setSelectedInvoice}
            />
          )}

          {currentTab === 'customers' && (
            <CustomerView
              customers={customers}
              receivables={receivables}
              onOpenQuickPayment={handleOpenQuickPayment}
              onViewInvoice={setSelectedInvoice}
              showToast={showToast}
            />
          )}

          {currentTab === 'receivables' && (
            <ReceivableView
              receivables={receivables}
              customers={rawCustomers}
              onOpenQuickPayment={handleOpenQuickPayment}
              onViewInvoice={setSelectedInvoice}
              showToast={showToast}
              initialAddModalOpen={initialOpenNewReceivable}
              onCloseInitialAdd={() => setInitialOpenNewReceivable(false)}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentView
              payments={payments}
              receivables={receivables}
              showToast={showToast}
              quickPaymentReceivable={quickPaymentTarget}
              onClearQuickPayment={() => setQuickPaymentTarget(null)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportView
              receivables={receivables}
              customers={rawCustomers}
              onViewInvoice={setSelectedInvoice}
              onOpenQuickPayment={handleOpenQuickPayment}
              showToast={showToast}
            />
          )}

          {currentTab === 'database' && (
            <DatabaseSettingsView
              showToast={showToast}
              onRefreshData={() => setDbVersion((v) => v + 1)}
            />
          )}
        </main>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          receivable={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onOpenPayment={(rec) => {
            setSelectedInvoice(null);
            handleOpenQuickPayment(rec);
          }}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
