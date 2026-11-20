// Language guard for AI output: the app promises "Bangla means Bangla, English means English".
const BENGALI = /[ঀ-৿]/g;
const LATIN = /[A-Za-z]/g;
/** true when the text is in the requested language (English: no Bangla script; Bangla: mostly Bangla, no English words). */
export function inLanguage(text: string, lang: "bn" | "en"): boolean {
  const bn = (text.match(BENGALI) ?? []).length, la = (text.match(LATIN) ?? []).length;
  if (lang === "en") return bn === 0 && la > 0;
  return bn > 0 && la <= Math.max(2, Math.round(bn * 0.01)); // allow a stray symbol, never English sentences
}
/** the instruction appended LAST to a system prompt, so it wins over any examples above it */
export function languageRule(lang: "bn" | "en"): string {
  return lang === "en"
    ? "OUTPUT LANGUAGE: ENGLISH. Write every word in English with Western digits (0-9). Do not use any Bangla script at all, even if the examples above are in Bangla."
    : "OUTPUT LANGUAGE: BANGLA. Write every word in Bangla script with Bangla digits (০-৯). Do not use any English words or Latin letters at all; translate English source text.";
}
