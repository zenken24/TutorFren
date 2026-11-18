# Google Gemini: data-handling notes (TO VERIFY before the pilot)

- Free ("unpaid") tier: prompts may be used to improve Google products and may be read by reviewers -> **synthetic data only** (`GEMINI_API_KEY_DEV`).
- Paid tier (billing-enabled Cloud project): not used for product improvement -> required for real children (`GEMINI_API_KEY_PROD`, `APP_ENV=prod`). Do not enable any data-sharing discount.
- We call `ai.interactions.create` with `store: false` so interactions are not kept for later retrieval.
- TODO before the pilot: save a dated copy of the current Gemini API terms and the abuse-monitoring retention period here; confirm the model IDs in `supabase/functions/.env.example`; set billing budget alerts ($10 / $25).
