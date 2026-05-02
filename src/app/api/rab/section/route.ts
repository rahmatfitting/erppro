import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rab_id, name, order_number } = body;

    if (!rab_id || !name) {
      return NextResponse.json({ success: false, error: "ID RAB dan Nama Pekerjaan wajb diisi" }, { status: 400 });
    }

    const query = `INSERT INTO rab_sections (rab_id, name, order_number) VALUES (?, ?, ?)`;
    const [result]: any = await executeQuery(query, [rab_id, name, order_number || 0]);
    
    return NextResponse.json({ success: true, message: "Tahapan pekerjaan ditambahkan", data: { id: result.insertId } });
  } catch (error: any) {
    console.error("POST Section Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID wajib" }, { status: 400 });

    // Since onDelete Cascade is set on rab_items -> section_id, it will delete items too.
    // However, we should recount the RAB total. Let's get the rab_id first.
    const [sec]: any = await executeQuery("SELECT rab_id FROM rab_sections WHERE id = ?", [id]);
    
    if (sec && sec.length > 0) {
       await executeQuery(`DELETE FROM rab_sections WHERE id = ?`, [id]);
       // Recalculate total_amount on rabs
       await executeQuery(`
         UPDATE rabs r 
         SET total_amount = COALESCE((
            SELECT SUM(i.subtotal) FROM rab_items i 
            JOIN rab_sections s ON i.section_id = s.id 
            WHERE s.rab_id = r.id
         ), 0)
         WHERE id = ?
       `, [sec[0].rab_id]);
    }
    
    return NextResponse.json({ success: true, message: "Pekerjaan dan seluruh item didalamnya berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Section Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
