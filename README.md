# TutorFren

Bilingual (Bangla/English) adaptive maths tutor for Grade 5 in Bangladesh, built around the NCTB Class 5
Elementary Mathematics textbook (academic year 2026). Rules: `CLAUDE.md`. Decisions: `docs/DECISIONS.md`.
Status and known gaps: `docs/BUILD_PROGRESS.md`. All demo data is synthetic.

```
apps/mobile/          Expo (SDK 58) app: student mode (5 tabs) + locked guardian mode
supabase/migrations/  Postgres schema, RLS, guardian_summary(), retention jobs
supabase/functions/   14 Edge Functions + _shared (llm.ts is the only Gemini entry point)
supabase/tests/       pgTAP access tests          supabase/seed.sql   curriculum seed (generated)
content/              textbook index, page renderer, rubrics, ingest scripts
evals/                safety, explanation and retrieval eval sets
scripts/              check-invariants.sh, smoke.ts (end-to-end), dev-env.sh
```

## Run it locally (no API keys needed)
Needs Node 22+, Docker Desktop running, `pdftoppm` and `cwebp` (only for re-rendering pages).
```bash
npm run setup                 # root tools + apps/mobile dependencies
npx supabase start            # local Postgres/Auth/Storage/Functions; applies migrations + seed.sql
npm run dev:env               # writes supabase/functions/.env and apps/mobile/.env from the local stack
npm run seed:demo             # synthetic guardian + children "Rafi" and "Nusrat"
npm run content:render        # only if content/generated/pages is missing (needs the PDFs in content/sources/)
npm run content:upload        # page images -> private bucket textbook-pages
npm run functions:serve       # leave running in its own terminal
npm run smoke                 # 36 end-to-end checks against the running stack
npm run app                   # Expo dev server; scan the QR code with Expo Go (phone on the same Wi-Fi)
```
Demo sign-in (guardian): `demo-guardian@tutorfren.invalid` / `synthetic-demo-1234`. In the app: "I'm a guardian" →
sign in → open Rafi → "Use on this phone" → lock → pick Rafi on the "Who's using TutorFren?" screen.

Expo Go notes: the phone must reach your computer, so `dev:env` puts your LAN IP in `apps/mobile/.env`; re-run it if
your IP changes. Screenshot blocking and biometrics behave fully only in a development build (`npx expo run:android`
or `eas build --profile development`).

## With a Gemini key
Put `GEMINI_API_KEY_DEV=...` in `supabase/functions/.env` (free tier: **synthetic data only**), restart
`functions:serve`, then:
```bash
npm run content:ingest        # embeddings for the 182 curriculum chunks
npm run evals:safety          # prompt-injection / safety set
```
Without a key the tutor and explanation check return safe canned hints (`"degraded": true`). For a pilot with real
children set `APP_ENV=prod` and `GEMINI_API_KEY_PROD` (billing-enabled project) - see `docs/vendors/gemini.md`.

## Checks
```bash
npm run typecheck             # Deno (functions, scripts) + tsc (app)
npm run test                  # Deno unit tests + Jest
npm run lint
bash scripts/check-invariants.sh
npx supabase test db          # pgTAP
```

## How textbook lookup works
The book has no "Exercise 5.3" numbering. It has four icon-marked item types: **Let us do / নিজে করি** (chapter-end
set, questions 1..n), **Exercise / অনুশীলন** and **Task / কাজ** (inline; numbers restart in each sub-section) and
**Let us try / দেখি পারি কি না**. Printed page = PDF page − 7 in both language versions.

1. `parseReference()` in `supabase/functions/_shared/textbook/resolver.ts` reads the message with regular expressions
   (English, Bangla, Banglish, Bangla digits, typos): "ex 5 q3", "অনুশীলনী ৫ এর ৩ নং", "page 16 question 8".
2. Only if that finds nothing and the message has a number, `textbook-lookup` asks Gemini for a JSON reference, which
   `sanitize()` validates.
3. `resolve()` looks it up in `index.json`: "Exercise 5 question 3" → chapter 5 "Let us do" Q3 (printed p. 89); inside
   a lesson it prefers that chapter's inline Exercise 5; several matches → candidates shown as chips; nothing →
   nearest matches.
4. The function returns 10-minute signed URLs for the page in both languages; the app shows the page card (zoom,
   swipe, language toggle) and `tutor-turn` gives step-by-step hints for that question.

Rebuilding the index (only after changing its inputs): `python3 content/scripts/textbook/build_index.py &&
npm run sync:textbook && npm run content:seed`.
