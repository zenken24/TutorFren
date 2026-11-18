import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { decideNextAction, EMPTY, type Mastery, updateMastery } from "./mastery.ts";
const run = (m: Mastery, n: number, correct: boolean, hints = 0) => { for (let i = 0; i < n; i++) m = updateMastery(m, { kind: "attempt", correct, hints_used: hints, difficulty: 2 }); return m; };

Deno.test("two different learners on the same topic get different next actions", () => {
  const strong = run(EMPTY, 6, true), weak = run(EMPTY, 3, false);
  assertNotEquals(decideNextAction(strong).action, decideNextAction(weak).action);
  assertEquals(decideNextAction(strong).action, "mastery_check");
});
Deno.test("repeated failure drops difficulty and revisits the prerequisite", () => {
  const m = run(run(EMPTY, 3, true), 3, false);
  const d = decideNextAction(m, { ...EMPTY, mastery: 0.2, evidence_count: 2 });
  assertEquals(d.action, "reteach_prerequisite"); assertEquals(d.difficulty, 1);
  assertEquals(decideNextAction(m, { ...EMPTY, mastery: 0.9, evidence_count: 5 }).difficulty, 1);
});
Deno.test("mastery across several items raises difficulty gradually", () => {
  const ds = [3, 4, 5, 7].map((n) => decideNextAction(run(EMPTY, n, true)).difficulty);
  for (let i = 1; i < ds.length; i++) assert(ds[i] >= ds[i - 1]);
  assert(ds[0] < ds[ds.length - 1]);
});
Deno.test("hints count for less; wrong lowers; misconception flags prerequisite; unsure never punishes", () => {
  const a = updateMastery(EMPTY, { kind: "attempt", correct: true, hints_used: 0, difficulty: 1 });
  const b = updateMastery(EMPTY, { kind: "attempt", correct: true, hints_used: 2, difficulty: 1 });
  assert(a.mastery > b.mastery && b.mastery > 0);
  assert(updateMastery(a, { kind: "attempt", correct: false, hints_used: 0, difficulty: 1 }).mastery < a.mastery);
  const mis = updateMastery(a, { kind: "explanation", verdict: "misconception", misconception_id: "m1" });
  assertEquals(decideNextAction(mis, { ...EMPTY, mastery: 0.1, evidence_count: 1 }).action, "reteach_prerequisite");
  assertEquals(updateMastery(a, { kind: "explanation", verdict: "unsure" }).mastery, a.mastery);
});
Deno.test("deterministic and bounded", () => {
  assertEquals(run(EMPTY, 5, true), run(EMPTY, 5, true));
  assertEquals(run(EMPTY, 50, true).mastery, 1); assertEquals(run(EMPTY, 50, false).mastery, 0);
});
