import { FlightResults } from "@/components/flight-results";
import { LiveFlightResults } from "@/components/live-flight-results";
import { FlightSearchForm } from "@/components/flight-search-form";
import { PageIntro } from "@/components/page-intro";
import { AIRPORTS_QUERY, FLIGHT_SEARCH_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";
import { getPublishedClient } from "@/sanity/lib/fresh";
import { getLiveFlights } from "@/lib/aviationstack";
import { dayBoundsUtc, defaultSearchDates, isCabin, isTripType, type AirportSummary, type Cabin, type FlightSummary, type TripType } from "@/lib/types";
import Link from "next/link";

type Search = {
  origin?: string;
  destination?: string;
  tripType?: string;
  departDate?: string;
  returnDate?: string;
  cabin?: string;
  passengers?: string;
  outboundId?: string;
};

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const { data: airports } = await sanityFetch({ query: AIRPORTS_QUERY });
  const dates = defaultSearchDates();
  const origin = params.origin ?? "";
  const destination = params.destination ?? "";
  const rawTrip = params.tripType ?? "";
  const tripType: TripType = isTripType(rawTrip) ? rawTrip : "oneway";
  const rawCabin = params.cabin ?? "";
  const cabin: Cabin = isCabin(rawCabin) ? rawCabin : "economy";
  const passengers = params.passengers ?? "1";
  const outboundId = params.outboundId;
  const searchClient = getPublishedClient();

  if (!origin || !destination || !params.departDate) {
    return (
      <div className="grid gap-6">
        <h1 className="text-3xl font-semibold">Search flights</h1>
        <FlightSearchForm airports={(airports ?? []) as AirportSummary[]} defaults={{
          origin: params.origin,
          destination: params.destination,
          tripType,
          departDate: params.departDate ?? dates.departDate,
          returnDate: params.returnDate ?? dates.returnDate,
          cabin,
          passengers: params.passengers,
        }} />
      </div>
    );
  }

  const selectingReturn = tripType === "roundtrip" && Boolean(outboundId);
  const liveOrigin = selectingReturn ? destination : origin;
  const liveDestination = selectingReturn ? origin : destination;
  const outboundWindow = dayBoundsUtc(params.departDate);
  const [outbound, live] = await Promise.all([
    searchClient.fetch<FlightSummary[]>(
      FLIGHT_SEARCH_QUERY,
      { origin, destination, start: outboundWindow.start, end: outboundWindow.end },
      { cache: "no-store" },
    ),
    getLiveFlights(liveOrigin, liveDestination),
  ]);

  let inbound: FlightSummary[] = [];
  if (selectingReturn && params.returnDate) {
    const inboundWindow = dayBoundsUtc(params.returnDate);
    inbound = await searchClient.fetch<FlightSummary[]>(
      FLIGHT_SEARCH_QUERY,
      {
        origin: destination,
        destination: origin,
        start: inboundWindow.start,
        end: inboundWindow.end,
      },
      { cache: "no-store" },
    );
  }

  const seatQuery = new URLSearchParams({
    origin,
    destination,
    tripType,
    cabin,
    passengers,
    departDate: params.departDate,
  });
  if (params.returnDate) seatQuery.set("returnDate", params.returnDate);

  return (
    <div className="grid gap-8">
      <div className="duration-500 animate-in fade-in slide-in-from-bottom-3">
        <Link href="/" className="text-sm text-sky-600 hover:text-sky-500 dark:text-sky-300">
          ← Edit search
        </Link>
        <PageIntro title={`${origin} to ${destination}`} />
      </div>
      <LiveFlightResults
        origin={liveOrigin}
        destination={liveDestination}
        {...live}
        selection={{ tripType, cabin, passengers, departDate: params.departDate, returnDate: params.returnDate, outboundId }}
      />
      {!selectingReturn ? (
        <FlightResults
          title="Sample booking flights · Outbound"
          flights={(outbound ?? []) as FlightSummary[]}
          cabin={cabin}
          emptyLabel="No outbound flights on that date. Try another day."
          selectHref={(flightId) => {
            if (tripType === "oneway") {
              seatQuery.set("outboundId", flightId);
              return `/booking/seats?${seatQuery.toString()}`;
            }
            const next = new URLSearchParams(params as Record<string, string>);
            next.set("outboundId", flightId);
            return `/flights?${next.toString()}`;
          }}
        />
      ) : (
        <FlightResults
          title="Sample booking flights · Return"
          flights={inbound}
          cabin={cabin}
          emptyLabel="No return flights on that date."
          selectHref={(flightId) => {
            seatQuery.set("outboundId", outboundId ?? "");
            seatQuery.set("inboundId", flightId);
            return `/booking/seats?${seatQuery.toString()}`;
          }}
        />
      )}
    </div>
  );
}
