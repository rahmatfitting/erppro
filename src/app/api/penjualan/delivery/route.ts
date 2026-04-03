import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const customer = searchParams.get('customer') || '';
    const gudang = searchParams.get('gudang') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.* 
      FROM thdeliveryorder h
      WHERE 1=1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.customer LIKE ? OR h.kode_order_jual LIKE ?)`;
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

    if (customer) {
      query += ` AND h.customer = ?`;
      params.push(customer);
    }
    
    if (gudang) {
      query += ` AND h.gudang = ?`;
      params.push(gudang);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Delivery Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, customer, sales, gudang, kode_order_jual, valuta, kurs, keterangan, 
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items, user 
    } = body;

    if (!tanggal || !customer || !gudang || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `DO-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thdeliveryorder WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
      `INSERT INTO thdeliveryorder 
        (kode, tanggal, gudang, customer, sales, kode_order_jual, valuta, kurs, keterangan, 
         subtotal, diskon_nominal, dpp, ppn_nominal, total, total_idr, dibuat_oleh) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, gudang, customer, sales || '', kode_order_jual || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0, (grandTotal || 0) * (kurs || 1), 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tddeliveryorder 
          (nomorthdeliveryorder, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.kode_barang || '', item.nama_barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Delivery Order", headerId, "CREATE", user || "Admin", `Membuat Delivery Order ${generatedKode} untuk ${customer}`);
    return NextResponse.json({ success: true, message: "Delivery Order berhasil disimpan", data: { id: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Delivery Order Error:", error);
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
    
    if (action === 'approve') {
       query = `UPDATE thdeliveryorder SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE kode = ?`;
       params.push(user || 'Admin', id);
       const headers: any = await executeQuery(`SELECT nomor FROM thdeliveryorder WHERE kode = ?`, [id]);
       const headerId = headers[0]?.nomor;
       if (headerId) {
         await addLogHistory("Delivery Order", headerId, "APPROVE", user || "Admin", `Menyetujui Delivery Order ${id}`);
       }
    } else if (action === 'reject' || action === 'delete') {
        const headers: any = await executeQuery(`SELECT nomor FROM thdeliveryorder WHERE kode = ?`, [id]);
        const headerId = headers[0]?.nomor;
        query = `UPDATE thdeliveryorder SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE kode = ?`;
        params.push(user || 'Admin', id);
        if (headerId) {
          await addLogHistory("Delivery Order", headerId, "DELETE", user || "Admin", `Membatalkan/Menghapus Delivery Order ${id}`);
        }
     } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    const result: any = await executeQuery(query, params);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Berhasil ${action} data` });
  } catch (error: any) {
    console.error("PATCH Delivery Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
