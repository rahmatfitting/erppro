import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { addLogHistory } from '@/lib/history';

// UMC = Uang Muka Customer — uses thuangtitipan with jenis='UMC'

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

    let query = `SELECT * FROM thuangtitipan WHERE status_aktif = 1 AND jenis = 'UMC'`;
    const params: any[] = [];
    if (keyword) { query += ` AND (kode LIKE ? OR keterangan LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (startDate) { query += ` AND tanggal >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND tanggal <= ?`; params.push(endDate); }
    query += ` ORDER BY tanggal DESC, nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      subtotal: Number(h.subtotal || 0),
      ppn_nominal: Number(h.ppn_nominal || 0),
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
      tanggal, nomormhrelasi, nomormhaccount, kode_order_jual,
      keterangan, valuta, kurs, subtotal, ppnNominal, grandTotal, nomorthjualorder, user
    } = body;

    if (!tanggal) {
      return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' }, { status: 400 });
    }

    await connection.beginTransaction();

    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `UMC-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thuangtitipan WHERE kode LIKE ? AND jenis = 'UMC' ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`]
    );
    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const [result]: any = await connection.execute(
      `INSERT INTO thuangtitipan (kode, jenis, tanggal, nomormhrelasi, nomormhaccount, nomormhvaluta,
       keterangan, kurs, subtotal, ppn_nominal, total, total_idr, nomorthjualorder, dibuat_pada)
       VALUES (?, 'UMC', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        generatedKode, tanggal, nomormhrelasi || 0, nomormhaccount || 0,
        keterangan || '', parseFloat(kurs || 1),
        parseFloat(subtotal || 0), parseFloat(ppnNominal || 0),
        parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        nomorthjualorder || 0
      ]
    );

    await connection.commit();
    await addLogHistory("Uang Muka Customer", result.insertId, "CREATE", user || "Admin", `Membuat Uang Muka Customer ${generatedKode}`);
    await sendNotification('Uang Muka Customer', `UMC Baru: ${generatedKode}`, `Ada uang muka customer baru yang perlu diapprove.`, generatedKode, result.insertId);
    return NextResponse.json({ success: true, message: 'UMC berhasil disimpan', data: { id: result.insertId, kode: generatedKode } });
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
      await executeQuery(`UPDATE thuangtitipan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`, [user || 'Admin', id]);
      await addLogHistory("Uang Muka Customer", id, "APPROVE", user || "Admin", `Menyetujui Uang Muka Customer`);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
