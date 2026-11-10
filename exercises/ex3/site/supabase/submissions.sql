-- Miswire Hunt (single-player): store what each student submitted. The nick column holds the student's email.
-- Run once in the Supabase SQL Editor. Students can only call submit_work();
-- reading everything needs the instructor key (the 'instructor_key' row in the settings table).
-- The instructor key lives in this table. Nobody can read it through the API: only the functions below look at it.
-- Set the key once (pick your own long random value):
--   insert into settings(k, v) values ('instructor_key', '...') on conflict (k) do update set v = excluded.v;
-- Without that row every key is refused.
create table if not exists settings (k text primary key, v text not null);
alter table settings enable row level security;
revoke all on settings from anon, authenticated;

create table if not exists submissions (
  id text primary key,
  nick text,
  diag jsonb not null default '{}',
  drained jsonb not null default '[]',
  answers jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table submissions enable row level security;
revoke all on submissions from anon, authenticated;

create or replace function submit_work(p_id text, p_nick text, p_diag jsonb, p_drained jsonb, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Submit closes at the deadline shown on the page (keep in sync with DEADLINE in public/js/config.js)
  if now() > timestamptz '2026-11-15 13:00:00+02' then raise exception 'Submission closed on Sunday, Nov 15, at 13:00.'; end if;
  if p_id is null or length(p_id) < 8 or length(p_id) > 64 then raise exception 'bad id'; end if;
  if length(coalesce(p_diag::text, '')) > 20000 or length(coalesce(p_drained::text, '')) > 5000 or length(coalesce(p_answers::text, '')) > 1000 then
    raise exception 'too large';
  end if;
  insert into submissions(id, nick, diag, drained, answers, updated_at)
  values (p_id, left(coalesce(p_nick, ''), 254), coalesce(p_diag, '{}'), coalesce(p_drained, '[]'), coalesce(p_answers, '{}'), now())
  on conflict (id) do update set nick = excluded.nick, diag = excluded.diag, drained = excluded.drained,
    answers = excluded.answers, updated_at = now();
end $$;

create or replace function all_submissions(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_key is distinct from (select v from settings where k = 'instructor_key') then raise exception 'wrong key'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nick', nick, 'diag', diag, 'drained', drained, 'answers', answers, 'at', updated_at) order by updated_at) from submissions), '[]'::jsonb);
end $$;

revoke all on function submit_work(text, text, jsonb, jsonb, jsonb) from public;
revoke all on function all_submissions(text) from public;
grant execute on function submit_work(text, text, jsonb, jsonb, jsonb) to anon;
grant execute on function all_submissions(text) to anon;
notify pgrst, 'reload schema';
