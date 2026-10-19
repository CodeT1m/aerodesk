"use client";

import { defineConfig, definePlugin } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { ChartUpwardIcon } from "@sanity/icons/ChartUpward";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { InsightsTool } from "./src/sanity/insights-tool";

const conciergeInsights = definePlugin({
  name: "aerodesk-insights",
  tools: [
    {
      name: "insights",
      title: "Insights",
      icon: ChartUpwardIcon,
      component: InsightsTool,
    },
  ],
});

export default defineConfig({
  name: "aerodesk",
  title: "Aerodesk",
  projectId,
  dataset,
  basePath: "/studio",
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
    conciergeInsights(),
  ],
});
