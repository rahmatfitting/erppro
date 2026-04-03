import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thjualorder WHERE kode = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);
    
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Order Jual tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details
    const detailsQuery = `SELECT * FROM tdjualorder WHERE nomorthjualorder = ?`;
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
    console.error("GET Order Jual by ID Error:", error);
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
      tanggal, customer, sales, nomor_po_customer, valuta, kurs, keterangan, 
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items, user 
    } = body;

    if (!tanggal || !customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute(
      `SELECT nomor, tanggal, customer, sales, nomor_po_customer, valuta, kurs, keterangan, 
              subtotal, diskon_nominal, dpp, ppn_nominal, total 
       FROM thjualorder WHERE kode = ?`, [id]
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
      customer: 'Customer',
      sales: 'Sales',
      nomor_po_customer: 'No. PO Customer',
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
      tanggal, customer, sales: sales || '', nomor_po_customer: nomor_po_customer || '',
      valuta: valuta || 'IDR', kurs: kurs || 1, keterangan: keterangan || '',
      subtotal: subtotal || 0, diskon_nominal: diskonNominal || 0, dpp: dpp || 0, 
      ppn_nominal: ppnNominal || 0, total: grandTotal || 0
    };
    const logDetails = getChanges(oldHeader, newData, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thjualorder 
        SET tanggal = ?, customer = ?, sales = ?, nomor_po_customer = ?, valuta = ?, kurs = ?, keterangan = ?, 
            subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_nominal = ?, total = ?, total_idr = ?
        WHERE nomor = ?`,
      [
        tanggal, customer, sales || '', nomor_po_customer || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0, grandTotal || 0, (grandTotal || 0) * (kurs || 1), headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdjualorder WHERE nomorthjualorder = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdjualorder 
          (nomorthjualorder, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.kode_barang || '', item.nama_barang || item.barang, item.satuan, parseFloat(item.jumlah || 0), 
           parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0), 
           parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Order Penjualan", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Order Jual berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Order Jual Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
