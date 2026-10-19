import { SeatBookingForm } from "@/components/seat-booking-form";
import { PageIntro } from "@/components/page-intro";
import { getEntitlements } from "@/lib/entitlements";
import { isCabin, isTripType, type Cabin, type FlightDetails, type SeatClaim, type TripType } from "@/lib/types";
import { FLIGHT_DETAILS_QUERY, SEAT_CLAIMS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";
import { notFound, redirect } from "next/navigation";

export default async function SeatsPage({
  searchParams,
}: {
  searchParams: Promise<{
    outboundId?: string;
    inboundId?: string;
    tripType?: string;
    cabin?: string;
    passengers?: string;
  }>;
}) {
  const params = await searchParams;
  const entitlements = await getEntitlements();
  if (!entitlements.userId) {
    redirect("/sign-in");
  }

  const outboundId = params.outboundId;
  const rawTrip = params.tripType ?? "";
  const tripType: TripType = isTripType(rawTrip) ? rawTrip : "oneway";
  const rawCabin = params.cabin ?? "";
  const cabin: Cabin = isCabin(rawCabin) ? rawCabin : "economy";
  const passengerCount = Math.min(4, Math.max(1, Number(params.passengers ?? "1") || 1));

  if (!outboundId) {
    notFound();
  }

  const [{ data: outbound }, { data: outboundClaims }] = await Promise.all([
    sanityFetch({ query: FLIGHT_DETAILS_QUERY, params: { id: outboundId } }),
    sanityFetch({ query: SEAT_CLAIMS_QUERY, params: { flightId: outboundId } }),
  ]);

  if (!outbound) {
    notFound();
  }

  let inbound: FlightDetails | undefined;
  let inboundClaims: SeatClaim[] = [];
  if (tripType === "roundtrip") {
    if (!params.inboundId) notFound();
    const inboundResult = await sanityFetch({
      query: FLIGHT_DETAILS_QUERY,
      params: { id: params.inboundId },
    });
    const inboundClaimResult = await sanityFetch({
      query: SEAT_CLAIMS_QUERY,
      params: { flightId: params.inboundId },
    });
    inbound = inboundResult.data as FlightDetails | undefined;
    inboundClaims = (inboundClaimResult.data ?? []) as SeatClaim[];
    if (!inbound) notFound();
  }

  return (
    <div className="grid gap-6">
      {(outbound as FlightDetails).simulationSource === "aviationstack" || inbound?.simulationSource === "aviationstack" ? (
        <p className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm">
          This flight uses live schedule data for an Aerodesk booking simulation. Fares, seats, and payment are test data; no airline reservation is made.
        </p>
      ) : null}
      <PageIntro
        kicker="Seat map"
        title="Choose seats"
        description={
          entitlements.waiveSeatFees
            ? "Seats are held for seven hours after you continue. Pro complimentary seat selection is active."
            : "Seats are held for seven hours after you continue. Seat surcharges apply unless you upgrade to Pro."
        }
      />
      <SeatBookingForm
        outbound={outbound as FlightDetails}
        inbound={inbound}
        tripType={tripType}
        cabin={cabin}
        passengerCount={passengerCount}
        outboundClaims={(outboundClaims ?? []) as SeatClaim[]}
        inboundClaims={inboundClaims}
        waiveSeatFees={entitlements.waiveSeatFees}
      />
    </div>
  );
}
