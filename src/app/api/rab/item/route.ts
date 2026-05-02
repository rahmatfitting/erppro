import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { section_id, mhbarang_id, item_name, category, volume, unit, unit_price } = body;

    if (!section_id || !item_name) {
      return NextResponse.json({ success: false, error: "ID Section dan Nama Item wajb diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    const subtotal = (parseFloat(volume || 0) * parseFloat(unit_price || 0));

    const query = `
      INSERT INTO rab_items (section_id, mhbarang_id, item_name, category, volume, unit, unit_price, subtotal) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: any = await connection.execute(query, [
      section_id, 
      mhbarang_id || null, 
      item_name, 
      category || 'material', 
      volume || 0, 
      unit || '', 
      unit_price || 0, 
      subtotal
    ]);
    
    // Recalculate RAB total
    const [sec]: any = await connection.execute("SELECT rab_id FROM rab_sections WHERE id = ?", [section_id]);
    if (sec && sec.length > 0) {
       await connection.execute(`
         UPDATE rabs r 
         SET total_amount = COALESCE((
            SELECT SUM(i.subtotal) FROM rab_items i 
            JOIN rab_sections s ON i.section_id = s.id 
            WHERE s.rab_id = r.id
         ), 0)
         WHERE id = ?
       `, [sec[0].rab_id]);
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Item ditambahkan", data: { id: result.insertId, subtotal } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Item Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { id, mhbarang_id, item_name, category, volume, unit, unit_price } = body;

    if (!id) return NextResponse.json({ success: false, error: "ID Item wajib" }, { status: 400 });

    await connection.beginTransaction();

    const subtotal = (parseFloat(volume || 0) * parseFloat(unit_price || 0));

    const query = `
      UPDATE rab_items 
      SET mhbarang_id = ?, item_name = ?, category = ?, volume = ?, unit = ?, unit_price = ?, subtotal = ?
      WHERE id = ?
    `;
    await connection.execute(query, [
      mhbarang_id || null, 
      item_name, 
      category, 
      volume, 
      unit, 
      unit_price, 
      subtotal,
      id
    ]);
    
    // Recalculate RAB total
    const [itemRec]: any = await connection.execute("SELECT section_id FROM rab_items WHERE id = ?", [id]);
    if (itemRec && itemRec.length > 0) {
       const [sec]: any = await connection.execute("SELECT rab_id FROM rab_sections WHERE id = ?", [itemRec[0].section_id]);
       if (sec && sec.length > 0) {
          await connection.execute(`
            UPDATE rabs r 
            SET total_amount = COALESCE((
               SELECT SUM(i.subtotal) FROM rab_items i 
               JOIN rab_sections s ON i.section_id = s.id 
               WHERE s.rab_id = r.id
            ), 0)
            WHERE id = ?
          `, [sec[0].rab_id]);
       }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Item diupdate", data: { subtotal } });
  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Item Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID wajib" }, { status: 400 });

    await connection.beginTransaction();

    const [itemRec]: any = await connection.execute("SELECT section_id FROM rab_items WHERE id = ?", [id]);
    let rabId = null;

    if (itemRec && itemRec.length > 0) {
       const [sec]: any = await connection.execute("SELECT rab_id FROM rab_sections WHERE id = ?", [itemRec[0].section_id]);
       if (sec && sec.length > 0) {
          rabId = sec[0].rab_id;
       }
    }

    await connection.execute(`DELETE FROM rab_items WHERE id = ?`, [id]);
    
    if (rabId) {
      // Recalculate total_amount on rabs
      await connection.execute(`
        UPDATE rabs r 
        SET total_amount = COALESCE((
            SELECT SUM(i.subtotal) FROM rab_items i 
            JOIN rab_sections s ON i.section_id = s.id 
            WHERE s.rab_id = r.id
        ), 0)
        WHERE id = ?
      `, [rabId]);
    }
    
    await connection.commit();
    return NextResponse.json({ success: true, message: "Item berhasil dihapus" });
  } catch (error: any) {
    await connection.rollback();
    console.error("DELETE Item Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
