import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data import tidak valid atau kosong" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Check for duplicate names in the entire batch
    const names = items.map((it: any) => it.nama?.trim()).filter(Boolean);
    if (names.length !== items.length) {
       return NextResponse.json({ success: false, error: "Semua baris harus memiliki Nama Barang" }, { status: 400 });
    }

    // Check against existing database records
    const [existing]: any = await connection.query(
      `SELECT nama FROM mhbarang WHERE nama IN (?) AND status_aktif = 1`,
      [names]
    );

    if (existing.length > 0) {
      const duplicateNames = existing.map((e: any) => e.nama).join(', ');
      await connection.rollback();
      return NextResponse.json({ 
        success: false, 
        error: `Import gagal. Nama barang berikut sudah ada: ${duplicateNames}. Semua data batal diimport.` 
      }, { status: 400 });
    }

    // 2. Lookup Satuan and Kategori IDs
    const uniqueSatuan = [...new Set(items.map((it: any) => it.satuan?.trim()).filter(Boolean))];
    const uniqueKategori = [...new Set(items.map((it: any) => it.kategori?.trim()).filter(Boolean))];

    const satuanMap: Record<string, number> = {};
    const kategoriMap: Record<string, number> = {};

    if (uniqueSatuan.length > 0) {
      const [satuanRows]: any = await connection.query(
        `SELECT nomor, nama FROM mhsatuan WHERE nama IN (?) AND status_aktif = 1`,
        [uniqueSatuan]
      );
      satuanRows.forEach((r: any) => { satuanMap[r.nama] = r.nomor; });

      const missingSatuan = uniqueSatuan.filter(s => !satuanMap[s as string]);
      if (missingSatuan.length > 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: `Import gagal. Satuan berikut tidak ditemukan: ${missingSatuan.join(', ')}` }, { status: 400 });
      }
    }

    if (uniqueKategori.length > 0) {
      const [kategoriRows]: any = await connection.query(
        `SELECT nomor, nama FROM mhkategori WHERE nama IN (?) AND status_aktif = 1`,
        [uniqueKategori]
      );
      kategoriRows.forEach((r: any) => { kategoriMap[r.nama] = r.nomor; });

      const missingKategori = uniqueKategori.filter(k => !kategoriMap[k as string]);
      if (missingKategori.length > 0) {
        await connection.rollback();
        return NextResponse.json({ success: false, error: `Import gagal. Kategori berikut tidak ditemukan: ${missingKategori.join(', ')}` }, { status: 400 });
      }
    }

    // 3. Auto-generate codes
    const [rows]: any = await connection.execute(
      `SELECT kode FROM mhbarang ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].kode;
      const numMatch = lastKode.match(/\d+/);
      if (numMatch) {
         nextNum = parseInt(numMatch[0]) + 1;
      }
    }

    const insertQuery = `
      INSERT INTO mhbarang 
      (kode, nama, gambar, nomormhsatuan, satuan, nomormhkategori, kategori, harga_beli, harga_jual, dibuat_oleh) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      const generatedKode = String(nextNum).padStart(3, '0');
      const sName = item.satuan?.trim();
      const kName = item.kategori?.trim();
      
      await connection.execute(insertQuery, [
        generatedKode,
        item.nama?.trim(),
        JSON.stringify([]),
        satuanMap[sName] || null,
        sName || 'PCS',
        kategoriMap[kName] || 0,
        kName || '',
        parseFloat(item.harga_beli || 0),
        parseFloat(item.harga_jual || 0),
        'Admin'
      ]);

      nextNum++;
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: `${items.length} item berhasil diimport.` });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Import Barang Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
