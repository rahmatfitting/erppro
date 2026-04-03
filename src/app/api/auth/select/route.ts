import { NextResponse } from "next/server";
import { getSession, encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { executeQuery } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { branchId } = await request.json();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: "Sesi telah berakhir" }, { status: 401 });
    }

    if (!branchId) {
      return NextResponse.json({ success: false, error: "Cabang wajib dipilih" }, { status: 400 });
    }

    // Verify user has access to this branch
    const branches: any = await executeQuery(
      `SELECT c.nomor, c.nomormhperusahaan, c.nama, p.nama as perusahaan_nama 
       FROM mhcabang c 
       JOIN mhperusahaan p ON c.nomormhperusahaan = p.nomor
       ${session.username === 'admin' ? '' : 'JOIN mhuser_akses a ON c.nomor = a.nomormhcabang'}
       WHERE c.nomor = ? ${session.username === 'admin' ? '' : 'AND a.nomormhuser = ?'}`,
       session.username === 'admin' ? [branchId] : [branchId, session.id]
    );

    if (branches.length === 0) {
      return NextResponse.json({ success: false, error: "Anda tidak memiliki akses ke cabang ini" }, { status: 403 });
    }

    const branch = branches[0];

    // Update JWT Session with active branch & company
    const updatedPayload = {
      ...session,
      active_cabang: branch.nomor,
      active_cabang_nama: branch.nama,
      active_perusahaan: branch.nomormhperusahaan,
      active_perusahaan_nama: branch.perusahaan_nama
    };

    const encryptedSession = await encrypt(updatedPayload);
    const cookieStore = await cookies();
    
    cookieStore.set("session", encryptedSession, {
      expires: new Date(session.expires),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Cabang berhasil dipilih" });

  } catch (error: any) {
    console.error("Select Branch API Error:", error);
    return NextResponse.json({ success: false, error: "Gagal memproses pilihan cabang" }, { status: 500 });
  }
}
