import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const [headerRows]: any = await pool.query(
      `SELECT * FROM thbeliretur WHERE nomor = ?`, [id]
    );
    if (headerRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Retur Beli tidak ditemukan' }, { status: 404 });
    }
    const header = headerRows[0];
    const [detailsData]: any = await pool.query(
      `SELECT d.*, n.kode as kode_nota 
       FROM tdbeliretur d
       LEFT JOIN thbelinota n ON d.nomorthbelinota = n.nomor
       WHERE d.nomorthbeliretur = ? AND d.status_aktif = 1 ORDER BY d.nomor`,
      [header.nomor]
    );
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
                nomorthbelinota: d.nomorthbelinota,
                nomortdbelinota: d.nomortdbelinota,
                nomormhbarang: d.nomormhbarang,
                nomormhsatuan: d.nomormhsatuan,
                kode_nota: d.kode_nota || '',
                kode_barang: d.kode_barang || '',
                barang: d.nama_barang,
                satuan: d.satuan,
                jumlah: Number(d.jumlah || 0),
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
      tanggal, supplier, nomormhsupplier, gudang, nomormhgudang, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnPersen, ppnNominal, grandTotal, items 
    } = body;

    await connection.beginTransaction();

    // Update Header
    await connection.execute(
      `UPDATE thbeliretur SET 
       tanggal = ?, nomormhsupplier = ?, supplier = ?, nomormhgudang = ?, gudang = ?, keterangan = ?, valuta = ?, nomormhvaluta = ?, kurs = ?,
       subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_prosentase = ?, ppn_nominal = ?, total = ?, total_idr = ?, 
       diubah_oleh = 'Admin', diubah_pada = NOW()
       WHERE nomor = ?`,
      [
        tanggal || null, 
        nomormhsupplier || 0, 
        supplier || '', 
        nomormhgudang || 0,
        gudang || '',
        keterangan || '', 
        valuta || 'IDR', 
        nomormhvaluta || 0,
        parseFloat(kurs || 1),
        parseFloat(subtotal || 0), 
        parseFloat(diskonNominal || 0), 
        parseFloat(dpp || 0), 
        parseFloat(ppnPersen || 0),
        parseFloat(ppnNominal || 0),
        parseFloat(grandTotal || 0), 
        parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        id
      ]
    );

    // Delete old details
    await connection.execute(`DELETE FROM tdbeliretur WHERE nomorthbeliretur = ?`, [id]);

    // Insert new details
    for (const item of items) {
      await connection.execute(
        `INSERT INTO tdbeliretur (nomorthbeliretur, nomorthbelinota, nomortdbelinota, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, harga,
         diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh, dibuat_pada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NOW())`,
        [
          id, 
          item.nomorthbelinota || null, 
          item.nomortdbelinota || null, 
          item.nomormhbarang || 0, 
          item.nomormhsatuan || 0,
          item.kode_barang || '', 
          item.nama_barang || item.barang || '', 
          item.satuan || '',
          parseFloat(item.jumlah || 0), 
          parseFloat(item.harga || 0),
          parseFloat(item.diskon_prosentase || 0), 
          parseFloat(item.diskon_nominal || 0),
          parseFloat(item.netto || 0), 
          parseFloat(item.subtotal || 0), 
          item.keterangan || ''
        ]
      );
    }

    await connection.commit();
    const { addLogHistory } = require('@/lib/history');
    await addLogHistory("Retur Pembelian", id, "EDIT", body.user || "Admin", `Mengubah Retur Pembelian ${body.kode || id}`);
    return NextResponse.json({ success: true, message: 'Retur Beli berhasil diupdate' });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
