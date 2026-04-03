"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Settings, AlertCircle, CheckCircle } from "lucide-react";

const MODULES = [
  "Permintaan Pembelian", "Order Pembelian", "Penerimaan Barang", "Nota Pembelian",
  "Retur Beli", "Nota Kredit Supplier", "Nota Debet Supplier", "Uang Muka Supplier",
  "Order Penjualan", "Delivery Order", "Surat Jalan", "Nota Penjualan",
  "Retur Jual", "Nota Kredit Customer", "Nota Debet Customer", "Uang Muka Customer",
  "Uang Masuk Utama", "Uang Masuk Lain", "Uang Keluar Utama", "Uang Keluar Lain",
  "Stok Opname", "Transfer Antar Gudang", "Pemakaian Internal", "Transformasi Barang",
  "Master Kategori Barang",
];

export default function NotifikasiSettingPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ modul: '', nomor_user: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [settData, usrData] = await Promise.all([
      fetch('/api/setting/notifikasi').then(r => r.json()),
      fetch('/api/master/user').then(r => r.json()),
    ]);
    if (settData.success) setSettings(settData.data);
    if (usrData.success) setUsers(usrData.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdd = async () => {
    if (!form.modul || !form.nomor_user) { setMessage({ type: 'error', text: 'Pilih modul dan user' }); return; }
    setAdding(true);
    const res = await fetch('/api/setting/notifikasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modul: form.modul, nomor_user: parseInt(form.nomor_user) }) });
    const d = await res.json();
    if (d.success) { setMessage({ type: 'success', text: 'Setting berhasil disimpan' }); setForm({ modul: '', nomor_user: '' }); fetchAll(); }
    else setMessage({ type: 'error', text: d.error || 'Gagal menyimpan' });
    setAdding(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus setting notifikasi ini?")) return;
    await fetch(`/api/setting/notifikasi?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // Group settings by module
  const grouped = settings;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg"><Bell className="h-6 w-6 text-violet-600" /></div>
        <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Setting Notifikasi</h1><p className="text-sm text-slate-500">Atur siapa yang menerima notifikasi dari setiap modul transaksi</p></div>
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4"><Settings className="h-4 w-4 text-violet-600" /><h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tambah Setting</h2></div>
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Modul Transaksi</label>
            <select value={form.modul} onChange={e => setForm({ ...form, modul: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">-- Pilih Modul --</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">User Penerima Notifikasi</label>
            <select value={form.nomor_user} onChange={e => setForm({ ...form, nomor_user: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">-- Pilih User --</option>
              {users.map(u => <option key={u.nomor} value={u.nomor}>{u.nama} ({u.username})</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            <Plus className="h-4 w-4" /> {adding ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Daftar Setting Notifikasi</h2>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-400">Memuat data...</div>
        ) : grouped.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400">Belum ada setting notifikasi. Tambahkan di atas.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {grouped.map((group: any) => (
              <div key={group.modul} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-full">
                    <Bell className="h-3 w-3" /> {group.modul}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.users.map((u: any) => (
                    <div key={u.nomor} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full text-sm">
                      <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold uppercase">
                        {u.user_nama ? u.user_nama[0] : 'U'}
                      </div>
                      <span>{u.user_nama || u.username}</span>
                      <button onClick={() => handleDelete(u.nomor)} className="text-red-400 hover:text-red-600 transition-colors ml-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
