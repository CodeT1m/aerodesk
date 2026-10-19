import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlements } from "@/lib/entitlements";
import { processDummyPayment } from "@/lib/booking/service";

const bodySchema = z.object({
  bookingId: z.string().min(1),
  outcome: z.enum(["success", "decline"]),
});

export async function POST(request: Request) {
  const { userId } = await getEntitlements();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const json: unknown = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  }

  try {
    const booking = await processDummyPayment({
      clerkUserId: userId,
      bookingId: parsed.data.bookingId,
      outcome: parsed.data.outcome,
    });
    return NextResponse.json({ bookingId: booking._id, status: booking.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dummy payment failed" },
      { status: 409 },
    );
  }
}
