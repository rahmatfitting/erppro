import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhsales WHERE kode = ?`; 
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Sales tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Sales by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama, telepon, email } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE mhsales 
      SET nama = ?, telepon = ?, email = ?, diubah_oleh = ?
      WHERE kode = ?
    `;
    const queryParams = [nama, telepon || '', email || '', 'Admin', id];

    const result: any = await executeQuery(query, queryParams);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Sales tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Sales berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Sales Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
