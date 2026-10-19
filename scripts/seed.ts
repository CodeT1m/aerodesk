import { createClient } from "@sanity/client";
import { DEFAULT_CONCIERGE_SYSTEM_PROMPT } from "../src/lib/ai/system-prompt";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "azyqstd0";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!token) {
  throw new Error("SANITY_API_WRITE_TOKEN is required to seed");
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-02-01",
  token,
  useCdn: false,
});

type Cabin = "economy" | "business" | "first";
type SeatPosition = "window" | "aisle" | "middle";

const airports = [
  { _id: "airport-sfo", iata: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", timezone: "America/Los_Angeles" },
  { _id: "airport-jfk", iata: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", timezone: "America/New_York" },
  { _id: "airport-lhr", iata: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { _id: "airport-nrt", iata: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { _id: "airport-sin", iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
];

function seatPosition(columns: string[], column: string): SeatPosition {
  if (column === columns[0] || column === columns.at(-1)) return "window";
  if (columns.length === 6 && (column === "C" || column === "D")) return "aisle";
  if (columns.length === 4 && (column === "B" || column === "D")) return "aisle";
  return "middle";
}

function seatsForCabin(cabin: Cabin, startRow: number, rows: number, columns: string[], extraFee: number, exitRows: number[]) {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const row = startRow + rowIndex;
    return columns.map((column) => ({
      _key: `${cabin}-${row}${column}`,
      _type: "seatDefinition",
      code: `${row}${column}`,
      cabin,
      row,
      column,
      position: seatPosition(columns, column),
      extraFeeCents: extraFee + (column === "A" || column === (columns.at(-1) ?? "F") ? 1500 : 0),
      isExit: exitRows.includes(row),
      isAccessible: row === startRow && column === columns[0],
    }));
  }).flat();
}

const aircraftSeats = [
  ...seatsForCabin("first", 1, 2, ["A", "B", "D", "E"], 12000, []),
  ...seatsForCabin("business", 3, 4, ["A", "B", "D", "E"], 6500, []),
  ...seatsForCabin("economy", 10, 12, ["A", "B", "C", "D", "E", "F"], 2500, [14, 15]),
];

const routes = [
  { number: "AE100", origin: "airport-sfo", destination: "airport-jfk", hours: 5.5, fares: { economy: 28900, business: 84200, first: 164000 } },
  { number: "AE101", origin: "airport-jfk", destination: "airport-sfo", hours: 6.2, fares: { economy: 27900, business: 82100, first: 159000 } },
  { number: "AE200", origin: "airport-jfk", destination: "airport-lhr", hours: 7.1, fares: { economy: 41200, business: 126000, first: 248000 } },
  { number: "AE201", origin: "airport-lhr", destination: "airport-jfk", hours: 8.0, fares: { economy: 39800, business: 119000, first: 239000 } },
  { number: "AE300", origin: "airport-nrt", destination: "airport-sfo", hours: 9.4, fares: { economy: 53400, business: 178000, first: 312000 } },
  { number: "AE301", origin: "airport-sfo", destination: "airport-nrt", hours: 11.0, fares: { economy: 52100, business: 171000, first: 304000 } },
  { number: "AE400", origin: "airport-sin", destination: "airport-lhr", hours: 13.2, fares: { economy: 61200, business: 214000, first: 389000 } },
  { number: "AE401", origin: "airport-lhr", destination: "airport-sin", hours: 12.8, fares: { economy: 59800, business: 209000, first: 376000 } },
];

function isoAt(dayOffset: number, hourUtc: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hourUtc, 15, 0, 0);
  return date.toISOString();
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

async function run() {
  const docs = [
    {
      _id: "conciergePrompt",
      _type: "conciergePrompt",
      title: "Concierge Desk",
      systemPrompt: DEFAULT_CONCIERGE_SYSTEM_PROMPT,
    },
    ...airports.map((airport) => ({ _type: "airport", ...airport })),
    {
      _id: "aircraft-a321neo",
      _type: "aircraftType",
      name: "Airbus A321neo",
      code: "A21N",
      layoutVersion: "1",
      seatGuide: [
        "Seat preference guide for the Airbus A321neo.",
        "I want a window seat: choose Economy A or F, or Business and First A or E. Window seats have a higher surcharge.",
        "I want an aisle seat: choose Economy C or D, or Business and First B or D. These sit next to the aisle.",
        "I want a middle seat: choose Economy B or E.",
        "I want extra legroom: Economy exit rows 14 and 15.",
        "I need an accessible seat: 1A in First, 3A in Business, and 10A in Economy.",
        "Live occupancy is not in this guide. Confirm seats on the visual map before dummy payment.",
      ].join(" "),
      seats: aircraftSeats,
    },
    {
      _id: "support-seat-selection",
      _type: "supportArticle",
      title: "How seat selection works",
      slug: { _type: "slug", current: "how-seat-selection-works" },
      category: "seats",
      summary: "Choose a cabin, then pick seats on a visual map. Pro members do not pay seat surcharges.",
      body: [
        {
          _type: "block",
          _key: "b1",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s1",
              text: "Economy, Business, and First each have their own cabin map. Held seats expire after seven hours unless dummy payment succeeds. Open My trips to resume payment while the hold is live. Pro membership waives seat-selection surcharges but still charges the published base fare.",
            },
          ],
        },
      ],
    },
    {
      _id: "support-window-aisle-seats",
      _type: "supportArticle",
      title: "Window, aisle, and extra-legroom seats",
      slug: { _type: "slug", current: "window-aisle-seats" },
      category: "seats",
      summary:
        "I want a window seat, I want an aisle seat, I want extra legroom, or I need an accessible seat: here is how Aerodesk maps those requests.",
      body: [
        {
          _type: "block",
          _key: "b-window",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s-window",
              text: "I want a window seat: pick column A or F in Economy, or column A or E in Business and First. Those window seats carry a higher selection surcharge unless you have Aerodesk Pro.",
            },
          ],
        },
        {
          _type: "block",
          _key: "b-aisle",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s-aisle",
              text: "I want an aisle seat: pick Economy C or D, or Business and First B or D. Those seats sit on the aisle and are easier to get in and out of during the flight.",
            },
          ],
        },
        {
          _type: "block",
          _key: "b-middle",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s-middle",
              text: "I want a middle seat: Economy B and E are middle seats. Business and First do not have middle seats on the A321neo.",
            },
          ],
        },
        {
          _type: "block",
          _key: "b-exit",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s-exit",
              text: "I want extra legroom: Economy rows 14 and 15 are exit rows. I need an accessible seat: choose 1A in First, 3A in Business, or 10A in Economy, then confirm on the visual seat map.",
            },
          ],
        },
      ],
    },
    {
      _id: "support-dummy-payment",
      _type: "supportArticle",
      title: "Dummy payment is not a real charge",
      slug: { _type: "slug", current: "dummy-payment" },
      category: "payments",
      summary: "Flight checkout is simulated. Membership billing is handled separately by Clerk.",
      body: [
        {
          _type: "block",
          _key: "b2",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s2",
              text: "Use success or decline in the dummy payment step to test booking confirmation. No card data is sent to Stripe. Aerodesk Pro is a Clerk subscription that unlocks Concierge Desk and complimentary seat selection.",
            },
          ],
        },
      ],
    },
    {
      _id: "support-concierge",
      _type: "supportArticle",
      title: "Concierge Desk",
      slug: { _type: "slug", current: "concierge-desk" },
      category: "membership",
      summary: "Pro members can chat with Concierge to search flights and start a booking.",
      body: [
        {
          _type: "block",
          _key: "b3",
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: "s3",
              text: "Concierge can search published flights, explain cabin differences, and draft an itinerary. It cannot finalize payment. Confirm seats and dummy payment in the booking flow.",
            },
          ],
        },
      ],
    },
  ];

  for (let day = 1; day <= 10; day += 1) {
    for (const [index, route] of routes.entries()) {
      const departureAt = isoAt(day, 8 + (index % 6));
      const id = `flight-${route.number.toLowerCase()}-d${day}`;
      docs.push({
        _id: id,
        _type: "flightInstance",
        flightNumber: route.number,
        origin: { _type: "reference", _ref: route.origin },
        destination: { _type: "reference", _ref: route.destination },
        departureAt,
        arrivalAt: addHours(departureAt, route.hours),
        aircraft: { _type: "reference", _ref: "aircraft-a321neo" },
        fares: (["economy", "business", "first"] as const).map((cabin) => ({
          _key: `${id}-${cabin}`,
          _type: "cabinFare",
          cabin,
          amountCents: route.fares[cabin],
          currency: "usd",
        })),
        status: "scheduled",
      });
    }
  }

  const transaction = docs.reduce(
    (tx, doc) => tx.createOrReplace(doc),
    client.transaction(),
  );
  await transaction.commit({ visibility: "async" });
  console.log(`Seeded ${docs.length} documents`);
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
