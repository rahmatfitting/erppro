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
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thbelinota h WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT h.nomor, h.kode, h.tanggal, h.supplier, h.valuta, h.kurs, 
               h.subtotal, h.diskon_nominal, h.dpp, h.ppn_nominal, h.total, h.status_disetujui
        FROM thbelinota h
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'detail') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thbelinota h JOIN tdbelinota d ON h.nomor = d.nomorthbelinota WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1 AND d.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT h.kode, h.tanggal, h.supplier, d.kode_barang, d.nama_barang, d.satuan, 
               d.jumlah, d.harga, d.diskon_prosentase, d.diskon_nominal, d.netto, d.subtotal
        FROM thbelinota h
        JOIN tdbelinota d ON h.nomor = d.nomorthbelinota
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1 AND d.status_aktif = 1
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'monitoring') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thbelipermintaan hpr JOIN tdbelipermintaan dpr ON hpr.nomor = dpr.nomorthbelipermintaan WHERE hpr.nomormhperusahaan = ? AND hpr.nomormhcabang = ? AND hpr.tanggal BETWEEN ? AND ? AND hpr.status_aktif = 1`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT 
          hpr.kode as kode_pr, hpr.tanggal as tgl_pr, dpr.nama_barang, dpr.jumlah as qty_pr,
          hpo.kode as kode_po, hpo.tanggal as tgl_po, dpo.jumlah as qty_po,
          hpb.kode as kode_pb, hpb.tanggal as tgl_pb, dpb.jumlah as qty_pb,
          hinv.kode as kode_inv, hinv.tanggal as tgl_inv, dinv.jumlah as qty_inv
        FROM thbelipermintaan hpr
        JOIN tdbelipermintaan dpr ON hpr.nomor = dpr.nomorthbelipermintaan
        LEFT JOIN tdbeliorder dpo ON dpr.nomor = dpo.nomortdbelipermintaan AND dpo.status_aktif = 1
        LEFT JOIN thbeliorder hpo ON dpo.nomorthbeliorder = hpo.nomor AND hpo.status_aktif = 1
        LEFT JOIN tdbelipenerimaan dpb ON hpo.kode = dpb.kode_po AND dpr.kode_barang = dpb.kode_barang AND dpb.status_aktif = 1
        LEFT JOIN thbelipenerimaan hpb ON dpb.nomorthbelipenerimaan = hpb.nomor AND hpb.status_aktif = 1
        LEFT JOIN tdbelinota dinv ON hpb.kode = dinv.kode_pb AND dpr.kode_barang = dinv.kode_barang AND dinv.status_aktif = 1
        LEFT JOIN thbelinota hinv ON dinv.nomorthbelinota = hinv.nomor AND hinv.status_aktif = 1
        WHERE hpr.nomormhperusahaan = ? AND hpr.nomormhcabang = ? 
          AND hpr.tanggal BETWEEN ? AND ? 
          AND hpr.status_aktif = 1
        ORDER BY hpr.tanggal DESC, hpr.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);

    } else if (type === 'outstanding') {
      const countRes: any = await executeQuery(`SELECT COUNT(*) as total FROM thbeliorder h JOIN tdbeliorder d ON h.nomor = d.nomorthbeliorder WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? AND h.tanggal BETWEEN ? AND ? AND h.status_aktif = 1 AND d.status_aktif = 1 AND (d.jumlah > COALESCE((SELECT SUM(jumlah) FROM tdbelipenerimaan dp WHERE dp.kode_po = h.kode AND dp.kode_barang = d.kode_barang AND dp.status_aktif = 1), 0))`, [active_perusahaan, active_cabang, startDate, endDate]);
      totalCount = countRes[0].total;

      data = await executeQuery(`
        SELECT 
          h.kode as kode_po, h.tanggal, h.supplier, d.nama_barang, d.satuan, 
          d.jumlah as qty_po,
          COALESCE((SELECT SUM(jumlah) FROM tdbelipenerimaan dp WHERE dp.kode_po = h.kode AND dp.kode_barang = d.kode_barang AND dp.status_aktif = 1), 0) as qty_terima,
          (d.jumlah - COALESCE((SELECT SUM(jumlah) FROM tdbelipenerimaan dp WHERE dp.kode_po = h.kode AND dp.kode_barang = d.kode_barang AND dp.status_aktif = 1), 0)) as qty_outstanding
        FROM thbeliorder h
        JOIN tdbeliorder d ON h.nomor = d.nomorthbeliorder
        WHERE h.nomormhperusahaan = ? AND h.nomormhcabang = ? 
          AND h.tanggal BETWEEN ? AND ? 
          AND h.status_aktif = 1 AND d.status_aktif = 1
          AND (d.jumlah > COALESCE((SELECT SUM(jumlah) FROM tdbelipenerimaan dp WHERE dp.kode_po = h.kode AND dp.kode_barang = d.kode_barang AND dp.status_aktif = 1), 0))
        ORDER BY h.tanggal DESC, h.kode DESC
        ${pagination}
      `, [active_perusahaan, active_cabang, startDate, endDate]);
    }

    return NextResponse.json({ success: true, data, totalCount });

  } catch (error: any) {
    console.error("Report Pembelian Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
