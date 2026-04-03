import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const session: any = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { active_perusahaan, active_cabang } = session;

    const query = `SELECT * FROM mhkategori WHERE nomor = ? AND nomormhperusahaan = ? AND nomormhcabang = ?`;
    const data: any = await executeQuery(query, [id, active_perusahaan, active_cabang]);
    
    if (data.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const session: any = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { active_perusahaan, active_cabang } = session;

    const body = await request.json();
    const { kode, nama, keterangan } = body;

    if (!kode || !nama) return NextResponse.json({ success: false, error: "Kode dan Nama wajib diisi" }, { status: 400 });

    const query = `
      UPDATE mhkategori 
      SET kode = ?, nama = ?, keterangan = ? 
      WHERE nomor = ? AND nomormhperusahaan = ? AND nomormhcabang = ?
    `;
    await executeQuery(query, [
      kode.toUpperCase(), nama, keterangan || '', id, active_perusahaan, active_cabang
    ]);

    return NextResponse.json({ success: true, message: "Data berhasil diupdate" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
