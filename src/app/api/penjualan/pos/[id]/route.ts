import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    // Get Header based on id (kode)
    const headerQuery = `SELECT * FROM thpos WHERE kode = ?`;
    const headerData: any = await executeQuery(headerQuery, [id]);

    if (!headerData || headerData.length === 0) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const header = headerData[0];

    // Get Details
    const detailsQuery = `SELECT * FROM tdpos WHERE nomorthpos = ?`;
    const items = await executeQuery(detailsQuery, [header.nomor]);

    return NextResponse.json({ success: true, data: { ...header, items } });
  } catch (error: any) {
    console.error("GET POS Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const { action, user } = await request.json();
    
    if (!action) {
       return NextResponse.json({ success: false, error: "Action diperlukan" }, { status: 400 });
    }

    let query = "";
    const sqlParams: any[] = [];
    
    if (action === 'delete' || action === 'void') {
       query = `UPDATE thpos SET status_aktif = 0 WHERE kode = ?`;
       sqlParams.push(id);
    } else {
       return NextResponse.json({ success: false, error: "Action tidak valid" }, { status: 400 });
    }

    const result: any = await executeQuery(query, sqlParams);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    // Log the action
    const rows: any = await executeQuery(`SELECT nomor FROM thpos WHERE kode = ?`, [id]);
    if (rows[0]) {
      await addLogHistory("POS Kasir", rows[0].nomor, action === 'void' ? "DELETE" : "EDIT", user || "Admin", `Membatalkan (Void) Transaksi POS ${id}`);
    }

    return NextResponse.json({ success: true, message: `Transaksi berhasil di-${action}` });
  } catch (error: any) {
    console.error("PATCH POS Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
