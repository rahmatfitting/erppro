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
    const divisi = searchParams.get('divisi') || '';
    
    const filter = searchParams.get('filter') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Sesi tidak valid atau cabang belum dipilih" }, { status: 401 });
    }

    let query = `
      SELECT h.*, 
        (SELECT COUNT(*) FROM tdbelipermintaan d WHERE d.nomorthbelipermintaan = h.nomor) as itemsCount
      FROM thbelipermintaan h
      WHERE h.nomormhcabang = ? AND h.nomormhperusahaan = ? AND h.status_aktif = 1
    `;
    const params: any[] = [session.active_cabang, session.active_perusahaan];

    if (filter === 'remaining') {
      query += ` AND h.status_disetujui = 1 AND EXISTS (
        SELECT 1 FROM tdbelipermintaan td
        LEFT JOIN (
          SELECT nomortdbelipermintaan, SUM(jumlah) as total_ordered 
          FROM tdbeliorder tdpo
          JOIN thbeliorder thpo ON tdpo.nomorthbeliorder = thpo.nomor
          WHERE thpo.status_aktif = 1
          GROUP BY nomortdbelipermintaan
        ) ord ON td.nomor = ord.nomortdbelipermintaan
        WHERE td.nomorthbelipermintaan = h.nomor
        AND td.jumlah > IFNULL(ord.total_ordered, 0)
      )`;
    }

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.divisi LIKE ?)`;
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

    if (divisi) {
      query += ` AND h.divisi = ?`;
      params.push(divisi);
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Permintaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { tanggal, divisi, keterangan, items } = body;

    const session = await getSession();
    if (!session || !session.active_cabang) {
      return NextResponse.json({ success: false, error: "Sesi tidak valid atau cabang belum dipilih" }, { status: 401 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `PR-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbelipermintaan WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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

    const finalKeterangan = divisi ? `[Divisi: ${divisi}] ${keterangan || ''}` : keterangan;

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thbelipermintaan (kode, tanggal, keterangan, dibuat_oleh, nomormhperusahaan, nomormhcabang) VALUES (?, ?, ?, ?, ?, ?)`,
      [generatedKode, tanggal, finalKeterangan, session.nama || 'Admin', session.active_perusahaan, session.active_cabang]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbelipermintaan 
          (nomorthbelipermintaan, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [headerId, item.nomormhbarang || null, item.nomormhsatuan || null, item.kode_barang || '', item.nama_barang || item.barang, item.satuan, parseFloat(item.jumlah), item.keterangan || '', 'Admin']
       );
    }

    await connection.commit();
    await addLogHistory("Permintaan Pembelian", headerId, "CREATE", body.user || "Admin", `Membuat Permintaan Pembelian ${generatedKode}`);
    await sendNotification('Permintaan Pembelian', `PR Baru: ${generatedKode}`, `Ada permintaan pembelian baru yang perlu disetujui. Divisi: ${divisi || '-'}`, generatedKode);
    return NextResponse.json({ success: true, message: "Permintaan Pembelian berhasil disimpan", data: { nomor: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Permintaan Error:", error);
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: "Kode transaksi sudah digunakan" }, { status: 400 });
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

    const header: any = await executeQuery(`SELECT nomor, kode FROM thbelipermintaan WHERE kode = ?`, [id]);
    if (header.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    const { nomor, kode } = header[0];

    let query = "";
    const params: any[] = [];
    
    if (action === 'approve') {
       query = `UPDATE thbelipermintaan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`;
       params.push(user || 'Admin', nomor);
       await addLogHistory("Permintaan Pembelian", nomor, "APPROVE", user || "Admin", `Menyetujui Permintaan ${kode}`);
    } else if (action === 'disapprove') {
       // Requirement 4: Check if already created Order Beli
       const existingPO: any = await executeQuery(
         `SELECT nomor FROM thbeliorder WHERE nomorthbelipermintaan = ? AND status_aktif = 1 LIMIT 1`,
         [nomor]
       );
       if (existingPO.length > 0) {
         return NextResponse.json({ success: false, error: "Tidak bisa batal approve, PR sudah ditarik ke Order Beli" }, { status: 400 });
       }

       query = `UPDATE thbelipermintaan SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`;
       params.push(nomor);
       await addLogHistory("Permintaan Pembelian", nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Permintaan ${kode}`);
    } else if (action === 'reject' || action === 'delete') {
       query = `UPDATE thbelipermintaan SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`;
       params.push(user || 'Admin', nomor);
       await addLogHistory("Permintaan Pembelian", nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Permintaan ${kode}`);
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    await executeQuery(query, params);
    return NextResponse.json({ success: true, message: `Berhasil ${action} data` });
  } catch (error: any) {
    console.error("PATCH Permintaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
