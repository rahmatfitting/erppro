import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const timelineId = searchParams.get('timeline_id');

    let query = `
      SELECT pr.*, t.title as timeline_name 
      FROM progress_reports pr
      LEFT JOIN project_timelines t ON pr.timeline_id = t.nomor
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      query += ` AND pr.project_id = ?`;
      params.push(projectId);
    }
    
    if (timelineId) {
      query += ` AND pr.timeline_id = ?`;
      params.push(timelineId);
    }

    query += ` ORDER BY pr.report_date DESC, pr.nomor DESC`;

    const [data] = await pool.query(query, params);

    // Fetch documentation for each report
    const reportIds = (data as any[]).map(r => r.nomor);
    if (reportIds.length > 0) {
      const [docs] = await pool.query(`SELECT * FROM field_documentations WHERE progress_report_id IN (${reportIds.join(',')})`);
      (data as any[]).forEach(report => {
        report.documentations = (docs as any[]).filter(d => d.progress_report_id === report.nomor);
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Progress Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const formData = await request.formData();
    
    const project_id = formData.get('project_id');
    const timeline_id = formData.get('timeline_id');
    const report_date = formData.get('report_date');
    const progress_percentage = parseFloat(formData.get('progress_percentage') as string || '0');
    const description = formData.get('description') || '';
    const weather = formData.get('weather') || '';
    const issues = formData.get('issues') || '';
    const file = formData.get('file') as File;

    if (!project_id || !timeline_id || !report_date) {
      return NextResponse.json({ success: false, error: "Project, Timeline, dan Tanggal wajib diisi" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: "Foto dokumentasi WAJIB dilampirkan" }, { status: 400 });
    }

    // SECURITY CHECK: Validate MIME Type strictly for Images
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/webp', 'image/gif', 'image/heic'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Akses Ditolak: Hanya file berformat gambar yang diizinkan!" }, { status: 403 });
    }

    // SECURITY CHECK: Validate Extension to prevent malicious PHP/JS shell execution
    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'];
    if (ext && !allowedExtensions.includes(ext)) {
      return NextResponse.json({ success: false, error: "Akses Ditolak: Ekstensi file tidak aman!" }, { status: 403 });
    }

    await connection.beginTransaction();

    // 1. Insert Progress Report
    const prQuery = `
      INSERT INTO progress_reports (project_id, timeline_id, report_date, progress_percentage, description, weather, issues, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Field Team')
    `;
    const [prResult]: any = await connection.execute(prQuery, [
      project_id, timeline_id, report_date, progress_percentage, description, weather, issues
    ]);
    const reportId = prResult.insertId;

    // 2. Process File Upload (Local Storage)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public/uploads/projects');
    await mkdir(uploadDir, { recursive: true });
    
    // Generate absolutely unique filename using random UUID and timestamp
    const uniqueId = crypto.randomUUID().split('-')[0];
    const finalExt = ext || '.jpg';
    const filename = `pr_${project_id}_${timeline_id}_${Date.now()}_${uniqueId}${finalExt}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    const file_url = `/uploads/projects/${filename}`;

    // 3. Insert Field Documentation
    const docQuery = `
      INSERT INTO field_documentations (project_id, progress_report_id, file_url, description, file_type, uploaded_by)
      VALUES (?, ?, ?, ?, 'image', 'Field Team')
    `;
    await connection.execute(docQuery, [project_id, reportId, file_url, 'Progress Photo']);

    // 4. Update Timeline Progress
    // We update to the maximum progress reported for this timeline so far
    await connection.execute(`
      UPDATE project_timelines 
      SET progress_percentage = (
        SELECT MAX(progress_percentage) FROM progress_reports WHERE timeline_id = ?
      ),
      status = CASE 
        WHEN (SELECT MAX(progress_percentage) FROM progress_reports WHERE timeline_id = ?) >= 100 THEN 'done'
        ELSE 'ongoing'
      END
      WHERE nomor = ?
    `, [timeline_id, timeline_id, timeline_id]);

    // 5. Update Overall Project Progress (Average of all timelines)
    await connection.execute(`
      UPDATE projects p
      SET p.progress_percentage = (
        SELECT COALESCE(AVG(progress_percentage), 0) FROM project_timelines WHERE project_id = ?
      ),
      p.status = CASE 
        WHEN (SELECT COALESCE(AVG(progress_percentage), 0) FROM project_timelines WHERE project_id = ?) >= 100 THEN 'finished'
        ELSE 'ongoing'
      END
      WHERE p.nomor = ?
    `, [project_id, project_id, project_id]);

    await connection.commit();
    
    return NextResponse.json({ 
      success: true, 
      message: "Progress Report & Foto berhasil diupload!" 
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("POST Progress Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
