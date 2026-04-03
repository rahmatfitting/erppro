import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data: any = await executeQuery(
      `SELECT * FROM thjualnota WHERE kode = ? AND jenis = 'NDC' AND status_aktif = 1`, [id]
    );
    if (data.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const { action, user } = await request.json();
    if (action === 'approve') {
      await executeQuery(`UPDATE thjualnota SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE kode = ?`, [id]);
      const data: any = await executeQuery(`SELECT nomor FROM thjualnota WHERE kode = ?`, [id]);
      if (data.length > 0) {
        await addLogHistory("Nota Debet Customer", data[0].nomor, "APPROVE", user || "Admin", `Menyetujui NDC ${id}`);
      }
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
