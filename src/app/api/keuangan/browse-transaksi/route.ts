import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const keyword = searchParams.get('keyword') || '';

    let query = '';
    let params: any[] = [];

    if (type === 'nota_jual') {
      query = `SELECT nomor, kode, tanggal, customer as partner_nama FROM thjualnota WHERE status_aktif = 1`;
      if (keyword) { query += ` AND (kode LIKE ? OR customer LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    } else if (type === 'nota_beli') {
      query = `SELECT nomor, kode, tanggal, supplier as partner_nama FROM thbelinota WHERE status_aktif = 1`;
      if (keyword) { query += ` AND (kode LIKE ? OR supplier LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    } else if (type === 'umc') {
      query = `SELECT nomor, kode, tanggal, account_nama as partner_nama FROM thuangmasuk WHERE status_aktif = 1 AND jenis = 1 AND keterangan LIKE '%Uang Muka%'`;
      if (keyword) { query += ` AND (kode LIKE ? OR account_nama LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    } else if (type === 'ums') {
       query = `SELECT nomor, kode, tanggal, account_nama as partner_nama FROM thuangkeluar WHERE status_aktif = 1 AND jenis = 1 AND keterangan LIKE '%Uang Muka%'`;
      if (keyword) { query += ` AND (kode LIKE ? OR account_nama LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`); }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    query += ` ORDER BY tanggal DESC, nomor DESC LIMIT 50`;
    const data = await executeQuery(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
