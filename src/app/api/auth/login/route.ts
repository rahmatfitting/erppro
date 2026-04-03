import { NextResponse } from "next/server";
import { executeQuery, pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { login } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username dan Password wajib diisi" }, { status: 400 });
    }

    // 1. Cek User
    const users: any = await executeQuery(
      `SELECT u.*, g.nama as grup_nama 
       FROM mhuser u 
       LEFT JOIN mhusergrup g ON u.grup_id = g.nomor 
       WHERE u.username = ? AND u.status_aktif = 1`,
      [username]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: "Username tidak ditemukan atau dinonaktifkan" }, { status: 401 });
    }

    const user = users[0];

    // 2. Cek Password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return NextResponse.json({ success: false, error: "Password salah" }, { status: 401 });
    }

    // 3. Update last login
    const connection = await pool.getConnection();
    try {
      await connection.execute(`UPDATE mhuser SET last_login = NOW() WHERE nomor = ?`, [user.nomor]);
    } finally {
      connection.release();
    }

    // 4. Get Hak Akses
    const hakAksesRows: any = await executeQuery(
      `SELECT menu FROM mhusergruphakakses WHERE grup_id = ? AND akses_view = 1`,
      [user.grup_id]
    );
    const allowedMenus = hakAksesRows.map((r: any) => r.menu);

    // 5. Get Assigned Branches
    const branches: any = await executeQuery(
      `SELECT c.nomor, c.nama, c.kode, p.nama as perusahaan_nama 
       FROM mhcabang c 
       JOIN mhperusahaan p ON c.nomormhperusahaan = p.nomor
       ${user.username === 'admin' ? '' : 'JOIN mhuser_akses a ON c.nomor = a.nomormhcabang'}
       WHERE ${user.username === 'admin' ? '1=1' : 'a.nomormhuser = ?'} AND c.status_aktif = 1`,
      user.username === 'admin' ? [] : [user.nomor]
    );

    // 6. Set Session JWT (Cookie)
    await login({
       id: user.nomor,
       username: user.username,
       email: user.email,
       nama: user.nama,
       grup_id: user.grup_id,
       grup_nama: user.grup_nama,
       hak_akses: allowedMenus
    });

    return NextResponse.json({ 
      success: true, 
      message: "Login berhasil",
      user: {
        nama: user.nama,
        grup: user.grup_nama
      },
      hasMultiBranch: branches.length > 1,
      singleBranch: branches.length === 1 ? branches[0] : null
    });

  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
