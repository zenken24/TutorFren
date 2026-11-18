// Structured logging: IDs, sizes, status and latency only. Never pass bodies, text or tokens here.
export interface LogFields { request_id: string; route: string; status: number; latency_ms: number; user_ref?: string; bytes?: number; note?: string }
export function logEvent(f: LogFields): void {
  console.log(JSON.stringify(f));
}
export async function userRef(userId: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return "L-" + Array.from(new Uint8Array(d).slice(0, 4)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
