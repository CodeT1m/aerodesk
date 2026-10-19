"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Booking = {
  _id: string;
  reference: string;
  totalCents: number;
  currency: string;
  status: string;
  paymentStatus: string;
  holdExpiresAt?: string;
  proSeatWaiverApplied?: boolean;
  simulationSource?: "aviationstack";
  legs: {
    flightNumber: string;
    originIata: string;
    destinationIata: string;
    cabin: string;
    seatCodes: string[];
    fare: { baseFareCents: number; seatFeeCents: number; seatFeeWaivedCents: number };
  }[];
};

export function DummyCheckout({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"success" | "decline">("success");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id, outcome }),
      });
      const payload = (await response.json()) as { error?: string; bookingId?: string };
      if (!response.ok || !payload.bookingId) {
        throw new Error(payload.error ?? "Payment failed");
      }
      router.push(`/booking/confirmation/${encodeURIComponent(payload.bookingId)}`);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Payment failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="overflow-hidden border-sky-500/20 bg-card/80 shadow-xl shadow-indigo-500/10">
      <CardHeader className="bg-linear-to-r from-sky-500/15 via-indigo-500/10 to-amber-400/10">
        <CardTitle>Dummy payment</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          This is a simulated charge. No card details are collected or sent to Stripe. Aerodesk Pro
          membership is billed separately through Clerk.
        </p>
        {booking.simulationSource === "aviationstack" ? (
          <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm">
            Live flight timing is used for this test. The fare and seats are simulated in Aerodesk, and no airline reservation is made.
          </p>
        ) : null}
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium">Booking {booking.reference}</p>
          {(booking.legs ?? []).map((leg) => (
            <p key={`${leg.flightNumber}-${leg.originIata}`}>
              {leg.flightNumber} {leg.originIata}→{leg.destinationIata} · seats {(leg.seatCodes ?? []).join(", ")}
            </p>
          ))}
          <p className="mt-2 text-lg font-semibold">
            {formatMoney(booking.totalCents, booking.currency)}
          </p>
          {booking.proSeatWaiverApplied ? (
            <p className="text-xs text-muted-foreground">Pro seat-selection waiver applied.</p>
          ) : null}
          {booking.holdExpiresAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Seat hold expires {new Date(booking.holdExpiresAt).toLocaleString()}. Leave and resume from My
              trips until then.
            </p>
          ) : null}
        </div>
        <RadioGroup
          value={outcome}
          onValueChange={(value) => setOutcome(value as "success" | "decline")}
          className="grid gap-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="success" value="success" />
            <Label htmlFor="success">Simulate successful payment</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="decline" value="decline" />
            <Label htmlFor="decline">Simulate declined payment</Label>
          </div>
        </RadioGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void pay()} disabled={pending}>
            {pending ? "Processing..." : "Process dummy payment"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/trips")} disabled={pending}>
            Save and finish later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
