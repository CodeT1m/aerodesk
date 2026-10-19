import "server-only";

import { getFreshClient } from "@/sanity/lib/fresh";
import { getWriteClient } from "@/sanity/lib/write-client";
import { HOLD_MS } from "./ids";

const EXPIRED_BOOKINGS_QUERY = `*[_type == "booking"
  && status in ["held", "payment_failed"]
  && paymentStatus in ["unpaid", "dummy_declined"]
  && defined(holdExpiresAt)
  && holdExpiresAt <= $now
  && _createdAt <= $createdCutoff
][0...100]{_id}`;

export async function deleteExpiredUnpaidHolds(now = Date.now()): Promise<{ deleted: number }> {
  const params = {
    now: new Date(now).toISOString(),
    createdCutoff: new Date(now - HOLD_MS).toISOString(),
  };
  const expired = await getFreshClient().fetch<{ _id: string }[]>(EXPIRED_BOOKINGS_QUERY, params);
  const write = getWriteClient();
  let deleted = 0;

  for (const booking of expired) {
    await write.mutate([
      { delete: {
        query: `*[_type == "seatClaim" && booking._ref == $bookingId
          && status == "held" && expiresAt <= $now]`,
        params: { bookingId: booking._id, now: params.now },
      } },
      { delete: {
        query: `*[_type == "booking" && _id == $bookingId
          && status in ["held", "payment_failed"]
          && paymentStatus in ["unpaid", "dummy_declined"]
          && holdExpiresAt <= $now && _createdAt <= $createdCutoff]`,
        params: { bookingId: booking._id, ...params },
      } },
    ], { visibility: "sync" });
    deleted += 1;
  }

  return { deleted };
}
