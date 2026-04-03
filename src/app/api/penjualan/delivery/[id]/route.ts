import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thdeliveryorder WHERE kode = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);
    
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Delivery Order tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details
    const detailsQuery = `SELECT * FROM tddeliveryorder WHERE nomorthdeliveryorder = ?`;
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
    console.error("GET Delivery Order by ID Error:", error);
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
      tanggal, customer, sales, gudang, kode_order_jual, valuta, kurs, keterangan, 
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items, user 
    } = body;

    // Get Old Data for Logging
    const oldHeaderResult: any = await connection.execute('SELECT * FROM thdeliveryorder WHERE kode = ?', [id]);
    const oldData = oldHeaderResult[0][0];

    const fieldLabels = {
      tanggal: 'Tanggal',
      gudang: 'Gudang',
      customer: 'Customer',
      sales: 'Sales',
      kode_order_jual: 'Order Jual',
      valuta: 'Valuta',
      kurs: 'Kurs',
      keterangan: 'Keterangan',
      subtotal: 'Subtotal',
      diskon_nominal: 'Diskon',
      dpp: 'DPP',
      ppn_nominal: 'PPN',
      total: 'Total'
    };

    const newData = {
      ...body,
      diskon_nominal: diskonNominal,
      ppn_nominal: ppnNominal,
      total: grandTotal
    };

    const logDetails = getChanges(oldData, newData, fieldLabels);

    if (!tanggal || !customer || !gudang || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute('SELECT nomor FROM thdeliveryorder WHERE kode = ?', [id]);
    if (headerRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    const headerId = headerRows[0].nomor;

    // Update Header
    await connection.execute(
      `UPDATE thdeliveryorder 
        SET tanggal = ?, gudang = ?, customer = ?, sales = ?, kode_order_jual = ?, valuta = ?, kurs = ?, keterangan = ?, 
            subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_nominal = ?, total = ?, total_idr = ?
        WHERE nomor = ?`,
      [
        tanggal, gudang, customer, sales || '', kode_order_jual || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0, (grandTotal || 0) * (kurs || 1), headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tddeliveryorder WHERE nomorthdeliveryorder = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tddeliveryorder 
          (nomorthdeliveryorder, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.kode_barang || '', item.nama_barang || item.barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    if (logDetails) {
      await addLogHistory("Delivery Order", headerId, "EDIT", user || "Admin", logDetails);
    }
    return NextResponse.json({ success: true, message: "Delivery Order berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Delivery Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
