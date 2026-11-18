// The textbook structure (chapters, lessons, exercise blocks) is bundled with the app; it is not personal data.
import raw from "../content/textbook-index.json";
import type { Lang } from "../i18n";

export interface TBQuestion { number: number; printed_page: number; pdf_page: number; text_en: string | null; text_bn: string | null; sub_items: { label: string; text_en: string | null; text_bn: string | null }[] }
export interface TBBlock { id: string; kind: "let_us_do" | "exercise" | "task" | "let_us_try"; number: number | null; chapter: number; lesson_id: string | null; label_en: string; label_bn: string; printed_pages: number[]; pdf_pages: number[]; questions: TBQuestion[] }
export interface TBLesson { id: string; number: number; title_en: string; title_bn: string; concept_id: string; printed_pages: [number, number]; pdf_pages: [number, number]; block_ids: string[] }
export interface TBChapter { number: number; title_en: string; title_bn: string; printed_pages: [number, number]; lessons: TBLesson[]; let_us_do_block_ids: string[]; let_us_try_block_ids: string[] }
const index = raw as unknown as { book: { source_label_en: string; source_label_bn: string }; chapters: TBChapter[]; blocks: TBBlock[] };

export const chapters = index.chapters;
export const blocks = index.blocks;
export const allLessons = chapters.flatMap((c) => c.lessons.map((l) => ({ ...l, chapter: c.number })));
export const blockById = (id: string) => blocks.find((b) => b.id === id);
export const lessonById = (id: string) => allLessons.find((l) => l.id === id);
export const lessonByConcept = (c: string) => allLessons.find((l) => l.concept_id === c);
export const title = (o: { title_en: string; title_bn: string }, l: Lang) => (l === "bn" ? o.title_bn : o.title_en);
export const label = (o: { label_en: string; label_bn: string }, l: Lang) => (l === "bn" ? o.label_bn : o.label_en);
export const sourceLabel = (l: Lang, chapter: number, page: number, n: (x: number) => string) =>
  `${l === "bn" ? index.book.source_label_bn : index.book.source_label_en} · ${l === "bn" ? "অধ্যায়" : "Ch"} ${n(chapter)} · ${l === "bn" ? "পৃ." : "p."} ${n(page)}`;
