import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LiveFlight } from "@/lib/aviationstack";

function displayTime(value: string | null): string {
  if (!value) return "Time unavailable";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function location(terminal: string | null, gate: string | null): string | null {
  const details = [terminal ? `Terminal ${terminal}` : null, gate ? `Gate ${gate}` : null].filter(Boolean);
  return details.length ? details.join(" · ") : null;
}

export function LiveFlightResults({
  origin,
  destination,
  flights,
  available,
}: {
  origin: string;
  destination: string;
  flights: LiveFlight[];
  available: boolean;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">Live flight status · {origin} → {destination}</h2>
        <p className="text-sm text-muted-foreground">
          Current Aviationstack flight feed, refreshed at most once an hour. Times shown in UTC.
          These flights have no fare or seat inventory in Aerodesk.
        </p>
      </div>
      {!available || flights.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {available ? "No live flights found for this route right now." : "Live flight status is temporarily unavailable. Sample booking flights are still below."}
          </CardContent>
        </Card>
      ) : (
        flights.slice(0, 8).map((flight) => (
          <Card key={flight.id}>
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{flight.flightNumber} · {flight.airline}</p>
                <p className="text-sm text-muted-foreground">Departure {displayTime(flight.departureAt)}{location(flight.departureTerminal, flight.departureGate) ? ` · ${location(flight.departureTerminal, flight.departureGate)}` : ""}</p>
                <p className="text-sm text-muted-foreground">Arrival {displayTime(flight.arrivalAt)}{location(flight.arrivalTerminal, flight.arrivalGate) ? ` · ${location(flight.arrivalTerminal, flight.arrivalGate)}` : ""}</p>
              </div>
              <Badge variant="secondary" className="w-fit capitalize">{flight.status.replaceAll("_", " ")}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
