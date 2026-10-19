import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
const dryRun = process.argv.includes("--dry-run");
const horizonDays = 60;
const batchSize = 50;

if (!projectId || !dataset || (!dryRun && !token)) {
  throw new Error("Sanity project, dataset, and a write token are required to seed flights");
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-02-01",
  token: token ?? process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
});

type Cabin = "economy" | "business" | "first";
type FlightTemplate = {
  _id: string;
  flightNumber: string;
  origin: { _ref: string };
  destination: { _ref: string };
  aircraft: { _ref: string };
  departureAt: string;
  arrivalAt: string;
  fares: { cabin: Cabin; amountCents: number; currency: string }[];
};

const extraAirports = [
  { iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", timezone: "America/Los_Angeles" },
  { iata: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", timezone: "America/Chicago" },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", timezone: "Europe/Paris" },
  { iata: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { iata: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { iata: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", timezone: "Asia/Hong_Kong" },
];

const extraRoutes = [
  { number: "AE500", origin: "SFO", destination: "LAX", hours: 1.5, hourUtc: 16, economy: 11900 },
  { number: "AE501", origin: "LAX", destination: "SFO", hours: 1.5, hourUtc: 20, economy: 11900 },
  { number: "AE510", origin: "JFK", destination: "ORD", hours: 2.6, hourUtc: 13, economy: 15900 },
  { number: "AE511", origin: "ORD", destination: "JFK", hours: 2.3, hourUtc: 18, economy: 15900 },
  { number: "AE520", origin: "LHR", destination: "CDG", hours: 1.3, hourUtc: 9, economy: 13900 },
  { number: "AE521", origin: "CDG", destination: "LHR", hours: 1.4, hourUtc: 14, economy: 13900 },
  { number: "AE530", origin: "SIN", destination: "KUL", hours: 1.1, hourUtc: 3, economy: 8900 },
  { number: "AE531", origin: "KUL", destination: "SIN", hours: 1.1, hourUtc: 8, economy: 8900 },
  { number: "AE540", origin: "SIN", destination: "BKK", hours: 2.5, hourUtc: 5, economy: 14900 },
  { number: "AE541", origin: "BKK", destination: "SIN", hours: 2.5, hourUtc: 10, economy: 14900 },
  { number: "AE550", origin: "NRT", destination: "HKG", hours: 4.8, hourUtc: 4, economy: 22900 },
  { number: "AE551", origin: "HKG", destination: "NRT", hours: 4.3, hourUtc: 10, economy: 22900 },
  { number: "AE560", origin: "DXB", destination: "LHR", hours: 7.5, hourUtc: 1, economy: 36900 },
  { number: "AE561", origin: "LHR", destination: "DXB", hours: 6.8, hourUtc: 12, economy: 36900 },
];

async function run() {
  // The original seed's flight IDs are kept as templates, including flights
  // referenced by existing bookings. Never replace or delete those documents.
  const seededFlights = await client.fetch<FlightTemplate[]>(
    `*[_type == "flightInstance"] | order(departureAt desc) {
      _id, flightNumber, origin, destination, aircraft, departureAt, arrivalAt,
      fares[]{ cabin, amountCents, currency }
    }`,
  );
  const routes = new Map<string, FlightTemplate>();

  for (const flight of seededFlights) {
    if (!/^flight-ae\d+-d\d+$/.test(flight._id)) continue;
    if (!flight.origin?._ref || !flight.destination?._ref || !flight.aircraft?._ref) continue;
    if (!flight.fares?.length) continue;
    if (!Number.isFinite(Date.parse(flight.departureAt)) || !Number.isFinite(Date.parse(flight.arrivalAt))) continue;
    if (!routes.has(flight.flightNumber)) routes.set(flight.flightNumber, flight);
  }

  if (routes.size === 0) {
    throw new Error("No original demo flights found. Run `pnpm seed` first.");
  }

  const base = routes.values().next().value;
  if (!base) throw new Error("No aircraft template found");
  for (const route of extraRoutes) {
    const departureAt = new Date(Date.UTC(2026, 0, 1, route.hourUtc, 15)).toISOString();
    routes.set(route.number, {
      _id: `template-${route.number.toLowerCase()}`,
      flightNumber: route.number,
      origin: { _ref: `airport-${route.origin.toLowerCase()}` },
      destination: { _ref: `airport-${route.destination.toLowerCase()}` },
      aircraft: base.aircraft,
      departureAt,
      arrivalAt: new Date(Date.parse(departureAt) + route.hours * 3_600_000).toISOString(),
      fares: (["economy", "business", "first"] as const).map((cabin) => ({
        cabin,
        amountCents: cabin === "economy" ? route.economy : cabin === "business" ? route.economy * 3 : route.economy * 5,
        currency: "usd",
      })),
    });
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const flights = [];

  for (let day = 1; day <= horizonDays; day += 1) {
    const dayUtc = todayUtc + day * 86_400_000;
    const dateId = new Date(dayUtc).toISOString().slice(0, 10).replaceAll("-", "");

    for (const template of routes.values()) {
      const originalDeparture = new Date(template.departureAt);
      const durationMs = Date.parse(template.arrivalAt) - originalDeparture.getTime();
      if (durationMs <= 0) throw new Error(`Invalid duration for ${template.flightNumber}`);

      const departureAt = new Date(
        dayUtc + originalDeparture.getUTCHours() * 3_600_000 + originalDeparture.getUTCMinutes() * 60_000,
      ).toISOString();
      const slug = template.flightNumber.toLowerCase();
      const id = `demo-flight-${slug}-${dateId}`;

      flights.push({
        _id: id,
        _type: "flightInstance",
        flightNumber: template.flightNumber,
        origin: { _type: "reference", _ref: template.origin._ref },
        destination: { _type: "reference", _ref: template.destination._ref },
        aircraft: { _type: "reference", _ref: template.aircraft._ref },
        departureAt,
        arrivalAt: new Date(Date.parse(departureAt) + durationMs).toISOString(),
        fares: template.fares.map((fare) => ({
          _key: fare.cabin,
          _type: "cabinFare",
          cabin: fare.cabin,
          amountCents: fare.amountCents,
          currency: fare.currency,
        })),
        status: "scheduled",
      });
    }
  }

  const firstDay = new Date(todayUtc + 86_400_000).toISOString().slice(0, 10);
  const lastDay = new Date(todayUtc + horizonDays * 86_400_000).toISOString().slice(0, 10);
  console.log(`${dryRun ? "Would seed" : "Seeding"} ${flights.length} demo flights across ${routes.size} routes, ${firstDay} through ${lastDay}`);
  if (dryRun) return;

  const airportTx = extraAirports.reduce((tx, airport) => tx.createIfNotExists({
    _id: `airport-${airport.iata.toLowerCase()}`,
    _type: "airport",
    ...airport,
  }), client.transaction());
  await airportTx.commit({ visibility: "sync" });

  for (let offset = 0; offset < flights.length; offset += batchSize) {
    const batch = flights.slice(offset, offset + batchSize);
    const transaction = batch.reduce((tx, flight) => tx.createIfNotExists(flight), client.transaction());
    await transaction.commit({ visibility: "sync" });
  }

  console.log("Done. Existing flight and booking documents were left unchanged.");
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
