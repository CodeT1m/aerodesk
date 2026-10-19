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
