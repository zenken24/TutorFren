// Guardian asks for a one-time 6-digit pairing code. Only SHA-256(code) is stored; 10 minute expiry.
import { z } from "zod";
import { adminClient, audit, body, hasConsent, HttpError, json, rateLimit, requireGuardianOf, requireRecentAuth, requireUser, serve, sha256Hex } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid() });
serve("pairing-create", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  requireRecentAuth(user.token);
  await rateLimit(admin, `pairing-create:${user.id}`, 10, 3600);
  const b = await body(req, Body);
  await requireGuardianOf(admin, user.id, b.student_id);
  if (!(await hasConsent(admin, b.student_id, "core_learning"))) throw new HttpError(403, "consent_required");
  await admin.from("pairing_codes").update({ used_at: new Date().toISOString() }).eq("student_id", b.student_id).is("used_at", null); // invalidate older codes
  let code = "", hash = "";
  for (let i = 0; i < 5; i++) { // CSPRNG, retry on the (unlikely) clash with another live code
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    code = String(n).padStart(6, "0"); hash = await sha256Hex(code);
    const { count } = await admin.from("pairing_codes").select("id", { count: "exact", head: true }).eq("code_hash", hash).is("used_at", null).gt("expires_at", new Date().toISOString());
    if (!count) break;
  }
  const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await admin.from("pairing_codes").insert({ student_id: b.student_id, guardian_id: user.id, code_hash: hash, expires_at });
  if (error) throw new HttpError(500, "internal");
  await audit(admin, user.id, "pairing_code_created", b.student_id);
  return json({ code, expires_at });
});
