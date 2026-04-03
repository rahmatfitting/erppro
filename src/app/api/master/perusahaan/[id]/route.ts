import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    const data: any = await executeQuery(`SELECT * FROM mhperusahaan WHERE nomor = ?`, [id]);

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id; 
    const body = await request.json();
    const { kode, nama, alamat, telepon, email, npwp } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE mhperusahaan 
      SET kode = ?, nama = ?, alamat = ?, telepon = ?, email = ?, npwp = ? 
      WHERE nomor = ?
    `;
    const result: any = await executeQuery(query, [kode, nama, alamat || '', telepon || '', email || '', npwp || '', id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Perusahaan berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode perusahaan sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
