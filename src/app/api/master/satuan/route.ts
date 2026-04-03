import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT * 
      FROM mhsatuan 
      WHERE 1=1 AND status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      query += ` AND dibuat_pada >= ?`;
      params.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      query += ` AND dibuat_pada <= ?`;
      params.push(endDate + ' 23:59:59');
    }

    query += ` ORDER BY kode ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Master Satuan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode, nama } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama Satuan wajib diisi" }, { status: 400 });
    }

    const query = `INSERT INTO mhsatuan (kode, nama, dibuat_oleh) VALUES (?, ?, ?)`;
    const result: any = await executeQuery(query, [kode, nama, 'Admin']);

    return NextResponse.json({ success: true, message: "Satuan berhasil disimpan", data: { nomor: result.insertId } });
  } catch (error: any) {
    console.error("POST Master Satuan Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode satuan sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, kode, nama, action } = body;

    if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: "ID dibutuhkan" }, { status: 400 });
      const query = `UPDATE mhsatuan SET status_aktif = 0 WHERE nomor = ?`;
      const result: any = await executeQuery(query, [id]);
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Satuan berhasil dihapus" });
    }

    if (!id || !kode || !nama) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const query = `UPDATE mhsatuan SET kode = ?, nama = ? WHERE nomor = ?`;
    const result: any = await executeQuery(query, [kode, nama, id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Satuan berhasil diupdate" });
  } catch (error: any) {
    console.error("PATCH Master Satuan Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode satuan sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
