import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thsuratjalan WHERE kode = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);
    
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Surat Jalan tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details
    const detailsQuery = `SELECT * FROM tdsuratjalan WHERE nomorthsuratjalan = ?`;
    const detailsData: any = await executeQuery(detailsQuery, [header.nomor]);

    return NextResponse.json({ 
        success: true, 
        data: {
            ...header,
            items: detailsData.map((d: any) => ({
                id: d.nomor,
                barang: d.nama_barang,
                kode_barang: d.kode_barang,
                satuan: d.satuan,
                jumlah: d.jumlah,
                harga: d.harga,
                diskon_prosentase: d.diskon_prosentase,
                diskon_nominal: d.diskon_nominal,
                netto: d.netto,
                subtotal: d.subtotal,
                keterangan: d.keterangan
            }))
        } 
    });
  } catch (error: any) {
    console.error("GET Surat Jalan by ID Error:", error);
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
      tanggal, customer, sales, gudang, nomor_kendaraan, sopir, kode_order_jual, kode_delivery_order, valuta, kurs, keterangan, 
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items, user 
    } = body;

    if (!tanggal || !customer || !gudang || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute(
      `SELECT nomor, tanggal, gudang, nomor_kendaraan, sopir, customer, sales, 
              kode_order_jual, kode_delivery_order, valuta, kurs, keterangan, 
              subtotal, diskon_nominal, dpp, ppn_nominal, total 
       FROM thsuratjalan WHERE kode = ?`, [id]
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
      gudang: 'Gudang',
      nomor_kendaraan: 'No. Kendaraan',
      sopir: 'Sopir',
      customer: 'Customer',
      sales: 'Sales',
      kode_order_jual: 'No. Order Jual',
      kode_delivery_order: 'No. Delivery Order',
      valuta: 'Valuta',
      kurs: 'Kurs',
      keterangan: 'Keterangan',
      subtotal: 'Subtotal',
      diskon_nominal: 'Diskon Nominal',
      dpp: 'DPP',
      ppn_nominal: 'PPN',
      total: 'Total'
    };
    const newData = {
      tanggal, gudang, nomor_kendaraan: nomor_kendaraan || '', sopir: sopir || '', 
      customer, sales: sales || '', kode_order_jual: kode_order_jual || '', 
      kode_delivery_order: kode_delivery_order || '', valuta: valuta || 'IDR', 
      kurs: kurs || 1, keterangan: keterangan || '', subtotal: subtotal || 0, 
      diskon_nominal: diskonNominal || 0, dpp: dpp || 0, 
      ppn_nominal: ppnNominal || 0, total: grandTotal || 0
    };
    const logDetails = getChanges(oldHeader, newData, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thsuratjalan 
        SET tanggal = ?, gudang = ?, nomor_kendaraan = ?, sopir = ?, customer = ?, sales = ?, kode_order_jual = ?, kode_delivery_order = ?, valuta = ?, kurs = ?, keterangan = ?, 
            subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_nominal = ?, total = ?, total_idr = ?
        WHERE nomor = ?`,
      [
        tanggal, gudang, nomor_kendaraan || '', sopir || '', customer, sales || '', kode_order_jual || '', kode_delivery_order || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0, (grandTotal || 0) * (kurs || 1), headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdsuratjalan WHERE nomorthsuratjalan = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdsuratjalan 
          (nomorthsuratjalan, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.kode_barang || '', item.nama_barang || item.barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Surat Jalan", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Surat Jalan berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Surat Jalan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
