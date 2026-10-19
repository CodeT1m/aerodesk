export const CONCIERGE_PRESETS = [
  {
    label: "Window seat",
    prompt: "I want a window seat from SFO to JFK. Which columns should I pick in Economy, Business, and First?",
  },
  {
    label: "Aisle seat",
    prompt: "I want an aisle seat with extra legroom. How does that map on the A321neo?",
  },
  {
    label: "SFO to JFK",
    prompt: "Search published Aerodesk flights from SFO to JFK in the next few days and summarize cabins and fares.",
  },
  {
    label: "Cabin comparison",
    prompt: "What is the difference between Economy, Business, and First on Aerodesk, including seat layout?",
  },
  {
    label: "Pro seats",
    prompt: "Does Aerodesk Pro waive seat-selection surcharges, and does it still charge the base fare?",
  },
  {
    label: "Dummy payment",
    prompt: "How does dummy payment work, and can Concierge take payment for me?",
  },
  {
    label: "Start a trip",
    prompt: "Help me draft a round-trip itinerary from London to Singapore in Business for one passenger.",
  },
] as const;
