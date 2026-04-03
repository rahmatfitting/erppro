import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const supplier = searchParams.get('supplier') || '';
    
    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.* 
      FROM thbelinota h
      WHERE h.jenis = 'FBL'
      AND h.nomormhcabang = ?
      AND h.nomormhperusahaan = ?
    `;
    const params: any[] = [active_cabang, active_perusahaan];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.supplier LIKE ? OR h.nomor_faktur_supplier LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      query += ` AND h.tanggal >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND h.tanggal <= ?`;
      params.push(endDate);
    }

    if (supplier) {
      query += ` AND h.supplier = ?`;
      params.push(supplier);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      subtotal: Number(h.subtotal || 0),
      diskon_nominal: Number(h.diskon_nominal || 0),
      dpp: Number(h.dpp || 0),
      ppn_nominal: Number(h.ppn_nominal || 0),
      total: Number(h.total || 0),
      total_idr: Number(h.total_idr || 0),
      kurs: Number(h.kurs || 1)
    }));
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Nota Beli Langsung Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, supplier, nomormhsupplier, noFaktur, jatuhTempo, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnNominal, ppnPersen, grandTotal,
      items 
    } = body;

    // Validate
    if (!tanggal || !supplier || !valuta || items?.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const session = await getSession();

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `FBL-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbelinota WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].kode;
      const lastNumStr = lastKode.replace(prefix, '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    // 1. Insert Header
    const [headerResult]: any = await connection.execute(
      `INSERT INTO thbelinota 
        (kode, jenis, tanggal, supplier, nomormhsupplier, nomor_faktur_supplier, jatuh_tempo, keterangan, 
         subtotal, diskon_nominal, dpp, ppn_prosentase, ppn_nominal, total, total_idr, valuta, nomormhvaluta, kurs, 
         nomormhcabang, nomormhperusahaan, dibuat_oleh) 
       VALUES (?, 'FBL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, supplier, nomormhsupplier || 0, noFaktur || '', jatuhTempo || tanggal, keterangan || '',
        parseFloat(subtotal || 0), parseFloat(diskonNominal || 0), parseFloat(dpp || 0), 
        parseFloat(ppnPersen || 0), parseFloat(ppnNominal || 0), parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        valuta, nomormhvaluta || 0, parseFloat(kurs || 1), 
        session?.active_cabang || 0, session?.active_perusahaan || 0, 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbelinota 
          (nomorthbelinota, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomormhbarang || null, item.nomormhsatuan || null,
           item.kode_barang || '', item.nama_barang, item.satuan, 
           parseFloat(item.jumlah || 0), parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), 
           parseFloat(item.diskon_nominal || 0), parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Nota Beli Langsung", headerId, "CREATE", body.user || "Admin", `Membuat Nota Beli Langsung ${generatedKode}`);
    await sendNotification('Nota Beli Langsung', `Nota Baru: ${generatedKode}`, `Ada nota pembelian langsung baru.`, generatedKode, headerId);
    return NextResponse.json({ success: true, message: "Nota Beli Langsung berhasil disimpan", data: { nomor: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Nota Beli Langsung Error:", error);
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: "Kode transaksi sudah digunakan" }, { status: 400 });
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
      `SELECT * FROM thbelinota WHERE nomor = ? FOR UPDATE`, [id]
    );
    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    const h = headerRows[0];

    if (action === 'approve') {
       if (h.status_disetujui === 1) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli Langsung sudah disetujui sebelumnya" }, { status: 400 });
       }

       // 1. Update Status
       await connection.execute(
         `UPDATE thbelinota SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', h.nomor]
       );

       // 2. Insert into rhlaporanhutang
       await connection.execute(
         `INSERT INTO rhlaporanhutang (
           nomormhcabang, nomormhperusahaan, nomormhsupplier, nomormhvaluta, 
           nomormhtransaksi, jenis, tanggal, transaksi_nomor, transaksi_kode, 
           transaksi_tanggal, jatuh_tempo, kurs, total, total_idr, keterangan
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
         [
           h.nomormhcabang, h.nomormhperusahaan, h.nomormhsupplier, h.nomormhvaluta,
           h.nomor, 'FBL', h.tanggal, h.nomor, h.kode, 
           h.jatuh_tempo || h.tanggal, h.kurs, h.total, h.total_idr, `Nota Beli Langsung ${h.kode} - ${h.keterangan || ''}`
         ]
       );

       // 3. Insert into rhlaporanstok
       const [details]: any = await connection.execute(`SELECT * FROM tdbelinota WHERE nomorthbelinota = ?`, [h.nomor]);
       for (const d of details) {
          await connection.execute(
            `INSERT INTO rhlaporanstok (
              nomormhcabang, nomormhperusahaan, nomormhgudang, nomormhsupplier, nomormhbarang, 
              tanggal, jumlah, hpp, nomormhtransaksi, transaksi_nomor, transaksi_kode, keterangan, jenis
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              h.nomormhcabang, h.nomormhperusahaan, 0, h.nomormhsupplier, d.nomormhbarang,
              h.tanggal, d.jumlah || 0, d.netto || 0, h.nomor, d.nomor, h.kode, 
              `[${h.kode}] ${h.keterangan || ''} - ${d.nama_barang || ''}`, 'FBL'
            ]
          );
       }

       await connection.commit();
       await addLogHistory("Nota Beli Langsung", h.nomor, "APPROVE", user || "Admin", `Menyetujui Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota Beli Langsung berhasil disetujui" });

    } else if (action === 'disapprove') {
       if (h.status_disetujui === 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli Langsung belum disetujui" }, { status: 400 });
       }

       // Check for Payment in rhlaporanhutang
       const [paymentCheck]: any = await connection.execute(`
         SELECT nomor FROM rhlaporanhutang 
         WHERE nomormhtransaksi = ? AND jenis = 'FBL' AND pelunasan_nomor <> 0 
         LIMIT 1
       `, [h.nomor]);

       if (paymentCheck.length > 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli Langsung sudah ada pelunasan/terbayar, tidak bisa batal approve" }, { status: 400 });
       }

       // Update Status
       await connection.execute(
         `UPDATE thbelinota SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
         [h.nomor]
       );

       // Delete from rhlaporanhutang
       await connection.execute(
         `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FBL'`,
         [h.nomor, h.kode]
       );

       // Delete from rhlaporanstok
       await connection.execute(
         `DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FBL'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Beli Langsung", h.nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Approval Nota Beli Langsung berhasil dibatalkan" });

    } else if (action === 'reject' || action === 'delete') {
       await connection.execute(
         `UPDATE thbelinota SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', h.nomor]
       );
       
       // Ensure removed from reports if were approved
       await connection.execute(
         `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FBL'`,
         [h.nomor, h.kode]
       );
       await connection.execute(
         `DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FBL'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Beli Langsung", h.nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota Beli Langsung berhasil dihapus" });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("PATCH Nota Beli Langsung Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
