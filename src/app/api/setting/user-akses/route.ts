import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nomormhuser = searchParams.get('nomormhuser');

    if (!nomormhuser) {
      return NextResponse.json({ success: false, error: "User ID wajib diisi" }, { status: 400 });
    }

    try {
      const data: any = await executeQuery(`
        SELECT a.*, c.nama as cabang_nama, p.nama as perusahaan_nama 
        FROM mhuser_akses a
        JOIN mhcabang c ON a.nomormhcabang = c.nomor
        JOIN mhperusahaan p ON c.nomormhperusahaan = p.nomor
        WHERE a.nomormhuser = ?
      `, [nomormhuser]);
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      console.error("User Akses SQL Error:", error);
      // Return empty if table is missing or columns are missing during setup
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes("exists")) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error; 
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nomormhuser, nomormhcabang } = await request.json();

    if (!nomormhuser || !nomormhcabang) {
      return NextResponse.json({ success: false, error: "User dan Cabang wajib diisi" }, { status: 400 });
    }

    await executeQuery(`
      INSERT INTO mhuser_akses (nomormhuser, nomormhcabang) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE dibuat_pada = NOW()
    `, [nomormhuser, nomormhcabang]);

    return NextResponse.json({ success: true, message: "Akses berhasil ditambahkan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nomor = searchParams.get('nomor');

    if (!nomor) {
      return NextResponse.json({ success: false, error: "ID Akses wajib diisi" }, { status: 400 });
    }

    await executeQuery(`DELETE FROM mhuser_akses WHERE nomor = ?`, [nomor]);

    return NextResponse.json({ success: true, message: "Akses berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
