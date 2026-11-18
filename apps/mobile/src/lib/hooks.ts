import { useQuery } from "@tanstack/react-query";
import { useStudent } from "./session";
import type { BadgeKind } from "../components/ui";

export interface MasteryRow { concept_id: string; mastery: number; evidence_count: number }
/** the active child's own mastery rows (RLS: student_id = auth.uid()) */
export function useMastery() {
  const { client, child } = useStudent();
  return useQuery({
    queryKey: ["mastery", child.id], staleTime: 10_000,
    queryFn: async () => new Map(((await client.from("concept_mastery").select("concept_id,mastery,evidence_count")).data ?? []).map((r) => [r.concept_id as string, r as MasteryRow])),
  });
}
export function badgeOf(m?: MasteryRow): BadgeKind {
  if (!m || m.evidence_count === 0) return "not_started";
  return m.mastery >= 0.8 ? "mastered" : m.mastery >= 0.4 ? "practising" : "learning";
}
