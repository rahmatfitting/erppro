import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const headerRows: any = await executeQuery(`
      SELECT b.*, i.nama as item_nama
      FROM mhbom b
      JOIN mhbarang i ON b.item_id = i.nomor
      WHERE b.nomor = ? AND b.nomormhcabang = ?
    `, [id, session.active_cabang]);

    if (headerRows.length === 0) {
      return NextResponse.json({ success: false, error: "BOM tidak ditemukan" }, { status: 404 });
    }

    const detailRows = await executeQuery(`
      SELECT d.*, i.nama as item_nama, s.nama as satuan_nama
      FROM mdbom d
      JOIN mhbarang i ON d.item_id = i.nomor
      JOIN mhsatuan s ON d.satuan_id = s.nomor
      WHERE d.nomormhbom = ?
    `, [id]);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...headerRows[0],
        items: detailRows
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const connection = await pool.getConnection();
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { kode, nama, item_id, keterangan, items } = await request.json();

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE mhbom SET kode = ?, nama = ?, item_id = ?, keterangan = ? WHERE nomor = ? AND nomormhcabang = ?`,
      [kode, nama, item_id, keterangan, id, session.active_cabang]
    );

    await connection.execute(`DELETE FROM mdbom WHERE nomormhbom = ?`, [id]);

    for (const item of items) {
      await connection.execute(
        `INSERT INTO mdbom (nomormhbom, item_id, jumlah, satuan_id) VALUES (?, ?, ?, ?)`,
        [id, item.item_id, item.jumlah, item.satuan_id]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "BOM berhasil diperbarui" });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await executeQuery(`UPDATE mhbom SET status_aktif = 0 WHERE nomor = ? AND nomormhcabang = ?`, [id, session.active_cabang]);

    return NextResponse.json({ success: true, message: "BOM berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
