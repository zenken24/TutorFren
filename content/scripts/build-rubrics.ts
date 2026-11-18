// content/rubrics/*.yaml -> supabase/functions/_shared/rubrics.json (bundled with the Edge Functions).
import { parse } from "jsr:@std/yaml@^1.0.0";
const dir = new URL("../rubrics/", import.meta.url);
const out: Record<string, unknown> = {};
for await (const f of Deno.readDir(dir)) {
  if (!f.name.endsWith(".yaml")) continue;
  const r = parse(await Deno.readTextFile(new URL(f.name, dir))) as { concept_id: string };
  out[r.concept_id] = r;
}
await Deno.writeTextFile(new URL("../../supabase/functions/_shared/rubrics.json", import.meta.url), JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 1));
console.log(`rubrics: ${Object.keys(out).length}`);
