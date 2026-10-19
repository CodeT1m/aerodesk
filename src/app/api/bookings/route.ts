import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/entitlements";
import { MY_BOOKINGS_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";

export async function GET() {
  const { userId } = await getEntitlements();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const bookings = await client
    .withConfig({ useCdn: false, token: process.env.SANITY_API_READ_TOKEN })
    .fetch(MY_BOOKINGS_QUERY, { clerkUserId: userId });

  return NextResponse.json({ bookings });
}
