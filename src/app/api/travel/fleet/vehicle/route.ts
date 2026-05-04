import { NextResponse } from "next/server";
import { FleetService } from "@/lib/services/travel/fleet";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const vehicles = await FleetService.getAllVehicles();
    return NextResponse.json({ success: true, data: vehicles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const vehicle = await FleetService.createVehicle(body);
    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
