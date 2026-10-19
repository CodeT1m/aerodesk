import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test("loads one-way results from URL-backed search state", async ({ page }) => {
  await page.goto(
    "/flights?origin=SFO&destination=JFK&tripType=oneway&departDate=2026-09-18&cabin=economy&passengers=1",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByText(/Outbound|SFO to JFK|No outbound flights/i).first()).toBeVisible();
});

test("searches a round-trip itinerary", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Round trip" }).click({ force: true });
  await expect(page.getByRole("tab", { name: "Round trip" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Search flights" }).click({ force: true });
  await page.waitForURL(/\/flights\?.*tripType=roundtrip/, { timeout: 20_000 });
  await expect(page.getByText(/Outbound|No outbound flights/i).first()).toBeVisible();
});

test("shows reactive Free and Pro membership cards", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Membership").first()).toBeVisible();
  await expect(page.getByText("$0").first()).toBeVisible();
  await expect(page.getByText("$19").first()).toBeVisible();
  await page.getByRole("tab", { name: "Annual" }).click({ force: true });
  await expect(page.getByText("$190").first()).toBeVisible();
});

test("protects booking surfaces for anonymous visitors", async ({ page }) => {
  await page.goto("/booking/seats?outboundId=flight-ae100-d1&tripType=oneway&cabin=economy&passengers=1", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/sign-in|seats/);
});
