"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, ArrowUpCircle, Plus, Trash2, AlertCircle, Search } from "lucide-react";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseTransaksiModal } from "@/components/BrowseTransaksiModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

const REF_TYPES_KELUAR = [
  { value: 'nota_beli', label: 'Nota Pembelian' },
  { value: 'nks', label: 'Nota Kredit Supplier (NKS)' },
  { value: 'ums', label: 'Uang Muka Supplier (UMS)' },
  { value: 'umc', label: 'Uang Muka Customer (UMC)' },
];

export default function UangKeluarUtamaCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valutaList, setValutaList] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    metode: 'kas', nomormhaccount: 0, account_kode: '', account_nama: '',
    nomormhcustomer: 0, customer_nama: '',
    nomormhsupplier: 0, supplier_nama: '',
    keterangan: '', valuta: 'IDR', kurs: 1, total: 0, total_idr: 0,
  });
  const [items, setItems] = useState<any[]>([]);
  const [selisih, setSelisih] = useState<any[]>([]);

  // Modals state
  const [isBrowseAccountOpen, setIsBrowseAccountOpen] = useState(false);
  const [isBrowseCustomerOpen, setIsBrowseCustomerOpen] = useState(false);
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowseTransaksiOpen, setIsBrowseTransaksiOpen] = useState({ open: false, index: -1 });
  const [isBrowseAccountSelisihOpen, setIsBrowseAccountSelisihOpen] = useState({ open: false, index: -1 });

  useEffect(() => {
    fetch('/api/master/valuta').then(r => r.json()).then(v => { if (v.success) setValutaList(v.data); });
  }, []);

  const setField = (k: string, v: any) => setFormData(prev => ({ ...prev, [k]: v }));
  
  const addItem = () => setItems(prev => [...prev, { ref_jenis: '', ref_kode: '', ref_nomor: 0, account_hutang: 'Hutang Usaha', nominal_transaksi: 0, nominal_transaksi_idr: 0, total_bayar: 0, total_bayar_idr: 0, keterangan: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_,idx)=>idx!==i));
  const updateItem = (i: number, k: string, v: any) => setItems(prev => prev.map((it,idx) => {
    if (idx!==i) return it; 
    const u={...it,[k]:v};
    if (k==='nominal_transaksi') u.nominal_transaksi_idr=(parseFloat(v)||0)*formData.kurs;
    if (k==='total_bayar') u.total_bayar_idr=(parseFloat(v)||0)*formData.kurs;
    return u;
  }));

  const addSelisih = () => setSelisih(prev => [...prev, { nomormhaccount: 0, account_kode: '', account_nama: '', nominal: 0, keterangan: '' }]);
  const removeSelisih = (i: number) => setSelisih(prev => prev.filter((_,idx)=>idx!==i));
  const updateSelisih = (i: number, k: string, v: any) => setSelisih(prev => prev.map((s,idx) => (idx !== i ? s : { ...s, [k]: v })));

  const totalItems = items.reduce((s,it)=>s+(parseFloat(it.total_bayar)||0),0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const res = await fetch('/api/keuangan/uang-keluar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({jenis:1,...formData,total:totalItems,total_idr:totalItems*(formData.kurs||1),items,selisih}) });
    const d = await res.json();
    if (d.success) router.push(`/keuangan/uang-keluar-utama/${d.data.kode}`);
    else { setError(d.error||'Gagal'); setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/keuangan/uang-keluar-utama" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5"/></Link>
        <div className="flex items-center gap-2 flex-1"><ArrowUpCircle className="h-6 w-6 text-rose-600"/><h1 className="text-xl font-bold text-slate-900 dark:text-white">Uang Keluar Utama (UKU)</h1></div>
        <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"><Save className="h-4 w-4"/> {loading?'Menyimpan...':'Simpan'}</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error}</div>}
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 border-b pb-2">Informasi Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Tanggal *</label><input type="date" value={formData.tanggal} onChange={e=>setField('tanggal',e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500" required/></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Metode *</label><select value={formData.metode} onChange={e=>setField('metode',e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"><option value="kas">Kas</option><option value="bank">Bank</option></select></div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Account ({formData.metode === 'bank' ? 'Bank' : 'Kas'}) *</label>
               <div className="relative">
                  <input type="text" readOnly value={formData.account_nama ? `${formData.account_kode} - ${formData.account_nama}` : ''} placeholder="Pilih Account" className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white cursor-pointer" onClick={() => setIsBrowseAccountOpen(true)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
               </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
               <div className="relative">
                  <input type="text" readOnly value={formData.customer_nama || ''} placeholder="Cari Customer..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white cursor-pointer" onClick={() => setIsBrowseCustomerOpen(true)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
               </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Supplier</label>
               <div className="relative">
                  <input type="text" readOnly value={formData.supplier_nama || ''} placeholder="Cari Supplier..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white cursor-pointer" onClick={() => setIsBrowseSupplierOpen(true)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
               </div>
            </div>

            <div><label className="block text-xs font-medium text-slate-600 mb-1">Valuta</label><select value={formData.valuta} onChange={e=>setField('valuta',e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500">{valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode}</option>)}<option value="IDR">IDR</option></select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Kurs</label><input type="number" value={formData.kurs} onChange={e=>setField('kurs',parseFloat(e.target.value)||1)} min="1" className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
            <div className="lg:col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label><input type="text" value={formData.keterangan} onChange={e=>setField('keterangan',e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
          </div>
        </div>

        {/* Detail Transaksi */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detail Transaksi (Referensi Pembelian)</h2>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"><tr>{['#','Jenis Transaksi','Kode Ref','Account Hutang','Nominal','Nominal IDR','Total Bayar','Total IDR','Ket',''].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 text-xs">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length===0?<tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">Klik Tambah untuk menambah referensi</td></tr>
              :items.map((item,i)=>(
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-500">{i+1}</td>
                  <td className="px-3 py-2"><select value={item.ref_jenis} onChange={e=>{updateItem(i,'ref_jenis',e.target.value); updateItem(i, 'ref_kode', ''); updateItem(i, 'ref_nomor', 0); }} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none min-w-[140px]"><option value="">-- Pilih --</option>{REF_TYPES_KELUAR.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></td>
                  <td className="px-3 py-2">
                     <div className="relative">
                        <input type="text" readOnly value={item.ref_kode} placeholder="Pilih..." className="text-xs px-2 py-1 pr-7 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-32 cursor-pointer" onClick={() => item.ref_jenis && setIsBrowseTransaksiOpen({ open: true, index: i })} />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                     </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500 min-w-[100px]">{item.account_hutang}</td>
                  <td className="px-3 py-2"><input type="number" value={item.nominal_transaksi} onChange={e=>updateItem(i,'nominal_transaksi',parseFloat(e.target.value)||0)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-24 text-right"/></td>
                  <td className="px-3 py-2 text-slate-400 text-right w-20">{fmt(item.nominal_transaksi_idr)}</td>
                  <td className="px-3 py-2"><input type="number" value={item.total_bayar} onChange={e=>updateItem(i,'total_bayar',parseFloat(e.target.value)||0)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-24 text-right"/></td>
                  <td className="px-3 py-2 text-slate-400 text-right w-20">{fmt(item.total_bayar_idr)}</td>
                  <td className="px-3 py-2"><input type="text" value={item.keterangan} onChange={e=>updateItem(i,'keterangan',e.target.value)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none w-20"/></td>
                  <td className="px-3 py-2"><button type="button" onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors"><Plus className="h-3.5 w-3.5"/> Tambah Baris</button>
          </div>
        </div>

        {/* Detail Selisih */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detail Selisih</h2>
          </div>
          <table className="w-full text-xs"><thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"><tr>{['#','Account','Nominal','Keterangan',''].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selisih.length===0?<tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">Tidak ada selisih</td></tr>
              :selisih.map((s,i)=>(
                <tr key={i}><td className="px-3 py-2 text-slate-500">{i+1}</td>
                  <td className="px-3 py-2">
                     <div className="relative">
                        <input type="text" readOnly value={s.account_nama ? `${s.account_kode} - ${s.account_nama}` : ''} placeholder="Pilih Account..." className="text-xs px-2 py-1 pr-7 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none min-w-[180px] cursor-pointer" onClick={() => setIsBrowseAccountSelisihOpen({ open: true, index: i })} />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                     </div>
                  </td>
                  <td className="px-3 py-2"><input type="number" value={s.nominal} onChange={e=>updateSelisih(i,'nominal',parseFloat(e.target.value)||0)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white w-24 text-right"/></td>
                  <td className="px-3 py-2"><input type="text" value={s.keterangan} onChange={e=>updateSelisih(i,'keterangan',e.target.value)} className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white w-32"/></td>
                  <td className="px-3 py-2"><button type="button" onClick={()=>removeSelisih(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button type="button" onClick={addSelisih} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold rounded-lg transition-colors"><Plus className="h-3.5 w-3.5"/> Tambah Baris Selisih</button>
          </div>
        </div>

        {/* Total */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="max-w-xs ml-auto space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total Bayar</span><span className="font-bold text-rose-600">Rp {fmt(totalItems)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Total IDR</span><span>Rp {fmt(totalItems*(formData.kurs||1))}</span></div>
          </div>
        </div>
      </form>

      {/* Modals */}
      <BrowseAccountModal 
        isOpen={isBrowseAccountOpen} 
        onClose={() => setIsBrowseAccountOpen(false)} 
        kas={formData.metode === 'kas'}
        bank={formData.metode === 'bank'}
        detail={true}
        onSelect={(a) => { setFormData(prev => ({ ...prev, nomormhaccount: a.nomor, account_kode: a.kode, account_nama: a.nama })); setIsBrowseAccountOpen(false); }} 
      />
      
      <BrowseCustomerModal 
        isOpen={isBrowseCustomerOpen} 
        onClose={() => setIsBrowseCustomerOpen(false)} 
        onSelect={(c) => { 
          setFormData(prev => ({ ...prev, nomormhcustomer: c.nomor, customer_nama: c.nama, nomormhsupplier: 0, supplier_nama: '' })); 
          setIsBrowseCustomerOpen(false); 
        }} 
      />

      <BrowseSupplierModal 
        isOpen={isBrowseSupplierOpen} 
        onClose={() => setIsBrowseSupplierOpen(false)} 
        onSelect={(s) => { 
          setFormData(prev => ({ ...prev, nomormhsupplier: s.nomor, supplier_nama: s.nama, nomormhcustomer: 0, customer_nama: '' })); 
          setIsBrowseSupplierOpen(false); 
        }} 
      />

      <BrowseTransaksiModal 
        isOpen={isBrowseTransaksiOpen.open} 
        onClose={() => setIsBrowseTransaksiOpen({ open: false, index: -1 })} 
        type={items[isBrowseTransaksiOpen.index]?.ref_jenis}
        onSelect={(t) => {
          updateItem(isBrowseTransaksiOpen.index, 'ref_kode', t.kode);
          updateItem(isBrowseTransaksiOpen.index, 'ref_nomor', t.nomor);
          setIsBrowseTransaksiOpen({ open: false, index: -1 });
        }}
      />

      <BrowseAccountModal 
        isOpen={isBrowseAccountSelisihOpen.open} 
        onClose={() => setIsBrowseAccountSelisihOpen({ open: false, index: -1 })} 
        detail={true}
        onSelect={(a) => {
          updateSelisih(isBrowseAccountSelisihOpen.index, 'nomormhaccount', a.nomor);
          updateSelisih(isBrowseAccountSelisihOpen.index, 'account_kode', a.kode);
          updateSelisih(isBrowseAccountSelisihOpen.index, 'account_nama', a.nama);
          setIsBrowseAccountSelisihOpen({ open: false, index: -1 });
        }}
      />
    </div>
  );
}
