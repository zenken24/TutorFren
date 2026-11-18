// Hard-delete a child account: sessions revoked, auth user deleted, every row cascades.
import { z } from "zod";
import { adminClient, audit, body, HttpError, json, rateLimit, requireGuardianOf, requireRecentAuth, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid(), confirm: z.literal("DELETE") });
serve("account-delete", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  requireRecentAuth(user.token);
  await rateLimit(admin, `delete:${user.id}`, 5, 3600);
  const b = await body(req, Body);
  await requireGuardianOf(admin, user.id, b.student_id, { primary: true, allowPending: true });
  await admin.rpc("revoke_student_sessions", { p_student: b.student_id });
  const { error } = await admin.auth.admin.deleteUser(b.student_id); // profiles -> students -> everything (on delete cascade)
  if (error) throw new HttpError(500, "internal");
  await audit(admin, user.id, "account_deleted", null); // IDs of the deleted child are not kept
  return json({ ok: true });
});
