import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhsupplier WHERE nomor = ? AND status_aktif = 1`;
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Supplier tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Master Supplier by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama, alamat, telepon, email, kontak_person } = body;

    const query = `
      UPDATE mhsupplier 
      SET nama = ?, alamat = ?, telepon = ?, email = ?, kontak_person = ?
      WHERE nomor = ?
    `;
    const result: any = await executeQuery(query, [nama, alamat || '', telepon || '', email || '', kontak_person || '', id]);

    if (result.affectedRows === 0) {
       return NextResponse.json({ success: false, error: "Supplier tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Supplier berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Master Supplier Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
