import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    
    let query = `SELECT * FROM mhpenyesuaian WHERE status_aktif = 1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (nama LIKE ? OR keterangan LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY nama ASC`;

    const data = await executeQuery(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, nomormhaccount, account_nama, keterangan, user } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: 'Nama penyesuaian wajib diisi' }, { status: 400 });
    }

    const result: any = await executeQuery(
      `INSERT INTO mhpenyesuaian (nama, nomormhaccount, account_nama, keterangan, dibuat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [nama, nomormhaccount || null, account_nama || null, keterangan || '', user || 'Admin']
    );

    return NextResponse.json({ success: true, message: 'Jenis Penyesuaian berhasil disimpan', data: { nomor: result.insertId } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Nama Penyesuaian sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { nomor, nama, nomormhaccount, account_nama, keterangan, action, user } = body;

    if (action === 'delete') {
      await executeQuery(`UPDATE mhpenyesuaian SET status_aktif = 0 WHERE nomor = ?`, [nomor]);
      return NextResponse.json({ success: true, message: 'Jenis Penyesuaian berhasil dihapus' });
    }

    if (!nomor || !nama) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    await executeQuery(
      `UPDATE mhpenyesuaian SET nama = ?, nomormhaccount = ?, account_nama = ?, keterangan = ?, diedit_oleh = ?, diedit_pada = NOW() WHERE nomor = ?`,
      [nama, nomormhaccount || null, account_nama || null, keterangan || '', user || 'Admin', nomor]
    );

    return NextResponse.json({ success: true, message: 'Jenis Penyesuaian berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
