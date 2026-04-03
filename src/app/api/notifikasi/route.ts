import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Notification inbox for current user
export async function GET(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.id || 0;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1';

    let query = `SELECT * FROM mhnotifikasi WHERE nomor_user = ?`;
    const params: any[] = [userId];
    if (unreadOnly) { query += ` AND dibaca = 0`; }
    query += ` ORDER BY dibuat_pada DESC LIMIT 50`;

    const data = await executeQuery(query, params);
    const unreadCount: any = await executeQuery(`SELECT COUNT(*) as cnt FROM mhnotifikasi WHERE nomor_user = ? AND dibaca = 0`, [userId]);
    return NextResponse.json({ success: true, data, unreadCount: (unreadCount as any)[0]?.cnt || 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, markAll } = body;
    const session = await getSession();
    const userId = session?.id || 0;

    if (markAll) {
      await executeQuery(`UPDATE mhnotifikasi SET dibaca = 1, dibaca_pada = NOW() WHERE nomor_user = ?`, [userId]);
    } else if (id) {
      await executeQuery(`UPDATE mhnotifikasi SET dibaca = 1, dibaca_pada = NOW() WHERE nomor = ?`, [id]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
