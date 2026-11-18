// End-to-end smoke test against a running local stack (supabase start + functions serve + seed:demo).
// Uses only SYNTHETIC data. Run: npm run smoke
import { createClient } from "@supabase/supabase-js";
const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info: unknown = "") => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + JSON.stringify(info).slice(0, 300)}`); };
async function call(fn: string, token: string | null, body: unknown) {
  const r = await fetch(`${url}/functions/v1/${fn}`, { method: "POST", headers: { "content-type": "application/json", apikey: anon, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => null) };
}
const g = createClient(url, anon, { auth: { persistSession: false } });
const { data: si, error } = await g.auth.signInWithPassword({ email: "demo-guardian@tutorfren.invalid", password: "synthetic-demo-1234" });
if (error) { console.error("Sign-in failed. Did you run `npm run seed:demo`?", error.message); Deno.exit(1); }
const gt = si.session!.access_token;
const device = crypto.randomUUID();

let r = await call("student-create", gt, { nickname: "Smoke (synthetic)", grade: 5, language: "en", device_mode: "shared" });
check("guardian creates a child", r.status === 200 && r.data.status === "pending_consent", r);
const sid = r.data?.student_id;
r = await call("shared-device-enroll", gt, { student_id: sid, device_id: device });
check("no session before core consent", r.status === 403, r);
r = await call("consent", gt, { student_id: sid, text_version: "v1", scopes: { core_learning: true, guardian_view: true, voice_input: false }, child_assent: true });
check("consent activates the child", r.status === 200 && r.data.status === "active", r);
r = await call("shared-device-enroll", gt, { student_id: sid, device_id: device });
check("shared-device enrolment returns a student session", r.status === 200 && !!r.data.access_token, r);
const st = r.data?.access_token;

for (const fn of ["student-create", "consent", "shared-device-enroll", "pairing-create", "account-delete", "account-export", "guardian-summary", "device-revoke"]) {
  const x = await call(fn, st, { student_id: sid });
  check(`student token -> ${fn} is 403`, x.status === 403, x);
}
check("guardian token -> tutor-turn is 403", (await call("tutor-turn", gt, { mode: "next", language: "en" })).status === 403);
check("no token -> 401", (await call("tutor-turn", null, { mode: "next", language: "en" })).status === 401);
check("unknown field rejected", (await call("tutor-turn", st, { mode: "next", language: "en", role: "admin" })).status === 400);

r = await call("tutor-turn", st, { mode: "next", language: "en" });
check("next step has a reason and an item", r.status === 200 && !!r.data.reason && !!r.data.item, r);
const item = r.data?.item;
r = await call("tutor-turn", st, { mode: "answer", language: "en", item_id: item?.id, answer: "1", hints_used: 0 });
check("wrong answer -> hint, no answer revealed", r.status === 200 && r.data.correct === false && !!r.data.next_hint && r.data.reveal_answer === null, r);
r = await call("textbook-lookup", st, { text: "Exercise 5 Ques 3 can't do it", language: "en" });
check("lookup resolves Exercise 5 Q3 -> printed p.89", r.status === 200 && r.data.status === "resolved" && r.data.match.printed_page === 89, r);
check("lookup returns signed page URLs (needs content:upload)", !!r.data?.pages?.["96"]?.en, r.data?.pages);
const match = r.data?.match;
r = await call("textbook-lookup", st, { text: "অনুশীলনী ৮ প্রশ্ন ৩", language: "bn" });
check("lookup ambiguous -> 3 candidates", r.data?.status === "ambiguous" && r.data.candidates.length === 3, r);
r = await call("tutor-turn", st, { mode: "ask", language: "en", message: "canary-tiger-42 I can't do this one. my number is 01712345678", textbook: { block_id: match?.block_id, question: match?.question } });
check("ask returns a message + source chips", r.status === 200 && r.data.message.length > 10 && r.data.source_refs.length > 0, r);
console.log(`     (tutor reply ${r.data?.degraded ? "DEGRADED: no Gemini key, canned hint" : "from Gemini"})`);
r = await call("explanation-check", st, { concept_id: "g5m-c3-lcm", text: "it is the first number in both times tables", language: "en" });
check("explanation-check returns a verdict", r.status === 200 && !!r.data.verdict, r);
r = await call("transcribe", st, {});
check("transcribe refused without voice consent", r.status === 403, r);
const exam = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
r = await call("exam-planner", st, { exam_name: "Class test", exam_date: exam, total_marks: 50, chapters: [1, 5], language: "en", question_pattern: { short: 10, long: 4 } });
check("exam planner builds workbook + routine before the exam", r.status === 200 && r.data.workbook.length === 14 && r.data.routine.every((d: { date: string }) => d.date < exam), r);

r = await call("guardian-summary", gt, { student_id: sid });
check("guardian summary: aggregates only", r.status === 200 && Array.isArray(r.data.mastered) && !JSON.stringify(r.data).includes("canary"), r);
const direct = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${gt}` } }, auth: { persistSession: false } });
check("guardian reads 0 attempts/explanations directly", ((await direct.from("attempts").select("id")).data ?? []).length === 0 && ((await direct.from("explanations").select("id")).data ?? []).length === 0);
const sdirect = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${st}` } }, auth: { persistSession: false } });
check("student reads only own rows", ((await sdirect.from("students").select("id")).data ?? []).length === 1);
check("student cannot raise own mastery", !!(await sdirect.from("concept_mastery").update({ mastery: 1 }).eq("student_id", sid)).error);

r = await call("pairing-create", gt, { student_id: sid });
check("pairing code is 6 digits", r.status === 200 && /^\d{6}$/.test(r.data.code), r);
const code = r.data?.code;
check("wrong code rejected", (await call("pairing-redeem", null, { code: code === "000000" ? "000001" : "000000", device_id: crypto.randomUUID() })).status === 400);
r = await call("pairing-redeem", null, { code, device_id: crypto.randomUUID() });
check("code redeems to a student session", r.status === 200 && !!r.data.access_token, r);
check("code is single use", (await call("pairing-redeem", null, { code, device_id: crypto.randomUUID() })).status === 400);
r = await call("device-revoke", gt, { student_id: sid });
const after = await call("tutor-turn", st, { mode: "next", language: "en" });
check("revoke signs the child out", r.status === 200 && after.status === 401, after);
r = await call("account-export", gt, { student_id: sid });
check("export contains the child's rows", r.status === 200 && r.data.attempts.length >= 1 && r.data.explanations.length >= 1, r);
r = await call("account-delete", gt, { student_id: sid, confirm: "DELETE" });
check("account deleted", r.status === 200, r);
check("no rows left for the child", ((await direct.from("students").select("id").eq("id", sid)).data ?? []).length === 0 && (await call("guardian-summary", gt, { student_id: sid })).status === 403);
console.log(`\n${pass} passed, ${fail} failed`);
Deno.exit(fail ? 1 : 0);
