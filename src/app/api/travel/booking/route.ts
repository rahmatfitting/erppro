import { NextResponse } from "next/server";
import { BookingService } from "@/lib/services/travel/booking";
import { TravelWAService } from "@/lib/services/travel/whatsapp";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    
    // 1. Lock Seats & Create Booking
    const booking = await BookingService.lockSeats({
      ...body,
      userId: session?.id
    });

    // 2. Fetch full booking details for WA (with relations)
    // In a real app, lockSeats would return the full object or we fetch it here
    
    // 3. Send WhatsApp Confirmation (Asynchronous)
    // TravelWAService.sendBookingConfirmation(booking);

    return NextResponse.json({ success: true, data: booking });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const bookings = await BookingService.getBookings();
    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
