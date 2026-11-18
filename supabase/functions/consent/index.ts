// Grant / revoke consent scopes (versioned). core_learning activates the link and the student.
// Changing consent on an already-active child needs a recent sign-in (step-up).
import { z } from "zod";
import { adminClient, audit, body, HttpError, json, rateLimit, requireGuardianOf, requireRecentAuth, requireUser, serve } from "../_shared/http.ts";
const SCOPES = ["core_learning", "voice_input", "guardian_view", "pilot_research"] as const;
const Body = z.strictObject({
  student_id: z.uuid(), text_version: z.string().min(1).max(20),
  scopes: z.strictObject({ core_learning: z.boolean().optional(), voice_input: z.boolean().optional(), guardian_view: z.boolean().optional(), pilot_research: z.boolean().optional() }),
  child_assent: z.boolean().optional(),
});
serve("consent", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `consent:${user.id}`, 30, 3600);
  const b = await body(req, Body);
  const link = await requireGuardianOf(admin, user.id, b.student_id, { allowPending: true });
  if (!link.is_primary) throw new HttpError(403, "forbidden");
  if (link.status === "active") requireRecentAuth(user.token);
  for (const scope of SCOPES) {
    const want = b.scopes[scope];
    if (want === undefined) continue;
    const { data: cur } = await admin.from("consents").select("id").eq("student_id", b.student_id).eq("guardian_id", user.id).eq("scope", scope).is("revoked_at", null).maybeSingle();
    if (want && !cur) await admin.from("consents").insert({ guardian_id: user.id, student_id: b.student_id, scope, text_version: b.text_version });
    if (!want && cur) await admin.from("consents").update({ revoked_at: new Date().toISOString() }).eq("id", cur.id);
    if (want !== !!cur) await audit(admin, user.id, `consent_${want ? "granted" : "revoked"}:${scope}`, b.student_id);
  }
  const { data: active } = await admin.from("consents").select("scope").eq("student_id", b.student_id).eq("guardian_id", user.id).is("revoked_at", null);
  const core = (active ?? []).some((c) => c.scope === "core_learning");
  await admin.from("guardian_student_links").update({ status: core ? "active" : "pending" }).eq("guardian_id", user.id).eq("student_id", b.student_id);
  const patch: Record<string, unknown> = { status: core ? "active" : "pending_consent" };
  if (b.child_assent) patch.assent_at = new Date().toISOString();
  await admin.from("students").update(patch).eq("id", b.student_id);
  if (!core) await admin.rpc("revoke_student_sessions", { p_student: b.student_id }); // core consent off: account unusable
  return json({ student_id: b.student_id, status: patch.status, scopes: (active ?? []).map((c) => c.scope) });
});
