"use client";

import { useState } from "react";
import { Save, ArrowLeft, Loader2, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MENU_LIST = [
  "Master Barang", "Master Satuan", "Master Supplier", "Master Customer", "Master Sales", "Master Gudang", "Master Valuta",
  "Jenis Penyesuaian",
  "Permintaan Pembelian", "Order Pembelian", "Penerimaan Barang", "Nota Pembelian",
  "Order Penjualan", "Delivery Order", "Surat Jalan", "Nota Penjualan", "POS Kasir",
  "Uang Masuk Utama", "Uang Masuk Lain", "Uang Keluar Utama", "Uang Keluar Lain",
  "Laporan Piutang", "Laporan Hutang", "Laporan Kas Bank", "Laporan Laba Rugi",
  "Stok Opname", "Transfer Antar Gudang", "Pemakaian Internal", "Transformasi Barang",
  "Master User", "Master Role"
];

export default function RoleCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    keterangan: "",
  });

  // State Matrix Hak Akses
  const [access, setAccess] = useState<Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean; approve: boolean }>>(
     MENU_LIST.reduce((acc, menu) => ({
        ...acc,
        [menu]: { view: false, add: false, edit: false, delete: false, approve: false }
     }), {})
  );

  const handleAccessChange = (menu: string, field: 'view' | 'add' | 'edit' | 'delete' | 'approve', checked: boolean) => {
     setAccess(prev => ({
        ...prev,
        [menu]: {
           ...prev[menu],
           [field]: checked,
           // Jika view dimatikan, matikan semua
           ...(field === 'view' && !checked ? { add: false, edit: false, delete: false, approve: false } : {}),
           // Jika aksi dihidupkan, hidupkan view
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

    // Filter out menu that has at least view access
    const hak_akses = Object.entries(access)
      .filter(([_, perms]) => perms.view)
      .map(([menu, perms]) => ({ menu, ...perms }));

    try {
      const res = await fetch("/api/master/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, hak_akses }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      router.push(`/master/role/${formData.kode}`);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Link href="/master/role" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <Settings className="h-6 w-6 text-indigo-600" /> Tambah Role Akses
               </h1>
               <p className="text-sm text-slate-500 mt-1">Buat grup pengguna dan atur kewenangannya.</p>
            </div>
         </div>
         <button
            onClick={handleSubmit}
            disabled={loading || !formData.kode || !formData.nama}
            className="flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
         >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan Role"}
         </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Kiri - Form Profil Grup */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-1 h-fit sticky top-24">
            <h2 className="text-base font-bold text-slate-800 border-b pb-2 mb-4">Profil Grup</h2>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Grup <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.kode}
                  onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="MGR, STF, GUD..." 
                  required 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Role <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Manager Pembelian" 
                  required 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Keterangan role..." 
                />
             </div>
         </div>

         {/* Kanan - Matrix Hak Akses */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
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
                           <td className="px-4 py-3 text-slate-800 font-medium">
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
                              <input type="checkbox" checked={access[menu].view} onChange={e => handleAccessChange(menu, 'view', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center hover:bg-slate-50">
                              <input type="checkbox" checked={access[menu].add} onChange={e => handleAccessChange(menu, 'add', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center border-l border-slate-100 hover:bg-slate-50">
                              <input type="checkbox" checked={access[menu].edit} onChange={e => handleAccessChange(menu, 'edit', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center hover:bg-slate-50">
                              <input type="checkbox" checked={access[menu].delete} onChange={e => handleAccessChange(menu, 'delete', e.target.checked)} className="h-4 w-4 accent-indigo-600 cursor-pointer rounded border-slate-300" />
                           </td>
                           <td className="px-4 py-3 text-center border-l bg-emerald-50/20 hover:bg-emerald-50/50">
                              <input type="checkbox" checked={access[menu].approve} onChange={e => handleAccessChange(menu, 'approve', e.target.checked)} className="h-4 w-4 accent-emerald-600 cursor-pointer rounded border-slate-300" />
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
