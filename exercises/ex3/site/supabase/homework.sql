-- Unit 3 homework (Jupiter and SDN): answers to questions 1-3, sent by the one Submit on index.html.
-- Run once in the Supabase SQL Editor (it is safe to run again).
-- Students can only call submit_homework(); reading everything needs the instructor key
-- (the 'instructor_key' row in the settings table), same as the Miswire Hunt results.
create table if not exists homework_answers (
  email text primary key,
  name text not null default '',
  answers jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table homework_answers enable row level security;
revoke all on homework_answers from anon, authenticated;

create or replace function submit_homework(p_email text, p_name text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  -- Submit closes at the deadline shown on the page (keep in sync with DEADLINE in public/js/config.js)
  if now() > timestamptz '2026-11-15 13:00:00+02' then raise exception 'Submission closed on Sunday, Nov 15, at 13:00.'; end if;
  if e !~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(e) > 254 then raise exception 'bad email'; end if;
  if length(coalesce(p_answers::text, '')) > 20000 then raise exception 'too large'; end if;
  insert into homework_answers(email, name, answers, updated_at)
  values (e, left(coalesce(p_name, ''), 120), coalesce(p_answers, '{}'), now())
  on conflict (email) do update set name = excluded.name, answers = excluded.answers, updated_at = now();
end $$;

create or replace function all_homework(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_key is distinct from (select v from settings where k = 'instructor_key') then raise exception 'wrong key'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('email', email, 'name', name, 'answers', answers, 'at', updated_at) order by updated_at) from homework_answers), '[]'::jsonb);
end $$;

revoke all on function submit_homework(text, text, jsonb) from public;
revoke all on function all_homework(text) from public;
grant execute on function submit_homework(text, text, jsonb) to anon;
grant execute on function all_homework(text) to anon;
notify pgrst, 'reload schema';
