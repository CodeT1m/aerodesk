import type { Cabin } from "../types";

export function seatClaimId(flightId: string, seatCode: string): string {
  return `seatClaim.${flightId}.${seatCode}`;
}

export function bookingId(idempotencyKey: string): string {
  return `booking.${idempotencyKey}`;
}

export function makeBookingReference(now = Date.now()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  let seed = now;
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[seed % alphabet.length];
    seed = Math.floor(seed / alphabet.length + 17);
  }
  return `AE${suffix}`;
}

export function cabinRank(cabin: Cabin): number {
  if (cabin === "first") return 3;
  if (cabin === "business") return 2;
  return 1;
}

export const HOLD_MS = 7 * 60 * 60 * 1000;
