"use client";

import { SeatMap } from "@/components/seat-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cabin, FlightDetails, Passenger, SeatClaim, TripType } from "@/lib/types";
import { formatMoney } from "@/lib/types";
import { fareForCabin, quoteSeats, sumQuote } from "@/lib/booking/pricing";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  outbound: FlightDetails;
  inbound?: FlightDetails;
  tripType: TripType;
  cabin: Cabin;
  passengerCount: number;
  outboundClaims: SeatClaim[];
  inboundClaims: SeatClaim[];
  waiveSeatFees: boolean;
};

export function SeatBookingForm({
  outbound,
  inbound,
  tripType,
  cabin,
  passengerCount,
  outboundClaims,
  inboundClaims,
  waiveSeatFees,
}: Props) {
  const router = useRouter();
  const [outboundSeats, setOutboundSeats] = useState<string[]>([]);
  const [inboundSeats, setInboundSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>(
    Array.from({ length: passengerCount }, () => ({
      givenName: "",
      familyName: "",
      email: "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const quote = useMemo(() => {
    try {
      const outboundFare = fareForCabin(outbound.fares, cabin);
      if (!outboundFare || outboundSeats.length !== passengerCount) return null;
      const legs = [
        quoteSeats({
          seats: outbound.aircraft.seats,
          seatCodes: outboundSeats,
          cabin,
          fare: outboundFare,
          passengerCount,
          waiveSeatFees,
        }),
      ];
      if (inbound) {
        const inboundFare = fareForCabin(inbound.fares, cabin);
        if (!inboundFare || inboundSeats.length !== passengerCount) return null;
        legs.push(
          quoteSeats({
            seats: inbound.aircraft.seats,
            seatCodes: inboundSeats,
            cabin,
            fare: inboundFare,
            passengerCount,
            waiveSeatFees,
          }),
        );
      }
      return sumQuote(legs);
    } catch {
      return null;
    }
  }, [outbound, inbound, cabin, outboundSeats, inboundSeats, passengerCount, waiveSeatFees]);

  async function continueToCheckout() {
    setError(null);
    if (outboundSeats.length !== passengerCount) {
      setError("Select a seat for every passenger on the outbound flight.");
      return;
    }
    if (tripType === "roundtrip" && inboundSeats.length !== passengerCount) {
      setError("Select a seat for every passenger on the return flight.");
      return;
    }
    if (passengers.some((person) => !person.givenName || !person.familyName || !person.email)) {
      setError("Complete passenger details before continuing.");
      return;
    }

    setPending(true);
    try {
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.random()}`;
      const response = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripType,
          cabin,
          passengers,
          idempotencyKey,
          legs: [
            { flightId: outbound._id, cabin, seatCodes: outboundSeats },
            ...(inbound
              ? [{ flightId: inbound._id, cabin, seatCodes: inboundSeats }]
              : []),
          ],
        }),
      });
      const payload = (await response.json()) as { error?: string; bookingId?: string };
      if (!response.ok || !payload.bookingId) {
        throw new Error(payload.error ?? "Could not hold seats");
      }
      router.push(`/booking/checkout?bookingId=${encodeURIComponent(payload.bookingId)}`);
    } catch (holdError) {
      setError(holdError instanceof Error ? holdError.message : "Could not hold seats");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <SeatMap
        title={`${outbound.flightNumber} ${outbound.origin.iata} → ${outbound.destination.iata}`}
        cabin={cabin}
        seats={outbound.aircraft.seats}
        claims={outboundClaims}
        selected={outboundSeats}
        passengerCount={passengerCount}
        waiveSeatFees={waiveSeatFees}
        onChange={setOutboundSeats}
      />
      {inbound ? (
        <SeatMap
          title={`${inbound.flightNumber} ${inbound.origin.iata} → ${inbound.destination.iata}`}
          cabin={cabin}
          seats={inbound.aircraft.seats}
          claims={inboundClaims}
          selected={inboundSeats}
          passengerCount={passengerCount}
          waiveSeatFees={waiveSeatFees}
          onChange={setInboundSeats}
        />
      ) : null}
      <Card>
        <CardContent className="grid gap-4 p-5">
          <h2 className="font-semibold">Passengers</h2>
          {passengers.map((passenger, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor={`given-${index}`}>Given name</Label>
                <Input
                  id={`given-${index}`}
                  value={passenger.givenName}
                  onChange={(event) => {
                    const next = [...passengers];
                    next[index] = { ...passenger, givenName: event.target.value };
                    setPassengers(next);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`family-${index}`}>Family name</Label>
                <Input
                  id={`family-${index}`}
                  value={passenger.familyName}
                  onChange={(event) => {
                    const next = [...passengers];
                    next[index] = { ...passenger, familyName: event.target.value };
                    setPassengers(next);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`email-${index}`}>Email</Label>
                <Input
                  id={`email-${index}`}
                  type="email"
                  value={passenger.email}
                  onChange={(event) => {
                    const next = [...passengers];
                    next[index] = { ...passenger, email: event.target.value };
                    setPassengers(next);
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Total due at dummy checkout: {quote ? formatMoney(quote.totalCents, quote.currency) : "—"}
        </p>
        <Button onClick={() => void continueToCheckout()} disabled={pending}>
          {pending ? "Holding seats..." : "Continue to dummy payment"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
