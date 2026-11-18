// Learner model: transparent rules, pure functions, deterministic. (No BKT claims.)
export interface Mastery { mastery: number; evidence_count: number; confidence: number; recent_errors: string[]; last_strategy: string | null }
export type Verdict = "correct_simple" | "correct_full" | "partial" | "misconception" | "unsure";
export type Evidence =
  | { kind: "attempt"; correct: boolean; hints_used: number; difficulty: 1 | 2 | 3 }
  | { kind: "explanation"; verdict: Verdict; misconception_id?: string | null };
export type Action = "reteach_prerequisite" | "worked_example" | "hint" | "practice_same" | "increase_difficulty" | "mastery_check";
export interface Decision { action: Action; difficulty: 1 | 2 | 3; reason_en: string; reason_bn: string }

export const EMPTY: Mastery = { mastery: 0, evidence_count: 0, confidence: 0, recent_errors: [], last_strategy: null };
const clamp = (x: number) => Math.max(0, Math.min(1, Math.round(x * 1000) / 1000));

export function updateMastery(m: Mastery, e: Evidence): Mastery {
  let delta = 0;
  let errors = m.recent_errors;
  if (e.kind === "attempt") {
    if (e.correct) delta = e.hints_used === 0 ? 0.12 + 0.03 * e.difficulty : Math.max(0.03, 0.08 - 0.02 * e.hints_used);
    else { delta = -0.1; errors = [...errors, "wrong_answer"]; }
  } else {
    delta = { correct_full: 0.2, correct_simple: 0.18, partial: 0.06, unsure: 0, misconception: -0.12 }[e.verdict];
    if (e.verdict === "misconception") errors = [...errors, e.misconception_id ? `misconception:${e.misconception_id}` : "misconception"];
  }
  if (delta > 0) errors = errors.slice(1); // a success clears the oldest error
  const evidence_count = m.evidence_count + (e.kind === "explanation" && e.verdict === "unsure" ? 0 : 1);
  return { mastery: clamp(m.mastery + delta), evidence_count, confidence: clamp(1 - 1 / (1 + evidence_count / 3)), recent_errors: errors.slice(-5), last_strategy: m.last_strategy };
}

/** Did the last evidence point at the prerequisite concept? */
export const flagsPrerequisite = (m: Mastery) => m.recent_errors.some((e) => e.startsWith("misconception"));

export function decideNextAction(m: Mastery, prerequisite?: Mastery | null): Decision {
  const d = (action: Action, difficulty: 1 | 2 | 3, reason_en: string, reason_bn: string): Decision => ({ action, difficulty, reason_en, reason_bn });
  const errs = m.recent_errors.length;
  if (prerequisite && prerequisite.mastery < 0.5 && (errs >= 2 || flagsPrerequisite(m)))
    return d("reteach_prerequisite", 1, "You slipped a few times, so let's make the earlier idea strong first.", "কয়েকবার ভুল হয়েছে, তাই আগের ধারণাটা আগে মজবুত করি।");
  if (m.evidence_count === 0) return d("worked_example", 1, "This is new for you, so we start with an example.", "এটা তোমার জন্য নতুন, তাই একটি উদাহরণ দিয়ে শুরু করি।");
  if (errs >= 3) return d("worked_example", 1, "Let's look at a solved example again, step by step.", "চলো একটি সমাধান করা উদাহরণ আবার ধাপে ধাপে দেখি।");
  if (errs >= 1 && m.mastery < 0.5) return d("hint", 1, "You are close. A small hint will help.", "তুমি কাছাকাছি আছো। একটি ছোট সংকেত সাহায্য করবে।");
  if (m.mastery >= 0.8 && m.evidence_count >= 3) return d("mastery_check", 3, "You did well several times. One new question to confirm it.", "তুমি কয়েকবার ভালো করেছ। নিশ্চিত হতে একটি নতুন প্রশ্ন।");
  if (m.mastery >= 0.55) return d("increase_difficulty", m.mastery >= 0.7 ? 3 : 2, "You are getting these right, so try a slightly harder one.", "তুমি ঠিক করছ, তাই একটু কঠিন একটা চেষ্টা করো।");
  return d("practice_same", m.mastery >= 0.3 ? 2 : 1, "A little more practice at this level will make it stick.", "এই স্তরে আরেকটু অনুশীলন করলে ভালোভাবে মনে থাকবে।");
}
export function badge(m: Mastery | undefined): "not_started" | "learning" | "practising" | "mastered" {
  if (!m || m.evidence_count === 0) return "not_started";
  return m.mastery >= 0.8 ? "mastered" : m.mastery >= 0.4 ? "practising" : "learning";
}
