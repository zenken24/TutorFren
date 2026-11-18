// Voice input, zero retention on the phone too: recordings go to the app's PRIVATE cache folder,
// are uploaded once, and are deleted in a finally{} block. Leftovers from a crash are swept at app start.
// No analytics / crash breadcrumbs are recorded here.
export interface VoiceDeps {
  upload(uri: string, language: "bn" | "en"): Promise<{ transcript: string }>;
  remove(uri: string): Promise<void> | void;
}
/** Upload a recording and ALWAYS delete the local file (success, network error or server error). */
export async function transcribeAndDelete(uri: string, language: "bn" | "en", deps: VoiceDeps): Promise<string> {
  try {
    const { transcript } = await deps.upload(uri, language);
    return transcript;
  } finally {
    try { await deps.remove(uri); } catch { /* idempotent: already gone */ }
  }
}
export const MAX_RECORDING_SECONDS = 60;
/** true when the path is inside the app-private cache directory (never shared media / gallery). */
export function isPrivateCachePath(uri: string, cacheUri: string): boolean {
  const norm = (s: string) => s.replace(/^file:\/\//, "").replace(/\/+$/, "");
  return norm(uri).startsWith(norm(cacheUri) + "/") && !/\/(DCIM|Music|Recordings|Download|Pictures|Movies)\//i.test(uri);
}
