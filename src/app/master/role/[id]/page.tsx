"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, Loader2, Settings, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MENU_LIST = [
  // Master Data - Inventory
  "Kategori Barang", "Master Barang", "Satuan", "Gudang",
  // Master Data - Koneksi
  "Vendor / Supplier", "Customer", "Sales / Karyawan",
  // Master Data - Finansial
  "Valuta", "Jenis Penyesuaian",
  // Pembelian
  "Permintaan Pembelian", "Order Pembelian", "Penerimaan Barang", "Nota Pembelian",
  // Penjualan
  "Order Penjualan", "Delivery Order", "Surat Jalan", "Nota Penjualan", "POS Kasir",
  // Keuangan
  "Uang Masuk Utama", "Uang Masuk Lain", "Uang Keluar Utama", "Uang Keluar Lain",
  // Laporan
  "Laporan Piutang", "Laporan Hutang", "Laporan Kas Bank", "Laporan Laba Rugi",
  // Stok
  "Stok Opname", "Transfer Antar Gudang", "Pemakaian Internal", "Transformasi Barang",
  // Sistem
  "Master User", "Master Role"
];

export default function RoleEdit() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    keterangan: "",
  });

  const [access, setAccess] = useState<Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean; approve: boolean }>>(
     MENU_LIST.reduce((acc, menu) => ({
        ...acc,
        [menu]: { view: false, add: false, edit: false, delete: false, approve: false }
     }), {})
  );

  const fetchRole = async () => {
    try {
      const res = await fetch(`/api/master/role/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setFormData({
            kode: json.data.kode || "",
            nama: json.data.nama || "",
            keterangan: json.data.keterangan || "",
        });
        
        if (json.data.hak_akses && Array.isArray(json.data.hak_akses)) {
            setAccess(prev => {
                const newAccess = { ...prev };
                json.data.hak_akses.forEach((hak: any) => {
                    if (MENU_LIST.includes(hak.menu)) {
                        newAccess[hak.menu] = {
                            view: hak.view,
                            add: hak.add,
                            edit: hak.edit,
                            delete: hak.delete,
                            approve: hak.approve
                        };
                    }
                });
                return newAccess;
            });
        }
      } else {
        setError("Data grup tidak ditemukan");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data role");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchRole();
  }, [id]);

  const handleAccessChange = (menu: string, field: 'view' | 'add' | 'edit' | 'delete' | 'approve', checked: boolean) => {
     setAccess(prev => ({
        ...prev,
        [menu]: {
           ...prev[menu],
           [field]: checked,
           ...(field === 'view' && !checked ? { add: false, edit: false, delete: false, approve: false } : {}),
           ...(field !== 'view' && checked ? { view: true } : {})
        }
     }));
  };

  const toggleAll = (menu: string, checkAll: boolean) => {
     setAccess(prev => ({
        ...prev,
        [menu]: { view: checkAll, add: checkAll, edit: checkAll, delete: checkAll, approve: checkAll }
     }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const hak_akses = Object.entries(access)
      .filter(([_, perms]) => perms.view)
      .map(([menu, perms]) => ({ menu, ...perms }));

    try {
      const res = await fetch(`/api/master/role/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, hak_akses }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      router.push("/master/role");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
      setLoading(false);
    }
  };

  if (fetching) {
     return <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Link href="/master/role" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <Settings className="h-6 w-6 text-indigo-600" /> Edit Role & Hak Akses
               </h1>
               <p className="text-sm text-slate-500 mt-1">Perbarui profil dan wewenang grup <span className="font-bold text-slate-600">{formData.kode}</span>.</p>
            </div>
         </div>
         <button
            onClick={handleSubmit}
            disabled={loading || !formData.nama || formData.kode === 'SA'}
            className="flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
         >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Perbarui Role"}
         </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-100 flex items-center gap-2">
           <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      {formData.kode === 'SA' && (
         <div className="p-4 bg-amber-50 text-amber-800 border-l-4 border-amber-500 rounded-r-lg text-sm font-medium shadow-sm flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <p><strong>Grup Super Admin (SA)</strong> tidak dapat diubah hak aksesnya. Semua *checkbox* aktif adalah simulasi fungsional super user.</p>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-1 h-fit sticky top-24">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2 mb-4">Profil Grup</h2>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Grup</label>
                <input 
                  type="text" 
                  value={formData.kode}
                  readOnly
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500 font-medium"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Role <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  disabled={formData.kode === 'SA'}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                  required 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  disabled={formData.kode === 'SA'}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                />
             </div>
         </div>

         <div className={cn(
            "bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden transition-all",
            formData.kode === 'SA' ? "opacity-60 pointer-events-none" : ""
         )}>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
               <ShieldCheck className="h-5 w-5 text-indigo-600" />
               <h2 className="text-base font-bold text-slate-800">Matrix Hak Akses Menu</h2>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200">
                     <tr>
                        <th className="px-4 py-3 font-semibold">Nama Menu</th>
                        <th className="px-4 py-3 font-semibold text-center w-16 text-indigo-700">View</th>
                        <th className="px-4 py-3 font-semibold text-center w-16 text-blue-700">Add</th>
                        <th className="px-4 py-3 font-semibold text-center w-16 text-amber-600">Edit</th>
                        <th className="px-4 py-3 font-semibold text-center w-16 text-red-600">Delete</th>
                        <th className="px-4 py-3 font-semibold text-center w-16 text-emerald-600">Approve</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {MENU_LIST.map((menu) => (
                        <tr key={menu} className="hover:bg-slate-50/50">
                           <td className="px-4 py-3 text-slate-800 font-medium border-r border-slate-100">
                              {menu}
                              <button 
                                 type="button"
                                 onClick={() => toggleAll(menu, !access[menu].view)}
                                 className="ml-3 text-[10px] uppercase font-bold text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 border border-slate-200 rounded"
                              >
                                 {access[menu].view && access[menu].add && access[menu].edit && access[menu].delete && access[menu].approve ? "Uncheck All" : "Check All"}
                              </button>
                           </td>
                           <td className="px-4 py-3 text-center bg-indigo-50/30">
                              <input type="checkbox" checked={formData.kode === 'SA' ? true : access[menu].view} onChange={e => handleAccessChange(menu, 'view', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center hover:bg-slate-50">
                              <input type="checkbox" checked={formData.kode === 'SA' ? true : access[menu].add} onChange={e => handleAccessChange(menu, 'add', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center border-l border-slate-100 hover:bg-slate-50">
                              <input type="checkbox" checked={formData.kode === 'SA' ? true : access[menu].edit} onChange={e => handleAccessChange(menu, 'edit', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center hover:bg-slate-50">
                              <input type="checkbox" checked={formData.kode === 'SA' ? true : access[menu].delete} onChange={e => handleAccessChange(menu, 'delete', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center border-l bg-emerald-50/20 hover:bg-emerald-50/50">
                              <input type="checkbox" checked={formData.kode === 'SA' ? true : access[menu].approve} onChange={e => handleAccessChange(menu, 'approve', e.target.checked)} className="h-4 w-4 accent-emerald-600 cursor-pointer rounded border-slate-300" />
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
