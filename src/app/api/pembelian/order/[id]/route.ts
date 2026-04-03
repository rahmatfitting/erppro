import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thbeliorder WHERE nomor = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);

    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Order Beli tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details
    const detailsQuery = `
      SELECT d.*, COALESCE(t.total_terima, 0) as jumlah_terima 
      FROM tdbeliorder d
      LEFT JOIN (
        SELECT td.nomortdbeliorder, SUM(td.jumlah) as total_terima
        FROM tdbelipenerimaan td
        JOIN thbelipenerimaan th ON td.nomorthbelipenerimaan = th.nomor
        WHERE (th.status_aktif = 1 OR th.status_aktif IS NULL)
        GROUP BY td.nomortdbeliorder
      ) t ON d.nomor = t.nomortdbeliorder
      WHERE d.nomorthbeliorder = ?
    `;
    const detailsData: any = await executeQuery(detailsQuery, [header.nomor]);

    return NextResponse.json({
      success: true,
      data: {
        ...header,
        items: detailsData.map((d: any) => ({
          id: d.nomor,
          nomorthbelipermintaan: d.nomorthbelipermintaan,
          nomortdbelipermintaan: d.nomortdbelipermintaan,
          nomormhbarang: d.nomormhbarang,
          nomormhsatuan: d.nomormhsatuan,
          kodePermintaan: d.kode_pr || '',
          kode_barang: d.kode_barang || '',
          barang: d.nama_barang,
          satuan: d.satuan,
          jumlah: d.jumlah,
          harga: d.harga,
          diskonPersen: d.diskon_prosentase,
          nominalDiskon: d.diskon_nominal,
          subtotal: d.subtotal,
          keterangan: d.keterangan,
          jumlah_terima: d.jumlah_terima,
          jumlah_sisa: d.jumlah - d.jumlah_terima
        }))
      }
    });
  } catch (error: any) {
    console.error("GET Order by ID Error:", error);
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
      tanggal, nomormhsupplier, supplier_nama, valuta, kurs, keterangan,
      subtotal, diskonNominal, dpp, ppnNominal, grandTotal, items, user
    } = body;

    if (!tanggal || !nomormhsupplier || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute(
      `SELECT nomor, tanggal, nomormhsupplier, supplier, valuta, kurs, keterangan, 
              subtotal, diskon_nominal, dpp, ppn_nominal, total 
       FROM thbeliorder WHERE nomor = ?`, [id]
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
      nomormhsupplier: 'ID Supplier',
      supplier: 'Supplier',
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
      tanggal, nomormhsupplier: nomormhsupplier, supplier: supplier_nama || '',
      valuta: valuta || 'IDR', kurs: kurs || 1, keterangan: keterangan || '',
      subtotal: subtotal || 0, diskon_nominal: diskonNominal || 0, dpp: dpp || 0,
      ppn_nominal: ppnNominal || 0, total: grandTotal || 0
    };
    const logDetails = getChanges(oldHeader, newData, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thbeliorder 
       SET tanggal = ?, nomormhsupplier = ?, supplier = ?, valuta = ?, kurs = ?, keterangan = ?, 
           subtotal = ?, diskon_nominal = ?, dpp = ?, ppn_nominal = ?, 
           total = ?, total_idr = ?
       WHERE nomor = ?`,
      [
        tanggal, nomormhsupplier, supplier_nama || '', valuta || 'IDR', kurs || 1, keterangan || '',
        subtotal || 0, diskonNominal || 0, dpp || 0, ppnNominal || 0,
        grandTotal || 0, (grandTotal || 0) * (kurs || 1), headerId
      ]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdbeliorder WHERE nomorthbeliorder = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
      await connection.execute(
        `INSERT INTO tdbeliorder 
          (nomorthbeliorder, nomorthbelipermintaan, nomortdbelipermintaan, nomormhbarang, nomormhsatuan, kode_pr, kode_barang, nama_barang, satuan, jumlah, harga, diskon_prosentase, diskon_nominal, netto, subtotal, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          headerId, item.nomorthbelipermintaan || null, item.nomortdbelipermintaan || null, item.nomormhbarang ?? null, item.nomormhsatuan ?? null,
          item.kode_pr || '', item.kode_barang || '', item.nama_barang, item.satuan, parseFloat(item.jumlah || 0),
          parseFloat(item.harga || 0), parseFloat(item.diskon_prosentase || 0), parseFloat(item.diskon_nominal || 0),
          parseFloat(item.netto || 0), parseFloat(item.subtotal || 0), item.keterangan || '', 'Admin'
        ]
      );
    }

    await connection.commit();
    await addLogHistory("Order Pembelian", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Order Beli berhasil diupdate" });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("PUT Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const { action, user } = await request.json();

    if (action === 'approve') {
       // Requirement 3: Check constraints
       const headerData: any = await executeQuery(
         `SELECT status_aktif, status_disetujui, tanggal, kode FROM thbeliorder WHERE nomor = ?`, 
         [id]
       );
       if (headerData.length === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
       const h = headerData[0];
       if (h.status_aktif === 0) return NextResponse.json({ success: false, error: "Transaksi sudah tidak aktif" }, { status: 400 });
       if (h.status_disetujui === 1) return NextResponse.json({ success: false, error: "Transaksi sudah diapprove sebelumnya" }, { status: 400 });

       // Date check: PO date >= PR date
       const prDates: any = await executeQuery(`
         SELECT hpr.tanggal, hpr.kode 
         FROM tdbeliorder d
         JOIN thbelipermintaan hpr ON d.nomorthbelipermintaan = hpr.nomor
         WHERE d.nomorthbeliorder = ? AND hpr.status_aktif = 1
       `, [id]);

       for (const pr of prDates) {
         if (new Date(h.tanggal) < new Date(pr.tanggal)) {
           return NextResponse.json({ 
             success: false, 
             error: `Tanggal Order Beli (${h.tanggal}) tidak boleh lebih kecil dari Tanggal Permintaan (${pr.kode}: ${pr.tanggal})` 
           }, { status: 400 });
         }
       }

      const result: any = await executeQuery(
        `UPDATE thbeliorder SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
      await addLogHistory("Order Pembelian", id, "APPROVE", user || "Admin", `Menyetujui Order ${h.kode}`);
      return NextResponse.json({ success: true, message: "Order Beli disetujui" });
    } else if (action === 'disapprove') {
       // Requirement 3: Check if already created Penerimaan Barang
       const existingPB: any = await executeQuery(
         `SELECT nomor FROM thbelipenerimaan WHERE nomorthbeliorder = ? AND status_aktif = 1 LIMIT 1`,
         [id]
       );
       if (existingPB.length > 0) {
         return NextResponse.json({ success: false, error: "Tidak bisa batal approve, PO sudah ditarik ke Penerimaan Barang" }, { status: 400 });
       }

      const result: any = await executeQuery(
        `UPDATE thbeliorder SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
        [id]
      );
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
      await addLogHistory("Order Pembelian", id, "DISAPPROVE", user || "Admin", `Membatalkan Approval Order ID ${id}`);
      return NextResponse.json({ success: true, message: "Order Beli dibatalkan (Disapprove)" });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json().catch(() => ({}));
    const user = body.user || 'Admin';

    const result: any = await executeQuery(
      `UPDATE thbeliorder SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
      [user, id]
    );

    if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });

    await addLogHistory("Order Pembelian", id, "DELETE", user, `Membatalkan/Menghapus Order ID ${id}`);
    return NextResponse.json({ success: true, message: "Order Beli berhasil dibatalkan" });
  } catch (error: any) {
    console.error("DELETE Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
