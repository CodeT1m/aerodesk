import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingActions } from "@/components/booking-actions";
import { PageIntro } from "@/components/page-intro";
import { getEntitlements } from "@/lib/entitlements";
import { canResumePayment } from "@/lib/booking/status";
import { formatMoney } from "@/lib/types";
import { MY_BOOKINGS_QUERY } from "@/sanity/lib/queries";
import { getFreshClient } from "@/sanity/lib/fresh";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const { userId } = await getEntitlements();
  if (!userId) redirect("/sign-in");

  const bookings = ((await getFreshClient().fetch(MY_BOOKINGS_QUERY, { clerkUserId: userId })) ?? []) as {
    _id: string;
    reference: string;
    status: string;
    paymentStatus: string;
    totalCents: number;
    currency: string;
    holdExpiresAt?: string;
    legs: { flightNumber: string; originIata: string; destinationIata: string }[];
  }[];

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Travel wallet"
        title="My trips"
        description="Confirmed tickets and unpaid holds. If a seat hold is still live, you can resume dummy payment here."
      />
      {bookings.length === 0 ? (
        <p className="text-muted-foreground">No bookings yet. Search a flight to get started.</p>
      ) : (
        bookings.map((booking, index) => (
          <Card
            key={booking._id}
            className="transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{booking.reference}</p>
                <p className="text-sm text-muted-foreground">
                  {(booking.legs ?? [])
                    .map((leg) => `${leg.flightNumber} ${leg.originIata}→${leg.destinationIata}`)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-sm">
                  {formatMoney(booking.totalCents, booking.currency)} · {booking.status.replaceAll("_", " ")}
                  {canResumePayment(booking) && booking.holdExpiresAt
                    ? ` · hold until ${new Date(booking.holdExpiresAt).toLocaleTimeString()}`
                    : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BookingActions booking={booking} />
                <Button variant="ghost" asChild>
                  <Link href={`/booking/confirmation/${encodeURIComponent(booking._id)}`}>Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
