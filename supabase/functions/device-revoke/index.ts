// Guardian revokes a device (or all devices) of a child: the child's sessions are deleted server-side.
import { z } from "zod";
import { adminClient, audit, body, HttpError, json, rateLimit, requireGuardianOf, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid(), device_id: z.uuid().optional() });
serve("device-revoke", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `revoke:${user.id}`, 30, 3600);
  const b = await body(req, Body);
  await requireGuardianOf(admin, user.id, b.student_id);
  let q = admin.from("devices").update({ revoked_at: new Date().toISOString() }).eq("student_id", b.student_id).eq("guardian_id", user.id).is("revoked_at", null);
  if (b.device_id) q = q.eq("device_id", b.device_id);
  const { error } = await q;
  if (error) throw new HttpError(500, "internal");
  // Supabase sessions belong to the user, not a device: revoking signs the child out everywhere;
  // devices that were not revoked can be re-enrolled by the guardian.
  await admin.rpc("revoke_student_sessions", { p_student: b.student_id });
  await audit(admin, user.id, "device_revoked", b.student_id);
  return json({ ok: true });
});
