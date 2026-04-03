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
    const gudang = searchParams.get('gudang') || '';
    const filter = searchParams.get('filter');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.* 
      FROM thbelipenerimaan h
      WHERE 1=1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (h.kode LIKE ? OR h.supplier LIKE ? OR h.nomor_surat_jalan LIKE ?)`;
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
    
    if (gudang) {
      query += ` AND h.gudang = ?`;
      params.push(gudang);
    }

    if (filter === 'uninvoiced') {
      // Show ONLY approved PBs that do NOT have a corresponding Nota Beli (tdbelinota)
      query += ` AND h.status_disetujui = 1 AND h.nomor NOT IN (
        SELECT DISTINCT n.nomorthbelipenerimaan FROM tdbelinota n 
        JOIN thbelinota hn ON n.nomorthbelinota = hn.nomor
        WHERE hn.status_aktif = 1 AND n.nomorthbelipenerimaan IS NOT NULL
      )`;
    }

    query += ` ORDER BY h.tanggal DESC, h.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [data]: any = await pool.query(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Penerimaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      tanggal, supplier, nomormhsupplier, suratJalan, tglSuratJalan, keterangan, items,
      nomorthbeliorder, kode_po, nomormhgudang, gudang
    } = body;

    // Validate
    if (!tanggal || !supplier || !suratJalan || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // AUTO COUNTER
    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `PB-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thbelipenerimaan WHERE kode LIKE ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
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
      `INSERT INTO thbelipenerimaan 
        (kode, tanggal, supplier, nomormhsupplier, nomor_surat_jalan, tanggal_surat_jalan, keterangan, nomorthbeliorder, kode_po, nomormhgudang, gudang, dibuat_oleh) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedKode, tanggal, supplier || '', nomormhsupplier, suratJalan || '', tglSuratJalan || tanggal, keterangan || '', 
        nomorthbeliorder || null, kode_po || '', nomormhgudang || null, gudang || '', 'Admin'
      ]
    );

    const headerId = headerResult.insertId;

    // 2. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbelipenerimaan 
          (nomorthbelipenerimaan, nomorthbeliorder, nomortdbeliorder, nomormhbarang, nomormhsatuan, kode_po, kode_barang, nama_barang, satuan, jumlah, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomorthbeliorder || null, item.nomortdbeliorder || null, item.nomormhbarang || null, item.nomormhsatuan || null,
           item.kode_po || '', item.kode_barang || '', item.nama_barang, item.satuan, 
           parseFloat(item.jumlah || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Penerimaan Barang", headerId, "CREATE", body.user || "Admin", `Membuat Penerimaan Barang ${generatedKode}`);
    await sendNotification('Penerimaan Barang', `GR Baru: ${generatedKode}`, `Ada penerimaan barang baru yang perlu diverifikasi.`, generatedKode);
    return NextResponse.json({ success: true, message: "Penerimaan Barang berhasil disimpan", data: { nomor: headerId, kode: generatedKode } });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Penerimaan Error:", error);
    
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
    
    const [header]: any = await pool.query(
      `SELECT nomor, kode, tanggal, supplier, nomormhsupplier, keterangan, nomorthbeliorder, kode_po, nomormhgudang 
       FROM thbelipenerimaan WHERE nomor = ?`, [id]
    );
    if (header.length === 0) return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    const { nomor, kode, tanggal, supplier, nomormhsupplier, keterangan, nomorthbeliorder, kode_po, nomormhgudang } = header[0];

    const session = await getSession();
    if (!session || !session.active_cabang) {
       return NextResponse.json({ success: false, error: "Sesi tidak valid atau cabang belum dipilih" }, { status: 401 });
    }

    if (action === 'approve') {
       // Requirement 6: Check PO constraints
       if (nomorthbeliorder) {
         const [po]: any = await pool.query(
           `SELECT status_aktif, status_disetujui, tanggal FROM thbeliorder WHERE nomor = ?`,
           [nomorthbeliorder]
         );
         if (po.length > 0) {
           const p = po[0];
           if (p.status_aktif === 0) return NextResponse.json({ success: false, error: "Order Beli sudah tidak aktif" }, { status: 400 });
           if (p.status_disetujui === 0) return NextResponse.json({ success: false, error: "Order Beli belum disetujui" }, { status: 400 });
           if (new Date(tanggal) < new Date(p.tanggal)) {
             return NextResponse.json({ 
               success: false, 
               error: `Tanggal Penerimaan (${tanggal}) tidak boleh lebih kecil dari Tanggal Order Beli (${p.tanggal})` 
             }, { status: 400 });
           }
         }
       }

       const connection = await pool.getConnection();
       try {
         await connection.beginTransaction();

         // Update Status
         await connection.execute(
           `UPDATE thbelipenerimaan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
           [user || 'Admin', nomor]
         );

         // Requirement 5: Insert to rhlaporanstok
         const [details]: any = await connection.execute(`SELECT * FROM tdbelipenerimaan WHERE nomorthbelipenerimaan = ?`, [nomor]);
         for (const d of details) {
            // Fetch HPP from PO detail if available
            let hpp = 0;
            if (d.nomortdbeliorder) {
              const [poItem]: any = await connection.execute(`SELECT netto FROM tdbeliorder WHERE nomor = ?`, [d.nomortdbeliorder]);
              if (poItem.length > 0) hpp = poItem[0].netto || 0;
            }

            await connection.execute(
              `INSERT INTO rhlaporanstok (
                nomormhcabang, nomormhperusahaan, nomormhgudang, nomormhsupplier, nomormhbarang, 
                tanggal, jumlah, hpp, nomormhtransaksi, transaksi_nomor, transaksi_kode, keterangan, jenis
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                session.active_cabang, session.active_perusahaan, nomormhgudang || 0, nomormhsupplier || 0, d.nomormhbarang,
                tanggal, d.jumlah || 0, hpp, nomor, d.nomor, kode, `[${kode}] ${keterangan || ''} - ${d.nama_barang || ''}`, 'PB'
              ]
            );
         }

         await connection.commit();
         await addLogHistory("Penerimaan Barang", nomor, "APPROVE", user || "Admin", `Menyetujui Penerimaan ${kode}`);
         return NextResponse.json({ success: true, message: "Penerimaan Barang berhasil disetujui (Approve)" });
       } catch (e: any) {
         await connection.rollback();
         throw e;
       } finally {
         connection.release();
       }

    } else if (action === 'disapprove') {
       // Requirement 6: Check if already created Nota Beli
       const [existingNota]: any = await pool.query(
         `SELECT nomor FROM tdbelinota WHERE nomorthbelipenerimaan = ? LIMIT 1`,
         [nomor]
       );
       if (existingNota.length > 0) {
         return NextResponse.json({ success: false, error: "Tidak bisa batal approve, sudah dibuatkan Nota Beli" }, { status: 400 });
       }

       const connection = await pool.getConnection();
       try {
         await connection.beginTransaction();

         await connection.execute(
           `UPDATE thbelipenerimaan SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
           [nomor]
         );

         // Delete from rhlaporanstok
         await connection.execute(
           `DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ?`,
           [nomor, kode]
         );

         await connection.commit();
         await addLogHistory("Penerimaan Barang", nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Penerimaan ${kode}`);
         return NextResponse.json({ success: true, message: "Penerimaan Barang dibatalkan (Disapprove)" });
       } catch (e: any) {
         await connection.rollback();
         throw e;
       } finally {
         connection.release();
       }
    } else if (action === 'reject' || action === 'delete') {
       const query = `UPDATE thbelipenerimaan SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`;
       const params = [user || 'Admin', nomor];
       await pool.query(query, params);
       await addLogHistory("Penerimaan Barang", nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus Penerimaan ${kode}`);
       return NextResponse.json({ success: true, message: "Penerimaan Barang berhasil dihapus" });
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("PATCH Penerimaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
