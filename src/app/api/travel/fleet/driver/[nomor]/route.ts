import { NextResponse } from "next/server";
import { FleetService } from "@/lib/services/travel/fleet";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ nomor: string }> }
) {
  try {
    const { nomor } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const driver = await FleetService.updateDriver(parseInt(nomor), body);
    return NextResponse.json({ success: true, data: driver });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ nomor: string }> }
) {
  try {
    const { nomor } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await FleetService.deleteDriver(parseInt(nomor));
    return NextResponse.json({ success: true, message: "Driver deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
