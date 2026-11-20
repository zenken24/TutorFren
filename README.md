# TutorFren

**A bilingual (Bangla / English) adaptive maths tutor for Grade 5 children in Bangladesh, built on the NCTB Class 5 Elementary Mathematics textbook (academic year 2026).**

Team Future Frame · AI Builders Congress 2026 · LearnSphere AI / AI Teacher track

> All demo data in this repository is **synthetic** (guardian `demo-guardian@tutorfren.invalid`, children "Rafi" and "Nusrat"). No real child data is stored here.

---

## Contents

1. [The problem and our answer](#1-the-problem-and-our-answer)
2. [What the app does](#2-what-the-app-does)
3. [How it works (architecture)](#3-how-it-works-architecture)
4. [Security and child safety](#4-security-and-child-safety)
5. [The AI layer](#5-the-ai-layer)
6. [Run it](#6-run-it)
7. [Quality: tests and checks](#7-quality-tests-and-checks)
8. [Where we are now](#8-where-we-are-now)
9. [Plan: from here to the demo and the pilot](#9-plan-from-here-to-the-demo-and-the-pilot)
10. [Pilot and how we measure learning](#10-pilot-and-how-we-measure-learning)
11. [Team and ownership](#11-team-and-ownership)
12. [Risks](#12-risks)
13. [Repository map and further docs](#13-repository-map-and-further-docs)

---

## 1. The problem and our answer

Many Bangladeshi children move up a grade without mastering earlier concepts. A one-size-fits-all lesson rarely finds and fixes each child's exact gap.

**TutorFren** finds what a child does not yet understand, teaches it step by step at the right level, and checks that the gap has closed. Everything is tied to the child's own textbook, down to the exact page and question. It is a **learning aid next to the teacher, not a replacement**, and **not a general chatbot**.

| | |
|---|---|
| **Users** | Grade 5 students (primary), guardians (consent and progress), teachers (later) |
| **Curriculum** | NCTB Class 5 Elementary Mathematics, 2026: 10 chapters, 70 lessons, 486 indexed questions |
| **Languages** | Bangla and English, switchable at any time. Bangla means Bangla throughout, English means English throughout |
| **Platform** | Android first (Expo / React Native) |
| **Success measure** | Change in score between equivalent pre- and post-tests (see §10) |

---

## 2. What the app does

### First run and accounts
- **First screen:** Log in or Create account (guardian), plus "Student? Start with a pairing code" for a child's own phone.
- **Guardian accounts:** email + password (show/hide, entered twice at sign-up) or **Continue with Google** (needs Google credentials, §6.4).
- **Children never get a password.** A guardian adds a child and answers one required question: *"Which phone will {name} use?"*
  - **This phone (shared):** the guardian's phone is set up for the child directly.
  - **Their own phone:** the guardian gets a one-time 6-digit pairing code (10 minutes, single use) to type on the child's phone.
- **"Who's using TutorFren?"** appears after login: one tile per child set up on this phone (only the signed-in guardian's children), plus a locked **Guardian** tile.

### Student mode (5 tabs)
| Tab | What it does |
|---|---|
| **Today** | The single adaptive "next step" with a one-line reason, continue-lesson card, exam countdown, weekly progress ring |
| **Chapters** | All 10 chapters with mastery bars → chapter → lessons (status badges, "Recommended next") and the book's exercises |
| **Ask** | Curriculum-only tutor chat with voice input. Typing *"Exercise 5 Ques 3 can't do it"* opens **that exact textbook page** (zoom, swipe, Bangla/English book), then gives hints, never the final answer |
| **Exams** | Exam planner: exam name, date, marks, chapters, question pattern → a workbook weighted to weak topics + a day-by-day routine |
| **Me** | Strengths, topics to practise, mastery by chapter, language, switch user |

### A lesson (4 steps)
1. **Learn:** the idea one small step at a time (Back / Next), each with a simple picture: dot counters (e.g. adding: two groups of dots → put together → count), equations, fraction bars, vertical sums. Then **2 worked examples**, each step by step.
2. **Try an easy one:** a single easy problem, with hints.
3. **Practice:** 3 adaptive problems. *Required.*
4. **Mastery check:** 1 harder new problem. *Required.* A lesson is complete only after steps 3 and 4.

Lesson content is generated **once per lesson and language** from that lesson's textbook pages, saved, and reused instantly afterwards. Generating it also creates the lesson's practice problems.

### Guardian mode (locked)
- **Opening it:** fingerprint / screen lock or a 6-digit PIN. Auto-locks after 2 minutes idle, when the app goes to the background, or when a child is picked. Screens are hidden from screenshots.
- **Dashboard:** "Welcome, guardian", child picker, **activity heatmap** (12 weeks, day level), **pie chart** (mastered / in progress / not started), **bar chart by chapter**, topics needing practice. **Summary only**: never chat text, answers or voice.
- **Sidebar:** Dashboard · Children · Devices · Consent · Settings · Change password · Delete account · Lock · Sign out.
  - **Devices:** each phone's status (paired shared phone / paired own phone / waiting for a code / removed), pairing codes, revoke.
  - **Consent:** per child: Learning (required), Voice input, Guardian progress view, Pilot research, each with what it does, what is stored, and what happens when it's off.
  - **Delete account:** a child's account, or the guardian account (which also deletes the children they are main guardian for). Type DELETE to confirm.
- **Re-check for risky actions:** changing consent, deleting, exporting and new pairing codes need a sign-in within the last 5 minutes, verified by the server.

---

## 3. How it works (architecture)

```
 PHONE (Expo / React Native, TypeScript)          SUPABASE (Postgres + Auth + Storage + Edge Functions)        GOOGLE
 ─────────────────────────────────────────         ────────────────────────────────────────────────────         ──────
 Student tabs · Guardian mode · Lesson flow  ──▶   Auth (guardians; children via pairing / shared enrolment)
 SecureStore (login tokens only)             HTTPS Postgres + pgvector + Row-Level Security on every table
 Voice: record → upload → delete                   15 Edge Functions (Deno/TS) ── _shared/llm.ts ─────────────▶  Gemini API
                                                   Private bucket: textbook page images (signed URLs)              (text, JSON, audio,
                                                   pg_cron: retention / cleanup jobs                               embeddings)
```

| Layer | Choice |
|---|---|
| App | Expo SDK 58, expo-router, NativeWind, TanStack Query, zod, i18next (Noto Sans Bengali), expo-secure-store, expo-audio, expo-local-authentication, expo-screen-capture, expo-web-browser |
| Backend | Supabase: Postgres, pgvector, Row-Level Security, Auth, Storage, Edge Functions (Deno), pg_cron |
| AI | Google Gemini via `@google/genai`, only through `supabase/functions/_shared/llm.ts`. Model **`gemini-3.1-flash-lite`** (fast; text, structured JSON, audio). Embeddings `gemini-embedding-001` at 768 dimensions |
| Content | Textbook index built from the two NCTB PDFs (`content/textbook/index.json`), page images (WebP), curriculum chunks, rubrics |

**Edge Functions:** `student-create`, `consent`, `pairing-create`, `pairing-redeem`, `shared-device-enroll`, `device-revoke`, `transcribe`, `tutor-turn` (next / answer / ask), `lesson-content`, `explanation-check`, `exam-planner`, `textbook-lookup`, `guardian-summary`, `account-export`, `account-delete`.

**Design system:** colour tokens live in `apps/mobile/tailwind.config.js`:

| Colour | Role |
|---|---|
| Blue sapphire `#035B7B` | Brand, buttons |
| Metallic seaweed `#167B7B` | Mastered |
| Chrome yellow `#FFAA00` | Needs practice |
| Metallic yellow `#FFDD15` | Highlights |
| Sky blue `#62EAF9` | Information |
| Vivid lime `#B0D80B` | Progress, correct |

Red is used only for deleting. The UI uses line icons (no emoji), and `src/components/AppText.tsx` renders Bangla correctly on Android.

---

## 4. Security and child safety

Full design: `docs/TUTORFREN_BUILD_WORKFLOW.md` §4. Rules every contributor (and coding agent) must follow: `CLAUDE.md`.

| Promise | How it is enforced |
|---|---|
| Children's voices are never stored | Audio exists only in the function's memory during transcription (`store:false`). The phone deletes its file in `finally` and sweeps leftovers at start-up. No audio column or bucket exists (CI check) |
| One child can never see another's data | Row-Level Security on every table, deny by default. pgTAP tests prove it |
| Guardians see a summary, not surveillance | No direct guardian access to learning tables, only `guardian_summary()`: aggregates, day-level activity, no text |
| Practice answers stay secret | `items.answer` is not readable by any app user. Answers are checked only inside `tutor-turn` (tested) |
| Kids can't get into guardian mode on a shared phone | Biometric/PIN lock, auto-lock, server-side step-up re-auth for risky actions, separate login per person |
| No secrets in the app | Only the public anon key is in the app. Service and Gemini keys exist only in function secrets (CI + invariant script) |
| No personal data to the AI | Pseudonymous learner reference. Phone numbers and emails are redacted from child text. The model has no tools and no database access |
| Minimal data | Nickname, class, language, answers, progress. No full names, addresses, photos, location |
| Deletion and export | Guardian can export a child's data or delete the child or the guardian account |

**Gemini free tier = synthetic data only** (Google may use free-tier data to improve its products). Real children require a billing-enabled key (`APP_ENV=prod`, `GEMINI_API_KEY_PROD`).

---

## 5. The AI layer

| Job | Where | Behaviour |
|---|---|---|
| Tutor chat | `tutor-turn` (ask) | Curriculum-grounded. **Never states the final answer**: gives the first step and asks the child to do it. At most 3 plain sentences. Says "not sure, ask your teacher" when the book doesn't cover it |
| Textbook lookup | `textbook-lookup` | Deterministic parser first ("ex 5 q3", "অনুশীলনী ৫ এর ৩ নং", Bangla digits, Banglish). Gemini only as a fallback |
| Step-by-step lessons | `lesson-content` | Generated once per lesson and language from that lesson's pages, cached in `lesson_content`. Also adds practice problems |
| Voice | `transcribe` | Gemini audio → text, about 2 s. The child sees and can edit the text before sending |
| Exam planner | `exam-planner` | Workbook weighted to weak topics + routine before the exam date |

**Language guard (`_shared/language.ts`):** the output language is the last instruction to the model, and every lesson and chat reply is **checked**. English must contain no Bangla script, and Bangla must contain no English letters (Bangla digits too). Wrong output is regenerated once and never saved.

**Quotas:** free-tier Gemini limits are very small. `gemini-2.5-flash` allowed only 20 requests per day, which is why the model is `gemini-3.1-flash-lite`. Quota errors fail fast with a safe fallback reply. **Enable billing before any real use**; the cost at pilot scale is a few dollars a month.

---

## 6. Run it

### 6.1 Prerequisites
- Node 22+, Docker Desktop **running**, Android phone with **Expo Go**.
- Re-rendering textbook pages only: `brew install poppler webp`.

### 6.2 Backend (Terminal 1, project root)
```bash
cd /path/to/TutorFren
npm run setup                 # dependencies (first time)
npx supabase start            # local Postgres/Auth/Storage; applies migrations + seed
npm run dev:env               # writes supabase/functions/.env and apps/mobile/.env
npm run seed:demo             # synthetic guardian + Rafi + Nusrat
npm run content:upload        # textbook page images -> private bucket (first time)
npm run functions:serve       # keep this terminal open. Run ONLY ONE of these at a time
```
Then add your Gemini key to `supabase/functions/.env` (§6.5) and restart `functions:serve`.

### 6.3 App (Terminal 2)
**Phone on the same Wi-Fi (or the Mac on the phone's hotspot):**
```bash
cd apps/mobile && npx expo start
```
Scan the QR code with Expo Go.

**USB cable (no network needed):** turn on USB debugging, accept the "Allow USB debugging" prompt, then:
```bash
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:54321 tcp:54321
npm run dev:env               # detects adb reverse and uses 127.0.0.1
cd apps/mobile && npx expo start --localhost -c
```
In Expo Go: *Enter URL manually* → `exp://127.0.0.1:8081`.

**Demo:** Log in with `demo-guardian@tutorfren.invalid` / `synthetic-demo-1234` → "Who's using TutorFren?" → Guardian → open Rafi's learning.

### 6.4 Google sign-in (optional)
1. Create an OAuth client (Web application) with redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
2. In `supabase/config.toml`, set `enabled = true` under `[auth.external.google]`.
3. Export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then restart Supabase.
4. Set `EXPO_PUBLIC_GOOGLE_AUTH=1` in `apps/mobile/.env`.

Details: `docs/NEXT_STEPS.md`.

### 6.5 Environment
`supabase/functions/.env` (server only, never in the app, gitignored):
```
APP_ENV=dev
GEMINI_API_KEY_DEV=...            # free tier: synthetic data only
GEMINI_API_KEY_PROD=              # billing-enabled key for real children
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_THINKING=low
GEMINI_EMBED_MODEL=gemini-embedding-001
```
`apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_AUTH`. Public values only.

### 6.6 Troubleshooting
| Symptom | Fix |
|---|---|
| App spins forever on login | Wrong backend address. Over USB, `apps/mobile/.env` must say `http://127.0.0.1:54321`; then `npx expo start --localhost -c` |
| "Edge Runtime container is no longer available" | Two `functions:serve` were running. `pkill -f "functions serve"`, `docker rm -f supabase_edge_runtime_TutorFren`, start one again |
| `Missing script: functions:serve` | Run it from the project root, not `apps/mobile` |
| `Env name cannot start with SUPABASE_` | Harmless. Supabase supplies those values to functions itself |
| Tutor replies are generic / "not sure" quickly | Gemini quota used up for the day, or no key. Check the `functions:serve` terminal |
| `adb devices` shows `unauthorized` | Unlock the phone and accept the USB debugging prompt (Developer options → Revoke authorisations, then reconnect) |

---

## 7. Quality: tests and checks

| Check | Command | Current result |
|---|---|---|
| Function unit tests (lookup resolver, redaction, mastery, planner, language guard) | `npm run test:functions` | **63 / 63** |
| Database access tests (pgTAP) | `npx supabase test db` | **27 / 27** |
| End-to-end against the running stack | `npm run smoke` | **36 / 36** |
| App tests (client separation, i18n completeness, scrubber, voice deletion) | `npm run test:mobile` | **13 / 13** |
| Typecheck | `npm run typecheck` | clean |
| Lint | `npm run lint` | 0 errors |
| Security invariants (RLS everywhere, no audio storage, no keys in app, Gemini only via `llm.ts`) | `bash scripts/check-invariants.sh` | pass |
| Android bundle | `cd apps/mobile && npx expo export --platform android` | builds |
| AI evals | `npm run evals:safety`, `evals/*.jsonl` | sets exist; run with a key |

---

## 8. Where we are now

**Done**
- Textbook index for both books (chapters, lessons, all exercise types, 486 questions mapped to pages), page images, exact-page lookup in Bangla/English/Banglish.
- Full backend: 7 migrations, 15 Edge Functions, RLS, consent, pairing, shared-phone mode, deletion and export.
- Student app: Today, Chapters, 4-step lessons with step-by-step pictures, Ask with page cards and voice, Exams, Me.
- Guardian app: dashboard with charts and heatmap, sidebar, devices, consent, settings, change password, delete account.
- Bilingual throughout, with an enforced language guard; colour palette; Bangla rendering fix.
- Live Gemini integration verified (chat, lesson generation, rubric checks, voice, embeddings).

**Known gaps**
- Question text is mostly machine-read (31 of 486 hand-checked). Page mapping is reliable, but hints are only as good as the text.
- Rubrics: 8 drafts, not teacher-reviewed. Teach-back was removed from lessons; `explanation-check` remains available.
- Never tested on more than one phone. No Maestro end-to-end tests yet. CI workflow written but not run on GitHub.
- Google sign-in needs credentials. CAPTCHA, email confirmation, leaked-password protection and MFA are to be enabled in the hosted project.
- Free Gemini quota is too small for real use. Speech-to-text not yet benchmarked on children's voices.
- Bangla wording not yet reviewed by a native-speaking teacher. NCTB permission to show pages in-app not yet confirmed.

---

## 9. Plan: from here to the demo and the pilot

### Phase A: Stabilise (now → 1 week)
| # | Task | Owner | Done when |
|---|---|---|---|
| A1 | Commit to a private repo on a branch; turn on CI | Saadnan | CI green on GitHub |
| A2 | Full phone walkthrough (all tabs, lessons, guardian, both languages); fix what breaks | Zenia | No blocking bug in `docs/NEXT_STEPS.md` Part C script |
| A3 | Enable Gemini billing on a separate project (`GEMINI_API_KEY_PROD`) + budget alerts | Ayaan | Chat/lesson/voice work all day without quota errors |
| A4 | Pre-generate lesson content for all 70 lessons × 2 languages (and their practice problems) | Ayaan | Every lesson opens instantly |
| A5 | Hand-check "Let us do" question text, one chapter per session | Ayaan + volunteer | `verified: true` for all chapter-end questions |

### Phase B: Content quality (weeks 2–3)
| # | Task | Owner | Done when |
|---|---|---|---|
| B1 | Teacher reviews generated lessons and practice problems (sample per chapter) | Ayaan + teacher | Review log; fixes applied |
| B2 | Teacher reviews Bangla UI wording and lesson language | Teacher | Changes merged in `bn.json` |
| B3 | Retrieval eval (recall@5 ≥ 0.8) and safety eval pass | Ayaan | Numbers recorded in `evals/` |
| B4 | Speech-to-text test on 20–30 consented recordings (Bangla + English) | Zenia | Word error rate per language documented; provider confirmed |

### Phase C: Demo-ready (week 3–4)
| # | Task | Owner | Done when |
|---|---|---|---|
| C1 | Hosted Supabase (Singapore), migrations, functions, secrets, page upload | Zenia | App works away from the laptop |
| C2 | Android APK via EAS; APK scanned for secrets | Zenia | Installs on the demo phone; scan clean |
| C3 | Demo script: wrong answer → gap → textbook page → hint → mastery check → language switch → guardian dashboard | Saadnan | 3-minute run, rehearsed 3×, backup recording |
| C4 | Pitch: problem, solution, live demo, architecture, impact plan, business | Saadnan + Ayaan | Slides final; claims match the build |

### Phase D: Pilot-ready (before any real child)
- Billing-enabled Gemini key with `APP_ENV=prod`. Supabase paid plan (backups). MFA for admins.
- CAPTCHA, email confirmation, leaked-password protection, Google sign-in configured.
- Final Bangla + English privacy notice and consent text. Consent and child assent tested with real parents.
- NCTB permission for showing pages confirmed in writing.
- Incident plan: who to contact, how to rotate keys, how to inform guardians.
- Full checklist: `docs/NEXT_STEPS.md` Part I.

### Phase E: After the pilot (roadmap)
Teacher/class dashboard → more grades and subjects → offline content packs → spoken replies → country-specific curriculum packs (the textbook index and content pipeline are curriculum-independent).

---

## 10. Pilot and how we measure learning

- **Cohort:** 20–30 volunteer Grade 5 learners, with guardian consent and child assent.
- **Design:** baseline test → a fixed number of TutorFren sessions → equivalent (not identical) post-test. A comparison group or staggered start if feasible.
- **Primary metric:** score change between pre- and post-test.
- **Secondary metrics:** concept mastery gains, hint dependence (questions solved with 0 / 1 / 2+ hints), time to mastery, retention after 7 days, completion rate, language and voice use.
- **Integrity:** mastery threshold and analysis defined before looking at results. Report participants, dropouts and full score distributions. Never present simulated results as real. Only children with the `pilot_research` consent are included, pseudonymised.

---

## 11. Team and ownership

| Role | Person | Owns |
|---|---|---|
| Team lead / coordinator, presentation | Saadnan | Scope, milestones, risk register, demo script, submission |
| Business analyst / data | Ayaan | Curriculum and content quality, rubrics, evals, pilot design and analysis, Gemini account |
| UI/UX and mobile | Zenia | App screens, design system, phone testing, builds and APK |
| Backend / data engineering | Zenia & Ayaan | Supabase, functions, security checks, content pipeline |

Working rules: every change starts by reading `CLAUDE.md`, one feature per branch, tests green before merge.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| AI gives a wrong or misleading explanation | Grounded in the child's textbook pages; hints, not answers; "ask your teacher" when unsure; teacher review of generated lessons |
| AI replies in the wrong language | Language guard: checked and regenerated, never saved when wrong |
| Free AI quota runs out mid-demo | Billing-enabled key before the demo; pre-generated lessons; fast fallback replies |
| Poor Bangla speech recognition for children | Typing always available; the child edits the transcript; STT benchmark before the pilot |
| Copyright of textbook pages | Private bucket, signed URLs; written NCTB permission before public release |
| Child data exposure | RLS + tests, no audio storage, summary-only guardian view, secrets outside the app |
| Demo phone or network failure | Hosted backend, APK on the phone, recorded backup (disclosed if used) |

---

## 13. Repository map and further docs

```
apps/mobile/                 Expo app
  src/app/                   screens: index (start / who's using), (auth), (student)/(tabs) + lesson + chapter, (guardian)
  src/components/            UI kit, charts, icons, LearnSteps + LessonVisual, PageCard, Practice, VoiceButton, GuardianGate
  src/lib/                   session (separate login per person), supabase client, textbook index, voice, lock
  src/i18n/                  bn.json / en.json (Bangla default)
supabase/
  migrations/                schema, RLS, functions, storage, retention, dashboard, devices, lesson content
  functions/                 15 Edge Functions + _shared (llm.ts, language.ts, http.ts, mastery, planner, textbook resolver)
  tests/rls_test.sql         pgTAP access tests
  seed/ · seed.sql           synthetic demo seed · curriculum seed
content/                     textbook index + scripts, rubrics, page renderer, ingest
evals/                       safety, explanation and retrieval sets + runner
scripts/                     check-invariants.sh, smoke.ts, dev-env.sh, sync-textbook-index.mjs
docs/                        plans, decisions, privacy and consent texts, vendor notes
```

| Doc | What's in it |
|---|---|
| `CLAUDE.md` | Non-negotiable security rules for anyone (or any agent) changing code |
| `docs/TUTORFREN_BUILD_WORKFLOW.md` | Security architecture, data model, phase-by-phase build prompts |
| `docs/TECH_STACK.md` | The full stack and why |
| `docs/NEXT_STEPS.md` | Step-by-step instructions: running, phone testing, Gemini, Google sign-in, deployment, APK, demo, pilot gate |
| `docs/DECISIONS.md` | Choices that differ from the original plan, and why |
| `docs/BUILD_PROGRESS.md` | Build log and textbook index coverage |
| `docs/privacy-*.md`, `docs/consent-v1.*.md` | Draft privacy notice and consent text (Bangla + English) |

**Textbook lookup in one paragraph:** the book has no "Exercise 5.3" numbering. It uses **Let us do / নিজে করি** (chapter-end sets), **Exercise / অনুশীলন** and **Task / কাজ** (inline, numbers restart per sub-section) and **Let us try / দেখি পারি কি না**. Printed page = PDF page − 7 in both books. `parseReference()` reads the message, `resolve()` maps it to a page ("Exercise 5 question 3" → chapter 5 "Let us do" Q3, printed p. 89, or the chapter's inline Exercise 5 inside a lesson; several matches become choices). The app then shows that page and the tutor hints. Rebuild the index with `python3 content/scripts/textbook/build_index.py && npm run sync:textbook && npm run content:seed`.
