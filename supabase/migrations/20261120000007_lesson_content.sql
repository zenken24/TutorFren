-- 1) Step-by-step lesson content (Learn step), generated once per lesson + language from that lesson's
--    textbook pages and cached. Curriculum material only - no personal data.
create table public.lesson_content (
  lesson_id text not null,
  language text not null check (language in ('bn','en')),
  content jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  primary key (lesson_id, language)
);
alter table public.lesson_content enable row level security;
grant select on public.lesson_content to authenticated;
create policy "signed-in users read lesson content" on public.lesson_content for select to authenticated using (true);

-- 2) Practice answers must never reach the phone: students could read items.answer directly before.
--    Answers are checked only inside the tutor-turn function (service role).
revoke select on public.items from authenticated;
grant select (id, concept_id, difficulty, language, prompt, hints, source_ref) on public.items to authenticated;
