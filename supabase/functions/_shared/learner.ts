// Server-side learner state helpers (service role; always filtered by the caller's own id).
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY, type Evidence, type Mastery, updateMastery } from "./mastery.ts";

export async function loadMastery(admin: SupabaseClient, studentId: string): Promise<Map<string, Mastery>> {
  const { data } = await admin.from("concept_mastery").select("concept_id,mastery,evidence_count,confidence,recent_errors,last_strategy").eq("student_id", studentId);
  return new Map((data ?? []).map((r) => [r.concept_id as string, r as unknown as Mastery]));
}
export async function applyEvidence(admin: SupabaseClient, studentId: string, conceptId: string, e: Evidence, strategy?: string): Promise<Mastery> {
  const cur = (await loadMastery(admin, studentId)).get(conceptId) ?? EMPTY;
  const next = { ...updateMastery(cur, e), last_strategy: strategy ?? cur.last_strategy };
  await admin.from("concept_mastery").upsert({ student_id: studentId, concept_id: conceptId, ...next, updated_at: new Date().toISOString() });
  await admin.from("session_events").insert({ student_id: studentId, kind: e.kind });
  return next;
}
export async function studentInfo(admin: SupabaseClient, studentId: string) {
  const { data } = await admin.from("students").select("grade,language,status").eq("id", studentId).single();
  if (!data || data.status !== "active") return null;
  return data as { grade: number; language: "bn" | "en"; status: string };
}
/** normalise an answer for comparison: Bangla digits, spacing, "ভাগশেষ"/"r" forms */
export function normAnswer(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/ভাগশেষ|remainder|rem\b|\br\b/g, "r").replace(/[,\s]|taka|টাকা/g, "").replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
