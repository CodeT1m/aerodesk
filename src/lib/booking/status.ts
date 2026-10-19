export type PayableBooking = {
  _id: string;
  status: string;
  paymentStatus: string;
  holdExpiresAt?: string;
};

export function isHoldExpired(holdExpiresAt: string | undefined, now = Date.now()): boolean {
  if (!holdExpiresAt) return false;
  return new Date(holdExpiresAt).getTime() <= now;
}

export function canResumePayment(booking: PayableBooking, now = Date.now()): boolean {
  const unpaid =
    booking.paymentStatus === "unpaid" || booking.paymentStatus === "dummy_declined";
  const open = booking.status === "held" || booking.status === "payment_failed";
  return unpaid && open && !isHoldExpired(booking.holdExpiresAt, now);
}

export function checkoutHref(bookingId: string): string {
  return `/booking/checkout?bookingId=${encodeURIComponent(bookingId)}`;
}
