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
      SELECT ua.nomor, ua.nomormhaccount, a.nama as account_nama, a.kode as account_kode
      FROM tmusuaraccount ua
      JOIN mhaccount a ON ua.nomormhaccount = a.nomor
      WHERE ua.nomormhuser = ?
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
    const { userId, accountIds } = body; // accountIds is an array of numbers

    if (!userId || !Array.isArray(accountIds)) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Delete existing mappings
    await connection.execute('DELETE FROM tmusuaraccount WHERE nomormhuser = ?', [userId]);

    // 2. Insert new mappings
    if (accountIds.length > 0) {
      const values = accountIds.map(aid => [userId, aid]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flattenedValues = values.flat();
      
      await connection.execute(
        `INSERT INTO tmusuaraccount (nomormhuser, nomormhaccount) VALUES ${placeholders}`,
        flattenedValues
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Akses account berhasil diupdate" });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
