import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // Fetch Header
    const rabQuery = `
      SELECT r.*, p.project_name, q.quotation_number 
      FROM rabs r
      LEFT JOIN projects p ON r.project_id = p.nomor
      LEFT JOIN quotations q ON r.quotation_id = q.id
      WHERE r.id = ?
    `;
    const [header]: any = await executeQuery(rabQuery, [id]);

    if (!header) {
      return NextResponse.json({ success: false, error: "RAB tidak ditemukan" }, { status: 404 });
    }

    // Fetch Sections
    const sections: any = await executeQuery(`SELECT * FROM rab_sections WHERE rab_id = ? ORDER BY order_number ASC`, [id]);

    // Fetch Items
    const items: any = await executeQuery(`SELECT * FROM rab_items WHERE section_id IN (SELECT id FROM rab_sections WHERE rab_id = ?)`, [id]);

    // Construct Nested Structure
    header.sections = sections.map((sec: any) => {
       sec.items = items.filter((item: any) => item.section_id === sec.id);
       // Calculate section subtotal dynamically from items just to be safe
       sec.subtotal = sec.items.reduce((acc: number, item: any) => acc + parseFloat(item.subtotal || 0), 0);
       return sec;
    });

    return NextResponse.json({ success: true, data: header });
  } catch (error: any) {
    console.error("GET RAB Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const connection = await pool.getConnection();
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, name, project_id, action } = body;

    await connection.beginTransaction();

    if (action === 'NEW_VERSION') {
       // Validate current is draft or approved
       const [curr]: any = await connection.execute("SELECT * FROM rabs WHERE id = ?", [id]);
       if (!curr.length) throw new Error("RAB Induk tidak ditemukan");
       
       const c = curr[0];

       // Freeze current to history
       await connection.execute("UPDATE rabs SET status = 'history' WHERE id = ?", [id]);

       // Create new version head
       const newV = c.version + 1;
       const rabNumber = `RAB-${Date.now()}`; // Or append -v2 to original
       
       const q = `
         INSERT INTO rabs (project_id, quotation_id, rab_number, name, total_amount, version, status, parent_id)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
       `;
       const [res]: any = await connection.execute(q, [c.project_id, c.quotation_id, rabNumber, c.name, c.total_amount, newV, c.id]);
       const newRabId = res.insertId;

       // Clone tree
       const [sections]: any = await connection.execute("SELECT * FROM rab_sections WHERE rab_id = ?", [id]);
       for (const sec of sections) {
          const [secRes]: any = await connection.execute(
             "INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, ?, ?)",
             [newRabId, sec.name, sec.order_number]
          );
          const newSecId = secRes.insertId;

          const [items]: any = await connection.execute("SELECT * FROM rab_items WHERE section_id = ?", [sec.id]);
          for (const item of items) {
             await connection.execute(
                "INSERT INTO rab_items (section_id, mhbarang_id, item_name, category, volume, unit, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [newSecId, item.mhbarang_id, item.item_name, item.category, item.volume, item.unit, item.unit_price, item.subtotal]
             );
          }
       }
       await connection.commit();
       return NextResponse.json({ success: true, message: `Versi v${newV} berhasil dibuat`, newId: newRabId });
    } else {
       // Normal update header
       let updateQ = "UPDATE rabs SET ";
       const updateP = [];
       if (status) { updateQ += "status = ?, "; updateP.push(status); }
       if (name) { updateQ += "name = ?, "; updateP.push(name); }
       if (project_id) { updateQ += "project_id = ?, "; updateP.push(project_id); }
       
       updateQ = updateQ.slice(0, -2);
       updateQ += " WHERE id = ?";
       updateP.push(id);

       await connection.execute(updateQ, updateP);
       await connection.commit();
       return NextResponse.json({ success: true, message: "RAB berhasil diperbarui" });
    }
  } catch (error: any) {
    await connection.rollback();
    console.error("PUT RAB Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
