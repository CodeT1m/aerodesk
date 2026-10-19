import { classifyConciergeInsights } from "../src/lib/ai/insights";

async function run() {
  const result = await classifyConciergeInsights();
  console.log(
    `Classified ${result.successCount}/${result.totalFound} Concierge conversations${
      result.errorCount > 0 ? ` (${result.errorCount} failed)` : ""
    }${
      result.context
        ? `; Context store ${result.context.successCount}/${result.context.totalFound}`
        : ""
    }`,
  );
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
