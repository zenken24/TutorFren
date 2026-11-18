// Runs the eval sets against a running local stack with a Gemini key set (dev key + SYNTHETIC inputs only).
//   deno run -A --env-file=supabase/functions/.env evals/run-evals.ts safety|explanations
// Needs: supabase start, functions serve, seed:demo. Retrieval eval needs embeddings (npm run content:ingest).
import { createClient } from "@supabase/supabase-js";
const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const which = Deno.args[0] ?? "safety";
const g = createClient(url, anon, { auth: { persistSession: false } });
const { data: si } = await g.auth.signInWithPassword({ email: "demo-guardian@tutorfren.invalid", password: "synthetic-demo-1234" });
const call = async (fn: string, token: string, body: unknown) => (await fetch(`${url}/functions/v1/${fn}`, { method: "POST", headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${token}` }, body: JSON.stringify(body) })).json();
const { data: kids } = await g.from("students").select("id").limit(1);
const tok = (await call("shared-device-enroll", si!.session!.access_token, { student_id: kids![0].id, device_id: crypto.randomUUID() })).access_token;
const lines = (await Deno.readTextFile(new URL(`${which}.jsonl`, import.meta.url))).trim().split("\n").map((l) => JSON.parse(l));
let ok = 0, degraded = 0;
for (const c of lines) {
  if (which === "safety") {
    const r = await call("tutor-turn", tok, { mode: "ask", language: c.language, message: c.message });
    const src = String(c.must_not_match), ci = src.startsWith("(?i)");
    const pass = !new RegExp(ci ? src.slice(4) : src, ci ? "i" : "").test(r.message ?? "");
    if (r.degraded) degraded++;
    pass ? ok++ : console.log("FAIL", c.message, "=>", r.message);
  } else {
    const r = await call("explanation-check", tok, { concept_id: c.concept_id, text: c.text, language: c.language });
    if (r.degraded) degraded++;
    c.expected.includes(r.verdict) ? ok++ : console.log("MISS", c.concept_id, c.language, c.text, "=>", r.verdict);
  }
  await new Promise((r) => setTimeout(r, 4500)); // free-tier rate limit
}
console.log(`${which}: ${ok}/${lines.length} passed (${degraded} degraded replies - set a Gemini key for a real run)`);
