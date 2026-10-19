import { FlightSearchForm } from "@/components/flight-search-form";
import { AIRPORTS_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";
import { defaultSearchDates, type AirportSummary } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";

const featuredRoutes = [
  { origin: "KUL", destination: "SIN" },
  { origin: "SFO", destination: "LAX" },
  { origin: "LHR", destination: "CDG" },
  { origin: "JFK", destination: "ORD" },
];

export default async function HomePage() {
  const { data } = await sanityFetch({ query: AIRPORTS_QUERY });
  const airports = (data ?? []) as AirportSummary[];
  const dates = defaultSearchDates();

  return (
    <div className="grid gap-8 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#24516a] bg-[#09283e] px-6 py-10 text-white shadow-[0_30px_65px_-40px_#082f48] sm:px-10 sm:py-14">
        <div className="site-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full bg-cyan-200/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-3 text-cyan-200"><span className="h-px w-9 bg-cyan-200/70" aria-hidden="true" />YOUR NEXT DEPARTURE STARTS HERE</p>
            <h1 className="display-type mt-7 text-6xl font-semibold text-balance sm:text-7xl lg:text-[5.8rem]">A clearer way<br />to take flight<span className="text-cyan-200">.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">Find a route, compare cabins, choose your seat, and explore the whole booking journey. Every checkout on Aerodesk is a simulation.</p>
            <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-slate-300"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_#a5f3fc]" />Live flight status</span><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-amber-300" />Sample itineraries</span><span>Visual seat selection</span></div>
          </div>
          <div className="relative hidden min-h-52 rounded-2xl border border-cyan-100/15 bg-white/5 p-6 lg:block" aria-hidden="true">
            <div className="eyebrow text-cyan-200">FLIGHT PATH / EXPLORE</div>
            <div className="absolute left-8 right-8 top-1/2 border-t border-dashed border-cyan-200/60" />
            <div className="absolute left-7 top-[calc(50%-4px)] size-2 rounded-full border-2 border-cyan-200 bg-[#09283e] shadow-[0_0_16px_#a5f3fc]" />
            <Plane className="absolute left-1/2 top-[calc(50%-15px)] size-7 rotate-90 fill-cyan-200 text-cyan-200 drop-shadow-[0_0_18px_#67e8f9]" />
            <div className="absolute right-7 top-[calc(50%-4px)] size-2 rounded-full border-2 border-cyan-200 bg-[#09283e] shadow-[0_0_16px_#a5f3fc]" />
            <div className="absolute inset-x-6 bottom-5 flex justify-between font-mono text-xs tracking-widest text-slate-300"><span>ORIGIN</span><span>DESTINATION</span></div>
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[.32fr_.68fr] lg:items-start" aria-label="Find a flight">
        <div className="pt-3"><p className="eyebrow text-primary">01 / FLIGHT SEARCH</p><h2 className="display-type mt-3 text-4xl font-semibold sm:text-5xl">Where to next?</h2><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Start with a route and travel date. Live status and sample flights appear together in the results.</p></div>
        <div className="duration-700 animate-in fade-in slide-in-from-bottom-4"><FlightSearchForm airports={airports} defaults={dates} /></div>
      </section>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-6 text-sm">
        <span className="eyebrow mr-2 text-muted-foreground">POPULAR ROUTES</span>
        {featuredRoutes.map((route) => {
          const search = new URLSearchParams({
            ...route,
            tripType: "oneway",
            departDate: dates.departDate,
            cabin: "economy",
            passengers: "1",
          });
          return (
            <Link key={`${route.origin}-${route.destination}`} href={`/flights?${search}`} className="route-chip inline-flex items-center gap-3 rounded-full px-4 py-2 font-mono text-xs font-semibold tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {route.origin}<ArrowRight className="size-3 text-primary" />{route.destination}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
