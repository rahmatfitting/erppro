import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Helper function to send notifications to configured users for a module
// Call this from any transaction API after successful save
export async function sendNotification(modul: string, judul: string, isi: string, ref_kode: string, ref_id: number = 0) {
  try {
    const recipients: any = await executeQuery(
      `SELECT nomor_user FROM mhnotifikasi_setting WHERE modul = ? AND status_aktif = 1`,
      [modul]
    );

    // Initialize webpush inline to avoid top-level issues if web-push is missing during build
    const webpush = (await import('@/lib/webpush')).default;
    
    for (const r of recipients as any[]) {
      // 1. Insert into database
      await executeQuery(
        `INSERT INTO mhnotifikasi (nomor_user, modul, judul, isi, ref_kode, ref_id, dibaca, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
        [r.nomor_user, modul, judul, isi, ref_kode, ref_id]
      );

      // 2. Fetch push subscriptions for this user
      try {
        const subs: any = await executeQuery(
          `SELECT endpoint, p256dh, auth FROM mhuser_push_subscriptions WHERE nomor_user = ?`,
          [r.nomor_user]
        );
        
        for (const sub of subs as any[]) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const payload = JSON.stringify({
            title: judul,
            body: isi,
            url: '/' // Can be modified depending on module later
          });

          await webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              // Subscription expired or invalid, remove it
              await executeQuery(`DELETE FROM mhuser_push_subscriptions WHERE endpoint = ?`, [sub.endpoint]);
            } else {
              console.error('Web Push Error:', err);
            }
          });
        }
      } catch (pushErr) {
        console.error('Push notification query error:', pushErr);
      }
    }
  } catch (e) {
    // Notification failure should not block transaction
    console.error('Notification send error:', e);
  }
}

// API to create a notification (called internally)
export async function POST(request: Request) {
  try {
    const { nomor_user, modul, judul, isi, ref_kode, ref_id } = await request.json();
    const result: any = await executeQuery(
      `INSERT INTO mhnotifikasi (nomor_user, modul, judul, isi, ref_kode, ref_id, dibaca, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [nomor_user, modul, judul, isi, ref_kode, ref_id || 0]
    );
    return NextResponse.json({ success: true, data: { id: (result as any).insertId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
