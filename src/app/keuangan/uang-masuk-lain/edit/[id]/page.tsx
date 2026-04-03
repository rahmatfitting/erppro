"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Plus, Trash2, AlertCircle, Search, ArrowDownCircle, Loader2 } from "lucide-react";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function UangMasukLainEdit() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valutaList, setValutaList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    tanggal: '',
    metode: 'kas', nomormhaccount: 0, account_kode: '', account_nama: '',
    keterangan: '', valuta: 'IDR', kurs: 1, total: 0, total_idr: 0,
  });
  const [items, setItems] = useState<any[]>([]);

  // Modals state
  const [isBrowseAccountOpen, setIsBrowseAccountOpen] = useState(false);
  const [isBrowseAccountDetailOpen, setIsBrowseAccountDetailOpen] = useState({ open: false, index: -1 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [valutaRes, dataRes] = await Promise.all([
          fetch('/api/master/valuta'),
          fetch(`/api/keuangan/uang-masuk/detail?id=${id}`)
        ]);
        
        const valutaJson = await valutaRes.json();
        if (valutaJson.success) setValutaList(valutaJson.data);

        const dataJson = await dataRes.json();
        if (dataJson.success && dataJson.header) {
          const h = dataJson.header;
          setFormData({
            tanggal: h.tanggal.split('T')[0],
            metode: h.metode,
            nomormhaccount: h.nomormhaccount,
            account_kode: h.account_kode,
            account_nama: h.account_nama,
            keterangan: h.keterangan || '',
            valuta: h.valuta || 'IDR',
            kurs: h.kurs || 1,
            total: h.total || 0,
            total_idr: h.total_idr || 0,
          });
          setItems(dataJson.items.map((it: any) => ({
            nomor: it.nomor,
            nomormhaccount: it.nomormhaccount,
            account_kode: it.account_kode,
            account_nama: it.account_nama,
            nominal: it.nominal,
            total_terbayar: it.total_terbayar,
            total_terbayar_idr: it.total_terbayar_idr,
            keterangan: it.keterangan || ''
          })));
        } else {
          setError(dataJson.error || "Data tidak ditemukan");
        }
      } catch (err) {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const setField = (k: string, v: any) => setFormData(prev => ({ ...prev, [k]: v }));
  const addItem = () => setItems(prev => [...prev, { nomormhaccount: 0, account_kode: '', account_nama: '', nominal: 0, total_terbayar: 0, total_terbayar_idr: 0, keterangan: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: any) => setItems(prev => prev.map((it, idx) => {
    if (idx !== i) return it;
    const u = { ...it, [k]: v };
    if (k === 'nominal') {
        u.total_terbayar = parseFloat(v) || 0;
        u.total_terbayar_idr = u.total_terbayar * formData.kurs;
    }
    return u;
  }));

  const totalItems = items.reduce((s, it) => s + (parseFloat(it.nominal) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch('/api/keuangan/uang-masuk', { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id, jenis: 0, ...formData, total: totalItems, total_idr: totalItems * (formData.kurs || 1), items }) 
    });
    const d = await res.json();
    if (d.success) router.push(`/keuangan/uang-masuk-lain/${id}`);
    else { setError(d.error || 'Gagal menyimpan'); setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-24 text-slate-400 gap-3"><Loader2 className="h-8 w-8 animate-spin" /> <span>Memuat data...</span></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/keuangan/uang-masuk-lain" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2 flex-1"><ArrowDownCircle className="h-6 w-6 text-emerald-600" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Edit UML ({formData.account_nama})</h1></div>
        <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Tanggal *</label><input type="date" value={formData.tanggal} onChange={e => setField('tanggal', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Metode *</label><select value={formData.metode} onChange={e => setField('metode', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"><option value="kas">Kas</option><option value="bank">Bank</option></select></div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Account Header {formData.metode === 'bank' ? '(Bank)' : '(Kas)'} *</label>
              <div className="relative">
                <input type="text" readOnly value={formData.account_nama ? `${formData.account_kode} - ${formData.account_nama}` : ''} placeholder="Pilih Account..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white cursor-pointer" onClick={() => setIsBrowseAccountOpen(true)} />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Valuta</label><select value={formData.valuta} onChange={e => setField('valuta', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">{valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode}</option>)}<option value="IDR">IDR</option></select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Kurs</label><input type="number" value={formData.kurs} onChange={e => setField('kurs', parseFloat(e.target.value) || 1)} min="1" className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            <div className="md:col-span-2 lg:col-span-1"><label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label><input type="text" value={formData.keterangan} onChange={e => setField('keterangan', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detail Account</h2>
          </div>
          <table className="w-full text-xs whitespace-nowrap"><thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"><tr>{['#', 'Account', 'Nominal', 'Nominal IDR', 'Keterangan', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 text-xs">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Klik Tambah untuk menambah account</td></tr>
                : items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <input type="text" readOnly value={item.account_nama ? `${item.account_kode} - ${item.account_nama}` : ''} placeholder="Pilih Account..." className="text-xs px-2 py-1 pr-7 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white cursor-pointer min-w-[200px]" onClick={() => setIsBrowseAccountDetailOpen({ open: true, index: i })} />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-3 py-2"><input type="number" value={item.nominal} onChange={e => updateItem(i, 'nominal', parseFloat(e.target.value) || 0)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-28 text-right" /></td>
                    <td className="px-3 py-2 text-slate-400 text-right w-24">{fmt(item.total_terbayar_idr)}</td>
                    <td className="px-3 py-2"><input type="text" value={item.keterangan} onChange={e => updateItem(i, 'keterangan', e.target.value)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-48" /></td>
                    <td className="px-3 py-2"><button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>))}
            </tbody>
          </table>
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 font-semibold text-emerald-700 text-xs rounded-lg transition-colors"><Plus className="h-3.5 w-3.5" /> Tambah Baris</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="max-w-xs ml-auto space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500 font-medium">Total</span><span className="font-bold text-emerald-600">Rp {fmt(totalItems)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Total IDR</span><span>Rp {fmt(totalItems * (formData.kurs || 1))}</span></div>
          </div>
        </div>
      </form>

      <BrowseAccountModal
        isOpen={isBrowseAccountOpen}
        onClose={() => setIsBrowseAccountOpen(false)}
        kas={formData.metode === 'kas'}
        bank={formData.metode === 'bank'}
        detail={true}
        onSelect={(a) => { setFormData(prev => ({ ...prev, nomormhaccount: a.nomor, account_kode: a.kode, account_nama: a.nama })); setIsBrowseAccountOpen(false); }}
      />

      <BrowseAccountModal
        isOpen={isBrowseAccountDetailOpen.open}
        onClose={() => setIsBrowseAccountDetailOpen({ open: false, index: -1 })}
        detail={true}
        excludeNomor={formData.nomormhaccount}
        onSelect={(a) => {
          updateItem(isBrowseAccountDetailOpen.index, 'nomormhaccount', a.nomor);
          updateItem(isBrowseAccountDetailOpen.index, 'account_kode', a.kode);
          updateItem(isBrowseAccountDetailOpen.index, 'account_nama', a.nama);
          setIsBrowseAccountDetailOpen({ open: false, index: -1 });
        }}
      />
    </div>
  );
}
