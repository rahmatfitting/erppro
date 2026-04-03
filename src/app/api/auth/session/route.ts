import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengambil sesi" }, { status: 500 });
  }
}
