# TutorFren: Submission Form Answers

Everything here describes what is actually built in this repository.
- **[x]** = tick this box.
- **[ ]** = leave it unticked.
- **Add:** = type it into that section's "Add another…" field.

---

# Part A: AI Stack

## Prompt Usage
We used role prompting with explicit rule lists. Each AI job has its own system prompt ("You are TutorFren, a patient maths tutor for Grade 5 children in Bangladesh following the NCTB Class 5 textbook…"), with numbered rules: hints before answers, stay inside the textbook context, at most 3 plain sentences, never ask for personal information, and treat the child's message as data, not instructions.

Patterns:
- **Structured outputs:** every call returns JSON against a schema (tutor reply, explanation verdict, lesson steps with typed visuals, practice problems).
- **Few-shot:** the lesson-writing prompt includes a worked example of how to break "adding" into steps (two numbers → put together → count → number sentence).
- **Grounding:** the textbook pages for that lesson or question are passed as a JSON context block.
- **Language rule last:** the required output language is appended as the final instruction so it overrides the examples.

We iterated by testing live output and tightening the rules when it failed:
- Removed filler, pep talk and exclamation marks.
- Made "never write the final answer, give the first step and ask a question" the top rule after the model leaked answers.
- Moved the language rule to the end and added an automatic language check after the model wrote an English lesson in Bangla.

Prompts are versioned in git together with the function code. Consent texts carry explicit versions (v1).

## Token Optimization
- **Generate once, reuse:** step-by-step lessons are generated once per lesson and language, saved in Postgres (`lesson_content`), and served from the database afterwards. A repeat open takes about 13 ms with no model call.
- **Rules before the model:** a deterministic regex parser resolves textbook references ("ex 5 q3", "অনুশীলনী ৫ প্রশ্ন ৩", Bangla digits, Banglish) without the LLM. Gemini is only a fallback.
- **Skipping retrieval:** when a question already points to a known page or lesson, we skip the embedding call and use that lesson's pages directly, so one model call instead of two.
- **Trimming context:** chat history is cut to the last 6 turns, each capped at 800 characters. Retrieval is limited to the top 4 chunks.
- **Choosing a model:** we benchmarked four Gemini models and chose the fastest that handled Bangla, JSON and audio: `gemini-3.1-flash-lite`, about 1–4 s per call.
- **Limits:** thinking level set to low, output tokens capped per task, embeddings reduced to 768 dimensions.
- **Fail fast:** quota errors return a safe fallback reply immediately instead of retrying.

## Token Optimization Tools & Methods
[x] Sliding-window / context trimming
 [x] Structured outputs / JSON mode
- [ ] Everything else (no provider prompt/context caching, LLMLingua, batching, KV-cache reuse, speculative decoding)

## LLMs / Models Used
[x] Gemini
 [x] Claude


**How & why did you use these LLMs?**
- **Gemini 3.1 Flash-Lite** runs the product: tutor chat, step-by-step lesson generation, practice problems, rubric judging, the exam planner, and speech-to-text from audio. Chosen for strong Bangla, structured JSON output, native audio input and low latency (about 1–4 s). We benchmarked it against Gemini 2.5 Flash (hit a 20 requests/day free-tier limit) and Gemini 3.5 / 3.8 Flash (over 20–40 s per reply, too slow for a child waiting).
- **gemini-embedding-001** (768 dimensions) powers curriculum retrieval.
- **Claude** (Opus 5.5 and Fable, via Claude Code) was our engineering agent. It read all 190 pages of both NCTB textbooks visually to build the exercise/question → page index, and wrote and tested the app, backend, database migrations and security tests.

## Retrieval & RAG
- [x] Naive RAG (chunk + embed + retrieve)
- [x] Vector Database (pgvector)


**RAG architecture details**
- **Source:** the official NCTB Grade 5 Mathematics 2026 textbooks (Bangla and English, 190 pages each). The PDFs have no text layer, so we OCR'd locally (macOS Vision, Tesseract Bangla) and built a structured index: 10 chapters, 70 lessons, 339 exercise blocks, 486 questions, each mapped to its printed and PDF page.
- **Chunking:** by page and pedagogical unit. There are 182 chunks, each a page summary plus worked example, tagged with chapter, lesson, concept and page.
- **Embeddings:** gemini-embedding-001 at 768 dimensions, normalised, stored in Postgres + pgvector.
- **Retrieval:** a cosine-similarity function (`match_chunks`) filtered by chapter, top-4.
- **Shortcut:** when the child names a textbook question or is inside a lesson, we skip the vector search and use that lesson's own pages directly (metadata retrieval).
- **Page images:** answers point to the exact textbook page, served from a private storage bucket via short-lived signed URLs.


## Open Source Tools & Libraries
- **Supabase** (Postgres, pgvector, PostgREST, GoTrue auth, Deno edge runtime) for the backend, auth and RAG store.
- **Expo / React Native** with expo-router for the Android app.
- **NativeWind / Tailwind** for styling.
- **TanStack Query** for data fetching and caching.
- **zod** for strict request validation.
- **i18next** for Bangla/English.
- **react-native-svg** for charts, icons and lesson visuals.
- **Noto Sans Bengali** font.
- **Tesseract OCR** (Bangla model) and **Poppler/pdftoppm** for OCR and page rendering; **libwebp** for page images.
- **pgTAP** for database security tests; **Jest** and **Deno test** for unit tests; **ESLint**; **gitleaks** for secret scanning.

## Agent Frameworks & Orchestration
No multi-agent framework in the product. We use custom deterministic orchestration in Supabase Edge Functions:
1. A rule-based textbook parser runs first.
2. An adaptive mastery engine (transparent rules) decides the next action: reteach, hint, practise, harder problem or mastery check.
3. Then a single grounded Gemini call. The model has no tools and no database access.

For building, we used Claude Code with a background sub-agent (Claude Fable) for long tasks such as reading the textbooks and building the index.

## Fine-tuning / Adaptation
Not applicable. No fine-tuning. Adaptation to Bangla and the NCTB curriculum comes from retrieval grounding, prompts and a per-learner mastery model.

## Evaluation & Quality Measurement
- **Eval sets:** 12 safety / prompt-injection prompts, 62 explanation-judgement cases (Bangla + English), 40 retrieval queries, with a runner.
- **Automated tests:**
  - 63 function unit tests, including 40+ textbook-reference phrasings in English, Bangla and Banglish, and a check that every one of the 486 questions maps to a valid page;
  - 27 pgTAP database security tests;
  - 36 end-to-end checks against the running backend;
  - 13 app tests.
- **Live output checks:** responses scanned for wrong-language characters (zero English letters or digits in Bangla mode) and for leaked final answers.
- **Model benchmarking:** latency and correctness across four Gemini models before choosing one.

## Guardrails, Safety & Privacy
- **PII handling:** phone numbers (Bangladeshi formats, including Bangla digits) and emails are redacted from child text before any model call. Learners are sent as pseudonymous references.
- **Prompt injection:** the model has no tools and no database access, and the child's message is marked as data, not instructions.
- **Content safety:** strict Gemini safety thresholds, with a safe fallback reply when a response is blocked or fails.
- **Output validation:** JSON schema outputs plus a **language guard**; replies or lessons in the wrong language are regenerated and never saved.
- **Hallucination control:** grounded in the child's own textbook pages; "not sure, ask your teacher" when the book doesn't cover it; hints only, never the final answer.
- **Privacy:**
  - children's voice recordings are never stored (in memory only, `store:false`, the phone deletes its file);
  - Row-Level Security on every table, with child-to-child isolation proven by tests;
  - guardians see aggregated progress only;
  - practice answers are hidden from the app;
  - consent per feature, with server-side re-authentication for risky actions;
  - no keys in the app, and logs contain no personal data.

## Frontend AI / Visual App Builders
- [ ] None of the listed tools
- **Add:** Claude Code
- **Add:** Google Stitch 

**How did you use these tools? What % of UI was AI-built?**
About 100% of the UI code was written by Claude Code from our specs and screen descriptions, then reviewed and tested on an Android phone by the team. That includes the student and guardian screens, charts, lesson visuals, the design system (our colour palette as tokens) and the Bangla font handling.


## AI Development Lifecycle (AI-DLC)
[x] AGENTS.md spec (the Expo app includes `AGENTS.md`, followed by the coding agent)

**Add:** Claude Code + CLAUDE.md project rules

**Process notes (phases, artifacts, review gates)**
1. A proposal document became a security-first build workflow (`docs/TUTORFREN_BUILD_WORKFLOW.md`), with threat model, data model and phased build prompts.
2. Eleven non-negotiable rules went into `CLAUDE.md`, which every agent session reads, e.g. "voice is never stored", "RLS on every table", "Gemini only through llm.ts".
3. The agent implemented phase by phase.
4. Review gates on each phase:
   - an automated invariant script that fails the build on an audio column, a table without RLS, or a key in the app;
   - pgTAP security tests, unit tests and end-to-end smoke tests;
   - human testing on a real Android phone, with bug reports fed back to the agent.

## Build a Live /docs Module
- [ ] Tick only if you will build and ship the `/docs` page before the deadline.

---

# Part B: Data Stack

## 1. Data Sources
[x] Internal (own DB / app data)
[x] External APIs (paid/free)
[x] Open Datasets (Kaggle, HF, gov)
[x] Synthetic / AI-generated Data

**List specific sources**
- **NCTB (government) Grade 5 Elementary Mathematics textbooks, academic year 2026:** the Bangla and English versions as PDFs, 190 pages each. This is the curriculum source for the index, page images and RAG chunks.
- **Internal app data in Supabase Postgres:** learner mastery, practice attempts, exam plans, consents, devices, day-level activity.
- **Google Gemini API:** text generation, structured JSON, speech-to-text, embeddings.
- **Synthetic data:** a demo guardian with two synthetic children ("Rafi", "Nusrat") and generated progress and activity history. AI-generated lesson walkthroughs and practice problems are produced from the textbook pages.

## 2. Acquisition Methods
[x] OCR (Tesseract, Donut, Textract)
[x] AI Extraction (LLM parsing of unstructured)
[x] Bulk Upload (CSV/XLSX/PDF intake)
[x] Speech-to-Text (Whisper, Deepgram)

**Scrapers / crawlers used:** None.

**MCP servers for data access:** None.

**Bulk upload / automated flows / AI-driven extraction details**
1. **PDF intake:** the two textbook PDFs are rendered page by page (pdftoppm, 140 dpi → WebP) and uploaded to a private Supabase Storage bucket by script.
2. **OCR:** text is extracted locally with macOS Vision (English) and Tesseract with a Bangla model, with no textbook content sent to any API.
3. **Exercise markers:** exercise markers (coloured icons for "Let us do", "Exercise", "Task") were detected by colour, and their numbers read from crop sheets.
4. **AI extraction:** Claude read every page image to build and verify the structured index (chapter → lesson → exercise → question → page) and to write the page summaries used as RAG chunks.
5. **At runtime:**
   - Gemini turns each lesson's pages into a step-by-step walkthrough and practice problems (structured JSON);
   - Gemini audio input turns a child's voice into text, with the audio never stored.

## 3. Parsing, Formats & Cleaning
**Formats handled:** JSON · JSONL · CSV (TSV) · PDF · Markdown · YAML · Images (PNG, WebP) · Audio (M4A/AAC)

**Parsers used**
- Poppler `pdftoppm` (PDF → page images).
- macOS Vision OCR (`ocr.swift`) and Tesseract OCR (Bangla).
- Python index builder (`build_index.py`) and colour-marker detector (`markers.py`).
- A custom regex reference parser in TypeScript (`resolver.ts`) for English / Bangla / Banglish / Bangla digits.
- Gemini JSON mode for model outputs.

**Formatters / converters**
- `cwebp` (PNG → WebP).
- `build-seed.mjs` (textbook index → SQL seed for concepts, practice items and curriculum chunks).
- `build-rubrics.ts` (YAML rubrics → JSON).
- `sync-textbook-index.mjs` (one index shared by the backend and the app).

**Data cleaning & enrichment**
- **Page numbers:** normalised (printed page = PDF page − 7 in both books); Bangla and English book layouts cross-checked page by page.
- **Book typos:** duplicates kept with distinct IDs (e.g. "Exercise 2" printed twice on p. 151).
- **Verification flags:** 31 chapter-end questions hand-transcribed and marked `verified`, the rest flagged unverified.
- **Answers:** normalised (Bangla ↔ English digits, spacing, remainder forms).
- **Child text:** PII redacted.
- **AI output:** language-validated; wrong-language records were deleted.

**Schema validation**
- **zod** strict schemas on every Edge Function request.
- **JSON Schema** for every Gemini structured output.
- **Postgres** CHECK constraints, foreign keys and enums.
- **TypeScript types** for the textbook index.
- **pgTAP** tests for access rules.

## 4. Storage Targets
[x] Relational (Postgres)
[x] Vector DB (pgvector)
[x] Object Storage (Supabase Storage)


**Schema design, partitioning, indexes, retention, tiered storage**
- **Schema:** Supabase Postgres with 7 migrations covering profiles/roles, students, guardian links, versioned consents, devices (composite key: one phone can hold several children), pairing codes (hashed), concepts, practice items, attempts, explanations, concept mastery, exam plans, day-level session events, curriculum chunks (with a 768-dim `vector` column), lesson content cache, audit log and rate limits.
- **Access control:** Row-Level Security on every table, deny by default. Practice answers are column-restricted so app users can't read them.
- **Storage:** textbook page images (WebP) live in a private bucket served via 10-minute signed URLs.
- **Retention:** `pg_cron` jobs clean up expired pairing codes and old rate-limit windows. Deleting an account cascades to every row.

## 5. Visualization
- [ ] None of the listed libraries
- **Add:** react-native-svg (custom charts)

**Visualization details**
Custom charts drawn with react-native-svg, sized to the phone with `onLayout`:
- a **12-week activity heatmap** (week starting Saturday, five intensity levels);
- a **donut chart** of topics mastered / in progress / not started;
- **stacked horizontal bars per chapter**;
- a weekly **progress ring** and **mastery bars**.

Lesson visuals are drawn the same way: dot counters, fraction bars, vertical sums and equations. All labels are bilingual with Bangla digits in Bangla mode, and every chart has accessibility labels.

**Dashboards & reports**
- An in-app **guardian dashboard** (per child) with the heatmap, pie chart, chapter bars, topics needing practice and suggested practice.
- Student-facing **Today** (next step with reason, weekly ring) and **Me** (strengths, practice list, mastery by chapter).
- No external BI tools.

## 6. Insights: AI, ML & Non-AI
[x] LLM Inference / RAG over data
[x] Rule Engine / Heuristics (non-AI)

**AI / ML details**
- No trained models. Gemini 3.1 Flash-Lite (inference only) generates grounded lessons, hints and practice problems and transcribes voice. gemini-embedding-001 (768-dim) handles retrieval over 182 curriculum chunks.
- Quality is measured with eval sets (safety, explanation judgement, retrieval), automated tests, and live checks for language and answer leakage.

**Non-AI analytics**
- **Guardian dashboard SQL** (`guardian_summary()`): counts concepts by status (mastered ≥ 0.8, in progress, not started), rolls them up per chapter, counts learning events per day for 84 days, and counts days active this week.
- **Transparent mastery engine:**
  - updates mastery from evidence (correct / with hints / wrong, difficulty);
  - decides the next action (reteach prerequisite, worked example, hint, practise, harder problem, mastery check), each with a readable reason.
- **Exam planner:** weights the workbook towards weak concepts and schedules day-by-day revision before the exam date.

**How are insights delivered to users?**
- In-app guardian dashboard (charts + heatmap).
- The student's Today card ("Your next step" plus a one-line reason).
- Mastery badges on every lesson, the Me tab, and the exam planner's workbook and routine.

## 7. Pipelines & Orchestration
**Orchestration**
- A content pipeline driven by npm scripts: render pages → upload pages → build index → sync index → build seed → ingest embeddings.
- At runtime, custom orchestration inside Supabase Edge Functions: deterministic parser → mastery rules → retrieval → a single Gemini call.

**Scheduling / Triggers**
- `pg_cron` nightly cleanup jobs.
- A Postgres trigger on sign-up assigns the guardian role.
- On-demand generation: a lesson's walkthrough and practice problems are generated the first time it's opened, then cached.

**Streaming / Real-time:** None.

## 8. Outbound: APIs & Distribution
**Outbound APIs**
- 15 Supabase Edge Functions (JSON over HTTPS).
- Every call is authenticated with a Supabase JWT, and the role is checked from the database (not the token).
- Strict zod validation and per-user rate limits (Postgres fixed-window limiter).
- Direct table reads go through PostgREST under Row-Level Security.

**Webhooks & exports**
- `account-export` gives a guardian a JSON export of all of a child's data.
- Textbook page images are delivered as short-lived signed URLs.
- No webhooks.

**Embeddings / model serving**
- Embeddings come from the Gemini embedding API through a single wrapper (`_shared/llm.ts`).
- Vector search is exposed as the `match_chunks` Postgres function.
- No self-hosted inference endpoints.

## 9. Open Source Stack
- **Supabase:** Postgres (data), pgvector (vector search), PostgREST (data API with RLS), GoTrue (auth), Storage (page images), Deno edge runtime (functions), pg_cron (cleanup jobs).
- **pgTAP:** database security tests.
- **Expo / React Native, expo-router:** the Android app.
- **NativeWind / Tailwind:** styling.
- **TanStack Query:** data fetching.
- **zod:** validation.
- **i18next:** Bangla/English.
- **react-native-svg:** charts and visuals.
- **Noto Sans Bengali:** Bangla font.
- **Tesseract OCR** (Bangla) and **Poppler**: textbook extraction.
- **libwebp:** image compression.
- **Jest / Deno test / ESLint:** quality.
- **gitleaks:** secret scanning.

## 10. Quality, Governance & Observability
**Data quality**
- Index integrity tests prove every one of the 486 questions and 750 sub-items resolves to a valid page.
- 40+ reference phrasings are tested in three languages.
- 31 hand-verified questions are flagged `verified`, and the Bangla and English books were cross-checked page by page.
- AI output is language-validated before saving.
- 63 unit tests, 27 pgTAP tests and 36 end-to-end checks.

**Privacy & compliance**
- Guardian consent per feature (learning, voice, guardian view, research), versioned, with child assent.
- Children have no passwords.
- Minimal data: nickname, class, language and progress only.
- PII is redacted before AI calls, and learners are pseudonymous.
- Voice is never stored, and practice answers are hidden.
- Row-Level Security on every table; guardians see aggregates only.
- Server-side re-authentication for risky actions.
- Data export and full account deletion.
- The free AI tier is used with synthetic data only.

**Lineage & observability**
- Structured JSON logs with request ID, route, status, latency and a hashed user reference, never message text or personal data.
- An `audit_log` table for guardian views, consent changes, pairing and deletions.
- Every curriculum chunk carries its chapter, lesson and printed/PDF page.
- AI-generated practice items carry `source_ref = ai:lesson-content:<lesson>`, and cached lessons record which model generated them.

**Cost & performance**
- Lessons are generated once and cached.
- The deterministic parser runs before any AI call, and the embedding call is skipped when the page is known.
- A small, fast model (Flash-Lite) with low thinking and capped output tokens; chat history trimmed.
- 768-dim embeddings.
- WebP page images (about 30 MB for both books).
- Quota errors fail fast.

## Anything else about your data stack?
- **Exact-page grounding:** a child can type "Exercise 5 Ques 3 can't do it" (or the Bangla equivalent) and get that exact textbook page plus a hint, because the whole book was turned into a structured question → page index.
- **AI-built data pipeline:** an AI agent read all 190 pages of both books visually to build and verify that index.
- **Strict bilingual guarantee:** a language guard checks every AI output, so Bangla mode is Bangla throughout and English mode is English throughout.
- **Privacy built into the data model:** voice is never stored, answers are hidden, and guardians see aggregates only.

## Publish local environment to internet
- [ ] None. We didn't expose anything to the internet.

**Tunneling usage notes**
Not used. During development the backend ran locally in Docker, and the Android phone connected over USB with `adb reverse` (or the same local network). Nothing was exposed publicly.
