export const CABINS = ["economy", "business", "first"] as const;
export type Cabin = (typeof CABINS)[number];

export const TRIP_TYPES = ["oneway", "roundtrip"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export type AirportSummary = {
  iata: string;
  name: string;
  city: string;
  country?: string;
  timezone: string;
};

export type SeatPosition = "window" | "aisle" | "middle";

export type SeatDefinition = {
  _key?: string;
  code: string;
  cabin: Cabin;
  row: number;
  column: string;
  position?: SeatPosition;
  extraFeeCents: number;
  isExit?: boolean;
  isAccessible?: boolean;
};

export type CabinFare = {
  cabin: Cabin;
  amountCents: number;
  currency: string;
};

export type FlightSummary = {
  _id: string;
  flightNumber: string;
  departureAt: string;
  arrivalAt: string;
  status: string;
  origin: AirportSummary;
  destination: AirportSummary;
  aircraft?: { _id: string; name: string; code: string; layoutVersion: string };
  fares: CabinFare[];
};

export type FlightDetails = FlightSummary & {
  aircraft: {
    _id: string;
    name: string;
    code: string;
    layoutVersion: string;
    seats: SeatDefinition[];
  };
};

export type SeatClaim = {
  _id: string;
  _rev?: string;
  seatCode: string;
  status: "held" | "confirmed" | "released";
  clerkUserId: string;
  expiresAt?: string;
};

export type Passenger = {
  givenName: string;
  familyName: string;
  email: string;
};

export type BookingLegInput = {
  flightId: string;
  cabin: Cabin;
  seatCodes: string[];
};

export function isCabin(value: string): value is Cabin {
  return (CABINS as readonly string[]).includes(value);
}

export function isTripType(value: string): value is TripType {
  return (TRIP_TYPES as readonly string[]).includes(value);
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function cabinLabel(cabin: Cabin): string {
  return cabin === "economy" ? "Economy" : cabin === "business" ? "Business" : "First";
}

export function dayBoundsUtc(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function durationLabel(startIso: string, endIso: string): string {
  const minutes = Math.max(
    0,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export function defaultSearchDates(now = Date.now()): { departDate: string; returnDate: string } {
  const depart = new Date(now + 86_400_000);
  const returning = new Date(now + 4 * 86_400_000);
  return {
    departDate: depart.toISOString().slice(0, 10),
    returnDate: returning.toISOString().slice(0, 10),
  };
}
