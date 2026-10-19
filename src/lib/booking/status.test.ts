import { describe, expect, it } from "vitest";
import { canResumePayment, checkoutHref, isHoldExpired } from "./status";

describe("held booking payment", () => {
  const now = Date.parse("2026-09-17T00:00:00.000Z");

  it("lets a held unpaid booking resume checkout", () => {
    expect(
      canResumePayment(
        {
          _id: "booking.1",
          status: "held",
          paymentStatus: "unpaid",
          holdExpiresAt: "2026-09-17T00:20:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("lets a declined dummy payment retry while the hold is live", () => {
    expect(
      canResumePayment(
        {
          _id: "booking.1",
          status: "payment_failed",
          paymentStatus: "dummy_declined",
          holdExpiresAt: "2026-09-17T00:20:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("blocks checkout after the hold expires", () => {
    expect(isHoldExpired("2026-09-16T23:59:00.000Z", now)).toBe(true);
    expect(
      canResumePayment(
        {
          _id: "booking.1",
          status: "held",
          paymentStatus: "unpaid",
          holdExpiresAt: "2026-09-16T23:59:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("builds a checkout URL for the booking id", () => {
    expect(checkoutHref("booking.abc")).toBe("/booking/checkout?bookingId=booking.abc");
  });
});
