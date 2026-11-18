// Guardian creates a child profile. The child gets an internal auth user with no usable password.
import { z } from "zod";
import { adminClient, audit, body, HttpError, json, rateLimit, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ nickname: z.string().trim().min(1).max(30), grade: z.number().int().min(1).max(12), language: z.enum(["bn", "en"]), device_mode: z.enum(["own", "shared"]) });
serve("student-create", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `student-create:${user.id}`, 5, 86400);
  const b = await body(req, Body);
  const pw = crypto.randomUUID() + crypto.randomUUID(); // never returned, never shown
  const { data, error } = await admin.auth.admin.createUser({ email: `${crypto.randomUUID()}@students.invalid`, password: pw, email_confirm: true });
  if (error || !data.user) throw new HttpError(500, "internal");
  const id = data.user.id;
  const steps = [
    await admin.from("profiles").insert({ id, role: "student" }),
    await admin.from("students").insert({ id, nickname: b.nickname, grade: b.grade, language: b.language, device_mode: b.device_mode }),
    await admin.from("guardian_student_links").insert({ guardian_id: user.id, student_id: id, is_primary: true, status: "pending" }),
  ];
  if (steps.some((s) => s.error)) { await admin.auth.admin.deleteUser(id); throw new HttpError(500, "internal"); }
  await audit(admin, user.id, "student_created", id);
  return json({ student_id: id, device_mode: b.device_mode, status: "pending_consent" });
});
