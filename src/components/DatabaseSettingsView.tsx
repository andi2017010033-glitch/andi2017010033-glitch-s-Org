/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  Cloud,
  CheckCircle2,
  Table,
  Link
} from 'lucide-react';
import { db } from '../lib/database';

interface DatabaseSettingsViewProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export const DatabaseSettingsView: React.FC<DatabaseSettingsViewProps> = ({
  showToast,
  onRefreshData,
}) => {
  const [copied, setCopied] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState(db.getSupabaseConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const sqlCode = db.generateSupabaseSQL();

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    showToast('Skrip SQL Supabase berhasil disalin ke clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSupabaseConfig(supabaseConfig);
    showToast('Pengaturan konfigurasi Supabase berhasil disimpan.', 'success');
  };

  const handleTestConnection = async () => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      showToast('Masukkan Supabase URL dan Anon Public Key terlebih dahulu.', 'error');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test URL validity
      const url = new URL(supabaseConfig.url);
      const res = await fetch(`${url.origin}/rest/v1/`, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
      });

      if (res.ok || res.status === 200 || res.status === 404 || res.status === 401) {
        setTestResult('Koneksi endpoint Supabase berhasil dijangkau!');
        showToast('Koneksi endpoint Supabase aktif dan dapat diakses.', 'success');
      } else {
        setTestResult(`Response HTTP: ${res.status} ${res.statusText}`);
      }
    } catch {
      setTestResult('Gagal menghubungi host Supabase. Pastikan URL valid dan CORS mengizinkan akses.');
      showToast('Gagal menghubungi endpoint Supabase.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportJSON = () => {
    const backupStr = db.exportBackup();
    const today = new Date().toISOString().split('T')[0];
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_rekap_piutang_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Data cadangan JSON berhasil diunduh.', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = db.importBackup(content);
      if (res.success) {
        showToast(res.message, 'success');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetSeedData = () => {
    if (confirm('Apakah Anda yakin ingin mengatur ulang data ke data awal bawaan (Nota BD RENI OKTARIA)?')) {
      db.resetToDefault();
      showToast('Database berhasil direset ke data awal.', 'success');
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Arsitektur Database */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Arsitektur Database Supabase</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur 3 tabel relasional (Pelanggan, Piutang, Pembayaran) sesuai spesifikasi teknis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySQL}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Skrip SQL Supabase'}</span>
            </button>
          </div>
        </div>

        {/* 3 Skema Tabel Ringkas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Tabel 1: customers */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Table className="w-4 h-4 text-blue-600" />
              <span>1. customers</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1 font-mono">
              <li><span className="text-blue-700 font-semibold">id:</span> UUID (PK)</li>
              <li><span className="text-blue-700 font-semibold">name:</span> TEXT NOT NULL</li>
              <li><span className="text-blue-700 font-semibold">phone:</span> TEXT</li>
              <li><span className="text-blue-700 font-semibold">address:</span> TEXT</li>
              <li><span className="text-blue-700 font-semibold">created_at:</span> TIMESTAMP</li>
            </ul>
          </div>

          {/* Tabel 2: receivables */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Table className="w-4 h-4 text-amber-600" />
              <span>2. receivables</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1 font-mono">
              <li><span className="text-amber-700 font-semibold">id:</span> UUID (PK)</li>
              <li><span className="text-amber-700 font-semibold">customer_id:</span> UUID (FK)</li>
              <li><span className="text-amber-700 font-semibold">invoice_number:</span> UNIQUE</li>
              <li><span className="text-amber-700 font-semibold">transaction_date:</span> DATE</li>
              <li><span className="text-amber-700 font-semibold">due_date:</span> DATE</li>
              <li><span className="text-amber-700 font-semibold">total_amount:</span> NUMERIC</li>
              <li><span className="text-amber-700 font-semibold">remaining_amount:</span> NUMERIC</li>
              <li><span className="text-amber-700 font-semibold">status:</span> TEXT</li>
            </ul>
          </div>

          {/* Tabel 3: payments */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Table className="w-4 h-4 text-emerald-600" />
              <span>3. payments</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1 font-mono">
              <li><span className="text-emerald-700 font-semibold">id:</span> UUID (PK)</li>
              <li><span className="text-emerald-700 font-semibold">receivable_id:</span> UUID (FK)</li>
              <li><span className="text-emerald-700 font-semibold">payment_date:</span> DATE</li>
              <li><span className="text-emerald-700 font-semibold">amount:</span> NUMERIC</li>
              <li><span className="text-emerald-700 font-semibold">payment_method:</span> TEXT</li>
              <li><span className="text-emerald-700 font-semibold">notes:</span> TEXT</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Supabase Integration Configuration Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Cloud className="w-5 h-5 text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-900">Koneksi Proyek Supabase Cloud (Opsional)</h4>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Aplikasi ini telah aktif dengan penyimpanan lokal yang tersimpan otomatis di peramban. Jika Anda memiliki proyek di Supabase, Anda dapat memasukkan kredensial proyek di bawah ini:
        </p>

        <form onSubmit={handleSaveConfig} className="mt-4 space-y-3 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzprojectid.supabase.co"
              value={supabaseConfig.url}
              onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseConfig.anonKey}
              onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              Simpan Konfigurasi
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Link className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>
          </div>

          {testResult && (
            <div className="mt-2 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              {testResult}
            </div>
          )}
        </form>
      </div>

      {/* Cadangan & Pemulihan (Backup & Restore) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200">
          Cadangan & Pemulihan Data
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors group flex flex-col justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit">
                <Download className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mt-3">Cadangkan Data (JSON)</h5>
              <p className="text-xs text-slate-500 mt-1">
                Unduh seluruh data pelanggan, faktur piutang, dan pembayaran ke file komputer.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-600 group-hover:underline">
              Unduh File Cadangan →
            </div>
          </button>

          {/* Import JSON */}
          <label className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors group flex flex-col justify-between cursor-pointer">
            <div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 w-fit">
                <Upload className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mt-3">Pulihkan Data (JSON)</h5>
              <p className="text-xs text-slate-500 mt-1">
                Unggah dan pulihkan file cadangan JSON yang pernah Anda simpan sebelumnya.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-blue-600 group-hover:underline">
              Pilih File Cadangan →
            </div>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Reset ke Data Awal */}
          <button
            onClick={handleResetSeedData}
            className="p-4 rounded-xl border border-slate-200 hover:bg-rose-50/50 text-left transition-colors group flex flex-col justify-between"
          >
            <div>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 w-fit">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-sm mt-3">Reset Data Bawaan</h5>
              <p className="text-xs text-slate-500 mt-1">
                Kembalikan data ke contoh awal (termasuk nota BD RENI OKTARIA nomor PJ2609170026).
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-rose-600 group-hover:underline">
              Reset ke Data Awal →
            </div>
          </button>
        </div>
      </div>

      {/* SQL Script View */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-5 shadow-xs font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="text-slate-400 font-bold">SQL Schema Supabase (PostgreSQL DDL)</div>
          <button
            onClick={handleCopySQL}
            className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-sans font-medium"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto text-slate-300 leading-relaxed max-h-64 overflow-y-auto">
          {sqlCode}
        </pre>
      </div>
    </div>
  );
};
