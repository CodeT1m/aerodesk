import "server-only";

export type LiveFlight = {
  id: string;
  flightNumber: string;
  airline: string;
  status: string;
  departureAt: string;
  arrivalAt: string | null;
  departureTerminal: string | null;
  departureGate: string | null;
  arrivalTerminal: string | null;
  arrivalGate: string | null;
};

type ApiFlight = {
  flight_status?: unknown;
  airline?: { name?: unknown };
  flight?: { iata?: unknown };
  departure?: { iata?: unknown; scheduled?: unknown; terminal?: unknown; gate?: unknown };
  arrival?: { iata?: unknown; scheduled?: unknown; terminal?: unknown; gate?: unknown };
};

type ApiResponse = { data?: unknown; error?: { code?: string } };

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeLiveFlights(data: unknown, origin: string, destination: string): LiveFlight[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item: ApiFlight, index) => {
    const departure = item?.departure;
    const arrival = item?.arrival;
    const flightNumber = stringOrNull(item?.flight?.iata);
    const departureAt = stringOrNull(departure?.scheduled);
    if (
      departure?.iata !== origin || arrival?.iata !== destination ||
      !flightNumber || !departureAt || Number.isNaN(Date.parse(departureAt))
    ) return [];

    const arrivalAt = stringOrNull(arrival?.scheduled);
    return [{
      id: `${flightNumber}-${departureAt}-${index}`,
      flightNumber,
      airline: stringOrNull(item?.airline?.name) ?? "Airline unavailable",
      status: stringOrNull(item?.flight_status) ?? "unknown",
      departureAt,
      arrivalAt: arrivalAt && !Number.isNaN(Date.parse(arrivalAt)) ? arrivalAt : null,
      departureTerminal: stringOrNull(departure?.terminal),
      departureGate: stringOrNull(departure?.gate),
      arrivalTerminal: stringOrNull(arrival?.terminal),
      arrivalGate: stringOrNull(arrival?.gate),
    }];
  });
}

export async function getLiveFlights(origin: string, destination: string): Promise<{
  flights: LiveFlight[];
  available: boolean;
}> {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key || !/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return { flights: [], available: false };
  }

  const url = new URL("https://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", key);
  url.searchParams.set("dep_iata", origin);
  url.searchParams.set("arr_iata", destination);
  url.searchParams.set("limit", "50");

  try {
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { flights: [], available: false };
    const payload = (await response.json()) as ApiResponse;
    if (payload.error || !Array.isArray(payload.data)) return { flights: [], available: false };
    return { flights: normalizeLiveFlights(payload.data, origin, destination), available: true };
  } catch {
    return { flights: [], available: false };
  }
}
