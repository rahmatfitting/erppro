import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thbelinota WHERE nomor = ?`;
    const [headerData]: any = await pool.query(headerQuery, [id]);
    
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Nota Beli tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details with Returned Quantity
    const detailsQuery = `
      SELECT d.*, COALESCE(r.total_retur, 0) as returned_jumlah
      FROM tdbelinota d
      LEFT JOIN (
        SELECT dr.nomortdbelinota, SUM(dr.jumlah) as total_retur
        FROM tdbeliretur dr
        JOIN thbeliretur hr ON dr.nomorthbeliretur = hr.nomor
        WHERE hr.status_aktif = 1
        GROUP BY dr.nomortdbelinota
      ) r ON d.nomor = r.nomortdbelinota
      WHERE d.nomorthbelinota = ?
    `;
    const [detailsData]: any = await pool.query(detailsQuery, [header.nomor]);

    return NextResponse.json({ 
        success: true, 
        data: {
            ...header,
            subtotal: Number(header.subtotal || 0),
            diskon_nominal: Number(header.diskon_nominal || 0),
            dpp: Number(header.dpp || 0),
            ppn_nominal: Number(header.ppn_nominal || 0),
            total: Number(header.total || 0),
            total_idr: Number(header.total_idr || 0),
            kurs: Number(header.kurs || 1),
            items: detailsData.map((d: any) => ({
                id: d.nomor,
                nomorthbelipenerimaan: d.nomorthbelipenerimaan,
                nomortdbelipenerimaan: d.nomortdbelipenerimaan,
                nomormhbarang: d.nomormhbarang,
                nomormhsatuan: d.nomormhsatuan,
                kode_pb: d.kode_pb || '',
                kode_barang: d.kode_barang || '',
                barang: d.nama_barang,
                satuan: d.satuan,
                jumlah: Number(d.jumlah || 0),
                returned_jumlah: Number(d.returned_jumlah || 0),
                remaining_jumlah: Number(d.jumlah || 0) - Number(d.returned_jumlah || 0),
                harga: Number(d.harga || 0),
                diskon_prosentase: Number(d.diskon_prosentase || 0),
                diskon_nominal: Number(d.diskon_nominal || 0),
                netto: Number(d.netto || 0),
                subtotal: Number(d.subtotal || 0),
                keterangan: d.keterangan
            }))
        } 
    });
  } catch (error: any) {
    console.error("GET Nota by ID Error:", error);
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
      tanggal, supplier, noFaktur, jatuhTempo, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnNominal, ppnPersen, grandTotal, items, user 
    } = body;

    if (!tanggal || !supplier || !noFaktur || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const session = await getSession();

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute(
      `SELECT nomor, tanggal, supplier, nomor_faktur_supplier, jatuh_tempo, keterangan, 
              subtotal, diskon_nominal, dpp, ppn_prosentase, ppn_nominal, total, valuta, nomormhvaluta, kurs 
       FROM thbelinota WHERE nomor = ?`, [id]
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
      nomor_faktur_supplier: 'No. Faktur Vendor',
      jatuh_tempo: 'Tgl Jatuh Tempo',
      keterangan: 'Keterangan',
      subtotal: 'Subtotal',
      diskon_nominal: 'Diskon Nominal',
      dpp: 'DPP',
      ppn_prosentase: 'PPN %',
      ppn_nominal: 'PPN Nominal',
      total: 'Total',
      valuta: 'Valuta',
      nomormhvaluta: 'Valuta ID',
      kurs: 'Kurs'
    };
    const newData = {
      tanggal, supplier, 
      nomor_faktur_supplier: noFaktur, 
      jatuh_tempo: jatuhTempo || tanggal, 
      keterangan: keterangan || '',
      subtotal: subtotal || 0,
      diskon_nominal: diskonNominal || 0,
      dpp: dpp || 0,
      ppn_prosentase: ppnPersen || 0,
      ppn_nominal: ppnNominal || 0,
      total: grandTotal || 0,
      valuta: valuta || 'IDR',
      nomormhvaluta: nomormhvaluta || 0,
      kurs: kurs || 1
    };
    const logDetails = getChanges(oldHeader, newData, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thbelinota 
       SET tanggal = ?, supplier = ?, nomor_faktur_supplier = ?, jatuh_tempo = ?, keterangan = ?, 
           subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_prosentase = ?, ppn_nominal = ?, 
           total = ?, total_idr = ?, valuta = ?, nomormhvaluta = ?, kurs = ?,
           nomormhcabang = ?, nomormhperusahaan = ?
       WHERE nomor = ?`,
      [
        tanggal, supplier, noFaktur, jatuhTempo || tanggal, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnPersen || 0, ppnNominal || 0, 
        grandTotal || 0, (grandTotal || 0) * (kurs || 1), valuta || 'IDR', nomormhvaluta || 0, kurs || 1, 
        session?.active_cabang || 0, session?.active_perusahaan || 0, headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdbelinota WHERE nomorthbelinota = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbelinota 
          (nomorthbelinota, nomorthbelipenerimaan, nomortdbelipenerimaan, nomormhbarang, nomormhsatuan, kode_pb, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           headerId, item.nomorthbelipenerimaan || null, item.nomortdbelipenerimaan || null, item.nomormhbarang || null, item.nomormhsatuan || null,
           item.kode_pb || '', item.kode_barang || '', item.nama_barang, item.satuan, 
           parseFloat(item.jumlah || 0), parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), 
           parseFloat(item.diskon_nominal || 0), parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Nota Pembelian", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Nota Beli berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Nota Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
