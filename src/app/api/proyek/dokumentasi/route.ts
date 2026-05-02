import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let query = `
      SELECT d.*, p.project_name, p.project_code, pr.report_date, t.title as timeline_name
      FROM field_documentations d
      LEFT JOIN projects p ON d.project_id = p.nomor
      LEFT JOIN progress_reports pr ON d.progress_report_id = pr.nomor
      LEFT JOIN project_timelines t ON pr.timeline_id = t.nomor
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND d.project_id = ?`;
      params.push(projectId);
    }
    
    query += ` ORDER BY d.created_at DESC LIMIT 100`;

    const [data] = await pool.query(query, params);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Documentation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
