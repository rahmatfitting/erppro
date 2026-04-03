import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const id = searchParams.get('id');

    if (id) {
       // Single Record logic if exists (not clearly defined in original but standardizing)
       const [rows]: any = await pool.query(
         `SELECT h.*, w.kode as wo_kode, g.nama as gudang_nama
          FROM thbonbahan h
          LEFT JOIN thworkorder w ON h.nomorthworkorder = w.nomor
          LEFT JOIN mhgudang g ON h.nomormhgudang = g.nomor
          WHERE h.nomor = ? AND h.nomormhcabang = ?`,
         [id, session.active_cabang]
       );
       if (rows.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
       const header = rows[0];
       const [details]: any = await pool.query(`SELECT * FROM tdbonbahan WHERE nomorthbonbahan = ?`, [header.nomor]);
       return NextResponse.json({ 
         success: true, 
         data: {
           ...header,
           items: details.map((d: any) => ({ ...d, qty: Number(d.qty || 0) }))
         } 
       });
    }

    let query = `
      SELECT h.*, w.kode as wo_kode, g.nama as gudang_nama
      FROM thbonbahan h
      LEFT JOIN thworkorder w ON h.nomorthworkorder = w.nomor
      LEFT JOIN mhgudang g ON h.nomormhgudang = g.nomor
      WHERE h.nomormhcabang = ? AND h.status_aktif = 1
    `;
    const params: any[] = [session.active_cabang];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR w.kode LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC`;

    const [data]: any = await pool.query(query, params);
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

    const body = await request.json();
    const { tanggal, nomorthworkorder, nomormhgudang, keterangan, items } = body;

    if (!tanggal || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    const datePart = new Date(tanggal).toISOString().slice(2, 10).replace(/-/g, '');
    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbonbahan WHERE kode LIKE ? ORDER BY nomor DESC LIMIT 1 FOR UPDATE`,
      [`BON-${datePart}-%`]
    );
    let lastNum = 0;
    if (rows.length > 0) {
      const parts = rows[0].kode.split('-');
      lastNum = parseInt(parts[parts.length - 1]);
    }
    const generatedKode = `BON-${datePart}-${(lastNum + 1).toString().padStart(3, '0')}`;

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thbonbahan (nomormhperusahaan, nomormhcabang, nomormhgudang, kode, tanggal, nomorthworkorder, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.active_perusahaan, session.active_cabang, nomormhgudang || null, generatedKode, tanggal, nomorthworkorder || null, keterangan || '', session.nama || 'Admin']
    );
    const headerId = headerResult.insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO tdbonbahan (nomorthbonbahan, item_id, qty, satuan_id, keterangan) VALUES (?, ?, ?, ?, ?)`,
        [headerId, item.item_id, parseFloat(item.qty || 0), item.satuan_id || null, item.keterangan || '']
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Bon Bahan berhasil disimpan", id: headerId });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
