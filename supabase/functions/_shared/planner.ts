// Exam planner: rule-based workbook + day-by-day routine. Pure functions.
export interface PlanItem { id: string; concept_id: string; chapter: number; difficulty: number; marks?: number }
export interface PlanInput {
  today: string; examDate: string; totalMarks: number; chapters: number[];
  pattern: { short?: number; long?: number }; // number of questions of each type
  items: PlanItem[]; mastery: Record<string, number>; // concept_id -> 0..1 (missing = 0)
  conceptChapter: Record<string, number>;
}
export interface Plan { workbook: PlanItem[]; routine: { date: string; focus: "weak_concepts" | "mixed_practice" | "revision"; concept_ids: string[]; item_ids: string[] }[] }
const day = (s: string, add: number) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + add); return d.toISOString().slice(0, 10); };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

export function buildPlan(inp: PlanInput): Plan {
  const pool = inp.items.filter((i) => inp.chapters.includes(i.chapter));
  const nShort = inp.pattern.short ?? 10, nLong = inp.pattern.long ?? 5, n = nShort + nLong;
  const marksLong = nLong ? Math.floor((inp.totalMarks * 0.5) / nLong) : 0;
  const marksShort = nShort ? Math.floor((inp.totalMarks - marksLong * nLong) / nShort) : 0;
  // weakest concepts first; round-robin so every weak concept is covered
  const weakness = (c: string) => 1 - (inp.mastery[c] ?? 0);
  const byConcept = new Map<string, PlanItem[]>();
  for (const i of [...pool].sort((a, b) => a.id.localeCompare(b.id))) (byConcept.get(i.concept_id) ?? byConcept.set(i.concept_id, []).get(i.concept_id)!).push(i);
  const concepts = [...byConcept.keys()].sort((a, b) => weakness(b) - weakness(a) || a.localeCompare(b));
  const workbook: PlanItem[] = [];
  for (let round = 0; workbook.length < n && round < 50; round++) {
    let added = false;
    for (const c of concepts) {
      const reps = weakness(c) >= 0.5 ? 2 : 1; // weak concepts get double weight
      for (let r = 0; r < reps && workbook.length < n; r++) { const it = byConcept.get(c)!.shift(); if (it) { workbook.push(it); added = true; } }
    }
    if (!added) break;
  }
  workbook.sort((a, b) => b.difficulty - a.difficulty);
  workbook.forEach((it, i) => (it.marks = i < nLong ? marksLong : marksShort));
  if (workbook.length) workbook[workbook.length - 1].marks! += inp.totalMarks - workbook.reduce((s, i) => s + (i.marks ?? 0), 0);

  const days = Math.max(0, daysBetween(inp.today, inp.examDate)); // study days are today .. examDate-1
  const routine: Plan["routine"] = [];
  const weakFirst = [...new Set(workbook.map((i) => i.concept_id))].sort((a, b) => weakness(b) - weakness(a) || a.localeCompare(b));
  const mixedDays = days >= 4 ? 2 : days >= 2 ? 1 : 0;
  const learnDays = days - mixedDays;
  for (let d = 0; d < days; d++) {
    const date = day(inp.today, d);
    if (d < learnDays) {
      const per = Math.max(1, Math.ceil(weakFirst.length / Math.max(1, learnDays)));
      const cs = weakFirst.slice(d * per, d * per + per);
      routine.push({ date, focus: cs.length ? "weak_concepts" : "revision", concept_ids: cs.length ? cs : weakFirst.slice(0, 2), item_ids: workbook.filter((i) => cs.includes(i.concept_id)).map((i) => i.id) });
    } else routine.push({ date, focus: "mixed_practice", concept_ids: weakFirst, item_ids: workbook.filter((_, i) => i % mixedDays === d - learnDays).map((i) => i.id) });
  }
  return { workbook, routine };
}
