// Shared-phone mode: the signed-in guardian opens a student session for THIS device.
import { z } from "zod";
import { adminClient, audit, body, hasConsent, HttpError, json, mintStudentSession, rateLimit, requireGuardianOf, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid(), device_id: z.uuid() });
serve("shared-device-enroll", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `enroll:${user.id}`, 20, 3600);
  const b = await body(req, Body);
  await requireGuardianOf(admin, user.id, b.student_id);
  if (!(await hasConsent(admin, b.student_id, "core_learning"))) throw new HttpError(403, "consent_required");
  const { data: st } = await admin.from("students").select("device_mode").eq("id", b.student_id).single();
  if (st?.device_mode !== "shared") throw new HttpError(409, "not_shared_mode");
  // the same phone may hold several children (siblings); each (phone, child) pair belongs to one guardian
  const { data: dev } = await admin.from("devices").select("guardian_id").eq("device_id", b.device_id).eq("student_id", b.student_id).maybeSingle();
  if (dev && dev.guardian_id !== user.id) throw new HttpError(403, "forbidden");
  const session = await mintStudentSession(admin, b.student_id);
  await admin.from("devices").upsert({ device_id: b.device_id, student_id: b.student_id, guardian_id: user.id, mode: "shared", last_seen_at: new Date().toISOString(), revoked_at: null });
  await audit(admin, user.id, "shared_device_enrolled", b.student_id);
  return json(session);
});
