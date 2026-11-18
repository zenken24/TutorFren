// Fills embeddings for approved curriculum_chunks (loaded by supabase/seed.sql) using GEMINI_EMBED_MODEL.
// Textbook content is not personal data, so the dev key is fine. Run: npm run content:ingest
import { createClient } from "@supabase/supabase-js";
import { embed } from "../../supabase/functions/_shared/llm.ts";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const { data, error } = await sb.from("curriculum_chunks").select("id,content,topic").eq("approved", true).is("embedding", null).limit(2000);
if (error) throw error;
console.log(`chunks without embedding: ${data.length}`);
for (let i = 0; i < data.length; i += 20) {
  const batch = data.slice(i, i + 20);
  const vecs = await embed(batch.map((c) => `${c.topic ?? ""}\n${c.content}`), "RETRIEVAL_DOCUMENT");
  for (let j = 0; j < batch.length; j++) {
    const { error: e } = await sb.from("curriculum_chunks").update({ embedding: JSON.stringify(vecs[j]) }).eq("id", batch[j].id);
    if (e) throw e;
  }
  console.log(`embedded ${Math.min(i + 20, data.length)}/${data.length}`);
  await new Promise((r) => setTimeout(r, 1500)); // stay under free-tier rate limits
}
