import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || !dataset || !token) throw new Error("Sanity write configuration is required");

const client = createClient({ projectId, dataset, apiVersion: "2026-02-01", token, useCdn: false });
async function run() {
  const id = "support-seat-selection";
  const article = await client.getDocument<{
    body: { children?: { text?: string; [key: string]: unknown }[]; [key: string]: unknown }[];
  }>(id);
  if (!article) throw new Error("Seat selection support article was not found");

  const body = article.body.map((block) => ({
    ...block,
    children: block.children?.map((child) => ({
      ...child,
      text: child.text?.replace("30 minutes", "seven hours"),
    })),
  }));
  if (JSON.stringify(body) !== JSON.stringify(article.body)) {
    await client.patch(id).set({ body }).commit({ visibility: "sync" });
    console.log("Updated published seat-hold guidance to seven hours.");
  } else {
    console.log("Seat-hold guidance already matches the seven-hour policy.");
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
