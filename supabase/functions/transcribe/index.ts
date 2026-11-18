// Speech -> text. ZERO RETENTION: the bytes live only in this function's memory, are sent once to
// the STT provider (store:false) and are dropped. Nothing is written to the DB, storage or logs.
import { adminClient, hasConsent, HttpError, json, rateLimit, requireUser, serve } from "../_shared/http.ts";
import { transcribeAudio } from "../_shared/llm.ts";
import { logEvent } from "../_shared/log.ts";

const ALLOWED = ["audio/m4a", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/webm", "audio/ogg", "audio/3gpp"];
const MAX_BYTES = 2 * 1024 * 1024;
export interface SttProvider { transcribe(base64: string, mime: string, lang: "bn" | "en"): Promise<string> }
const gemini: SttProvider = { transcribe: transcribeAudio }; // default provider; swap here after the STT bake-off

serve("transcribe", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["student"]);
  ctx.setUser(user.id);
  if (!(await hasConsent(admin, user.id, "voice_input"))) throw new HttpError(403, "voice_consent_required");
  await rateLimit(admin, `transcribe:${user.id}`, 20, 3600);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 4096) throw new HttpError(413, "too_large");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const lang = form?.get("language") === "en" ? "en" : "bn";
  if (!(file instanceof File)) throw new HttpError(400, "invalid_request");
  const mime = file.type.split(";")[0].toLowerCase();
  if (!ALLOWED.includes(mime)) throw new HttpError(415, "unsupported_type");
  if (file.size === 0 || file.size > MAX_BYTES) throw new HttpError(413, "too_large");
  let bytes: Uint8Array | null = new Uint8Array(await file.arrayBuffer());
  const started = Date.now();
  let b64 = "";
  for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const size = bytes.length;
  bytes = null; // drop the buffer reference
  let result: string;
  try {
    result = await gemini.transcribe(btoa(b64), mime === "audio/mp4" || mime === "audio/3gpp" ? "audio/m4a" : mime, lang);
  } catch {
    throw new HttpError(503, "stt_unavailable");
  } finally {
    b64 = "";
  }
  logEvent({ request_id: ctx.requestId, route: "transcribe.stt", status: 200, latency_ms: Date.now() - started, bytes: size });
  return json({ transcript: result.slice(0, 1000), language: lang });
});
