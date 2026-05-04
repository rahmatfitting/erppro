import { NextResponse } from "next/server";
import { FleetService } from "@/lib/services/travel/fleet";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const drivers = await FleetService.getAllDrivers();
    return NextResponse.json({ success: true, data: drivers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const driver = await FleetService.createDriver(body);
    return NextResponse.json({ success: true, data: driver });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
