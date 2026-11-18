// Exam planner: the student supplies structure only (no uploads). Workbook is weighted to weak
// concepts from this learner's mastery; a rule-based routine ends the day before the exam.
import { z } from "zod";
import { adminClient, body, HttpError, json, rateLimit, requireUser, serve } from "../_shared/http.ts";
import { loadMastery, studentInfo } from "../_shared/learner.ts";
import { buildPlan, daysBetween } from "../_shared/planner.ts";
const Body = z.strictObject({
  exam_name: z.string().trim().min(1).max(80), exam_date: z.iso.date(), total_marks: z.number().int().min(5).max(200),
  chapters: z.array(z.number().int().min(1).max(10)).min(1).max(10), language: z.enum(["bn", "en"]),
  question_pattern: z.strictObject({ short: z.number().int().min(0).max(40).optional(), long: z.number().int().min(0).max(20).optional() }),
});
serve("exam-planner", async (req, ctx) => {
  const admin = adminClient();
  const user = await requireUser(req, admin, ["student"]);
  ctx.setUser(user.id);
  await rateLimit(admin, `planner:${user.id}`, 10, 3600);
  const b = await body(req, Body);
  if (!(await studentInfo(admin, user.id))) throw new HttpError(403, "account_inactive");
  const today = new Date().toISOString().slice(0, 10);
  if (daysBetween(today, b.exam_date) < 1 || daysBetween(today, b.exam_date) > 180) throw new HttpError(400, "invalid_date");
  const chapters = [...new Set(b.chapters)];
  const { data: concepts } = await admin.from("concepts").select("id,chapter,title_en,title_bn").in("chapter", chapters);
  if (!concepts?.length) throw new HttpError(400, "unknown_chapters");
  const { data: items } = await admin.from("items").select("id,concept_id,difficulty,prompt").eq("language", b.language).in("concept_id", concepts.map((c) => c.id));
  const chapterOf = Object.fromEntries(concepts.map((c) => [c.id, c.chapter]));
  const mastery = Object.fromEntries([...(await loadMastery(admin, user.id)).entries()].map(([k, v]) => [k, v.mastery]));
  const plan = buildPlan({ today, examDate: b.exam_date, totalMarks: b.total_marks, chapters, pattern: b.question_pattern, mastery, conceptChapter: chapterOf,
    items: (items ?? []).map((i) => ({ id: i.id, concept_id: i.concept_id, chapter: chapterOf[i.concept_id], difficulty: i.difficulty })) });
  const prompts = Object.fromEntries((items ?? []).map((i) => [i.id, i.prompt]));
  const title = Object.fromEntries(concepts.map((c) => [c.id, b.language === "bn" ? c.title_bn : c.title_en]));
  const workbook = plan.workbook.map((i) => ({ item_id: i.id, concept_id: i.concept_id, concept: title[i.concept_id], chapter: i.chapter, marks: i.marks, prompt: prompts[i.id] }));
  // chapters without auto-generated items still appear in the routine as "study from the book"
  const missing = concepts.filter((c) => !plan.workbook.some((w) => w.concept_id === c.id)).sort((x, y) => (mastery[x.id] ?? 0) - (mastery[y.id] ?? 0));
  const routine = plan.routine.map((d, i) => ({ ...d, concepts: d.concept_ids.map((c) => title[c]), read_from_book: missing.length ? [title[missing[i % missing.length].id]] : [] }));
  const row = { student_id: user.id, exam_name: b.exam_name, exam_date: b.exam_date, total_marks: b.total_marks, chapters, question_pattern: b.question_pattern, workbook, routine };
  const { data, error } = await admin.from("exam_plans").insert(row).select("id").single();
  if (error) throw new HttpError(500, "internal");
  return json({ id: data.id, exam_name: b.exam_name, exam_date: b.exam_date, workbook, routine });
});
