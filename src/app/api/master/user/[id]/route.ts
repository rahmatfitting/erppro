import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    const users: any = await executeQuery(
      `SELECT nomor, grup_id, username, email, nama, no_hp, status_aktif 
       FROM mhuser WHERE nomor = ?`, 
      [id]
    );

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: users[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id; 
    const body = await request.json();
    const { grup_id, username, email, password, nama, no_hp, status_aktif } = body;

    if (!grup_id || !username || !nama) {
      return NextResponse.json({ success: false, error: "Grup, Username, dan Nama wajib diisi" }, { status: 400 });
    }

    let query = `UPDATE mhuser SET grup_id = ?, username = ?, email = ?, nama = ?, no_hp = ?, status_aktif = ?`;
    const sqlParams: any[] = [grup_id, username.toLowerCase(), email || null, nama, no_hp || null, status_aktif !== undefined ? status_aktif : 1];

    if (password && password.trim() !== '') {
       const hash = await bcrypt.hash(password, 10);
       query += `, password = ?`;
       sqlParams.push(hash);
    }

    query += ` WHERE nomor = ?`;
    sqlParams.push(id);

    const result: any = await executeQuery(query, sqlParams);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User berhasil diperbarui" });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: "Username atau Email sudah terdaftar" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;

    // Optional: protect admin user from deletion
    const user: any = await executeQuery(`SELECT username FROM mhuser WHERE nomor = ?`, [id]);
    if (user.length > 0 && user[0].username === 'admin') {
       return NextResponse.json({ success: false, error: "Administrator utama tidak dapat dinonaktifkan" }, { status: 403 });
    }

    const result: any = await executeQuery(
      `UPDATE mhuser SET status_aktif = 0 WHERE nomor = ?`, 
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User berhasil dinonaktifkan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
