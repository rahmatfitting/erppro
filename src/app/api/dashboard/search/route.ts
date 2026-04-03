import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { active_perusahaan, active_cabang } = session;

    if (!active_perusahaan) {
      // If no company/branch selected, return empty results instead of crashing
      return NextResponse.json({ success: true, data: [] });
    }

    const searchTerm = `%${q}%`;

    // Unified query for transactions across different modules
    // We use UNION ALL to combine results from various tables
    const query = `
      (SELECT 'Permintaan Beli' as type, kode, nomor, tanggal, '/pembelian/permintaan' as baseUrl 
       FROM thbelipermintaan 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
       UNION ALL
      (SELECT 'Order Beli' as type, kode, nomor, tanggal, '/pembelian/order' as baseUrl 
       FROM thbeliorder 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
       UNION ALL
      (SELECT 'Penerimaan Barang' as type, kode, nomor, tanggal, '/pembelian/penerimaan' as baseUrl 
       FROM thbelipenerimaan 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Nota Beli' as type, kode, nomor, tanggal, '/pembelian/nota' as baseUrl 
       FROM thbelinota 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1  AND jenis = 'FB' AND nomormhperusahaan = ? AND nomormhcabang = ?)
       UNION ALL
      (SELECT 'Order Jual' as type, kode, nomor, tanggal, '/penjualan/order' as baseUrl 
       FROM thjualorder 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
        UNION ALL
      (SELECT 'Delivery Order' as type, kode, nomor, tanggal, '/penjualan/delivery' as baseUrl 
       FROM thdeliveryorder 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
        UNION ALL
      (SELECT 'Surat Jalan' as type, kode, nomor, tanggal, '/pembelian/surat-jalan' as baseUrl 
       FROM thsuratjalan 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)

      UNION ALL
      (SELECT 'Nota Jual' as type, kode, nomor, tanggal, '/penjualan/nota' as baseUrl 
       FROM thjualnota 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Work Order' as type, kode, nomor, tanggal, '/ppic/workorder' as baseUrl 
       FROM thworkorder 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status != 'Cancelled' AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Prod Plan' as type, kode, nomor, tanggal, '/ppic/prodplan' as baseUrl 
       FROM thprodplan 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Hasil Produksi' as type, kode, nomor, tanggal, '/ppic/hasilproduksi' as baseUrl 
       FROM thhasilproduksi 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Bon Bahan' as type, kode, nomor, tanggal, '/ppic/bonbahan' as baseUrl 
       FROM thbonbahan 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Uang Masuk' as type, kode, nomor, tanggal, CASE WHEN jenis=1 THEN '/keuangan/uang-masuk-utama' ELSE '/keuangan/uang-masuk-lain' END as baseUrl 
       FROM thuangmasuk 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      UNION ALL
      (SELECT 'Uang Keluar' as type, kode, nomor, tanggal, CASE WHEN jenis=1 THEN '/keuangan/uang-keluar-utama' ELSE '/keuangan/uang-keluar-lain' END as baseUrl 
       FROM thuangkeluar 
       WHERE (kode LIKE ? OR nomor LIKE ?) AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ?)
      ORDER BY tanggal DESC
      LIMIT 10
    `;

    const params = [
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang,
      searchTerm, searchTerm, active_perusahaan, active_cabang
    ];

    const results = await executeQuery<any[]>(query, params);

    return NextResponse.json({
      success: true,
      data: results.map(r => ({
        ...r,
        href: `${r.baseUrl}/${r.nomor}`
      }))
    });

  } catch (error: any) {
    console.error("Global Search Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
