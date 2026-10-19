"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Cabin, FlightSummary, SeatDefinition } from "@/lib/types";
import { cabinLabel, durationLabel, formatMoney, isCabin } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatClock(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function ToolStatus({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" aria-hidden />
      {label}
    </p>
  );
}

export function FlightTicketList({
  output,
  onUseFlight,
}: {
  output: unknown;
  onUseFlight?: (flightId: string, cabin: Cabin) => void;
}) {
  const record = asRecord(output);
  const flights = Array.isArray(record?.flights) ? (record.flights as FlightSummary[]) : [];
  const cabinValue = asString(record?.cabin);
  const cabin: Cabin = cabinValue && isCabin(cabinValue) ? cabinValue : "economy";
  if (flights.length === 0) return null;
  return (
    <div className="grid gap-3">
      {flights.slice(0, 6).map((flight) => (
        <FlightTicket
          key={flight._id}
          flight={flight}
          cabin={cabin}
          onUse={onUseFlight ? () => onUseFlight(flight._id, cabin) : undefined}
        />
      ))}
    </div>
  );
}

export function FlightTicket({
  flight,
  cabin,
  onUse,
}: {
  flight: FlightSummary;
  cabin?: Cabin;
  onUse?: () => void;
}) {
  const fare = cabin ? flight.fares?.find((item) => item.cabin === cabin) : flight.fares?.[0];
  const origin = flight.origin?.iata ?? "—";
  const destination = flight.destination?.iata ?? "—";
  return (
    <Card className="overflow-hidden border-0 bg-linear-to-br from-sky-50 via-background to-amber-50 ring-1 ring-sky-500/20 dark:from-sky-950/40 dark:via-background dark:to-amber-950/20">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[0.2em] text-sky-800 uppercase dark:text-sky-200">
            {flight.flightNumber}
          </p>
          {cabin ? <Badge variant="secondary">{cabinLabel(cabin)}</Badge> : null}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{origin}</p>
            <p className="text-xs text-muted-foreground">{formatClock(flight.departureAt)}</p>
          </div>
          <div className="grid justify-items-center gap-1 text-xs text-muted-foreground">
            <span className="h-px w-12 bg-sky-400/70" />
            {flight.departureAt && flight.arrivalAt
              ? durationLabel(flight.departureAt, flight.arrivalAt)
              : "Direct"}
            <span className="h-px w-12 bg-sky-400/70" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">{destination}</p>
            <p className="text-xs text-muted-foreground">{formatClock(flight.arrivalAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">{formatDay(flight.departureAt)}</p>
          <p className="font-semibold text-sky-800 dark:text-sky-200">
            {fare ? formatMoney(fare.amountCents, fare.currency) : "Fare on request"}
          </p>
        </div>
        {onUse ? (
          <Button type="button" size="sm" variant="outline" onClick={onUse}>
            Use this flight
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function FlightDetailsCard({ output, onUseFlight }: { output: unknown; onUseFlight?: (flightId: string) => void }) {
  const record = asRecord(output);
  if (!record || asString(record.error)) {
    return <p className="text-sm text-muted-foreground">That flight was not found.</p>;
  }
  const flight = record as unknown as FlightSummary;
  if (!flight._id) return null;
  return <FlightTicket flight={flight} onUse={onUseFlight ? () => onUseFlight(flight._id) : undefined} />;
}

export function SeatRecsCard({ output }: { output: unknown }) {
  const record = asRecord(output);
  if (!record) return null;
  if (asString(record.error)) {
    return <p className="text-sm text-muted-foreground">{asString(record.error)}</p>;
  }
  const seats = Array.isArray(record.seats) ? (record.seats as SeatDefinition[]) : [];
  const preference = asString(record.preference)?.replaceAll("_", " ") ?? "seat";
  const cabinValue = asString(record.cabin);
  const cabinLabelText = cabinValue && isCabin(cabinValue) ? cabinLabel(cabinValue) : cabinValue;
  return (
    <Card size="sm">
      <CardContent className="grid gap-3 px-4">
        <div>
          <p className="font-medium">
            {asString(record.flightNumber) ?? "Seat map"} · {preference}
          </p>
          <p className="text-xs text-muted-foreground">
            {cabinLabelText ?? "Cabin"} · advisory only until you confirm on the visual map
          </p>
        </div>
        {seats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching seats in that cabin.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {seats.map((seat) => (
              <span
                key={seat.code}
                className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-100"
              >
                {seat.code}
                {seat.extraFeeCents > 0 ? ` · ${formatMoney(seat.extraFeeCents)}` : ""}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CatalogChips({ output }: { output: unknown }) {
  const record = asRecord(output);
  const results = Array.isArray(record?.results) ? record.results : [];
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">Catalog search did not return matching articles.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {results.map((item) => {
        const doc = asRecord(item);
        if (!doc) return null;
        const title =
          asString(doc.title) ??
          asString(doc.flightNumber) ??
          asString(doc.name) ??
          asString(doc.iata) ??
          asString(doc._id) ??
          "Catalog item";
        return (
          <Badge key={asString(doc._id) ?? title} variant="outline">
            {asString(doc._type)?.replace(/([A-Z])/g, " $1") ?? "item"} · {title}
          </Badge>
        );
      })}
    </div>
  );
}

type Handoff = {
  href: string;
  label?: string;
  origin?: string;
  destination?: string;
  tripType?: string;
  departDate?: string;
  returnDate?: string;
  cabin?: string;
  passengers?: number;
};

export function HandoffConfirm({ output }: { output: unknown }) {
  const record = asRecord(output);
  const href = asString(record?.href);
  if (!href || !record) return null;
  return <ConfirmCard kind="booking" handoff={record as unknown as Handoff} href={href} />;
}

export function TripCards({ output }: { output: unknown }) {
  const trips = Array.isArray(output) ? output : output ? [output] : [];
  if (trips.length === 0) {
    return <p className="text-sm text-muted-foreground">No trips on this account yet.</p>;
  }
  return (
    <div className="grid gap-3">
      {trips.map((trip, index) => {
        const record = asRecord(trip);
        if (!record || asString(record.error)) {
          return (
            <p key={`err-${index}`} className="text-sm text-muted-foreground">
              {asString(record?.error) ?? "Booking not found"}
            </p>
          );
        }
        const checkout = asString(record.checkoutHref);
        const legs = Array.isArray(record.legs) ? record.legs : [];
        const route = legs
          .map((leg) => {
            const item = asRecord(leg);
            if (!item) return null;
            return `${asString(item.flightNumber) ?? ""} ${asString(item.originIata) ?? ""}→${asString(item.destinationIata) ?? ""}`.trim();
          })
          .filter(Boolean)
          .join(" · ");
        return (
          <ConfirmCard
            key={asString(record._id) ?? String(index)}
            kind="payment"
            href={checkout}
            title={asString(record.reference) ?? "Trip"}
            summary={[
              route || "Itinerary on file",
              `${asString(record.status)?.replaceAll("_", " ") ?? "status"} · ${asString(record.paymentStatus)?.replaceAll("_", " ") ?? "payment"}`,
            ]}
          />
        );
      })}
    </div>
  );
}

function ConfirmCard({
  kind,
  href,
  handoff,
  title,
  summary,
}: {
  kind: "booking" | "payment";
  href?: string;
  handoff?: Handoff;
  title?: string;
  summary?: string[];
}) {
  const [confirmed, setConfirmed] = useState(false);
  const heading =
    title ??
    (handoff
      ? `${handoff.origin ?? "?"} → ${handoff.destination ?? "?"}`
      : kind === "payment"
        ? "Resume dummy payment"
        : "Continue in Aerodesk");
  const details =
    summary ??
    [
      handoff?.tripType === "roundtrip" ? "Round trip" : "One way",
      handoff?.departDate,
      handoff?.returnDate ? `Return ${handoff.returnDate}` : null,
      handoff?.cabin && isCabin(handoff.cabin) ? cabinLabel(handoff.cabin) : handoff?.cabin,
      handoff?.passengers ? `${handoff.passengers} adult${handoff.passengers === 1 ? "" : "s"}` : null,
    ].filter(Boolean) as string[];
  const actionLabel =
    kind === "payment"
      ? "Open dummy checkout"
      : asString(handoff?.label) ?? (href?.startsWith("/booking/seats") ? "Open seat picker" : "Review flights");
  const prompt =
    kind === "payment"
      ? "Concierge cannot take payment. Confirm to leave chat and resume dummy checkout."
      : "Concierge cannot hold seats or charge a card. Confirm this itinerary, then continue in Aerodesk.";

  if (!href && kind === "payment") {
    return (
      <Card size="sm">
        <CardContent className="grid gap-1 px-4">
          <p className="font-medium">{heading}</p>
          <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!href) return null;

  return (
    <Card className="ring-1 ring-amber-500/30">
      <CardContent className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-amber-800 uppercase dark:text-amber-200">
            Confirm before you leave chat
          </p>
          <p className="mt-1 font-medium">{heading}</p>
          <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
        </div>
        <p className="text-sm">{prompt}</p>
        {confirmed ? (
          <Button asChild>
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirmed(true)}>
            Yes, this looks right
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowUpChips({
  items,
  disabled,
  onPick,
}: {
  items: { label: string; prompt: string }[];
  disabled?: boolean;
  onPick: (prompt: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onPick(item.prompt)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

export function toolStatusLabel(type: string): string {
  switch (type) {
    case "tool-searchFlights":
      return "Searching published flights";
    case "tool-getFlightDetails":
      return "Loading flight details";
    case "tool-getSeatMap":
      return "Reading the seat map";
    case "tool-recommendSeats":
      return "Ranking seats for that preference";
    case "tool-searchCatalogByMeaning":
      return "Searching catalog by meaning";
    case "tool-listMyTrips":
      return "Looking up your trips";
    case "tool-getMyBooking":
      return "Opening that booking";
    case "tool-draftItinerary":
    case "tool-getFlightsPageHref":
    case "tool-getSeatPickerHref":
      return "Preparing a booking handoff";
    default:
      return "Working";
  }
}
