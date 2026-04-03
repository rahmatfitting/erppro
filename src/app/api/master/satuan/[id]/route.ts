import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhsatuan WHERE nomor = ? AND status_aktif = 1`;
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Satuan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Master Satuan by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama } = body;

    const query = `
      UPDATE mhsatuan 
      SET nama = ?
      WHERE nomor = ?
    `;
    const result: any = await executeQuery(query, [nama, id]);

    if (result.affectedRows === 0) {
       return NextResponse.json({ success: false, error: "Satuan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Satuan berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Master Satuan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
