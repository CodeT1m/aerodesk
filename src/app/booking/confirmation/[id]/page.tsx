import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookingActions } from "@/components/booking-actions";
import { PageIntro } from "@/components/page-intro";
import { getEntitlements } from "@/lib/entitlements";
import { canResumePayment } from "@/lib/booking/status";
import { formatMoney } from "@/lib/types";
import { BOOKING_BY_ID_QUERY } from "@/sanity/lib/queries";
import { getFreshClient } from "@/sanity/lib/fresh";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { userId } = await getEntitlements();
  if (!userId) redirect("/sign-in");

  const booking = await getFreshClient().fetch(BOOKING_BY_ID_QUERY, { id });

  if (!booking || booking.clerkUserId !== userId) {
    notFound();
  }

  const payable = canResumePayment(booking);
  const paymentLabel =
    booking.paymentStatus === "dummy_succeeded"
      ? "succeeded"
      : payable
        ? "is unpaid. Resume dummy payment while the seat hold is live."
        : booking.paymentStatus.replaceAll("_", " ");

  return (
    <div className="grid gap-6 duration-500 animate-in fade-in zoom-in-95">
      <div>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{booking.status}</Badge>
        <PageIntro
          title={`Booking ${booking.reference}`}
          description={`Dummy payment ${paymentLabel}`}
        />
      </div>
      <Card className="border-sky-500/20 bg-card/80 shadow-lg shadow-sky-500/10">
        <CardContent className="grid gap-3 p-5 text-sm">
          {(booking.legs ?? []).map((leg: {
            flightNumber: string;
            originIata: string;
            destinationIata: string;
            seatCodes: string[];
            departureAt: string;
          }) => (
            <p key={`${leg.flightNumber}-${leg.originIata}`}>
              {leg.flightNumber} {leg.originIata}→{leg.destinationIata} · {leg.seatCodes.join(", ")} ·{" "}
              {new Date(leg.departureAt).toLocaleString()}
            </p>
          ))}
          <p className="text-lg font-semibold">{formatMoney(booking.totalCents, booking.currency)}</p>
          {payable && booking.holdExpiresAt ? (
            <p className="text-muted-foreground">
              Hold expires {new Date(booking.holdExpiresAt).toLocaleString()}.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <BookingActions booking={booking} />
        <Link href="/trips" className="text-sm text-sky-600 underline dark:text-sky-300">
          View all trips
        </Link>
      </div>
    </div>
  );
}
