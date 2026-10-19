import { Button } from "@/components/ui/button";
import { canResumePayment, checkoutHref } from "@/lib/booking/status";
import Link from "next/link";

type BookingActionsProps = {
  booking: {
    _id: string;
    status: string;
    paymentStatus: string;
    holdExpiresAt?: string;
  };
};

export function BookingActions({ booking }: BookingActionsProps) {
  if (canResumePayment(booking)) {
    return (
      <Button asChild>
        <Link href={checkoutHref(booking._id)}>Resume payment</Link>
      </Button>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <Button variant="outline" asChild>
        <Link href={`/booking/confirmation/${encodeURIComponent(booking._id)}`}>View ticket</Link>
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href="/">Search again</Link>
    </Button>
  );
}
