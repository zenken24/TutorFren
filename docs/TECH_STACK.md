# TutorFren: Tech Stack

> Team Future Frame · AIBC 2026 · Companion to `TUTORFREN_BUILD_WORKFLOW.md`

## Architecture at a glance

```
┌─────────────────── PHONE ───────────────────┐       ┌──────────────── SUPABASE (Singapore) ────────────────┐       ┌──── GOOGLE ────┐
│ Expo (React Native) + TypeScript            │       │ Supabase Auth  (guardians, child pairing)            │       │ Gemini API     │
│ expo-router · NativeWind · TanStack Query   │─HTTPS▶│ Edge Functions (Deno/TS) ── _shared/llm.ts ──────────┼──────▶│  • Flash model │
│ SecureStore · expo-audio · i18next          │       │ PostgreSQL + pgvector + Row-Level Security + pg_cron │       │  • embeddings  │
└─────────────────────────────────────────────┘       └──────────────────────────────────────────────────────┘       │  • (audio STT?)│
                                                                                                                      └────────────────┘
```

**Key principles**
- PostgreSQL runs on the server, never on the phone. The app talks to Supabase over HTTPS.
- The app never calls Gemini directly. All AI calls go through Edge Functions, in `supabase/functions/_shared/llm.ts`.
- The app only stores login tokens (in SecureStore) and a temporary voice file that is deleted right after upload.
- The whole stack uses one language: **TypeScript**.

---

## 1. Mobile app

| Purpose | Tool |
|---|---|
| Framework | **Expo (React Native)** + **TypeScript**, Android first |
| Navigation | `expo-router` (`(auth)`, `(student)`, `(guardian)` route groups) |
| Styling | **NativeWind** (Tailwind for React Native; matches Stitch's Tailwind export) |
| Server data and caching | **TanStack Query** (clears a child's cached data when switching users) |
| Input validation | **zod** (same library as the backend) |
| Backend client | `@supabase/supabase-js` |
| Login token storage | `expo-secure-store` (Android Keystore). **Never AsyncStorage** |
| Voice recording | `expo-audio`: private cache folder, max 60 s, deleted in `finally` |
| Guardian lock (fingerprint/PIN) | `expo-local-authentication` |
| Block screenshots in guardian mode | `expo-screen-capture` |
| Bangla / English | `i18next` + `react-i18next` (`bn.json`, `en.json`) |
| Fonts | `expo-font` with **Noto Sans Bengali** / Hind Siliguri |
| Maths visuals | `react-native-svg` |
| Crash reporting | `@sentry/react-native` (`sendDefaultPii: false`, scrubbed) |
| Builds and APK | **EAS Build** |
| App config | `android:allowBackup="false"` |

## 2. Backend (Supabase)

| Purpose | Tool |
|---|---|
| Database | **PostgreSQL** |
| Curriculum search (RAG) | **pgvector** |
| Login | **Supabase Auth**: guardian email/password or phone code, CAPTCHA (Turnstile or hCaptcha), optional two-factor; children via pairing code (own phone) or shared-phone enrolment |
| Access control | **Row-Level Security** on every table + a custom access-token hook (role from the `profiles` table) |
| Server logic | **Supabase Edge Functions** (Deno, TypeScript) |
| Scheduled cleanup | **pg_cron** (transcript retention, expired pairing codes, audit log cleanup) |
| Region | **Singapore** (closest to Bangladesh) |
| Local development | **Supabase CLI** (Docker) |

**Edge Functions:**
`student-create` · `consent` · `pairing-create` · `pairing-redeem` · `shared-device-enroll` · `device-revoke` · `transcribe` · `explanation-check` · `tutor-turn` · `exam-planner` · `guardian-summary` · `account-export` · `account-delete`

## 3. AI

| Purpose | Tool |
|---|---|
| Tutor, explanation checking, exam workbook | **Google Gemini API**, a current **Flash** model (check the model ID at ai.google.dev) |
| SDK | `@google/genai` |
| Embeddings | Gemini embedding model → pgvector |
| Single entry point | `supabase/functions/_shared/llm.ts` (model ID + key from env) |
| Answer format | Gemini structured output (JSON schema) for rubric verdicts |
| Safety | Strict safety thresholds; safe canned reply on blocked/empty responses |
| Speech-to-text | **Decided by the Phase 5 test** on Bangla children's voices. Candidates: Gemini audio input (paid key), Google Cloud Speech-to-Text, self-hosted Whisper. Must not keep or train on audio |

**Keys:**

| Key | Tier | Allowed data |
|---|---|---|
| `GEMINI_API_KEY_DEV` | Free | **Fake data only.** Free usage may be used by Google to improve its products |
| `GEMINI_API_KEY_PROD` | Billing-enabled Google Cloud project | Real children (pilot). No data-sharing discount programme |

## 4. Content pipeline

| Purpose | Tool |
|---|---|
| Ingestion scripts | TypeScript (Node or Deno) in `content/` |
| Source tracking | Edition, grade, chapter and page recorded for every chunk |
| Review step | A CSV of chunks a human approves before loading |
| Rubrics | YAML per concept in `content/rubrics/` (Bangla + English) |

## 5. Testing and quality

| Purpose | Tool |
|---|---|
| Unit tests (app) | **Jest** + React Native Testing Library |
| Unit tests (Edge Functions) | **Deno test** |
| Database access tests | **pgTAP** (one child can't read another's data, guardian can't read raw data, etc.) |
| End-to-end tests | **Maestro** (shared-phone lock, pairing, lesson flow) |
| AI quality checks | `evals/`: explanation judgements, retrieval, safety / prompt injection, speech-to-text accuracy |
| Lint and format | ESLint + Prettier |

## 6. Security and DevOps

| Purpose | Tool |
|---|---|
| Code hosting and CI | **GitHub** + **GitHub Actions** |
| Secret scanning | **gitleaks** (pre-commit + CI) |
| Rule checks | `scripts/check-invariants.sh`: every table protected, no audio columns/buckets, no keys in the app, Gemini only via `llm.ts` |
| Dependency updates | **Dependabot** + `npm audit` |
| Secrets | Supabase function secrets + EAS secrets. Never in code |
| Cost guard | Google Cloud budget alerts (e.g. $10 / $25) |
| Admin access | At most two Supabase admins, two-factor required |

## 7. Design and AI coding tools

| Purpose | Tool |
|---|---|
| UI design | **Google Stitch** → export to Figma for cleanup |
| Coding agent | **Claude Code**, with the security rules in `CLAUDE.md` |

---

## Costs

| Stage | Cost |
|---|---|
| Development and demo | **Free**: Supabase free plan, Gemini free tier (fake data only), Expo/EAS free tier, GitHub free |
| Pilot (20–30 children) | Supabase paid plan (backups, leaked-password check) + Gemini on billing (a few dollars a month at this scale) |
| Not needed yet | Apple developer account (Android first) |

Ask the AIBC organisers about API or cloud credits.

## Getting started

```bash
# App
npx create-expo-app@latest apps/mobile --template

# Backend
supabase init
supabase start          # local Postgres + Auth + Functions (needs Docker)

# Gemini key (dev): create at aistudio.google.com → "Get API key"
supabase secrets set GEMINI_API_KEY_DEV=...   # server-side only, never in the app
```

Then paste the **Phase 0** prompt from `TUTORFREN_BUILD_WORKFLOW.md` into Claude Code.
