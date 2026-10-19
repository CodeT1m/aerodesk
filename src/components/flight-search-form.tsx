"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AirportSummary, Cabin, TripType } from "@/lib/types";
import { cabinLabel } from "@/lib/types";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function parseFormDate(value?: string): Date | undefined {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`);
}

type Props = {
  airports: AirportSummary[];
  defaults?: {
    origin?: string;
    destination?: string;
    tripType?: TripType;
    departDate?: string;
    returnDate?: string;
    cabin?: Cabin;
    passengers?: string;
  };
};

export function FlightSearchForm({ airports, defaults }: Props) {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>(defaults?.tripType ?? "roundtrip");
  const [origin, setOrigin] = useState(defaults?.origin ?? "SFO");
  const [destination, setDestination] = useState(defaults?.destination ?? "JFK");
  const [departDate, setDepartDate] = useState<Date | undefined>(parseFormDate(defaults?.departDate));
  const [returnDate, setReturnDate] = useState<Date | undefined>(parseFormDate(defaults?.returnDate));
  const [cabin, setCabin] = useState<Cabin>(defaults?.cabin ?? "economy");
  const [passengers, setPassengers] = useState(defaults?.passengers ?? "1");
  const [error, setError] = useState<string | null>(null);

  const airportOptions = useMemo(
    () =>
      airports.map((airport) => ({
        value: airport.iata,
        label: `${airport.city} (${airport.iata})`,
      })),
    [airports],
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!origin || !destination || origin === destination) {
      setError("Choose two different airports.");
      return;
    }
    if (!departDate) {
      setError("Choose a departure date.");
      return;
    }
    if (tripType === "roundtrip" && (!returnDate || returnDate <= departDate)) {
      setError("Return date must be after departure.");
      return;
    }

    const params = new URLSearchParams({
      origin,
      destination,
      tripType,
      departDate: format(departDate, "yyyy-MM-dd"),
      cabin,
      passengers,
    });
    if (tripType === "roundtrip" && returnDate) {
      params.set("returnDate", format(returnDate, "yyyy-MM-dd"));
    }
    router.push(`/flights?${params.toString()}`);
  }

  return (
    <Card className="panel-surface rounded-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-semibold">Plan your itinerary</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <Tabs value={tripType} onValueChange={(value) => setTripType(value as TripType)}>
            <TabsList>
              <TabsTrigger value="oneway">One way</TabsTrigger>
              <TabsTrigger value="roundtrip">Round trip</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="From">
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger aria-label="Origin airport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {airportOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="To">
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger aria-label="Destination airport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {airportOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DateField label="Depart" date={departDate} onChange={setDepartDate} />
            {tripType === "roundtrip" ? (
              <DateField label="Return" date={returnDate} onChange={setReturnDate} />
            ) : null}
            <Field label="Cabin">
              <Select value={cabin} onValueChange={(value) => setCabin(value as Cabin)}>
                <SelectTrigger aria-label="Cabin class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["economy", "business", "first"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {cabinLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Passengers">
              <Select value={passengers} onValueChange={setPassengers}>
                <SelectTrigger aria-label="Passenger count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4"].map((count) => (
                    <SelectItem key={count} value={count}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-10 w-full px-6 font-semibold shadow-[0_8px_20px_-12px_var(--primary)] md:w-auto">
            Search flights
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DateField({
  label,
  date,
  onChange,
}: {
  label: string;
  date?: Date;
  onChange: (date?: Date) => void;
}) {
  return (
    <Field label={label}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start font-normal">
            {date ? format(date, "MMM d, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
