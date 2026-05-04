import { NextResponse } from "next/server";
import { ScheduleService } from "@/lib/services/travel/schedule";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const routes = await ScheduleService.getAllRoutes();
    return NextResponse.json({ success: true, data: routes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const route = await ScheduleService.createRoute(body.origin, body.destination);
    return NextResponse.json({ success: true, data: route });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
