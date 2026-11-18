// Crash-report scrubber (use as Sentry `beforeSend` with sendDefaultPii:false). Drops any event that
// carries audio and removes text-like fields, so transcripts and contact details never leave the phone.
const DROP = /audio|recording/i;
const STRIP = /^(text|transcript|message|answer|email|phone|nickname|name|password|code|token|access_token|refresh_token)$/i;
export function scrubEvent<T>(event: T): T | null {
  let hasAudio = false;
  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 8 || v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (DROP.test(k)) { hasAudio = true; continue; }
      out[k] = STRIP.test(k) ? "[removed]" : walk(val, depth + 1);
    }
    return out;
  };
  const cleaned = walk(event, 0) as T & { breadcrumbs?: unknown };
  if (hasAudio) return null;
  if (cleaned && typeof cleaned === "object") delete (cleaned as { breadcrumbs?: unknown }).breadcrumbs; // no breadcrumbs from voice / tutor screens
  return cleaned;
}
