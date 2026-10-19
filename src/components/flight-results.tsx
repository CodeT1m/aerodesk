import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Cabin, FlightSummary } from "@/lib/types";
import { cabinLabel, durationLabel, formatMoney } from "@/lib/types";
import Link from "next/link";

type Props = {
  title: string;
  flights: FlightSummary[];
  cabin: Cabin;
  selectHref: (flightId: string) => string;
  emptyLabel: string;
};

export function FlightResults({ title, flights, cabin, selectHref, emptyLabel }: Props) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary">{cabinLabel(cabin)}</Badge>
      </div>
      {flights.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{emptyLabel}</CardContent>
        </Card>
      ) : (
        flights.map((flight) => {
          const fare = flight.fares.find((item) => item.cabin === cabin);
          return (
            <Card key={flight._id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/15 hover:ring-sky-400/30">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">
                    {flight.origin.iata} → {flight.destination.iata}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {flight.flightNumber} · {durationLabel(flight.departureAt, flight.arrivalAt)}
                  </p>
                  <p className="mt-2 text-sm">
                    {new Date(flight.departureAt).toLocaleString()} –{" "}
                    {new Date(flight.arrivalAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-sky-700 dark:text-sky-300">
                      {fare ? formatMoney(fare.amountCents, fare.currency) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Base fare / adult</p>
                  </div>
                  <Button asChild>
                    <Link href={selectHref(flight._id)}>Select</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </section>
  );
}
