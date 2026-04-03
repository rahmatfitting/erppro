import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhcustomer WHERE nomor = ?`; // No active filter allows viewing deactivated ones
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Customer tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Customer by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama, alamat, telepon, email, kontak_person } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE mhcustomer 
      SET nama = ?, alamat = ?, telepon = ?, email = ?, kontak_person = ?, diubah_oleh = ?
      WHERE nomor = ?
    `;
    const queryParams = [nama, alamat || '', telepon || '', email || '', kontak_person || '', 'Admin', id];

    const result: any = await executeQuery(query, queryParams);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Customer tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Customer berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Customer Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
