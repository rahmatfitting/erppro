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
    const filter = searchParams.get('filter') || '';
    
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
      WHERE h.jenis = 'FB'
      AND h.nomormhcabang = ?
      AND h.nomormhperusahaan = ?
    `;
    const params: any[] = [active_cabang, active_perusahaan];

    if (filter === 'approved') {
      query += ` AND h.status_aktif = 1 AND h.status_disetujui = 1 `;
    }

    if (filter === 'remaining_for_return') {
      query += ` AND h.status_aktif = 1 AND h.status_disetujui = 1 `;
      query += ` AND EXISTS (
        SELECT 1 
        FROM tdbelinota d
        LEFT JOIN (
          SELECT dr.nomortdbelinota, SUM(dr.jumlah) as total_retur
          FROM tdbeliretur dr
          JOIN thbeliretur hr ON dr.nomorthbeliretur = hr.nomor
          WHERE hr.status_aktif = 1
          GROUP BY dr.nomortdbelinota
        ) r ON d.nomor = r.nomortdbelinota
        WHERE d.nomorthbelinota = h.nomor
        AND d.jumlah > COALESCE(r.total_retur, 0)
      )`;
    }

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

    // Use pool.query for LIMIT/OFFSET stability
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
    console.error("GET Nota Beli Error:", error);
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
    const prefix = `INV-${year}${month}-`;

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
       VALUES (?, 'FB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          (nomorthbelinota, nomorthbelipenerimaan, nomortdbelipenerimaan, nomormhbarang, nomormhsatuan, kode_pb, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomorthbelipenerimaan || null, item.nomortdbelipenerimaan || null, item.nomormhbarang || null, item.nomormhsatuan || null,
           item.kode_pb || '', item.kode_barang || '', item.nama_barang, item.satuan, 
           parseFloat(item.jumlah || 0), parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), 
           parseFloat(item.diskon_nominal || 0), parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Nota Pembelian", headerId, "CREATE", body.user || "Admin", `Membuat Nota Pembelian ${generatedKode}`);
    await sendNotification('Nota Pembelian', `Nota Beli Baru: ${generatedKode}`, `Ada nota pembelian baru yang perlu disetujui.`, generatedKode);
    return NextResponse.json({ success: true, message: "Nota Beli berhasil disimpan", data: { nomor: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Nota Beli Error:", error);
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
      `SELECT nomor, kode, nomormhsupplier, nomormhvaluta, kurs, tanggal, jatuh_tempo, total, total_idr, status_disetujui 
       FROM thbelinota WHERE nomor = ? FOR UPDATE`, [id]
    );
    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    const h = headerRows[0];

    if (action === 'approve') {
       if (h.status_disetujui === 1) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli sudah disetujui sebelumnya" }, { status: 400 });
       }

       // Checks for linked PBs
       const [pbChecks]: any = await connection.execute(`
         SELECT h.kode, h.tanggal, h.status_aktif, h.status_disetujui 
         FROM tdbelinota d
         JOIN thbelipenerimaan h ON d.nomorthbelipenerimaan = h.nomor
         WHERE d.nomorthbelinota = ?
       `, [h.nomor]);

       for (const pb of pbChecks) {
         if (pb.status_aktif === 0) {
           await connection.rollback();
           return NextResponse.json({ success: false, error: `Penerimaan Barang ${pb.kode} sudah tidak aktif` }, { status: 400 });
         }
         if (pb.status_disetujui === 0) {
           await connection.rollback();
           return NextResponse.json({ success: false, error: `Penerimaan Barang ${pb.kode} belum disetujui` }, { status: 400 });
         }
         if (new Date(h.tanggal) < new Date(pb.tanggal)) {
           await connection.rollback();
           return NextResponse.json({ success: false, error: `Tanggal Nota Beli tidak boleh lebih kecil dari Tanggal Penerimaan (${pb.kode})` }, { status: 400 });
         }
       }

       const session = await getSession();

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
           session?.active_cabang || 0, session?.active_perusahaan || 0, h.nomormhsupplier, h.nomormhvaluta,
           h.nomor, 'FB', h.tanggal, h.nomor, h.kode, 
           h.jatuh_tempo, h.kurs, h.total, h.total_idr, `Nota Beli ${h.kode}`
         ]
       );

       await connection.commit();
       await addLogHistory("Nota Pembelian", h.nomor, "APPROVE", user || "Admin", `Menyetujui Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota Beli berhasil disetujui" });

    } else if (action === 'disapprove') {
       if (h.status_disetujui === 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli belum disetujui" }, { status: 400 });
       }

       // Check for Payment
       const [paymentCheck]: any = await connection.execute(`
         SELECT nomor FROM rhlaporanhutang 
         WHERE nomormhtransaksi = ? AND jenis = 'FB' AND pelunasan_nomor <> 0 
         LIMIT 1
       `, [h.nomor]);

       if (paymentCheck.length > 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota Beli sudah ada pelunasan/terbayar, tidak bisa batal approve" }, { status: 400 });
       }

       // Update Status
       await connection.execute(
         `UPDATE thbelinota SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
         [h.nomor]
       );

       // Delete from rhlaporanhutang
       await connection.execute(
         `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FB'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Pembelian", h.nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Approval Nota Beli berhasil dibatalkan" });

    } else if (action === 'reject' || action === 'delete') {
       await connection.execute(
         `UPDATE thbelinota SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', h.nomor]
       );
       
       // Also ensures it's removed from report if it was approved
       await connection.execute(
         `DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FB'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Pembelian", h.nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota Beli berhasil dihapus" });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("PATCH Nota Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
