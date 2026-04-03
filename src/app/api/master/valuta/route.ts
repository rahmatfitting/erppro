import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '1';

    let query = `SELECT * FROM mhvaluta WHERE status_aktif = ?`;
    const params: any[] = [status];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY kode ASC`;

    const data = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Valuta Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode, nama, kurs, keterangan } = body;

    // Validate
    if (!kode || !nama) {
      return NextResponse.json({ success: false, error: "Kode dan Nama Valuta wajib diisi" }, { status: 400 });
    }

    // Check duplicate kode
    const checkKode: any = await executeQuery(
      `SELECT nomor FROM mhvaluta WHERE kode = ?`, 
      [kode]
    );

    if (checkKode.length > 0) {
      return NextResponse.json({ success: false, error: "Kode Valuta sudah digunakan" }, { status: 400 });
    }

    const result: any = await executeQuery(
      `INSERT INTO mhvaluta (kode, nama, kurs, keterangan, dibuat_oleh) VALUES (?, ?, ?, ?, ?)`,
      [kode.toUpperCase(), nama, parseFloat(kurs) || 1, keterangan || '', 'Admin']
    );

    return NextResponse.json({ success: true, message: "Valuta berhasil ditambahkan", data: result });
  } catch (error: any) {
    console.error("POST Valuta Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
