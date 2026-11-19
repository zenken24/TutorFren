// Hard delete. Two targets:
//  * child:    one child account (caller must be its PRIMARY guardian) - sessions revoked, auth user deleted,
//              every row cascades.
//  * guardian: the caller's own account. Children for whom the caller is the primary guardian are deleted
//              too (they cannot exist without a consenting guardian); links to other children cascade away.
import { z } from "zod";
import { adminClient, audit, body, HttpError, json, rateLimit, requireGuardianOf, requireRecentAuth, requireUser, serve } from "../_shared/http.ts";
const Body = z.union([
  z.strictObject({ target: z.literal("child").optional(), student_id: z.uuid(), confirm: z.literal("DELETE") }),
  z.strictObject({ target: z.literal("guardian"), confirm: z.literal("DELETE") }),
]);
serve("account-delete", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  requireRecentAuth(user.token);
  await rateLimit(admin, `delete:${user.id}`, 5, 3600);
  const b = await body(req, Body);

  const deleteChild = async (studentId: string) => {
    await admin.rpc("revoke_student_sessions", { p_student: studentId });
    const { error } = await admin.auth.admin.deleteUser(studentId); // profiles -> students -> everything (on delete cascade)
    if (error) throw new HttpError(500, "internal");
  };

  if ("student_id" in b) {
    await requireGuardianOf(admin, user.id, b.student_id, { primary: true, allowPending: true });
    await deleteChild(b.student_id);
    await audit(admin, user.id, "account_deleted", null); // IDs of the deleted child are not kept
    return json({ ok: true, deleted: "child" });
  }

  const { data: links, error: le } = await admin.from("guardian_student_links").select("student_id").eq("guardian_id", user.id).eq("is_primary", true);
  if (le) throw new HttpError(500, "internal");
  for (const l of links ?? []) await deleteChild(l.student_id as string);
  await audit(admin, null, "guardian_account_deleted", null);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "internal");
  return json({ ok: true, deleted: "guardian", children_deleted: (links ?? []).length });
});
