import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhgudang WHERE nomor = ?`; 
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Gudang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Gudang by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama, lokasi, penanggung_jawab } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE mhgudang 
      SET nama = ?, lokasi = ?, penanggung_jawab = ?, diubah_oleh = ?
      WHERE nomor = ?
    `;
    const queryParams = [nama, lokasi || '', penanggung_jawab || '', 'Admin', id];

    const result: any = await executeQuery(query, queryParams);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Gudang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Gudang berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Gudang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
