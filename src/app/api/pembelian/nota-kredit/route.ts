import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

// NKS = Nota Kredit Supplier, NDS = Nota Debet Supplier
// Both use thbelinota table with different jenis field

function getPrefix(jenis: string) {
  if (jenis === 'NKS') return 'NKS';
  if (jenis === 'NDS') return 'NDS';
  return 'FB'; // default
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get('jenis') || 'NKS';
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM thbelinota WHERE status_aktif = 1 AND jenis = ?`;
    const params: any[] = [jenis];

    if (keyword) { query += ` AND (kode LIKE ? OR supplier LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (startDate) { query += ` AND tanggal >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND tanggal <= ?`; params.push(endDate); }

    query += ` ORDER BY tanggal DESC, nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
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
      jenis = 'NKS', tanggal, supplier, nomormhsupplier, keterangan,
      nomormhaccount, account_tujuan, kode_nota_beli,
      valuta, kurs, subtotal, ppnNominal, grandTotal, user
    } = body;

    if (!tanggal || !supplier) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    await connection.beginTransaction();

    const prefix_code = getPrefix(jenis);
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `${prefix_code}-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbelinota WHERE kode LIKE ? AND jenis = ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`, jenis]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const session = await getSession();

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thbelinota (kode, jenis, tanggal, nomormhsupplier, supplier, keterangan,
       nomormhaccount, account_tujuan, kode_nota_beli,
       valuta, kurs, subtotal, ppn_nominal, total, total_idr,
       nomormhcabang, nomormhperusahaan, dibuat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        generatedKode, jenis, tanggal, nomormhsupplier || 0, supplier, keterangan || '',
        nomormhaccount || 0, account_tujuan || '', kode_nota_beli || '',
        valuta || 'IDR', parseFloat(kurs || 1),
        parseFloat(subtotal || 0), parseFloat(ppnNominal || 0),
        parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        session?.active_cabang || 0, session?.active_perusahaan || 0,
        user || 'Admin'
      ]
    );

    const headerId = headerResult.insertId;
    await connection.commit();
    return NextResponse.json({ success: true, message: `${jenis} berhasil disimpan`, data: { nomor: headerId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: 'Kode sudah digunakan' }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
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
      `SELECT h.*, n.tanggal as nota_tanggal
       FROM thbelinota h
       LEFT JOIN thbelinota n ON h.kode_nota_beli = n.kode AND n.status_aktif = 1
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
      if (h.nota_tanggal && new Date(h.tanggal) < new Date(h.nota_tanggal)) {
        await connection.rollback();
        return NextResponse.json({
          success: false,
          error: `Tanggal ${h.jenis} (${h.tanggal.toISOString().split('T')[0]}) tidak boleh lebih kecil dari tanggal nota beli (${new Date(h.nota_tanggal).toISOString().split('T')[0]})`
        }, { status: 400 });
      }

      // 1. Update Status
      await connection.execute(
        `UPDATE thbelinota SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );

      // 2. Insert into rhlaporanhutang
      const sign = h.jenis === 'NDS' ? -1 : 1;
      await connection.execute(
        `INSERT INTO rhlaporanhutang (
          nomormhcabang, nomormhperusahaan, tanggal, nomormhvaluta, kurs,
          nomormhtransaksi, transaksi_kode, total, total_idr, jenis, keterangan, nomormhsupplier, transaksi_nomor, transaksi_tanggal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhvaluta || 0, h.kurs || 1,
          h.nomor, h.kode, sign * parseFloat(h.total), sign * parseFloat(h.total_idr),
          h.jenis, `Nota ${h.jenis === 'NKS' ? 'Kredit' : 'Debet'} ${h.kode}: ${h.keterangan || ''}`.trim(),
          h.nomormhsupplier, h.nomor, h.tanggal
        ]
      );

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Disetujui' });

    } else if (action === 'disapprove') {
      if (h.status_disetujui === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: 'Belum disetujui' }, { status: 400 });
      }

      // 1. Update Status
      await connection.execute(
        `UPDATE thbelinota SET status_disetujui = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );

      // 2. Delete from ledger
      await connection.execute(
        `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = ?`,
        [id, h.kode, h.jenis]
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
