import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    
    let query = `SELECT * FROM mhusergrup WHERE status_aktif = 1`;
    const params: any[] = [];
    
    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    query += ` ORDER BY nama ASC`;
    const groups: any[] = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data: groups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { kode, nama, keterangan, hak_akses } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama Grup wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Insert Header Grup
    const [grupResult]: any = await connection.execute(
      `INSERT INTO mhusergrup (kode, nama, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?)`,
      [kode.toUpperCase(), nama, keterangan || '', 'Admin']
    );

    const grupId = grupResult.insertId;

    // Insert Hak Akses
    if (hak_akses && Array.isArray(hak_akses)) {
      for (const hak of hak_akses) {
        await connection.execute(
          `INSERT INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            grupId, 
            hak.menu, 
            hak.view ? 1 : 0, 
            hak.add ? 1 : 0, 
            hak.edit ? 1 : 0, 
            hak.delete ? 1 : 0, 
            hak.approve ? 1 : 0
          ]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Role / Grup berhasil dibuat" });
  } catch (error: any) {
    await connection.rollback();
    // 1062 is duplicate entry for mysql
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Kode Grup sudah ada" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
