import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const headerData: any = await executeQuery(
      `SELECT h.*, c.nama as customer 
       FROM thjualretur h 
       LEFT JOIN mhcustomer c ON h.nomormhrelasi = c.nomor
       WHERE h.kode = ? AND h.status_aktif = 1`, [id]
    );
    if (headerData.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
    const header = headerData[0];
    if (!header.tanggal || !header.nomormhrelasi) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }
    const items: any = await executeQuery(
      `SELECT * FROM tdjualretur WHERE nomorthjualretur = ? AND status_aktif = 1 ORDER BY nomor`,
      [header.nomor]
    );
    return NextResponse.json({ success: true, data: { ...header, items } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  const connection = await pool.getConnection();
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, user } = body;
    await connection.beginTransaction();

    if (action === 'approve') {
      await connection.execute(`UPDATE thjualretur SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE kode = ?`, [id]);
      
      const [headerRows]: any = await connection.execute(`SELECT * FROM thjualretur WHERE kode = ?`, [id]);
      if (headerRows.length > 0) {
        const h = headerRows[0];
        const moduleName = h.jenis === 'NKC' ? 'Nota Kredit Customer' : 'Retur Jual';

        if (h.jenis === 'RJ') {
          // 1. Mutasi Stok (Increase stock for Return)
          const [details]: any = await connection.execute(`SELECT * FROM tdjualretur WHERE nomorthjualretur = ?`, [h.nomor]);
          for (const d of details) {
            await connection.execute(
              `INSERT INTO rhlaporanstok 
               (nomormhcabang, nomormhperusahaan, nomormhgudang, nomormhrelasi, nomormhbarang, jumlah, nomormhtransaksi, transaksi_nomor, transaksi_kode, keterangan, tanggal, jenis)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.nomormhgudang || 0, h.nomormhrelasi || 0, d.nomormhbarang || 0, 
                parseFloat(d.jumlah || 0), // Positive value for return inflow
                h.nomor, d.nomor, h.kode, `Retur Jual: ${h.kode} - ${h.keterangan || ''} (Detail: ${d.keterangan || ''})`,
                h.tanggal, 'RJ'
              ]
            );
          }

          // 2. Laporan Piutang (Decrease receivable)
          await connection.execute(
            `INSERT INTO rhlaporanpiutang (nomormhcabang, nomormhperusahaan, tanggal, nomormhrelasi, kurs, nomormhtransaksi, transaksi_kode, total, total_idr, jenis)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              h.nomormhcabang || 0, h.nomormhperusahaan || 0, h.tanggal, h.nomormhrelasi || 0, h.kurs || 1, 
              h.nomor, h.kode, -parseFloat(h.total || 0), -parseFloat(h.total_idr || 0), 'RJ'
            ]
          );
        }

        await addLogHistory(moduleName, h.nomor, "APPROVE", user || "Admin", `Menyetujui ${moduleName} ${id}`);
      }
      await connection.commit();
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }

    if (action === 'disapprove') {
      await connection.execute(`UPDATE thjualretur SET status_disetujui = 0, dibatalkan_oleh = 'Admin', dibatalkan_pada = NOW() WHERE kode = ?`, [id]);
      
      const [headerRows]: any = await connection.execute(`SELECT nomor, kode, jenis FROM thjualretur WHERE kode = ?`, [id]);
      if (headerRows.length > 0) {
        const h = headerRows[0];
        const moduleName = h.jenis === 'NKC' ? 'Nota Kredit Customer' : 'Retur Jual';
        
        // Delete reporting records
        await connection.execute(`DELETE FROM rhlaporanstok WHERE nomormhtransaksi = ? AND transaksi_kode = ?`, [h.nomor, h.kode]);
        await connection.execute(`DELETE FROM rhlaporanpiutang WHERE nomormhtransaksi = ? AND jenis = 'RJ'`, [h.nomor]);

        await addLogHistory(moduleName, h.nomor, "DISAPPROVE", user || "Admin", `Membatalkan persetujuan ${moduleName} ${id}`);
      }
      await connection.commit();
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    await connection.rollback();
    return NextResponse.json({ success: true, message: 'Berhasil' });
  } catch (error: any) {
    if (connection) await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
