# Build progress (resume notes)

## Done and checked
- Textbook index: `content/textbook/index.json` (10 chapters, 70 lessons, 339 blocks, 486 questions, 750 sub-items),
  `pages.en.json` (182 hand-written page summaries). English structure read fully; Bangla titles/headings read visually.
- Page render script (190 + 190 WebP pages produced), upload script (typechecks; not run — needs keys).
- Lookup resolver + 51 unit tests; redaction + tests; `llm.ts` (typechecks against @google/genai 3.3.0; never run with a key).
- `textbook-lookup` Edge Function (typechecks; not run end to end).
- Migrations (16 tables, RLS, guardian_summary, rate limiter, match_chunks, token hook, private bucket, cron) and
  22 pgTAP tests passing on a local Supabase stack.
- `CLAUDE.md`, `scripts/check-invariants.sh`, env examples, README, DECISIONS.

## Known gaps in the index
- Question text is machine OCR and unverified except 31 manually transcribed "Let us do" questions. Fractions and
  vertical sums are often garbled. Bangla text (435 of 486 questions) is tesseract output, unverified.
- "Let us try" numbering is OCR-only (`verified: false`); chapter 1's set has only one question indexed.
- Printed p. 151 prints "Exercise 2" twice (book typo): ids `p151-ex2` and `p151-ex2-b`.

## Built since (all verified on the local stack unless marked)
- All 14 Edge Functions; mastery rules and exam planner with unit tests (61 Deno tests pass).
- Seed: 70 concepts, 306 practice items (chapters 1 and 5 only), 182 curriculum chunks; 8 rubric YAMLs (drafts, not
  teacher-reviewed); synthetic demo seed.
- `scripts/smoke.ts`: 36/36 end-to-end checks pass (auth guards, consent, shared enrolment, pairing, lookup with signed
  page URLs, tutor, planner, guardian summary, revoke, export, delete). Function logs: 0 hits for the canary phrase.
- pgTAP 22/22; `supabase db lint` clean; invariants pass.
- Mobile app: all screens written. tsc clean, ESLint 0 errors (3 warnings), 13 Jest tests pass, `expo export` builds the
  Android bundle. **NOT run on a device or simulator** (none on the build machine) - expect UI fixes on first run.
- CI workflow, gitleaks config, dependabot, privacy notice + consent text (bn/en drafts), eval sets (12 safety,
  62 explanation, 40 retrieval) and a runner for safety/explanations.

## Not done / needs people
- First run on a real phone; Maestro E2E tests for the shared-phone lock; Stitch designs.
- Any run with a real Gemini key: `llm.ts` (Interactions API), embeddings (`content:ingest`), STT, and the evals have
  never been exercised against the live API. No retrieval recall@k script yet (only the query set).
- STT bake-off (`docs/vendors/stt-decision.md` is a placeholder).
- Rubrics for the other 62 concepts; practice items for chapters 2-4 and 6-10; teacher review of all content.
- Verifying OCR question text (31 of 486 are hand-checked); Bangla text is unverified tesseract output.
- CAPTCHA, email confirmation, leaked-password protection, MFA: hooks/notes only, to be enabled in the hosted project.
- Sentry is not installed (scrubber exists). Transcript-retention cron job (pilot end date unknown).
- Bangla UI strings need a native-speaker review.
