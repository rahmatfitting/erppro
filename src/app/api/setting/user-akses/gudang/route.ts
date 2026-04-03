import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const query = `
      SELECT ug.nomor, ug.nomormhgudang, g.nama as gudang_nama, g.kode as gudang_kode
      FROM tmusuargudang ug
      JOIN mhgudang g ON ug.nomormhgudang = g.nomor
      WHERE ug.nomormhuser = ?
    `;
    const data = await executeQuery(query, [userId]);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { userId, gudangIds } = body; // gudangIds is an array of numbers

    if (!userId || !Array.isArray(gudangIds)) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Delete existing mappings
    await connection.execute('DELETE FROM tmusuargudang WHERE nomormhuser = ?', [userId]);

    // 2. Insert new mappings
    if (gudangIds.length > 0) {
      const values = gudangIds.map(gid => [userId, gid]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flattenedValues = values.flat();
      
      await connection.execute(
        `INSERT INTO tmusuargudang (nomormhuser, nomormhgudang) VALUES ${placeholders}`,
        flattenedValues
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Akses gudang berhasil diupdate" });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
