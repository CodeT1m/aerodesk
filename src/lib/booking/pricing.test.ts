import { describe, expect, it } from "vitest";
import { quoteSeats, sumQuote } from "@/lib/booking/pricing";
import { bookingId, seatClaimId } from "@/lib/booking/ids";
import type { SeatDefinition } from "@/lib/types";

const seats: SeatDefinition[] = [
  { code: "12A", cabin: "economy", row: 12, column: "A", extraFeeCents: 2500 },
  { code: "12B", cabin: "economy", row: 12, column: "B", extraFeeCents: 0 },
  { code: "1A", cabin: "first", row: 1, column: "A", extraFeeCents: 12000 },
];

describe("quoteSeats", () => {
  it("waives seat fees for Pro members", () => {
    const quote = quoteSeats({
      seats,
      seatCodes: ["12A", "12B"],
      cabin: "economy",
      fare: { cabin: "economy", amountCents: 28900, currency: "usd" },
      passengerCount: 2,
      waiveSeatFees: true,
    });
    expect(quote.baseFareCents).toBe(57800);
    expect(quote.seatFeeCents).toBe(2500);
    expect(quote.seatFeeWaivedCents).toBe(2500);
    expect(sumQuote([quote]).totalCents).toBe(57800);
  });

  it("rejects seats from another cabin", () => {
    expect(() =>
      quoteSeats({
        seats,
        seatCodes: ["1A"],
        cabin: "economy",
        fare: { cabin: "economy", amountCents: 28900, currency: "usd" },
        passengerCount: 1,
        waiveSeatFees: false,
      }),
    ).toThrow(/not in economy/);
  });

  it("charges seat fees for Free members and keeps the base fare", () => {
    const quote = quoteSeats({
      seats,
      seatCodes: ["12A"],
      cabin: "economy",
      fare: { cabin: "economy", amountCents: 28900, currency: "usd" },
      passengerCount: 1,
      waiveSeatFees: false,
    });
    expect(quote.seatFeeCents).toBe(2500);
    expect(quote.seatFeeWaivedCents).toBe(0);
    expect(sumQuote([quote]).totalCents).toBe(31400);
  });

  it("rejects duplicate seats and the wrong passenger count", () => {
    expect(() =>
      quoteSeats({
        seats,
        seatCodes: ["12A", "12A"],
        cabin: "economy",
        fare: { cabin: "economy", amountCents: 28900, currency: "usd" },
        passengerCount: 2,
        waiveSeatFees: false,
      }),
    ).toThrow(/different seat/);
    expect(() =>
      quoteSeats({
        seats,
        seatCodes: ["12A"],
        cabin: "economy",
        fare: { cabin: "economy", amountCents: 28900, currency: "usd" },
        passengerCount: 2,
        waiveSeatFees: false,
      }),
    ).toThrow(/one seat per passenger/);
  });
});

describe("ids", () => {
  it("builds deterministic seat and booking ids", () => {
    expect(seatClaimId("flight-ae100-d1", "12A")).toBe("seatClaim.flight-ae100-d1.12A");
    expect(bookingId("abc")).toBe("booking.abc");
  });
});
