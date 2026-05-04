import { NextResponse } from "next/server";
import { BookingService } from "@/lib/services/travel/booking";

export async function GET() {
  try {
    const payments = await BookingService.getPayments();
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Confirm payment
export async function PATCH(request: Request) {
  try {
    const { bookingId } = await request.json();
    const result = await BookingService.confirmPayment(bookingId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
