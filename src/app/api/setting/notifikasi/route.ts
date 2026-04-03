import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Setting Notifikasi — defines which users get notified for which modules

export async function GET(request: Request) {
  try {
    const settings: any = await executeQuery(`
      SELECT ns.*, mhu.nama as user_nama, mhu.username
      FROM mhnotifikasi_setting ns
      LEFT JOIN mhuser mhu ON mhu.nomor = ns.nomor_user
      WHERE ns.status_aktif = 1
      ORDER BY ns.modul, ns.nomor_user
    `);
    
    // Group by module
    const grouped: Record<string, any> = {};
    for (const row of settings as any[]) {
      if (!grouped[row.modul]) {
        grouped[row.modul] = { modul: row.modul, users: [] };
      }
      grouped[row.modul].users.push({ nomor: row.nomor, nomor_user: row.nomor_user, user_nama: row.user_nama, username: row.username });
    }
    
    return NextResponse.json({ success: true, data: Object.values(grouped) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { modul, nomor_user } = await request.json();
    if (!modul || !nomor_user) {
      return NextResponse.json({ success: false, error: 'Modul dan user wajib diisi' }, { status: 400 });
    }

    // Check if already exists
    const existing: any = await executeQuery(
      `SELECT nomor FROM mhnotifikasi_setting WHERE modul = ? AND nomor_user = ? AND status_aktif = 1`,
      [modul, nomor_user]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ success: false, error: 'Setting sudah ada' }, { status: 400 });
    }

    const result: any = await executeQuery(
      `INSERT INTO mhnotifikasi_setting (modul, nomor_user, status_aktif, dibuat_pada) VALUES (?, ?, 1, NOW())`,
      [modul, nomor_user]
    );
    return NextResponse.json({ success: true, message: 'Setting disimpan', data: { id: (result as any).insertId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID diperlukan' }, { status: 400 });

    await executeQuery(`UPDATE mhnotifikasi_setting SET status_aktif = 0 WHERE nomor = ?`, [id]);
    return NextResponse.json({ success: true, message: 'Setting dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
