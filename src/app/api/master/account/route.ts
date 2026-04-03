import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const detail = searchParams.get('detail');
    const kas = searchParams.get('kas');
    const bank = searchParams.get('bank');
    const isBrowseUms = searchParams.get('is_browse_ums');
    const filterAkses = searchParams.get('filter_akses') === '1';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `SELECT a.* FROM mhaccount a`;
    const params: any[] = [];

    if (filterAkses && session?.id) {
      query += ` JOIN tmusuaraccount ua ON a.nomor = ua.nomormhaccount AND ua.nomormhuser = ?`;
      params.push(session.id);
    }
    query += ` WHERE a.status_aktif = 1`;

    if (detail !== null && detail !== undefined && detail !== '') {
      query += ` AND detail = ?`;
      params.push(parseInt(detail));
    }
    if (kas !== null && kas !== undefined && kas !== '') {
      query += ` AND kas = ?`;
      params.push(parseInt(kas));
    }
    if (bank !== null && bank !== undefined && bank !== '') {
      query += ` AND bank = ?`;
      params.push(parseInt(bank));
    }
    if (isBrowseUms !== null && isBrowseUms !== undefined && isBrowseUms !== '') {
      query += ` AND is_browse_ums = ?`;
      params.push(parseInt(isBrowseUms));
    }

    if (keyword) {
      query += ` AND (kode LIKE ? OR kode_inisial LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY kode ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Use pool.query for LIMIT/OFFSET stability
    const [data] = await pool.query(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode, kode_inisial, nama, kas, bank, giro, detail, is_foh, is_browse_ums, keterangan, catatan } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: 'Kode dan Nama Account wajib diisi' }, { status: 400 });
    }

    const result: any = await executeQuery(
      `INSERT INTO mhaccount (kode, kode_inisial, nama, kas, bank, giro, detail, is_foh, is_browse_ums, keterangan, catatan, dibuat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [kode.toUpperCase(), kode_inisial || '', nama, kas ? 1 : 0, bank ? 1 : 0, giro ? 1 : 0, detail ? 1 : 0, is_foh ? 1 : 0, is_browse_ums ? 1 : 0, keterangan || '', catatan || '', 0]
    );

    return NextResponse.json({ success: true, message: 'Account berhasil disimpan', data: { id: result.insertId, kode: kode.toUpperCase() } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Kode Account sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;
    if (action === 'delete') {
      await executeQuery(`UPDATE mhaccount SET status_aktif = 0 WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Account berhasil dinonaktifkan' });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
