import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ success: false, error: "project_id wajib diisi" }, { status: 400 });
    }

    const query = `
      SELECT t.* 
      FROM project_timelines t
      WHERE t.project_id = ?
      ORDER BY t.start_date ASC, t.nomor ASC
    `;
    
    const [data] = await pool.query(query, [projectId]);

    return NextResponse.json({ 
      success: true, 
      data
    });
  } catch (error: any) {
    console.error("GET Timelines Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, title, description, start_date, end_date } = body;

    if (!project_id || !title) {
      return NextResponse.json({ success: false, error: "project_id dan Nama Tahapan (title) wajib diisi" }, { status: 400 });
    }

    const query = `
      INSERT INTO project_timelines (project_id, title, description, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    const params = [
      project_id, 
      title, 
      description || '', 
      start_date || null, 
      end_date || null
    ];

    const result: any = await executeQuery(query, params);
    
    return NextResponse.json({ 
      success: true, 
      message: "Timeline/Tahapan berhasil ditambahkan", 
      data: { nomor: result.insertId } 
    });
  } catch (error: any) {
    console.error("POST Timeline Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
