"use client";

import { Badge } from "@/components/ui/badge";
import type { Cabin, SeatClaim, SeatDefinition } from "@/lib/types";
import { cabinLabel, formatMoney } from "@/lib/types";
import { nextSeatSelection } from "@/lib/booking/rules";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type Props = {
  title: string;
  cabin: Cabin;
  seats: SeatDefinition[];
  claims: SeatClaim[];
  selected: string[];
  passengerCount: number;
  waiveSeatFees: boolean;
  onChange: (codes: string[]) => void;
};

export function SeatMap({
  title,
  cabin,
  seats,
  claims,
  selected,
  passengerCount,
  waiveSeatFees,
  onChange,
}: Props) {
  const cabinSeats = seats.filter((seat) => seat.cabin === cabin);
  const rows = useMemo(() => {
    const grouped = new Map<number, SeatDefinition[]>();
    for (const seat of cabinSeats) {
      const list = grouped.get(seat.row) ?? [];
      list.push(seat);
      grouped.set(seat.row, list);
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, rowSeats]) => ({
        row,
        seats: rowSeats.sort((a, b) => a.column.localeCompare(b.column)),
      }));
  }, [cabinSeats]);

  function toggle(seat: SeatDefinition, unavailable: boolean) {
    onChange(nextSeatSelection(selected, seat.code, passengerCount, unavailable));
  }

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Choose {passengerCount} {cabinLabel(cabin)} seat{passengerCount > 1 ? "s" : ""}.
          </p>
        </div>
        <Badge variant="outline">{selected.length}/{passengerCount} selected</Badge>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend className="bg-primary text-primary-foreground" label="Selected" />
        <Legend className="bg-secondary" label="Available" />
        <Legend className="bg-muted text-muted-foreground line-through" label="Unavailable" />
        <Legend className="border border-amber-400" label="Exit row" />
      </div>
      <p className="text-xs text-muted-foreground">
        Window seats: Economy A/F, Business and First A/E. Aisle seats: Economy C/D, Business and
        First B/D. Middle: Economy B/E.
      </p>
      <div className="overflow-x-auto">
        <div className="mx-auto flex min-w-[320px] max-w-xl flex-col gap-2">
          <div className="rounded-full bg-muted px-4 py-2 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Nose
          </div>
          {rows.map(({ row, seats: rowSeats }) => (
            <div key={row} className="grid grid-cols-[2rem_1fr] items-center gap-2">
              <span className="text-xs text-muted-foreground">{row}</span>
              <div className="flex justify-center gap-2">
                {rowSeats.map((seat, index) => {
                  const claim = claims.find((item) => item.seatCode === seat.code);
                  const unavailable = Boolean(claim);
                  const isSelected = selected.includes(seat.code);
                  const aisleAfter = Math.floor(rowSeats.length / 2) - 1;
                  return (
                    <span key={seat.code} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`${seat.code}, ${cabinLabel(cabin)}, ${seat.position ?? "seat"}${unavailable ? ", unavailable" : isSelected ? ", selected" : ", available"}${seat.isExit ? ", extra legroom exit row" : ""}${seat.isAccessible ? ", accessible" : ""}${seat.extraFeeCents ? `, surcharge ${formatMoney(seat.extraFeeCents)}` : ""}`}
                        aria-pressed={isSelected}
                        disabled={unavailable}
                        onClick={() => toggle(seat, unavailable)}
                        className={cn(
                          "h-10 w-10 rounded-md text-xs font-medium outline-none ring-offset-background transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                          unavailable && "cursor-not-allowed bg-muted text-muted-foreground line-through",
                          !unavailable && !isSelected && "bg-secondary hover:bg-secondary/80",
                          isSelected && "scale-105 bg-sky-500 text-white shadow-lg shadow-sky-500/40",
                          seat.isExit && "ring-1 ring-amber-400",
                        )}
                      >
                        {seat.code}
                      </button>
                      {index === aisleAfter ? <span className="w-6" aria-hidden="true" /> : null}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Seat fees:{" "}
          {formatMoney(
            waiveSeatFees
              ? 0
              : selected.reduce((sum, code) => {
                  const seat = cabinSeats.find((item) => item.code === code);
                  return sum + (seat?.extraFeeCents ?? 0);
                }, 0),
          )}
          {waiveSeatFees ? " (waived for Pro)" : ""}
        </p>
      ) : null}
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-sm", className)} />
      {label}
    </span>
  );
}
