"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Settings, AlertCircle, CheckCircle, MessageSquare, Save, Send, Loader2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp'>('general');
  const [settings, setSettings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ modul: '', nomor_user: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // WA Settings state
  const [waSettings, setWaSettings] = useState({
    target_number: '',
    gateway_token: '',
    gateway_url: 'https://api.fonnte.com/send',
    is_enabled: 0,
    send_time: '20:00:00'
  });
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [savingWa, setSavingWa] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settData, usrData, waData, logData] = await Promise.all([
        fetch('/api/setting/notifikasi').then(r => r.json()),
        fetch('/api/master/user').then(r => r.json()),
        fetch('/api/setting/notifikasi/wa').then(r => r.json()),
        fetch('/api/setting/notifikasi/wa/logs').then(r => r.json())
      ]);
      if (settData.success) setSettings(settData.data);
      if (usrData.success) setUsers(usrData.data);
      if (waData.success) setWaSettings(waData.data);
      if (logData.success) setWaLogs(logData.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
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

  const handleSaveWa = async () => {
    setSavingWa(true);
    try {
      const res = await fetch('/api/setting/notifikasi/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waSettings)
      });
      const d = await res.json();
      if (d.success) {
        setMessage({ type: 'success', text: 'Setting WhatsApp berhasil disimpan' });
      } else {
        setMessage({ type: 'error', text: d.error || 'Gagal menyimpan setting WA' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingWa(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleTestWa = async () => {
    if (!confirm("Kirim laporan harian ke WhatsApp sekarang?")) return;
    setSendingTest(true);
    try {
      const res = await fetch('/api/report/daily-wa', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        alert("Laporan berhasil dikirim!");
        fetchAll(); // Refresh logs
      } else {
        alert("Gagal mengirim: " + d.error);
        fetchAll(); // Refresh logs in case of failure logging
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-balance">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg"><Bell className="h-6 w-6 text-violet-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Setting Notifikasi</h1>
          <p className="text-sm text-slate-500">Atur siapa yang menerima notifikasi otomatis dari sistem</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'general' ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Notifikasi Modul
        </button>
        <button 
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'whatsapp' ? 'bg-white dark:bg-slate-900 text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MessageSquare className="h-4 w-4" /> Laporan WA Owner
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
        </div>
      )}

      {activeTab === 'general' ? (
        <>
          {/* Add form */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4"><Settings className="h-4 w-4 text-violet-600" /><h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tambah Penerima Notifikasi</h2></div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Modul Transaksi</label>
                <select value={form.modul} onChange={e => setForm({ ...form, modul: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium">
                  <option value="">-- Pilih Modul --</option>
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">User Penerima</label>
                <select value={form.nomor_user} onChange={e => setForm({ ...form, nomor_user: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium">
                  <option value="">-- Pilih User --</option>
                  {users.map(u => <option key={u.nomor} value={u.nomor}>{u.nama} ({u.username})</option>)}
                </select>
              </div>
              <button onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 h-10 shadow-md shadow-violet-500/20">
                <Plus className="h-4 w-4" /> {adding ? "Menyimpan..." : "Tambah"}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-medium">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Daftar Penerima Notifikasi</h2>
            </div>
            {loading ? (
              <div className="px-4 py-8 text-center text-slate-400">Memuat data...</div>
            ) : settings.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">Belum ada setting notifikasi. Tambahkan di atas.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.map((group: any) => (
                  <div key={group.modul} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-full">
                        <Bell className="h-3 w-3" /> {group.modul}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.users.map((u: any) => (
                        <div key={u.nomor} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full text-sm border border-slate-200 dark:border-slate-700">
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
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" /> Pengaturan Laporan WhatsApp
            </h2>
            <p className="text-sm text-slate-500 mt-1">Konfigurasi pengiriman ringkasan laporan harian ke nomor WhatsApp Owner / Management.</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Nomor WhatsApp Penerima</span>
                  <input 
                    type="text" 
                    placeholder="Contoh: 08123456789"
                    value={waSettings.target_number}
                    onChange={e => setWaSettings({...waSettings, target_number: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none text-sm font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block px-1">* Gunakan format angka saja (08...)</span>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">API Token Gateway (Fonnte)</span>
                  <input 
                    type="password" 
                    placeholder="Masukkan token dari fonnte.com"
                    value={waSettings.gateway_token}
                    onChange={e => setWaSettings({...waSettings, gateway_token: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none text-sm font-medium"
                  />
                </label>
              </div>

              <div className="space-y-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Status Laporan Harian</h3>
                    <p className="text-xs text-slate-500">Kirim otomatis setiap hari</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {waSettings.is_enabled === 1 && (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Jam</span>
                        <input 
                          type="time" 
                          value={waSettings.send_time}
                          onChange={e => setWaSettings({...waSettings, send_time: e.target.value})}
                          className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 w-24"
                        />
                      </div>
                    )}
                    <button 
                      onClick={() => setWaSettings({...waSettings, is_enabled: waSettings.is_enabled ? 0 : 1})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${waSettings.is_enabled ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waSettings.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pratinjau Format Pesan</h3>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed max-h-[150px] overflow-auto whitespace-pre-wrap">
                    📊 *Laporan Harian*<br/>
                    Tanggal: 4 April 2026<br/><br/>
                    💰 *Total Penjualan*: Rp 5.200.000<br/>
                    📦 *Produk Terjual*: 120 item<br/>
                    📉 *Stok Hampir Habis*:<br/>
                    - Semen: 5 pcs<br/>
                    - Cat: 3 pcs<br/><br/>
                    📈 *Profit*: Rp 1.200.000
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleSaveWa}
                disabled={savingWa}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {savingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Perubahan
              </button>
              
              <button 
                onClick={handleTestWa}
                disabled={sendingTest}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin text-green-600" /> : <Send className="h-4 w-4 text-green-600" />}
                Test Kirim Sekarang
              </button>
            </div>

            {/* Logs Table */}
            <div className="pt-8 mt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                 <HistoryLogIcon className="h-4 w-4 text-slate-400" /> Riwayat Pengiriman Terakhir
              </h3>
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Waktu</th>
                      <th className="px-4 py-2.5">Target</th>
                      <th className="px-4 py-2.5">Jenis</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Memuat riwayat...</td></tr>
                    ) : waLogs.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat pengiriman.</td></tr>
                    ) : (
                      waLogs.map((log) => (
                        <tr key={log.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{log.target}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${log.jenis === 'MANUAL' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20'}`}>
                              {log.jenis}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 font-bold ${log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>
                              {log.status === 'SUCCESS' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryLogIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
  );
}
