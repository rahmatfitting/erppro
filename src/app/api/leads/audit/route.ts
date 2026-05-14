import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/ai/audit';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // 1. Get lead from DB
    const lead = await prisma.business.findUnique({
      where: { id }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 2. Generate Audit
    const auditData = await AuditService.generateAudit(lead);

    // 3. Update lead in DB
    const updated = await prisma.business.update({
      where: { id },
      data: {
        audit_data: auditData as any,
        ai_notes: auditData.analysis,
        status: 'contacted'
      }
    });

    return NextResponse.json({ 
      message: 'Audit generated successfully',
      audit: auditData,
      lead: updated
    });

  } catch (error: any) {
    console.error('Audit Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
