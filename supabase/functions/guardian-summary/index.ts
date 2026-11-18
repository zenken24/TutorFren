// Aggregated progress only. Runs guardian_summary() AS THE GUARDIAN so the SQL function's own
// link + consent checks (auth.uid()) apply; nothing here can return transcripts or timelines.
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { adminClient, body, HttpError, json, rateLimit, requireUser, serve } from "../_shared/http.ts";
const Body = z.strictObject({ student_id: z.uuid() });
serve("guardian-summary", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["guardian"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `summary:${user.id}`, 120, 3600);
  const b = await body(req, Body);
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${user.token}` } }, auth: { persistSession: false } });
  const { data, error } = await asUser.rpc("guardian_summary", { p_student: b.student_id });
  if (error) throw new HttpError(403, "forbidden");
  return json(data);
});
