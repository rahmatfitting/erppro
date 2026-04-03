import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'kartu';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const nomormhbarang = searchParams.get('nomormhbarang');
    const nomormhgudang = searchParams.get('nomormhgudang');

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
      if (!nomormhbarang || !startDate) {
        return NextResponse.json({ success: false, error: 'Barang dan Tanggal Awal wajib diisi untuk Kartu Stok' }, { status: 400 });
      }

      // 1. Get Opening Balance & Item Name
      let itemQuery = `SELECT nama FROM mhbarang WHERE nomor = ?`;
      const [itemRow]: any = await executeQuery(itemQuery, [nomormhbarang]);
      const itemName = itemRow?.nama || 'Unknown Item';

      let openingQuery = `SELECT COALESCE(SUM(jumlah), 0) as balance FROM rhlaporanstok WHERE nomormhperusahaan = ? AND nomormhbarang = ? AND DATE(tanggal) < ? AND nomormhcabang = ?`;
      let openingParams: any[] = [active_perusahaan, nomormhbarang, startDate, active_cabang];
      if (nomormhgudang) {
        openingQuery += ` AND nomormhgudang = ?`;
        openingParams.push(nomormhgudang);
      }
      const [opening]: any = await executeQuery(openingQuery, openingParams);
      const openingBalance = parseFloat(opening?.balance || 0);

      // 2. Get Transactions
      let transQuery = `
        SELECT h.tanggal, h.transaksi_kode, h.jenis, h.keterangan, 
               h.jumlah as mutasi, g.nama as gudang
        FROM rhlaporanstok h
        LEFT JOIN mhgudang g ON h.nomormhgudang = g.nomor
        WHERE h.nomormhperusahaan = ? AND h.nomormhbarang = ? 
          AND DATE(h.tanggal) BETWEEN ? AND ?
          AND h.nomormhcabang = ?
      `;
      let transParams: any[] = [active_perusahaan, nomormhbarang, startDate, endDate, active_cabang];
      if (nomormhgudang) {
        transQuery += ` AND h.nomormhgudang = ?`;
        transParams.push(nomormhgudang);
      }
      transQuery += ` ORDER BY h.tanggal ASC, h.nomor ASC`;
      
      const transactions: any = await executeQuery(transQuery, transParams);

      // 3. Process with Running Balance, Debet, and Kredit
      let currentBalance = openingBalance;
      
      const openingRow = {
        tanggal: startDate,
        transaksi_kode: '-',
        keterangan: 'SALDO AWAL',
        gudang: '-',
        debet: 0,
        kredit: 0,
        saldo: openingBalance
      };

      const transData = transactions.map((t: any) => {
        const val = parseFloat(t.mutasi || 0);
        currentBalance += val;
        return {
          tanggal: t.tanggal,
          transaksi_kode: t.transaksi_kode,
          keterangan: t.keterangan,
          gudang: t.gudang,
          debet: val > 0 ? val : 0,
          kredit: val < 0 ? Math.abs(val) : 0,
          saldo: currentBalance
        };
      });

      data = [openingRow, ...transData];

      extra = { openingBalance, itemName };

    } else if (type === 'posisi') {
      // Posisi Stok per Item as of endDate
      let posQuery = `
        SELECT b.kode as kode_barang, b.nama as nama_barang, s.nama as satuan,
               SUM(h.jumlah) as total_stok
        FROM rhlaporanstok h
        JOIN mhbarang b ON h.nomormhbarang = b.nomor
        LEFT JOIN mhsatuan s ON b.nomormhsatuan = s.nomor
        WHERE h.nomormhperusahaan = ? AND DATE(h.tanggal) <= ? AND h.nomormhcabang = ?
      `;
      let posParams: any[] = [active_perusahaan, endDate, active_cabang];
      if (nomormhgudang) {
        posQuery += ` AND h.nomormhgudang = ?`;
        posParams.push(nomormhgudang);
      }
      posQuery += ` GROUP BY b.nomor ORDER BY b.nama ASC`;

      const results: any = await executeQuery(posQuery, posParams);
      data = results.map((r: any) => ({
        ...r,
        total_stok: parseFloat(r.total_stok || 0)
      }));

    } else if (type === 'mutasi') {
      if (!startDate) return NextResponse.json({ success: false, error: 'Tanggal Awal wajib diisi untuk Mutasi Stok' }, { status: 400 });

      // Mutasi Stok per Item
      let mutQuery = `
        SELECT 
          b.kode as kode_barang, b.nama as nama_barang, s.nama as satuan,
          COALESCE((SELECT SUM(jumlah) FROM rhlaporanstok WHERE nomormhbarang = b.nomor AND DATE(tanggal) < ? AND nomormhperusahaan = ? AND nomormhcabang = ? ${nomormhgudang ? 'AND nomormhgudang = ?' : ''}), 0) as saldo_awal,
          COALESCE((SELECT SUM(jumlah) FROM rhlaporanstok WHERE nomormhbarang = b.nomor AND DATE(tanggal) BETWEEN ? AND ? AND jumlah > 0 AND nomormhperusahaan = ? AND nomormhcabang = ? ${nomormhgudang ? 'AND nomormhgudang = ?' : ''}), 0) as masuk,
          COALESCE((SELECT ABS(SUM(jumlah)) FROM rhlaporanstok WHERE nomormhbarang = b.nomor AND DATE(tanggal) BETWEEN ? AND ? AND jumlah < 0 AND nomormhperusahaan = ? AND nomormhcabang = ? ${nomormhgudang ? 'AND nomormhgudang = ?' : ''}), 0) as keluar,
          COALESCE((SELECT SUM(jumlah) FROM rhlaporanstok WHERE nomormhbarang = b.nomor AND DATE(tanggal) <= ? AND nomormhperusahaan = ? AND nomormhcabang = ? ${nomormhgudang ? 'AND nomormhgudang = ?' : ''}), 0) as saldo_akhir
        FROM mhbarang b
        LEFT JOIN mhsatuan s ON b.nomormhsatuan = s.nomor
        WHERE EXISTS (SELECT 1 FROM rhlaporanstok WHERE nomormhbarang = b.nomor AND nomormhperusahaan = ? AND nomormhcabang = ?)
        ORDER BY b.nama ASC
      `;
      
      const mutParams: any[] = [];
      mutParams.push(startDate, active_perusahaan, active_cabang); if (nomormhgudang) mutParams.push(nomormhgudang);
      mutParams.push(startDate, endDate, active_perusahaan, active_cabang); if (nomormhgudang) mutParams.push(nomormhgudang);
      mutParams.push(startDate, endDate, active_perusahaan, active_cabang); if (nomormhgudang) mutParams.push(nomormhgudang);
      mutParams.push(endDate, active_perusahaan, active_cabang); if (nomormhgudang) mutParams.push(nomormhgudang);
      mutParams.push(active_perusahaan, active_cabang);

      const results: any = await executeQuery(mutQuery, mutParams);
      data = results.map((r: any) => ({
        ...r,
        saldo_awal: parseFloat(r.saldo_awal || 0),
        masuk: parseFloat(r.masuk || 0),
        keluar: parseFloat(r.keluar || 0),
        saldo_akhir: parseFloat(r.saldo_akhir || 0)
      }));
    }

    return NextResponse.json({ success: true, data, extra });

  } catch (error: any) {
    console.error("Report Stok Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
