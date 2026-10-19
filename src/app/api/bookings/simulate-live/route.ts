import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveFlights } from "@/lib/aviationstack";
import { canSimulateLiveFlight } from "@/lib/booking/live-eligibility";
import { simulatedFlightDocument } from "@/lib/booking/live-simulation";
import { getEntitlements } from "@/lib/entitlements";
import { getFreshClient } from "@/sanity/lib/fresh";
import { getWriteClient } from "@/sanity/lib/write-client";

const bodySchema = z.object({
  flightId: z.string().min(3).max(150),
  origin: z.string().regex(/^[A-Z]{3}$/),
  destination: z.string().regex(/^[A-Z]{3}$/),
  travelDate: z.iso.date(),
});

export async function POST(request: Request) {
  const { userId } = await getEntitlements();
  if (!userId) return NextResponse.json({ error: "Sign in to simulate this booking." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid flight selection" }, { status: 400 });

  const { flightId, origin, destination, travelDate } = parsed.data;
  if (origin === destination) return NextResponse.json({ error: "Choose different airports" }, { status: 400 });
  const chosenDay = Date.parse(`${travelDate}T00:00:00Z`);
  const today = Date.now();
  if (chosenDay < today - 86_400_000 || chosenDay > today + 60 * 86_400_000) {
    return NextResponse.json({ error: "Choose a travel date within the next 60 days." }, { status: 400 });
  }

  try {
    const live = await getLiveFlights(origin, destination);
    const selected = live.flights.find((flight) => flight.id === flightId);
    if (!selected || !canSimulateLiveFlight(selected)) {
      return NextResponse.json({ error: "This live flight is no longer available for simulation." }, { status: 409 });
    }

    const airports = await getFreshClient().fetch<{ _id: string; iata: string }[]>(
      `*[_type == "airport" && iata in $codes]{_id, iata}`,
      { codes: [origin, destination] },
    );
    const originId = airports.find((airport) => airport.iata === origin)?._id;
    const destinationId = airports.find((airport) => airport.iata === destination)?._id;
    if (!originId || !destinationId) {
      return NextResponse.json({ error: "This route is not available in Aerodesk." }, { status: 409 });
    }

    const document = simulatedFlightDocument(selected, originId, destinationId, travelDate);
    await getWriteClient().createIfNotExists(document, { visibility: "sync" });
    return NextResponse.json({ flightId: document._id, departureDate: document.departureAt.slice(0, 10) });
  } catch {
    return NextResponse.json({ error: "Could not prepare this simulated flight. Try again." }, { status: 503 });
  }
}
