-- Fluentdat on Supabase: paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again (it replaces what it made before).
--
-- Who can see what (enforced by Postgres row level security, not by the app):
--   * Anyone can make an account, but a stranger sees nothing: you only see servers you belong to.
--   * You join a server with an invite code that one of its admins made.
--   * Direct messages are visible only to the two people in them.
--   * You only see the profiles of people you share a server, a DM or a friendship with
--     (adding a friend looks up an exact @handle; nobody can list everyone).
--   * Nobody can post as somebody else, and only a server's admins can change its channels.

-- ===================== tables =====================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{1,24}$'),   -- the @name people add you by
  name text not null default '',
  color text not null default '#5b7fd6',
  avatar text not null default '',             -- a URL (Discord/GitHub picture) or a small data URL
  pronouns text not null default '',
  about text not null default '',
  status text not null default 'online',
  stickers jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '',
  img text not null default '',
  owner uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.server_members (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position int not null default 0
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'text' check (kind in ('text', 'voice')),
  position int not null default 0
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  text text check (char_length(text) <= 4000),
  sticker jsonb,
  action boolean not null default false,
  bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_by_channel on public.messages (channel_id, created_at);

create table if not exists public.invites (
  code text primary key,
  server_id uuid not null references public.servers (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  max_uses int,
  uses int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.dms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  dm_id uuid not null references public.dms (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  text text check (char_length(text) <= 4000),
  sticker jsonb,
  action boolean not null default false,
  bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_by_dm on public.dm_messages (dm_id, created_at);

create table if not exists public.friends (
  owner uuid not null references public.profiles (id) on delete cascade,
  friend uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner, friend),
  check (owner <> friend)
);

-- ===================== helpers used by the rules =====================
-- (security definer, so a rule can ask "is this person a member" without tripping over its own rules)
create or replace function public.is_member(p_server uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from server_members where server_id = p_server and user_id = auth.uid());
$$;

create or replace function public.is_admin(p_server uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from server_members where server_id = p_server and user_id = auth.uid() and role in ('owner', 'admin'));
$$;

create or replace function public.is_owner(p_server uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from servers where id = p_server and owner = auth.uid());
$$;

create or replace function public.channel_server(p_channel uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select server_id from channels where id = p_channel;
$$;

create or replace function public.in_dm(p_dm uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dms where id = p_dm and auth.uid() in (user_a, user_b));
$$;

-- someone you share a server, a DM or a friendship (either way) with — or yourself
create or replace function public.knows(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_other = auth.uid()
    or exists (select 1 from server_members a join server_members b on a.server_id = b.server_id
               where a.user_id = auth.uid() and b.user_id = p_other)
    or exists (select 1 from friends where (owner = auth.uid() and friend = p_other) or (owner = p_other and friend = auth.uid()))
    or exists (select 1 from dms where (user_a = auth.uid() and user_b = p_other) or (user_a = p_other and user_b = auth.uid()));
$$;

-- ===================== row level security =====================
alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.categories enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.invites enable row level security;
alter table public.dms enable row level security;
alter table public.dm_messages enable row level security;
alter table public.friends enable row level security;

drop policy if exists "see people you know" on public.profiles;
create policy "see people you know" on public.profiles for select to authenticated using (knows(id));
drop policy if exists "edit your own profile" on public.profiles;
create policy "edit your own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members see the server" on public.servers;
create policy "members see the server" on public.servers for select to authenticated using (is_member(id));
drop policy if exists "admins change the server" on public.servers;
create policy "admins change the server" on public.servers for update to authenticated using (is_admin(id)) with check (is_admin(id));
drop policy if exists "the owner deletes the server" on public.servers;
create policy "the owner deletes the server" on public.servers for delete to authenticated using (owner = auth.uid());

drop policy if exists "members see each other" on public.server_members;
create policy "members see each other" on public.server_members for select to authenticated using (is_member(server_id));
drop policy if exists "leave, or admins remove" on public.server_members;
create policy "leave, or admins remove" on public.server_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner')          -- anyone but the owner can leave
      or (role = 'member' and is_admin(server_id))           -- admins remove members
      or (role = 'admin' and is_owner(server_id)));          -- only the owner removes admins

drop policy if exists "members see categories" on public.categories;
create policy "members see categories" on public.categories for select to authenticated using (is_member(server_id));
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated using (is_admin(server_id)) with check (is_admin(server_id));

drop policy if exists "members see channels" on public.channels;
create policy "members see channels" on public.channels for select to authenticated using (is_member(server_id));
drop policy if exists "admins manage channels" on public.channels;
create policy "admins manage channels" on public.channels for all to authenticated using (is_admin(server_id)) with check (is_admin(server_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated using (is_member(channel_server(channel_id)));
drop policy if exists "members post as themselves" on public.messages;
create policy "members post as themselves" on public.messages for insert to authenticated
  with check (author = auth.uid() and is_member(channel_server(channel_id)));
drop policy if exists "authors or admins delete" on public.messages;
create policy "authors or admins delete" on public.messages for delete to authenticated
  using (author = auth.uid() or is_admin(channel_server(channel_id)));

drop policy if exists "admins see invites" on public.invites;
create policy "admins see invites" on public.invites for select to authenticated using (is_admin(server_id));
drop policy if exists "admins delete invites" on public.invites;
create policy "admins delete invites" on public.invites for delete to authenticated using (is_admin(server_id));

drop policy if exists "the two people see the dm" on public.dms;
create policy "the two people see the dm" on public.dms for select to authenticated using (auth.uid() in (user_a, user_b));

drop policy if exists "the two people read it" on public.dm_messages;
create policy "the two people read it" on public.dm_messages for select to authenticated using (in_dm(dm_id));
drop policy if exists "the two people write as themselves" on public.dm_messages;
create policy "the two people write as themselves" on public.dm_messages for insert to authenticated
  with check (author = auth.uid() and in_dm(dm_id));
drop policy if exists "authors delete their dm messages" on public.dm_messages;
create policy "authors delete their dm messages" on public.dm_messages for delete to authenticated using (author = auth.uid());

drop policy if exists "your own friends list" on public.friends;
create policy "your own friends list" on public.friends for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- ===================== actions (the only ways to do these) =====================
-- a new server: you own it, with a Text Channels category and #general
create or replace function public.create_server(p_name text, p_icon text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare sv uuid; cat uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  insert into servers (name, icon, owner) values (left(trim(p_name), 60), coalesce(p_icon, ''), auth.uid()) returning id into sv;
  insert into server_members (server_id, user_id, role) values (sv, auth.uid(), 'owner');
  insert into categories (server_id, name, position) values (sv, 'Text Channels', 0) returning id into cat;
  insert into channels (server_id, category_id, name, kind, position) values (sv, cat, 'general', 'text', 0);
  return sv;
end $$;

-- an invite code (admins only); 10 random characters
create or replace function public.create_invite(p_server uuid, p_max_uses int default null, p_hours int default 168)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_admin(p_server) then raise exception 'Only this server''s admins can make invites.'; end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into invites (code, server_id, created_by, max_uses, expires_at)
    values (c, p_server, auth.uid(), p_max_uses, case when p_hours is null then null else now() + make_interval(hours => p_hours) end);
  return c;
end $$;

-- join a server with a code
create or replace function public.join_server(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into inv from invites where code = trim(p_code) for update;
  if not found then raise exception 'That invite doesn''t exist.'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'That invite has expired.'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'That invite has been used up.'; end if;
  if not exists (select 1 from server_members where server_id = inv.server_id and user_id = auth.uid()) then
    insert into server_members (server_id, user_id) values (inv.server_id, auth.uid());
    update invites set uses = uses + 1 where code = inv.code;
  end if;
  return inv.server_id;
end $$;

-- make someone an admin, or a member again (the owner only)
create or replace function public.set_member_role(p_server uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner(p_server) then raise exception 'Only the owner can change roles.'; end if;
  if p_role not in ('admin', 'member') then raise exception 'A role is admin or member.'; end if;
  update server_members set role = p_role where server_id = p_server and user_id = p_user and role <> 'owner';
end $$;

-- find someone by their exact @handle (to add as a friend) — never a list
create or replace function public.find_user(p_handle text)
returns table (id uuid, handle text, name text, color text, avatar text)
language sql stable security definer set search_path = public as $$
  select id, handle, name, color, avatar from profiles where handle = lower(trim(both '@' from trim(p_handle))) limit 1;
$$;

-- open (or find) a DM. Allowed with someone you share a server with, or who has added you as a friend.
create or replace function public.open_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; d uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_other = auth.uid() then raise exception 'That''s you.'; end if;
  a := least(auth.uid(), p_other); b := greatest(auth.uid(), p_other);
  select id into d from dms where user_a = a and user_b = b;
  if d is not null then return d; end if;
  if not (exists (select 1 from server_members x join server_members y on x.server_id = y.server_id where x.user_id = auth.uid() and y.user_id = p_other)
          or exists (select 1 from friends where owner = p_other and friend = auth.uid())) then
    raise exception 'You can message people you share a server with, or who have added you as a friend.';
  end if;
  insert into dms (user_a, user_b) values (a, b) returning id into d;
  return d;
end $$;

-- a profile for every new account: a unique @handle from their Discord/GitHub name or email, and their picture
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; h text; n int := 0; meta jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  base := regexp_replace(lower(coalesce(meta ->> 'user_name', meta ->> 'preferred_username', meta ->> 'full_name', meta ->> 'name', split_part(coalesce(new.email, ''), '@', 1), '')), '[^a-z0-9_]', '', 'g');
  if base = '' then base := 'user'; end if;
  h := left(base, 24);
  while exists (select 1 from profiles where handle = h) loop n := n + 1; h := left(base, 20) || n; end loop;
  insert into profiles (id, handle, name, avatar)
    values (new.id, h, coalesce(meta -> 'custom_claims' ->> 'global_name', meta ->> 'full_name', meta ->> 'name', h), coalesce(meta ->> 'avatar_url', ''));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- only signed-in people may call the actions (the helpers only ever answer about the caller, so they're harmless)
revoke all on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid) from public, anon;
grant execute on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid) to authenticated;

-- ===================== who may touch the tables at all =====================
-- signed-in people go through the rules above; signed-out visitors get nothing
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends to authenticated;
revoke all on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends from anon;

-- ===================== live updates =====================
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.dm_messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.channels; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.categories; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.server_members; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.servers; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.dms; exception when duplicate_object then null; end;
  end if;
end $$;
