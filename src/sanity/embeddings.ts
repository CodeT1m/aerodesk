/**
 * Dataset embeddings projection for Aerodesk production.
 *
 * Bookings, seat claims, and Concierge conversation insights are excluded: they change often and are not
 * catalog/support content the Concierge should retrieve by meaning.
 * References cannot be expanded in embeddings projections.
 *
 * Seat preference copy is labeled so questions like "I want a window seat"
 * or "I want an aisle seat" match aircraft guides and support articles.
 */
export const EMBEDDINGS_PROJECTION = `{
  _type == "airport" => {
    iata,
    name,
    city,
    country,
    timezone
  },
  _type == "aircraftType" => {
    name,
    code,
    "seat_preference_guide": seatGuide,
    "window_seats": "I want a window seat. Window seats are Economy A and F, Business A and E, First A and E.",
    "aisle_seats": "I want an aisle seat. Aisle seats are Economy C and D, Business B and D, First B and D.",
    "middle_seats": "I want a middle seat. Middle seats are Economy B and E.",
    "exit_row_seats": "I want extra legroom or an exit row. Economy rows 14 and 15 are exit rows.",
    "accessible_seats": "I need an accessible seat. Accessible seats are 1A, 3A, and 10A."
  },
  _type == "flightInstance" => {
    flightNumber,
    status
  },
  _type == "supportArticle" => {
    title,
    category,
    summary,
    body
  }
}`;
