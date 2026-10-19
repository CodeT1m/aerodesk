import { ConciergeChat } from "@/components/concierge-chat";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { getEntitlements } from "@/lib/entitlements";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ConciergePage() {
  const entitlements = await getEntitlements();
  if (!entitlements.userId) {
    redirect("/sign-in");
  }

  if (!entitlements.hasConcierge) {
    return (
      <div className="grid max-w-xl gap-4">
        <PageIntro
          kicker="Pro"
          title="Concierge Desk"
          description="Concierge Desk is included with Aerodesk Pro. Upgrade to search flights, ask support questions, and start bookings with an agent."
        />
        <Button asChild>
          <Link href="/pricing">View membership</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Concierge"
        title="Concierge Desk"
        description="Ask about routes, cabins, seats, and trips. Concierge can guide a simulated booking, then hand you off to choose a seat and check out."
      />
      <ConciergeChat />
    </div>
  );
}
