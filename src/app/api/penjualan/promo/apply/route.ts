import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { calculatePromotions } from '@/lib/promoEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, context } = body;

    // context = { branchId, memberLevel, customerNomor, voucherCode }
    if (!cart || !Array.isArray(cart)) {
      return NextResponse.json({ success: false, error: "Cart data is required" }, { status: 400 });
    }

    const promoImpacts = await calculatePromotions(cart, context || {}, pool);

    const totalDiscount = promoImpacts.reduce((sum, p) => sum + p.totalDiscount, 0);

    return NextResponse.json({ 
      success: true, 
      data: {
        impacts: promoImpacts,
        totalDiscount
      } 
    });
  } catch (error: any) {
    console.error("Apply Promo API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
