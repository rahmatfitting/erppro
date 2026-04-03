import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    let query = `
      SELECT b.*, i.nama as item_nama
      FROM mhbom b
      JOIN mhbarang i ON b.item_id = i.nomor
      WHERE b.nomormhcabang = ? AND b.status_aktif = 1
    `;
    const params: any[] = [session.active_cabang];

    if (keyword) {
      query += ` AND (b.kode LIKE ? OR b.nama LIKE ? OR i.nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const data = await executeQuery(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { kode, nama, item_id, keterangan, items } = await request.json();

    if (!kode || !nama || !item_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    const [headerResult]: any = await connection.execute(
      `INSERT INTO mhbom (nomormhperusahaan, nomormhcabang, kode, nama, item_id, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.active_perusahaan, session.active_cabang, kode, nama, item_id, keterangan, session.nama || 'Admin']
    );

    const headerId = headerResult.insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO mdbom (nomormhbom, item_id, jumlah, satuan_id) VALUES (?, ?, ?, ?)`,
        [headerId, item.item_id, item.jumlah, item.satuan_id]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "BOM berhasil disimpan" });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
