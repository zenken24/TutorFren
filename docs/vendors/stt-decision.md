# Speech-to-text decision: NOT MADE YET

The Phase 5 bake-off on Bangla children's voices has not been run. Until it is, `transcribe` uses Gemini audio
input through `_shared/llm.ts` behind the `SttProvider` interface in `supabase/functions/transcribe/index.ts`.
Rules for any candidate: no training on audio, zero/short retention, acceptable region, DPA on file. Child audio must
never go to the free Gemini key. Fill in: Bangla WER, English WER, retention, training use, DPA, region, cost/minute.
