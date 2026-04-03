import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const query = `SELECT * FROM mhbarang WHERE nomor = ? AND status_aktif = 1`;
    const data: any = await executeQuery(query, [id]);
    
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: "Barang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error("GET Master Barang by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { nama, nomormhsatuan, satuan, kategori, nomormhkategori, harga_beli, harga_jual, gambar } = body;

    const query = `
      UPDATE mhbarang 
      SET nama = ?, gambar = ?, nomormhsatuan = ?, satuan = ?, kategori = ?, nomormhkategori = ?, harga_beli = ?, harga_jual = ?
      WHERE nomor = ?
    `;
    const result: any = await executeQuery(query, [
      nama, JSON.stringify(gambar || []), nomormhsatuan || null, satuan, kategori || '', nomormhkategori || 0,
      parseFloat(harga_beli || 0), parseFloat(harga_jual || 0), id
    ]);

    if (result.affectedRows === 0) {
       return NextResponse.json({ success: false, error: "Barang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Barang berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Master Barang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
