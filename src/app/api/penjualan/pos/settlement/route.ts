import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const user = searchParams.get('user');

    let query = `SELECT * FROM tpos_settlement WHERE 1=1`;
    const params: any[] = [];

    if (date) {
      query += ` AND tanggal = ?`;
      params.push(date);
    }
    
    if (user) {
      query += ` AND dibuat_oleh = ?`;
      params.push(user);
    }

    query += ` ORDER BY waktu_closing DESC`;

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Settlement Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const user = body.user || 'Admin';

    await connection.beginTransaction();

    // Check if already closed
    const queryCheck = `SELECT id FROM tpos_settlement WHERE tanggal = ? AND dibuat_oleh = ?`;
    const [existing] = await connection.execute(queryCheck, [body.tanggal, user]) as any[];
    
    if (existing.length > 0) {
       await connection.rollback();
       return NextResponse.json({ success: false, error: `Kasir ${user} sudah melakukan closing pada tanggal ${body.tanggal}` }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO tpos_settlement (
        tanggal, dibuat_oleh, nomormhcabang, nomormhperusahaan, waktu_closing,
        expected_cash, expected_transfer, expected_qris,
        actual_cash, actual_transfer, actual_qris,
        selisih_cash, selisih_transfer, selisih_qris,
        total_penjualan, jumlah_transaksi, catatan
      ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      body.tanggal,
      user,
      body.nomormhcabang || 0,
      body.nomormhperusahaan || 0,
      body.expected_cash || 0,
      body.expected_transfer || 0,
      body.expected_qris || 0,
      body.actual_cash || 0,
      body.actual_transfer || 0,
      body.actual_qris || 0,
      body.selisih_cash || 0,
      body.selisih_transfer || 0,
      body.selisih_qris || 0,
      body.total_penjualan || 0,
      body.jumlah_transaksi || 0,
      body.catatan || ''
    ];

    const [result] = await connection.execute(insertQuery, params) as any[];

    // Record system history
    await addLogHistory(
      "Closing POS",
      result.insertId,
      "CREATE",
      user,
      `Closing shift kasir ${user} untuk tanggal ${body.tanggal}`
    );

    await connection.commit();
    return NextResponse.json({ success: true, data: { id: result.insertId } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Settlement Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
