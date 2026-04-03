import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    
    let query = `SELECT * FROM mhperusahaan WHERE status_aktif = 1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY kode ASC`;
    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode, nama, alamat, telepon, email, npwp } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      INSERT INTO mhperusahaan (kode, nama, alamat, telepon, email, npwp) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result: any = await executeQuery(query, [kode, nama, alamat || '', telepon || '', email || '', npwp || '']);

    return NextResponse.json({ success: true, message: "Perusahaan berhasil disimpan", data: { id: result.insertId } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode perusahaan sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, ...fields } = body;

    if (action === 'delete') {
      await executeQuery(`UPDATE mhperusahaan SET status_aktif = 0 WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: "Perusahaan berhasil dinonaktifkan" });
    }

    // Generic update
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(fields), id];
    await executeQuery(`UPDATE mhperusahaan SET ${setClause} WHERE nomor = ?`, params);

    return NextResponse.json({ success: true, message: "Perusahaan berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
