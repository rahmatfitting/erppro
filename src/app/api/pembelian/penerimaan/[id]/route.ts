import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thbelipenerimaan WHERE nomor = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);
    
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Penerimaan Barang tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details with prices from PO
    const detailsQuery = `
      SELECT d.*, b.kode as master_kode, po.harga, po.diskon_prosentase, po.diskon_nominal
      FROM tdbelipenerimaan d
      LEFT JOIN mhbarang b ON d.nomormhbarang = b.nomor
      LEFT JOIN tdbeliorder po ON d.nomortdbeliorder = po.nomor
      WHERE d.nomorthbelipenerimaan = ?
    `;
    const detailsData: any = await executeQuery(detailsQuery, [header.nomor]);

    return NextResponse.json({ 
        success: true, 
        data: {
            ...header,
            items: detailsData.map((d: any) => ({
                id: d.nomor,
                nomorthbeliorder: d.nomorthbeliorder,
                nomortdbeliorder: d.nomortdbeliorder,
                nomormhbarang: d.nomormhbarang,
                nomormhsatuan: d.nomormhsatuan,
                kodeOrderBeli: d.kode_po || '',
                kode_barang: d.kode_barang || d.master_kode || '',
                barang: d.nama_barang,
                satuan: d.satuan,
                jumlahDiterima: d.jumlah,
                jumlahDipesan: d.jumlah_po || d.jumlah,
                harga: d.harga || 0,
                diskon_prosentase: d.diskon_prosentase || 0,
                diskon_nominal: d.diskon_nominal || 0,
                keterangan: d.keterangan || ''
            }))
        } 
    });
  } catch (error: any) {
    console.error("GET Penerimaan by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  const connection = await pool.getConnection();
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { 
      tanggal, supplier, nomormhsupplier, suratJalan, tglSuratJalan, keterangan, items, user,
      nomorthbeliorder, kode_po, nomormhgudang, gudang
    } = body;

    if (!tanggal || !supplier || !suratJalan || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute(
      `SELECT nomor, tanggal, supplier, nomormhsupplier, nomor_surat_jalan, tanggal_surat_jalan, keterangan, nomorthbeliorder, kode_po, nomormhgudang, gudang 
       FROM thbelipenerimaan WHERE nomor = ?`, [id]
    );
    if (headerRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    const oldHeader = headerRows[0];
    const headerId = oldHeader.nomor;

    // Prepare for diff
    const fieldLabels = {
      tanggal: 'Tanggal',
      supplier: 'Supplier',
      nomor_surat_jalan: 'No. Surat Jalan',
      tanggal_surat_jalan: 'Tgl Surat Jalan',
      keterangan: 'Keterangan',
      nomorthbeliorder: 'ID PO',
      kode_po: 'Kode PO',
      nomormhgudang: 'ID Gudang',
      gudang: 'Gudang'
    };
    const newData = {
      tanggal, supplier, 
      nomor_surat_jalan: suratJalan, 
      tanggal_surat_jalan: tglSuratJalan || tanggal, 
      keterangan: keterangan || '',
      nomorthbeliorder: nomorthbeliorder || null,
      kode_po: kode_po || '',
      nomormhgudang: nomormhgudang || null,
      gudang: gudang || ''
    };
    const logDetails = getChanges(oldHeader, newData, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thbelipenerimaan 
       SET tanggal = ?, supplier = ?, nomormhsupplier = ?, nomor_surat_jalan = ?, tanggal_surat_jalan = ?, keterangan = ?, nomorthbeliorder = ?, kode_po = ?, nomormhgudang = ?, gudang = ?
       WHERE nomor = ?`,
      [
        tanggal, supplier, nomormhsupplier || null, suratJalan, tglSuratJalan || tanggal, keterangan || '', 
        nomorthbeliorder || null, kode_po || '', nomormhgudang || null, gudang || '', headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdbelipenerimaan WHERE nomorthbelipenerimaan = ?`, [headerId]);

     // Insert new details
     for (const item of items) {
        await connection.execute(
          `INSERT INTO tdbelipenerimaan 
           (nomorthbelipenerimaan, nomorthbeliorder, nomortdbeliorder, nomormhbarang, nomormhsatuan, kode_po, kode_barang, nama_barang, satuan, jumlah, keterangan, dibuat_oleh) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            headerId, item.nomorthbeliorder || null, item.nomortdbeliorder || null, item.nomormhbarang || null, item.nomormhsatuan || null,
            item.kode_po || '', item.kode_barang || '', item.nama_barang, item.satuan, 
            parseFloat(item.jumlahDiterima || 0), item.keterangan || '', 'Admin'
          ]
        );
     }

    await connection.commit();
    await addLogHistory("Penerimaan Barang", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Penerimaan Barang berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Penerimaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
