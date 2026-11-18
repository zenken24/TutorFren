// Child's own phone redeems the one-time code. No auth: protected by IP + device rate limits,
// a 5-failure lockout per device, single use and 10-minute expiry. Returns only session tokens.
import { z } from "zod";
import { adminClient, audit, body, hasConsent, HttpError, json, mintStudentSession, rateLimit, serve, sha256Hex } from "../_shared/http.ts";
const Body = z.strictObject({ code: z.string().regex(/^\d{6}$/), device_id: z.uuid() });
function timingSafeEqual(a: string, b: string) { let d = a.length ^ b.length; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return d === 0; }
serve("pairing-redeem", async (req, ctx) => {
  const admin = adminClient();
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  await rateLimit(admin, `redeem-ip:${await sha256Hex(ip)}`, 10, 3600);
  const b = await body(req, Body);
  const hash = await sha256Hex(b.code);
  const { data: rows } = await admin.from("pairing_codes").select("id,student_id,guardian_id,code_hash,attempts").is("used_at", null).gt("expires_at", new Date().toISOString()).eq("code_hash", hash).limit(1);
  const row = rows?.find((r) => timingSafeEqual(r.code_hash, hash));
  if (!row || row.attempts >= 5) {
    await rateLimit(admin, `redeem-fail:${b.device_id}`, 5, 3600); // 6th wrong try from a device -> 429 for an hour
    throw new HttpError(400, "invalid_code");
  }
  const { data: claimed } = await admin.from("pairing_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id"); // single use
  if (!claimed?.length) throw new HttpError(400, "invalid_code");
  if (!(await hasConsent(admin, row.student_id, "core_learning"))) throw new HttpError(403, "consent_required");
  ctx.setUser(row.student_id);
  const session = await mintStudentSession(admin, row.student_id);
  await admin.from("devices").upsert({ device_id: b.device_id, student_id: row.student_id, guardian_id: row.guardian_id, mode: "own", last_seen_at: new Date().toISOString(), revoked_at: null });
  await audit(admin, null, "device_paired", row.student_id);
  return json(session);
});
