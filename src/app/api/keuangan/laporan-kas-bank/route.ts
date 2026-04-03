import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {


    const { searchParams } = new URL(request.url);
    const nomormhaccount = searchParams.get('nomormhaccount') || '0';
    const tanggal_awal = searchParams.get('tanggal_awal');
    const tanggal_akhir = searchParams.get('tanggal_akhir');
    const nomormhcabang_param = searchParams.get('nomormhcabang');
    const is_detail = searchParams.get('is_detail') || '1';
    const kas_bank = searchParams.get('kas_bank') || '1'; // '1'=kas, '0'=bank

    const session = await getSession();
    if (!session || !session.active_perusahaan) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!tanggal_awal || !tanggal_akhir) {
      return NextResponse.json({ success: false, error: 'Tanggal awal dan akhir wajib diisi' }, { status: 400 });
    }

    const nomormhcabang = (nomormhcabang_param !== null) ? parseInt(nomormhcabang_param) : (session.active_cabang || 0);

    // Param 6: account_nomor — use '%' if 0/empty (all accounts), else use the nomor
    const p_account_nomor = (!nomormhaccount || nomormhaccount === '0') ? '%' : nomormhaccount;

    // SP signature: rp_lap_akuntansi_kas(p_mode, p_cabang_nomor, p_tanggal_awal, p_tanggal_akhir, p_kas_bank, p_account_nomor, p_transaksi_kode)
    const query = `CALL rp_lap_akuntansi_kas(?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      is_detail,         // p_mode        (1=detail, 0=rekap)
      nomormhcabang === 0 ? '%' : nomormhcabang,     // p_cabang_nomor
      tanggal_awal,      // p_tanggal_awal
      tanggal_akhir,     // p_tanggal_akhir
      kas_bank,          // p_kas_bank    ('1'=kas, '0'=bank)
      p_account_nomor,   // p_account_nomor (specific or '%')
      '%',               // p_transaksi_kode (all)
    ];

    const results: any = await executeQuery(query, params);

    // SP returns multiple result sets; first result set is the data
    const rawData = Array.isArray(results[0]) ? results[0] : results;

    const transactions = rawData;
    const saldoAwal = transactions.length > 0 ? parseFloat(transactions[0].saldo_total || transactions[0].saldo || 0) : 0;
    const saldoAkhir = transactions.length > 0 ? parseFloat(transactions[transactions.length - 1].saldo_total || transactions[transactions.length - 1].saldo || 0) : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        saldo_awal: saldoAwal,
        transactions,
        saldo_akhir: saldoAkhir
      }
    });

  } catch (error: any) {
    console.error('Laporan Kas Bank Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
