import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM mhcustomer WHERE 1=1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (kode LIKE ? OR nama LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      query += ` AND dibuat_pada >= ?`;
      params.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      query += ` AND dibuat_pada <= ?`;
      params.push(endDate + ' 23:59:59');
    }

    query += ` ORDER BY nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = await executeQuery(query, params);
    
    // Count total for pagination
    let countQuery = `SELECT COUNT(*) as total FROM mhcustomer WHERE 1=1`;
    const countParams: any[] = [];
    if (keyword) {
      countQuery += ` AND (kode LIKE ? OR nama LIKE ?)`;
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (startDate) {
      countQuery += ` AND dibuat_pada >= ?`;
      countParams.push(startDate + ' 00:00:00');
    }

    if (endDate) {
      countQuery += ` AND dibuat_pada <= ?`;
      countParams.push(endDate + ' 23:59:59');
    }
    const totalResult: any = await executeQuery(countQuery, countParams);
    const total = totalResult[0].total;

    return NextResponse.json({ 
      success: true, 
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("GET Customer Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { nama, alamat, telepon, email, kontak_person } = body;

    if (!nama) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Auto-generate code: 001, 002, ...
    const [rows]: any = await connection.execute(
      `SELECT kode FROM mhcustomer ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].kode;
      const numMatch = lastKode.match(/\d+/);
      if (numMatch) {
         nextNum = parseInt(numMatch[0]) + 1;
      }
    }
    const generatedKode = String(nextNum).padStart(3, '0');

    const query = `
      INSERT INTO mhcustomer (kode, nama, alamat, telepon, email, kontak_person, dibuat_oleh)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [generatedKode, nama, alamat || '', telepon || '', email || '', kontak_person || '', 'Admin'];

    const [result]: any = await connection.execute(query, params);
    
    await connection.commit();
    return NextResponse.json({ success: true, message: "Customer berhasil ditambahkan", data: { nomor: result.insertId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Customer Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
       return NextResponse.json({ success: false, error: "Kode sudah digunakan" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status_aktif } = await request.json();
    
    if (!id || status_aktif === undefined) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    const query = `UPDATE mhcustomer SET status_aktif = ? WHERE nomor = ?`;
    await executeQuery(query, [status_aktif, id]);

    return NextResponse.json({ success: true, message: "Status customer berhasil diupdate" });
  } catch (error: any) {
    console.error("PATCH Customer Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
