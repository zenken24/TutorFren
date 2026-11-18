// Guardian exports the child's data as JSON (step-up required). Primary guardian only.
import { z } from "zod";
import { adminClient, audit, body, json, rateLimit, requireGuardianOf, requireRecentAuth, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid() });
serve("account-export", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  requireRecentAuth(user.token);
  await rateLimit(admin, `export:${user.id}`, 5, 3600);
  const b = await body(req, Body);
  await requireGuardianOf(admin, user.id, b.student_id, { primary: true });
  const t = async (table: string, col = "student_id") => (await admin.from(table).select("*").eq(col, b.student_id)).data ?? [];
  const out = {
    exported_at: new Date().toISOString(),
    profile: (await t("students", "id"))[0] ?? null,
    consents: await t("consents"), attempts: await t("attempts"), explanations: await t("explanations"),
    concept_mastery: await t("concept_mastery"), exam_plans: await t("exam_plans"), devices: await t("devices"),
  };
  await audit(admin, user.id, "account_exported", b.student_id);
  return json(out);
});
