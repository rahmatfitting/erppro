import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM subcontractors WHERE 1=1`;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (name LIKE ? OR specialization LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Use executeQuery (pool.query) for LIMIT/OFFSET
    const [data] = await pool.query(query, params);
    
    // Count total for pagination
    let countQuery = `SELECT COUNT(*) as total FROM subcontractors WHERE 1=1`;
    const countParams: any[] = [];
    if (keyword) {
      countQuery += ` AND (name LIKE ? OR specialization LIKE ?)`;
      countParams.push(`%${keyword}%`, `%${keyword}%`);
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
    console.error("GET Subcontractors Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, specialization, address } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama Subkontraktor wajib diisi" }, { status: 400 });
    }

    const query = `
      INSERT INTO subcontractors (name, phone, specialization, address)
      VALUES (?, ?, ?, ?)
    `;
    const params = [name, phone || '', specialization || '', address || ''];

    const result: any = await executeQuery(query, params);
    
    return NextResponse.json({ success: true, message: "Subkontraktor berhasil ditambahkan", data: { nomor: result.insertId } });
  } catch (error: any) {
    console.error("POST Subcontractor Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { nomor, name, phone, specialization, address } = body;

    if (!nomor || !name) {
      return NextResponse.json({ success: false, error: "ID dan Nama Subkontraktor wajib diisi" }, { status: 400 });
    }

    const query = `
      UPDATE subcontractors 
      SET name = ?, phone = ?, specialization = ?, address = ?
      WHERE nomor = ?
    `;
    const params = [name, phone || '', specialization || '', address || '', nomor];

    await executeQuery(query, params);
    
    return NextResponse.json({ success: true, message: "Subkontraktor berhasil diupdate" });
  } catch (error: any) {
    console.error("PUT Subcontractor Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
