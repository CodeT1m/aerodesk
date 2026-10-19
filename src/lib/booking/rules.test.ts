import { describe, expect, it } from "vitest";
import {
  assertRoundTripPair,
  assertSeatClaimable,
  assertTripShape,
  decideDummyPayment,
  isActiveClaim,
  nextSeatSelection,
  requireSignedIn,
  reuseExistingHold,
} from "./rules";
import type { SeatClaim } from "../types";

const outbound = {
  origin: { iata: "SFO" },
  destination: { iata: "JFK" },
  arrivalAt: "2026-09-18T20:00:00.000Z",
};

describe("itinerary rules", () => {
  it("requires one flight for one-way and two for round-trip", () => {
    expect(() => assertTripShape("oneway", 1)).not.toThrow();
    expect(() => assertTripShape("roundtrip", 2)).not.toThrow();
    expect(() => assertTripShape("oneway", 2)).toThrow(/exactly one flight/);
    expect(() => assertTripShape("roundtrip", 1)).toThrow(/outbound and return/);
  });

  it("requires the return to reverse airports after the outbound arrival", () => {
    expect(() =>
      assertRoundTripPair("roundtrip", outbound, {
        origin: { iata: "JFK" },
        destination: { iata: "SFO" },
        departureAt: "2026-09-22T14:00:00.000Z",
      }),
    ).not.toThrow();
    expect(() =>
      assertRoundTripPair("roundtrip", outbound, {
        origin: { iata: "LHR" },
        destination: { iata: "SFO" },
        departureAt: "2026-09-22T14:00:00.000Z",
      }),
    ).toThrow(/reverse the outbound airports/);
    expect(() =>
      assertRoundTripPair("roundtrip", outbound, {
        origin: { iata: "JFK" },
        destination: { iata: "SFO" },
        departureAt: "2026-09-18T19:00:00.000Z",
      }),
    ).toThrow(/after the outbound arrival/);
  });
});

describe("seat claims", () => {
  const now = Date.parse("2026-09-17T00:00:00.000Z");

  it("treats another traveler's live hold as a conflict", () => {
    const claim: SeatClaim = {
      _id: "seatClaim.flight-ae100-d1.12A",
      seatCode: "12A",
      status: "held",
      clerkUserId: "user_other",
      expiresAt: "2026-09-17T00:20:00.000Z",
    };
    expect(isActiveClaim(claim, now)).toBe(true);
    expect(() => assertSeatClaimable(claim, now, "user_me", "12A", "AE100")).toThrow(
      /no longer available/,
    );
  });

  it("lets the same traveler replace their own hold", () => {
    const claim: SeatClaim = {
      _id: "seatClaim.flight-ae100-d1.12A",
      seatCode: "12A",
      status: "held",
      clerkUserId: "user_me",
      expiresAt: "2026-09-17T00:20:00.000Z",
    };
    expect(() => assertSeatClaimable(claim, now, "user_me", "12A", "AE100")).not.toThrow();
  });

  it("treats an expired hold as free", () => {
    const claim: SeatClaim = {
      _id: "seatClaim.flight-ae100-d1.12A",
      seatCode: "12A",
      status: "held",
      clerkUserId: "user_other",
      expiresAt: "2026-09-16T23:00:00.000Z",
    };
    expect(isActiveClaim(claim, now)).toBe(false);
    expect(() => assertSeatClaimable(claim, now, "user_me", "12A", "AE100")).not.toThrow();
  });
});

describe("idempotent holds", () => {
  it("reuses an existing booking for the same key", () => {
    expect(reuseExistingHold({ _id: "booking.abc", status: "held" })).toEqual({
      _id: "booking.abc",
      status: "held",
    });
    expect(reuseExistingHold(null)).toBeNull();
  });
});

describe("dummy payment", () => {
  const now = Date.parse("2026-09-17T00:00:00.000Z");
  const held = {
    _id: "booking.1",
    clerkUserId: "user_me",
    status: "held",
    holdExpiresAt: "2026-09-17T00:20:00.000Z",
  };

  it("confirms success and keeps a second success idempotent", () => {
    expect(decideDummyPayment(held, "user_me", "success", now)).toEqual({ action: "pay" });
    expect(
      decideDummyPayment({ ...held, status: "confirmed" }, "user_me", "success", now),
    ).toEqual({ action: "already_confirmed" });
  });

  it("declines then allows retry while the hold is live", () => {
    expect(decideDummyPayment(held, "user_me", "decline", now)).toEqual({ action: "decline" });
    expect(
      decideDummyPayment(
        { ...held, status: "payment_failed" },
        "user_me",
        "success",
        now,
      ),
    ).toEqual({ action: "pay" });
  });

  it("blocks other owners and expired holds", () => {
    expect(() => decideDummyPayment(held, "user_other", "success", now)).toThrow(/not found/);
    expect(() =>
      decideDummyPayment(
        { ...held, holdExpiresAt: "2026-09-16T23:00:00.000Z" },
        "user_me",
        "success",
        now,
      ),
    ).toThrow(/expired/);
  });
});

describe("auth and seat picker", () => {
  it("requires a signed-in user id", () => {
    expect(() => requireSignedIn(null)).toThrow(/Sign in required/);
    expect(requireSignedIn("user_me")).toBe("user_me");
  });

  it("toggles seats without exceeding passenger count, including keyboard replacement", () => {
    expect(nextSeatSelection([], "12A", 1, false)).toEqual(["12A"]);
    expect(nextSeatSelection(["12A"], "12A", 1, false)).toEqual([]);
    expect(nextSeatSelection(["12A"], "12B", 1, false)).toEqual(["12B"]);
    expect(nextSeatSelection(["12A"], "12C", 1, true)).toEqual(["12A"]);
    expect(nextSeatSelection(["12A"], "12F", 2, false)).toEqual(["12A", "12F"]);
  });
});
