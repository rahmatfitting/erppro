import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || '';
    const auth = keys?.auth || '';

    // Check if it already exists
    const existing: any = await executeQuery(
      `SELECT id FROM mhuser_push_subscriptions WHERE endpoint = ?`,
      [endpoint]
    );

    if (existing.length === 0) {
      await executeQuery(
        `INSERT INTO mhuser_push_subscriptions (nomor_user, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)`,
        [session.id, endpoint, p256dh, auth]
      );
    } else {
      // Update user id just in case a different user logged into same browser
      await executeQuery(
        `UPDATE mhuser_push_subscriptions SET nomor_user = ? WHERE endpoint = ?`,
        [session.id, endpoint]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscribe Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const endpoint = body?.endpoint;

    if (endpoint) {
      await executeQuery(`DELETE FROM mhuser_push_subscriptions WHERE endpoint = ?`, [endpoint]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
