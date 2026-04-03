import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT h.*, (SELECT COUNT(*) FROM tdbeliretur d WHERE d.nomorthbeliretur = h.nomor) as itemsCount
      FROM thbeliretur h WHERE 1=1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.supplier LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
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
      tanggal, supplier, nomormhsupplier, gudang, nomormhgudang, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnPersen, ppnNominal, grandTotal, items 
    } = body;

    if (!tanggal || !supplier || !nomormhgudang || !items?.length) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap (Gudang wajib diisi)' }, { status: 400 });
    }

    await connection.beginTransaction();

    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `RTB-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbeliretur WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const session = await getSession();

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thbeliretur (kode, tanggal, nomormhsupplier, supplier, nomormhgudang, gudang, keterangan, valuta, nomormhvaluta, kurs,
       subtotal, diskon_nominal, dpp, ppn_prosentase, ppn_nominal, total, total_idr, nomormhcabang, nomormhperusahaan, dibuat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
      [
        generatedKode, 
        tanggal || null, 
        nomormhsupplier || 0, 
        supplier || '', 
        nomormhgudang || 0,
        gudang || '',
        keterangan || '',
        valuta || 'IDR', 
        nomormhvaluta || 0,
        parseFloat(kurs || 1),
        parseFloat(subtotal || 0), 
        parseFloat(diskonNominal || 0), 
        parseFloat(dpp || 0),
        parseFloat(ppnPersen || 0),
        parseFloat(ppnNominal || 0),
        parseFloat(grandTotal || 0),
        parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        session?.active_cabang || 0,
        session?.active_perusahaan || 0
      ]
    );

    const headerId = headerResult.insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO tdbeliretur (nomorthbeliretur, nomorthbelinota, nomortdbelinota, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, harga,
         diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh, dibuat_pada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
        [
          headerId, 
          item.nomorthbelinota || null, 
          item.nomortdbelinota || null, 
          item.nomormhbarang || 0, 
          item.nomormhsatuan || 0,
          item.kode_barang || '', 
          item.nama_barang || item.barang || '', 
          item.satuan || '',
          parseFloat(item.jumlah || 0), 
          parseFloat(item.harga || 0),
          parseFloat(item.diskon_prosentase || 0), 
          parseFloat(item.diskon_nominal || 0),
          parseFloat(item.netto || 0), 
          parseFloat(item.subtotal || 0), 
          item.keterangan || ''
        ]
      );
    }

    await connection.commit();
    await addLogHistory("Retur Pembelian", headerId, "CREATE", body.user || "Admin", `Membuat Retur Pembelian ${generatedKode}`);
    await sendNotification('Retur Pembelian', `Retur Beli Baru: ${generatedKode}`, `Ada retur pembelian baru yang perlu disetujui.`, generatedKode);
    return NextResponse.json({ success: true, message: 'Retur Beli berhasil disimpan', data: { nomor: headerId, kode: generatedKode } });
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
    if (!id || !action) {
       return NextResponse.json({ success: false, error: "ID dan action diperlukan" }, { status: 400 });
    }

    await connection.beginTransaction();

    const [headerRows]: any = await connection.execute(
      `SELECT h.*, 
              (SELECT MAX(n.tanggal) 
               FROM tdbeliretur d 
               JOIN thbelinota n ON d.nomorthbelinota = n.nomor 
               WHERE d.nomorthbeliretur = h.nomor) as max_nota_tanggal
       FROM thbeliretur h WHERE h.nomor = ? FOR UPDATE`, [id]
    );
    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
    const h = headerRows[0];

    if (action === 'approve') {
       if (h.status_disetujui === 1) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Sudah disetujui" }, { status: 400 });
       }
       if (h.status_aktif === 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Transaksi sudah dihapus" }, { status: 400 });
       }
       
       if (h.max_nota_tanggal && new Date(h.tanggal) < new Date(h.max_nota_tanggal)) {
         await connection.rollback();
         return NextResponse.json({ 
           success: false, 
           error: `Tanggal retur (${h.tanggal.toISOString().split('T')[0]}) tidak boleh lebih kecil dari tanggal nota (${new Date(h.max_nota_tanggal).toISOString().split('T')[0]})` 
         }, { status: 400 });
       }

       // 1. Update Status
       await connection.execute(
         `UPDATE thbeliretur SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', id]
       );

       // 2. Insert into rhlaporanstok
       const [itemRows]: any = await connection.execute(
         `SELECT * FROM tdbeliretur WHERE nomorthbeliretur = ? AND status_aktif = 1`, [id]
       );

       for (const item of itemRows) {
         await connection.execute(
           `INSERT INTO rhlaporanstok (
             nomormhcabang, nomormhperusahaan, nomormhsupplier, nomormhbarang, nomormhgudang, 
             jumlah, nomormhtransaksi, transaksi_nomor, transaksi_kode, tanggal, keterangan
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
           [
             h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.nomormhsupplier, item.nomormhbarang, h.nomormhgudang,
             -parseFloat(item.jumlah), h.nomor, item.nomor, h.kode, h.tanggal,
             `Retur Beli ${h.kode}: ${h.keterangan || ''} - ${item.keterangan || ''}`.trim()
           ]
         );
       }

       // 3. Insert into rhlaporanhutang
       await connection.execute(
         `INSERT INTO rhlaporanhutang (
           nomormhcabang, nomormhperusahaan, tanggal, nomormhvaluta, kurs,
           nomormhtransaksi, transaksi_kode, total, total_idr, jenis, keterangan, nomormhsupplier, transaksi_nomor, transaksi_tanggal
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RB', ?, ?, ?, ?)`,
         [
           h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhvaluta || 0, h.kurs || 1,
           h.nomor, h.kode, -parseFloat(h.total), -parseFloat(h.total_idr),
           `Retur Beli ${h.kode}: ${h.keterangan || ''}`.trim(), h.nomormhsupplier, h.nomor, h.tanggal
         ]
       );

       await connection.commit();
       await addLogHistory("Retur Pembelian", h.nomor, "APPROVE", user || "Admin", `Menyetujui Retur ${h.kode}`);
       return NextResponse.json({ success: true, message: 'Retur Beli disetujui' });

    } else if (action === 'disapprove') {
       if (h.status_disetujui === 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Belum disetujui" }, { status: 400 });
       }

       // 1. Update Status
       await connection.execute(
         `UPDATE thbeliretur SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
         [id]
       );

       // 2. Delete from ledgers
       await connection.execute(`DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ?`, [id, h.kode]);
       await connection.execute(`DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'RB'`, [id, h.kode]);

       await connection.commit();
       await addLogHistory("Retur Pembelian", h.nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Retur ${h.kode}`);
       return NextResponse.json({ success: true, message: 'Retur Beli dibatalkan approval' });

    } else if (action === 'delete') {
       // 1. Update Status
       await connection.execute(
         `UPDATE thbeliretur SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', id]
       );

       // 2. Delete from ledgers (if was approved)
       await connection.execute(`DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ?`, [id, h.kode]);
       await connection.execute(`DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'RB'`, [id, h.kode]);

       await connection.commit();
       await addLogHistory("Retur Pembelian", h.nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Retur ${h.kode}`);
       return NextResponse.json({ success: true, message: 'Retur Beli dihapus' });
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
