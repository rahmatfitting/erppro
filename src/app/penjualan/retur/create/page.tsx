"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Plus, Trash2, FileX, AlertCircle, Search, MapPin, Users, Receipt } from "lucide-react";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseNotaJualModal } from "@/components/BrowseNotaJualModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function ReturJualCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valutaList, setValutaList] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ 
    tanggal: new Date().toISOString().split('T')[0], 
    customer: "", 
    nomormhcustomer: 0, 
    keterangan: "", 
    valuta: "IDR", 
    kurs: 1,
    nomormhgudang: 0,
    gudang_nama: "",
    kode_nota_jual: "",
    nomorthjual: 0,
    tipe_nota: "" // 'Nota' or 'POS'
  });
  const [items, setItems] = useState<any[]>([]);
  const [sourceItems, setSourceItems] = useState<any[]>([]); // Items from selected Nota/POS

  const [isBrowseCustomerOpen, setIsBrowseCustomerOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseNotaOpen, setIsBrowseNotaOpen] = useState(false);

  useEffect(() => {
    fetch('/api/master/valuta').then(r => r.json()).then(v => {
      if (v.success) setValutaList(v.data);
    });
  }, []);

  const handleSelectNota = async (nota: any) => {
    setLoading(true);
    setIsBrowseNotaOpen(false);
    try {
      const endpoint = nota.tipe === 'POS' ? `/api/penjualan/pos/${nota.kode}` : `/api/penjualan/nota/${nota.kode}`;
      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        const h = json.data;
        setFormData(prev => ({
          ...prev,
          kode_nota_jual: h.kode,
          nomorthjual: h.nomor,
          tipe_nota: nota.tipe,
          customer: h.customer,
          nomormhcustomer: h.nomormhcustomer || 0,
          valuta: h.valuta || 'IDR',
          kurs: h.kurs || 1
        }));
        setSourceItems(h.items || []);
        // Optionally auto-populate items? User said "barang yang diretur akan sesuai dengan kode nota jual atau pos"
        // I will clear current items and let them pick from sourceItems or just populate all with 0 qty
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil detail nota");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { nomormhbarang: 0, kode_barang: '', nama_barang: '', satuan: '', jumlah: 0, harga: 0, diskon_prosentase: 0, diskon_nominal: 0, netto: 0, subtotal: 0, keterangan: '' }]);
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  
  const updateItem = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const u = { ...item, [field]: value };
      
      if (field === 'kode_barang') {
        const b = sourceItems.find(x => x.kode_barang === value);
        if (b) {
          u.nomormhbarang = b.nomormhbarang;
          u.nama_barang = b.nama_barang;
          u.satuan = b.satuan;
          u.harga = b.harga || 0;
          u.max_jumlah = b.jumlah; // Track max qty from nota
        }
      }

      const harga = parseFloat(u.harga || 0);
      const jumlah = parseFloat(u.jumlah || 0);
      const discPct = parseFloat(u.diskon_prosentase || 0);
      
      let discNom = u.diskon_nominal;
      if (field === 'diskon_prosentase') {
        discNom = harga * (discPct / 100);
        u.diskon_nominal = discNom;
      } else if (field === 'diskon_nominal') {
        u.diskon_prosentase = harga > 0 ? (parseFloat(value) / harga) * 100 : 0;
      }

      u.netto = harga - discNom;
      u.subtotal = jumlah * u.netto;
      return u;
    }));
  };

  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const dpp = subtotal;
  const ppnNominal = 0;
  const grandTotal = dpp + ppnNominal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer || items.length === 0) { setError("Customer dan item wajib diisi"); return; }
    if (items.some(it => it.jumlah <= 0)) { setError("Jumlah item harus lebih dari 0"); return; }
    
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/penjualan/retur", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          jenis: 'RJ', 
          ...formData, 
          subtotal, 
          dpp, 
          ppnNominal, 
          grandTotal, 
          diskonNominal: 0, 
          items 
        }) 
      });
      const d = await res.json();
      if (d.success) router.push(`/penjualan/retur/${d.data.kode}`);
      else setError(d.error || "Gagal menyimpan");
    } catch { setError("Gagal menghubungi server"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/penjualan/retur" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2 flex-1"><FileX className="h-6 w-6 text-rose-600" /><h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Buat Retur Jual</h1></div>
        <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-rose-200">
          <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan Retur"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse"><AlertCircle className="h-4 w-4" /> {error}</div>}
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2">Informasi Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tanggal <span className="text-red-500">*</span></label>
              <input type="date" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold" required />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nota Jual / POS <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" readOnly onClick={() => setIsBrowseNotaOpen(true)} value={formData.kode_nota_jual} placeholder="Pilih Nota..." className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold cursor-pointer pr-10" required />
                <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer</label>
              <div className="relative">
                <input type="text" readOnly onClick={() => setIsBrowseCustomerOpen(true)} value={formData.customer} placeholder="Browse Customer..." className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white font-bold cursor-pointer pr-10" />
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gudang <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" readOnly onClick={() => setIsBrowseGudangOpen(true)} value={formData.gudang_nama} placeholder="Pilih Gudang..." className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold cursor-pointer pr-10" required />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valuta</label>
              <select value={formData.valuta} onChange={e => setFormData({ ...formData, valuta: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold">
                {valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode}</option>)}
                <option value="IDR">IDR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kurs</label>
              <input type="number" value={formData.kurs} onChange={e => setFormData({ ...formData, kurs: parseFloat(e.target.value) || 1 })} className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold" min="1" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keterangan</label>
              <input type="text" value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })} placeholder="Catatan retur..." className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detail Barang</h2>
            <button type="button" onClick={addItem} disabled={!formData.kode_nota_jual} className="inline-flex items-center gap-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-widest shadow-md"><Plus className="h-3.5 w-3.5" /> Tambah Baris</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Barang (Dari Nota)</th>
                  <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest">Satuan</th>
                  <th className="px-3 py-3 text-right font-black text-slate-400 uppercase tracking-widest w-24">Jumlah</th>
                  <th className="px-3 py-3 text-right font-black text-slate-400 uppercase tracking-widest w-28">Harga</th>
                  <th className="px-3 py-3 text-right font-black text-slate-400 uppercase tracking-widest w-20">Disk%</th>
                  <th className="px-3 py-3 text-right font-black text-slate-400 uppercase tracking-widest w-28">Netto</th>
                  <th className="px-3 py-3 text-right font-black text-slate-400 uppercase tracking-widest w-28">Subtotal</th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Pilih Nota Jual dahulu lalu tambah baris</td></tr>
                ) : items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-2 text-slate-400 font-bold">{i + 1}</td>
                    <td className="px-3 py-2">
                       <select value={item.kode_barang} onChange={e => updateItem(i, 'kode_barang', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold" required>
                         <option value="">-- Pilih Barang --</option>
                         {sourceItems.map(si => <option key={si.kode_barang} value={si.kode_barang}>{si.kode_barang} - {si.nama_barang}</option>)}
                       </select>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-bold uppercase">{item.satuan || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end">
                        <input type="number" value={item.jumlah} onChange={e => updateItem(i, 'jumlah', parseFloat(e.target.value) || 0)} className="w-20 text-right px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold" min="0.01" step="0.01" />
                        {item.max_jumlah && <span className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-tighter">Max: {item.max_jumlah}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2"><input type="number" value={item.harga} readOnly className="w-24 text-right px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold" /></td>
                    <td className="px-3 py-2"><input type="number" value={item.diskon_prosentase} onChange={e => updateItem(i, 'diskon_prosentase', parseFloat(e.target.value) || 0)} min="0" max="100" className="w-16 text-right px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" /></td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmt(item.netto)}</td>
                    <td className="px-3 py-2 text-right font-black text-rose-600 tabular-nums">{fmt(item.subtotal)}</td>
                    <td className="px-3 py-2"><button type="button" onClick={() => removeItem(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="max-w-xs ml-auto space-y-3">
            {[{l:'Subtotal',v:subtotal},{l:'DPP',v:dpp},{l:'PPN (0%)',v:ppnNominal},{l:'Total Retur',v:grandTotal,bold:true,hl:true},{l:`Total IDR (x${formData.kurs})`,v:grandTotal*formData.kurs,small:true}].map(r=>(
              <div key={r.l} className={`flex justify-between items-center ${r.hl?'border-t border-rose-100 pt-3 mt-3':''}`}>
                <span className={`uppercase tracking-widest font-black text-slate-400 ${r.small?'text-[9px]':'text-[10px]'}`}>{r.l}</span>
                <span className={`tabular-nums ${r.bold?'text-lg font-black text-rose-600':'text-sm font-bold text-slate-700 dark:text-slate-200'}`}>Rp {fmt(r.v)}</span>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Modals */}
      <BrowseCustomerModal isOpen={isBrowseCustomerOpen} onClose={() => setIsBrowseCustomerOpen(false)} onSelect={c => { setFormData(p => ({ ...p, nomormhcustomer: c.nomor, customer: c.nama })); setIsBrowseCustomerOpen(false); }} />
      <BrowseGudangModal isOpen={isBrowseGudangOpen} onClose={() => setIsBrowseGudangOpen(false)} onSelect={g => { setFormData(p => ({ ...p, nomormhgudang: g.nomor, gudang_nama: g.nama })); setIsBrowseGudangOpen(false); }} />
      <BrowseNotaJualModal isOpen={isBrowseNotaOpen} onClose={() => setIsBrowseNotaOpen(false)} onSelect={handleSelectNota} nomormhcustomer={formData.nomormhcustomer} />
    </div>
  );
}

