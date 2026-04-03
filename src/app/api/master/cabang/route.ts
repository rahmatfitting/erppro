import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const nomormhperusahaan = searchParams.get('nomormhperusahaan');
    
    let query = `
      SELECT c.*, p.nama as perusahaan_nama 
      FROM mhcabang c 
      LEFT JOIN mhperusahaan p ON c.nomormhperusahaan = p.nomor 
      WHERE c.status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (c.kode LIKE ? OR c.nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (nomormhperusahaan) {
      query += ` AND c.nomormhperusahaan = ?`;
      params.push(nomormhperusahaan);
    }

    query += ` ORDER BY c.kode ASC`;
    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nomormhperusahaan, kode, nama, alamat, telepon } = body;

    if (!nomormhperusahaan || !kode || !nama) {
      return NextResponse.json({ success: false, error: "Perusahaan, Kode dan Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      INSERT INTO mhcabang (nomormhperusahaan, kode, nama, alamat, telepon) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const result: any = await executeQuery(query, [nomormhperusahaan, kode, nama, alamat || '', telepon || '']);

    return NextResponse.json({ success: true, message: "Cabang berhasil disimpan", data: { id: result.insertId } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode cabang sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, ...fields } = body;

    if (action === 'delete') {
      await executeQuery(`UPDATE mhcabang SET status_aktif = 0 WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: "Cabang berhasil dinonaktifkan" });
    }

    // Generic update
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(fields), id];
    await executeQuery(`UPDATE mhcabang SET ${setClause} WHERE nomor = ?`, params);

    return NextResponse.json({ success: true, message: "Cabang berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
