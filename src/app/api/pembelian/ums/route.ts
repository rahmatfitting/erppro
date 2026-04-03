import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const isBrowseOrderBeli = searchParams.get('isBrowseOrderBeli') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (isBrowseOrderBeli) {
      let query = `SELECT h.* FROM thbeliorder h WHERE h.status_aktif = 1 AND h.status_disetujui = 1
                   AND NOT EXISTS (SELECT 1 FROM thuangtitipan u WHERE u.nomorthbeliorder = h.nomor AND u.status_aktif = 1)`;
      const params: any[] = [];
      if (keyword) {
        query += ` AND (h.kode LIKE ? OR h.supplier LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      query += ` ORDER BY h.tanggal DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const [data]: any = await pool.query(query, params);
      return NextResponse.json({ success: true, data });
    }

    let query = `SELECT * FROM thuangtitipan WHERE status_aktif = 1 AND jenis = 'UMS'`;
    const params: any[] = [];
    if (keyword) { query += ` AND (kode LIKE ? OR keterangan LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
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
      tanggal, nomormhrelasi, nomormhaccount, 
      keterangan, valuta, nomormhvaluta, kurs, subtotal, ppnNominal, grandTotal, nomorthbeliorder, user
    } = body;

    if (!tanggal) {
      return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' }, { status: 400 });
    }

    await connection.beginTransaction();

    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `UMS-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thuangtitipan WHERE kode LIKE ? AND jenis = 'UMS' ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const session = await getSession();

    const [result]: any = await connection.execute(
      `INSERT INTO thuangtitipan (kode, jenis, tanggal, nomormhrelasi, nomormhaccount, nomormhvaluta,
       keterangan, kurs, subtotal, ppn_nominal, total, total_idr, nomorthbeliorder,
       nomormhcabang, nomormhperusahaan, dibuat_oleh, dibuat_pada)
       VALUES (?, 'UMS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        generatedKode, tanggal, nomormhrelasi || 0, nomormhaccount || 0, nomormhvaluta || 0,
        keterangan || '', parseFloat(kurs || 1),
        parseFloat(subtotal || 0), parseFloat(ppnNominal || 0),
        parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        nomorthbeliorder || 0,
        session?.active_cabang || 0, session?.active_perusahaan || 0,
        user || 'Admin'
      ]
    );

    const headerId = result.insertId;
    await connection.commit();
    return NextResponse.json({ success: true, message: 'Uang Muka Supplier berhasil disimpan', data: { nomor: headerId, kode: generatedKode } });
  } catch (error: any) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: 'Kode sudah digunakan' }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PATCH(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { id, action, user } = body;
    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'ID dan action diperlukan' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [headerRows]: any = await connection.execute(
      `SELECT h.*, o.tanggal as order_tanggal, o.kode as order_kode
       FROM thuangtitipan h
       LEFT JOIN thbeliorder o ON h.nomorthbeliorder = o.nomor AND o.status_aktif = 1
       WHERE h.nomor = ? FOR UPDATE`, [id]
    );

    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
    const h = headerRows[0];

    if (action === 'approve') {
      if (h.status_disetujui === 1) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: 'Sudah disetujui' }, { status: 400 });
      }
      if (h.status_aktif === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: 'Transaksi sudah dihapus' }, { status: 400 });
      }
      if (h.order_tanggal && new Date(h.tanggal) < new Date(h.order_tanggal)) {
        await connection.rollback();
        return NextResponse.json({
          success: false,
          error: `Tanggal UMS (${h.tanggal.toISOString().split('T')[0]}) tidak boleh lebih kecil dari tanggal order beli (${new Date(h.order_tanggal).toISOString().split('T')[0]})`
        }, { status: 400 });
      }

      // 1. Update Status
      await connection.execute(
        `UPDATE thuangtitipan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );

      // 2. Insert into rhlaporanhutang (Dual entry)
      // Entry 1: UMS_PAKAI (Negative) - To reduce original order debt if any or just tracking
      await connection.execute(
        `INSERT INTO rhlaporanhutang (
          nomormhcabang, nomormhperusahaan, tanggal, nomormhvaluta, kurs,
          nomormhtransaksi, transaksi_kode, total, total_idr, jenis, keterangan, nomormhsupplier, transaksi_nomor, transaksi_tanggal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UMS_PAKAI', ?, ?, ?, ?)`,
        [
          h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhvaluta || 0, h.kurs || 1,
          h.nomor, h.kode, -parseFloat(h.total), -parseFloat(h.total_idr),
          `Uang Muka (Pakai) ${h.kode} Ref: ${h.order_kode || '-'}`,
          h.nomormhrelasi, h.nomor, h.tanggal
        ]
      );

      // Entry 2: UMS (Positive) - The actual advance payment record
      await connection.execute(
        `INSERT INTO rhlaporanhutang (
          nomormhcabang, nomormhperusahaan, tanggal, nomormhvaluta, kurs,
          nomormhtransaksi, transaksi_kode, total, total_idr, jenis, keterangan, nomormhsupplier, transaksi_nomor, transaksi_tanggal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UMS', ?, ?, ?, ?)`,
        [
          h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhvaluta || 0, h.kurs || 1,
          h.nomor, h.kode, parseFloat(h.total), parseFloat(h.total_idr),
          `Uang Muka Supplier ${h.kode}`,
          h.nomormhrelasi, h.nomor, h.tanggal
        ]
      );

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Disetujui' });

    } else if (action === 'disapprove') {
      if (h.status_disetujui === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: 'Belum disetujui' }, { status: 400 });
      }

      // Check if already used or paid
      // We can check rhlaporanhutang if there are other entries referencing this UMS, or check tdbelinota
      const [usageRows]: any = await connection.execute(
        `SELECT 1 FROM tdbelinota WHERE nomorthuangtitipan = ? AND status_aktif = 1 LIMIT 1`, [id]
      );
      if (usageRows.length > 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: 'UMS sudah digunakan dalam Nota Beli' }, { status: 400 });
      }

      // 1. Update Status
      await connection.execute(
        `UPDATE thuangtitipan SET status_disetujui = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );

      // 2. Delete from ledger
      await connection.execute(
        `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis IN ('UMS', 'UMS_PAKAI')`,
        [id, h.kode]
      );

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    if (connection) await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
