import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session: any = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { active_perusahaan, active_cabang } = session;

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT * 
      FROM mhkategori 
      WHERE nomormhperusahaan = ? AND nomormhcabang = ? AND status_aktif = 1
    `;
    const params: any[] = [active_perusahaan, active_cabang];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      query += ` AND dibuat_pada >= ?`;
      params.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      query += ` AND dibuat_pada <= ?`;
      params.push(endDate + ' 23:59:59');
    }

    query += ` ORDER BY kode ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Master Kategori Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session: any = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { active_perusahaan, active_cabang } = session;

    const body = await request.json();
    const { kode, nama, keterangan } = body;

    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama wajib diisi" }, { status: 400 });
    }

    const query = `
      INSERT INTO mhkategori 
      (kode, nama, keterangan, nomormhperusahaan, nomormhcabang, dibuat_oleh) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result: any = await executeQuery(query, [
      kode.toUpperCase(), nama, keterangan || '', active_perusahaan, active_cabang, 'Admin'
    ]);

    return NextResponse.json({ success: true, data: { id: result.insertId } });
  } catch (error: any) {
    console.error("POST Master Kategori Error:", error);
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: "Kode kategori sudah digunakan" }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: "ID dibutuhkan" }, { status: 400 });
      const query = `UPDATE mhkategori SET status_aktif = 0 WHERE nomor = ?`;
      await executeQuery(query, [id]);
      return NextResponse.json({ success: true, message: "Kategori berhasil dihapus" });
    }

    return NextResponse.json({ success: false, error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Master Kategori Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
