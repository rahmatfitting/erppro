import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { getChanges } from '@/lib/audit';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get Header
    const headerQuery = `SELECT * FROM thbelipermintaan WHERE nomor = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);

    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Permintaan Pembelian tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Extract Divisi from keterangan if necessary based on existing logic
    let divisi = '';
    let keterangan = header.keterangan || '';
    const match = keterangan.match(/\[Divisi:\s*(.*?)\]\s*(.*)/);
    if (match) {
      divisi = match[1];
      keterangan = match[2];
    }

    // Get Details with remaining quantity
    const detailsQuery = `
      SELECT td.*, 
        td.jumlah - IFNULL(ord.total_ordered, 0) as jumlah_sisa
      FROM tdbelipermintaan td
      LEFT JOIN (
        SELECT nomortdbelipermintaan, SUM(jumlah) as total_ordered 
        FROM tdbeliorder tdpo
        JOIN thbeliorder thpo ON tdpo.nomorthbeliorder = thpo.nomor
        WHERE thpo.status_aktif = 1
        GROUP BY nomortdbelipermintaan
      ) ord ON td.nomor = ord.nomortdbelipermintaan
      WHERE td.nomorthbelipermintaan = ?
    `;
    const detailsData: any = await executeQuery(detailsQuery, [header.nomor]);

    return NextResponse.json({
      success: true,
      data: {
        ...header,
        divisi_parsed: divisi,
        keterangan_parsed: keterangan,
        items: detailsData.map((d: any) => ({
          id: d.nomor,
          nomormhbarang: d.nomormhbarang,
          nomormhsatuan: d.nomormhsatuan,
          barang: d.nama_barang,
          kode_barang: d.kode_barang,
          satuan: d.satuan,
          jumlah: d.jumlah,
          jumlah_sisa: d.jumlah_sisa,
          keterangan: d.keterangan
        }))
      }
    });
  } catch (error: any) {
    console.error("GET Permintaan by ID Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  const connection = await pool.getConnection();
  try {
    const params = await context.params;
    const id = params.id; // this is the 'nomor'
    const body = await request.json();
    const { tanggal, divisi, keterangan, items, user } = body;

    if (!tanggal || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Find header
    const [headerRows]: any = await connection.execute('SELECT nomor, tanggal, keterangan FROM thbelipermintaan WHERE nomor = ?', [id]);
    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    const oldHeader = headerRows[0];
    const headerId = oldHeader.nomor;

    const finalKeterangan = divisi ? `[Divisi: ${divisi}] ${keterangan || ''}` : keterangan;

    // Prepare for diff
    const fieldLabels = {
      tanggal: 'Tanggal',
      keterangan: 'Keterangan'
    };
    const logDetails = getChanges(oldHeader, { tanggal, keterangan: finalKeterangan }, fieldLabels);

    // Update Header
    await connection.execute(
      `UPDATE thbelipermintaan SET tanggal = ?, keterangan = ? WHERE nomor = ?`,
      [tanggal, finalKeterangan, headerId]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM tdbelipermintaan WHERE nomorthbelipermintaan = ?`, [headerId]);

    // Insert new details
    for (const item of items) {
      await connection.execute(
        `INSERT INTO tdbelipermintaan 
          (nomorthbelipermintaan, nomormhbarang, nomormhsatuan, kode_barang, nama_barang, satuan, jumlah, keterangan, dibuat_oleh) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [headerId, item.nomormhbarang || null, item.nomormhsatuan || null, item.kode_barang || '', item.nama_barang || item.barang, item.satuan, parseFloat(item.jumlah), item.keterangan || '', 'Admin']
      );
    }

    await connection.commit();
    await addLogHistory("Permintaan Pembelian", headerId, "EDIT", user || "Admin", logDetails);
    return NextResponse.json({ success: true, message: "Permintaan Pembelian berhasil diupdate" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Permintaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();
    const { action, user } = body; // "approve" or "disapprove"

    if (action === 'approve') {
      const result: any = await executeQuery(
        `UPDATE thbelipermintaan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
        [user || 'Admin', id]
      );
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
      await addLogHistory("Permintaan Pembelian", id, "APPROVE", user || "Admin", `Menyetujui Permintaan ID ${id}`);
      return NextResponse.json({ success: true, message: "Permintaan Pembelian disetujui" });
    } else if (action === 'disapprove') {
       // Requirement 4: Check if already created Order Beli
       const existingPO: any = await executeQuery(
         `SELECT nomor FROM thbeliorder WHERE nomorthbelipermintaan = ? AND status_aktif = 1 LIMIT 1`,
         [id]
       );
       if (existingPO.length > 0) {
         return NextResponse.json({ success: false, error: "Tidak bisa batal approve, PR sudah ditarik ke Order Beli" }, { status: 400 });
       }

      const result: any = await executeQuery(
        `UPDATE thbelipermintaan SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
        [id]
      );
      if (result.affectedRows === 0) return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
      await addLogHistory("Permintaan Pembelian", id, "DISAPPROVE", user || "Admin", `Membatalkan Approval Permintaan ID ${id}`);
      return NextResponse.json({ success: true, message: "Permintaan Pembelian dibatalkan (Disapprove)" });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Permintaan Error:", error);
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
      `UPDATE thbelipermintaan SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
      [user, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    await addLogHistory("Permintaan Pembelian", id, "DELETE", user, `Membatalkan/Menghapus Permintaan ID ${id}`);
    return NextResponse.json({ success: true, message: "Permintaan Pembelian berhasil dibatalkan" });
  } catch (error: any) {
    console.error("DELETE Permintaan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
