import type { SeatClaim, TripType } from "../types";

export function assertTripShape(tripType: TripType, legCount: number) {
  if (tripType === "oneway" && legCount !== 1) {
    throw new Error("One-way bookings need exactly one flight");
  }
  if (tripType === "roundtrip" && legCount !== 2) {
    throw new Error("Round-trip bookings need outbound and return flights");
  }
}

export function assertRoundTripPair(
  tripType: TripType,
  outbound: { origin: { iata: string }; destination: { iata: string }; arrivalAt: string },
  inbound?: { origin: { iata: string }; destination: { iata: string }; departureAt: string },
) {
  if (tripType !== "roundtrip") return;
  if (!inbound) {
    throw new Error("Round-trip bookings need outbound and return flights");
  }
  if (
    outbound.origin.iata !== inbound.destination.iata ||
    outbound.destination.iata !== inbound.origin.iata
  ) {
    throw new Error("Return flight must reverse the outbound airports");
  }
  if (new Date(inbound.departureAt) <= new Date(outbound.arrivalAt)) {
    throw new Error("Return must depart after the outbound arrival");
  }
}

export function isActiveClaim(claim: SeatClaim, now: number): boolean {
  if (claim.status === "confirmed") return true;
  if (claim.status !== "held") return false;
  if (!claim.expiresAt) return true;
  return new Date(claim.expiresAt).getTime() > now;
}

export function assertSeatClaimable(
  current: SeatClaim | undefined,
  now: number,
  clerkUserId: string,
  seatCode: string,
  flightNumber: string,
) {
  if (current && isActiveClaim(current, now) && current.clerkUserId !== clerkUserId) {
    throw new Error(`Seat ${seatCode} on ${flightNumber} is no longer available`);
  }
}

export function reuseExistingHold<T extends { _id: string }>(existing: T | null): T | null {
  return existing;
}

export type DummyBookingState = {
  _id: string;
  clerkUserId: string;
  status: string;
  holdExpiresAt?: string;
};

export type DummyPaymentDecision =
  | { action: "already_confirmed" }
  | { action: "pay" }
  | { action: "decline" };

export function decideDummyPayment(
  booking: DummyBookingState | null,
  clerkUserId: string,
  outcome: "success" | "decline",
  now: number,
): DummyPaymentDecision {
  if (!booking || booking.clerkUserId !== clerkUserId) {
    throw new Error("Booking not found");
  }
  if (booking.status === "confirmed") {
    return { action: "already_confirmed" };
  }
  if (booking.status !== "held" && booking.status !== "payment_failed") {
    throw new Error("This booking cannot be paid right now.");
  }
  if (booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= now) {
    throw new Error("Your seat hold expired. Select seats again.");
  }
  return { action: outcome === "decline" ? "decline" : "pay" };
}

export function requireSignedIn(userId: string | null): string {
  if (!userId) {
    throw new Error("Sign in required");
  }
  return userId;
}

export function nextSeatSelection(
  selected: string[],
  code: string,
  passengerCount: number,
  unavailable: boolean,
): string[] {
  if (unavailable) return selected;
  if (selected.includes(code)) {
    return selected.filter((seat) => seat !== code);
  }
  if (selected.length >= passengerCount) {
    return [...selected.slice(1), code];
  }
  return [...selected, code];
}
