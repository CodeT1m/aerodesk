"use client";

import { ArrowRight, Clock3, Plane, Radio, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LiveFlight } from "@/lib/aviationstack";
import { canSimulateLiveFlight } from "@/lib/booking/live-eligibility";
import type { Cabin, TripType } from "@/lib/types";

type Selection = {
  tripType: TripType;
  cabin: Cabin;
  passengers: string;
  departDate: string;
  returnDate?: string;
  outboundId?: string;
};

function clock(value: string | null): string {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
}

function day(value: string | null): string {
  if (!value) return "Time pending";
  return new Date(value).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}

function gate(terminal: string | null, gateCode: string | null): string {
  if (gateCode && terminal) return `${terminal} · ${gateCode}`;
  return gateCode ?? terminal ?? "Pending";
}

export function LiveFlightResults({
  origin,
  destination,
  flights,
  available,
  selection,
}: {
  origin: string;
  destination: string;
  flights: LiveFlight[];
  available: boolean;
  selection: Selection;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isReturn = selection.tripType === "roundtrip" && Boolean(selection.outboundId);

  async function simulate(flight: LiveFlight) {
    setPendingId(flight.id);
    setError(null);
    try {
      const response = await fetch("/api/bookings/simulate-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightId: flight.id,
          origin,
          destination,
          travelDate: isReturn ? selection.returnDate ?? selection.departDate : selection.departDate,
        }),
      });
      const result = await response.json() as { flightId?: string; departureDate?: string; error?: string };
      if (!response.ok || !result.flightId || !result.departureDate) {
        throw new Error(result.error ?? "Could not prepare the simulated flight.");
      }

      const next = new URLSearchParams({
        origin: isReturn ? destination : origin,
        destination: isReturn ? origin : destination,
        tripType: selection.tripType,
        cabin: selection.cabin,
        passengers: selection.passengers,
        departDate: isReturn ? selection.departDate : result.departureDate,
      });
      if (selection.returnDate || isReturn) next.set("returnDate", isReturn ? result.departureDate : selection.returnDate ?? "");
      if (isReturn) {
        next.set("outboundId", selection.outboundId ?? "");
        next.set("inboundId", result.flightId);
      } else {
        next.set("outboundId", result.flightId);
      }
      router.push(`${selection.tripType === "roundtrip" && !isReturn ? "/flights" : "/booking/seats"}?${next}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare the simulated flight.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="flight-board overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#071b2e] text-slate-100 shadow-[0_24px_60px_-30px_rgba(2,28,48,.75),0_0_30px_-18px_rgba(103,232,249,.45)]">
      <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(120deg,#0d3551,#09253c_58%,#122944)] p-6 sm:p-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-cyan-300/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[.22em] text-cyan-200">
              <Radio className="size-3.5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              Aviationstack feed
            </div>
            <h2 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <span>{origin}</span>
              <span className="relative flex w-20 items-center justify-center sm:w-28" aria-hidden="true">
                <span className="absolute inset-x-0 border-t border-dashed border-cyan-300/55" />
                <Plane className="flight-route-plane relative size-5 rotate-90 fill-cyan-300 text-cyan-300" />
              </span>
              <span>{destination}</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Flight status from the current feed, cached for one day. Use a flight as a template for a test itinerary on your selected travel date. The future date, fares, and seats are simulated.
            </p>
          </div>
          <div className="glow-accent rounded-xl border border-cyan-200/30 bg-white/5 px-4 py-3 text-right">
            <div className="font-mono text-2xl font-semibold text-white">{flights.length}</div>
            <div className="text-[11px] uppercase tracking-widest text-cyan-200">Flights in feed</div>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="border-b border-amber-300/20 bg-amber-300/10 px-6 py-3 text-sm text-amber-100">{error}</p>}

      {!available || flights.length === 0 ? (
        <div className="flex items-start gap-3 p-7 text-sm text-slate-300">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden="true" />
          <p>{available ? "No live flights are listed for this route right now. Try another route or use the sample flights below." : "The live feed is unavailable right now. Sample booking flights are still available below."}</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.6fr)_minmax(0,.8fr)_auto] gap-4 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400 lg:grid">
            <span>Flight</span><span>Departure · UTC</span><span>Arrival · UTC</span><span>Gate</span><span>Status</span><span className="w-36">Test flow</span>
          </div>
          {flights.slice(0, 8).map((flight, index) => {
            const canSimulate = canSimulateLiveFlight(flight);
            return (
              <div
                key={flight.id}
                className="flight-board-row grid gap-4 px-6 py-5 transition-colors hover:bg-cyan-200/[.08] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,.6fr)_minmax(0,.8fr)_auto] lg:items-center"
                style={{ animationDelay: `${index * 65}ms` }}
              >
                <div className="min-w-0">
                  <div className="font-mono text-lg font-semibold tracking-wide text-white">{flight.flightNumber}</div>
                  <div className="truncate text-xs text-slate-400">{flight.airline}</div>
                </div>
                <div><div className="font-mono text-lg text-cyan-100">{clock(flight.departureAt)}</div><div className="text-xs text-slate-400">{day(flight.departureAt)}</div></div>
                <div><div className="font-mono text-lg text-cyan-100">{clock(flight.arrivalAt)}</div><div className="text-xs text-slate-400">{day(flight.arrivalAt)}</div></div>
                <div><div className="font-mono text-sm text-slate-200">{gate(flight.departureTerminal, flight.departureGate)}</div><div className="text-[11px] text-slate-400">Terminal · gate</div></div>
                <div className="flex items-center gap-2 text-sm capitalize text-slate-200"><span className={`size-2 rounded-full ${flight.status === "active" ? "animate-pulse bg-cyan-300 shadow-[0_0_12px_#67e8f9] motion-reduce:animate-none" : flight.status === "scheduled" ? "bg-amber-300 shadow-[0_0_10px_#fcd34d]" : "bg-slate-400"}`} aria-hidden="true" />{flight.status.replaceAll("_", " ")}</div>
                {canSimulate ? (
                  <button type="button" onClick={() => simulate(flight)} disabled={Boolean(pendingId)} className="inline-flex w-fit min-w-36 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 hover:shadow-[0_0_24px_rgba(103,232,249,.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100 disabled:cursor-wait disabled:opacity-50">
                    <Ticket className="size-3.5" aria-hidden="true" />{pendingId === flight.id ? "Preparing…" : "Simulate booking"}<ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                ) : <span className="w-36 text-xs text-slate-400">Status only</span>}
              </div>
            );
          })}
        </div>
      )}
      <div className="border-t border-white/10 bg-black/10 px-6 py-3 text-xs text-slate-400">Simulated bookings stay in Aerodesk. No reservation or payment is sent to Aviationstack or an airline.</div>
    </section>
  );
}
