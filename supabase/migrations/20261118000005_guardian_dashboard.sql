-- 1) Every new sign-up that is not a synthetic student account gets a guardian profile.
--    (Before this, only the demo seed created guardian profiles, so a real sign-up could not add a child.)
--    Student auth users use the internal domain @students.invalid and get role 'student' from student-create.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.email, '') not like '%@students.invalid' then
    insert into public.profiles (id, role) values (new.id, 'guardian') on conflict (id) do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: existing non-student users without a profile become guardians.
insert into public.profiles (id, role)
select u.id, 'guardian' from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null and coalesce(u.email, '') not like '%@students.invalid';

-- 2) Guardian dashboard data. Still AGGREGATES ONLY:
--    * chapters: concept counts per chapter by status (for the bar chart)
--    * totals: mastered / in progress / not started (for the pie chart)
--    * active_days: number of learning events per DAY for the last 84 days (heatmap).
--      Day granularity only - no times, no per-session timeline, no content.
create or replace function public.guardian_summary(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if (select auth.uid()) is null or not public.is_active_guardian_of(p_student) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  with st as (
    select c.id, c.chapter,
      case when m.evidence_count is null or m.evidence_count = 0 then 'not_started'
           when m.mastery >= 0.8 then 'mastered' else 'in_progress' end as status
    from public.concepts c
    left join public.concept_mastery m on m.concept_id = c.id and m.student_id = p_student
  )
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
        where e.student_id = p_student and e.day > current_date - 7),
    'totals', (select jsonb_build_object(
        'mastered', count(*) filter (where status = 'mastered'),
        'in_progress', count(*) filter (where status = 'in_progress'),
        'not_started', count(*) filter (where status = 'not_started')) from st),
    'chapters', coalesce((select jsonb_agg(jsonb_build_object(
        'chapter', chapter, 'total', total, 'mastered', mastered, 'in_progress', in_progress) order by chapter)
        from (select chapter, count(*) total,
                     count(*) filter (where status = 'mastered') mastered,
                     count(*) filter (where status = 'in_progress') in_progress
              from st group by chapter) ch), '[]'::jsonb),
    'active_days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day)
        from (select e.day, count(*) n from public.session_events e
              where e.student_id = p_student and e.day > current_date - 84
              group by e.day) d), '[]'::jsonb)
  ) into result;
  insert into public.audit_log (actor_id, action, subject_id) values ((select auth.uid()), 'guardian_summary_viewed', p_student);
  return result;
end $$;
revoke execute on function public.guardian_summary(uuid) from public, anon;
grant execute on function public.guardian_summary(uuid) to authenticated;
