import { NextResponse } from "next/server";
import { ScheduleService } from "@/lib/services/travel/schedule";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    
    const schedules = await ScheduleService.getSchedules({ 
      date: date || undefined,
      origin: origin || undefined,
      destination: destination || undefined
    });
    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const schedule = await ScheduleService.createSchedule(body);
    return NextResponse.json({ success: true, data: schedule });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
