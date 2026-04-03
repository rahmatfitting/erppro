import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const kasir = searchParams.get('kasir') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT h.* FROM thpos h WHERE 1=1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.customer LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      query += ` AND DATE(h.tanggal) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(h.tanggal) <= ?`;
      params.push(endDate);
    }

    if (kasir) {
      query += ` AND h.dibuat_oleh = ?`;
      params.push(kasir);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET POS Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, nomormhcustomer, customer, nomormhcabang, nomormhperusahaan,
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal,
      pembayaran, jumlahBayar, kembalian, items, user, nomormhgudang 
    } = body;

    if (!tanggal || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data transaksi tidak lengkap" }, { status: 400 });
    }

    if (jumlahBayar < grandTotal) {
      return NextResponse.json({ success: false, error: "Jumlah bayar kurang dario total belanja" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER POS
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `POS-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thpos WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
    const generatedKode = `${prefix}${String(nextNum).padStart(4, '0')}`; // POS uses 4 digits for more volume

    // 1. Insert Header
    const [headerResult]: any = await connection.execute(
      `INSERT INTO thpos 
        (kode, tanggal, nomormhcustomer, customer, nomormhgudang, nomormhcabang, nomormhperusahaan, subtotal, diskon_nominal, dpp, ppn_nominal, total, 
         pembayaran, jumlah_bayar, kembalian, dibuat_oleh) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, nomormhcustomer || 0, customer || 'Umum', nomormhgudang || 0, nomormhcabang || 0, nomormhperusahaan || 0,
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0,
        pembayaran || 'Cash', jumlahBayar || 0, kembalian || 0, user || 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       const [detailResult]: any = await connection.execute(
         `INSERT INTO tdpos 
          (nomorthpos, nomormhbarang, kode_barang, nama_barang, nomormhsatuan, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomormhbarang || 0, item.kode_barang || '', item.nama_barang, item.nomormhsatuan || 0, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0)
         ]
       );
       
       const detailId = detailResult.insertId;

        await connection.execute(
          `INSERT INTO rhlaporanstok 
           (nomormhcabang, nomormhperusahaan, nomormhgudang, nomormhcustomer, nomormhbarang, jumlah, nomormhtransaksi, transaksi_nomor, transaksi_kode, keterangan, tanggal, jenis)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nomormhcabang || 0, nomormhperusahaan || 0, nomormhgudang || 0, nomormhcustomer || 0, item.nomormhbarang || 0, parseFloat(item.jumlah || 0) * -1,
            headerId, detailId, generatedKode, `Penjualan POS Kode: ${generatedKode} Barang: ${item.nama_barang}`,
            tanggal, 'POS'
          ]
        );
    }

    await connection.commit();
    await addLogHistory("POS Kasir", headerId, "CREATE", user || "Admin", `Transaksi POS ${generatedKode}`);
    return NextResponse.json({ success: true, message: "Transaksi Kasir berhasil", data: { id: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST POS Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
