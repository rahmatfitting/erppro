import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    const data: any = await executeQuery(`SELECT * FROM mhcabang WHERE nomor = ?`, [id]);

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Cabang tidak ditemukan" }, { status: 404 });
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
    const { nomormhperusahaan, kode, nama, alamat, telepon } = body;

    if (!nomormhperusahaan || !kode || !nama) {
      return NextResponse.json({ success: false, error: "Perusahaan, Kode dan Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE mhcabang 
      SET nomormhperusahaan = ?, kode = ?, nama = ?, alamat = ?, telepon = ? 
      WHERE nomor = ?
    `;
    const result: any = await executeQuery(query, [nomormhperusahaan, kode, nama, alamat || '', telepon || '', id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Cabang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Cabang berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode cabang sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
