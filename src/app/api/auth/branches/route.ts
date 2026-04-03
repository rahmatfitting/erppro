import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeQuery } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get Assigned Branches
    const branches: any = await executeQuery(
      `SELECT c.nomor, c.nama, c.kode, p.nama as perusahaan_nama, c.alamat 
       FROM mhcabang c 
       JOIN mhperusahaan p ON c.nomormhperusahaan = p.nomor
       ${session.username === 'admin' ? '' : 'JOIN mhuser_akses a ON c.nomor = a.nomormhcabang'}
       WHERE ${session.username === 'admin' ? '1=1' : 'a.nomormhuser = ?'} AND c.status_aktif = 1`,
      session.username === 'admin' ? [] : [session.id]
    );

    return NextResponse.json({ success: true, data: branches });

  } catch (error: any) {
    console.error("GET Auth Branches Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
