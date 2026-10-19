import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "azyqstd0",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  },
  typegen: {
    path: "./src/**/*.{ts,tsx,js,jsx}",
    schema: "./schema.json",
    generates: "./src/sanity/types.ts",
  },
  deployment: {
    appId: "ur5i4fwoseywn4u9rr4k7vgx",
    autoUpdates: false,
  },
});
