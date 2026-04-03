import { NextResponse } from "next/server";
import { executeQuery, pool } from "@/lib/db";
import { addLogHistory } from '@/lib/history';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: any
) {
  try {
    const params = await context.params;
    const id = params.id;

    // 1. Fetch Header
    const [headers]: any = await pool.query(
      `SELECT h.*, v.nama as valuta_nama 
       FROM thbelinota h 
       LEFT JOIN mhvaluta v ON h.nomormhvaluta = v.nomor 
       WHERE h.nomor = ? AND h.jenis = 'FBL'`,
      [id]
    );

    if (headers.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const header = headers[0];

    // 2. Fetch Details
    const [details]: any = await pool.query(
      `SELECT d.*, b.nama as barang_nama, b.kode as master_kode, s.nama as satuan_nama 
       FROM tdbelinota d 
       LEFT JOIN mhbarang b ON d.nomormhbarang = b.nomor 
       LEFT JOIN mhsatuan s ON d.nomormhsatuan = s.nomor 
       WHERE d.nomorthbelinota = ?`,
      [id]
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
        items: details.map((d: any) => ({
          ...d,
          jumlah: Number(d.jumlah || 0),
          harga: Number(d.harga || 0),
          diskon_prosentase: Number(d.diskon_prosentase || 0),
          diskon_nominal: Number(d.diskon_nominal || 0),
          netto: Number(d.netto || 0),
          subtotal: Number(d.subtotal || 0)
        }))
      }
    });

  } catch (error: any) {
    console.error("GET Nota Beli Langsung Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: any
) {
  const connection = await pool.getConnection();
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { 
      tanggal, supplier, nomormhsupplier, noFaktur, jatuhTempo, keterangan, 
      valuta, nomormhvaluta, kurs, subtotal, diskonNominal, dpp, ppnNominal, ppnPersen, grandTotal,
      items, user
    } = body;

    // Validate
    if (!tanggal || !supplier || !valuta || items?.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 0. Check Status
    const [headerRows]: any = await connection.execute(
      `SELECT status_disetujui, kode FROM thbelinota WHERE nomor = ? FOR UPDATE`, [id]
    );
    if (headerRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (headerRows[0].status_disetujui === 1) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: "Nota yang sudah disetujui tidak dapat diedit" }, { status: 400 });
    }

    // 1. Update Header
    await connection.execute(
      `UPDATE thbelinota SET 
        tanggal = ?, supplier = ?, nomormhsupplier = ?, nomor_faktur_supplier = ?, jatuh_tempo = ?, keterangan = ?, 
        subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_prosentase = ?, ppn_nominal = ?, total = ?, total_idr = ?, 
        valuta = ?, nomormhvaluta = ?, kurs = ?
       WHERE nomor = ?`,
      [
        tanggal, supplier, nomormhsupplier || 0, noFaktur || '', jatuhTempo || tanggal, keterangan || '',
        parseFloat(subtotal || 0), parseFloat(diskonNominal || 0), parseFloat(dpp || 0), 
        parseFloat(ppnPersen || 0), parseFloat(ppnNominal || 0), parseFloat(grandTotal || 0), parseFloat(grandTotal || 0) * parseFloat(kurs || 1),
        valuta, nomormhvaluta || 0, parseFloat(kurs || 1), id
      ]
    );

    // 2. Delete Details
    await connection.execute(`DELETE FROM tdbelinota WHERE nomorthbelinota = ?`, [id]);

    // 3. Insert Details
    for (const item of items) {
       await connection.execute(
         `INSERT INTO tdbelinota 
          (nomorthbelinota, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           id, item.nomormhbarang || null, item.nomormhsatuan || null,
           item.kode_barang || '', item.nama_barang, item.satuan, 
           parseFloat(item.jumlah || 0), parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), 
           parseFloat(item.diskon_nominal || 0), parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
         ]
       );
    }

    await connection.commit();
    await addLogHistory("Nota Beli Langsung", id, "EDIT", user || "Admin", `Mengubah Nota Beli Langsung ${headerRows[0].kode}`);
    return NextResponse.json({ success: true, message: "Nota Beli Langsung berhasil diupdate" });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("PUT Nota Beli Langsung Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
