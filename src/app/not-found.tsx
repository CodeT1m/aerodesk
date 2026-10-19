import { PageIntro } from "@/components/page-intro";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid max-w-xl gap-4">
      <PageIntro
        kicker="404"
        title="That page is off the map"
        description="The flight, booking, or page you asked for is not here. Search again or open My trips."
      />
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" href="/">
          Back to search
        </Link>
        <Link className="rounded-lg border border-border px-3 py-2 text-sm" href="/trips">
          My trips
        </Link>
      </div>
    </div>
  );
}
