import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const leads = await prisma.business.findMany({
      orderBy: {
        created_at: 'desc',
      },
      take: 100, // Limit to recent 100 leads
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Fetch Leads Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
