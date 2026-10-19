import { createHash } from "node:crypto";
import type { LiveFlight } from "@/lib/aviationstack";

export function simulatedFlightDocument(
  flight: LiveFlight,
  originId: string,
  destinationId: string,
  travelDate: string,
  now = Date.now(),
) {
  const durationMs = Date.parse(flight.arrivalAt ?? "") - Date.parse(flight.departureAt);
  const durationHours = Math.max(1, durationMs / 3_600_000);
  const economyCents = Math.round((14900 + durationHours * 4500) / 100) * 100;
  const liveUtcTime = new Date(flight.departureAt).toISOString().slice(11, 19);
  const requestedDeparture = Date.parse(`${travelDate}T${liveUtcTime}Z`);
  const daysAhead = requestedDeparture <= now ? Math.floor((now - requestedDeparture) / 86_400_000) + 1 : 0;
  const departureAt = new Date(requestedDeparture + daysAhead * 86_400_000).toISOString();
  const digest = createHash("sha256").update(`${flight.id}:${originId}:${destinationId}:${departureAt}`).digest("hex").slice(0, 24);
  const id = `sim-flight-${digest}`;

  return {
    _id: id,
    _type: "flightInstance",
    flightNumber: flight.flightNumber,
    origin: { _type: "reference", _ref: originId },
    destination: { _type: "reference", _ref: destinationId },
    departureAt,
    arrivalAt: new Date(Date.parse(departureAt) + durationMs).toISOString(),
    aircraft: { _type: "reference", _ref: "aircraft-a321neo" },
    fares: (["economy", "business", "first"] as const).map((cabin) => ({
      _key: cabin,
      _type: "cabinFare",
      cabin,
      amountCents: cabin === "economy" ? economyCents : cabin === "business" ? economyCents * 3 : economyCents * 5,
      currency: "usd",
    })),
    status: "scheduled",
    simulationSource: "aviationstack",
  };
}
