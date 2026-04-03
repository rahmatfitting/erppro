import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const filter = searchParams.get('filter') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    let query = `
      SELECT h.* 
      FROM thjualnota h
      WHERE h.jenis = 'FJ_EMAS'
      AND h.nomormhcabang = ?
      AND h.nomormhperusahaan = ?
    `;
    const params: any[] = [active_cabang, active_perusahaan];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.customer LIKE ? OR h.keterangan LIKE ?)`;
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

    if (filter === 'approved') {
      query += ` AND h.status_aktif = 1 AND h.status_disetujui = 1`;
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
    console.error("GET Nota Jual Emas Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, customer, nomormhcustomer, jatuhTempo, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnNominal, ppnPersen, grandTotal,
      items, user 
    } = body;

    if (!tanggal || !customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const session = await getSession();
    const userRole = session?.grup_nama || "Admin";

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `NJE-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thjualnota WHERE kode LIKE ? AND jenis = 'FJ_EMAS' ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
    const cbg = session?.active_cabang || 0;
    const prs = session?.active_perusahaan || 0;

    // 1. Insert Header
    const [headerResult]: any = await connection.execute(
      `INSERT INTO thjualnota 
        (kode, jenis, tanggal, nomormhcustomer, customer, jatuh_tempo, valuta, nomormhvaluta, kurs, keterangan, 
         subtotal, diskon_nominal, dpp, ppn_prosentase, ppn_nominal, total, total_idr, nomormhcabang, nomormhperusahaan, dibuat_oleh) 
       VALUES (?, 'FJ_EMAS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, nomormhcustomer || 0, customer, jatuhTempo || tanggal, 
        valuta || 'IDR', nomormhvaluta || 0, parseFloat(kurs || 1), keterangan || '',
        parseFloat(subtotal || 0), parseFloat(diskonNominal || 0), parseFloat(dpp || 0), 
        parseFloat(ppnPersen || 0), parseFloat(ppnNominal || 0), parseFloat(grandTotal || 0), 
        parseFloat(grandTotal || 0) * parseFloat(kurs || 1), cbg, prs, user || 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdjualnota 
          (nomorthjualnota, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomormhbarang || 0, item.nomormhsatuan || 0, item.kode_barang || '', item.nama_barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', user || 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Nota Jual Emas", headerId, "CREATE", user || "Admin", `Membuat Nota Jual Emas baru ${generatedKode}`);
    await sendNotification('Nota Penjualan', `Invoice (Emas) Baru: ${generatedKode}`, `Ada nota penjualan emas baru dari ${customer} yang perlu disetujui.`, generatedKode);
    return NextResponse.json({ success: true, message: "Nota Jual Emas berhasil disimpan", data: { id: headerId, kode: generatedKode } });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("POST Nota Jual Emas Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
