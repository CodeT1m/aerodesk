import type { Cabin, SeatDefinition, SeatPosition } from "@/lib/types";

export type SeatPreference = SeatPosition | "extra_legroom" | "accessible";

export function rankSeatsByPreference(
  seats: SeatDefinition[],
  cabin: Cabin,
  preference: SeatPreference,
): SeatDefinition[] {
  return seats
    .filter((seat) => seat.cabin === cabin)
    .filter((seat) => {
      if (preference === "extra_legroom") return Boolean(seat.isExit);
      if (preference === "accessible") return Boolean(seat.isAccessible);
      return seat.position === preference;
    })
    .sort((a, b) => a.row - b.row || a.column.localeCompare(b.column))
    .slice(0, 8);
}
