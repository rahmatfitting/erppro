import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Get WO Detail
    const [woRows]: any = await pool.query(`
      SELECT w.*, i.nama as item_nama, i.kode as item_kode, p.kode as prodplan_kode
      FROM thworkorder w
      JOIN mhbarang i ON w.item_id = i.nomor
      LEFT JOIN thprodplan p ON w.nomorthprodplan = p.nomor
      WHERE w.nomor = ? AND w.nomormhcabang = ?
    `, [id, session.active_cabang]);

    if (woRows.length === 0) {
      return NextResponse.json({ success: false, error: "Work Order tidak ditemukan" }, { status: 404 });
    }
    const wo = woRows[0];
    const woQty = Number(wo.qty || 0);

    // 2. Get BOM for the Item in WO
    const [bomRows]: any = await pool.query(`
      SELECT * FROM mhbom 
      WHERE item_id = ? AND nomormhcabang = ? AND status_aktif = 1
      ORDER BY nomor DESC LIMIT 1
    `, [wo.item_id, session.active_cabang]);

    let bomComponents: any[] = [];
    if (bomRows.length > 0) {
       const bom = bomRows[0];
       const [details]: any = await pool.query(`
         SELECT d.*, i.nama as item_nama, i.kode as item_kode, s.nama as satuan_nama
         FROM mdbom d
         JOIN mhbarang i ON d.item_id = i.nomor
         JOIN mhsatuan s ON d.satuan_id = s.nomor
         WHERE d.nomormhbom = ?
       `, [bom.nomor]);
       bomComponents = details;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...wo,
        qty: woQty
      },
      components: bomComponents.map(c => ({
         item_id: c.item_id,
         item_kode: c.item_kode,
         item_nama: c.item_nama,
         qty_per_unit: Number(c.jumlah || 0),
         qty_needed: Number(c.jumlah || 0) * woQty,
         satuan_id: c.satuan_id,
         satuan_nama: c.satuan_nama
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
