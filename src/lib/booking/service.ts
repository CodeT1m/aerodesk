import { getWriteClient } from "@/sanity/lib/write-client";
import {
  BOOKING_BY_ID_QUERY,
  BOOKING_BY_IDEMPOTENCY_QUERY,
  FLIGHT_DETAILS_QUERY,
  SEAT_CLAIMS_QUERY,
} from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";
import type {
  BookingLegInput,
  Cabin,
  FlightDetails,
  Passenger,
  SeatClaim,
  TripType,
} from "../types";
import { HOLD_MS, bookingId, makeBookingReference, seatClaimId } from "./ids";
import { fareForCabin, quoteSeats, sumQuote, type QuotedLeg } from "./pricing";
import {
  assertRoundTripPair,
  assertSeatClaimable,
  assertTripShape,
  decideDummyPayment,
  isActiveClaim,
  reuseExistingHold,
} from "./rules";

const freshClient = client.withConfig({
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

type HoldInput = {
  clerkUserId: string;
  tripType: TripType;
  cabin: Cabin;
  passengers: Passenger[];
  legs: BookingLegInput[];
  idempotencyKey: string;
  waiveSeatFees: boolean;
  now?: number;
};

type PayInput = {
  clerkUserId: string;
  bookingId: string;
  outcome: "success" | "decline";
  now?: number;
};

async function loadFlight(flightId: string): Promise<FlightDetails> {
  const flight = await freshClient.fetch<FlightDetails | null>(FLIGHT_DETAILS_QUERY, {
    id: flightId,
  });
  if (!flight) {
    throw new Error("Flight not found");
  }
  if (flight.status !== "scheduled") {
    throw new Error(`${flight.flightNumber} is not available to book`);
  }
  return flight;
}

export async function createHold(input: HoldInput) {
  const now = input.now ?? Date.now();
  const existing = reuseExistingHold(
    await freshClient.fetch<{ _id: string; status: string } | null>(
      BOOKING_BY_IDEMPOTENCY_QUERY,
      { clerkUserId: input.clerkUserId, idempotencyKey: input.idempotencyKey },
    ),
  );
  if (existing) {
    return existing;
  }

  assertTripShape(input.tripType, input.legs.length);

  const loaded = await Promise.all(input.legs.map((leg) => loadFlight(leg.flightId)));
  assertRoundTripPair(input.tripType, loaded[0]!, loaded[1]);

  const quoted: QuotedLeg[] = [];
  const expiresAt = new Date(now + HOLD_MS).toISOString();
  const createdBookingId = bookingId(input.idempotencyKey);
  const write = getWriteClient();
  const tx = write.transaction();

  for (const [index, leg] of input.legs.entries()) {
    const flight = loaded[index];
    if (!flight) {
      throw new Error("Flight not found");
    }
    const fare = fareForCabin(flight.fares, input.cabin);
    if (!fare) {
      throw new Error(`No ${input.cabin} fare on ${flight.flightNumber}`);
    }

    const quote = quoteSeats({
      seats: flight.aircraft.seats,
      seatCodes: leg.seatCodes,
      cabin: input.cabin,
      fare,
      passengerCount: input.passengers.length,
      waiveSeatFees: input.waiveSeatFees,
    });
    quote.flightId = flight._id;
    quoted.push(quote);

    const claims = await freshClient.fetch<SeatClaim[]>(SEAT_CLAIMS_QUERY, {
      flightId: flight._id,
    });

    for (const seatCode of leg.seatCodes) {
      const claimId = seatClaimId(flight._id, seatCode);
      const current = claims.find((claim) => claim._id === claimId || claim.seatCode === seatCode);
      assertSeatClaimable(current, now, input.clerkUserId, seatCode, flight.flightNumber);

      const doc = {
        _id: claimId,
        _type: "seatClaim" as const,
        flight: { _type: "reference" as const, _ref: flight._id },
        seatCode,
        cabin: input.cabin,
        status: "held" as const,
        booking: { _type: "reference" as const, _ref: createdBookingId },
        clerkUserId: input.clerkUserId,
        expiresAt,
        holdKey: input.idempotencyKey,
      };

      if (!current) {
        tx.create(doc);
      } else if (!isActiveClaim(current, now) || current.clerkUserId === input.clerkUserId) {
        tx.patch(claimId, (patch) => {
          if (current._rev) {
            patch.ifRevisionId(current._rev);
          }
          return patch.set(doc);
        });
      } else {
        throw new Error(`Seat ${seatCode} on ${flight.flightNumber} is no longer available`);
      }
    }
  }

  const totals = sumQuote(quoted);
  tx.create({
    _id: createdBookingId,
    _type: "booking",
    reference: makeBookingReference(now),
    clerkUserId: input.clerkUserId,
    tripType: input.tripType,
    status: "held",
    paymentStatus: "unpaid",
    passengers: input.passengers,
    legs: loaded.map((flight, index) => ({
      _key: `leg${index}`,
      flight: { _type: "reference", _ref: flight._id },
      flightNumber: flight.flightNumber,
      originIata: flight.origin.iata,
      destinationIata: flight.destination.iata,
      departureAt: flight.departureAt,
      arrivalAt: flight.arrivalAt,
      cabin: input.cabin,
      seatCodes: input.legs[index]?.seatCodes ?? [],
      fare: {
        cabin: input.cabin,
        baseFareCents: quoted[index]?.baseFareCents ?? 0,
        seatFeeCents: quoted[index]?.seatFeeCents ?? 0,
        seatFeeWaivedCents: quoted[index]?.seatFeeWaivedCents ?? 0,
        currency: quoted[index]?.currency ?? "usd",
      },
    })),
    totalCents: totals.totalCents,
    currency: totals.currency,
    proSeatWaiverApplied: input.waiveSeatFees,
    simulationSource: loaded.some((flight) => flight.simulationSource === "aviationstack") ? "aviationstack" : undefined,
    idempotencyKey: input.idempotencyKey,
    holdExpiresAt: expiresAt,
  });

  try {
    await tx.commit({ visibility: "sync" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seat hold failed";
    if (message.toLowerCase().includes("already exists") || message.includes("409")) {
      throw new Error("One or more selected seats were just taken. Choose different seats.");
    }
    throw error;
  }

  return { _id: createdBookingId, status: "held" };
}

export async function processDummyPayment(input: PayInput) {
  const now = input.now ?? Date.now();
  const booking = await freshClient.fetch<{
    _id: string;
    _rev: string;
    clerkUserId: string;
    status: string;
    holdExpiresAt?: string;
    legs: { flight: { _id: string }; seatCodes: string[] }[];
  } | null>(BOOKING_BY_ID_QUERY, { id: input.bookingId });

  const decision = decideDummyPayment(booking, input.clerkUserId, input.outcome, now);
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (decision.action === "already_confirmed") {
    return booking;
  }

  const write = getWriteClient();

  if (decision.action === "decline") {
    await write
      .patch(booking._id)
      .ifRevisionId(booking._rev)
      .set({ status: "payment_failed", paymentStatus: "dummy_declined" })
      .commit({ visibility: "sync" });
    throw new Error("Dummy payment declined. Try again with a successful test outcome.");
  }

  const tx = write.transaction();
  tx.patch(booking._id, (patch) =>
    patch
      .ifRevisionId(booking._rev)
      .set({
        status: "confirmed",
        paymentStatus: "dummy_succeeded",
        confirmedAt: new Date(now).toISOString(),
      })
      .unset(["holdExpiresAt"]),
  );

  for (const leg of booking.legs) {
    for (const seatCode of leg.seatCodes) {
      const claimId = seatClaimId(leg.flight._id, seatCode);
      tx.patch(claimId, (patch) => patch.set({ status: "confirmed" }).unset(["expiresAt"]));
    }
  }

  await tx.commit({ visibility: "sync" });
  return { _id: booking._id, status: "confirmed" };
}
