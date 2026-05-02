import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const [headerRows]: any = await pool.query(`SELECT * FROM mhpromo WHERE nomor = ?`, [id]);
    if (headerRows.length === 0) {
      return NextResponse.json({ success: false, error: "Promo tidak ditemukan" }, { status: 404 });
    }

    const promo = headerRows[0];

    // Get items
    const items = await executeQuery(`
      SELECT pi.*, b.nama as barang_nama 
      FROM mhpromo_item pi
      LEFT JOIN mhbarang b ON pi.target_id = b.nomor AND pi.tipe_target = 'PRODUCT'
      WHERE pi.nomormhpromo = ?
    `, [id]);
    // Get branches with names
    const [branches]: any = await pool.query(`
      SELECT pb.nomormhcabang, c.nama as cabang_nama 
      FROM mhpromo_branch pb
      LEFT JOIN mhcabang c ON pb.nomormhcabang = c.nomor
      WHERE pb.nomormhpromo = ?
    `, [id]);

    const [levels]: any = await pool.query(`SELECT level FROM mhpromo_member_level WHERE nomormhpromo = ?`, [id]);

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...promo, 
        items, 
        branches: branches.map((b: any) => ({ nomor: b.nomormhcabang, nama: b.cabang_nama })),
        member_levels: levels.map((l: any) => l.level)
      } 
    });
  } catch (error: any) {
    console.error("GET Promo Detail Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      nama, keterangan, jenis_promo, nilai_promo, min_pembelian, max_diskon,
      tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, hari_berlaku,
      status_aktif, is_stackable, prioritas, limit_per_user, limit_total,
      kode_voucher, metode_aplikasi, target_pengguna,
      items, branches, member_levels
    } = body;

    await connection.beginTransaction();

    // 1. Update Header
    const queryUpdate = `
      UPDATE mhpromo SET
        nama = ?, keterangan = ?, jenis_promo = ?, nilai_promo = ?, 
        min_pembelian = ?, max_diskon = ?, tanggal_mulai = ?, 
        tanggal_selesai = ?, jam_mulai = ?, jam_selesai = ?, 
        hari_berlaku = ?, status_aktif = ?, is_stackable = ?, 
        prioritas = ?, limit_per_user = ?, limit_total = ?, 
        kode_voucher = ?, metode_aplikasi = ?, target_pengguna = ?
      WHERE nomor = ?
    `;

    await connection.execute(queryUpdate, [
      nama, keterangan || '', jenis_promo, parseFloat(nilai_promo || 0),
      parseFloat(min_pembelian || 0), parseFloat(max_diskon || 0),
      tanggal_mulai || null, tanggal_selesai || null,
      jam_mulai || '00:00:00', jam_selesai || '23:59:59',
      JSON.stringify(hari_berlaku || []), status_aktif ?? 1, is_stackable ?? 0,
      prioritas ?? 0, limit_per_user ?? 0, limit_total ?? 0,
      kode_voucher || null, metode_aplikasi || 'AUTO', target_pengguna || 'ALL', id
    ]);

    // 2. Refresh Items
    await connection.execute(`DELETE FROM mhpromo_item WHERE nomormhpromo = ?`, [id]);
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await connection.execute(
          `INSERT INTO mhpromo_item (nomormhpromo, tipe_target, target_id) VALUES (?, ?, ?)`,
          [id, item.tipe_target, item.target_id]
        );
      }
    }

    // 3. Refresh Branches
    await connection.execute(`DELETE FROM mhpromo_branch WHERE nomormhpromo = ?`, [id]);
    if (branches && Array.isArray(branches)) {
      for (const branchId of branches) {
        await connection.execute(
          `INSERT INTO mhpromo_branch (nomormhpromo, nomormhcabang) VALUES (?, ?)`,
          [id, branchId]
        );
      }
    }

    // 4. Refresh Member Levels
    await connection.execute(`DELETE FROM mhpromo_member_level WHERE nomormhpromo = ?`, [id]);
    if (member_levels && Array.isArray(member_levels)) {
      for (const level of member_levels) {
        await connection.execute(
          `INSERT INTO mhpromo_member_level (nomormhpromo, level) VALUES (?, ?)`,
          [id, level]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Promo berhasil diperbarui" });

  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Promo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    // Soft delete by status_aktif = 0
    await executeQuery(`UPDATE mhpromo SET status_aktif = 0 WHERE nomor = ?`, [id]);
    return NextResponse.json({ success: true, message: "Promo berhasil dinonaktifkan" });
  } catch (error: any) {
    console.error("DELETE Promo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
