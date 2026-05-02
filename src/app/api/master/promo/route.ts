import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || ''; // 'active' or 'inactive'
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM mhpromo WHERE 1=1 `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status === 'active') {
      query += ` AND status_aktif = 1 AND (tanggal_mulai <= CURDATE() OR tanggal_mulai IS NULL) AND (tanggal_selesai >= CURDATE() OR tanggal_selesai IS NULL)`;
    } else if (status === 'inactive') {
      query += ` AND status_aktif = 0`;
    }

    query += ` ORDER BY prioritas DESC, nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [data] = await pool.query(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Master Promo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { 
      nama, keterangan, jenis_promo, nilai_promo, min_pembelian, max_diskon,
      tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, hari_berlaku,
      status_aktif, is_stackable, prioritas, limit_per_user, limit_total,
      kode_voucher, metode_aplikasi, target_pengguna,
      items, branches, member_levels // nested data
    } = body;

    if (!nama || !jenis_promo) {
      return NextResponse.json({ success: false, error: "Nama dan Jenis Promo wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Generate Kode PROMO-XXXX
    const [rows]: any = await connection.execute(
      `SELECT kode FROM mhpromo WHERE kode LIKE 'PROMO-%' ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].kode;
      const numMatch = lastKode.match(/\d+/);
      if (numMatch) {
         nextNum = parseInt(numMatch[0]) + 1;
      }
    }
    const generatedKode = `PROMO-${String(nextNum).padStart(4, '0')}`;

    // 2. Insert Header
    const queryHeader = `
      INSERT INTO mhpromo 
      (kode, nama, keterangan, jenis_promo, nilai_promo, min_pembelian, max_diskon,
       tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, hari_berlaku,
       status_aktif, is_stackable, prioritas, limit_per_user, limit_total,
       kode_voucher, metode_aplikasi, target_pengguna, dibuat_oleh) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result]: any = await connection.execute(queryHeader, [
      generatedKode, nama, keterangan || '', jenis_promo, parseFloat(nilai_promo || 0),
      parseFloat(min_pembelian || 0), parseFloat(max_diskon || 0),
      tanggal_mulai || null, tanggal_selesai || null,
      jam_mulai || '00:00:00', jam_selesai || '23:59:59',
      JSON.stringify(hari_berlaku || ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]),
      status_aktif ?? 1, is_stackable ?? 0, prioritas ?? 0,
      limit_per_user ?? 0, limit_total ?? 0,
      kode_voucher || null, metode_aplikasi || 'AUTO', target_pengguna || 'ALL', 'Admin'
    ]);

    const promoId = result.insertId;

    // 3. Insert Items (Products/Categories)
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await connection.execute(
          `INSERT INTO mhpromo_item (nomormhpromo, tipe_target, target_id) VALUES (?, ?, ?)`,
          [promoId, item.tipe_target, item.target_id]
        );
      }
    }

    // 4. Insert Branches
    if (branches && Array.isArray(branches)) {
      for (const branchId of branches) {
        await connection.execute(
          `INSERT INTO mhpromo_branch (nomormhpromo, nomormhcabang) VALUES (?, ?)`,
          [promoId, branchId]
        );
      }
    }

    // 5. Insert Member Levels
    if (member_levels && Array.isArray(member_levels)) {
      for (const level of member_levels) {
        await connection.execute(
          `INSERT INTO mhpromo_member_level (nomormhpromo, level) VALUES (?, ?)`,
          [promoId, level]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ 
      success: true, 
      message: "Promo berhasil dibuat", 
      data: { nomor: promoId, kode: generatedKode } 
    });

  } catch (error: any) {
    await connection.rollback();
    console.error("POST Master Promo Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
