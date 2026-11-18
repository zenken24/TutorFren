// Device side of voice.ts (expo-file-system + upload). Kept separate so voice.ts stays unit-testable.
import { Directory, File, Paths } from "expo-file-system";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callFn } from "./supabase";
import { transcribeAndDelete } from "./voice";

export function removeFile(uri: string) {
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* ignore */ }
}
/** Delete every audio file left in the cache (expo-audio writes recordings there). Run at app start. */
export function sweepRecordings() {
  const walk = (dir: Directory, depth: number) => {
    let entries: (Directory | File)[] = [];
    try { entries = dir.list(); } catch { return; }
    for (const e of entries) {
      if (e instanceof File) { if (/\.(m4a|mp4|aac|wav|3gp|caf|webm|ogg)$/i.test(e.name)) { try { e.delete(); } catch { /* ignore */ } } }
      else if (depth < 2) walk(e, depth + 1);
    }
  };
  walk(Paths.cache, 0);
}
export function transcribeRecording(client: SupabaseClient, uri: string, language: "bn" | "en") {
  return transcribeAndDelete(uri, language, {
    remove: removeFile,
    upload: (u, lang) => {
      const form = new FormData();
      form.append("language", lang);
      form.append("file", { uri: u, name: "speech.m4a", type: "audio/m4a" } as unknown as Blob);
      return callFn<{ transcript: string }>(client, "transcribe", form);
    },
  });
}
