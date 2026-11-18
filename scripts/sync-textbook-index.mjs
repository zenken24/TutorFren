// Copies the generated textbook index to the places that bundle it (Edge Functions + mobile app).
// content/textbook/index.json is the source of truth. `--check` exits 1 when a copy is stale.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.stringify(JSON.parse(readFileSync(join(root, "content/textbook/index.json"), "utf8")));
const targets = ["supabase/functions/_shared/textbook/index.json", "apps/mobile/src/content/textbook-index.json"];
let stale = false;
for (const t of targets) {
  const p = join(root, t);
  if (process.argv.includes("--check")) {
    if (!existsSync(p) || readFileSync(p, "utf8") !== src) { console.error("stale: " + t); stale = true; }
  } else { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, src); console.log("wrote " + t); }
}
if (stale) process.exit(1);
