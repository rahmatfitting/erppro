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
       const [rows]: any = await pool.query(
         `SELECT h.*, w.kode as wo_kode, i.nama as fg_nama, g.nama as gudang_nama
          FROM thhasilproduksi h
          LEFT JOIN thworkorder w ON h.nomorthworkorder = w.nomor
          LEFT JOIN mhbarang i ON h.item_id = i.nomor
          LEFT JOIN mhgudang g ON h.nomormhgudang = g.nomor
          WHERE h.nomor = ? AND h.nomormhcabang = ?`,
         [id, session.active_cabang]
       );
       if (rows.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
       const h = rows[0];
       const data = {
         ...h,
         qty_fg: Number(h.qty_fg || 0),
         qty_afalan: Number(h.qty_afalan || 0)
       };
       return NextResponse.json({ success: true, data });
    }

    let query = `
      SELECT h.*, w.kode as wo_kode, i.nama as fg_nama, g.nama as gudang_nama
      FROM thhasilproduksi h
      LEFT JOIN thworkorder w ON h.nomorthworkorder = w.nomor
      LEFT JOIN mhbarang i ON h.item_id = i.nomor
      LEFT JOIN mhgudang g ON h.nomormhgudang = g.nomor
      WHERE h.nomormhcabang = ? AND h.status_aktif = 1
    `;
    const params: any[] = [session.active_cabang];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR w.kode LIKE ? OR i.nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC`;

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      qty_fg: Number(h.qty_fg || 0),
      qty_afalan: Number(h.qty_afalan || 0)
    }));

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
    const { tanggal, nomorthworkorder, nomormhgudang, item_id, qty_fg, qty_afalan, keterangan } = body;

    if (!tanggal || !item_id || (!qty_fg && !qty_afalan)) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    const datePart = new Date(tanggal).toISOString().slice(2, 10).replace(/-/g, '');
    const [rows]: any = await connection.execute(
      `SELECT kode FROM thhasilproduksi WHERE kode LIKE ? ORDER BY nomor DESC LIMIT 1 FOR UPDATE`,
      [`HPR-${datePart}-%`]
    );
    let lastNum = 0;
    if (rows.length > 0) {
       const parts = rows[0].kode.split('-');
       lastNum = parseInt(parts[parts.length - 1]);
    }
    const generatedKode = `HPR-${datePart}-${(lastNum + 1).toString().padStart(3, '0')}`;

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thhasilproduksi (nomormhperusahaan, nomormhcabang, nomormhgudang, kode, tanggal, nomorthworkorder, item_id, qty_fg, qty_afalan, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.active_perusahaan, session.active_cabang, nomormhgudang || null, generatedKode, tanggal, nomorthworkorder || null, item_id, parseFloat(qty_fg || 0), parseFloat(qty_afalan || 0), keterangan || '', session.nama || 'Admin']
    );
    const headerId = headerResult.insertId;

    if (parseFloat(qty_fg || 0) > 0) {
      await connection.execute(
        `INSERT INTO tdhasilproduksi (nomorthhasilproduksi, item_id, qty, jenis) VALUES (?, ?, ?, 'FG')`,
        [headerId, item_id, parseFloat(qty_fg)]
      );
    }

    if (nomorthworkorder) {
        const [hpSum]: any = await connection.execute(
          `SELECT SUM(qty_fg) as total_fg FROM thhasilproduksi WHERE nomorthworkorder = ? AND status_aktif = 1`,
          [nomorthworkorder]
        );
        const totalFG = hpSum[0].total_fg || 0;

        const [woRows]: any = await connection.execute(
          `SELECT qty FROM thworkorder WHERE nomor = ?`,
          [nomorthworkorder]
        );
        
        if (woRows.length > 0 && totalFG >= woRows[0].qty) {
          await connection.execute(
            `UPDATE thworkorder SET status = 'Completed' WHERE nomor = ?`,
            [nomorthworkorder]
          );
        }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Hasil Produksi berhasil disimpan", id: headerId });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
