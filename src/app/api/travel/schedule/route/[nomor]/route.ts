import { NextResponse } from "next/server";
import { ScheduleService } from "@/lib/services/travel/schedule";
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
    const route = await ScheduleService.updateRoute(parseInt(nomor), body);
    return NextResponse.json({ success: true, data: route });
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

    await ScheduleService.deleteRoute(parseInt(nomor));
    return NextResponse.json({ success: true, message: "Route deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
