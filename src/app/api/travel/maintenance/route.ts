import { NextResponse } from "next/server";
import { MaintenanceService } from "@/lib/services/travel/maintenance";

export async function GET() {
  try {
    const status = await MaintenanceService.getFleetStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
