import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'kartu';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const nomormhsupplier = searchParams.get('nomormhsupplier');

    const session = await getSession();
    if (!session || !session.active_perusahaan) {
      return NextResponse.json({ success: false, error: 'Unauthorized or company not selected' }, { status: 401 });
    }

    const { active_perusahaan, active_cabang } = session;

    if (!endDate) {
      return NextResponse.json({ success: false, error: 'Tanggal akhir (endDate) wajib diisi' }, { status: 400 });
    }

    let data: any[] = [];
    let extra: any = {};

    if (type === 'kartu') {
      if (!nomormhsupplier || !startDate) {
        return NextResponse.json({ success: false, error: 'Supplier dan Tanggal Awal wajib diisi untuk Kartu Hutang' }, { status: 400 });
      }

      // 1. Get Opening Balance
      const [opening]: any = await executeQuery(`
        SELECT COALESCE(SUM(total_idr), 0) as balance 
        FROM rhlaporanhutang 
        WHERE nomormhperusahaan = ? AND nomormhsupplier = ? AND DATE(tanggal) < ?
          AND nomormhcabang = ?
      `, [active_perusahaan, nomormhsupplier, startDate, active_cabang]);
      
      const openingBalance = parseFloat(opening?.balance || 0);

      // 2. Get Transactions
      const transactions: any = await executeQuery(`
        SELECT h.tanggal, h.transaksi_kode, h.jenis, h.keterangan, 
               h.total_idr as mutasi, h.jatuh_tempo
        FROM rhlaporanhutang h
        WHERE h.nomormhperusahaan = ? AND h.nomormhsupplier = ? 
          AND DATE(h.tanggal) BETWEEN ? AND ?
          AND h.nomormhcabang = ?
        ORDER BY h.tanggal ASC, h.transaksi_kode ASC
      `, [active_perusahaan, nomormhsupplier, startDate, endDate, active_cabang]);

      // 3. Process with Running Balance, Debet, and Kredit
      let currentBalance = openingBalance;
      data = transactions.map((t: any) => {
        const val = parseFloat(t.mutasi || 0);
        currentBalance += val;
        return {
          tanggal: t.tanggal,
          transaksi_kode: t.transaksi_kode,
          keterangan: t.keterangan,
          jatuh_tempo: t.jatuh_tempo,
          debet: val > 0 ? val : 0,
          kredit: val < 0 ? Math.abs(val) : 0,
          saldo: currentBalance
        };
      });

      extra = { openingBalance };

    } else if (type === 'posisi') {
      // Posisi Hutang (Outstanding) as of endDate
      const results: any = await executeQuery(`
        SELECT h.transaksi_kode, h.tanggal, h.jatuh_tempo, s.nama as supplier,
               h.total_idr as total, 
               h.total_idr as sisa_hutang
        FROM rhlaporanhutang h
        LEFT JOIN mhsupplier s ON h.nomormhsupplier = s.nomor
        WHERE h.nomormhperusahaan = ? AND DATE(h.tanggal) <= ?
          AND h.nomormhcabang = ?
          AND h.total_idr <> 0
        ORDER BY s.nama ASC, h.tanggal ASC
      `, [active_perusahaan, endDate, active_cabang]);
      data = results.map((r: any) => ({
        ...r,
        total: parseFloat(r.total || 0),
        sisa_hutang: parseFloat(r.sisa_hutang || 0)
      }));

    } else if (type === 'mutasi') {
      if (!startDate) return NextResponse.json({ success: false, error: 'Tanggal Awal wajib diisi untuk Mutasi Hutang' }, { status: 400 });

      // Mutasi Hutang per Supplier
      const results: any = await executeQuery(`
        SELECT 
          s.nama as supplier,
          COALESCE((SELECT SUM(total_idr) FROM rhlaporanhutang WHERE nomormhsupplier = s.nomor AND DATE(tanggal) < ? AND nomormhperusahaan = ? AND nomormhcabang = ?), 0) as saldo_awal,
          COALESCE((SELECT SUM(total_idr) FROM rhlaporanhutang WHERE nomormhsupplier = s.nomor AND DATE(tanggal) BETWEEN ? AND ? AND total_idr > 0 AND nomormhperusahaan = ? AND nomormhcabang = ?), 0) as debet,
          COALESCE((SELECT ABS(SUM(total_idr)) FROM rhlaporanhutang WHERE nomormhsupplier = s.nomor AND DATE(tanggal) BETWEEN ? AND ? AND total_idr < 0 AND nomormhperusahaan = ? AND nomormhcabang = ?), 0) as kredit,
          COALESCE((SELECT SUM(total_idr) FROM rhlaporanhutang WHERE nomormhsupplier = s.nomor AND DATE(tanggal) <= ? AND nomormhperusahaan = ? AND nomormhcabang = ?), 0) as saldo_akhir
        FROM mhsupplier s
        WHERE EXISTS (SELECT 1 FROM rhlaporanhutang WHERE nomormhsupplier = s.nomor AND nomormhperusahaan = ? AND nomormhcabang = ?)
        ORDER BY s.nama ASC
      `, [startDate, active_perusahaan, active_cabang, startDate, endDate, active_perusahaan, active_cabang, startDate, endDate, active_perusahaan, active_cabang, endDate, active_perusahaan, active_cabang, active_perusahaan, active_cabang]);
      data = results.map((r: any) => ({
        ...r,
        saldo_awal: parseFloat(r.saldo_awal || 0),
        debet: parseFloat(r.debet || 0),
        kredit: parseFloat(r.kredit || 0),
        saldo_akhir: parseFloat(r.saldo_akhir || 0)
      }));

    } else if (type === 'aging') {
      // Aging Hutang as of endDate
      const results: any = await executeQuery(`
        SELECT 
          s.nama as supplier,
          SUM(CASE WHEN DATEDIFF(?, DATE(h.jatuh_tempo)) <= 0 THEN h.total_idr ELSE 0 END) as belum_jatuh_tempo,
          SUM(CASE WHEN DATEDIFF(?, DATE(h.jatuh_tempo)) BETWEEN 1 AND 30 THEN h.total_idr ELSE 0 END) as aging_1_30,
          SUM(CASE WHEN DATEDIFF(?, DATE(h.jatuh_tempo)) BETWEEN 31 AND 60 THEN h.total_idr ELSE 0 END) as aging_31_60,
          SUM(CASE WHEN DATEDIFF(?, DATE(h.jatuh_tempo)) BETWEEN 61 AND 90 THEN h.total_idr ELSE 0 END) as aging_61_90,
          SUM(CASE WHEN DATEDIFF(?, DATE(h.jatuh_tempo)) > 90 THEN h.total_idr ELSE 0 END) as aging_over_90,
          SUM(h.total_idr) as total_hutang
        FROM rhlaporanhutang h
        LEFT JOIN mhsupplier s ON h.nomormhsupplier = s.nomor
        WHERE h.nomormhperusahaan = ? AND DATE(h.tanggal) <= ?
          AND h.nomormhcabang = ?
          AND h.total_idr <> 0
        GROUP BY s.nama
        ORDER BY s.nama ASC
      `, [endDate, endDate, endDate, endDate, endDate, active_perusahaan, endDate, active_cabang]);
      data = results.map((r: any) => ({
        ...r,
        belum_jatuh_tempo: parseFloat(r.belum_jatuh_tempo || 0),
        aging_1_30: parseFloat(r.aging_1_30 || 0),
        aging_31_60: parseFloat(r.aging_31_60 || 0),
        aging_61_90: parseFloat(r.aging_61_90 || 0),
        aging_over_90: parseFloat(r.aging_over_90 || 0),
        total_hutang: parseFloat(r.total_hutang || 0)
      }));
    }

    return NextResponse.json({ success: true, data, extra });

  } catch (error: any) {
    console.error("Report Hutang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
