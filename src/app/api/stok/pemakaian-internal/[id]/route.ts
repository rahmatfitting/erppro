import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Get Header
    const headers: any = await executeQuery(
      `SELECT * FROM thpemakaianinternal WHERE kode = ? OR nomor = ?`,
      [id, id]
    );

    if (headers.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const header = headers[0];

    // 2. Get Details
    const details = await executeQuery(
      `SELECT * FROM tdpemakaianinternal WHERE nomorthpemakaianinternal = ?`,
      [header.nomor]
    );

    return NextResponse.json({ success: true, data: { ...header, items: details } });
  } catch (error: any) {
    console.error("GET Pemakaian Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, user } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ success: false, error: "ID dan action diperlukan" }, { status: 400 });
    }

    const headers: any = await executeQuery(`SELECT nomor, kode FROM thpemakaianinternal WHERE kode = ?`, [id]);
    if (headers.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    const headerId = headers[0].nomor;
    const kode = headers[0].kode;

    let query = "";
    const queryParams: any[] = [];
    
    if (action === 'approve') {
       query = `UPDATE thpemakaianinternal SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`;
       queryParams.push(user || 'Admin', headerId);
       await addLogHistory("Pemakaian Internal", headerId, "APPROVE", user || "Admin", `Menyetujui Pemakaian Internal ${kode}`);
    } else if (action === 'disapprove') {
       query = `UPDATE thpemakaianinternal SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`;
       queryParams.push(headerId);
       await addLogHistory("Pemakaian Internal", headerId, "DISAPPROVE", user || "Admin", `Membatalkan Approval Pemakaian Internal ${kode}`);
    } else if (action === 'delete') {
       query = `UPDATE thpemakaianinternal SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`;
       queryParams.push(user || 'Admin', headerId);
       await addLogHistory("Pemakaian Internal", headerId, "DELETE", user || "Admin", `Menghapus Pemakaian Internal ${kode}`);
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    await executeQuery(query, queryParams);

    return NextResponse.json({ success: true, message: `Berhasil ${action} data` });
  } catch (error: any) {
    console.error("PATCH Pemakaian Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
