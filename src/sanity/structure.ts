import type { StructureResolver } from "sanity/structure";
import { BoltIcon } from "@sanity/icons/Bolt";
import { CONCIERGE_PROMPT_ID } from "./schemaTypes/agent";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Aerodesk")
    .items([
      S.listItem()
        .title("Concierge prompt")
        .icon(BoltIcon)
        .child(
          S.document()
            .schemaType("conciergePrompt")
            .documentId(CONCIERGE_PROMPT_ID)
            .title("Concierge prompt"),
        ),
      S.divider(),
      S.listItem()
        .title("Flights")
        .child(S.documentTypeList("flightInstance").title("Flights")),
      S.listItem()
        .title("Airports")
        .child(S.documentTypeList("airport").title("Airports")),
      S.listItem()
        .title("Fleet")
        .child(S.documentTypeList("aircraftType").title("Aircraft types")),
      S.listItem()
        .title("Bookings")
        .child(S.documentTypeList("booking").title("Bookings")),
      S.listItem()
        .title("Seat claims")
        .child(S.documentTypeList("seatClaim").title("Seat claims")),
      S.listItem()
        .title("Support")
        .child(S.documentTypeList("supportArticle").title("Support articles")),
      S.divider(),
      S.listItem()
        .title("Concierge conversations")
        .child(S.documentTypeList("conciergeConversation").title("Concierge conversations")),
    ]);
