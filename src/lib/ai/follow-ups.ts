export type FollowUp = { label: string; prompt: string };

type Toolish = { type?: string; state?: string };

export function suggestedFollowUps(parts: Toolish[]): FollowUp[] {
  const types = new Set(
    parts
      .filter((part) => part.state === "output-available" && typeof part.type === "string")
      .map((part) => part.type ?? ""),
  );

  if (types.has("tool-searchFlights") || types.has("tool-getFlightDetails")) {
    return [
      { label: "Use the first flight", prompt: "Use the first listed flight and draft a booking handoff for one adult." },
      { label: "Business fares", prompt: "Show the same route in Business class." },
      { label: "Window seats", prompt: "Which window seats should I pick on that aircraft?" },
    ];
  }
  if (types.has("tool-recommendSeats") || types.has("tool-getSeatMap")) {
    return [
      { label: "Open seat picker", prompt: "Give me the seat picker link so I can confirm seats in Aerodesk." },
      { label: "Aisle instead", prompt: "Recommend aisle seats on the same flight and cabin." },
      { label: "Extra legroom", prompt: "Which exit-row seats have extra legroom?" },
    ];
  }
  if (types.has("tool-draftItinerary") || types.has("tool-getSeatPickerHref")) {
    return [
      { label: "Change cabin", prompt: "Redo that itinerary in Business." },
      { label: "Search again", prompt: "Search a different date for the same airports." },
    ];
  }
  if (types.has("tool-listMyTrips") || types.has("tool-getMyBooking")) {
    return [
      { label: "Resume payment", prompt: "Which of my trips can still resume dummy payment?" },
      { label: "Book another", prompt: "Help me search a new one-way from SFO to JFK." },
    ];
  }
  if (types.has("tool-searchCatalogByMeaning")) {
    return [
      { label: "Pro seat fees", prompt: "Does Aerodesk Pro waive seat-selection surcharges?" },
      { label: "Dummy payment", prompt: "How does dummy payment work, and can you take payment?" },
      { label: "Search flights", prompt: "Search published SFO to JFK flights in the next few days." },
    ];
  }
  return [
    { label: "Search SFO–JFK", prompt: "Search published Aerodesk flights from SFO to JFK in the next few days." },
    { label: "My trips", prompt: "List my Aerodesk bookings and any unpaid holds." },
  ];
}
