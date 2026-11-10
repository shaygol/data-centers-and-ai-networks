-- Lesson map (public/lesson-map.html): the bubbles and the links between them.
-- Run once in the Supabase SQL Editor (it is safe to run again). Run submissions.sql first: it creates the settings table.
-- Anyone can read the map with map_get(). Every change needs the edit key, the 'map_key' row in the settings table.
-- Set the key once (pick your own long random value):
--   insert into settings(k, v) values ('map_key', '...') on conflict (k) do update set v = excluded.v;
-- Without that row every key is refused, so the map is read-only.
create table if not exists map_notes (
  id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists map_links (
  id text primary key,
  a text not null,
  b text not null
);
alter table map_notes enable row level security;
alter table map_links enable row level security;
revoke all on map_notes from anon, authenticated;
revoke all on map_links from anon, authenticated;

create or replace function map_require_key(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or p_key is distinct from (select v from settings where k = 'map_key') then raise exception 'wrong key'; end if;
end $$;

create or replace function map_check_key(p_key text)
returns boolean language sql security definer set search_path = public as $$
  select p_key is not null and p_key = (select v from settings where k = 'map_key');
$$;

create or replace function map_get()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'notes', coalesce((select jsonb_object_agg(id, data) from map_notes), '{}'::jsonb),
    'links', coalesce((select jsonb_object_agg(id, jsonb_build_object('a', a, 'b', b)) from map_links), '{}'::jsonb));
$$;

create or replace function map_set_note(p_key text, p_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform map_require_key(p_key);
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'bad id'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 8000 then raise exception 'bad data'; end if;
  if not exists (select 1 from map_notes where id = p_id) and (select count(*) from map_notes) >= 500 then raise exception 'too many bubbles'; end if;
  insert into map_notes(id, data, updated_at) values (p_id, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function map_delete_note(p_key text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform map_require_key(p_key);
  delete from map_links where a = p_id or b = p_id;
  delete from map_notes where id = p_id;
end $$;

create or replace function map_set_link(p_key text, p_id text, p_a text, p_b text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform map_require_key(p_key);
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,140}$' then raise exception 'bad id'; end if;
  if not exists (select 1 from map_notes where id = p_a) or not exists (select 1 from map_notes where id = p_b) then raise exception 'unknown bubble'; end if;
  insert into map_links(id, a, b) values (p_id, p_a, p_b)
  on conflict (id) do update set a = excluded.a, b = excluded.b;
end $$;

create or replace function map_delete_link(p_key text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform map_require_key(p_key);
  delete from map_links where id = p_id;
end $$;

revoke all on function map_require_key(text) from public, anon, authenticated;
revoke all on function map_check_key(text) from public;
revoke all on function map_get() from public;
revoke all on function map_set_note(text, text, jsonb) from public;
revoke all on function map_delete_note(text, text) from public;
revoke all on function map_set_link(text, text, text, text) from public;
revoke all on function map_delete_link(text, text) from public;
grant execute on function map_check_key(text) to anon;
grant execute on function map_get() to anon;
grant execute on function map_set_note(text, text, jsonb) to anon;
grant execute on function map_delete_note(text, text) to anon;
grant execute on function map_set_link(text, text, text, text) to anon;
grant execute on function map_delete_link(text, text) to anon;
notify pgrst, 'reload schema';
