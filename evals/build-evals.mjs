// Generates eval sets from the rubrics and the textbook index (SYNTHETIC inputs, no child data).
//   evals/explanations.jsonl : accepted phrasing -> correct_*, misconception -> misconception   (bn + en)
//   evals/retrieval.jsonl    : lesson title -> expected lesson/pages                             (bn + en)
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const rub = JSON.parse(readFileSync(new URL("supabase/functions/_shared/rubrics.json", root), "utf8"));
const ix = JSON.parse(readFileSync(new URL("content/textbook/index.json", root), "utf8"));
const ex = [];
for (const r of Object.values(rub)) for (const lang of ["en", "bn"]) {
  for (const p of r.accepted_simple_phrasings) ex.push({ concept_id: r.concept_id, language: lang, text: p[lang], expected: ["correct_simple", "correct_full"] });
  for (const m of r.common_misconceptions) ex.push({ concept_id: r.concept_id, language: lang, text: m[lang], expected: ["misconception", "partial"], misconception_id: m.id });
  ex.push({ concept_id: r.concept_id, language: lang, text: lang === "en" ? "umm I think it is about numbers" : "উম্ম মনে হয় সংখ্যা নিয়ে কিছু", expected: ["unsure", "partial"] });
}
writeFileSync(new URL("evals/explanations.jsonl", root), ex.map((x) => JSON.stringify(x)).join("\n") + "\n");
const ret = [];
for (const c of ix.chapters) for (const l of c.lessons.slice(0, 2)) for (const lang of ["en", "bn"]) ret.push({ query: lang === "en" ? `How do I do ${l.title_en.toLowerCase()}?` : `${l.title_bn} কীভাবে করব?`, language: lang, expected_lesson_id: l.id, expected_chapter: c.number });
writeFileSync(new URL("evals/retrieval.jsonl", root), ret.map((x) => JSON.stringify(x)).join("\n") + "\n");
console.log(`explanations ${ex.length}, retrieval ${ret.length}`);
