import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ success: false, error: "Production Plan ID required" }, { status: 400 });
    }

    // 1. Get Plan
    const [planRows]: any = await pool.query(`
      SELECT p.*, i.nama as item_nama 
      FROM thprodplan p 
      JOIN mhbarang i ON p.item_id = i.nomor 
      WHERE p.nomor = ? AND p.nomormhcabang = ?
    `, [planId, session.active_cabang]);

    if (planRows.length === 0) {
      return NextResponse.json({ success: false, error: "Production Plan not found" }, { status: 404 });
    }
    const plan = planRows[0];
    const planQty = Number(plan.qty || 0);

    // 2. Get BOM for this item
    const [bomRows]: any = await pool.query(`
      SELECT * FROM mhbom 
      WHERE item_id = ? AND nomormhcabang = ? AND status_aktif = 1
      ORDER BY nomor DESC LIMIT 1
    `, [plan.item_id, session.active_cabang]);

    if (bomRows.length === 0) {
      return NextResponse.json({ success: false, error: "No active BOM found for this product" }, { status: 404 });
    }
    const bom = bomRows[0];

    // 3. Get BOM Components
    const [components]: any = await pool.query(`
      SELECT d.*, i.nama as item_nama, i.kode as item_kode, s.nama as satuan_nama
      FROM mdbom d
      JOIN mhbarang i ON d.item_id = i.nomor
      JOIN mhsatuan s ON d.satuan_id = s.nomor
      WHERE d.nomormhbom = ?
    `, [bom.nomor]);

    // 4. Calculate Stock for each component
    const results = [];
    for (const comp of components) {
      const needed = planQty * Number(comp.jumlah || 0);
      
      const [stockInRows]: any = await pool.query(`
        SELECT (
          (SELECT COALESCE(SUM(jumlah), 0) FROM tdbelipenerimaan WHERE kode_barang = ?) +
          (SELECT COALESCE(SUM(perubahan), 0) FROM tdstokpenyesuaian WHERE nomormhbarang = ? AND perubahan > 0)
        ) as total_in
      `, [comp.item_kode, comp.item_id]);

      const [stockOutRows]: any = await pool.query(`
        SELECT (
          (SELECT COALESCE(SUM(jumlah), 0) FROM tdpemakaianinternal WHERE nomormhbarang = ?) +
          (SELECT COALESCE(SUM(perubahan), 0) FROM tdstokpenyesuaian WHERE nomormhbarang = ? AND perubahan < 0) +
          (SELECT COALESCE(SUM(jumlah), 0) FROM tdubahbentuk WHERE nomormhbarang_asal = ?)
        ) as total_out
      `, [comp.item_id, comp.item_id, comp.item_id]);

      const totalIn = Number(stockInRows[0]?.total_in || 0);
      const totalOut = Math.abs(Number(stockOutRows[0]?.total_out || 0));
      const stockAvailable = totalIn - totalOut;
      const deficit = Math.max(0, needed - stockAvailable);

      results.push({
        item_id: comp.item_id,
        item_kode: comp.item_kode,
        item_nama: comp.item_nama,
        satuan: comp.satuan_nama,
        needed,
        available: stockAvailable,
        deficit,
        can_generate: deficit > 0
      });
    }

    return NextResponse.json({ 
      success: true, 
      plan: {
        kode: plan.kode,
        item_nama: plan.item_nama,
        qty: planQty
      },
      bom: {
        kode: bom.kode,
        nama: bom.nama
      },
      components: results 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
     const session = await getSession();
     if (!session || !session.active_cabang) {
       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
     }

     const { planId, deficits } = await request.json();

     if (!deficits || !Array.isArray(deficits)) {
        return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
     }

     for (const def of deficits) {
        await pool.query(`
           INSERT INTO thmatcheck (nomormhperusahaan, nomormhcabang, nomorthprodplan, item_id, qty_needed, qty_available, qty_deficit, status_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [session.active_perusahaan, session.active_cabang, planId, def.item_id, parseFloat(def.needed), parseFloat(def.available), parseFloat(def.deficit), 'Generated PR']);
     }

     return NextResponse.json({ success: true, message: "Material check records saved and PR triggered." });
  } catch (error: any) {
     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
