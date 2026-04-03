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
         `SELECT w.*, i.nama as item_nama, i.kode as item_kode, p.kode as prodplan_kode
          FROM thworkorder w
          JOIN mhbarang i ON w.item_id = i.nomor
          LEFT JOIN thprodplan p ON w.nomorthprodplan = p.nomor
          WHERE w.nomor = ? AND w.nomormhcabang = ?`,
         [id, session.active_cabang]
       );
       if (rows.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
       const h = rows[0];
       return NextResponse.json({ 
         success: true, 
         data: {
           ...h,
           qty: Number(h.qty || 0)
         } 
       });
    }

    let query = `
      SELECT w.*, i.nama as item_nama, i.kode as item_kode, p.kode as prodplan_kode
      FROM thworkorder w
      JOIN mhbarang i ON w.item_id = i.nomor
      LEFT JOIN thprodplan p ON w.nomorthprodplan = p.nomor
      WHERE w.nomormhcabang = ?
    `;
    const params: any[] = [session.active_cabang];

    if (keyword) {
      query += ` AND (w.kode LIKE ? OR p.kode LIKE ? OR i.nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY w.tanggal DESC, w.nomor DESC`;

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      qty: Number(h.qty || 0)
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { kode, tanggal, nomorthprodplan, item_id, qty, keterangan } = await request.json();

    if (!tanggal || !item_id || !qty) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    // Generate Kode if [AUTO]
    let generatedKode = kode;
    if (!kode || kode === '[AUTO]') {
      const datePart = new Date(tanggal).toISOString().slice(2, 10).replace(/-/g, '');
      const [prev]: any = await pool.query(`SELECT kode FROM thworkorder WHERE kode LIKE ? ORDER BY nomor DESC LIMIT 1`, [`WO-${datePart}-%`]);
      let lastNum = 0;
      if (prev.length > 0) {
        const parts = prev[0].kode.split('-');
        lastNum = parseInt(parts[parts.length - 1]);
      }
      generatedKode = `WO-${datePart}-${(lastNum + 1).toString().padStart(3, '0')}`;
    }

    const [result]: any = await pool.query(
      `INSERT INTO thworkorder (nomormhperusahaan, nomormhcabang, nomorthprodplan, kode, tanggal, item_id, qty, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.active_perusahaan, session.active_cabang, nomorthprodplan || null, generatedKode, tanggal, item_id, parseFloat(qty || 0), keterangan, session.nama || 'Admin']
    );

    return NextResponse.json({ success: true, message: "Work Order berhasil disimpan", id: result.insertId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID dan Status wajib diisi" }, { status: 400 });
    }

    await pool.query(`UPDATE thworkorder SET status = ? WHERE nomor = ? AND nomormhcabang = ?`, [status, id, session.active_cabang]);

    return NextResponse.json({ success: true, message: "Status Work Order berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
