import { auth } from "@clerk/nextjs/server";

export type Entitlements = {
  userId: string | null;
  isPro: boolean;
  hasConcierge: boolean;
  waiveSeatFees: boolean;
};

export async function getEntitlements(): Promise<Entitlements> {
  const { userId, has } = await auth();
  const isPro = Boolean(userId && has({ plan: "pro" }));
  const hasConcierge = Boolean(userId && has({ feature: "ai_concierge" }));
  const waiveSeatFees = Boolean(userId && has({ feature: "free_seat_selection" }));

  return {
    userId: userId ?? null,
    isPro,
    hasConcierge,
    waiveSeatFees,
  };
}
