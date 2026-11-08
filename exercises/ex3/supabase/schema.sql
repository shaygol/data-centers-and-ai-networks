-- Miswire Hunt: database schema for Supabase (Postgres).
-- Run once in the Supabase SQL editor, then run the private seed.sql you got from the instructors.
-- Every table has row level security ON and NO policies, so the anon key cannot read or write
-- tables directly. The site talks only to the SECURITY DEFINER functions below. Students learn only
-- WHERE a confirmed fault is (its ports), never its explanation or the root-cause answers; those are
-- on the instructor page, for the discussion in class.

create table if not exists switch_list (id text primary key, ord int not null);
create table if not exists port_views (
  switch_id text not null, port text not null, expected text not null, discovered text not null,
  peer_hears text not null, phy text not null, err text not null, ord int not null,
  primary key (switch_id, port));
create table if not exists truth (
  switch_id text not null, port text not null, accepted text[] not null, fault_id int,
  primary key (switch_id, port));
create table if not exists faults (id int primary key, title text not null, explanation text not null, ref text not null);
create table if not exists rootcause_key (q text primary key, answer text not null);
create table if not exists settings (k text primary key, v text not null);
create table if not exists seats (
  email_hash text primary key, switch_id text not null references switch_list(id),
  joined_at timestamptz not null default now());
create table if not exists reports (
  switch_id text not null, port text not null, email_hash text not null, label text not null,
  updated_at timestamptz not null default now(),
  primary key (switch_id, port, email_hash));
create table if not exists suspects (
  email_hash text not null, pair text not null, created_at timestamptz not null default now(),
  primary key (email_hash, pair));
create table if not exists answers (
  email_hash text primary key, q1 text, q2 text, updated_at timestamptz not null default now());

alter table switch_list enable row level security;
alter table port_views enable row level security;
alter table truth enable row level security;
alter table faults enable row level security;
alter table rootcause_key enable row level security;
alter table settings enable row level security;
alter table seats enable row level security;
alter table reports enable row level security;
alter table answers enable row level security;
alter table suspects enable row level security;

-- helpers ------------------------------------------------------------------
create or replace function _check_hash(p_hash text) returns void language plpgsql as $$
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'bad identity';
  end if;
end $$;

create or replace function _pair_key(a text, b text) returns text language sql immutable as $$
  select case when (case left(a,2) when 'SP' then 0 when 'AG' then 1 else 2 end)
                  < (case left(b,2) when 'SP' then 0 when 'AG' then 1 else 2 end)
              then a || '|' || b else b || '|' || a end $$;

create or replace function _fault_pairs() returns table (pair text)
language sql stable as $$
  select distinct _pair_key(t.switch_id, split_part(pv.expected, ' ', 1))
  from truth t join port_views pv on pv.switch_id = t.switch_id and pv.port = t.port
  where t.fault_id is not null;
$$;

create or replace function _latest_reports() returns table (switch_id text, port text, label text)
language sql stable as $$
  select distinct on (r.switch_id, r.port) r.switch_id, r.port, r.label
  from reports r order by r.switch_id, r.port, r.updated_at desc;
$$;

create or replace function _fault_state() returns table (id int, confirmed boolean, title text, explanation text, ref text, ports jsonb)
language sql stable as $$
  select f.id,
         (count(distinct t.switch_id) filter (where lr.label = any(t.accepted)) >= 2) as confirmed,
         f.title, f.explanation, f.ref,
         jsonb_agg(jsonb_build_object('s', t.switch_id, 'p', t.port)) as ports
  from faults f
  join truth t on t.fault_id = f.id
  left join _latest_reports() lr on lr.switch_id = t.switch_id and lr.port = t.port
  group by f.id order by f.id;
$$;

-- student API --------------------------------------------------------------
create or replace function claim_seat(p_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  perform _check_hash(p_hash);
  select switch_id into s from seats where email_hash = p_hash;
  if s is not null then return s; end if;
  perform pg_advisory_xact_lock(4242);
  select sl.id into s from switch_list sl
    left join seats st on st.switch_id = sl.id
    group by sl.id order by count(st.email_hash), random() limit 1;
  insert into seats(email_hash, switch_id) values (p_hash, s);
  return s;
end $$;

create or replace function get_my_view(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  perform _check_hash(p_hash);
  select switch_id into s from seats where email_hash = p_hash;
  if s is null then return null; end if;
  return jsonb_build_object(
    'switch', s,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('port', port, 'expected', expected, 'discovered', discovered,
                       'peer_hears', peer_hears, 'phy', phy, 'err', err) order by ord)
                      from port_views where switch_id = s), '[]'::jsonb),
    'mine', coalesce((select jsonb_object_agg(port, label) from reports where email_hash = p_hash), '{}'::jsonb),
    'flags', coalesce((select jsonb_agg(pair order by created_at) from suspects where email_hash = p_hash), '[]'::jsonb),
    'answers', (select jsonb_build_object('q1', q1, 'q2', q2) from answers where email_hash = p_hash));
end $$;

-- Each student has 5 flags to put on links of the planned topology they suspect.
create or replace function toggle_suspect(p_hash text, p_pair text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; had boolean;
begin
  perform _check_hash(p_hash);
  if not exists (select 1 from seats where email_hash = p_hash) then raise exception 'no seat'; end if;
  if not exists (select 1 from port_views pv where _pair_key(pv.switch_id, split_part(pv.expected, ' ', 1)) = p_pair) then
    raise exception 'not a link in the plan';
  end if;
  delete from suspects where email_hash = p_hash and pair = p_pair returning true into had;
  if had is null then
    select count(*) into n from suspects where email_hash = p_hash;
    if n >= 5 then raise exception 'You have used all 5 flags. Remove one first.'; end if;
    insert into suspects(email_hash, pair) values (p_hash, p_pair);
  end if;
  return coalesce((select jsonb_agg(pair order by created_at) from suspects where email_hash = p_hash), '[]'::jsonb);
end $$;

create or replace function submit_report(p_hash text, p_labels jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare s text; k text; v text; n int := 0;
begin
  perform _check_hash(p_hash);
  select switch_id into s from seats where email_hash = p_hash;
  if s is null then raise exception 'no seat'; end if;
  for k, v in select * from jsonb_each_text(p_labels) loop
    if v in ('OK','MISWIRED','ONE_WAY','HIGH_ERRORS','LINK_DOWN','PEER_SILENT')
       and exists (select 1 from port_views where switch_id = s and port = k) then
      insert into reports(switch_id, port, email_hash, label) values (s, k, p_hash, v)
      on conflict (switch_id, port, email_hash) do update set label = excluded.label, updated_at = now();
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function submit_answers(p_hash text, p_q1 text, p_q2 text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_hash(p_hash);
  if not exists (select 1 from seats where email_hash = p_hash) then raise exception 'no seat'; end if;
  insert into answers(email_hash, q1, q2) values (p_hash, left(p_q1, 20), left(p_q2, 20))
  on conflict (email_hash) do update set q1 = excluded.q1, q2 = excluded.q2, updated_at = now();
end $$;

create or replace function fabric_status() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'seats', (select count(*) from seats),
    'reporters', (select count(distinct email_hash) from reports),
    'ports', coalesce((select jsonb_agg(jsonb_build_object('s', switch_id, 'p', port, 'l', label)) from _latest_reports()), '[]'::jsonb),
    'faults_total', (select count(*) from faults),
    'faults', coalesce((select jsonb_agg(case when confirmed
                         then jsonb_build_object('id', id, 'confirmed', true, 'ports', ports)
                         else jsonb_build_object('id', id, 'confirmed', false) end order by id) from _fault_state()), '[]'::jsonb),
    'flags', coalesce((select jsonb_object_agg(pair, c) from (select pair, count(*) c from suspects group by pair) f), '{}'::jsonb),
    'answered', (select count(*) from answers),
    'q1_correct', (select count(*) from answers a where a.q1 = (select answer from rootcause_key where q = 'q1')),
    'q2_correct', (select count(*) from answers a where a.q2 = (select answer from rootcause_key where q = 'q2')));
$$;

-- instructor API (needs the key stored in settings) -------------------------
create or replace function _check_key(p_key text) returns void language plpgsql as $$
begin
  if p_key is null or p_key <> (select v from settings where k = 'instructor_key') then
    raise exception 'wrong instructor key';
  end if;
end $$;

create or replace function instructor_status(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _check_key(p_key);
  return fabric_status() || jsonb_build_object(
    'all_faults', (select jsonb_agg(jsonb_build_object('id', id, 'confirmed', confirmed, 'title', title, 'explanation', explanation, 'ref', ref, 'ports', ports) order by id) from _fault_state()),
    'seat_map', (select jsonb_object_agg(sl.id, (select count(*) from seats s where s.switch_id = sl.id)) from switch_list sl),
    'q1', (select coalesce(jsonb_object_agg(q1, n), '{}'::jsonb) from (select q1, count(*) n from answers where q1 is not null group by q1) x),
    'q2', (select coalesce(jsonb_object_agg(q2, n), '{}'::jsonb) from (select q2, count(*) n from answers where q2 is not null group by q2) x),
    'flag_total', (select count(*) from suspects),
    'flag_hits', (select count(*) from suspects su where su.pair in (select pair from _fault_pairs())),
    'answer_key', (select jsonb_object_agg(q, answer) from rootcause_key),
    'wrong_flags', (select count(*) from _latest_reports() lr join truth t using (switch_id, port) where not lr.label = any(t.accepted)));
end $$;

create or replace function reset_game(p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_key(p_key);
  delete from reports; delete from answers; delete from suspects; delete from seats;
end $$;

-- only the API functions are callable from the browser
revoke all on all functions in schema public from public;
grant execute on function claim_seat(text), get_my_view(text), toggle_suspect(text, text), submit_report(text, jsonb),
  submit_answers(text, text, text), fabric_status(), instructor_status(text), reset_game(text) to anon, authenticated;
revoke all on function _check_hash(text), _latest_reports(), _fault_state(), _check_key(text), _pair_key(text, text), _fault_pairs() from anon, authenticated;
