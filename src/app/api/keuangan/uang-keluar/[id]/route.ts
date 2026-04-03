import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const headerData: any = await executeQuery(`SELECT * FROM thuangkeluar WHERE nomor = ?`, [id]);
    if (headerData.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const header = headerData[0];
    if (header.jenis == 1 && header.status_aktif == 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });

    const items: any = await executeQuery(`SELECT * FROM tduangkeluar WHERE nomorthuangkeluar = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);
    const selisih: any = await executeQuery(`SELECT * FROM tduangkeluarselisih WHERE nomorthuangkeluar = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);
    return NextResponse.json({ success: true, data: { ...header, items, selisih } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const { action, user } = await request.json();

    const header: any = await executeQuery(`SELECT nomor, kode, jenis FROM thuangkeluar WHERE nomor = ?`, [id]);
    if (header.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const { nomor, kode, jenis } = header[0];
    const menuTitle = jenis == 1 ? "Uang Keluar Utama" : "Uang Keluar Lain";

    if (action === 'approve') {
      await executeQuery(`UPDATE thuangkeluar SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`, [user || 'Admin', nomor]);
      await addLogHistory(menuTitle, nomor, "APPROVE", user || "Admin", `Menyetujui ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }

    if (action === 'disapprove') {
      await executeQuery(`UPDATE thuangkeluar SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`, [nomor]);
      await addLogHistory(menuTitle, nomor, "DISAPPROVE", user || "Admin", `Membatalkan Persetujuan ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Batal Setuju' });
    }

    if (action === 'delete') {
      await executeQuery(`UPDATE thuangkeluar SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`, [user || 'Admin', nomor]);
      await addLogHistory(menuTitle, nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
