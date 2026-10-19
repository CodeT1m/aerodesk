import { tool } from "ai";
import { z } from "zod";
import { client } from "@/sanity/lib/client";
import {
  BOOKING_BY_ID_QUERY,
  FLIGHT_DETAILS_QUERY,
  FLIGHT_SEARCH_QUERY,
  MY_BOOKINGS_QUERY,
  SEMANTIC_CATALOG_QUERY,
} from "@/sanity/lib/queries";
import { checkoutHref, canResumePayment } from "@/lib/booking/status";
import { draftBookingHandoff, flightsPageHref, ownBookingOrError, seatPickerHref } from "@/lib/ai/handoff";
import { rankSeatsByPreference } from "@/lib/ai/seat-recs";
import { dayBoundsUtc, isCabin, type SeatDefinition } from "@/lib/types";

const fresh = client.withConfig({
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

export function conciergeTools(userId: string) {
  return {
    searchCatalogByMeaning: tool({
      description:
        "Semantic search over published Aerodesk catalog content: support articles, airports, aircraft seat guides, and flights. Use for policy questions, cabin explanations, or seat preferences such as window seat, aisle seat, middle seat, extra legroom, exit row, or accessible seating. Not for live seat holds, payments, or exact IATA/date flight lookup.",
      inputSchema: z.object({
        query: z
          .string()
          .min(3)
          .max(240)
          .describe("Natural-language question or topic, e.g. I want a window seat"),
      }),
      execute: async ({ query }) => {
        const results = await fresh.fetch(SEMANTIC_CATALOG_QUERY, { query } as never);
        return { query, results };
      },
    }),
    searchFlights: tool({
      description:
        "Search published Aerodesk flights by origin IATA, destination IATA, and departure date. Not for live seat inventory.",
      inputSchema: z.object({
        origin: z.string().length(3),
        destination: z.string().length(3),
        date: z.string().describe("YYYY-MM-DD"),
        cabin: z.enum(["economy", "business", "first"]).optional(),
      }),
      execute: async ({ origin, destination, date, cabin }) => {
        const window = dayBoundsUtc(date);
        const flights = await fresh.fetch(FLIGHT_SEARCH_QUERY, {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          start: window.start,
          end: window.end,
        });
        return { flights, cabin: cabin ?? null };
      },
    }),
    getFlightDetails: tool({
      description: "Get a flight's schedule, cabins, and seat map layout. Seat occupancy comes from getSeatMap.",
      inputSchema: z.object({ flightId: z.string() }),
      execute: async ({ flightId }) => fresh.fetch(FLIGHT_DETAILS_QUERY, { id: flightId }),
    }),
    getSeatMap: tool({
      description: "Return the seat layout for a flight cabin. Treat occupancy as advisory until the user confirms in the booking UI.",
      inputSchema: z.object({
        flightId: z.string(),
        cabin: z.enum(["economy", "business", "first"]),
      }),
      execute: async ({ flightId, cabin }) => {
        const flight = await fresh.fetch(FLIGHT_DETAILS_QUERY, { id: flightId });
        if (!flight || !isCabin(cabin)) return { error: "Flight or cabin not found" };
        return {
          flightId,
          cabin,
          seats: flight.aircraft?.seats?.filter((seat: { cabin: string }) => seat.cabin === cabin) ?? [],
        };
      },
    }),
    listMyTrips: tool({
      description: "List the signed-in traveler's Aerodesk bookings. Never accept another user id. Include checkoutHref when dummy payment can still be resumed.",
      inputSchema: z.object({}),
      execute: async () => {
        const bookings = (await fresh.fetch(MY_BOOKINGS_QUERY, { clerkUserId: userId })) as {
          _id: string;
          status: string;
          paymentStatus: string;
          holdExpiresAt?: string;
        }[];
        return bookings.map((booking) => ({
          ...booking,
          checkoutHref: canResumePayment(booking) ? checkoutHref(booking._id) : null,
        }));
      },
    }),
    getMyBooking: tool({
      description: "Get one of the signed-in traveler's bookings by document id.",
      inputSchema: z.object({ bookingId: z.string() }),
      execute: async ({ bookingId }) => {
        const booking = await fresh.fetch<{
          _id: string;
          clerkUserId: string;
          status: string;
          paymentStatus: string;
          holdExpiresAt?: string;
        } | null>(BOOKING_BY_ID_QUERY, { id: bookingId });
        const owned = ownBookingOrError(booking, userId);
        if ("error" in owned) return owned;
        return {
          ...owned,
          checkoutHref: canResumePayment(owned) ? checkoutHref(owned._id) : null,
        };
      },
    }),
    draftItinerary: tool({
      description:
        "Create a booking handoff URL the UI can render as a confirm card. Does not hold seats or take payment.",
      inputSchema: z.object({
        origin: z.string().length(3),
        destination: z.string().length(3),
        tripType: z.enum(["oneway", "roundtrip"]),
        departDate: z.string(),
        returnDate: z.string().optional(),
        cabin: z.enum(["economy", "business", "first"]),
        passengers: z.number().int().min(1).max(4),
        outboundId: z.string().optional(),
        inboundId: z.string().optional(),
      }),
      execute: async (input) => draftBookingHandoff(input),
    }),
    getFlightsPageHref: tool({
      description: "Build a /flights search URL. Use when the traveler should browse results in Aerodesk. Not a seat hold.",
      inputSchema: z.object({
        origin: z.string().length(3),
        destination: z.string().length(3),
        tripType: z.enum(["oneway", "roundtrip"]),
        departDate: z.string(),
        returnDate: z.string().optional(),
        cabin: z.enum(["economy", "business", "first"]),
        passengers: z.number().int().min(1).max(4),
      }),
      execute: async (input) => flightsPageHref(input),
    }),
    getSeatPickerHref: tool({
      description: "Build a /booking/seats URL after the traveler picks a flight. Does not hold seats.",
      inputSchema: z.object({
        origin: z.string().length(3),
        destination: z.string().length(3),
        tripType: z.enum(["oneway", "roundtrip"]),
        departDate: z.string(),
        returnDate: z.string().optional(),
        cabin: z.enum(["economy", "business", "first"]),
        passengers: z.number().int().min(1).max(4),
        outboundId: z.string(),
        inboundId: z.string().optional(),
      }),
      execute: async (input) => seatPickerHref(input),
    }),
    recommendSeats: tool({
      description:
        "Recommend published window, aisle, extra-legroom, or accessible seats for a flight cabin. Advisory only; the traveler confirms on the visual map.",
      inputSchema: z.object({
        flightId: z.string(),
        cabin: z.enum(["economy", "business", "first"]),
        preference: z.enum(["window", "aisle", "extra_legroom", "accessible"]),
      }),
      execute: async ({ flightId, cabin, preference }) => {
        const flight = await fresh.fetch(FLIGHT_DETAILS_QUERY, { id: flightId });
        if (!flight || !isCabin(cabin)) return { error: "Flight or cabin not found" };
        const seats = rankSeatsByPreference(
          (flight.aircraft?.seats ?? []) as SeatDefinition[],
          cabin,
          preference,
        );
        return {
          flightId,
          cabin,
          preference,
          flightNumber: flight.flightNumber as string,
          seats,
        };
      },
    }),
  };
}
