create or replace function public.is_active_guardian_of(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardian_student_links l
    join public.consents c on c.guardian_id = l.guardian_id and c.student_id = l.student_id
     and c.scope = 'guardian_view' and c.revoked_at is null
    where l.guardian_id = (select auth.uid()) and l.student_id = p_student and l.status = 'active');
$$;
revoke execute on function public.is_active_guardian_of(uuid) from public, anon;

-- Aggregates only: no transcripts, no per-attempt rows, nothing finer than a day.
create or replace function public.guardian_summary(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if (select auth.uid()) is null or not public.is_active_guardian_of(p_student) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'mastered', coalesce((select jsonb_agg(jsonb_build_object('concept_id', c.id, 'title_en', c.title_en, 'title_bn', c.title_bn) order by c.id)
        from public.concept_mastery m join public.concepts c on c.id = m.concept_id
        where m.student_id = p_student and m.mastery >= 0.8), '[]'::jsonb),
    'gaps', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('concept_id', c.id, 'title_en', c.title_en, 'title_bn', c.title_bn) x
        from public.concept_mastery m join public.concepts c on c.id = m.concept_id
        where m.student_id = p_student and m.mastery < 0.5 and m.evidence_count > 0 order by m.mastery limit 5) g), '[]'::jsonb),
    'suggested_practice', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('concept_id', c.id, 'title_en', c.title_en, 'title_bn', c.title_bn) x
        from public.concept_mastery m join public.concepts c on c.id = m.concept_id
        where m.student_id = p_student and m.mastery < 0.8 and m.evidence_count > 0 order by m.mastery limit 3) s), '[]'::jsonb),
    'sessions_this_week', (select count(distinct e.day) from public.session_events e
        where e.student_id = p_student and e.day > current_date - 7)
  ) into result;
  insert into public.audit_log (actor_id, action, subject_id) values ((select auth.uid()), 'guardian_summary_viewed', p_student);
  return result;
end $$;
revoke execute on function public.guardian_summary(uuid) from public, anon;
grant execute on function public.guardian_summary(uuid) to authenticated;

-- Fixed-window rate limiter; Edge Functions call it with the service role.
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); n int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1 returning count into n;
  return n <= p_max;
end $$;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

create or replace function public.match_chunks(query_embedding extensions.vector(768), p_language text,
  concept_ids text[] default null, chapter_filter smallint[] default null, k int default 5)
returns table (id uuid, content text, chapter smallint, lesson_id text, concept_id text, page_ref smallint, pdf_page smallint, similarity real)
language sql stable set search_path = '' as $$
  select c.id, c.content, c.chapter, c.lesson_id, c.concept_id, c.page_ref, c.pdf_page,
         (1 - (c.embedding operator(extensions.<=>) query_embedding))::real
  from public.curriculum_chunks c
  where c.approved and c.language = p_language and c.embedding is not null
    and (concept_ids is null or c.concept_id = any(concept_ids))
    and (chapter_filter is null or c.chapter = any(chapter_filter))
  order by c.embedding operator(extensions.<=>) query_embedding limit least(k, 10);
$$;
revoke execute on function public.match_chunks(extensions.vector, text, text[], smallint[], int) from public, anon;
grant execute on function public.match_chunks(extensions.vector, text, text[], smallint[], int) to authenticated, service_role;

-- Custom access token hook: mirror profiles.role into app_metadata.role (enable in config.toml / dashboard).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r text; claims jsonb := event->'claims';
begin
  select role into r from public.profiles where id = (event->>'user_id')::uuid;
  claims := jsonb_set(claims, '{app_metadata}', coalesce(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('role', r));
  return jsonb_set(event, '{claims}', claims);
end $$;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
create policy "auth admin reads roles" on public.profiles for select to supabase_auth_admin using (true);
