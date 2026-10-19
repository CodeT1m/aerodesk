import type { SchemaTypeDefinition } from "sanity";
import { aircraftType, airport, cabinFare, seatDefinition } from "./catalog";
import { flightInstance } from "./flight";
import { conciergeConversation, conciergePrompt } from "./agent";
import {
  booking,
  bookingLeg,
  fareSnapshot,
  passengerSnapshot,
  seatClaim,
  supportArticle,
} from "./booking";

export const schemaTypes: SchemaTypeDefinition[] = [
  airport,
  seatDefinition,
  aircraftType,
  cabinFare,
  flightInstance,
  passengerSnapshot,
  fareSnapshot,
  bookingLeg,
  booking,
  seatClaim,
  supportArticle,
  conciergePrompt,
  conciergeConversation,
];
