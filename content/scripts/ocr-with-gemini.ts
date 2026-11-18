// Fills gaps in the textbook index: asks Gemini to transcribe one rendered page (text + question
// numbers) so a human can correct content/scripts/textbook/structure.py (MANUAL) or review Bangla text.
// The textbook is not personal data, so GEMINI_API_KEY_DEV is fine.
// Usage: deno run -A --env-file=supabase/functions/.env content/scripts/ocr-with-gemini.ts bn 96 97
import { readImage } from "../../supabase/functions/_shared/llm.ts";
const [lang, ...pages] = Deno.args;
if (!["bn", "en"].includes(lang) || !pages.length) { console.error("usage: ocr-with-gemini.ts <bn|en> <pdf page> [...]"); Deno.exit(1); }
const outDir = new URL("../generated/ocr-gemini/", import.meta.url);
await Deno.mkdir(outDir, { recursive: true });
const SYSTEM = "You transcribe a page of a Bangladeshi Class 5 mathematics textbook exactly. Keep the original language and digits. " +
  "Write fractions as a/b and mixed numbers as 'w a/b'. Mark blue-circle question numbers as [Q n], orange-square exercise numbers as [EX n], green-triangle task numbers as [TASK n], " +
  "and sub-items as (1), (2) or (a), (b) exactly as printed. Do not solve anything. Do not add commentary.";
for (const p of pages) {
  const name = `p${p.padStart(3, "0")}`;
  const bytes = await Deno.readFile(new URL(`../generated/pages/${lang}/${name}.webp`, import.meta.url));
  let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const text = await readImage(btoa(bin), "image/webp", SYSTEM, "Transcribe this page.", 4096);
  await Deno.writeTextFile(new URL(`${lang}-${name}.txt`, outDir), text);
  console.log(`wrote content/generated/ocr-gemini/${lang}-${name}.txt`);
  await new Promise((r) => setTimeout(r, 4000));
}
