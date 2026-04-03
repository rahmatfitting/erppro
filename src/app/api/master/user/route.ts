import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    
    let query = `
      SELECT u.nomor, u.username, u.email, u.nama, u.no_hp, u.status_aktif, u.last_login, g.nama as grup_nama, g.kode as grup_kode
      FROM mhuser u
      LEFT JOIN mhusergrup g ON u.grup_id = g.nomor
      WHERE u.status_aktif = 1
    `;
    const params: any[] = [];
    
    if (keyword) {
      query += ` AND (u.username LIKE ? OR u.nama LIKE ? OR u.email LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    
    query += ` ORDER BY u.nama ASC`;
    const users: any[] = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { grup_id, username, email, password, nama, no_hp } = body;

    if (!grup_id || !username || !password || !nama) {
      return NextResponse.json({ success: false, error: "Grup, Username, Password, dan Nama wajib diisi" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);

    const result: any = await executeQuery(
      `INSERT INTO mhuser (grup_id, username, email, password, nama, no_hp, dibuat_oleh) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [grup_id, username.toLowerCase(), email || null, hash, nama, no_hp || null, 'Admin']
    );

    return NextResponse.json({ success: true, message: "User berhasil dibuat", data: { id: result.insertId } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Username atau Email sudah terdaftar" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
