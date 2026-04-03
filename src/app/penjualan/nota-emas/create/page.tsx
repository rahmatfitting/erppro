"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, ArrowLeft, Plus } from "lucide-react";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";

export default function CreateNotaJualEmas() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentBuybackPrice, setCurrentBuybackPrice] = useState(0);

  useEffect(() => {
    async function fetchBuyback() {
      try {
        const res = await fetch('/api/buyback-prices/history');
        const json = await res.json();
        if (json.success && json.data.length > 0) {
           setCurrentBuybackPrice(parseFloat(json.data[json.data.length - 1].price_1g));
        }
      } catch (err) {
        console.error("Failed to fetch buyback price", err);
      }
    }
    fetchBuyback();
  }, []);

  // Form State
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jatuhTempo, setJatuhTempo] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState<{ id: string; nama: string } | null>(null);
  const [valuta, setValuta] = useState('IDR');
  const [nomormhvaluta, setNomormhvaluta] = useState(0);
  const [kurs, setKurs] = useState(1);
  const [keterangan, setKeterangan] = useState("");

  const [items, setItems] = useState<any[]>([]);

  // Modals
  const [isBrowseCustomer, setIsBrowseCustomer] = useState(false);
  const [isBrowseBarang, setIsBrowseBarang] = useState(false);
  const [isBrowseValuta, setIsBrowseValuta] = useState(false);

  // Auto Calculations
  const calculateTotal = useCallback(() => {
    let rawTotal = 0;
    items.forEach(item => {
      rawTotal += (item.harga * item.jumlah) - (item.diskon_nominal || 0);
    });
    return rawTotal;
  }, [items]);

  const subtotal = calculateTotal();
  const grandTotal = subtotal; // For gold sales, PPN is often 0 or dynamic. We keep it simple here.

  const handleAddItem = (barang: any) => {
    const harga = currentBuybackPrice;
    const jumlah = 1;
    const diskon_nominal = 0;
    const subtotalItem = (harga * jumlah) - diskon_nominal;
    setItems((prev) => [
      ...prev,
      {
        nomormhbarang: barang.nomor,
        kode_barang: barang.kode,
        nama_barang: barang.nama,
        nomormhsatuan: barang.nomormhsatuan,
        satuan: barang.satuan || 'Pcs',
        jumlah,
        harga,
        diskon_prosentase: 0,
        diskon_nominal,
        subtotal: subtotalItem,
        keterangan: ""
      }
    ]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto calc
      if (['jumlah', 'harga', 'diskon_nominal'].includes(field)) {
        const h = parseFloat(newItems[index].harga || 0);
        const j = parseFloat(newItems[index].jumlah || 0);
        const d = parseFloat(newItems[index].diskon_nominal || 0);
        newItems[index].subtotal = (h * j) - d;
      }

      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return alert("Pilih Kustomer terlebih dahulu!");
    if (items.length === 0) return alert("Pilih minimal 1 barang Emas!");

    setLoading(true);
    try {
      const payload = {
        tanggal,
        jatuhTempo,
        customer: customer.nama,
        nomormhcustomer: customer.id,
        valuta,
        nomormhvaluta,
        kurs,
        keterangan,
        subtotal,
        diskonNominal: 0,
        dpp: subtotal,
        ppnNominal: 0,
        ppnPersen: 0,
        grandTotal,
        items
      };

      const res = await fetch('/api/penjualan/nota-emas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        router.push(`/penjualan/nota-emas/${data.data.id}`);
      } else {
        alert(data.error || "Gagal menyimpan nota");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/penjualan/nota-emas" className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Buat Nota Jual Emas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pencatatan faktur jual (A/R) Emas Langsung</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/penjualan/nota-emas" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Batal
          </Link>
          <button 
             onClick={handleSubmit} 
             disabled={loading}
             className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Simpan Dokumen Jual
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal Transaksi</label>
              <input 
                type="date"
                required
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jatuh Tempo</label>
              <input 
                type="date"
                required
                value={jatuhTempo}
                onChange={e => setJatuhTempo(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kustomer (Customer) <span className="text-red-500">*</span></label>
              <div 
                 onClick={() => setIsBrowseCustomer(true)}
                 className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer hover:border-amber-400 flex items-center justify-between"
              >
                  <span className={customer ? "text-slate-900 dark:text-white font-medium" : "text-slate-400"}>
                     {customer ? customer.nama : "Pilih Kustomer..."}
                  </span>
                  <Plus className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Valuta</label>
                <div onClick={() => setIsBrowseValuta(true)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                  {valuta}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kurs</label>
                <input 
                  type="number"
                  required
                  value={kurs}
                  onChange={e => setKurs(parseFloat(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keterangan Umum</label>
              <textarea 
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                placeholder="Misal: Penjualan Emas Antam 100gr ke Toko Makmur..."
              />
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Detail Barang Tersedia</h3>
          </div>
          
          <div className="overflow-x-auto p-4">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 w-8">#</th>
                    <th className="pb-3 w-64">Item</th>
                    <th className="pb-3 w-32">Kuantitas</th>
                    <th className="pb-3 w-48">Harga Jual / Satuan</th>
                    <th className="pb-3 w-32">Diskon (Rp)</th>
                    <th className="pb-3 w-48 text-right">Subtotal</th>
                    <th className="pb-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-4 text-slate-400">{idx+1}</td>
                      <td className="py-4 font-medium text-slate-800 dark:text-slate-200">
                        {it.kode_barang} <br/>
                        <span className="text-xs text-slate-500 font-normal">{it.nama_barang}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             min={0.1} 
                             step={0.1}
                             value={it.jumlah} 
                             onChange={(e) => handleItemChange(idx, 'jumlah', e.target.value)}
                             className="w-20 p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-transparent focus:ring-1 focus:ring-amber-500 outline-none"
                           />
                           <span className="text-xs text-slate-500">{it.satuan}</span>
                        </div>
                      </td>
                       <td className="py-4">
                         <input 
                            type="number" 
                            readOnly
                            value={it.harga} 
                            className="w-full min-w-[120px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed outline-none"
                          />
                      </td>
                      <td className="py-4">
                         <input 
                            type="number" 
                            value={it.diskon_nominal} 
                            onChange={(e) => handleItemChange(idx, 'diskon_nominal', e.target.value)}
                            className="w-full min-w-[100px] p-1.5 border border-slate-200 dark:border-slate-700 rounded bg-transparent focus:ring-1 focus:ring-amber-500 outline-none text-rose-500"
                          />
                      </td>
                      <td className="py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {new Intl.NumberFormat('id-ID').format(it.subtotal || 0)}
                      </td>
                      <td className="py-4 text-center">
                        <button type="button" onClick={() => {
                          const c = [...items];
                          c.splice(idx, 1);
                          setItems(c);
                        }} className="text-red-500 hover:text-red-700 p-1 bg-red-50 dark:bg-red-500/10 rounded">✕</button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">Belum ada item Emas/Fisik yang ditambahkan. Klik 'Cari Emas' untuk memulai.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-950/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-end border-t border-slate-200 dark:border-slate-800 gap-4">
             <button 
               type="button"
               onClick={() => setIsBrowseBarang(true)}
               className="px-4 py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-800/50 rounded-xl text-sm font-bold uppercase flex items-center gap-2 transition-colors border border-amber-200 dark:border-amber-800/50"
             >
               <Plus className="h-5 w-5" /> Cari Emas
             </button>
             
             <div className="w-full max-w-sm space-y-3">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Subtotal</span>
                 <span className="font-semibold text-slate-700 dark:text-slate-300">{new Intl.NumberFormat('id-ID').format(subtotal)}</span>
               </div>
               <div className="flex justify-between items-center text-lg pt-3 border-t border-slate-200 dark:border-slate-800">
                 <span className="font-black text-slate-800 dark:text-white">Grand Total Tagihan</span>
                 <span className="font-black text-amber-600 dark:text-amber-400">Rp {new Intl.NumberFormat('id-ID').format(grandTotal)}</span>
               </div>
             </div>
          </div>
        </div>
      </form>
      {isBrowseCustomer && (
         <BrowseCustomerModal 
            isOpen={isBrowseCustomer}
            onClose={() => setIsBrowseCustomer(false)}
            onSelect={(c: any) => { setCustomer({ id: c.nomor, nama: c.nama }); setIsBrowseCustomer(false); }}
         />
      )}
      {isBrowseBarang && (
         <BrowseBarangModal 
            isOpen={isBrowseBarang}
            onClose={() => setIsBrowseBarang(false)}
            onSelect={(b: any) => { handleAddItem(b); setIsBrowseBarang(false); }}
            filterKategori="EMAS"
         />
      )}
      {isBrowseValuta && (
         <BrowseValutaModal 
            isOpen={isBrowseValuta}
            onClose={() => setIsBrowseValuta(false)}
            onSelect={(v: any) => { setValuta(v.kode); setNomormhvaluta(v.nomor); setKurs(v.kurs || 1); setIsBrowseValuta(false); }}
         />
      )}
    </div>
  );
}
