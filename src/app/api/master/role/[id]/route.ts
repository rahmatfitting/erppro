import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    // Get Grup Info
    const groups: any = await executeQuery(
      `SELECT * FROM mhusergrup WHERE nomor = ?`, 
      [id]
    );

    if (groups.length === 0) {
      return NextResponse.json({ success: false, error: "Grup tidak ditemukan" }, { status: 404 });
    }

    // Get Hak Akses List
    const hak_akses: any = await executeQuery(
      `SELECT menu, akses_view as \`view\`, akses_add as \`add\`, akses_edit as \`edit\`, 
              akses_delete as \`delete\`, akses_approve as \`approve\` 
       FROM mhusergruphakakses WHERE grup_id = ?`, 
       [id]
    );

    // Format boolean
    const formattedHakAkses = hak_akses.map((h: any) => ({
      menu: h.menu,
      view: h.view === 1,
      add: h.add === 1,
      edit: h.edit === 1,
      delete: h.delete === 1,
      approve: h.approve === 1
    }));

    return NextResponse.json({ 
       success: true, 
       data: { 
         ...groups[0], 
         hak_akses: formattedHakAkses 
       } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  const connection = await pool.getConnection();
  try {
    const params = await context.params;
    const id = params.id; 
    const body = await request.json();
    const { nama, keterangan, hak_akses } = body;

    await connection.beginTransaction();

    // 1. Update Grup Info
    await connection.execute(
      `UPDATE mhusergrup SET nama = ?, keterangan = ? WHERE nomor = ?`,
      [nama, keterangan || '', id]
    );

    // 2. Refresh Hak Akses (Delete old -> Insert new)
    await connection.execute(`DELETE FROM mhusergruphakakses WHERE grup_id = ?`, [id]);

    if (hak_akses && Array.isArray(hak_akses)) {
      for (const hak of hak_akses) {
        await connection.execute(
          `INSERT INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id, 
            hak.menu, 
            hak.view ? 1 : 0, 
            hak.add ? 1 : 0, 
            hak.edit ? 1 : 0, 
            hak.delete ? 1 : 0, 
            hak.approve ? 1 : 0
          ]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Grup dan Hak Akses berhasil diperbarui" });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;

    const result: any = await executeQuery(
      `UPDATE mhusergrup SET status_aktif = 0 WHERE nomor = ? AND kode != 'SA'`, 
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Grup tidak ditemukan atau merupakan Super Admin" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Grup berhasil dinonaktifkan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
