import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'rekap';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const session = await getSession();
    if (!session || !session.active_perusahaan) {
      return NextResponse.json({ success: false, error: 'Unauthorized or company not selected' }, { status: 401 });
    }

    const { active_perusahaan, active_cabang } = session;

    const limit = parseInt(searchParams.get('limit') || '0');
    const offset = parseInt(searchParams.get('offset') || '0');
    const pagination = limit > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : '';

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Periode tanggal wajib diisi' }, { status: 400 });
    }

    let data: any[] = [];
    let totalCount = 0;

    if (type === 'rekap') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thjualnota h WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT h.nomor, h.kode, h.tanggal, h.customer, h.valuta, h.kurs, 
               h.subtotal, h.diskon_nominal, h.dpp, h.ppn_nominal, h.total, h.status_disetujui
        FROM thjualnota h
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'detail') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thjualnota h JOIN tdjualnota d ON h.nomor = d.nomorthjualnota WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1 AND d.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT h.kode, h.tanggal, h.customer, d.kode_barang, d.nama_barang, d.satuan, 
               d.jumlah, d.harga, d.diskon_prosentase, d.diskon_nominal, d.netto, d.subtotal
        FROM thjualnota h
        JOIN tdjualnota d ON h.nomor = d.nomorthjualnota
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1 AND d.status_aktif = 1
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'monitoring') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thjualorder hso JOIN tdjualorder dso ON hso.nomor = dso.nomorthjualorder WHERE hso.nomormhperusahaan = ? AND hso.nomormhcabang = ? AND hso.tanggal BETWEEN ? AND ? AND hso.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT 
          hso.kode as kode_so, hso.tanggal as tgl_so, dso.nama_barang, dso.jumlah as qty_so,
          hsj.kode as kode_sj, hsj.tanggal as tgl_sj, dsj.jumlah as qty_sj,
          hinv.kode as kode_inv, hinv.tanggal as tgl_inv, dinv.jumlah as qty_inv
        FROM thjualorder hso
        JOIN tdjualorder dso ON hso.nomor = dso.nomorthjualorder
        LEFT JOIN thsuratjalan hsj ON hso.kode = hsj.kode_order_jual AND hsj.status_aktif = 1
        LEFT JOIN tdsuratjalan dsj ON hsj.nomor = dsj.nomorthsuratjalan AND dso.kode_barang = dsj.kode_barang AND dsj.status_aktif = 1
        LEFT JOIN tdjualnota dinv ON hsj.kode = dinv.kode_surat_jalan AND dso.kode_barang = dinv.kode_barang AND dinv.status_aktif = 1
        LEFT JOIN thjualnota hinv ON dinv.nomorthjualnota = hinv.nomor AND hinv.status_aktif = 1
        WHERE hso.nomormhperusahaan = ? AND hso.nomormhcabang = ? 
          AND hso.tanggal BETWEEN ? AND ? 
          AND hso.status_aktif = 1
        ORDER BY hso.tanggal DESC, hso.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'outstanding') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thsuratjalan h JOIN tdsuratjalan d ON h.nomor = d.nomorthsuratjalan WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1 AND d.status_aktif = 1 AND (d.jumlah > COALESCE((SELECT SUM(jumlah) FROM tdjualnota di WHERE di.kode_surat_jalan = h.kode AND di.kode_barang = d.kode_barang AND di.status_aktif = 1), 0))`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT 
          h.kode as kode_sj, h.tanggal, h.customer, d.nama_barang, d.satuan, 
          d.jumlah as qty_sj,
          COALESCE((SELECT SUM(jumlah) FROM tdjualnota di WHERE di.kode_surat_jalan = h.kode AND di.kode_barang = d.kode_barang AND di.status_aktif = 1), 0) as qty_nota,
          (d.jumlah - COALESCE((SELECT SUM(jumlah) FROM tdjualnota di WHERE di.kode_surat_jalan = h.kode AND di.kode_barang = d.kode_barang AND di.status_aktif = 1), 0)) as qty_outstanding
        FROM thsuratjalan h
        JOIN tdsuratjalan d ON h.nomor = d.nomorthsuratjalan
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1 AND d.status_aktif = 1
          AND (d.jumlah > COALESCE((SELECT SUM(jumlah) FROM tdjualnota di WHERE di.kode_surat_jalan = h.kode AND di.kode_barang = d.kode_barang AND di.status_aktif = 1), 0))
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);
    }

    return NextResponse.json({ success: true, data, totalCount });

  } catch (error: any) {
    console.error("Report Penjualan Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
