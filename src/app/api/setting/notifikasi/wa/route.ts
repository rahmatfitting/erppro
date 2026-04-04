import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Ensure table exists safely
async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS mhsetting_notifikasi_wa (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      target_number VARCHAR(20) NOT NULL,
      gateway_url VARCHAR(255) DEFAULT 'https://api.fonnte.com/send',
      gateway_token VARCHAR(255),
      is_enabled TINYINT(1) DEFAULT 1,
      send_time TIME DEFAULT '20:00:00',
      dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
      diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const settings: any = await executeQuery(`SELECT * FROM mhsetting_notifikasi_wa LIMIT 1`);
    
    if ((settings as any[]).length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { 
          target_number: '', 
          gateway_url: 'https://api.fonnte.com/send', 
          gateway_token: '', 
          is_enabled: 0,
          send_time: '20:00:00'
        } 
      });
    }

    return NextResponse.json({ success: true, data: settings[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const body = await request.json();
    const { target_number, gateway_url, gateway_token, is_enabled, send_time } = body;

    const existing: any = await executeQuery(`SELECT nomor FROM mhsetting_notifikasi_wa LIMIT 1`);

    if ((existing as any[]).length > 0) {
      await executeQuery(
        `UPDATE mhsetting_notifikasi_wa SET 
          target_number = ?, 
          gateway_url = ?, 
          gateway_token = ?, 
          is_enabled = ?, 
          send_time = ? 
        WHERE nomor = ?`,
        [target_number, gateway_url || 'https://api.fonnte.com/send', gateway_token, is_enabled ? 1 : 0, send_time || '20:00:00', existing[0].nomor]
      );
    } else {
      await executeQuery(
        `INSERT INTO mhsetting_notifikasi_wa (target_number, gateway_url, gateway_token, is_enabled, send_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [target_number, gateway_url || 'https://api.fonnte.com/send', gateway_token, is_enabled ? 1 : 0, send_time || '20:00:00']
      );
    }

    return NextResponse.json({ success: true, message: 'Setting WA berhasil disimpan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
