-- Private bucket for textbook page images (not personal data). No client policies: pages are
-- reachable only through short-lived signed URLs minted by the textbook-lookup / textbook-page functions.
insert into storage.buckets (id, name, public) values ('textbook-pages', 'textbook-pages', false)
on conflict (id) do update set public = false;

-- Nightly retention (pg_cron). Wrapped so local stacks without pg_cron still migrate.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('tf-pairing-codes', '15 2 * * *', $j$delete from public.pairing_codes where expires_at < now() - interval '24 hours'$j$);
  perform cron.schedule('tf-audit-log', '20 2 * * *', $j$delete from public.audit_log where created_at < now() - interval '1 year'$j$);
  perform cron.schedule('tf-rate-limits', '25 2 * * *', $j$delete from public.rate_limits where window_start < now() - interval '2 days'$j$);
  perform cron.schedule('tf-session-events', '30 2 * * *', $j$delete from public.session_events where day < current_date - 60$j$);
exception when others then
  raise notice 'pg_cron not available: retention jobs not scheduled (%)', sqlerrm;
end $$;
