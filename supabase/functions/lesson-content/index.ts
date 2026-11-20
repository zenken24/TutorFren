// lesson-content: the Learn step of a lesson, shown one step at a time.
//   * steps:    the idea broken into small steps, each with a simple picture (counters, equation, fraction bar,
//               vertical sum) - e.g. adding: take two numbers -> put them together -> count.
//   * examples: 2 worked examples, each also step by step.
// Generated ONCE per lesson + language from that lesson's textbook pages and cached in lesson_content
// (curriculum only, no personal data). Generating it also adds an easy "Try" problem, practice problems and a
// mastery-check problem for the lesson's concept to the items table; their ANSWERS stay on the server.
import { z } from "zod";
import { adminClient, body, HttpError, json, rateLimit, requireUser, serve } from "../_shared/http.ts";
import { generateJson } from "../_shared/llm.ts";
import { studentInfo } from "../_shared/learner.ts";
import { inLanguage, languageRule } from "../_shared/language.ts";
import type { TextbookIndex } from "../_shared/textbook/types.ts";
import raw from "../_shared/textbook/index.json" with { type: "json" };

const index = raw as unknown as TextbookIndex;
const lessons = index.chapters.flatMap((c) => c.lessons.map((l) => ({ ...l, chapter: c.number })));
const Body = z.strictObject({ lesson_id: z.string().max(40), language: z.enum(["bn", "en"]) });

const VISUAL = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["counters", "equation", "fraction", "column", "none"] },
    groups: { type: "array", items: { type: "integer" }, description: "counters: size of each group (each 0-20)" },
    op: { type: "string", enum: ["+", "-", "×", "÷", ""], description: "counters: how the groups are combined" },
    result: { type: "string", description: "counters/equation: the result to show" },
    numerator: { type: "integer" }, denominator: { type: "integer" },
    lines: { type: "array", items: { type: "string" }, description: "equation: 1-3 short lines; column: the rows of a vertical sum, last row is the answer" },
  },
  required: ["type"],
};
const STEP = { type: "object", properties: { title: { type: "string" }, text: { type: "string" }, visual: VISUAL }, required: ["title", "text", "visual"] };
const PROBLEM = { type: "object", properties: { prompt: { type: "string" }, answer: { type: "string" }, hints: { type: "array", items: { type: "string" } } }, required: ["prompt", "answer", "hints"] };
const SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    steps: { type: "array", items: STEP },
    examples: { type: "array", items: { type: "object", properties: { problem: { type: "string" }, steps: { type: "array", items: STEP }, answer: { type: "string" } }, required: ["problem", "steps", "answer"] } },
    easy_problem: PROBLEM,
    practice: { type: "array", items: { ...PROBLEM, properties: { ...PROBLEM.properties, difficulty: { type: "integer" } }, required: [...PROBLEM.required, "difficulty"] } },
    check: PROBLEM,
  },
  required: ["intro", "steps", "examples", "easy_problem", "practice", "check"],
};
const POLICY = `You write the "Learn" step of a maths lesson for Grade 5 children in Bangladesh (NCTB Class 5 Elementary Mathematics).
Use ONLY the TEXTBOOK PAGES given; do not invent facts or methods that are not there.
- steps: 3-6 small steps that build the idea from the very start, like a teacher at the board. Example for adding:
  1) here are two numbers (counters 3 and 4), 2) put them together (counters 3 + 4), 3) count all of them (result 7),
  4) write it as a number sentence (equation "3 + 4 = 7"). Each step: a short title, 1-2 short sentences, and a visual.
- visual types: counters (small numbers only, each group <= 20; op joins them; result optional), equation (1-3 lines),
  fraction (numerator/denominator), column (rows of a vertical sum or product, last row = answer), none.
  Use a visual in almost every step. Never put more than 20 in one counters group: use equation or column instead.
- examples: exactly 2 worked examples, each with 2-4 steps (same visual types) and the final answer.
- easy_problem: one EASY problem on the same idea (smaller numbers than the examples), answer as a short value only
  (e.g. "7", "3/4", "12 r 2"), 2 hints that guide without giving the answer.
- practice: 3 problems, difficulty 1, 2 and 3. check: one new problem at medium-hard level. Short answers, 1-2 hints each.
- Write EVERYTHING (titles, text, examples, problems, answers, hints, visual lines) in the requested language only.
  Bangla: Bangla script and Bangla digits (০-৯), simple words a 10-year-old uses, no English words or Latin letters.
  The textbook pages are in English: translate them, never copy English text into Bangla content. English: English only.
- Plain style: no exclamation marks, no emoji, no filler.`;

type Problem = { prompt: string; answer: string; hints: string[] };
type Content = { intro: string; steps: unknown[]; examples: unknown[]; easy_problem: Problem; practice: (Problem & { difficulty: number })[]; check: Problem };

serve("lesson-content", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["student"]);
  ctx.setUser(user.id);
  const b = await body(req, Body);
  const lesson = lessons.find((l) => l.id === b.lesson_id);
  if (!lesson) throw new HttpError(404, "not_found");

  const { data: cached } = await admin.from("lesson_content").select("content").eq("lesson_id", lesson.id).eq("language", b.language).maybeSingle();
  if (cached) return json({ lesson_id: lesson.id, ...(cached.content as Record<string, unknown>) });

  await rateLimit(admin, `lesson-content:${user.id}`, 30, 3600); // generation only (cached reads are free)
  if (!(await studentInfo(admin, user.id))) throw new HttpError(403, "account_inactive");
  const { data: chunks } = await admin.from("curriculum_chunks").select("content,page_ref").eq("approved", true).eq("lesson_id", lesson.id).order("pdf_page").limit(6);
  let out: Content | null = null;
  const input = JSON.stringify({
    output_language: b.language === "bn" ? "Bangla" : "English",
    lesson_title: b.language === "bn" ? lesson.title_bn : lesson.title_en,
    textbook_pages: (chunks ?? []).map((c) => ({ page: c.page_ref, text: c.content })),
  });
  // the language rule goes LAST; the result is checked and regenerated once if it came back in the wrong language
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
    let o: Content;
    try { o = await generateJson<Content>(SCHEMA, `${POLICY}\n\n${languageRule(b.language)}`, input, 6000); }
    catch { throw new HttpError(503, "content_unavailable"); }
    const visibleText = JSON.stringify([o.intro, o.steps, o.examples, o.easy_problem, o.practice, o.check])
      .replace(/"(title|text|visual|type|groups|op|result|numerator|denominator|lines|problem|answer|steps|prompt|hints|difficulty|counters|equation|fraction|column|none)"/g, "");
    if (inLanguage(visibleText, b.language)) out = o;
  }
  if (!out) throw new HttpError(503, "content_unavailable"); // never save content in the wrong language
  const clean = { intro: out.intro, steps: (out.steps ?? []).slice(0, 6), examples: (out.examples ?? []).slice(0, 2), source_pages: lesson.printed_pages };
  if (!clean.steps.length) throw new HttpError(503, "content_unavailable");

  // problems go to the items table (answers stay server-side); only top up concepts that have few items
  const { count } = await admin.from("items").select("id", { count: "exact", head: true }).eq("concept_id", lesson.concept_id).eq("language", b.language);
  if ((count ?? 0) < 4) {
    const src = `ai:lesson-content:${lesson.id}`;
    const rows = [
      { ...out.easy_problem, difficulty: 1 },
      ...(out.practice ?? []).slice(0, 3).map((p) => ({ ...p, difficulty: Math.min(3, Math.max(1, Math.round(p.difficulty || 2))) })),
      { ...out.check, difficulty: 3 },
    ].filter((p) => p?.prompt && p?.answer)
      .map((p) => ({ concept_id: lesson.concept_id, language: b.language, difficulty: p.difficulty, prompt: p.prompt.slice(0, 500), answer: String(p.answer).slice(0, 60), hints: (p.hints ?? []).slice(0, 3), source_ref: src }));
    if (rows.length) await admin.from("items").insert(rows);
  }
  await admin.from("lesson_content").upsert({ lesson_id: lesson.id, language: b.language, content: clean, model: Deno.env.get("GEMINI_MODEL") ?? null });
  return json({ lesson_id: lesson.id, ...clean });
});
