import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const connection = await pool.getConnection();
  try {
    const { id } = params;
    const body = await request.json();
    const user = body.user || 'Admin';

    await connection.beginTransaction();

    // Fetch existing settlement to calculate new selisih
    const checkQuery = `SELECT * FROM tpos_settlement WHERE id = ?`;
    const [existingRows] = await connection.execute(checkQuery, [id]) as any[];
    
    if (existingRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Data settlement tidak ditemukan." }, { status: 404 });
    }

    const row = existingRows[0];
    const newActualCash = parseFloat(body.actual_cash || 0);
    const newActualTransfer = parseFloat(body.actual_transfer || 0);
    const newActualQris = parseFloat(body.actual_qris || 0);

    const selisihCash = newActualCash - parseFloat(row.expected_cash);
    const selisihTransfer = newActualTransfer - parseFloat(row.expected_transfer);
    const selisihQris = newActualQris - parseFloat(row.expected_qris);

    const updateQuery = `
      UPDATE tpos_settlement 
      SET 
        actual_cash = ?, actual_transfer = ?, actual_qris = ?,
        selisih_cash = ?, selisih_transfer = ?, selisih_qris = ?,
        catatan = ?
      WHERE id = ?
    `;

    await connection.execute(updateQuery, [
      newActualCash, newActualTransfer, newActualQris,
      selisihCash, selisihTransfer, selisihQris,
      body.catatan || row.catatan || '',
      id
    ]);

    // Record system history
    await addLogHistory(
      "Closing POS",
      parseInt(id),
      "EDIT",
      user,
      `Edit closing shift ID ${id} (Kasir: ${row.dibuat_oleh}, Tanggal: ${new Date(row.tanggal).toLocaleDateString('id-ID')})`
    );

    await connection.commit();
    return NextResponse.json({ success: true, message: "Settlement berhasil diperbarui." });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Settlement Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
