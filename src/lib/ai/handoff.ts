export type BookingHandoffInput = {
  origin: string;
  destination: string;
  tripType: "oneway" | "roundtrip";
  departDate: string;
  returnDate?: string;
  cabin: "economy" | "business" | "first";
  passengers: number;
  outboundId?: string;
  inboundId?: string;
};

export function draftBookingHandoff(input: BookingHandoffInput) {
  const params = new URLSearchParams({
    origin: input.origin.toUpperCase(),
    destination: input.destination.toUpperCase(),
    tripType: input.tripType,
    departDate: input.departDate,
    cabin: input.cabin,
    passengers: String(input.passengers),
  });
  if (input.returnDate) params.set("returnDate", input.returnDate);
  if (input.outboundId) params.set("outboundId", input.outboundId);
  if (input.inboundId) params.set("inboundId", input.inboundId);
  const href = input.outboundId ? `/booking/seats?${params}` : `/flights?${params}`;
  return {
    href,
    label: input.outboundId ? "Open seat picker" : "Review flights",
    ...input,
    origin: input.origin.toUpperCase(),
    destination: input.destination.toUpperCase(),
  };
}

export function flightsPageHref(input: {
  origin: string;
  destination: string;
  tripType: "oneway" | "roundtrip";
  departDate: string;
  returnDate?: string;
  cabin: "economy" | "business" | "first";
  passengers: number;
}) {
  return draftBookingHandoff(input);
}

export function seatPickerHref(input: BookingHandoffInput & { outboundId: string }) {
  return draftBookingHandoff(input);
}

export function ownBookingOrError<T extends { clerkUserId: string }>(
  booking: T | null,
  userId: string,
): T | { error: string } {
  if (!booking || booking.clerkUserId !== userId) {
    return { error: "Booking not found" };
  }
  return booking;
}
