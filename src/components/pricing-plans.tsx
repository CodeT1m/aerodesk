"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { Show, SignInButton, useAuth, useClerk } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ?? "";

const features = {
  free: ["Search one-way and round-trip flights", "Visual seat picker", "Dummy flight checkout"],
  pro: [
    "Everything in Free",
    "Complimentary seat-selection surcharges",
    "Concierge Desk for search, support, and booking help",
  ],
};

export function PricingPlans() {
  const { has, isLoaded } = useAuth();
  const { session } = useClerk();
  const router = useRouter();
  const [period, setPeriod] = useState<"month" | "annual">("month");
  const isPro = Boolean(has?.({ plan: "pro" }));

  async function refreshMembership() {
    await session?.reload();
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Tabs value={period} onValueChange={(value) => setPeriod(value as "month" | "annual")}>
        <TabsList>
          <TabsTrigger value="month">Monthly</TabsTrigger>
          <TabsTrigger value="annual">Annual</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          current={!isPro && isLoaded}
          features={features.free}
          action={
            isPro ? (
              <p className="text-sm text-muted-foreground">Included as the fallback plan.</p>
            ) : (
              <Badge>Current membership</Badge>
            )
          }
        />
        <PlanCard
          name="Pro"
          price={period === "month" ? "$19" : "$190"}
          cadence={period === "month" ? "/month" : "/year"}
          current={isPro}
          highlighted
          features={features.pro}
          action={
            isPro ? (
              <Badge>Current membership</Badge>
            ) : (
              <Show
                when="signed-in"
                fallback={
                  <SignInButton mode="modal" forceRedirectUrl="/pricing">
                    <Button className="w-full">Sign in to upgrade</Button>
                  </SignInButton>
                }
              >
                {PRO_PLAN_ID ? (
                  <CheckoutButton
                    planId={PRO_PLAN_ID}
                    planPeriod={period}
                    for="user"
                    newSubscriptionRedirectUrl="/pricing"
                    onSubscriptionComplete={() => {
                      void refreshMembership();
                    }}
                  >
                    <Button className="w-full">
                      Upgrade to Pro · {period === "month" ? "$19/mo" : "$190/yr"}
                    </Button>
                  </CheckoutButton>
                ) : (
                  <p className="text-sm text-destructive">Pro plan ID is not configured.</p>
                )}
              </Show>
            )
          }
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  current,
  highlighted,
  features: planFeatures,
  action,
}: {
  name: string;
  price: string;
  cadence?: string;
  current: boolean;
  highlighted?: boolean;
  features: string[];
  action: React.ReactNode;
}) {
  return (
    <Card className={highlighted ? "border-primary" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{name}</CardTitle>
          {current ? <Badge variant="secondary">You are here</Badge> : null}
        </div>
        <p className="text-3xl font-semibold">
          {price}
          {cadence ? <span className="text-base font-normal text-muted-foreground">{cadence}</span> : null}
        </p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {planFeatures.map((feature) => (
          <p key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4" />
            {feature}
          </p>
        ))}
      </CardContent>
      <CardFooter>{action}</CardFooter>
    </Card>
  );
}
