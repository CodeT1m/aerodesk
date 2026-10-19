"use client";

import dynamic from "next/dynamic";
import config from "../../../sanity.config";

const NextStudio = dynamic(() => import("next-sanity/studio").then((mod) => mod.NextStudio), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-background text-sm text-muted-foreground">
      Loading Aerodesk Studio…
    </div>
  ),
});

export function StudioClient() {
  return <NextStudio config={config} />;
}
