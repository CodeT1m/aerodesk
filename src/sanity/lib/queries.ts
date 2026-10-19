import { groq } from "next-sanity";

export const AIRPORTS_QUERY = groq`*[_type == "airport"] | order(city asc) {
  _id,
  iata,
  name,
  city,
  country,
  timezone
}`;

export const FLIGHT_SEARCH_QUERY = groq`*[_type == "flightInstance"
  && status == "scheduled"
  && origin->iata == $origin
  && destination->iata == $destination
  && departureAt >= $start
  && departureAt < $end
] | order(departureAt asc) {
  _id,
  flightNumber,
  departureAt,
  arrivalAt,
  status,
  origin->{ iata, name, city, timezone },
  destination->{ iata, name, city, timezone },
  aircraft->{ _id, name, code, layoutVersion },
  fares[]{ cabin, amountCents, currency }
}`;

export const FLIGHT_DETAILS_QUERY = groq`*[_type == "flightInstance" && _id == $id][0] {
  _id,
  flightNumber,
  departureAt,
  arrivalAt,
  status,
  origin->{ iata, name, city, country, timezone },
  destination->{ iata, name, city, country, timezone },
  aircraft->{
    _id,
    name,
    code,
    layoutVersion,
    seatGuide,
    seats[]{ _key, code, cabin, row, column, position, extraFeeCents, isExit, isAccessible }
  },
  fares[]{ cabin, amountCents, currency }
}`;

export const SEAT_CLAIMS_QUERY = groq`*[_type == "seatClaim"
  && flight._ref == $flightId
  && status in ["held", "confirmed"]
] {
  _id,
  _rev,
  seatCode,
  status,
  clerkUserId,
  expiresAt,
  booking->{_id}
}`;

export const BOOKING_BY_ID_QUERY = groq`*[_type == "booking" && _id == $id][0] {
  _id,
  _rev,
  reference,
  clerkUserId,
  tripType,
  status,
  paymentStatus,
  passengers[]{ givenName, familyName, email },
  legs[]{
    flight->{_id, flightNumber},
    flightNumber,
    originIata,
    destinationIata,
    departureAt,
    arrivalAt,
    cabin,
    seatCodes,
    fare
  },
  totalCents,
  currency,
  proSeatWaiverApplied,
  idempotencyKey,
  holdExpiresAt,
  confirmedAt
}`;

export const BOOKING_BY_IDEMPOTENCY_QUERY = groq`*[_type == "booking" && clerkUserId == $clerkUserId && idempotencyKey == $idempotencyKey][0] {
  _id,
  reference,
  status,
  paymentStatus,
  totalCents,
  currency
}`;

export const MY_BOOKINGS_QUERY = groq`*[_type == "booking" && clerkUserId == $clerkUserId] | order(_createdAt desc) {
  _id,
  reference,
  tripType,
  status,
  paymentStatus,
  totalCents,
  currency,
  confirmedAt,
  holdExpiresAt,
  legs[]{ flightNumber, originIata, destinationIata, departureAt, cabin, seatCodes }
}`;

export const SUPPORT_ARTICLES_QUERY = groq`*[_type == "supportArticle"] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  category,
  summary
}`;

export const SEMANTIC_CATALOG_QUERY = groq`*[
  _type in ["supportArticle", "airport", "aircraftType", "flightInstance"]
] | score(text::semanticSimilarity($query)) | order(_score desc) [0...8] {
  _id,
  _type,
  _score,
  _embeddings,
  title,
  summary,
  category,
  "slug": slug.current,
  iata,
  name,
  city,
  country,
  timezone,
  flightNumber,
  status,
  code,
  seatGuide
}`;

export const CONCIERGE_PROMPT_QUERY = groq`*[_id == "conciergePrompt" && _type == "conciergePrompt"][0]{
  title,
  systemPrompt
}`;

export const CONCIERGE_CONVERSATIONS_QUERY = groq`*[_type == "conciergeConversation"] | order(coalesce(lastMessageAt, _updatedAt) desc) [0...80] {
  _id,
  threadId,
  firstMessage,
  messageCount,
  lastMessageAt,
  classification
}`;
