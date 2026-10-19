import { FlightSearchForm } from "@/components/flight-search-form";
import { PageIntro } from "@/components/page-intro";
import { AIRPORTS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";
import { defaultSearchDates, type AirportSummary } from "@/lib/types";

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
    </div>
  );
}
