import type { Cabin, CabinFare, SeatDefinition } from "../types";

export type QuotedLeg = {
  flightId: string;
  cabin: Cabin;
  seatCodes: string[];
  baseFareCents: number;
  seatFeeCents: number;
  seatFeeWaivedCents: number;
  currency: string;
};

export function fareForCabin(fares: CabinFare[], cabin: Cabin): CabinFare | undefined {
  return fares.find((fare) => fare.cabin === cabin);
}

export function quoteSeats(args: {
  seats: SeatDefinition[];
  seatCodes: string[];
  cabin: Cabin;
  fare: CabinFare;
  passengerCount: number;
  waiveSeatFees: boolean;
}): QuotedLeg {
  const selected = args.seatCodes.map((code) => {
    const seat = args.seats.find((item) => item.code === code);
    if (!seat) {
      throw new Error(`Seat ${code} is not on this aircraft`);
    }
    if (seat.cabin !== args.cabin) {
      throw new Error(`Seat ${code} is not in ${args.cabin} cabin`);
    }
    return seat;
  });

  if (selected.length !== args.passengerCount) {
    throw new Error("Select one seat per passenger");
  }

  const unique = new Set(args.seatCodes);
  if (unique.size !== args.seatCodes.length) {
    throw new Error("Each passenger must choose a different seat");
  }

  const seatFeeCents = selected.reduce((sum, seat) => sum + (seat.extraFeeCents ?? 0), 0);
  const baseFareCents = args.fare.amountCents * args.passengerCount;
  const seatFeeWaivedCents = args.waiveSeatFees ? seatFeeCents : 0;

  return {
    flightId: "",
    cabin: args.cabin,
    seatCodes: args.seatCodes,
    baseFareCents,
    seatFeeCents,
    seatFeeWaivedCents,
    currency: args.fare.currency,
  };
}

export function sumQuote(legs: QuotedLeg[]): { totalCents: number; currency: string } {
  const totalCents = legs.reduce(
    (sum, leg) => sum + leg.baseFareCents + leg.seatFeeCents - leg.seatFeeWaivedCents,
    0,
  );
  return { totalCents, currency: legs[0]?.currency ?? "usd" };
}
