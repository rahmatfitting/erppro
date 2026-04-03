import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { addLogHistory } from '@/lib/history';

// NDC = Nota Debet Customer — uses thjualnota with jenis='NDC'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM thjualnota WHERE status_aktif = 1 AND jenis = 'NDC'`;
    const params: any[] = [];
    if (keyword) { query += ` AND (kode LIKE ? OR customer LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (startDate) { query += ` AND tanggal >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND tanggal <= ?`; params.push(endDate); }
    query += ` ORDER BY tanggal DESC, nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      subtotal: Number(h.subtotal || 0),
      ppn_nominal: Number(h.ppn_nominal || 0),
      pph: Number(h.pph || 0),
      pphnominal: Number(h.pphnominal || 0),
      total: Number(h.total || 0),
      total_idr: Number(h.total_idr || 0),
      kurs: Number(h.kurs || 1)
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      tanggal, customer, nomormhcustomer, keterangan,
      nomormhaccount, account_tujuan, kode_nota_jual,
      valuta, kurs, subtotal, ppnNominal, pph, pphnominal, grandTotal, user
    } = body;

    if (!tanggal || !customer) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    await connection.beginTransaction();

    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `NDC-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thjualnota WHERE kode LIKE ? AND jenis = 'NDC' ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`]
    );
    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const [result]: any = await connection.execute(
      `INSERT INTO thjualnota (kode, jenis, tanggal, customer, keterangan,
       account_tujuan, kode_nota_jual, valuta, kurs,
       subtotal, ppn_nominal, pph, pphnominal, total, total_idr, dibuat_oleh, dibuat_pada)
       VALUES (?, 'NDC', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
      [
        generatedKode, tanggal, customer, keterangan || '',
        account_tujuan || '', kode_nota_jual || '',
        valuta || 'IDR', parseFloat(kurs || 1),
        parseFloat(subtotal || 0), parseFloat(ppnNominal || 0),
        parseFloat(pph || 0), parseFloat(pphnominal || 0),
        parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1)
      ]
    );

    await connection.commit();
    await addLogHistory("Nota Debet Customer", result.insertId, "CREATE", user || "Admin", `Membuat NDC baru ${generatedKode}`);
    await sendNotification('Nota Debet Customer', `NDC Baru: ${generatedKode}`, `Ada nota debet customer baru yang perlu diapprove. Customer: ${customer}`, generatedKode);
    return NextResponse.json({ success: true, message: 'NDC berhasil disimpan', data: { id: result.insertId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: 'Kode sudah digunakan' }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action, user } = await request.json();
    if (action === 'approve') {
      await executeQuery(`UPDATE thjualnota SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE nomor = ?`, [id]);
      const data: any = await executeQuery(`SELECT kode FROM thjualnota WHERE nomor = ?`, [id]);
      if (data.length > 0) {
        await addLogHistory("Nota Debet Customer", id, "APPROVE", user || "Admin", `Menyetujui NDC ${data[0].kode}`);
      }
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
