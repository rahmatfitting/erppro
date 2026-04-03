import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { addLogHistory } from '@/lib/history';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get('jenis') || 'RJ';
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT h.*, c.nama as customer, (SELECT COUNT(*) FROM tdjualretur d WHERE d.nomorthjualretur = h.nomor) as itemsCount
      FROM thjualretur h 
      LEFT JOIN mhcustomer c ON h.nomormhrelasi = c.nomor
      WHERE h.status_aktif = 1 AND h.jenis = ?`;
    const params: any[] = [jenis];

    if (keyword) { query += ` AND (h.kode LIKE ? OR c.nama LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (startDate) { query += ` AND h.tanggal >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND h.tanggal <= ?`; params.push(endDate); }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
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
      jenis = 'RJ', tanggal, nomormhcustomer, keterangan,
      valuta, kurs, subtotal, diskonNominal, dpp, ppnNominal, grandTotal,
      nomormhgudang, nomormhcabang, nomormhperusahaan,
      // NKC fields
      nomormhaccount, nomorthjual, 
      items, user
    } = body;

    if (!tanggal || !nomormhcustomer) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (jenis === 'RJ' && (!items || items.length === 0)) {
      return NextResponse.json({ success: false, error: 'Item barang wajib diisi untuk Retur Jual' }, { status: 400 });
    }

    await connection.beginTransaction();

    const prefix_code = jenis === 'NKC' ? 'NKC' : 'RJ';
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `${prefix_code}-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thjualretur WHERE kode LIKE ? AND jenis = ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`, jenis]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thjualretur (kode, jenis, tanggal, nomormhrelasi, keterangan,
       nomormhaccount, nomorthjualnota, nomormhgudang, nomormhcabang, nomormhperusahaan,
       kurs, subtotal, diskon_nominal, dpp, ppn_nominal, total, total_idr, dibuat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
      [
        generatedKode, jenis, tanggal, nomormhcustomer || 0, keterangan || '',
        nomormhaccount || 0, nomorthjual || 0, nomormhgudang || 0, nomormhcabang || 0, nomormhperusahaan || 0,
        parseFloat(kurs || 1),
        parseFloat(subtotal || 0), parseFloat(diskonNominal || 0), parseFloat(dpp || 0),
        parseFloat(ppnNominal || 0), parseFloat(grandTotal || 0),
        parseFloat(grandTotal || 0) * parseFloat(kurs || 1)
      ]
    );

    const headerId = headerResult.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.execute(
          `INSERT INTO tdjualretur (nomorthjualretur, nomormhbarang, kode_barang, nama_barang, satuan,
           jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh, dibuat_pada)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
          [
            headerId, item.nomormhbarang || 0, item.kode_barang || '', item.nama_barang, item.satuan,
            parseFloat(item.jumlah || 0), parseFloat(item.harga || 0),
            parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0),
            parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || ''
          ]
        );
      }
    }

    await connection.commit();
    const moduleName = jenis === 'NKC' ? 'Nota Kredit Customer' : 'Retur Jual';
    await addLogHistory(moduleName, headerId, "CREATE", user || "Admin", `Membuat ${moduleName} baru ${generatedKode}`);
    return NextResponse.json({ success: true, message: `${jenis} berhasil disimpan`, data: { id: headerId, kode: generatedKode } });
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
    const { id, action, user } = await request.json();
    await connection.beginTransaction();

    if (action === 'approve') {
      await connection.execute(`UPDATE thjualretur SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE nomor = ?`, [id]);
      
      const [headerRows]: any = await connection.execute(`SELECT * FROM thjualretur WHERE nomor = ?`, [id]);
      if (headerRows.length > 0) {
        const h = headerRows[0];
        const moduleName = h.jenis === 'NKC' ? 'Nota Kredit Customer' : 'Retur Jual';

        if (h.jenis === 'RJ') {
          // 1. Mutasi Stok (Increase stock for Return)
          const [details]: any = await connection.execute(`SELECT * FROM tdjualretur WHERE nomorthjualretur = ?`, [id]);
          for (const d of details) {
            await connection.execute(
              `INSERT INTO rhlaporanstok 
               (nomormhcabang, nomormhperusahaan, nomormhgudang, nomormhrelasi, nomormhbarang, jumlah, nomormhtransaksi, transaksi_nomor, transaksi_kode, keterangan)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.nomormhgudang || 0, h.nomormhrelasi || 0, d.nomormhbarang || 0, 
                parseFloat(d.jumlah || 0), // Positive value for return inflow
                h.nomor, d.nomor, h.kode, `Retur Jual: ${h.kode} - ${h.keterangan || ''} (Detail: ${d.keterangan || ''})`
              ]
            );
          }

          // 2. Laporan Piutang (Decrease receivable)
          await connection.execute(
            `INSERT INTO rhlaporanpiutang (nomormhcabang, nomormhperusahaan, tanggal, nomormhrelasi, kurs, nomormhtransaksi, transaksi_kode, total, total_idr, jenis)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhrelasi || 0, h.kurs || 1, 
              h.nomor, h.kode, -parseFloat(h.total || 0), -parseFloat(h.total_idr || 0), 'RJ'
            ]
          );
        }

        await addLogHistory(moduleName, id, "APPROVE", user || "Admin", `Menyetujui ${moduleName} ${h.kode}`);
      }
      await connection.commit();
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }

    if (action === 'disapprove') {
      await connection.execute(`UPDATE thjualretur SET status_disetujui = 0, dibatalkan_oleh = 'Admin', dibatalkan_pada = NOW() WHERE nomor = ?`, [id]);
      
      const [headerRows]: any = await connection.execute(`SELECT kode, jenis FROM thjualretur WHERE nomor = ?`, [id]);
      if (headerRows.length > 0) {
        const h = headerRows[0];
        const moduleName = h.jenis === 'NKC' ? 'Nota Kredit Customer' : 'Retur Jual';
        
        // Delete reporting records
        await connection.execute(`DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ?`, [id, h.kode]);
        await connection.execute(`DELETE FROM rhlaporanpiutang WHERE nomormhtransaksi = ? AND jenis = 'RJ'`, [id]);

        await addLogHistory(moduleName, id, "DISAPPROVE", user || "Admin", `Membatalkan persetujuan ${moduleName} ${h.kode}`);
      }
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
