import { PageIntro } from "@/components/page-intro";
import { PricingPlans } from "@/components/pricing-plans";
import { getEntitlements } from "@/lib/entitlements";

export default async function PricingPage() {
  const entitlements = await getEntitlements();

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Membership"
        title="Membership"
        description={`Free covers the full dummy booking flow. Pro waives seat-selection surcharges and unlocks Concierge Desk. Your current membership is ${entitlements.isPro ? "Pro" : "Free"}.`}
      />
      <PricingPlans />
    </div>
  );
}
