import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wo_id = searchParams.get('wo_id');

    if (!wo_id) {
       // Get all active WOs
       const wos: any = await executeQuery(`
         SELECT w.nomor, w.kode, i.nama as fg_nama, w.qty as target_qty
         FROM thworkorder w
         JOIN mhbarang i ON w.item_id = i.nomor
         WHERE w.nomormhcabang = ? AND w.status IN ('Released', 'Completed')
         ORDER BY w.tanggal DESC
       `, [session.active_cabang]);
       return NextResponse.json({ success: true, data: wos });
    }

    // Calculation for specific WO
    // 1. Get Standard Usage (from BOM)
    const bomComponents: any = await executeQuery(`
      SELECT d.item_id, d.jumlah as std_qty_per_unit, i.nama as item_nama, (d.jumlah * w.qty) as total_std_qty
      FROM thworkorder w
      JOIN mhbom b ON w.item_id = b.item_id
      JOIN mdbom d ON b.nomor = d.nomormhbom
      JOIN mhbarang i ON d.item_id = i.nomor
      WHERE w.nomor = ? AND b.status_aktif = 1
    `, [wo_id]);

    // 2. Get Actual Usage (from Bon Bahan)
    const actualUsage: any = await executeQuery(`
      SELECT d.item_id, SUM(d.qty) as total_actual_qty
      FROM thbonbahan h
      JOIN tdbonbahan d ON h.nomor = d.nomorthbonbahan
      WHERE h.nomorthworkorder = ? AND h.status_aktif = 1
      GROUP BY d.item_id
    `, [wo_id]);

    // 3. Merge and Calculate Variance
    const report = bomComponents.map((std: any) => {
       const act = actualUsage.find((a: any) => a.item_id === std.item_id);
       const actualQty = act ? act.total_actual_qty : 0;
       return {
          ...std,
          actual_qty: actualQty,
          variance: actualQty - std.total_std_qty,
          efficiency: std.total_std_qty > 0 ? (actualQty / std.total_std_qty) * 100 : 0
       };
    });

    return NextResponse.json({ success: true, data: report });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
