import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.nama as client_name 
      FROM projects p
      LEFT JOIN mhcustomer c ON p.client_id = c.nomor
      WHERE 1=1
    `;
    const params: any[] = [];

    if (keyword) {
      query += ` AND (p.project_code LIKE ? OR p.project_name LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [data] = await pool.query(query, params);
    
    // Count total for pagination
    let countQuery = `SELECT COUNT(*) as total FROM projects p WHERE 1=1`;
    const countParams: any[] = [];
    if (keyword) {
      countQuery += ` AND (p.project_code LIKE ? OR p.project_name LIKE ?)`;
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      countQuery += ` AND p.status = ?`;
      countParams.push(status);
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
    console.error("GET Projects Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { project_name, client_id, location, start_date, end_date, budget_total } = body;

    if (!project_name) {
      return NextResponse.json({ success: false, error: "Nama Proyek wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    // Auto-generate project_code: PRJ-001, PRJ-002
    const [rows]: any = await connection.execute(
      `SELECT project_code FROM projects ORDER BY nomor DESC LIMIT 1 FOR UPDATE`
    );
    
    let nextNum = 1;
    if (rows.length > 0) {
      const lastKode = rows[0].project_code;
      const numMatch = lastKode.match(/\d+/);
      if (numMatch) {
         nextNum = parseInt(numMatch[0]) + 1;
      }
    }
    const generatedKode = `PRJ-${String(nextNum).padStart(3, '0')}`;

    const query = `
      INSERT INTO projects (project_code, project_name, client_id, location, start_date, end_date, budget_total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'planning')
    `;
    const params = [
      generatedKode, 
      project_name, 
      client_id || null, 
      location || '', 
      start_date || null, 
      end_date || null, 
      budget_total || 0
    ];

    const [result]: any = await connection.execute(query, params);
    
    await connection.commit();
    return NextResponse.json({ 
      success: true, 
      message: "Proyek berhasil dibuat", 
      data: { nomor: result.insertId, project_code: generatedKode } 
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Project Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { nomor, project_name, client_id, location, start_date, end_date, budget_total, progress_percentage } = body;

    if (!nomor || !project_name) {
      return NextResponse.json({ success: false, error: "ID dan Nama Proyek wajib diisi" }, { status: 400 });
    }

    await connection.beginTransaction();

    const query = `
      UPDATE projects 
      SET project_name = ?, client_id = ?, location = ?, start_date = ?, end_date = ?, budget_total = ?
      WHERE nomor = ?
    `;
    const params = [
      project_name, 
      client_id || null, 
      location || '', 
      start_date || null, 
      end_date || null, 
      budget_total || 0,
      nomor
    ];

    await connection.execute(query, params);
    
    // Optionally update progress_percentage directly if provided (e.g. from Timeline sync)
    if (progress_percentage !== undefined) {
      await connection.execute("UPDATE projects SET progress_percentage = ? WHERE nomor = ?", [progress_percentage, nomor]);
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Proyek berhasil diupdate" });
  } catch (error: any) {
    await connection.rollback();
    console.error("PUT Project Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
