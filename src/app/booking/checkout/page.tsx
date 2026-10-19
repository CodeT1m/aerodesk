import { DummyCheckout } from "@/components/dummy-checkout";
import { PageIntro } from "@/components/page-intro";
import { getEntitlements } from "@/lib/entitlements";
import { canResumePayment, isHoldExpired } from "@/lib/booking/status";
import { BOOKING_BY_ID_QUERY } from "@/sanity/lib/queries";
import { getFreshClient } from "@/sanity/lib/fresh";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId: rawBookingId } = await searchParams;
  const bookingId = rawBookingId ? decodeURIComponent(rawBookingId) : undefined;
  const { userId } = await getEntitlements();
  if (!userId) redirect("/sign-in");
  if (!bookingId) {
    return (
      <MissingCheckout
        title="No booking to pay for"
        body="Select seats first so Aerodesk can hold them, then continue to dummy checkout."
      />
    );
  }

  const booking = await getFreshClient().fetch(BOOKING_BY_ID_QUERY, { id: bookingId });

  if (!booking || booking.clerkUserId !== userId) {
    return (
      <MissingCheckout
        title="Checkout is still catching up"
        body="Your seats were held, but this booking is not visible yet. Open My trips or return to seat selection and continue again."
      />
    );
  }

  if (booking.status === "confirmed") {
    redirect(`/booking/confirmation/${encodeURIComponent(booking._id)}`);
  }

  if (isHoldExpired(booking.holdExpiresAt) || !canResumePayment(booking)) {
    return (
      <MissingCheckout
        title="This hold is no longer payable"
        body="The seat hold expired or this booking cannot take dummy payment. Search again and pick seats to start a new hold."
      />
    );
  }

  return (
    <div className="grid gap-6 duration-500 animate-in fade-in slide-in-from-bottom-3">
      <PageIntro
        kicker="Dummy checkout"
        title="Resume and pay"
        description="Seats are still held. Finish dummy payment here, or come back from My trips while the hold is live."
      />
      <DummyCheckout booking={booking} />
    </div>
  );
}

function MissingCheckout({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid max-w-xl gap-4">
      <PageIntro kicker="Checkout" title={title} description={body} />
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" href="/trips">
          View my trips
        </Link>
        <Link className="rounded-lg border border-border px-3 py-2 text-sm" href="/">
          Search again
        </Link>
      </div>
    </div>
  );
}
