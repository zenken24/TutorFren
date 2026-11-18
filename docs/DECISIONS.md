# Decisions made during the build

1. **Routes live in `apps/mobile/src/app/`**, not `app/` as in the workflow doc: that is the Expo SDK 58 convention.
2. **The book has no "Exercise N" numbering.** It uses four icon-marked item types: Let us do / নিজে করি (blue circle,
   chapter-end set), Exercise / অনুশীলন (orange square, inline), Task / কাজ (green triangle), Let us try / দেখি পারি কি না.
   Exercise and Task numbers restart in every sub-section. "Exercise 5 question 3" is therefore read as chapter 5's
   "Let us do" question 3 first; with a lesson context it is read as the inline Exercise 5 of that chapter; when more
   than one item fits (e.g. chapter 8 has three sets) the resolver returns candidates for the app to show as chips.
3. **Pure resolver lives in `supabase/functions/_shared/textbook/`** so Edge Functions can bundle it; the index is copied
   there and into the app by `npm run sync:textbook` (source of truth: `content/textbook/index.json`).
4. **Gemini calls use the Interactions API** (`ai.interactions.create`) because `@google/genai` 3.3.0 marks the older
   `responseMimeType`/`responseSchema` config as deprecated. `store: false` is always sent. Default model IDs in
   `.env.example` are aliases; confirm them before the pilot.
5. **Embeddings are 768-dimensional** (`vector(768)`), re-normalised in `llm.ts`.
6. **Content scripts run in Deno** and import `_shared/llm.ts`, so rule 11 (single Gemini entry point) holds for scripts too.
7. **Textbook page images go in a private bucket with no client policies**; the app gets 10-minute signed URLs from an
   Edge Function.
8. **OCR was done locally** (macOS Vision for English, tesseract for Bangla); no textbook content was sent to any API.
9. `apps/mobile` is not an npm workspace (separate `node_modules`) to avoid Expo hoisting problems. `react-dom` is
   installed only to satisfy a peer dependency of NativeWind.
10. Transcript retention ("end of pilot + 30 days") has no cron job yet because the pilot end date is not known.
11. **Pairing codes are looked up by hash, so a wrong guess cannot be tied to one code.** Instead of "5 wrong attempts
    burn the code", brute force is stopped by: 10 redeems/hour per IP, 5 failures/hour per device, 10-minute expiry and
    single use. (A per-code counter would need the child to type an identifier as well as the code.)
12. **Revoking a device signs the child out everywhere.** Supabase sessions belong to the user, not a device, so
    `device-revoke` deletes all of that child's sessions; devices that were not revoked are re-enrolled by the guardian.
13. **Step-up uses the JWT `amr` claim** (password/OTP time) and requires it to be under 5 minutes old.
14. **Practice items exist only for chapters 1 and 5** (306 items, answers computed from the printed numbers). Other
    chapters' exercises contain fractions/figures the OCR cannot be trusted on; lessons there point to the book's
    exercises and the tutor chat instead.
15. **Works without a Gemini key:** tutor replies and explanation checks degrade to safe canned hints ("degraded": true)
    so the whole app can be run and tested with no keys.
16. **Local dev keeps email confirmation off** (`supabase/config.toml`); turn it on, plus CAPTCHA and leaked-password
    protection, in the hosted project.
17. **Sentry is not wired in** (needs a DSN and a native build). `apps/mobile/src/lib/scrub.ts` is the tested `beforeSend`
    scrubber to use when it is added.
18. The app has not been run on a device or simulator in this build (none available on the build machine). It
    typechecks, lints, passes its Jest tests and produces an Android bundle with `expo export`.
