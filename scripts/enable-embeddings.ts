import { execSync } from "node:child_process";
import { EMBEDDINGS_PROJECTION } from "../src/sanity/embeddings";

const projection = EMBEDDINGS_PROJECTION.replace(/\s+/g, " ").trim().replace(/'/g, "''");
const command = `pnpm exec sanity datasets embeddings enable production --projection '${projection}'`;

execSync(command, {
  stdio: "inherit",
  shell: process.platform === "win32" ? "powershell.exe" : "/bin/sh",
});
