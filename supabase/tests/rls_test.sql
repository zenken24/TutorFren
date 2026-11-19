-- pgTAP: access matrix + negative tests (workflow doc §7). All data here is SYNTHETIC.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(25);

-- synthetic users: guardian G, unlinked guardian U, students A (Rafi) and B (Nusrat)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@students.invalid'), ('00000000-0000-0000-0000-00000000000b', 'b@students.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'g@example.invalid'), ('00000000-0000-0000-0000-0000000000a2', 'u@example.invalid');
insert into profiles (id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'student'), ('00000000-0000-0000-0000-00000000000b', 'student'),
  ('00000000-0000-0000-0000-0000000000a1', 'guardian'), ('00000000-0000-0000-0000-0000000000a2', 'guardian')
on conflict (id) do update set role = excluded.role; -- the sign-up trigger already made the guardian rows
insert into students (id, nickname, grade, device_mode, status) values
  ('00000000-0000-0000-0000-00000000000a', 'Rafi (synthetic)', 5, 'shared', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'Nusrat (synthetic)', 5, 'shared', 'active');
insert into guardian_student_links (guardian_id, student_id, is_primary, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', true, 'active');
insert into consents (guardian_id, student_id, scope, text_version) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'guardian_view', 'v1');
insert into concepts (id, chapter, title_en, title_bn) values ('c-test', 1, 'Test concept', 'পরীক্ষা');
insert into attempts (student_id, concept_id, correct) values
  ('00000000-0000-0000-0000-00000000000a', 'c-test', true), ('00000000-0000-0000-0000-00000000000b', 'c-test', false);
insert into explanations (student_id, concept_id, text, verdict) values
  ('00000000-0000-0000-0000-00000000000a', 'c-test', 'canary-tiger-42', '{}'), ('00000000-0000-0000-0000-00000000000b', 'c-test', 'other child', '{}');
insert into concept_mastery (student_id, concept_id, mastery, evidence_count) values
  ('00000000-0000-0000-0000-00000000000a', 'c-test', 0.9, 3), ('00000000-0000-0000-0000-00000000000b', 'c-test', 0.2, 3);

create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated',
    'user_metadata', json_build_object('role', 'guardian'))::text, true);  -- user_metadata.role must have no effect
$$;

-- student A
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is((select count(*) from attempts), 1::bigint, 'student A sees only own attempts');
select is((select count(*) from explanations), 1::bigint, 'student A sees only own explanations');
select is((select count(*) from concept_mastery), 1::bigint, 'student A sees only own mastery');
select is((select count(*) from students), 1::bigint, 'student A sees only own student row');
select is((select count(*) from attempts where student_id = '00000000-0000-0000-0000-00000000000b'), 0::bigint, 'student A cannot read student B');
select throws_ok($$update profiles set role = 'guardian' where id = '00000000-0000-0000-0000-00000000000a'$$, '42501', null, 'student cannot change own role');
select throws_ok($$update concept_mastery set mastery = 1$$, '42501', null, 'student cannot award mastery');
select throws_ok($$insert into attempts (student_id, concept_id, correct) values ('00000000-0000-0000-0000-00000000000a', 'c-test', true)$$, '42501', null, 'student cannot insert attempts');
select throws_ok($$update students set grade = 6$$, '42501', null, 'student cannot change grade');
select lives_ok($$update students set language = 'en' where id = '00000000-0000-0000-0000-00000000000a'$$, 'student can change own language');
select throws_ok($$select guardian_summary('00000000-0000-0000-0000-00000000000a')$$, '42501', null, 'student (even with user_metadata.role=guardian) cannot call guardian_summary');
select throws_ok($$select count(*) from session_events$$, '42501', null, 'session events are server-only');

-- linked guardian G
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select is((select count(*) from attempts), 0::bigint, 'guardian sees no attempts');
select is((select count(*) from explanations), 0::bigint, 'guardian sees no transcripts');
select is((select count(*) from concept_mastery), 0::bigint, 'guardian sees no mastery rows directly');
select ok((select guardian_summary('00000000-0000-0000-0000-00000000000a') ? 'mastered'), 'linked guardian gets the summary');
select ok((select guardian_summary('00000000-0000-0000-0000-00000000000a')::text not like '%canary-tiger-42%'
       and not (guardian_summary('00000000-0000-0000-0000-00000000000a') ? 'text')), 'summary has no transcript text');
select ok((select guardian_summary('00000000-0000-0000-0000-00000000000a') ?& array['totals','chapters','active_days']), 'summary has dashboard aggregates (totals, chapters, active days)');
select throws_ok($$select guardian_summary('00000000-0000-0000-0000-00000000000b')$$, '42501', null, 'guardian cannot summarise an unlinked child');

-- unlinked guardian U
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$select guardian_summary('00000000-0000-0000-0000-00000000000a')$$, '42501', null, 'unlinked guardian is refused');
select is((select count(*) from students), 0::bigint, 'unlinked guardian sees no children');

-- revoked consent takes effect immediately
reset role;
update consents set revoked_at = now() where scope = 'guardian_view';
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select guardian_summary('00000000-0000-0000-0000-00000000000a')$$, '42501', null, 'revoked consent -> refused');

-- anon reads nothing
reset role; set local role anon;
select throws_ok($$select count(*) from students$$, '42501', null, 'anon can read nothing');


reset role;
-- sign-up trigger: a new non-student user becomes a guardian; synthetic student users do not
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'new-parent@example.invalid'), ('00000000-0000-0000-0000-0000000000c2', 'kid@students.invalid');
select is((select role from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'guardian', 'new sign-up gets the guardian role');
select is((select count(*)::int from profiles where id = '00000000-0000-0000-0000-0000000000c2'), 0, 'synthetic student users get no automatic guardian role');

select * from finish();
rollback;
