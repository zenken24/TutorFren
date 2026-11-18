-- TutorFren core schema. Every table: RLS on, deny by default (no policy = no access).
create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('guardian','student','teacher','admin')),
  created_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key references public.profiles on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  grade smallint not null check (grade between 1 and 12),
  language text not null default 'bn' check (language in ('bn','en')),
  device_mode text not null check (device_mode in ('own','shared')),
  status text not null default 'pending_consent' check (status in ('pending_consent','active')),
  assent_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.guardian_student_links (
  guardian_id uuid not null references public.profiles on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  is_primary boolean not null default false,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  primary key (guardian_id, student_id)
);
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  scope text not null check (scope in ('core_learning','voice_input','guardian_view','pilot_research')),
  text_version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index consents_one_active on public.consents (student_id, guardian_id, scope) where revoked_at is null;
create table public.devices (
  device_id uuid primary key,
  student_id uuid not null references public.students on delete cascade,
  guardian_id uuid not null references public.profiles on delete cascade,
  mode text not null check (mode in ('own','shared')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  guardian_id uuid not null references public.profiles on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts smallint not null default 0,
  created_at timestamptz not null default now()
);
create table public.concepts (
  id text primary key,
  chapter smallint not null,
  lesson_id text,
  title_en text not null,
  title_bn text not null,
  prerequisite_concept_id text references public.concepts
);
create table public.items (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references public.concepts on delete cascade,
  difficulty smallint not null check (difficulty between 1 and 3),
  language text not null check (language in ('bn','en')),
  prompt text not null,
  answer text not null,
  hints jsonb not null default '[]',
  source_ref text
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  item_id uuid references public.items on delete set null,
  concept_id text not null references public.concepts,
  correct boolean not null,
  hints_used smallint not null default 0,
  created_at timestamptz not null default now()
);
create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  concept_id text not null references public.concepts,
  text text not null,            -- typed or transcribed words only; there is no sound data anywhere
  verdict jsonb not null,
  created_at timestamptz not null default now()
);
create table public.concept_mastery (
  student_id uuid not null references public.students on delete cascade,
  concept_id text not null references public.concepts,
  mastery real not null default 0 check (mastery between 0 and 1),
  evidence_count int not null default 0,
  confidence real not null default 0,
  recent_errors jsonb not null default '[]',
  last_strategy text,
  updated_at timestamptz not null default now(),
  primary key (student_id, concept_id)
);
create table public.exam_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  exam_name text not null check (char_length(exam_name) <= 80),
  exam_date date not null,
  total_marks smallint not null,
  chapters smallint[] not null,
  question_pattern jsonb not null default '{}',
  workbook jsonb not null default '[]',
  routine jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  day date not null default current_date,
  kind text not null
);
create table public.curriculum_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding extensions.vector(768),
  grade smallint not null, subject text not null, chapter smallint not null,
  lesson_id text, concept_id text, topic text,
  kind text not null default 'explanation',
  source_edition text not null, page_ref smallint, pdf_page smallint,
  language text not null check (language in ('bn','en')),
  approved boolean not null default false
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, action text not null, subject_id uuid,
  created_at timestamptz not null default now()
);
create table public.rate_limits (
  key text not null, window_start timestamptz not null, count int not null default 0,
  primary key (key, window_start)
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.guardian_student_links enable row level security;
alter table public.consents enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.concepts enable row level security;
alter table public.items enable row level security;
alter table public.attempts enable row level security;
alter table public.explanations enable row level security;
alter table public.concept_mastery enable row level security;
alter table public.exam_plans enable row level security;
alter table public.session_events enable row level security;
alter table public.curriculum_chunks enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- Clients may only SELECT (plus one column update below). All other writes go through Edge Functions.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.students, public.guardian_student_links, public.consents, public.devices,
  public.concepts, public.items, public.attempts, public.explanations, public.concept_mastery, public.exam_plans,
  public.curriculum_chunks to authenticated;
grant update (language) on public.students to authenticated;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "student reads self" on public.students for select to authenticated using (id = (select auth.uid()));
create policy "student sets own language" on public.students for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "guardian reads linked children" on public.students for select to authenticated using (
  exists (select 1 from public.guardian_student_links l where l.student_id = students.id
          and l.guardian_id = (select auth.uid()) and l.status <> 'revoked'));
create policy "guardian reads own links" on public.guardian_student_links for select to authenticated using (guardian_id = (select auth.uid()));
create policy "guardian reads own consents" on public.consents for select to authenticated using (guardian_id = (select auth.uid()));
create policy "student reads own consents" on public.consents for select to authenticated using (student_id = (select auth.uid()));
create policy "guardian reads child devices" on public.devices for select to authenticated using (guardian_id = (select auth.uid()));
create policy "student reads own attempts" on public.attempts for select to authenticated using (student_id = (select auth.uid()));
create policy "student reads own explanations" on public.explanations for select to authenticated using (student_id = (select auth.uid()));
create policy "student reads own mastery" on public.concept_mastery for select to authenticated using (student_id = (select auth.uid()));
create policy "student reads own plans" on public.exam_plans for select to authenticated using (student_id = (select auth.uid()));
create policy "signed-in users read concepts" on public.concepts for select to authenticated using (true);
create policy "signed-in users read items" on public.items for select to authenticated using (true);
create policy "signed-in users read approved chunks" on public.curriculum_chunks for select to authenticated using (approved);
-- pairing_codes, session_events, audit_log, rate_limits: no policies -> service role only.
