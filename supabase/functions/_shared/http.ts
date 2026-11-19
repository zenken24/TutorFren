// Shared request plumbing for Edge Functions: auth guard (role from public.profiles), rate limit, JSON helpers.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logEvent, userRef } from "./log.ts";

export type Role = "guardian" | "student" | "teacher" | "admin";
export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
}
/** Verifies the JWT and reads the role from the database (never from user_metadata). */
export async function requireUser(req: Request, admin: SupabaseClient, roles: Role[]) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "unauthenticated");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthenticated");
  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!profile || !roles.includes(profile.role as Role)) throw new HttpError(403, "forbidden");
  return { id: data.user.id, role: profile.role as Role, token };
}
/** Fixed-window limiter backed by public.rate_limit_hit() (service role only). */
export async function rateLimit(admin: SupabaseClient, key: string, max: number, windowSeconds: number) {
  const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) throw new HttpError(500, "internal");
  if (data === false) throw new HttpError(429, "rate_limited");
}
/** Wraps a handler: CORS, generic client errors, and one structured no-PII log line. */
export function serve(route: string, handler: (req: Request, ctx: { requestId: string; setUser(id: string): void }) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    const started = Date.now();
    const requestId = crypto.randomUUID();
    let uid: string | undefined;
    let res: Response;
    try {
      if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
      res = await handler(req, { requestId, setUser: (id) => (uid = id) });
    } catch (e) {
      res = e instanceof HttpError ? json({ error: e.code }, e.status) : json({ error: "something_went_wrong" }, 500);
    }
    logEvent({ request_id: requestId, route, status: res.status, latency_ms: Date.now() - started, user_ref: uid ? await userRef(uid) : undefined });
    return res;
  });
}

/** Step-up: the session must come from a real sign-in (password/OTP) within the last 5 minutes.
 *  Read from the verified JWT's `amr` claim, so a local biometric unlock is never enough. */
export function requireRecentAuth(token: string, maxAgeSeconds = 300) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const times = (payload.amr ?? []).filter((a: { method?: string }) => a.method === "password" || a.method === "otp" || a.method === "totp" || a.method === "oauth")
      .map((a: { timestamp: number }) => a.timestamp);
    if (times.length && Date.now() / 1000 - Math.max(...times) <= maxAgeSeconds) return;
  } catch { /* fall through */ }
  throw new HttpError(401, "reauth_required");
}
/** The caller must be an ACTIVE linked guardian of the student (optionally the primary one). */
export async function requireGuardianOf(admin: SupabaseClient, guardianId: string, studentId: string, opts: { primary?: boolean; allowPending?: boolean } = {}) {
  const { data } = await admin.from("guardian_student_links").select("status,is_primary").eq("guardian_id", guardianId).eq("student_id", studentId).maybeSingle();
  if (!data || data.status === "revoked" || (!opts.allowPending && data.status !== "active") || (opts.primary && !data.is_primary)) throw new HttpError(403, "forbidden");
  return data;
}
export async function hasConsent(admin: SupabaseClient, studentId: string, scope: string): Promise<boolean> {
  const { count } = await admin.from("consents").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("scope", scope).is("revoked_at", null);
  return (count ?? 0) > 0;
}
/** Mint a session for a student server-side: admin generateLink(magiclink) -> verifyOtp(token_hash). */
export async function mintStudentSession(admin: SupabaseClient, studentId: string) {
  const { data: u } = await admin.auth.admin.getUserById(studentId);
  if (!u.user?.email) throw new HttpError(500, "internal");
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  if (error || !link.properties?.hashed_token) throw new HttpError(500, "internal");
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (e2 || !s.session) throw new HttpError(500, "internal");
  return { access_token: s.session.access_token, refresh_token: s.session.refresh_token, student_id: studentId };
}
export async function audit(admin: SupabaseClient, actor: string | null, action: string, subject: string | null) {
  await admin.from("audit_log").insert({ actor_id: actor, action, subject_id: subject });
}
export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function body<T>(req: Request, schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } }): Promise<T> {
  const r = schema.safeParse(await req.json().catch(() => null));
  if (!r.success) throw new HttpError(400, "invalid_request");
  return r.data;
}
