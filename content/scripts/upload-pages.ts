// Uploads content/generated/pages/{bn,en}/pNNN.webp to the PRIVATE bucket `textbook-pages`.
// Run: npm run content:upload   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in supabase/functions/.env)
import { createClient } from "@supabase/supabase-js";

const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in supabase/functions/.env"); Deno.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const root = new URL("../generated/pages/", import.meta.url);
let done = 0, failed = 0;
for (const lang of ["bn", "en"]) {
  for await (const f of Deno.readDir(new URL(`${lang}/`, root))) {
    if (!/^p\d{3}\.webp$/.test(f.name)) continue;
    const bytes = await Deno.readFile(new URL(`${lang}/${f.name}`, root));
    const { error } = await sb.storage.from("textbook-pages").upload(`${lang}/${f.name}`, bytes, { contentType: "image/webp", upsert: true });
    if (error) { failed++; console.error(`${lang}/${f.name}: ${error.message}`); } else done++;
  }
}
console.log(`uploaded ${done}, failed ${failed}`);
if (failed) Deno.exit(1);
