// Textbook lookup: deterministic parser + resolver. Pure module (no Deno / network APIs)
// so it runs in Edge Functions, in tests and in the mobile app.
import type { Block, BlockKind, Lang, Question, TextbookIndex } from "./types.ts";

export interface ParsedRef {
  chapter?: number;
  page?: number; // printed page
  kind?: BlockKind; // explicit "let us do" / "task" / "exercise" / "let us try"
  exercise?: number; // number said right after the word "exercise"
  task?: number;
  question?: number;
  sub?: string; // "1".."30" or "a".."h"
  dotted?: boolean; // "exercise 5.3"
}
export interface LookupContext { chapter?: number; printedPage?: number }
export interface Candidate {
  block_id: string; kind: BlockKind; chapter: number; chapter_title: string;
  label: string; question: number | null; sub: string | null;
  printed_page: number; pdf_pages: number[]; question_text: string | null;
  text_verified: boolean; lesson_id: string | null; lesson_pdf_pages: number[];
  source_label: string;
}
export type LookupResult =
  | { status: "resolved"; parsed: ParsedRef; match: Candidate; candidates: Candidate[] }
  | { status: "ambiguous"; parsed: ParsedRef; candidates: Candidate[] }
  | { status: "not_found"; parsed: ParsedRef | null; nearest: Candidate[]; message_key: string };

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const BN_ALPHA: Record<string, string> = { "ক": "a", "খ": "b", "গ": "c", "ঘ": "d" };

export function normalize(input: string): string {
  let s = input.normalize("NFC").toLowerCase();
  s = s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  s = s.replace(/য়/g, "য়"); // decomposed ya-phala forms -> single code point
  s = s.replace(/[’'`]/g, "").replace(/[,;!?|।_]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

// keyword groups (English, Bangla, Banglish, common typos)
const W = {
  page: "(?:page|pg|pge|paje|peg|pej|পৃষ্ঠার|পৃষ্ঠায়|পৃষ্ঠা|পাতার|পাতা|পেজের|পেজ|prishtha|pristha|pata|patar)",
  chapter: "(?:chapter|chaptar|chapt|chap|ch|অধ্যায়ের|অধ্যায়|oddhay|odhyay|adhyay|oddhai)",
  exercise:
    "(?:exercises|exercise|exercize|excercise|exersise|exercice|exarcise|excersise|exercis|exer|exc|ex|অনুশীলনীর|অনুশীলনী|অনুশীলনের|অনুশীলন|onushiloni|anushiloni|onushilony|onusiloni|onushilon|anushilon)",
  letusdo: "(?:lets? us do|lets do|let us do it|নিজে করি|nije kori|nije kori)",
  letustry: "(?:lets? us try|lets try|দেখি পারি কি না|দেখি পারি|dekhi pari)",
  task: "(?:task|tsk|কাজের|কাজ|kaj)",
  question:
    "(?:questions|question|quetion|qustion|qestion|ques|que|qus|qn|q|problem|prob|sum|প্রশ্নের|প্রশ্ন|প্রশ্নটা|সমস্যা|অঙ্ক|অংক|proshno|prosno|proshner|somossa|onko)",
  no: "(?:number|numbar|no|num|নম্বর|নাম্বার|নং)",
};
const SEP = "[\\s.:#\\-]*";
const L = "(?<![a-z\\u0980-\\u09ff])"; // left boundary that also works for Bangla letters
const R = "(?![a-z\\u0980-\\u09ff])";

function take(s: string, re: RegExp): [RegExpMatchArray | null, string] {
  const m = s.match(re);
  if (!m) return [null, s];
  return [m, (s.slice(0, m.index!) + " " + s.slice(m.index! + m[0].length)).replace(/\s+/g, " ").trim()];
}
const normSub = (x?: string) => (x ? (BN_ALPHA[x] ?? x.replace(/^0+/, "")) : undefined);

export function parseReference(input: string): ParsedRef | null {
  let s = normalize(input);
  const out: ParsedRef = {};
  let m: RegExpMatchArray | null;

  // Bangla genitive ("১৬ পৃষ্ঠার", "৩ অধ্যায়ের"): the number comes first
  [m, s] = take(s, new RegExp(`${L}(\\d{1,3})${SEP}(?:${W.no}${SEP})?(?:পৃষ্ঠার|পৃষ্ঠায়|পাতার|পেজের|patar)${R}`));
  if (!m) [m, s] = take(s, new RegExp(`${L}${W.page}${R}${SEP}(?:${W.no}${SEP})?(\\d{1,3})`));
  if (!m) [m, s] = take(s, new RegExp(`${L}(\\d{1,3})${SEP}(?:${W.no}${SEP})?${W.page}${R}`));
  if (!m) [m, s] = take(s, new RegExp(`${L}p\\.?\\s?(\\d{1,3})${R}`));
  if (m) out.page = Number(m[1]);

  [m, s] = take(s, new RegExp(`${L}(\\d{1,2})${SEP}(?:${W.no}${SEP})?অধ্যায়ের${R}`));
  if (!m) [m, s] = take(s, new RegExp(`${L}${W.chapter}${R}${SEP}(?:${W.no}${SEP})?(\\d{1,2})`));
  if (!m) [m, s] = take(s, new RegExp(`${L}(\\d{1,2})${SEP}(?:${W.no}${SEP})?${W.chapter}${R}`));
  if (m) out.chapter = Number(m[1]);

  [m, s] = take(s, new RegExp(`${L}${W.letusdo}${R}`));
  if (m) out.kind = "let_us_do";
  [m, s] = take(s, new RegExp(`${L}${W.letustry}${R}`));
  if (m) out.kind = "let_us_try";

  [m, s] = take(s, new RegExp(`${L}${W.task}${R}${SEP}(?:${W.no}${SEP})?(\\d{1,2})`));
  if (m) { out.kind = "task"; out.task = Number(m[1]); }

  // exercise 5.3 / exercise 5(3) / exercise 5 / exercise
  [m, s] = take(s, new RegExp(`${L}${W.exercise}${R}${SEP}(?:${W.no}${SEP})?(\\d{1,2})\\s?[.(]\\s?(\\d{1,2})\\)?`));
  if (m) { out.exercise = Number(m[1]); out.question = Number(m[2]); out.dotted = true; out.kind ??= "exercise"; }
  else {
    [m, s] = take(s, new RegExp(`${L}${W.exercise}${R}(?:${SEP}(?:${W.no}${SEP})?(\\d{1,2}))?`));
    if (m) {
      out.kind ??= "exercise";
      if (m[1]) out.exercise = Number(m[1]);
    }
  }

  const subRe = `(?:\\s?\\(?\\s?([a-h]|[কখগঘ])\\s?\\)|\\s?\\(\\s?(\\d{1,2})\\s?\\))?`;
  if (out.question === undefined) {
    [m, s] = take(s, new RegExp(`${L}${W.question}${R}${SEP}(?:${W.no}${SEP})?(\\d{1,2})${subRe}`));
    if (!m) [m, s] = take(s, new RegExp(`${L}(\\d{1,2})${subRe}${SEP}${W.no}${R}(?:${SEP}${W.question}${R})?`));
    if (!m) [m, s] = take(s, new RegExp(`${L}${W.no}${R}${SEP}(\\d{1,2})${subRe}`));
    if (!m) [m, s] = take(s, new RegExp(`${L}(\\d{1,2})${subRe}${SEP}${W.question}${R}`));
    if (m) { out.question = Number(m[1]); out.sub = normSub(m[2] ?? m[3]); }
    else {
      [m, s] = take(s, new RegExp(`${L}${W.question}${R}${SEP}(?:${W.no}${SEP})?\\(?([a-h]|[কখগঘ])\\)?${R}`));
      if (m) out.sub = normSub(m[1]);
    }
  }
  if (out.sub === undefined) {
    [m, s] = take(s, new RegExp(`${L}(?:part|অংশ)${SEP}([a-h]|[কখগঘ]|\\d{1,2})${R}`));
    if (!m) [m, s] = take(s, /\(\s?([a-h]|[কখগঘ]|\d{1,2})\s?\)/);
    if (!m && out.exercise !== undefined) [m, s] = take(s, new RegExp(`^([b-h]|[কখগঘ])${R}|${L}([b-h]|[খগঘ])$`));
    if (m) out.sub = normSub(m[1] ?? m[2]);
  }
  // a bare number left over after a keyword: "exercise 5 er 3", "page 23 2"
  if (out.question === undefined && (out.exercise !== undefined || out.page !== undefined || out.kind === "let_us_do")) {
    [m, s] = take(s, new RegExp(`${L}(\\d{1,2})${R}`));
    if (m) out.question = Number(m[1]);
  }
  const has = out.page !== undefined || out.chapter !== undefined || out.kind !== undefined || out.question !== undefined;
  // a lone "question 3" is only meaningful with context; still return it so the caller can use context
  return has ? out : null;
}

// ---------------------------------------------------------------- resolve
const KIND_RANK: Record<BlockKind, number> = { let_us_do: 0, exercise: 1, task: 2, let_us_try: 3 };

export function createResolver(index: TextbookIndex) {
  const chapters = new Map(index.chapters.map((c) => [c.number, c]));
  const lessons = new Map(index.chapters.flatMap((c) => c.lessons.map((l) => [l.id, l] as const)));

  function cand(b: Block, q: Question | null, sub: string | null, lang: Lang): Candidate {
    const ch = chapters.get(b.chapter)!;
    const pick = (o: { text_en: string | null; text_bn: string | null } | null | undefined) =>
      o ? (lang === "bn" ? o.text_bn ?? o.text_en : o.text_en ?? o.text_bn) : null;
    const si = q && sub ? q.sub_items.find((s) => s.label === sub) : undefined;
    let text = pick(q);
    if (si) text = [text, `(${sub}) ${pick(si) ?? ""}`.trim()].filter(Boolean).join(" ");
    const lesson = b.lesson_id ? lessons.get(b.lesson_id) : undefined;
    const page = q?.printed_page ?? b.printed_pages[0];
    return {
      block_id: b.id, kind: b.kind, chapter: b.chapter,
      chapter_title: lang === "bn" ? ch.title_bn : ch.title_en,
      label: lang === "bn" ? b.label_bn : b.label_en,
      question: q && b.kind !== "exercise" && b.kind !== "task" ? q.number : null,
      sub: sub ?? null, printed_page: page,
      pdf_pages: q ? [q.pdf_page] : b.pdf_pages,
      question_text: text, text_verified: q?.text_verified ?? false,
      lesson_id: b.lesson_id, lesson_pdf_pages: lesson ? range(lesson.pdf_pages[0], lesson.pdf_pages[1]) : [],
      source_label: `${lang === "bn" ? index.book.source_label_bn : index.book.source_label_en} · ${lang === "bn" ? "অধ্যায়" : "Ch"} ${b.chapter} · ${lang === "bn" ? "পৃ." : "p."} ${page}`,
    };
  }
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  /** set-style blocks: the said number is a question number */
  function inSets(kind: BlockKind, filter: (b: Block) => boolean, q: number | undefined, sub: string | undefined, lang: Lang) {
    const out: Candidate[] = [];
    for (const b of index.blocks) {
      if (b.kind !== kind || !filter(b)) continue;
      if (q === undefined) { out.push(cand(b, null, null, lang)); continue; }
      const qq = b.questions.find((x) => x.number === q);
      if (qq) out.push(cand(b, qq, sub && qq.sub_items.some((s) => s.label === sub) ? sub : null, lang));
    }
    return out;
  }
  /** marker blocks (inline Exercise n / Task n): the "question" is a sub-item of the marker */
  function inMarkers(kind: "exercise" | "task", n: number, filter: (b: Block) => boolean, item: string | undefined, lang: Lang, strict = false) {
    const out: Candidate[] = [];
    for (const b of index.blocks) {
      if (b.kind !== kind || b.number !== n || !filter(b)) continue;
      const q = b.questions[0];
      if (item === undefined) out.push(cand(b, q, null, lang));
      else if (q.sub_items.some((s) => s.label === item)) out.push(cand(b, q, item, lang));
      else if (q.sub_items.length === 0 && !strict) out.push(cand(b, q, null, lang)); // sub-items not indexed: show the page
    }
    return out;
  }

  function resolve(p: ParsedRef | null, lang: Lang, ctx: LookupContext = {}): LookupResult {
    if (!p) return { status: "not_found", parsed: null, nearest: [], message_key: "lookup.not_understood" };
    const item = p.sub ?? (p.question !== undefined ? String(p.question) : undefined);
    const ctxChapter = p.chapter ?? ctx.chapter;
    let primary: Candidate[] = [];
    let alt: Candidate[] = [];

    if (p.page !== undefined) {
      const onPage = (b: Block) => b.printed_pages.includes(p.page!);
      if (p.task !== undefined) primary = inMarkers("task", p.task, onPage, item, lang);
      else if (p.exercise !== undefined) primary = inMarkers("exercise", p.exercise, onPage, item, lang);
      else if (p.question !== undefined) {
        primary = [
          ...inSets("let_us_do", onPage, p.question, p.sub, lang).filter((c) => c.printed_page === p.page),
          ...inMarkers("exercise", p.question, onPage, p.sub, lang),
          ...inMarkers("task", p.question, onPage, p.sub, lang),
          ...inSets("let_us_try", onPage, p.question, p.sub, lang).filter((c) => c.printed_page === p.page),
        ];
        if (p.kind) { const k = primary.filter((c) => c.kind === p.kind); if (k.length) primary = k; }
      } else {
        const blocks = index.blocks.filter(onPage).sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
        if (blocks.length) return ok(p, [pageOnly(p.page, lang)], blocks.map((b) => cand(b, null, null, lang)));
        if (pageExists(p.page)) return ok(p, [pageOnly(p.page, lang)], []);
      }
    } else if (p.task !== undefined) {
      primary = inMarkers("task", p.task, (b) => ctxChapter === undefined || b.chapter === ctxChapter, item, lang);
      primary = preferContextPage(primary, ctx);
    } else if (p.kind === "let_us_do" || p.kind === "let_us_try") {
      const ch = ctxChapter ?? p.exercise;
      if (ch !== undefined) primary = inSets(p.kind, (b) => b.chapter === ch, p.question, p.sub, lang);
    } else if (p.exercise !== undefined) {
      if (p.chapter !== undefined) {
        // "chapter 2 exercise 3 question 4" -> inline Exercise 3 in chapter 2
        primary = inMarkers("exercise", p.exercise, (b) => b.chapter === p.chapter, item, lang);
      } else {
        // "exercise 5 question 3": chapter-5 "Let us do" Q3, or an inline Exercise 5
        const sets = inSets("let_us_do", (b) => b.chapter === p.exercise, p.question, p.sub, lang);
        const inlineCtx = ctx.chapter !== undefined && !p.dotted
          ? preferContextPage(inMarkers("exercise", p.exercise, (b) => b.chapter === ctx.chapter, item, lang), ctx)
          : [];
        if (inlineCtx.length) { primary = inlineCtx; alt = sets; }
        else if (sets.length) {
          primary = sets;
          if (p.dotted && p.question !== undefined) alt = inMarkers("exercise", p.question, (b) => b.chapter === p.exercise, undefined, lang);
        } else if (!chapters.has(p.exercise)) primary = inMarkers("exercise", p.exercise, () => true, item, lang, true);
      }
    } else if (p.question !== undefined || p.kind === "exercise" || p.chapter !== undefined) {
      // "chapter 2 exercise question 4", "chapter 2 question 4", or a bare "question 4" with context
      if (ctxChapter !== undefined) {
        if (p.question === undefined && p.kind !== "exercise") {
          const ch = chapters.get(ctxChapter);
          if (ch) return ok(p, [pageOnly(ch.printed_pages[0], lang)], inSets("let_us_do", (b) => b.chapter === ctxChapter, undefined, undefined, lang));
        }
        primary = inSets("let_us_do", (b) => b.chapter === ctxChapter, p.question, p.sub, lang);
        if (p.chapter === undefined && ctx.printedPage !== undefined && p.question !== undefined) {
          const here = [
            ...inMarkers("exercise", p.question, (b) => b.printed_pages.includes(ctx.printedPage!), p.sub, lang),
            ...inMarkers("task", p.question, (b) => b.printed_pages.includes(ctx.printedPage!), p.sub, lang),
          ];
          if (here.length) { alt = primary; primary = here; }
        }
      } else {
        return { status: "not_found", parsed: p, nearest: [], message_key: "lookup.need_chapter_or_page" };
      }
    }

    if (primary.length === 1) return { status: "resolved", parsed: p, match: primary[0], candidates: alt.slice(0, 5) };
    if (primary.length > 1) return { status: "ambiguous", parsed: p, candidates: [...primary, ...alt].slice(0, 8) };
    return { status: "not_found", parsed: p, nearest: nearest(p, lang, ctx), message_key: "lookup.not_found" };
  }

  function ok(p: ParsedRef, primary: Candidate[], alt: Candidate[]): LookupResult {
    return { status: "resolved", parsed: p, match: primary[0], candidates: alt.slice(0, 8) };
  }
  function preferContextPage(cs: Candidate[], ctx: LookupContext) {
    if (cs.length > 1 && ctx.printedPage !== undefined) {
      const here = cs.filter((c) => c.printed_page === ctx.printedPage);
      if (here.length) return here;
    }
    return cs;
  }
  function pageExists(pp: number) {
    return index.book.page_map.ranges.some((r) => pp >= r.printed_from && pp <= r.printed_to);
  }
  function chapterOfPage(pp: number) {
    return index.chapters.find((c) => pp >= c.printed_pages[0] && pp <= c.printed_pages[1]);
  }
  function pageOnly(pp: number, lang: Lang): Candidate {
    const ch = chapterOfPage(pp)!;
    const lesson = ch.lessons.filter((l) => pp >= l.printed_pages[0] && pp <= l.printed_pages[1]).pop();
    const off = index.book.page_map.ranges[0].offset;
    return {
      block_id: `page-${pp}`, kind: "exercise", chapter: ch.number, chapter_title: lang === "bn" ? ch.title_bn : ch.title_en,
      label: lang === "bn" ? `পৃষ্ঠা ${pp}` : `Page ${pp}`, question: null, sub: null, printed_page: pp, pdf_pages: [pp - off],
      question_text: null, text_verified: false, lesson_id: lesson?.id ?? null,
      lesson_pdf_pages: lesson ? range(lesson.pdf_pages[0], lesson.pdf_pages[1]) : [],
      source_label: `${lang === "bn" ? index.book.source_label_bn : index.book.source_label_en} · ${lang === "bn" ? "অধ্যায়" : "Ch"} ${ch.number} · ${lang === "bn" ? "পৃ." : "p."} ${pp}`,
    };
  }
  function nearest(p: ParsedRef, lang: Lang, ctx: LookupContext): Candidate[] {
    const out: Candidate[] = [];
    if (p.page !== undefined && pageExists(p.page)) {
      out.push(pageOnly(p.page, lang));
      for (const b of index.blocks) if (b.printed_pages.includes(p.page)) out.push(cand(b, null, null, lang));
    }
    const ch = p.chapter ?? (p.kind !== "task" ? p.exercise : undefined) ?? ctx.chapter;
    if (ch !== undefined && chapters.has(ch)) out.push(...inSets("let_us_do", (b) => b.chapter === ch, undefined, undefined, lang));
    return out.slice(0, 5);
  }

  return {
    resolve,
    lookup: (text: string, lang: Lang, ctx: LookupContext = {}) => resolve(parseReference(text), lang, ctx),
    /** validate a ParsedRef coming from the LLM fallback before trusting it */
    sanitize(raw: unknown): ParsedRef | null {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as Record<string, unknown>;
      const int = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= max ? v : undefined);
      const kinds: BlockKind[] = ["let_us_do", "exercise", "task", "let_us_try"];
      const out: ParsedRef = {
        chapter: int(r.chapter, 10), page: int(r.page, 182), exercise: int(r.exercise, 30), task: int(r.task, 30),
        question: int(r.question, 30), kind: kinds.includes(r.kind as BlockKind) ? (r.kind as BlockKind) : undefined,
        sub: typeof r.sub === "string" && /^([a-h]|\d{1,2})$/.test(r.sub) ? r.sub : undefined,
      };
      return Object.values(out).some((v) => v !== undefined) ? out : null;
    },
  };
}
