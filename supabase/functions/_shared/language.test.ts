import { assert } from "jsr:@std/assert@1";
import { inLanguage } from "./language.ts";
Deno.test("language guard", () => {
  assert(inLanguage("First add 5 and 8. What do you get?", "en"));
  assert(!inLanguage("মিশ্র ভগ্নাংশ চিহ্নিত করা", "en"));
  assert(inLanguage("প্রথমে ৫ আর ৮ যোগ করো। কত হয়?", "bn"));
  assert(!inLanguage("প্রথমে add the ones, তারপর tens", "bn"));
  assert(inLanguage("৩/৪ + ১/৪ = ১", "bn"));
});
