// THE ONLY FILE THAT MAY IMPORT @google/genai (scripts/check-invariants.sh enforces this).
// Written against @google/genai 3.3.0 type definitions: the Interactions API
// (ai.interactions.create with response_format / safety_settings / store). The older
// config.responseMimeType + responseSchema path is marked deprecated in that SDK.
// TODO(verify with a real key): blocked prompts are documented to fail with HTTP 400 and an
// error code such as "safety"; this has not been exercised against the live API yet.
import { ApiError, GoogleGenAI } from "@google/genai";

export const SAFE_REPLY = { en: "Let's get back to maths! Ask me about your lesson.", bn: "চলো, আবার গণিতে ফিরে যাই! তোমার পাঠ নিয়ে প্রশ্ন করো।" };
export class LlmUnavailable extends Error {}
export class LlmBlocked extends Error {}

function env(name: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(name);
}
/** prod uses ONLY the billing-enabled key; the free dev key is never used when APP_ENV=prod. */
export function pickApiKey(appEnv = env("APP_ENV") ?? "dev"): string {
  const key = appEnv === "prod" ? env("GEMINI_API_KEY_PROD") : env("GEMINI_API_KEY_DEV");
  if (!key) throw new LlmUnavailable(`Gemini key for APP_ENV=${appEnv} is not set`);
  return key;
}
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  return (client ??= new GoogleGenAI({ apiKey: pickApiKey() }));
}
const model = () => env("GEMINI_MODEL") ?? "gemini-flash-latest";
const embedModel = () => env("GEMINI_EMBED_MODEL") ?? "gemini-embedding-001";
export const EMBED_DIM = 768;

// strictest thresholds for a children's app; never retried with weaker settings
const SAFETY = (["hate_speech", "dangerous_content", "harassment", "sexually_explicit"] as const)
  .map((type) => ({ type, threshold: "block_low_and_above" as const }));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : (e as { status?: number; statusCode?: number })?.status ?? (e as { statusCode?: number })?.statusCode ?? 0;
      if (status === 400) throw new LlmBlocked("blocked_or_invalid");
      if (attempt >= 1 || !(status === 429 || status >= 500)) throw new LlmUnavailable(`llm_error_${status}`);
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

type Input = string | Array<{ type: "text"; text: string } | { type: "audio"; data: string; mime_type: string } | { type: "image"; data: string; mime_type: string }>;

async function interact(system: string, input: Input, schema?: unknown, maxTokens = 1024): Promise<string> {
  const res = await withRetry(() =>
    ai().interactions.create({
      model: model(),
      system_instruction: system,
      input,
      store: false, // never keep children's prompts on the provider side
      safety_settings: SAFETY,
      generation_config: { max_output_tokens: maxTokens },
      ...(schema ? { response_format: { type: "text" as const, mime_type: "application/json", schema } } : {}),
    }, { timeout_ms: 25_000 })
  );
  const text = res.output_text?.trim();
  if (!text) throw new LlmBlocked("empty");
  return text;
}

/** Structured output. Throws LlmBlocked / LlmUnavailable; callers answer with SAFE_REPLY. */
export async function generateJson<T>(schema: unknown, system: string, input: string, maxTokens?: number): Promise<T> {
  const text = await interact(system, input, schema, maxTokens);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LlmBlocked("bad_json");
  }
}
export function generateText(system: string, input: string, maxTokens?: number): Promise<string> {
  return interact(system, input, undefined, maxTokens);
}
/** Speech to text. Audio is passed inline (base64) from memory and is not stored (store:false). */
export function transcribeAudio(base64: string, mimeType: string, lang: "bn" | "en"): Promise<string> {
  const sys = `Transcribe the child's speech exactly, in ${lang === "bn" ? "Bangla" : "English"}. Output only the transcript. Do not answer or add anything.`;
  return interact(sys, [{ type: "audio", data: base64, mime_type: mimeType }], undefined, 512);
}
export async function embed(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
  const res = await withRetry(() =>
    ai().models.embedContent({ model: embedModel(), contents: texts, config: { outputDimensionality: EMBED_DIM, taskType } })
  );
  return (res.embeddings ?? []).map((e) => {
    const v = e.values ?? [];
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; // reduced dimensions must be re-normalised
    return v.map((x) => x / n);
  });
}
/** Vision helper for content scripts (textbook pages are not personal data; dev key is fine). */
export function readImage(base64: string, mimeType: string, system: string, prompt: string, maxTokens = 2048): Promise<string> {
  return interact(system, [{ type: "image", data: base64, mime_type: mimeType }, { type: "text", text: prompt }], undefined, maxTokens);
}
