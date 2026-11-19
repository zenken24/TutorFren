# TutorFren: What to Do Next (step-by-step)

> Status as of 17 Nov 2026: backend + app are built and pass their checks locally (61 function tests, 22 database tests, 36 end-to-end smoke checks, invariants). The app has **never been opened on a phone** and the AI has **never been run with a real Gemini key**. Nothing is committed yet.

Work through the parts in order. Each step says **what you do**, **how**, and **how you know it worked**.

| Part | Goal | Who | Time |
|---|---|---|---|
| A | Save the work (git) | anyone | 10 min |
| B | Run everything on your laptop | Zenia/Ayaan | 30 min |
| C | Open the app on an Android phone | Zenia | 30–60 min |
| D | Turn on the real AI (Gemini) | Ayaan | 30 min |
| E | Finish the remaining build items | with Claude Code | 1–3 days |
| F | Content work only humans can do | Ayaan + a teacher | ongoing |
| G | Put it online + build an APK (for demo/pilot) | Zenia | half a day |
| H | Demo preparation | Saadnan | half a day |
| I | Before real children use it (pilot gate) | whole team | — |

---

## Part A: Save the work in git (do this first)

Nothing has been committed yet. A disk problem or a bad command could wipe days of work.

```bash
cd /Users/zen/projects/TutorFren
git status                         # look at the list
git check-ignore content/sources content/generated supabase/functions/.env apps/mobile/.env
```
**Check:** the second command prints all four paths, so they're ignored. These must **never** be committed: the textbook PDFs, the page images, and your keys.

```bash
git switch -c feat/mvp
git add -A
git status                         # make sure no .env, .pdf or .webp files are staged
git commit -m "MVP: backend, mobile app, textbook index and lookup"
```
Then push to a **private** GitHub repo. The textbook-derived data in `content/textbook/` shouldn't be public until NCTB permission is confirmed.

**Worked if:** `git log` shows the commit, and GitHub Actions (CI) starts. If CI fails, see Part E, step E8.

---

## Part B: Run everything on your laptop

**Prerequisites (one time):**
- Docker Desktop installed and **open**
- Node 20+ (`node -v`), Deno 2 (`deno --version`)
- `brew install webp poppler` (only needed to re-render pages)

```bash
cd /Users/zen/projects/TutorFren
npm run setup            # installs dependencies (root + app)
npx supabase start       # local database, auth, storage (first run downloads images, takes a few minutes)
npm run dev:env          # writes supabase/functions/.env and apps/mobile/.env for the local stack
npm run seed:demo        # creates the SYNTHETIC demo guardian + Rafi + Nusrat
npm run content:upload   # uploads the textbook page images into the private bucket
```

Open a **second terminal** and leave it running:
```bash
cd /Users/zen/projects/TutorFren
npm run functions:serve
```

Back in the first terminal:
```bash
npm run smoke            # expect: 36 passed, 0 failed
npm run test:functions   # expect: 61 passed
npm run db:test          # expect: 22 tests, PASS
npm run check:invariants # expect: All invariants hold.
```

**Worked if** all four match. To open the local dashboard (tables, storage, logs), run `npx supabase status` and open the **Studio URL** it prints.

**To stop:** `Ctrl+C` in the functions terminal, then `npx supabase stop`.

---

## Part C: Open the app on an Android phone

1. On the phone, install **Expo Go** from the Play Store.
2. Phone and laptop must be on the **same Wi-Fi**. `npm run dev:env` already wrote your laptop's network IP into `apps/mobile/.env`. If you change networks, run it again.
3. With Part B running (stack + `functions:serve`):
   ```bash
   npm run app
   ```
4. Scan the QR code with Expo Go.

**Walk through this script and write down every problem** (screenshot + what you tapped):

| # | Do this | Expect |
|---|---|---|
| 1 | "I'm a guardian" → sign in `demo-guardian@tutorfren.invalid` / `synthetic-demo-1234` | Children list with Rafi and Nusrat |
| 2 | Open Rafi → "Use on this phone" → set up the lock | Fingerprint/PIN prompt works |
| 3 | Lock → "Who's using TutorFren?" → Rafi | Student Home (Today) opens in Bangla |
| 4 | Switch the language toggle | Everything changes to English immediately |
| 5 | Chapters → Chapter 1 → a lesson | Learn → Try → Teach back → Practice → Check |
| 6 | Ask → type `Exercise 5 Ques 3 can't do it` | Textbook page card (printed p. 89) with zoom, then hints |
| 7 | Ask → type `অনুশীলনী ৫ প্রশ্ন ৩` | Same page, Bangla book |
| 8 | Ask → `exercise 8 question 3` | Shows choices (three sets in chapter 8) |
| 9 | Tap the Guardian tile | Asks for fingerprint/PIN; does **not** open without it |
| 10 | In guardian mode wait 2 min, or switch apps and come back | Locks again |
| 11 | Switch user to Nusrat | None of Rafi's data is visible |
| 12 | Guardian → Rafi → change a consent toggle | Asks for your password again |
| 13 | Guardian → Rafi → Progress | Summary only: no chat or transcripts |
| 14 | Exams → plan an exam | Workbook + day-by-day plan |

**Without a Gemini key** (before Part D), tutor replies are simple fallback hints. That's expected.

**If something breaks**, open Claude Code in the repo and paste:
```text
Read CLAUDE.md. I ran the app on a real Android phone with Expo Go. Problems:
1. <screen> — <what I did> — <what happened> (screenshot attached)
2. ...
Fix them one by one. Keep all invariants, tests and typecheck green
(npm run test:functions, npm run check:invariants, apps/mobile: tsc + jest + lint).
```

> **Voice tip:** the mic needs microphone permission in Expo Go. Allow it when asked. Voice only shows if the guardian turned on "Voice input" consent.

---

## Part D: Turn on the real AI (Gemini)

1. Go to **aistudio.google.com** → **Get API key** → create a key.
2. Check the current model names at **ai.google.dev → Models**. Pick the current **Flash** model and the current **embedding** model.
3. Edit `supabase/functions/.env` (never the app's `.env`):
   ```
   APP_ENV=dev
   GEMINI_API_KEY_DEV=<your key>
   GEMINI_MODEL=<current Flash model id>
   GEMINI_EMBED_MODEL=<current embedding model id>
   ```
4. Restart `npm run functions:serve` (Ctrl+C, run again).
5. Load the curriculum into the search index:
   ```bash
   npm run content:ingest
   ```
6. Run the safety evals:
   ```bash
   npm run evals:safety
   ```
7. Repeat steps 6–8 of the phone script in Part C. The replies should now be real, step-by-step hints.

> ⚠️ **Free key = synthetic data only.** Google may use free-tier data to improve its products. Only the demo children (Rafi/Nusrat) may be used with this key. Real children require Part I.

**If `llm.ts` errors** (the Gemini SDK changes often), paste into Claude Code:
```text
Read CLAUDE.md. supabase/functions/_shared/llm.ts fails with: <paste error>.
Check the CURRENT @google/genai documentation (do not guess), fix llm.ts only,
keep store:false and strict safety settings, and re-run npm run test:functions and npm run smoke.
```

---

## Part E: Finish the remaining build items (with Claude Code)

Use Claude Code in this repo (Opus is fine; the Fable weekly limit resets 23 Nov). **One item per session.** Start each session with plan mode (`Shift+Tab`) and paste the prompt. After each one, run the **check block**:

```bash
npm run test:functions && npm run check:invariants && npm run typecheck \
 && (cd apps/mobile && npm test && npm run lint)
```
Commit after each item that passes.

### E1. Practice questions for all chapters (most important for the demo)
Right now only chapters 1 and 5 have practice items.
```text
Read CLAUDE.md and docs/BUILD_PROGRESS.md. Practice items exist only for chapters 1 and 5.
Generate practice items for chapters 2–4 and 6–10 using content/scripts/build-seed.mjs and
content/textbook/index.json: base them on the book's own exercises for each lesson, tag concept,
difficulty (1–3), language (bn+en), and source page. Do not invent textbook facts. Use only
questions whose text is verified OR that you can derive safely (e.g. same pattern, new numbers).
Regenerate supabase/seed.sql, run npm run db:reset and npm run smoke.
```
**Done when:** every lesson in the Chapters tab has Practice questions.

### E2. Draft rubrics for every concept
```text
Read CLAUDE.md. content/rubrics/ has 8 rubric YAMLs. Create draft rubrics (status: draft,
reviewed_by: null) for every concept in the seed that has a lesson, same format, bn + en:
key_ideas, common_misconceptions, accepted_simple_phrasings, follow_up_questions.
Run npm run content:rubrics and the tests.
```
**Done when:** `ls content/rubrics | wc -l` roughly equals the number of concepts (≈70). A teacher reviews them later (Part F).

### E3. Transcript-retention job
```text
Read CLAUDE.md. Add a migration: app_settings table (key/value, admin-only via RLS) with
transcript_retention_days default 180, and a nightly pg_cron job deleting explanations.text
older than that (keep the verdict, null the text). Add a pgTAP test. Run npm run db:reset && npm run db:test.
```

### E4. Crash reporting (Sentry)
```text
Read CLAUDE.md. Install @sentry/react-native in apps/mobile (check current Expo SDK 58 setup docs).
DSN from EXPO_PUBLIC_SENTRY_DSN; if empty, Sentry must not initialise. sendDefaultPii false,
beforeSend = the existing tested scrubber, no breadcrumbs on voice/tutor/teach-back screens.
Add the env var to apps/mobile/.env.example. Run app tsc, jest, lint, and expo export.
```

### E5. Search-quality check (retrieval eval)
```text
Read CLAUDE.md. Write evals/run-retrieval.ts: for each query in evals/retrieval.jsonl, call
match_chunks and report recall@3 and recall@5, overall and per language. Needs the Gemini key
(embeddings) — exit with a clear message if absent. Add npm script evals:retrieval.
```
**Done when:** `npm run evals:retrieval` prints numbers. **Goal:** recall@5 ≥ 0.8. If lower, ask Claude to improve the chunk text or metadata filters.

### E6. Automated phone tests (Maestro)
```text
Read CLAUDE.md. Write Maestro flows in apps/mobile/.maestro/ for: (1) guardian sign-in →
shared phone → lock; (2) guardian tile requires unlock and re-locks; (3) switch Rafi → Nusrat
shows no Rafi data; (4) Ask → "Exercise 5 Ques 3 can't do it" shows the page card for printed
p. 89. Add testIDs to components where needed. Document how to run them in README.
```
To run them: install Maestro (`curl -fsSL "https://get.maestro.mobile.dev" | bash`), connect the phone with USB debugging or start an Android emulator, then run `maestro test apps/mobile/.maestro`.

### E7. Speech-to-text comparison (decides the voice provider)
```text
Read CLAUDE.md and docs/TUTORFREN_BUILD_WORKFLOW.md Phase 5 Part A. Build evals/stt/:
a script that takes recordings from evals/stt/audio/ (gitignored) plus reference transcripts,
runs them through Gemini audio (via llm.ts) and Google Cloud Speech-to-Text (optional, if key
present), and reports word error rate for bn and en plus latency. No audio may be committed.
Fill docs/vendors/stt-decision.md with the comparison table template.
```
Then **record 20–30 short sentences yourselves** (adults, Bangla + English, like "ভগ্নাংশ মানে একটা জিনিসকে সমান ভাগ করা"). Only add child recordings with guardian consent, kept on an encrypted drive outside the repo.

### E8. CI and lint
```text
Read CLAUDE.md. Make .github/workflows/ci.yml pass on GitHub: run each step locally,
fix failures, fix the 3 ESLint warnings. Don't weaken any check.
```
**Done when:** the GitHub Actions run is green ✅.

### E9. Check question text against the book (do in small batches)
This is the task that used up the Fable limit. Do **one chapter per session**:
```text
Read CLAUDE.md. Verify the question text for chapter <N> "Let us do" in
content/textbook/index.json against the page images in content/generated/pages/en/ (and bn/).
Look at only the pages for that set. Fix garbled fractions/vertical sums, set verified:true
for each checked question, rebuild with python3 content/scripts/textbook/build_index.py,
run npm run sync:textbook and npm run test:functions.
```
Or a teammate can type them from the printed book into a spreadsheet, which costs no tokens, and Claude imports it.

---

## Part F: Content work only humans can do

| Task | Who | How |
|---|---|---|
| Review rubrics | A maths teacher | Open each `content/rubrics/*.yaml`; check key ideas and misconceptions; set `reviewed_by` |
| Check AI explanation judgements | Teacher + Ayaan | Run the explanation eval (with the key); teacher marks 40+ cases right/wrong; target ≥ 85% agreement |
| Bangla UI wording | A native speaker (ideally a teacher) | Read `apps/mobile/src/i18n/bn.json`; make it simple, natural, and right for a 10-year-old |
| Privacy notice + consent text | Team (+ advisor if possible) | Edit `docs/privacy-*.md`, `docs/consent-v1.*.md`; keep Bangla and English in sync |
| NCTB permission | Saadnan | Confirm that showing textbook pages inside the app is allowed; keep the written answer |
| Design polish | Zenia | Generate screens in Stitch (prompts from earlier) → ask Claude to restyle components to match, without changing logic |

---

## Part G: Put it online and build an installable APK

### G1. Hosted Supabase project
1. supabase.com → **New project** → region **Singapore** → strong DB password (save it in a password manager).
2. Link and push:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push                     # creates tables, access rules, bucket, cron jobs
   npx supabase functions deploy            # deploys all 14 functions
   ```
3. Load the content (curriculum, concepts, items): run `supabase/seed.sql` in the dashboard **SQL editor**, or check whether your CLI supports `db push --include-seed`.
4. In the dashboard:
   - **Authentication → Hooks:** enable the custom access token hook (the function from the migrations).
   - **Authentication → Providers/Settings:** require email confirmation, password minimum 10, leaked-password protection (paid plan), CAPTCHA (Turnstile/hCaptcha).
   - **Database → Extensions:** check `pg_cron` and `vector` are on.
   - **Project settings → Team:** at most 2 admins, all with MFA.
5. Secrets for the functions. Create `supabase/functions/.env.prod` (it's gitignored; check with `git check-ignore`):
   ```
   APP_ENV=dev            # keep "dev" until the pilot gate in Part I
   GEMINI_API_KEY_DEV=...
   GEMINI_MODEL=...
   GEMINI_EMBED_MODEL=...
   ```
   ```bash
   npx supabase secrets set --env-file supabase/functions/.env.prod
   ```
6. Upload pages + ingest against the hosted project: point `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in `supabase/functions/.env` at the hosted project temporarily, run `npm run content:upload` and `npm run content:ingest`, then switch back.
7. Seed the demo family on hosted: `npm run seed:demo` with the same temporary env.

### G2. Build an APK with EAS
```bash
npm i -g eas-cli
cd apps/mobile
eas login
eas build:configure
```
In `eas.json`, add a `preview` profile with `"android": { "buildType": "apk" }`. Set the public env vars for the build (hosted URL + anon key **only**):
```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment preview
eas build -p android --profile preview
```
Download the APK from the link and install it on the demo phone.

**Security check before sharing the APK:**
```bash
unzip -o app.apk -d /tmp/apk && grep -r -l -E "service_role|GEMINI|AIza" /tmp/apk ; echo "exit=$?"
```
**Must print nothing** (exit=1). If anything shows up, stop and fix it before sharing.

---

## Part H: Demo preparation (from the proposal §12)

- [ ] The demo phone has the APK and runs on the hosted project, using the **synthetic** Rafi profile.
- [ ] Reset path: `npm run seed:demo` against hosted resets Rafi before each run-through.
- [ ] Rehearse the 3-minute story: wrong answer → gap detected → textbook page → hint → mastery check → language switch.
- [ ] Show "Exercise 5 Ques 3 can't do it" → exact page. It's the most memorable moment.
- [ ] Show the guardian lock on the shared phone (20 sec security story).
- [ ] Test voice **in the room**, with typing as the fallback.
- [ ] Backup screen recording (say so if you use it).
- [ ] No invented results. If there's no pilot data yet, show the evaluation plan and label it clearly.

---

## Part I: Before ANY real child uses it (pilot gate)

Do **not** skip any of these:

- [ ] Gemini **billing-enabled** project created → `GEMINI_API_KEY_PROD` set in hosted secrets → `APP_ENV=prod`. No "data sharing discount" turned on. Budget alerts at $10 / $25.
- [ ] Re-check the current Gemini terms and the paid-tier log retention; save them in `docs/vendors/gemini.md`.
- [ ] Speech-to-text provider chosen (E7) and its terms saved in `docs/vendors/`.
- [ ] Supabase on a paid plan (backups, leaked-password protection); MFA for admins.
- [ ] Rubrics teacher-reviewed (F). Explanation-judgement agreement ≥ the team's target.
- [ ] Privacy notice + consent (bn/en) final. Guardian consent + child assent tested with a real parent.
- [ ] Shared-phone flow tested with a real parent on a low-end Android.
- [ ] All checks green in CI; Maestro flows pass on a real device.
- [ ] APK secret-scan clean (G2).
- [ ] Incident plan written: who to call, how to rotate keys, how to tell guardians.
- [ ] NCTB permission for showing pages confirmed.

---

## Quick reference

| I want to… | Command |
|---|---|
| Start everything locally | `npx supabase start` → `npm run functions:serve` (2nd terminal) → `npm run app` |
| Reset the local DB + seed | `npm run db:reset && npm run seed:demo` |
| Run all checks | `npm run test:functions && npm run db:test && npm run smoke && npm run check:invariants` |
| Rebuild the textbook index | `python3 content/scripts/textbook/build_index.py && npm run sync:textbook` |
| Re-render page images | `npm run content:render` |
| See function logs | the terminal running `functions:serve` (should never show children's text) |
| Stop everything | Ctrl+C on functions → `npx supabase stop` |

Background docs: `docs/TUTORFREN_BUILD_WORKFLOW.md` (security design), `docs/TECH_STACK.md`, `docs/DECISIONS.md` (choices that differ from the plan), `docs/BUILD_PROGRESS.md` (what's done).

---

## Google sign-in ("Continue with Google")

1. Google Cloud Console → APIs & Services → **Credentials** → Create credentials → **OAuth client ID** → type **Web application**.
   - Authorised redirect URI (local): `http://127.0.0.1:54321/auth/v1/callback`
   - Hosted Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Local: in `supabase/config.toml` set `enabled = true` under `[auth.external.google]`, then:
   ```bash
   export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   npx supabase stop && npx supabase start
   ```
   Hosted: Dashboard → Authentication → Providers → Google → paste the client ID and secret.
3. In `apps/mobile/.env` set `EXPO_PUBLIC_GOOGLE_AUTH=1` and restart Expo with `-c`.
   Until then the button shows "Google sign-in isn't set up yet".
