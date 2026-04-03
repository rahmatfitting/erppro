"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, FileText, AlertCircle, Plus, Trash2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateSuratJalan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master data lists for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [gudangs, setGudangs] = useState<any[]>([]);
  const [barangs, setBarangs] = useState<any[]>([]);
  const [doList, setDoList] = useState<any[]>([]);

  useEffect(() => {
    // Fetch master data
    const fetchMasters = async () => {
      try {
        const [resCust, resSales, resGudang, resBarang, resDO] = await Promise.all([
          fetch('/api/master/customer'),
          fetch('/api/master/sales'),
          fetch('/api/master/gudang'),
          fetch('/api/master/barang'),
          fetch('/api/penjualan/delivery') // fetch Delivery Orders to pick from
        ]);
        const custData = await resCust.json();
        const salesData = await resSales.json();
        const gdgData = await resGudang.json();
        const brgData = await resBarang.json();
        const doData = await resDO.json();

        if (custData.success) setCustomers(custData.data.filter((c:any) => c.status_aktif === 1));
        if (salesData.success) setSalesList(salesData.data.filter((s:any) => s.status_aktif === 1));
        if (gdgData.success) setGudangs(gdgData.data.filter((g:any) => g.status_aktif === 1));
        if (brgData.success) setBarangs(brgData.data.filter((b:any) => b.status_aktif === 1));
        if (doData.success) setDoList(doData.data.filter((d:any) => d.status_aktif === 1 && d.status_disetujui === 1));
      } catch (err) {
        console.error("Failed to fetch master data", err);
      }
    };
    fetchMasters();
  }, []);

  const [header, setHeader] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    gudang: "",
    customer: "",
    sales: "",
    kode_delivery_order: "",
    kode_order_jual: "",
    nomor_kendaraan: "",
    sopir: "",
    valuta: "IDR",
    kurs: 1,
    keterangan: "",
    diskonNominal: 0,
    ppnNominal: 0,
  });

  const [items, setItems] = useState<any[]>([
    { kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, harga: 0, diskon_prosentase: 0, diskon_nominal: 0, netto: 0, subtotal: 0, keterangan: "" }
  ]);

  const loadDODetail = async (doCode: string) => {
     if (!doCode) return;
     try {
       const res = await fetch(`/api/penjualan/delivery/${doCode}`);
       const json = await res.json();
       if (json.success && json.data) {
          const dlvy = json.data;
          setHeader(prev => ({
             ...prev,
             customer: dlvy.customer,
             gudang: dlvy.gudang || prev.gudang,
             sales: dlvy.sales,
             kode_order_jual: dlvy.kode_order_jual,
             valuta: dlvy.valuta,
             kurs: dlvy.kurs,
             keterangan: `SJ untuk DO ${dlvy.kode}`,
             diskonNominal: dlvy.diskon_nominal,
             ppnNominal: dlvy.ppn_nominal,
          }));
          
          if (dlvy.items && dlvy.items.length > 0) {
             setItems(dlvy.items.map((i:any) => ({
                 kode_barang: i.kode_barang,
                 nama_barang: i.barang || i.nama_barang,
                 satuan: i.satuan,
                 jumlah: i.jumlah, // SJ usually ships what was ordered on DO
                 harga: i.harga,
                 diskon_prosentase: i.diskon_prosentase,
                 diskon_nominal: i.diskon_nominal,
                 netto: i.netto,
                 subtotal: i.subtotal,
                 keterangan: i.keterangan
             })));
          }
       }
     } catch (err) {
        console.error("Failed to load DO detail", err);
     }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: name === 'kurs' || name === 'diskonNominal' || name === 'ppnNominal' ? parseFloat(value) || 0 : value }));
    
    if (name === 'kode_delivery_order') {
       loadDODetail(value);
    }
  };

  const calculateItem = (item: any) => {
    const qty = parseFloat(item.jumlah) || 0;
    const price = parseFloat(item.harga) || 0;
    const discPct = parseFloat(item.diskon_prosentase) || 0;
    
    let discNom = parseFloat(item.diskon_nominal) || 0;
    if (discPct > 0) {
       discNom = price * (discPct / 100);
    }
    
    const netto = price - discNom;
    const subtotal = netto * qty;
    return { ...item, diskon_nominal: discNom, netto, subtotal };
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newItems = [...items];
    
    if (name === "kode_barang") {
      const selected = barangs.find(b => b.kode === value);
      if (selected) {
        newItems[index] = { 
          ...newItems[index], 
          kode_barang: selected.kode, 
          nama_barang: selected.nama, 
          satuan: selected.satuan,
          harga: selected.harga_jual || 0 
        };
      } else {
        newItems[index] = { ...newItems[index], kode_barang: value, nama_barang: "" };
      }
    } else {
      newItems[index] = { ...newItems[index], [name]: value };
    }

    if (['jumlah', 'harga', 'diskon_prosentase', 'diskon_nominal'].includes(name)) {
       newItems[index] = calculateItem(newItems[index]);
    }

    setItems(newItems);
  };

  const addItem = () => setItems([...items, { kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, harga: 0, diskon_prosentase: 0, diskon_nominal: 0, netto: 0, subtotal: 0, keterangan: "" }]);
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalSubtotalItems = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const dpp = totalSubtotalItems - header.diskonNominal;
  const grandTotal = dpp + header.ppnNominal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (items.some(i => !i.kode_barang || !i.nama_barang || i.jumlah <= 0)) {
         throw new Error("Lengkapi detail barang dengan benar");
      }

      const payload = {
        ...header,
        subtotal: totalSubtotalItems,
        dpp,
        grandTotal,
        items
      };

      const res = await fetch("/api/penjualan/surat-jalan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/penjualan/surat-jalan/${data.data.kode}`);
      } else {
        setError(data.error || "Gagal menyimpan data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/penjualan/surat-jalan" className="text-sm font-medium text-slate-500 hover:text-slate-700">
               Surat Jalan
             </Link>
             <span className="text-slate-300">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Tambah Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Buat Surat Jalan
          </h1>
        </div>
        <Link 
          href="/penjualan/surat-jalan"
          className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div><h3 className="text-sm font-medium text-red-800">Gagal</h3><p className="text-sm text-red-600 mt-1">{error}</p></div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Header Info */}
          <div className="p-6 md:p-8 space-y-6 border-b border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Informasi Dokumen</h3>
                
                {/* Reference DO Selection */}
                <div className="relative">
                   <select name="kode_delivery_order" value={header.kode_delivery_order} onChange={handleHeaderChange} className="pl-10 pr-4 py-2 text-sm border-2 border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg outline-none focus:border-indigo-500 font-medium">
                      <option value="">-- Tarik dari Delivery Order (DO) --</option>
                      {doList.map(dlvy => <option key={dlvy.kode} value={dlvy.kode}>{dlvy.kode} - {dlvy.customer}</option>)}
                   </select>
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal SJ <span className="text-red-500">*</span></label>
                  <input type="date" name="tanggal" required value={header.tanggal} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none"/>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gudang Asal <span className="text-red-500">*</span></label>
                  <select name="gudang" required value={header.gudang} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none">
                     <option value="">-- Pilih Gudang --</option>
                     {gudangs.map(g => <option key={g.kode} value={g.nama}>{g.kode} - {g.nama}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer <span className="text-red-500">*</span></label>
                  <select name="customer" required value={header.customer} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none">
                     <option value="">-- Pilih Customer --</option>
                     {customers.map(c => <option key={c.kode} value={c.nama}>{c.kode} - {c.nama}</option>)}
                     <option value="CASH">CASH (Langsung)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No Kendaraan / Plat</label>
                  <input type="text" name="nomor_kendaraan" value={header.nomor_kendaraan} onChange={handleHeaderChange} placeholder="Mis: B 1234 CD" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none"/>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pengemudi / Sopir</label>
                  <input type="text" name="sopir" value={header.sopir} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none"/>
                </div>
                
                <div className="space-y-2 lg:row-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan</label>
                  <textarea name="keterangan" rows={4} value={header.keterangan} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none resize-none" placeholder="Catatan pengiriman surat jalan..."/>
                </div>

                <div className="space-y-2 hidden">
                  <input type="text" name="valuta" value={header.valuta} onChange={handleHeaderChange}/>
                  <input type="number" name="kurs" value={header.kurs} onChange={handleHeaderChange}/>
                </div>
             </div>
          </div>

          {/* Details */}
          <div className="p-6 md:p-8 space-y-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Barang Fisik Dikirim</h3>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors">
                   <Plus className="h-4 w-4"/> Tambah Baris
                </button>
             </div>
             
             <div className="overflow-x-auto min-h-[200px]">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                   <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-y border-slate-200 dark:border-slate-700">
                         <th className="p-3 w-10 text-center">#</th>
                         <th className="p-3 w-72">Kode & Nama Barang</th>
                         <th className="p-3 w-32">Satuan</th>
                         <th className="p-3 w-32">Jml Fisik</th>
                         <th className="p-3 w-10 text-center"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                      {items.map((item, index) => (
                         <tr key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 text-center text-slate-500">{index + 1}</td>
                            <td className="p-2">
                               <select name="kode_barang" value={barangs.some(b => b.kode === item.kode_barang) ? item.kode_barang : "MANUAL"} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-indigo-500">
                                  <option value="">Pilih Barang...</option>
                                  {barangs.map(b => (
                                     <option key={b.kode} value={b.kode}>{b.kode} - {b.nama}</option>
                                  ))}
                                  <option value="MANUAL">-- Input Manual / Bebas --</option>
                               </select>
                               {(!barangs.some(b => b.kode === item.kode_barang) && item.kode_barang !== "") && (
                                 <input type="text" name="nama_barang" placeholder="Nama Barang Fisik" value={item.nama_barang} onChange={(e) => handleItemChange(index, e)} className="w-full mt-2 text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none" required/>
                               )}
                            </td>
                            <td className="p-2">
                               <input type="text" name="satuan" value={item.satuan} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"/>
                            </td>
                            <td className="p-2">
                               <input type="number" name="jumlah" min="1" step="0.01" value={item.jumlah} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-3 rounded border border-indigo-300 focus:border-indigo-500 font-semibold text-indigo-700 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-900/20 bg-indigo-50/50 outline-none text-center" required/>
                            </td>
                            <td className="p-2 text-center">
                               <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 className="h-4 w-4"/>
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="p-6 md:p-8 flex justify-end bg-slate-50 dark:bg-slate-900/50">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {loading ? "Menyimpan..." : "Simpan Surat Jalan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
