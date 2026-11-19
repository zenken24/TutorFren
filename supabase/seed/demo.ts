// SYNTHETIC DEMO DATA ONLY. Creates a demo guardian and two synthetic children ("Rafi", "Nusrat").
// Run: npm run seed:demo      Reset: npx supabase db reset && npm run seed:demo
import { createClient } from "@supabase/supabase-js";
const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (npm run dev:env)"); Deno.exit(1); }
if (Deno.env.get("APP_ENV") === "prod") { console.error("Refusing to seed synthetic data into prod."); Deno.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
export const DEMO = { email: "demo-guardian@tutorfren.invalid", password: "synthetic-demo-1234" };

async function user(email: string, password: string) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const old = list.users.find((u) => u.email === email);
  if (old) await sb.auth.admin.deleteUser(old.id);
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}
const must = <T extends { error: unknown }>(r: T) => { if (r.error) throw r.error; return r; };

const g = await user(DEMO.email, DEMO.password);
must(await sb.from("profiles").upsert({ id: g, role: "guardian" })); // the sign-up trigger may already have created it
const kids = [
  { nick: "Rafi (synthetic)", email: "rafi-demo@students.invalid", lang: "bn", voice: true, strong: true },
  { nick: "Nusrat (synthetic)", email: "nusrat-demo@students.invalid", lang: "en", voice: false, strong: false },
];
const { data: concepts } = await sb.from("concepts").select("id,chapter").order("chapter").order("id");
// deterministic pseudo-random so every reset looks the same
let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (const k of kids) {
  const id = await user(k.email, crypto.randomUUID() + crypto.randomUUID());
  must(await sb.from("profiles").upsert({ id, role: "student" }));
  must(await sb.from("students").insert({ id, nickname: k.nick, grade: 5, language: k.lang, device_mode: "shared", status: "active", assent_at: new Date().toISOString() }));
  must(await sb.from("guardian_student_links").insert({ guardian_id: g, student_id: id, is_primary: true, status: "active" }));
  const scopes = ["core_learning", "guardian_view", ...(k.voice ? ["voice_input"] : [])];
  must(await sb.from("consents").insert(scopes.map((scope) => ({ guardian_id: g, student_id: id, scope, text_version: "v1" }))));
  // progress: Rafi is further along (chapters 1-5 started, early chapters mostly mastered); Nusrat less so
  const reach = k.strong ? 5 : 3;
  const ms = (concepts ?? []).filter((c) => c.chapter <= reach).map((c) => {
    const base = k.strong ? 1.05 - c.chapter * 0.14 : 0.75 - c.chapter * 0.18;
    const mastery = Math.max(0.05, Math.min(0.97, base + (rnd() - 0.5) * 0.4));
    return { student_id: id, concept_id: c.id, evidence_count: 2 + Math.floor(rnd() * 5), mastery, confidence: 0.57, recent_errors: mastery < 0.5 ? ["wrong_answer"] : [] };
  }).filter(() => rnd() > 0.15);
  must(await sb.from("concept_mastery").insert(ms));
  // activity heatmap: ~10 weeks, more often for Rafi; day granularity only
  const events: { student_id: string; kind: string; day: string }[] = [];
  for (let d = 0; d < 70; d++) {
    if (rnd() < (k.strong ? 0.55 : 0.3)) {
      const n = 1 + Math.floor(rnd() * 5);
      const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      for (let i = 0; i < n; i++) events.push({ student_id: id, kind: "attempt", day });
    }
  }
  must(await sb.from("session_events").insert(events));
}
console.log(`Synthetic demo ready. Guardian sign-in: ${DEMO.email} / ${DEMO.password}`);
