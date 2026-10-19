import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const skip = new Set(["VERCEL_OIDC_TOKEN"]);
const text = readFileSync(".env.local", "utf8");

for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index < 0) continue;
  const name = line.slice(0, index).trim();
  let value = line.slice(index + 1);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!name || skip.has(name) || value === "") continue;

  const args = [
    "dlx",
    "vercel",
    "env",
    "add",
    name,
    "preview,development,production",
    "--yes",
    "--force",
    "--value",
    value,
  ];
  if (name.startsWith("NEXT_PUBLIC_")) {
    args.push("--no-sensitive");
  } else {
    args.push("--sensitive");
  }

  const result = spawnSync("pnpm", args, { encoding: "utf8", shell: true });
  if (result.status !== 0) {
    console.error(`Failed to add ${name} (status ${result.status})`);
    if (result.error) console.error(String(result.error));
    const err = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
    const first = err
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.includes("value") && !line.includes("token"));
    if (first) console.error(first);
    process.exitCode = 1;
  } else {
    console.log(`Added ${name}`);
  }
}
