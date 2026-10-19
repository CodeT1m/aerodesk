import { describe, expect, it } from "vitest";
import { SEMANTIC_CATALOG_QUERY } from "@/sanity/lib/queries";
import { EMBEDDINGS_PROJECTION } from "@/sanity/embeddings";
import { conciergeTools } from "@/lib/ai/tools";
import { draftBookingHandoff, ownBookingOrError } from "@/lib/ai/handoff";

describe("dataset embeddings", () => {
  it("scopes embeddings to catalog and support types", () => {
    expect(EMBEDDINGS_PROJECTION).toContain('_type == "supportArticle"');
    expect(EMBEDDINGS_PROJECTION).toContain('_type == "airport"');
    expect(EMBEDDINGS_PROJECTION).not.toContain("seatClaim");
    expect(EMBEDDINGS_PROJECTION).not.toContain("booking");
  });

  it("embeds window and aisle seat preference copy", () => {
    expect(EMBEDDINGS_PROJECTION).toContain("window_seats");
    expect(EMBEDDINGS_PROJECTION).toContain("aisle_seats");
    expect(EMBEDDINGS_PROJECTION).toContain("I want a window seat");
    expect(EMBEDDINGS_PROJECTION).toContain("I want an aisle seat");
    expect(EMBEDDINGS_PROJECTION).toContain("seat_preference_guide");
  });

  it("ranks catalog retrieval with semantic similarity", () => {
    expect(SEMANTIC_CATALOG_QUERY).toContain("text::semanticSimilarity($query)");
    expect(SEMANTIC_CATALOG_QUERY).toContain("supportArticle");
    expect(SEMANTIC_CATALOG_QUERY).toContain("seatGuide");
  });
});

describe("concierge tool boundaries", () => {
  it("exposes search and handoff tools without hold or payment mutations", () => {
    const tools = conciergeTools("user_me");
    expect(Object.keys(tools)).toEqual([
      "searchCatalogByMeaning",
      "searchFlights",
      "getFlightDetails",
      "getSeatMap",
      "listMyTrips",
      "getMyBooking",
      "draftItinerary",
      "getFlightsPageHref",
      "getSeatPickerHref",
      "recommendSeats",
    ]);
    expect(tools.draftItinerary.description).toMatch(/Does not hold seats or take payment/);
    expect(tools.recommendSeats.description).toMatch(/Advisory only/);
    expect(tools.getSeatPickerHref.description).toMatch(/Does not hold seats/);
    expect(tools.listMyTrips.description).toMatch(/Never accept another user id/);
    expect(tools).not.toHaveProperty("createHold");
    expect(tools).not.toHaveProperty("processDummyPayment");
  });

  it("hands the traveler to the booking UI instead of mutating seats", () => {
    const handoff = draftBookingHandoff({
      origin: "sfo",
      destination: "jfk",
      tripType: "roundtrip",
      departDate: "2026-09-18",
      returnDate: "2026-09-22",
      cabin: "economy",
      passengers: 1,
      outboundId: "flight-ae100-d1",
      inboundId: "flight-ae101-d5",
    });
    expect(handoff.href).toContain("/booking/seats?");
    expect(handoff.href).toContain("outboundId=flight-ae100-d1");
    expect(handoff.label).toMatch(/Open seat picker/);
    expect(handoff.origin).toBe("SFO");
  });

  it("hides another traveler's booking from trip lookup", () => {
    expect(
      ownBookingOrError({ _id: "booking.1", clerkUserId: "user_other" }, "user_me"),
    ).toEqual({ error: "Booking not found" });
  });
});
