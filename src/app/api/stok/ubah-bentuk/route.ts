import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, 
        (SELECT COUNT(*) FROM tdubahbentuk d WHERE d.nomorthubahbentuk = h.nomor) as itemsCount
      FROM thubahbentuk h
      WHERE h.status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.nama_barang_tujuan LIKE ? OR h.gudang_nama LIKE ?)`;
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

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      itemsCount: Number(h.itemsCount || 0)
    }));
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Transformasi Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, 
      nomormhgudang, 
      gudang_nama, 
      nomormhbarang_tujuan, 
      kode_barang_tujuan,
      nama_barang_tujuan,
      jumlah_tujuan, 
      keterangan, 
      items,
      user 
    } = body;

    // Validate
    if (!tanggal || !nomormhgudang || !nomormhbarang_tujuan || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `TF-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thubahbentuk WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
      `INSERT INTO thubahbentuk (
        kode, tanggal, nomormhgudang, gudang_nama, 
        nomormhbarang_tujuan, kode_barang_tujuan, nama_barang_tujuan, jumlah_tujuan,
        keterangan, dibuat_oleh
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, nomormhgudang, gudang_nama, 
        nomormhbarang_tujuan, kode_barang_tujuan, nama_barang_tujuan, parseFloat(jumlah_tujuan || 1),
        keterangan || '', user || 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details (Components)
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdubahbentuk 
          (nomorthubahbentuk, nomormhbarang_asal, kode_barang_asal, nama_barang_asal, jumlah, nomormhsatuan, satuan, keterangan) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, 
           item.nomormhbarang_asal, 
           item.kode_barang_asal || '', 
           item.nama_barang_asal, 
           parseFloat(item.jumlah || 0), 
           item.nomormhsatuan, 
           item.satuan, 
           item.keterangan || ''
         ]
       );
    }

    // 3. Log History
    await addLogHistory("Transformasi Barang", headerId, "CREATE", user || "Admin", `Membuat Transformasi ${generatedKode} Menjadi ${nama_barang_tujuan}`);

    await connection.commit();
    await sendNotification('Transformasi Barang', `Transformasi Baru: ${generatedKode}`, `Ada pengerjaan transformasi barang baru. Hasil: ${nama_barang_tujuan}`, generatedKode);

    return NextResponse.json({ 
      success: true, 
      message: "Transformasi Barang berhasil disimpan", 
      data: { id: headerId, kode: generatedKode } 
    });

  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: "Kode transaksi sudah digunakan" }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
