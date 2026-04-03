import { NextResponse } from 'next/server';
import { publicVapidKey } from '@/lib/webpush';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  
  return NextResponse.json({ 
    success: true, 
    data: { publicKey: publicVapidKey } 
  });
}
