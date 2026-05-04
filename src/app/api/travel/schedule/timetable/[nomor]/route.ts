import { NextResponse } from "next/server";
import { ScheduleService } from "@/lib/services/travel/schedule";
import { getSession } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ nomor: string }> }
) {
  try {
    const { nomor } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await ScheduleService.deleteSchedule(parseInt(nomor));
    return NextResponse.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
