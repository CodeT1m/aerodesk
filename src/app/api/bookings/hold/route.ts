import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlements } from "@/lib/entitlements";
import { createHold } from "@/lib/booking/service";
import { CABINS, TRIP_TYPES } from "@/lib/types";

const bodySchema = z.object({
  tripType: z.enum(TRIP_TYPES),
  cabin: z.enum(CABINS),
  idempotencyKey: z.string().min(8),
  passengers: z
    .array(
      z.object({
        givenName: z.string().min(1),
        familyName: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .min(1)
    .max(4),
  legs: z
    .array(
      z.object({
        flightId: z.string().min(1),
        cabin: z.enum(CABINS),
        seatCodes: z.array(z.string()).min(1),
      }),
    )
    .min(1)
    .max(2),
});

export async function POST(request: Request) {
  const { userId, waiveSeatFees } = await getEntitlements();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const json: unknown = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking request" }, { status: 400 });
  }

  try {
    const booking = await createHold({
      clerkUserId: userId,
      waiveSeatFees,
      ...parsed.data,
    });
    return NextResponse.json({ bookingId: booking._id, status: booking.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not hold seats" },
      { status: 409 },
    );
  }
}
