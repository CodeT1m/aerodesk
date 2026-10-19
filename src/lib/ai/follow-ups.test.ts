import { describe, expect, it } from "vitest";
import { suggestedFollowUps } from "./follow-ups";

describe("suggestedFollowUps", () => {
  it("offers booking next steps after a flight search", () => {
    const chips = suggestedFollowUps([{ type: "tool-searchFlights", state: "output-available" }]);
    expect(chips.map((chip) => chip.label)).toContain("Window seats");
  });

  it("falls back to search and trips when no tools ran", () => {
    expect(suggestedFollowUps([]).map((chip) => chip.label)).toEqual(["Search SFO–JFK", "My trips"]);
  });
});
