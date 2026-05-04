import { NextResponse } from "next/server";
import { BookingService } from "@/lib/services/travel/booking";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json({ success: false, error: "Schedule ID is required" }, { status: 400 });
    }

    const manifest = await BookingService.getManifest(parseInt(scheduleId));
    return NextResponse.json({ success: true, data: manifest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
