import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const [rows]: any = await pool.query(
      `SELECT * FROM thjualnota WHERE kode = ? AND jenis = 'NDC' AND status_aktif = 1`, [id]
    );
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const h = rows[0];
    const data = {
      ...h,
      subtotal: Number(h.subtotal || 0),
      ppn_nominal: Number(h.ppn_nominal || 0),
      pph: Number(h.pph || 0),
      pphnominal: Number(h.pphnominal || 0),
      total: Number(h.total || 0),
      total_idr: Number(h.total_idr || 0),
      kurs: Number(h.kurs || 1)
    };
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const { action, user } = await request.json();
    if (action === 'approve') {
      await pool.query(`UPDATE thjualnota SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE kode = ?`, [id]);
      const [rows]: any = await pool.query(`SELECT nomor FROM thjualnota WHERE kode = ?`, [id]);
      if (rows.length > 0) {
        await addLogHistory("Nota Debet Customer", rows[0].nomor, "APPROVE", user || "Admin", `Menyetujui NDC ${id}`);
      }
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
