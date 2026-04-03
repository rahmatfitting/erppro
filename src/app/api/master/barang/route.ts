import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const kategori = searchParams.get('kategori') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT *, 
        (SELECT nama FROM mhsatuan s WHERE s.nomor = b.nomormhsatuan) as satuan_nama
      FROM mhbarang b
      WHERE 1=1 AND status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (kategori) {
      query += ` AND kategori = ?`;
      params.push(kategori);
    }

    if (startDate) {
      query += ` AND dibuat_pada >= ?`;
      params.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      query += ` AND dibuat_pada <= ?`;
      params.push(endDate + ' 23:59:59');
    }

    // Use pool.query instead of executeQuery (pool.execute) 
    // because some MySQL versions/drivers have issues with LIMIT ? in prepared statements
    const [data] = await pool.query(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Master Barang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      nama, nomormhsatuan, satuan, kategori, nomormhkategori, harga_beli, harga_jual, gambar 
    } = body;

    if (!nama || !satuan) {
      return NextResponse.json({ success: false, error: "Nama dan Satuan wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Auto-generate code: 001, 002, ...
    const [rows]: any = await connection.execute(
      `SELECT kode FROM mhbarang ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
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
      INSERT INTO mhbarang 
      (kode, nama, gambar, nomormhsatuan, satuan, kategori, nomormhkategori, harga_beli, harga_jual, dibuat_oleh) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: any = await connection.execute(query, [
      generatedKode, nama, JSON.stringify(gambar || []), nomormhsatuan || null, satuan, kategori || '', nomormhkategori || 0,
      parseFloat(harga_beli || 0), parseFloat(harga_jual || 0), 'Admin'
    ]);

    await connection.commit();
    return NextResponse.json({ success: true, message: "Barang berhasil disimpan", data: { nomor: result.insertId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Master Barang Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode barang sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body; // Soft delete action payload

    if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: "ID dibutuhkan" }, { status: 400 });
      const query = `UPDATE mhbarang SET status_aktif = 0 WHERE nomor = ?`;
      const result: any = await executeQuery(query, [id]);
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Barang berhasil dihapus" });
    }

    // Explicit update (not fully mapped for UI edit yet, mainly handling delete actions right now)
    return NextResponse.json({ success: false, error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Master Barang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
