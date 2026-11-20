# TutorFren

**A bilingual (Bangla / English) adaptive maths tutor for Grade 5 children in Bangladesh, built on the NCTB Class 5 Elementary Mathematics textbook (academic year 2026).**

Team Future Frame · AI Builders Congress 2026 · LearnSphere AI / AI Teacher track

TutorFren finds what a child doesn't yet understand, teaches it step by step at the right level, and checks that the gap has closed. Everything is tied to the child's own textbook, down to the exact page and question. It is a learning aid next to the teacher, not a general chatbot.

> All demo data is **synthetic**: guardian `demo-guardian@tutorfren.invalid`, children "Rafi" and "Nusrat".

---

## Contents
1. [Features](#1-features)
2. [Architecture](#2-architecture)
3. [Security and child safety](#3-security-and-child-safety)
4. [AI](#4-ai)
5. [Setup](#5-setup)
6. [Run](#6-run)
7. [Demo walkthrough](#7-demo-walkthrough)
8. [Tests and checks](#8-tests-and-checks)
9. [Troubleshooting](#9-troubleshooting)
10. [Project structure](#10-project-structure)

---

## 1. Features

### Accounts and first run
- **First screen:** **Log in** or **Create account** (separate pages) for guardians, plus *"Student? Start with a pairing code"* for a child's own phone.
- **Guardian sign-in:** email and password, with a show/hide button. At sign-up the password is entered twice and must be 10+ characters. **Continue with Google** is also available once Google credentials are configured (§5.5).
- **Children never get a password.** When adding a child, the guardian must answer: *"Which phone will {name} use?"*
  - **This phone (shared):** the guardian's own phone is set up for the child in one tap.
  - **Their own phone:** the guardian gets a one-time **6-digit pairing code** (valid 10 minutes, single use) to type on the child's phone.
- **"Who's using TutorFren?"** appears after login. It shows one tile per child set up on this phone (only the signed-in guardian's children), plus a locked **Guardian** tile. Several children can share one phone, each with an optional 4-digit PIN.

### Student mode: 5 tabs
| Tab | What it does |
|---|---|
| **Today** | The one adaptive "next step" with a one-line reason, a continue-lesson card, an exam countdown and a weekly progress ring |
| **Chapters** | All 10 chapters with mastery bars → each chapter's lessons (status badges, "Recommended next") and the book's own exercises |
| **Ask** | Curriculum-only tutor chat with voice input. Typing a book reference like *"Exercise 5 Ques 3 can't do it"* or *"অনুশীলনী ৫ প্রশ্ন ৩"* opens **that exact textbook page**: zoom, swipe to the next page, switch between the Bangla and English books. The tutor then gives the first step as a hint, never the final answer |
| **Exams** | Exam planner. Enter the exam name, date, marks, chapters and question pattern to get a workbook weighted to weak topics plus a day-by-day revision routine ending before the exam |
| **Me** | Strengths, topics to practise, mastery by chapter, language and voice settings, switch user |

### Lessons: 4 steps
1. **Learn:** the idea one small step at a time, with **Back / Next**. Each step has a simple picture:
   - dot counters (e.g. adding: two groups of dots → put them together → count them);
   - equations;
   - fraction bars;
   - vertical sums.

   Then **2 worked examples**, each shown step by step with the answer.
2. **Try an easy one:** a single easy problem, with hints.
3. **Practice:** 3 adaptive problems. *Required.*
4. **Mastery check:** one harder new problem. *Required.* The lesson is complete only after both Practice and the Mastery check.

Lesson content is generated **once per lesson and language** from that lesson's textbook pages, saved, and reused instantly after that. Generating it also creates the lesson's practice problems. Answers are checked on the server, with hints before the answer is revealed.

### Guardian mode (locked)
- **Unlock:** fingerprint / screen lock or a 6-digit guardian PIN. Five failed tries signs the guardian out.
- **Auto-lock:** after 2 minutes idle, when the app goes to the background, or when a child is picked. Guardian screens can't be screenshotted.
- **Dashboard:**
  - "Welcome, guardian", a child picker, and an **"Open {name}'s learning"** button;
  - **activity heatmap** (last 12 weeks, day level);
  - **pie chart** of topics mastered / in progress / not started;
  - **bar chart by chapter**;
  - topics needing practice and suggested practice.

  It shows a **summary only**, never chat text, answers or voice.
- **Sidebar:** Dashboard · Children · Devices · Consent · Settings · Change password · Delete account · Lock · Sign out.
  - **Children:** each child's class, phone type and status. Add a child.
  - **Devices:** every phone each child uses, with a clear status (Paired: shared phone / Paired: own phone / Waiting for pairing code / Removed). Get a pairing code, set a child PIN, revoke a phone.
  - **Consent:** per child, four permissions: Learning (required), Voice input, Guardian progress view, Pilot research. Each explains what it does, what is stored, and what happens when it's off. Versioned, with child assent.
  - **Settings:** language, guardian PIN, export a child's data, privacy notice.
  - **Change password:** current password, then the new one twice.
  - **Delete account:** a specific child's account, or the guardian account (which also deletes the children they're the main guardian for). Type `DELETE` to confirm.
- **Server-side re-check:** changing consent, deleting, exporting and creating pairing codes require a sign-in within the last 5 minutes, checked by the server, not just the local unlock.

### Bangla and English
- The language button is on every screen and switches everything instantly.
- **Bangla mode is Bangla throughout:** interface, lessons, practice questions, tutor replies, textbook labels and digits (অধ্যায় ৫ · পৃ. ৮৯). **English mode is English throughout.**
- Bangla text renders correctly on Android. The correct Noto Sans Bengali font file is used for each weight, with enough line height that vowel marks aren't clipped.

### Design
- **Colour palette** (tokens in `apps/mobile/tailwind.config.js`):

  | Colour | Role |
  |---|---|
  | Blue sapphire `#035B7B` | Brand, buttons |
  | Metallic seaweed `#167B7B` | Mastered |
  | Chrome yellow `#FFAA00` | Needs practice |
  | Metallic yellow `#FFDD15` | Highlights |
  | Sky blue `#62EAF9` | Information |
  | Vivid lime `#B0D80B` | Progress, correct answers |

- Red is used only for deleting.
- Line icons throughout (no emoji). Layouts measure the screen and wrap so nothing runs off the edge.

---

## 2. Architecture

```
 PHONE (Expo / React Native, TypeScript)        SUPABASE (Postgres + Auth + Storage + Edge Functions)         GOOGLE
 ───────────────────────────────────────        ─────────────────────────────────────────────────────         ──────
 Student tabs · Lessons · Guardian mode  ──▶    Auth: guardians; children via pairing / shared enrolment
 SecureStore: login tokens only          HTTPS  Postgres + pgvector + Row-Level Security on every table
 Voice: record → upload → delete                15 Edge Functions (Deno/TS) ── _shared/llm.ts ──────────────▶  Gemini API
                                                Private bucket: textbook page images (signed URLs)
                                                pg_cron: cleanup / retention jobs
```

| Layer | Technology |
|---|---|
| Mobile app | Expo SDK 58 (React Native, TypeScript), expo-router, NativeWind, TanStack Query, zod, i18next, Noto Sans Bengali, expo-secure-store, expo-audio, expo-local-authentication, expo-screen-capture, expo-web-browser, react-native-svg |
| Backend | Supabase: PostgreSQL, pgvector, Row-Level Security, Auth, Storage, Edge Functions (Deno), pg_cron |
| AI | Google Gemini via `@google/genai`, model `gemini-3.1-flash-lite` (text, structured JSON, audio). Embeddings `gemini-embedding-001` (768 dimensions) |
| Content | Index of both NCTB Grade 5 Maths books (`content/textbook/index.json`), page images (WebP), curriculum chunks, rubrics |

### Edge Functions
| Function | Purpose |
|---|---|
| `student-create`, `consent` | Add a child; record versioned consent and child assent |
| `pairing-create`, `pairing-redeem` | One-time 6-digit codes for a child's own phone |
| `shared-device-enroll`, `device-revoke` | Set up / remove a child on a phone |
| `tutor-turn` | Adaptive next step, answer checking with hints, Ask-tab replies |
| `lesson-content` | Step-by-step lesson + worked examples + practice problems (generated once, cached) |
| `textbook-lookup` | "Exercise 5 question 3" → exact page, with signed image URLs |
| `transcribe` | Voice → text, audio kept in memory only |
| `exam-planner` | Workbook + revision routine |
| `explanation-check` | Rubric-based judgement of a child's explanation |
| `guardian-summary` | Aggregated progress, charts and heatmap data |
| `account-export`, `account-delete` | Export a child's data; delete a child or guardian account |

### Textbook lookup
The book has no "Exercise 5.3" numbering. It uses four item types:
- **Let us do / নিজে করি:** chapter-end sets, questions numbered 1 to n.
- **Exercise / অনুশীলন** and **Task / কাজ:** inline, with numbers restarting in each sub-section.
- **Let us try / দেখি পারি কি না:** self-check before each "Let us do".

Printed page = PDF page − 7 in both books. The index covers **10 chapters, 70 lessons, 339 blocks, 486 questions**.

How a request is resolved:
1. `parseReference()` (`supabase/functions/_shared/textbook/resolver.ts`) reads English, Bangla, Banglish, Bangla digits and typos: "ex 5 q3", "অনুশীলনী ৫ এর ৩ নং", "page 16 question 8".
2. `resolve()` maps the reference to a page:
   - "Exercise 5 question 3" → chapter 5 "Let us do" Q3, printed p. 89;
   - inside a lesson, it prefers that chapter's inline Exercise 5;
   - several matches are shown as choices.
3. The function returns signed URLs for the page in both books, and the tutor gives hints for that question.

---

## 3. Security and child safety

| Promise | How it is enforced |
|---|---|
| Children's voices are never stored | Audio exists only in the function's memory during transcription (`store:false`). The phone deletes its recording in `finally` and sweeps leftovers at start-up. No audio column or bucket exists (checked automatically) |
| One child can never see another's data | Row-Level Security on every table, deny by default. Proven by database tests |
| Guardians see a summary, not surveillance | Guardians have no direct access to learning tables, only `guardian_summary()`: aggregates and day-level activity, no text |
| Practice answers stay secret | `items.answer` can't be read by any app user. Answers are checked only inside `tutor-turn` |
| Children can't open guardian mode on a shared phone | Biometric/PIN lock, auto-lock, a separate login per person, server-side re-check for risky actions |
| No secrets in the app | Only the public anon key is in the app. Service and Gemini keys live only in server secrets |
| No personal data sent to the AI | Pseudonymous learner reference. Phone numbers and emails are removed from child text. The model has no tools and no database access |
| Minimal data | Nickname, class, language, answers, progress. No full names, addresses, photos or location |
| Each phone shows only its own family | The "Who's using" screen lists only the signed-in guardian's children, checked against the database |

The security rules for contributors are in `CLAUDE.md`. The full design is in `docs/TUTORFREN_BUILD_WORKFLOW.md`.

---

## 4. AI

| Job | Behaviour |
|---|---|
| Tutor (Ask tab) | Grounded in the child's textbook pages. **Never gives the final answer**: gives the first step and asks the child to do it. At most 3 plain sentences. Says it isn't sure and suggests asking the teacher when the book doesn't cover the question |
| Lessons | Step-by-step explanation with pictures and 2 worked examples, from that lesson's pages. Generated once per language and cached |
| Practice | Problems at the right difficulty (easy for "Try", harder for the mastery check). Hints before answers. Mastery updated after every answer |
| Voice | Speech → text in about 2 seconds. The child sees and can edit the text before sending |
| Textbook lookup | Deterministic parser first; AI only as a fallback for unusual phrasing |

**Language guard (`supabase/functions/_shared/language.ts`):** the required language is the model's final instruction, and every lesson and reply is checked before it's shown or saved:
- English output must contain no Bangla script.
- Bangla output must contain no English letters or digits.

Wrong output is regenerated once, and never saved.

**Keys:** the free Gemini tier is for synthetic data only. For real children, use a key from a billing-enabled project: set `APP_ENV=prod` and `GEMINI_API_KEY_PROD`.

---

## 5. Setup

### 5.1 Requirements
- **Node.js 22+** and npm
- **Docker Desktop**, installed and running
- **Android phone** with **Expo Go** from the Play Store
- For a USB connection: Android platform tools (`brew install android-platform-tools`)
- Only to re-render textbook pages: `brew install poppler webp`

### 5.2 Install
```bash
git clone <repo-url> TutorFren
cd TutorFren
npm run setup                  # installs root tools + apps/mobile dependencies
```

### 5.3 Start the backend (first time)
```bash
npx supabase start             # starts local Postgres/Auth/Storage in Docker; applies all migrations and seed data
npm run dev:env                # writes supabase/functions/.env and apps/mobile/.env from the running stack
npm run seed:demo              # creates the synthetic demo guardian and children
npm run content:upload         # uploads textbook page images to the private storage bucket
```
The textbook page images are generated from the NCTB PDFs (kept out of git) with `npm run content:render`, which expects the PDFs in `content/sources/`.

### 5.4 Add the Gemini key
1. Create a key at **aistudio.google.com** → *Get API key*.
2. Edit `supabase/functions/.env`. This is server-side only; never put it in the app's `.env`.
   ```
   APP_ENV=dev
   GEMINI_API_KEY_DEV=<your key>
   GEMINI_API_KEY_PROD=
   GEMINI_MODEL=gemini-3.1-flash-lite
   GEMINI_THINKING=low
   GEMINI_EMBED_MODEL=gemini-embedding-001
   ```
3. Load the textbook into AI search (once):
   ```bash
   npm run content:ingest
   ```

### 5.5 Google sign-in (optional)
1. In Google Cloud Console, create an **OAuth client ID** of type *Web application*, with redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
2. In `supabase/config.toml`, set `enabled = true` under `[auth.external.google]`.
3. Export the credentials and restart Supabase:
   ```bash
   export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   npx supabase stop && npx supabase start
   ```
4. In `apps/mobile/.env`, set `EXPO_PUBLIC_GOOGLE_AUTH=1`.

### 5.6 Environment files
| File | Contains | Notes |
|---|---|---|
| `supabase/functions/.env` | `APP_ENV`, Gemini keys and models, Supabase URL/keys for scripts | Server only, gitignored. `SUPABASE_*` lines are used by scripts; the functions server supplies its own (the "skipping" messages are expected) |
| `apps/mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_AUTH` | Public values only, gitignored |

Templates: `supabase/functions/.env.example`, `apps/mobile/.env.example`.

---

## 6. Run

You need **two terminals**.

**Terminal 1: backend functions** (project root; run only **one** of these at a time):
```bash
cd TutorFren
npx supabase start             # if not already running (check with: npx supabase status)
npm run functions:serve        # keep open
```

**Terminal 2: the app.** Choose one connection.

**Option A: Wi-Fi.** The phone and computer are on the same network, or the computer is joined to the phone's hotspot:
```bash
npm run dev:env                # puts the computer's network address in apps/mobile/.env
cd apps/mobile
npx expo start -c
```
Scan the QR code with Expo Go.

**Option B: USB cable** (no network needed):
1. On the phone, turn on **Developer options → USB debugging**. Connect the cable and accept *"Allow USB debugging"*.
2. Then run:
   ```bash
   adb devices                    # must show your phone as "device"
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:54321 tcp:54321
   npm run dev:env                # detects the USB connection and uses 127.0.0.1
   cd apps/mobile
   npx expo start --localhost -c
   ```
3. In Expo Go, choose **Enter URL manually** → `exp://127.0.0.1:8081`.

Use `-c` (clear cache) after changing any `.env` file or the colour/theme config. Otherwise `npx expo start` is enough, and pressing `r` in the Expo terminal reloads the app.

---

## 7. Demo walkthrough

1. **Log in** with `demo-guardian@tutorfren.invalid` / `synthetic-demo-1234`.
2. On **"Who's using TutorFren?"**, tap **Guardian** to open the dashboard: Rafi's heatmap, pie chart, chapter bars and practice topics. Open **☰** to see Devices, Consent, Settings, Change password and Delete account.
3. Tap **"Open Rafi's learning"**. The phone is set up for Rafi and switches to student mode.
4. **Today:** see the next step and its reason, then tap **Start**.
5. **Lesson:** step through **Learn** with Back/Next (pictures and 2 worked examples), then **Try an easy one**, **Practice** and the **Mastery check**.
6. **Ask:** type `Exercise 5 Ques 3 can't do it`. The textbook page opens (pinch to zoom, switch book language), and the tutor gives the first step as a hint. Tap the **mic** to ask by voice.
7. **Language:** tap **EN / বাং** in the header. Everything switches, including lessons and tutor replies.
8. **Exams:** plan an exam to get a workbook and a day-by-day routine.
9. **Switch user** returns to the picker. Guardian mode asks for the fingerprint/PIN again.

---

## 8. Tests and checks

| Check | Command | Result |
|---|---|---|
| Function unit tests: textbook resolver (40+ phrasings, every question maps to a valid page), redaction, mastery rules, exam planner, language guard | `npm run test:functions` | **63 / 63 pass** |
| Database access tests (pgTAP): child isolation, guardian limits, consent, hidden answers, sign-up roles | `npx supabase test db` | **27 / 27 pass** |
| End-to-end against the running backend: roles, consent, pairing, shared phones, lookup, tutor, planner, summary, export, delete | `npm run smoke` | **36 / 36 pass** |
| App tests: client separation, translation completeness, crash-report scrubbing, voice-file deletion | `npm run test:mobile` | **13 / 13 pass** |
| Typecheck (functions + app) | `npm run typecheck` | clean |
| Lint | `npm run lint` | 0 errors |
| Security invariants: RLS on every table, no audio storage, no keys in the app, Gemini only through `llm.ts` | `bash scripts/check-invariants.sh` | pass |
| Android bundle | `cd apps/mobile && npx expo export --platform android` | builds |

`npm run smoke` and `npx supabase test db` need the backend running (§6, Terminal 1).

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| App spins forever on login | The app can't reach the backend. Over USB, `apps/mobile/.env` must contain `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and both `adb reverse` commands must be active; restart with `npx expo start --localhost -c` |
| `Missing script: "functions:serve"` | Run it from the project root, not `apps/mobile` |
| `Edge Runtime container is no longer available` | Two functions servers were started. Run `pkill -f "functions serve"` and `docker rm -f supabase_edge_runtime_TutorFren`, then start one again |
| `Env name cannot start with SUPABASE_, skipping` | Expected. The functions server provides these values itself |
| Tutor replies are slow or say "not sure" immediately | The Gemini key is missing or its daily free quota is used up. Check the `functions:serve` terminal |
| `adb devices` shows `unauthorized` | Unlock the phone and accept the USB debugging prompt. If no prompt appears: Developer options → *Revoke USB debugging authorisations*, then reconnect |
| A child's tile says to ask the guardian to set it up again | That phone's saved login was revoked or reset. Guardian → Devices → *Use on this phone* |

---

## 10. Project structure

```
TutorFren/
├── apps/mobile/                      Expo app
│   └── src/
│       ├── app/
│       │   ├── index.tsx             first screen (log in / create account) and "Who's using TutorFren?"
│       │   ├── (auth)/               sign-in, sign-up, pairing
│       │   ├── (student)/(tabs)/     Today, Chapters, Ask, Exams, Me
│       │   ├── (student)/lesson/     4-step lesson flow
│       │   ├── (student)/chapter/    chapter page
│       │   └── (guardian)/           dashboard, children, devices, consents, settings, change-password, delete-account
│       ├── components/               UI kit, Icon, charts, LearnSteps, LessonVisual, PageCard, Practice, VoiceButton,
│       │                             GuardianGate, GuardianMenu, GoogleButton, OpenChild, AppText
│       ├── lib/                      session (one login per person), supabase client, guardian helpers, textbook, voice, lock
│       └── i18n/                     bn.json, en.json
├── supabase/
│   ├── migrations/                   7 migrations: schema + RLS, functions, storage + retention, sessions,
│   │                                 guardian dashboard, devices per child, lesson content
│   ├── functions/                    15 Edge Functions + _shared/ (llm, language, http, mastery, planner, redact,
│   │                                 learner, textbook resolver + index)
│   ├── tests/rls_test.sql            pgTAP access tests
│   ├── seed.sql · seed/demo.ts       curriculum seed · synthetic demo family
│   └── config.toml
├── content/
│   ├── textbook/                     index.json (chapters, lessons, exercises, questions → pages), page summaries
│   ├── scripts/                      render pages, upload pages, ingest, OCR, index builder
│   └── rubrics/                      concept rubrics (Bangla + English)
├── evals/                            safety, explanation and retrieval sets + runner
├── scripts/                          check-invariants.sh, smoke.ts, dev-env.sh, sync-textbook-index.mjs
├── docs/                             build workflow, tech stack, decisions, privacy and consent texts
└── CLAUDE.md                         security rules for all code changes
```
