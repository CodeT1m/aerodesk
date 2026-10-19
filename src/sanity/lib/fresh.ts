import { client } from "./client";

export function getFreshClient() {
  return client.withConfig({
    useCdn: false,
    token: process.env.SANITY_API_READ_TOKEN,
    perspective: "raw",
  });
}
