import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Get Header
    const [headerRows]: any = await pool.query(
      `SELECT * FROM thubahbentuk WHERE kode = ? OR nomor = ?`,
      [id, id]
    );

    if (headerRows.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const header = headerRows[0];

    // 2. Get Details
    const [detailsRows]: any = await pool.query(
      `SELECT * FROM tdubahbentuk WHERE nomorthubahbentuk = ?`,
      [header.nomor]
    );

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...header, 
        jumlah_tujuan: Number(header.jumlah_tujuan || 0),
        items: detailsRows.map((d: any) => ({
          ...d,
          jumlah: Number(d.jumlah || 0)
        }))
      } 
    });
  } catch (error: any) {
    console.error("GET Transformasi Detail Error:", error);
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

    const [headerRows]: any = await pool.query(`SELECT nomor, kode FROM thubahbentuk WHERE kode = ? OR nomor = ?`, [id, id]);
    if (headerRows.length === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }
    const headerId = headerRows[0].nomor;
    const kode = headerRows[0].kode;

    let query = "";
    const queryParams: any[] = [];
    
    if (action === 'approve') {
       query = `UPDATE thubahbentuk SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`;
       queryParams.push(user || 'Admin', headerId);
       await addLogHistory("Transformasi Barang", headerId, "APPROVE", user || "Admin", `Menyetujui Transformasi ${kode}`);
    } else if (action === 'disapprove') {
       query = `UPDATE thubahbentuk SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`;
       queryParams.push(headerId);
       await addLogHistory("Transformasi Barang", headerId, "DISAPPROVE", user || "Admin", `Membatalkan Approval Transformasi ${kode}`);
    } else if (action === 'delete') {
       query = `UPDATE thubahbentuk SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`;
       queryParams.push(user || 'Admin', headerId);
       await addLogHistory("Transformasi Barang", headerId, "DELETE", user || "Admin", `Menghapus Transformasi ${kode}`);
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    await pool.query(query, queryParams);

    return NextResponse.json({ success: true, message: `Berhasil ${action} data` });
  } catch (error: any) {
    console.error("PATCH Transformasi Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
