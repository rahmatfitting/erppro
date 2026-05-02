import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT q.*, r.rab_number, r.version as rab_version
      FROM quotations q
      LEFT JOIN rabs r ON q.id = r.quotation_id
      ORDER BY q.created_at DESC
    `;
    const quotations = await executeQuery(query);
    return NextResponse.json({ success: true, data: quotations });
  } catch (error: any) {
    console.error("GET Quotation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { rab_id, client_name, project_name, total_amount } = body;

    if (!rab_id) {
      return NextResponse.json({ success: false, error: "RAB ID wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    const quotationNumber = `PNW-${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];

    // Create Quotation
    const qQuery = `
      INSERT INTO quotations (quotation_number, project_id, client_name, project_name, date, total_amount, status)
      VALUES (?, (SELECT project_id FROM rabs WHERE id = ?), ?, ?, ?, ?, 'draft')
    `;
    const [result]: any = await connection.execute(qQuery, [quotationNumber, rab_id, client_name || '', project_name || '', date, total_amount || 0]);
    const qId = result.insertId;

    // Link RAB to Quotation
    await connection.execute(`UPDATE rabs SET quotation_id = ? WHERE id = ?`, [qId, rab_id]);

    await connection.commit();
    return NextResponse.json({ success: true, message: "Penawaran berhasil dibuat", data: { id: qId, quotation_number: quotationNumber } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Quotation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ success: false, error: "ID dan status wajib" }, { status: 400 });

    await executeQuery(`UPDATE quotations SET status = ? WHERE id = ?`, [status, id]);
    
    return NextResponse.json({ success: true, message: "Status penawaran diperbarui" });
  } catch (error: any) {
    console.error("PUT Quotation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
