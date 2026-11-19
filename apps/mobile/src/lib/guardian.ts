// Guardian-side data helpers. Profile rows only (nickname, class, status, device mode) - learning data
// reaches the guardian ONLY through the aggregated guardian-summary function.
import { useQuery } from "@tanstack/react-query";
import { useGuardian } from "./session";

export interface GChild { id: string; nickname: string; grade: number; status: string; device_mode: "shared" | "own" }
export function useChildren() {
  const { client } = useGuardian();
  return useQuery({
    queryKey: ["g-children"],
    queryFn: async () => ((await client.from("students").select("id,nickname,grade,status,device_mode").order("created_at")).data ?? []) as GChild[],
  });
}
/** children for whom the signed-in guardian is the PRIMARY guardian (only they can delete them) */
export function usePrimaryChildIds() {
  const { client } = useGuardian();
  return useQuery({
    queryKey: ["g-primary"],
    queryFn: async () => {
      const uid = (await client.auth.getUser()).data.user?.id;
      const rows = (await client.from("guardian_student_links").select("student_id,is_primary").eq("guardian_id", uid ?? "")).data ?? [];
      return new Set(rows.filter((r) => r.is_primary).map((r) => r.student_id as string));
    },
  });
}
export interface Summary {
  mastered: { concept_id: string; title_en: string; title_bn: string }[];
  gaps: { concept_id: string; title_en: string; title_bn: string }[];
  suggested_practice: { concept_id: string; title_en: string; title_bn: string }[];
  sessions_this_week: number;
  totals: { mastered: number; in_progress: number; not_started: number };
  chapters: { chapter: number; total: number; mastered: number; in_progress: number }[];
  active_days: { day: string; n: number }[];
}
