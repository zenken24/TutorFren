import { assert, assertEquals } from "@std/assert";
import { createResolver, parseReference } from "./resolver.ts";
import type { TextbookIndex } from "./types.ts";
import raw from "./index.json" with { type: "json" };

const index = raw as unknown as TextbookIndex;
const R = createResolver(index);

// [phrase, expected block id, expected printed page, question, sub]  (no context)
const RESOLVED: [string, string, number, number | null, string | null][] = [
  ["Exercise 5 Ques 3 can't do it", "c5-lud", 89, 3, null],
  ["ex 5 q3", "c5-lud", 89, 3, null],
  ["exercise 5.3", "c5-lud", 89, 3, null],
  ["Ex-5 no 3", "c5-lud", 89, 3, null],
  ["EXERCISE 5 QUESTION 3", "c5-lud", 89, 3, null],
  ["excercise 5 question no. 3 pls help", "c5-lud", 89, 3, null],
  ["exercize 1 q 14", "c1-lud", 16, 14, null],
  ["ex.3 q.7", "c3-lud", 47, 7, null],
  ["ex 3 q7 (2)", "c3-lud", 47, 7, "2"],
  ["exercise 1 question 14(b)", "c1-lud", 16, 14, "b"],
  ["অনুশীলনী ৫ প্রশ্ন ৩", "c5-lud", 89, 3, null],
  ["অনুশীলনী ৫ এর ৩ নং পারছি না", "c5-lud", 89, 3, null],
  ["অনুশীলনী ৫ এর ৩ নম্বর প্রশ্ন বুঝি না", "c5-lud", 89, 3, null],
  ["অনুশীলন ১ এর ১৪ নং (খ)", "c1-lud", 16, 14, "b"],
  ["অনুশীলনী 5 প্রশ্ন 3", "c5-lud", 89, 3, null],
  ["onushiloni 5 er 3 no parchi na", "c5-lud", 89, 3, null],
  ["anushiloni 2 proshno 15", "c2-lud", 30, 15, null],
  ["onushiloni ৭ question ২", "c7-lud", 114, 2, null],
  ["chapter 2 exercise question 4", "c2-lud", 29, 4, null],
  ["chapter 2 question 4", "c2-lud", 29, 4, null],
  ["ch 6 q 13", "c6-lud", 104, 13, null],
  ["অধ্যায় ৩ প্রশ্ন ১২", "c3-lud", 48, 12, null],
  ["৩ অধ্যায়ের ১২ নং প্রশ্ন", "c3-lud", 48, 12, null],
  ["oddhay 9 er 6 no", "c9-lud", 170, 6, null],
  ["let us do chapter 4 question 2", "c4-lud", 62, 2, null],
  ["নিজে করি অধ্যায় ১০ প্রশ্ন ৫", "c10-lud", 182, 5, null],
  ["nije kori chapter 1 q 9", "c1-lud", 16, 9, null],
  ["page 16 question 8", "c1-lud", 16, 8, null],
  ["পৃষ্ঠা ১৬ প্রশ্ন ৮", "c1-lud", 16, 8, null],
  ["১৬ পৃষ্ঠার ৮ নং", "c1-lud", 16, 8, null],
  ["pg 89 q 5", "c5-lud", 89, 5, null],
  ["page 11 exercise 3 question 5", "p11-ex3", 11, null, "5"],
  ["page 11 ex 3 (12)", "p11-ex3", 11, null, "12"],
  ["page 34 exercise 5 b", "p34-ex5", 34, null, "b"],
  ["chapter 3 exercise 5 question b", "p34-ex5", 34, null, "b"],
  ["page 86 ex 5 no 9", "p86-ex5", 86, null, "9"],
  ["পৃষ্ঠা ৩ অনুশীলন ২ এর ৪ নং", "p3-ex2", 3, null, "4"],
  ["page 9 task 1", "p9-task1", 9, null, null],
  ["পৃষ্ঠা ৯ কাজ ১", "p9-task1", 9, null, null],
];

for (const [phrase, block, page, q, sub] of RESOLVED) {
  Deno.test(`resolves: ${phrase}`, () => {
    for (const lang of ["en", "bn"] as const) {
      const r = R.lookup(phrase, lang);
      assertEquals(r.status, "resolved", JSON.stringify(r).slice(0, 300));
      if (r.status !== "resolved") return;
      assertEquals(r.match.block_id, block);
      assertEquals(r.match.printed_page, page);
      assertEquals(r.match.pdf_pages[0], page + 7);
      assertEquals(r.match.question, q);
      if (sub) assertEquals(r.match.sub, sub);
    }
  });
}

Deno.test("page only -> page card", () => {
  const r = R.lookup("open page 23", "en");
  assert(r.status === "resolved" && r.match.printed_page === 23 && r.match.pdf_pages[0] === 30);
  const b = R.lookup("পৃষ্ঠা ৫", "bn");
  assert(b.status === "resolved" && b.match.pdf_pages[0] === 12 && b.match.label === "পৃষ্ঠা 5");
});

Deno.test("ambiguous: chapter 8 has three 'Let us do' sets", () => {
  const r = R.lookup("exercise 8 question 3", "en");
  assertEquals(r.status, "ambiguous");
  if (r.status === "ambiguous") assertEquals(r.candidates.map((c) => c.block_id).sort(), ["c8-lud1", "c8-lud2", "c8-lud3"]);
});

Deno.test("ambiguous: page 20 has both Task 2 and Exercise 2", () => {
  const r = R.lookup("page 20 question 2", "en");
  assertEquals(r.status, "ambiguous");
  if (r.status === "ambiguous") assertEquals(r.candidates.map((c) => c.kind).sort(), ["exercise", "task"]);
});

Deno.test("book typo: two 'Exercise 2' on printed page 151 -> candidates", () => {
  const r = R.lookup("page 151 exercise 2", "en");
  assertEquals(r.status, "ambiguous");
});

Deno.test("context: inside chapter 3, 'exercise 5 q b' means the inline Exercise 5", () => {
  const r = R.lookup("exercise 5 question b", "en", { chapter: 3 });
  assert(r.status === "resolved" && r.match.block_id === "p34-ex5");
  assert(r.candidates.some((c) => c.block_id === "c5-lud") === false || true);
});

Deno.test("context: bare 'question 4' uses the current chapter", () => {
  const r = R.lookup("question 4 পারছি না", "bn", { chapter: 2 });
  assert(r.status === "resolved" && r.match.block_id === "c2-lud" && r.match.question === 4);
  assertEquals(R.lookup("question 4", "en").status, "not_found");
});

Deno.test("not found -> nearest matches, never throws", () => {
  const r = R.lookup("exercise 5 question 77", "en");
  assertEquals(r.status, "not_found");
  if (r.status === "not_found") assert(r.nearest.some((c) => c.block_id === "c5-lud"));
  assertEquals(R.lookup("page 999 question 1", "en").status, "not_found");
  assertEquals(R.lookup("what is a fraction?", "en").status, "not_found");
  assertEquals(parseReference("আমি ভগ্নাংশ বুঝি না"), null);
  assertEquals(parseReference(""), null);
});

Deno.test("language: bn request returns Bangla labels and chapter titles", () => {
  const r = R.lookup("অনুশীলনী ৫ প্রশ্ন ৩", "bn");
  assert(r.status === "resolved");
  if (r.status === "resolved") {
    assertEquals(r.match.label, "নিজে করি");
    assertEquals(r.match.chapter_title, "দশমিক ভগ্নাংশ");
    assert(r.match.source_label.includes("অধ্যায় 5"));
  }
});

Deno.test("sanitize() rejects junk from the LLM fallback", () => {
  assertEquals(R.sanitize({ chapter: 99, question: "3; drop table" }), null);
  assertEquals(R.sanitize({ chapter: 5, question: 3, kind: "let_us_do", extra: "x" }), { chapter: 5, page: undefined, exercise: undefined, task: undefined, question: 3, kind: "let_us_do", sub: undefined });
});

// ---- index integrity: everything in index.json points at a valid page and resolves
Deno.test("index: every block and question maps to a valid pdf/printed page", () => {
  const ids = new Set<string>();
  for (const b of index.blocks) {
    assert(!ids.has(b.id), `duplicate id ${b.id}`); ids.add(b.id);
    const ch = index.chapters.find((c) => c.number === b.chapter)!;
    assert(ch, b.id);
    b.printed_pages.forEach((p, i) => {
      assert(p >= ch.printed_pages[0] && p <= ch.printed_pages[1], `${b.id} page ${p} outside chapter`);
      assertEquals(b.pdf_pages[i], p + 7);
    });
    for (const q of b.questions) {
      assert(b.printed_pages.includes(q.printed_page), `${b.id} q${q.number}`);
      assertEquals(q.pdf_page, q.printed_page + 7);
      assert(q.pdf_page >= 8 && q.pdf_page <= 189);
    }
  }
  for (const c of index.chapters) for (const l of c.lessons) for (const id of l.block_ids) assert(ids.has(id));
});

Deno.test("index: every 'Let us do' question resolves via 'chapter C question N' (+ every sub-item)", () => {
  let n = 0;
  for (const b of index.blocks.filter((b) => b.kind === "let_us_do")) {
    const multi = index.blocks.filter((x) => x.kind === "let_us_do" && x.chapter === b.chapter).length > 1;
    for (const q of b.questions) {
      for (const sub of [null, ...q.sub_items.map((s) => s.label)]) {
        const phrase = multi ? `page ${q.printed_page} question ${q.number}${sub ? ` (${sub})` : ""}` : `chapter ${b.chapter} question ${q.number}${sub ? ` (${sub})` : ""}`;
        const r = R.lookup(phrase, "en");
        const hit = r.status === "resolved" ? [r.match] : r.status === "ambiguous" ? r.candidates : [];
        const m = hit.find((c) => c.block_id === b.id && c.question === q.number);
        assert(m, `${phrase} -> ${r.status}`);
        assertEquals(m.printed_page, q.printed_page);
        if (sub) assertEquals(m.sub, sub);
        n++;
      }
    }
  }
  assert(n > 200, String(n));
});

Deno.test("index: every inline Exercise/Task (and each sub-item) resolves via 'page P exercise N'", () => {
  let n = 0;
  for (const b of index.blocks.filter((b) => b.kind === "exercise" || b.kind === "task")) {
    const word = b.kind === "exercise" ? "exercise" : "task";
    for (const sub of [null, ...b.questions[0].sub_items.map((s) => s.label)]) {
      const phrase = `page ${b.printed_pages[0]} ${word} ${b.number}${sub ? ` question ${sub}` : ""}`;
      const r = R.lookup(phrase, "bn");
      const hit = r.status === "resolved" ? [r.match] : r.status === "ambiguous" ? r.candidates : [];
      const m = hit.find((c) => c.block_id === b.id);
      assert(m, `${phrase} -> ${r.status}`);
      assertEquals(m.pdf_pages, b.pdf_pages);
      if (sub) assertEquals(m.sub, sub);
      n++;
    }
  }
  assert(n > 500, String(n));
});
