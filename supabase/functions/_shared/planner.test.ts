import { assert, assertEquals } from "@std/assert";
import { buildPlan, type PlanItem } from "./planner.ts";
const items: PlanItem[] = [];
for (const ch of [1, 2, 3]) for (const c of ["a", "b"]) for (let i = 0; i < 8; i++) items.push({ id: `c${ch}${c}${i}`, concept_id: `c${ch}-${c}`, chapter: ch, difficulty: (i % 3) + 1 });
const conceptChapter = Object.fromEntries(items.map((i) => [i.concept_id, i.chapter]));
const base = { today: "2026-11-16", examDate: "2026-11-23", totalMarks: 50, chapters: [1, 2], pattern: { short: 10, long: 4 }, items, conceptChapter, mastery: { "c1-a": 0.9, "c1-b": 0.1, "c2-a": 0.2, "c2-b": 0.85 } };

Deno.test("workbook matches pattern and marks, only listed chapters", () => {
  const p = buildPlan(base);
  assertEquals(p.workbook.length, 14);
  assertEquals(p.workbook.reduce((s, i) => s + i.marks!, 0), 50);
  assert(p.workbook.every((i) => [1, 2].includes(i.chapter)));
});
Deno.test("weak concepts get more questions", () => {
  const p = buildPlan(base); const n = (c: string) => p.workbook.filter((i) => i.concept_id === c).length;
  assert(n("c1-b") > n("c1-a") && n("c2-a") > n("c2-b"));
});
Deno.test("routine ends before the exam, weak first, mixed practice last", () => {
  const p = buildPlan(base);
  assertEquals(p.routine.length, 7);
  assert(p.routine.every((d) => d.date < "2026-11-23"));
  assertEquals(p.routine[0].focus, "weak_concepts"); assert(p.routine[0].concept_ids.includes("c1-b"));
  assertEquals(p.routine.at(-1)!.focus, "mixed_practice");
  assertEquals(buildPlan({ ...base, examDate: "2026-11-16" }).routine.length, 0);
});
