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
    const nomormhgudang = searchParams.get('nomormhgudang');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, 
        (SELECT COUNT(*) FROM tdstokpenyesuaian d WHERE d.nomorthstokpenyesuaian = h.nomor) as itemsCount
      FROM thstokpenyesuaian h
      WHERE h.status_aktif = 1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.keterangan LIKE ? OR h.penyesuaian_nama LIKE ?)`;
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

    if (nomormhgudang) {
      query += ` AND h.nomormhgudang = ?`;
      params.push(nomormhgudang);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Stok Opname Error:", error);
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
      nomormhpenyesuaian, 
      penyesuaian_nama, 
      keterangan, 
      items,
      user 
    } = body;

    // Validate
    if (!tanggal || !nomormhgudang || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `SO-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thstokpenyesuaian WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
      `INSERT INTO thstokpenyesuaian (
        kode, tanggal, nomormhgudang, gudang_nama, 
        nomormhpenyesuaian, penyesuaian_nama, keterangan, dibuat_oleh
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, nomormhgudang, gudang_nama, 
        nomormhpenyesuaian || null, penyesuaian_nama || null, keterangan || '', user || 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdstokpenyesuaian 
          (nomorthstokpenyesuaian, nomormhbarang, kode_barang, nama_barang, nomormhsatuan, satuan, tercatat, aktual, perubahan, keterangan) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, 
           item.nomormhbarang, 
           item.kode_barang || '', 
           item.nama_barang, 
           item.nomormhsatuan, 
           item.satuan, 
           parseFloat(item.tercatat || 0), 
           parseFloat(item.aktual || 0), 
           parseFloat(item.perubahan || 0), 
           item.keterangan || ''
         ]
       );
    }

    // 3. Log History
    await addLogHistory("Stok Opname", headerId, "CREATE", user || "Admin", `Membuat Stok Opname ${generatedKode}`);

    await connection.commit();
    
    // Notification
    await sendNotification(
      'Stok Opname', 
      `Stok Opname Baru: ${generatedKode}`, 
      `Ada transaksi stok opname baru yang perlu dikroscek. Gudang: ${gudang_nama}`, 
      generatedKode
    );

    return NextResponse.json({ 
      success: true, 
      message: "Stok Opname berhasil disimpan", 
      data: { id: headerId, kode: generatedKode } 
    });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Stok Opname Error:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode transaksi sudah digunakan" }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
