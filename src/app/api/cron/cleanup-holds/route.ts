import { NextResponse } from "next/server";
import { deleteExpiredUnpaidHolds } from "@/lib/booking/cleanup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await deleteExpiredUnpaidHolds());
  } catch {
    return NextResponse.json({ error: "Hold cleanup failed" }, { status: 503 });
  }
}
