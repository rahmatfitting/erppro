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
      SELECT ps.*, s.name as subcon_name, s.specialization, s.phone
      FROM project_subcontractors ps
      JOIN subcontractors s ON ps.subcontractor_id = s.nomor
      WHERE ps.project_id = ?
    `;
    
    const [data] = await pool.query(query, [projectId]);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Assign Subcon Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, subcontractor_id, role, start_date, end_date } = body;

    if (!project_id || !subcontractor_id) {
      return NextResponse.json({ success: false, error: "Project dan Subkontraktor wajib dipilih" }, { status: 400 });
    }

    const query = `
      INSERT INTO project_subcontractors (project_id, subcontractor_id, role, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [project_id, subcontractor_id, role || '', start_date || null, end_date || null];

    const result: any = await executeQuery(query, params);
    
    return NextResponse.json({ 
      success: true, 
      message: "Subkontraktor berhasil di assign ke Project", 
      data: { nomor: result.insertId } 
    });
  } catch (error: any) {
    console.error("POST Assign Subcon Error:", error);
    // Handle Duplicate if we added UNIQUE constraint
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
