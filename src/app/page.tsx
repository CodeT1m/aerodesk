import { FlightSearchForm } from "@/components/flight-search-form";
import { PageIntro } from "@/components/page-intro";
import { AIRPORTS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";
import { defaultSearchDates, type AirportSummary } from "@/lib/types";
import Link from "next/link";

const featuredRoutes = [
  { origin: "KUL", destination: "SIN" },
  { origin: "SFO", destination: "LAX" },
  { origin: "LHR", destination: "CDG" },
  { origin: "JFK", destination: "ORD" },
];

export default async function HomePage() {
  const { data } = await sanityFetch({ query: AIRPORTS_QUERY });
  const airports = (data ?? []) as AirportSummary[];
  const dates = defaultSearchDates();

  return (
    <div className="grid gap-8">
      <PageIntro
        kicker="Aerodesk"
        title="Book the cabin you want, then choose the seat you can see."
        description="Search one-way or round-trip flights, pick Economy, Business, or First, hold seats on a visual map, and finish with a dummy payment. Pro members get complimentary seat selection and Concierge Desk."
      />
      <div className="duration-700 animate-in fade-in slide-in-from-bottom-4">
        <FlightSearchForm airports={airports} defaults={dates} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-1 text-muted-foreground">Explore sample routes</span>
        {featuredRoutes.map((route) => {
          const search = new URLSearchParams({
            ...route,
            tripType: "oneway",
            departDate: dates.departDate,
            cabin: "economy",
            passengers: "1",
          });
          return (
            <Link key={`${route.origin}-${route.destination}`} href={`/flights?${search}`} className="rounded-full border border-border bg-card/70 px-3 py-1.5 transition hover:border-sky-400 hover:bg-sky-500/10">
              {route.origin} → {route.destination}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
