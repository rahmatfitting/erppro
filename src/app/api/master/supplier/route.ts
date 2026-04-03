import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
      FROM mhsupplier 
      WHERE 1=1 AND status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ? OR kontak_person LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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

    // Use pool.query for LIMIT/OFFSET stability
    const [data] = await pool.query(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Master Supplier Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      nama, alamat, telepon, email, kontak_person 
    } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: "Nama Supplier wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Auto-generate code: 001, 002, ...
    const [rows]: any = await connection.execute(
      `SELECT kode FROM mhsupplier ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].kode;
      const numMatch = lastKode.match(/\d+/);
      if (numMatch) {
         nextNum = parseInt(numMatch[0]) + 1;
      }
    }
    const generatedKode = String(nextNum).padStart(3, '0');

    const query = `
      INSERT INTO mhsupplier 
      (kode, nama, alamat, telepon, email, kontak_person, dibuat_oleh) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: any = await connection.execute(query, [
      generatedKode, nama, alamat || '', telepon || '', email || '', kontak_person || '', 'Admin'
    ]);

    await connection.commit();
    return NextResponse.json({ success: true, message: "Supplier berhasil disimpan", data: { nomor: result.insertId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Master Supplier Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode supplier sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: "ID dibutuhkan" }, { status: 400 });
      const query = `UPDATE mhsupplier SET status_aktif = 0 WHERE nomor = ?`;
      const result: any = await executeQuery(query, [id]);
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Supplier berhasil dihapus" });
    }

    return NextResponse.json({ success: false, error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Master Supplier Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
