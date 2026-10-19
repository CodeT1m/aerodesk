import { describe, expect, it } from "vitest";
import { rankSeatsByPreference } from "./seat-recs";
import type { SeatDefinition } from "@/lib/types";

const seats: SeatDefinition[] = [
  { code: "12A", cabin: "economy", row: 12, column: "A", position: "window", extraFeeCents: 0 },
  { code: "12B", cabin: "economy", row: 12, column: "B", position: "middle", extraFeeCents: 0 },
  { code: "12C", cabin: "economy", row: 12, column: "C", position: "aisle", extraFeeCents: 0 },
  { code: "14A", cabin: "economy", row: 14, column: "A", position: "window", extraFeeCents: 2500, isExit: true },
  { code: "1A", cabin: "business", row: 1, column: "A", position: "window", extraFeeCents: 0, isAccessible: true },
];

describe("rankSeatsByPreference", () => {
  it("returns economy window seats in row order", () => {
    expect(rankSeatsByPreference(seats, "economy", "window").map((seat) => seat.code)).toEqual([
      "12A",
      "14A",
    ]);
  });

  it("treats extra legroom as exit-row seats", () => {
    expect(rankSeatsByPreference(seats, "economy", "extra_legroom").map((seat) => seat.code)).toEqual([
      "14A",
    ]);
  });
});
