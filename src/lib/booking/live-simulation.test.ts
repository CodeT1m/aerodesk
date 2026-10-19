import { describe, expect, it } from "vitest";
import type { LiveFlight } from "@/lib/aviationstack";
import { HOLD_MS } from "./ids";
import { canSimulateLiveFlight } from "./live-eligibility";
import { simulatedFlightDocument } from "./live-simulation";
import { isHoldExpired } from "./status";

const flight: LiveFlight = {
  id: "AA123-2026-10-21T12:00:00.000Z",
  flightNumber: "AA123",
  airline: "Example Air",
  status: "scheduled",
  departureAt: "2026-10-21T12:00:00.000Z",
  arrivalAt: "2026-10-21T16:00:00.000Z",
  departureTerminal: "2",
  departureGate: "B4",
  arrivalTerminal: "1",
  arrivalGate: "A2",
};

describe("live flight booking simulation", () => {
  it("uses current flight records as templates but rejects cancelled or invalid legs", () => {
    expect(canSimulateLiveFlight(flight)).toBe(true);
    expect(canSimulateLiveFlight({ ...flight, status: "landed" })).toBe(true);
    expect(canSimulateLiveFlight({ ...flight, status: "cancelled" })).toBe(false);
    expect(canSimulateLiveFlight({ ...flight, arrivalAt: null })).toBe(false);
  });

  it("makes a stable Aerodesk record on the selected test date with simulated fares", () => {
    const now = Date.parse("2026-10-20T12:00:00.000Z");
    const first = simulatedFlightDocument(flight, "airport-sfo", "airport-jfk", "2026-10-23", now);
    const second = simulatedFlightDocument(flight, "airport-sfo", "airport-jfk", "2026-10-23", now);
    expect(first).toEqual(second);
    expect(first._id).toMatch(/^sim-flight-/);
    expect(first.simulationSource).toBe("aviationstack");
    expect(first.departureAt).toBe("2026-10-23T12:00:00.000Z");
    expect(first.fares.map((fare) => fare.amountCents)).toEqual([32900, 98700, 164500]);
  });
});

describe("seven-hour hold", () => {
  it("releases the seat at the seven-hour boundary", () => {
    const now = Date.parse("2026-10-20T12:00:00.000Z");
    expect(HOLD_MS).toBe(7 * 60 * 60 * 1000);
    const expiresAt = new Date(now + HOLD_MS).toISOString();
    expect(isHoldExpired(expiresAt, now + HOLD_MS - 1)).toBe(false);
    expect(isHoldExpired(expiresAt, now + HOLD_MS)).toBe(true);
  });
});
