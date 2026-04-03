import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const supplier = searchParams.get('supplier') || '';
    const openReceipt = searchParams.get('openreceipt') === 'true';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.* 
      FROM thbeliorder h
      WHERE 1=1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.supplier LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
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

    if (openReceipt) {
      query += ` AND h.status_disetujui = 1`;
      query += ` AND EXISTS (
        SELECT 1 
        FROM tdbeliorder d
        LEFT JOIN (
          SELECT td.nomortdbeliorder, SUM(td.jumlah) as total_terima
          FROM tdbelipenerimaan td
          JOIN thbelipenerimaan th ON td.nomorthbelipenerimaan = th.nomor
          WHERE (th.status_aktif = 1 OR th.status_aktif IS NULL)
          GROUP BY td.nomortdbeliorder
        ) t ON d.nomor = t.nomortdbeliorder
        WHERE d.nomorthbeliorder = h.nomor
        AND d.jumlah > COALESCE(t.total_terima, 0)
      )`;
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, nomormhsupplier, supplier_nama, valuta, kurs, keterangan, 
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items 
    } = body;

    // Validate
    if (!tanggal || !nomormhsupplier || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbeliorder WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
      `INSERT INTO thbeliorder 
        (kode, tanggal, nomormhsupplier, supplier, valuta, kurs, keterangan, subtotal, diskon_nominal, dpp, ppn_nominal, total, total_idr, dibuat_oleh) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, nomormhsupplier, supplier_nama || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0, (grandTotal || 0) * (kurs || 1), 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbeliorder 
          (nomorthbeliorder, nomorthbelipermintaan, nomortdbelipermintaan, nomormhbarang, nomormhsatuan, kode_pr, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomorthbelipermintaan || null, item.nomortdbelipermintaan || null, item.nomormhbarang || null, item.nomormhsatuan || null, 
           item.kode_pr || '', item.kode_barang || '', item.nama_barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Order Pembelian", headerId, "CREATE", body.user || "Admin", `Membuat Order Pembelian ${generatedKode}`);
    await sendNotification('Order Pembelian', `PO Baru: ${generatedKode}`, `Ada order pembelian baru yang perlu disetujui.`, generatedKode);
    return NextResponse.json({ success: true, message: "Order Beli berhasil disimpan", data: { nomor: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Order Error:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode transaksi sudah digunakan" }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action, user } = await request.json();
    if (!id || !action) {
       return NextResponse.json({ success: false, error: "ID dan action diperlukan" }, { status: 400 });
    }

    let query = "";
    const params: any[] = [];
    if (!id || !action) {
       return NextResponse.json({ success: false, error: "ID dan action diperlukan" }, { status: 400 });
    }

    const header: any = await executeQuery(`SELECT nomor, kode FROM thbeliorder WHERE nomor = ?`, [id]);
    if (header.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    const { nomor, kode } = header[0];

    if (action === 'approve') {
       // Requirement 3: Check constraints
       const headerData: any = await executeQuery(
         `SELECT status_aktif, status_disetujui, tanggal FROM thbeliorder WHERE nomor = ?`, 
         [nomor]
       );
       const h = headerData[0];
       if (h.status_aktif === 0) return NextResponse.json({ success: false, error: "Transaksi sudah tidak aktif" }, { status: 400 });
       if (h.status_disetujui === 1) return NextResponse.json({ success: false, error: "Transaksi sudah diapprove sebelumnya" }, { status: 400 });

       // Date check: PO date >= PR date
       const prDates: any = await executeQuery(`
         SELECT hpr.tanggal, hpr.kode 
         FROM tdbeliorder d
         JOIN thbelipermintaan hpr ON d.nomorthbelipermintaan = hpr.nomor
         WHERE d.nomorthbeliorder = ? AND hpr.status_aktif = 1
       `, [nomor]);

       for (const pr of prDates) {
         if (new Date(h.tanggal) < new Date(pr.tanggal)) {
           return NextResponse.json({ 
             success: false, 
             error: `Tanggal Order Beli (${h.tanggal}) tidak boleh lebih kecil dari Tanggal Permintaan (${pr.kode}: ${pr.tanggal})` 
           }, { status: 400 });
         }
       }

       query = `UPDATE thbeliorder SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`;
       params.push(user || 'Admin', nomor);
       await addLogHistory("Order Pembelian", nomor, "APPROVE", user || "Admin", `Menyetujui Order ${kode}`);
    } else if (action === 'disapprove') {
       // Requirement 3: Check if already created Penerimaan Barang
       const existingPB: any = await executeQuery(
         `SELECT nomor FROM thbelipenerimaan WHERE nomorthbeliorder = ? AND status_aktif = 1 LIMIT 1`,
         [nomor]
       );
       if (existingPB.length > 0) {
         return NextResponse.json({ success: false, error: "Tidak bisa batal approve, PO sudah ditarik ke Penerimaan Barang" }, { status: 400 });
       }

       query = `UPDATE thbeliorder SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`;
       params.push(nomor);
       await addLogHistory("Order Pembelian", nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Order ${kode}`);
    } else if (action === 'reject' || action === 'delete') {
       query = `UPDATE thbeliorder SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`;
       params.push(user || 'Admin', nomor);
       await addLogHistory("Order Pembelian", nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Order ${kode}`);
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    await executeQuery(query, params);
    return NextResponse.json({ success: true, message: `Berhasil ${action} data` });
  } catch (error: any) {
    console.error("PATCH Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
