import type { LiveFlight } from "@/lib/aviationstack";

export function canSimulateLiveFlight(flight: LiveFlight): boolean {
  const duration = Date.parse(flight.arrivalAt ?? "") - Date.parse(flight.departureAt);
  return ["scheduled", "active", "landed"].includes(flight.status) &&
    Number.isFinite(duration) && duration >= 30 * 60_000 && duration <= 24 * 60 * 60_000;
}
