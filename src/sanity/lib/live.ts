import { defineLive } from "next-sanity/live";
import { client } from "./client";
import { apiVersion } from "../env";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
