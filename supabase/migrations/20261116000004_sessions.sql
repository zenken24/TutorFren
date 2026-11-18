-- Service-role-only helper: log a student out everywhere (device revoke, account delete).
create or replace function public.revoke_student_sessions(p_student uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'not_allowed' using errcode = '42501'; end if;
  delete from auth.sessions where user_id = p_student;
end $$;
revoke execute on function public.revoke_student_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_student_sessions(uuid) to service_role;
