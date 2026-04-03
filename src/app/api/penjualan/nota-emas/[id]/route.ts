import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    
    const [headerRows]: any = await pool.query(`SELECT * FROM thjualnota WHERE nomor = ? AND jenis = 'FJ_EMAS'`, [id]);
    if (!headerRows || headerRows.length === 0) {
      return NextResponse.json({ success: false, error: "Nota Jual Emas tidak ditemukan" }, { status: 404 });
    }
    const h = headerRows[0];

    const [detailRows]: any = await pool.query(`SELECT * FROM tdjualnota WHERE nomorthjualnota = ?`, [id]);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...h,
        subtotal: Number(h.subtotal || 0),
        diskon_nominal: Number(h.diskon_nominal || 0),
        dpp: Number(h.dpp || 0),
        ppn_nominal: Number(h.ppn_nominal || 0),
        total: Number(h.total || 0),
        total_idr: Number(h.total_idr || 0),
        kurs: Number(h.kurs || 1),
        items: (detailRows || []).map((d: any) => ({
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
    console.error("GET Detail Nota Jual Emas Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const connection = await pool.getConnection();
  try {
    const { action, user } = await request.json();
    const { id } = await params;
    if (!id) {
       await connection.release();
       return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    if (!id || !action) {
       return NextResponse.json({ success: false, error: "ID dan action diperlukan" }, { status: 400 });
    }

    await connection.beginTransaction();

    const [headerRows]: any = await connection.execute(
      `SELECT nomor, kode, nomormhcustomer, nomormhvaluta, kurs, tanggal, jatuh_tempo, total, total_idr, keterangan, nomormhcabang, nomormhperusahaan, status_disetujui 
       FROM thjualnota WHERE nomor = ? FOR UPDATE`, [id]
    );

    if (headerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    const h = headerRows[0];

    const cbg = h.nomormhcabang || 0;
    const prs = h.nomormhperusahaan || 0;

    if (action === 'approve') {
       if (h.status_disetujui === 1) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota sudah disetujui sebelumnya" }, { status: 400 });
       }

       // 1. Update Status
       await connection.execute(
         `UPDATE thjualnota SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', h.nomor]
       );

       // 2. Insert into rhlaporanpiutang
       await connection.execute(
         `INSERT INTO rhlaporanpiutang (
           nomormhcabang, nomormhcustomer, nomormhvaluta, 
           nomormhtransaksi, umc, jenis, tanggal, transaksi_nomor, transaksi_kode, 
           transaksi_tanggal, jatuh_tempo, kurs, total, total_idr, keterangan
         ) VALUES (?, ?, ?, ?, 0, 'FJ_EMAS', ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
         [
           cbg, h.nomormhcustomer, h.nomormhvaluta,
           h.nomor, h.tanggal, h.nomor, h.kode, 
           h.jatuh_tempo, h.kurs, h.total, h.total_idr, h.keterangan || `Nota Jual Emas ${h.kode}`
         ]
       );

       // 3. Insert into rhlaporanstok
       const [detailRows]: any = await connection.execute(`SELECT nomor, nomormhbarang, jumlah, harga, keterangan FROM tdjualnota WHERE nomorthjualnota = ?`, [h.nomor]);
       for (const d of detailRows) {
           // Output stock (negative)
           await connection.execute(
             `INSERT INTO rhlaporanstok (
               nomormhcabang, nomormhperusahaan, nomormhcustomer, nomormhbarang, 
               nomormhtransaksi, jenis, tanggal, transaksi_nomor, transaksi_kode, 
               jumlah, fisik, hpp, batch_number, batch_expired, keterangan
             ) VALUES (?, ?, ?, ?, ?, 'FJ_EMAS', ?, ?, ?, ?, 1, ?, '-', '-', ?)`,
             [
               cbg, prs, h.nomormhcustomer, d.nomormhbarang,
               h.nomor, h.tanggal, d.nomor, h.kode,
               -Math.abs(d.jumlah), d.harga,  // Negative quantity for out
               d.keterangan || h.keterangan
             ]
           );
       }

       await connection.commit();
       await addLogHistory("Nota Jual Emas", h.nomor, "APPROVE", user || "Admin", `Menyetujui Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota berhasil disetujui" });

    } else if (action === 'disapprove') {
       if (h.status_disetujui === 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Nota belum disetujui" }, { status: 400 });
       }

       // Check for Payment
       const [paymentCheck]: any = await connection.execute(`
         SELECT nomor FROM rhlaporanpiutang 
         WHERE nomormhtransaksi = ? AND jenis = 'FJ_EMAS' AND pelunasan_nomor <> 0 
         LIMIT 1
       `, [h.nomor]);

       if (paymentCheck.length > 0) {
         await connection.rollback();
         return NextResponse.json({ success: false, error: "Piutang Nota ini sudah dibayar sebagian/lunas, tidak bisa dibatalkan." }, { status: 400 });
       }

       // Update Status
       await connection.execute(
         `UPDATE thjualnota SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`,
         [h.nomor]
       );

       // Delete from reports
       await connection.execute(
         `DELETE FROM rhlaporanpiutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FJ_EMAS'`,
         [h.nomor, h.kode]
       );
       
       await connection.execute(
         `DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FJ_EMAS'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Jual Emas", h.nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Approval berhasil dibatalkan" });

    } else if (action === 'reject' || action === 'delete') {
       await connection.execute(
         `UPDATE thjualnota SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`,
         [user || 'Admin', h.nomor]
       );
       
       // Cleanup reports if it was approved
       await connection.execute(
         `DELETE FROM rhlaporanpiutang WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FJ_EMAS'`,
         [h.nomor, h.kode]
       );
       await connection.execute(
         `DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ? AND jenis = 'FJ_EMAS'`,
         [h.nomor, h.kode]
       );

       await connection.commit();
       await addLogHistory("Nota Jual Emas", h.nomor, "DELETE", user || "Admin", `Menghapus Nota ${h.kode}`);
       return NextResponse.json({ success: true, message: "Nota berhasil dihapus" });
    }

    await connection.rollback();
    return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("PATCH Nota Jual Emas Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
