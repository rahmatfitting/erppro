import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');

    let query = `
      SELECT r.*, p.project_name, q.quotation_number 
      FROM rabs r
      LEFT JOIN projects p ON r.project_id = p.nomor
      LEFT JOIN quotations q ON r.quotation_id = q.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND r.project_id = ?`;
      params.push(projectId);
    }
    
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const rabs = await executeQuery(query, params);
    return NextResponse.json({ success: true, data: rabs });
  } catch (error: any) {
    console.error("GET RAB List Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { project_id, name, template_type, copy_from_rab_id } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama RAB wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Generate RAB Number
    const rabNumber = `RAB-${Date.now()}`;

    const query = `
      INSERT INTO rabs (project_id, rab_number, name, total_amount, version, status)
      VALUES (?, ?, ?, 0, 1, 'draft')
    `;
    const [result]: any = await connection.execute(query, [project_id || null, rabNumber, name]);
    const newRabId = result.insertId;

    if (copy_from_rab_id) {
       // Copy Logic: copy sections
       const [sections]: any = await connection.execute("SELECT * FROM rab_sections WHERE rab_id = ?", [copy_from_rab_id]);
       for (const sec of sections) {
          const [secRes]: any = await connection.execute(
             "INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, ?, ?)",
             [newRabId, sec.name, sec.order_number]
          );
          const newSecId = secRes.insertId;

          // Copy items
          const [items]: any = await connection.execute("SELECT * FROM rab_items WHERE section_id = ?", [sec.id]);
          for (const item of items) {
             await connection.execute(
                "INSERT INTO rab_items (section_id, mhbarang_id, item_name, category, volume, unit, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [newSecId, item.mhbarang_id, item.item_name, item.category, item.volume, item.unit, item.unit_price, item.subtotal]
             );
          }
       }
       // Update total
       await connection.execute(`
         UPDATE rabs SET total_amount = (SELECT total_amount FROM rabs WHERE id = ?) WHERE id = ?
       `, [copy_from_rab_id, newRabId]);
    } else if (template_type === 'rumah_1_lantai') {
       // Template Setup Sample
       const [sec1]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Persiapan', 1)", [newRabId]);
       const [sec2]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Tanah & Pondasi', 2)", [newRabId]);
       const [sec3]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Struktur', 3)", [newRabId]);
    } else if (template_type === 'rumah_2_lantai') {
       const [sec1]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Persiapan', 1)", [newRabId]);
       const [sec2]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Tanah & Pondasi', 2)", [newRabId]);
       const [sec3]: any = await connection.execute("INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, 'Pekerjaan Struktur Lt 1 & 2', 3)", [newRabId]);
    }

    await connection.commit();
    return NextResponse.json({ success: true, data: { id: newRabId, rab_number: rabNumber } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST RAB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
