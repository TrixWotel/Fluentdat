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
--   * A server can be made public (by its owner) so anyone signed in can find it in Discover and join.
--     Its admins can ban people, and a banned person can't come back by invite or from Discover.
--   * Friend requests: the person you ask sees your request (and can accept or ignore it); nobody else does.
--   * Group DMs hold up to 10 people, started and grown by people who are friends with whoever they add.
--   * Calls, voice messages and attachments only reach the people in that DM, group or server.

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
  banner text not null default '',             -- the top of your profile card: a small image (data URL) or a gradient like g:3
  plate text not null default '',              -- your nameplate, behind your name in member lists: an image or a gradient
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '',
  img text not null default '',
  banner text not null default '',             -- the picture at the top of the channel list: an image or a gradient
  description text not null default '',
  category text not null default '',           -- for Discover: Robotics, Gaming, Music…
  public boolean not null default false,       -- listed in Discover, and anyone signed in can join (the owner decides)
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

-- a server's own roles (a name and a colour, like "Builders" in orange), which its admins hand out
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '' check (color = '' or color ~ '^#[0-9a-fA-F]{6}$'),
  hoist boolean not null default true,         -- its people get their own group in the member list
  position int not null default 0
);
create table if not exists public.member_roles (
  server_id uuid not null,
  user_id uuid not null,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id),
  foreign key (server_id, user_id) references public.server_members (server_id, user_id) on delete cascade
);

-- people a server's admins have banned: they can't join again, by invite or from Discover
create table if not exists public.bans (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  banned_by uuid references public.profiles (id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- a group DM's people (a two-person DM keeps them in dms.user_a and dms.user_b)
create table if not exists public.dm_members (
  dm_id uuid not null references public.dms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (dm_id, user_id)
);

-- a call in a DM or group DM: who started it, and when it ended (the call itself goes straight between browsers)
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  dm_id uuid not null references public.dms (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  video boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists calls_by_dm on public.calls (dm_id, created_at);

-- what you've read, and how each place may tell you about new messages (a channel, a DM, or a whole server)
create table if not exists public.reads (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place uuid not null,
  read_at timestamptz not null default now(),
  muted_until timestamptz,                     -- muted until then ('infinity': until you turn it back on)
  notify text not null default 'default' check (notify in ('default', 'all', 'mentions', 'none')),
  primary key (user_id, place)
);

-- when someone last had Fluentdat open (for "N Online" on invite cards; only the heartbeat() action writes it)
create table if not exists public.seen (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  at timestamptz not null default now()
);

-- (running this again over an older Fluentdat: add what's new)
alter table public.profiles add column if not exists banner text not null default '';
alter table public.profiles add column if not exists plate text not null default '';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.servers add column if not exists banner text not null default '';
alter table public.servers add column if not exists description text not null default '';
alter table public.servers add column if not exists category text not null default '';
alter table public.servers add column if not exists public boolean not null default false;
alter table public.channels add column if not exists topic text not null default '';
alter table public.messages add column if not exists reply_to uuid;
alter table public.messages add column if not exists files jsonb;           -- attachments: pictures, files, voice messages
alter table public.dm_messages add column if not exists reply_to uuid;
alter table public.dm_messages add column if not exists files jsonb;
-- group DMs: a name, a picture and an owner, and no user_a/user_b (their people are in dm_members)
alter table public.dms add column if not exists kind text not null default 'dm';
alter table public.dms add column if not exists name text not null default '';
alter table public.dms add column if not exists icon text not null default '';
alter table public.dms add column if not exists owner uuid references public.profiles (id) on delete set null;
alter table public.dms alter column user_a drop not null;
alter table public.dms alter column user_b drop not null;
alter table public.dms drop constraint if exists dms_check;

-- pictures are kept small (the app shrinks them before saving), and these limits stop anyone filling the database
do $$ begin
  alter table public.profiles add constraint profiles_sizes check (char_length(avatar) <= 200000 and char_length(banner) <= 400000
    and char_length(plate) <= 200000 and char_length(about) <= 300 and char_length(name) <= 40 and char_length(pronouns) <= 40);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.servers add constraint servers_sizes check (char_length(img) <= 200000 and char_length(banner) <= 400000
    and char_length(description) <= 300 and char_length(category) <= 30);
exception when duplicate_object then null; end $$;
-- colours are colours and pictures are pictures (a web address here would let its owner see who looked at a profile)
do $$ begin
  alter table public.profiles add constraint profiles_shapes check (color ~ '^#[0-9a-fA-F]{6}$'
    and (avatar = '' or avatar ~ '^data:image/(png|jpeg|webp|gif);base64,' or avatar ~ '^https://(cdn\.discordapp\.com|avatars\.githubusercontent\.com)/')
    and (banner = '' or banner ~ '^g:[0-9]$' or banner ~ '^data:image/(png|jpeg|webp|gif);base64,')
    and (plate = '' or plate ~ '^g:[0-9]$' or plate ~ '^data:image/(png|jpeg|webp|gif);base64,'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.servers add constraint servers_shapes check ((img = '' or img ~ '^data:image/(png|jpeg|webp|gif);base64,')
    and (banner = '' or banner ~ '^g:[0-9]$' or banner ~ '^data:image/(png|jpeg|webp|gif);base64,'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dms add constraint dms_shape check ((kind = 'dm' and user_a is not null and user_b is not null and user_a < user_b)
    or (kind = 'group' and user_a is null and user_b is null and char_length(name) <= 100
        and (icon = '' or icon ~ '^data:image/(png|jpeg|webp|gif);base64,') and char_length(icon) <= 200000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.channels add constraint channels_topic_size check (char_length(topic) <= 1024);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_files_shape check (files is null or (jsonb_typeof(files) = 'array'
    and jsonb_array_length(files) between 1 and 10 and octet_length(files::text) <= 20000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_files_shape check (files is null or (jsonb_typeof(files) = 'array'
    and jsonb_array_length(files) between 1 and 10 and octet_length(files::text) <= 20000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_reply_fk foreign key (reply_to) references public.messages (id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_reply_fk foreign key (reply_to) references public.dm_messages (id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_sticker_shape check (sticker is null or coalesce(sticker ->> 'kind', '') <> 'img' or (sticker ->> 'data') ~ '^data:image/(png|jpeg|webp|gif);base64,');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_sticker_shape check (sticker is null or coalesce(sticker ->> 'kind', '') <> 'img' or (sticker ->> 'data') ~ '^data:image/(png|jpeg|webp|gif);base64,');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_sticker_size check (sticker is null or octet_length(sticker::text) <= 400000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_sticker_size check (sticker is null or octet_length(sticker::text) <= 400000);
exception when duplicate_object then null; end $$;

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
  select exists (select 1 from dms where id = p_dm and auth.uid() in (user_a, user_b))
      or exists (select 1 from dm_members where dm_id = p_dm and user_id = auth.uid());
$$;

-- a friend: you've both added each other (one of you asked, the other accepted)
create or replace function public.is_friend(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friends where owner = auth.uid() and friend = p_other)
     and exists (select 1 from friends where owner = p_other and friend = auth.uid());
$$;

-- someone you share a server, a DM or a friendship (either way) with — or yourself
create or replace function public.knows(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_other = auth.uid()
    or exists (select 1 from server_members a join server_members b on a.server_id = b.server_id
               where a.user_id = auth.uid() and b.user_id = p_other)
    or exists (select 1 from friends where (owner = auth.uid() and friend = p_other) or (owner = p_other and friend = auth.uid()))
    or exists (select 1 from dms where (user_a = auth.uid() and user_b = p_other) or (user_a = p_other and user_b = auth.uid()))
    or exists (select 1 from dm_members a join dm_members b on a.dm_id = b.dm_id where a.user_id = auth.uid() and b.user_id = p_other);
$$;

-- a call's live channel (Supabase Realtime, private): "call:<call id>" for the people in that DM, or
-- "vc:<voice channel id>" for the members of that server
create or replace function public.topic_ok(p_topic text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare t text := regexp_replace(coalesce(p_topic, ''), '^realtime:', ''); k text; v text;
begin
  k := split_part(t, ':', 1); v := split_part(t, ':', 2);
  if v !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or split_part(t, ':', 3) <> '' then return false; end if;
  if k = 'call' then return exists (select 1 from calls c where c.id = v::uuid and in_dm(c.dm_id)); end if;
  if k = 'vc' then return exists (select 1 from channels c where c.id = v::uuid and c.kind = 'voice' and is_member(c.server_id)); end if;
  return false;
end $$;

-- an attachment's place in storage: "dm/<dm id>/<uploader>/<file>" or "ch/<channel id>/<uploader>/<file>".
-- You may read it if you're in that DM or server, and upload it only as yourself.
create or replace function public.file_ok(p_name text, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare k text := split_part(p_name, '/', 1); place text := split_part(p_name, '/', 2); who text := split_part(p_name, '/', 3);
  re text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if place !~ re or who !~ re or split_part(p_name, '/', 4) !~ '^[0-9a-f-]{36}\.[a-z0-9]{1,8}$' or split_part(p_name, '/', 5) <> '' then return false; end if;
  if p_write and who <> auth.uid()::text then return false; end if;
  if k = 'dm' then return in_dm(place::uuid); end if;
  if k = 'ch' then return is_member(channel_server(place::uuid)); end if;
  return false;
end $$;

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
alter table public.roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.bans enable row level security;
alter table public.dm_members enable row level security;
alter table public.calls enable row level security;
alter table public.reads enable row level security;
alter table public.seen enable row level security;

drop policy if exists "see people you know" on public.profiles;
create policy "see people you know" on public.profiles for select to authenticated using (knows(id));
drop policy if exists "edit your own profile" on public.profiles;
create policy "edit your own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members see the server" on public.servers;
create policy "members see the server" on public.servers for select to authenticated using (is_member(id) or public);
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
drop policy if exists "the people in it see the dm" on public.dms;
create policy "the people in it see the dm" on public.dms for select to authenticated using (in_dm(id));
drop policy if exists "a group's people rename it" on public.dms;
create policy "a group's people rename it" on public.dms for update to authenticated using (kind = 'group' and in_dm(id)) with check (kind = 'group' and in_dm(id));

drop policy if exists "a group's people see each other" on public.dm_members;
create policy "a group's people see each other" on public.dm_members for select to authenticated using (in_dm(dm_id));
drop policy if exists "leave a group, or its owner removes you" on public.dm_members;
create policy "leave a group, or its owner removes you" on public.dm_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from dms d where d.id = dm_id and d.owner = auth.uid()));

drop policy if exists "the people in a dm see its calls" on public.calls;
create policy "the people in a dm see its calls" on public.calls for select to authenticated using (in_dm(dm_id));
drop policy if exists "start a call as yourself" on public.calls;
create policy "start a call as yourself" on public.calls for insert to authenticated with check (started_by = auth.uid() and in_dm(dm_id));
drop policy if exists "the people in a dm end its calls" on public.calls;
create policy "the people in a dm end its calls" on public.calls for update to authenticated using (in_dm(dm_id)) with check (in_dm(dm_id));

drop policy if exists "your own reading and muting" on public.reads;
create policy "your own reading and muting" on public.reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "the two people read it" on public.dm_messages;
create policy "the two people read it" on public.dm_messages for select to authenticated using (in_dm(dm_id));
drop policy if exists "the two people write as themselves" on public.dm_messages;
create policy "the two people write as themselves" on public.dm_messages for insert to authenticated
  with check (author = auth.uid() and in_dm(dm_id));
drop policy if exists "authors delete their dm messages" on public.dm_messages;
create policy "authors delete their dm messages" on public.dm_messages for delete to authenticated using (author = auth.uid());

-- a row "owner → friend" is a friend request until the other person adds one back; then you're friends
drop policy if exists "your own friends list" on public.friends;
drop policy if exists "see requests to and from you" on public.friends;
create policy "see requests to and from you" on public.friends for select to authenticated using (owner = auth.uid() or friend = auth.uid());
drop policy if exists "ask as yourself" on public.friends;
create policy "ask as yourself" on public.friends for insert to authenticated with check (owner = auth.uid());
drop policy if exists "cancel, ignore or unfriend" on public.friends;
create policy "cancel, ignore or unfriend" on public.friends for delete to authenticated using (owner = auth.uid() or friend = auth.uid());

drop policy if exists "members see roles" on public.roles;
create policy "members see roles" on public.roles for select to authenticated using (is_member(server_id));
drop policy if exists "admins manage roles" on public.roles;
create policy "admins manage roles" on public.roles for all to authenticated using (is_admin(server_id)) with check (is_admin(server_id));

drop policy if exists "members see who has which role" on public.member_roles;
create policy "members see who has which role" on public.member_roles for select to authenticated using (is_member(server_id));
drop policy if exists "admins give roles" on public.member_roles;
create policy "admins give roles" on public.member_roles for insert to authenticated
  with check (is_admin(server_id) and exists (select 1 from roles r where r.id = role_id and r.server_id = member_roles.server_id));
drop policy if exists "admins take roles away" on public.member_roles;
create policy "admins take roles away" on public.member_roles for delete to authenticated using (is_admin(server_id));

drop policy if exists "admins see bans" on public.bans;
create policy "admins see bans" on public.bans for select to authenticated using (is_admin(server_id));
drop policy if exists "admins lift bans" on public.bans;
create policy "admins lift bans" on public.bans for delete to authenticated using (is_admin(server_id));

-- admins may edit a server, but never hand it to someone else, and only the owner makes it public or private
create or replace function public.guard_server() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner is distinct from old.owner then raise exception 'A server''s owner can''t be changed.'; end if;
  if new.public is distinct from old.public and not is_owner(old.id) then raise exception 'Only the owner can make the server public or private.'; end if;
  return new;
end $$;
drop trigger if exists guard_server on public.servers;
create trigger guard_server before update on public.servers for each row execute function public.guard_server();

-- a group's people may rename it or change its picture; who's in it, and what kind of DM it is, never change this way.
-- Its owner can hand it on to someone in it (and becomes nobody if their account goes).
create or replace function public.guard_dm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind is distinct from old.kind or new.user_a is distinct from old.user_a or new.user_b is distinct from old.user_b
     or new.created_at is distinct from old.created_at then raise exception 'That can''t be changed.'; end if;
  if new.owner is distinct from old.owner and new.owner is not null and coalesce(current_setting('fluentdat.handover', true), '') <> 'on'
     and (old.owner is distinct from auth.uid() or not exists (select 1 from dm_members where dm_id = new.id and user_id = new.owner)) then
    raise exception 'Only a group''s owner can hand it to someone else in it.';
  end if;
  return new;
end $$;
drop trigger if exists guard_dm on public.dms;
create trigger guard_dm before update on public.dms for each row execute function public.guard_dm();

-- someone left a group: if it was the owner, the longest-standing member takes over; an empty group goes away
create or replace function public.after_leaving_group() returns trigger
language plpgsql security definer set search_path = public as $$
declare next uuid;
begin
  if not exists (select 1 from dms where id = old.dm_id) then return null; end if;    -- (the group itself is going)
  if not exists (select 1 from dm_members where dm_id = old.dm_id) then delete from dms where id = old.dm_id; return null; end if;
  if exists (select 1 from dms where id = old.dm_id and owner = old.user_id) then
    select user_id into next from dm_members where dm_id = old.dm_id order by joined_at, user_id limit 1;
    perform set_config('fluentdat.handover', 'on', true);
    update dms set owner = next where id = old.dm_id;
    perform set_config('fluentdat.handover', 'off', true);
  end if;
  return null;
end $$;
drop trigger if exists after_leaving_group on public.dm_members;
create trigger after_leaving_group after delete on public.dm_members for each row execute function public.after_leaving_group();

-- a call only ever gets its end time (once)
create or replace function public.guard_call() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dm_id is distinct from old.dm_id or new.started_by is distinct from old.started_by or new.video is distinct from old.video
     or new.created_at is distinct from old.created_at then raise exception 'Only a call''s end can change.'; end if;
  if old.ended_at is not null then new.ended_at := old.ended_at; end if;
  return new;
end $$;
drop trigger if exists guard_call on public.calls;
create trigger guard_call before update on public.calls for each row execute function public.guard_call();

-- a reply points at a message in the same conversation (or at nothing)
create or replace function public.guard_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reply_to is null then return new; end if;
  if TG_TABLE_NAME = 'messages' then
    if not exists (select 1 from messages where id = new.reply_to and channel_id = new.channel_id) then new.reply_to := null; end if;
  elsif not exists (select 1 from dm_messages where id = new.reply_to and dm_id = new.dm_id) then new.reply_to := null; end if;
  return new;
end $$;
drop trigger if exists guard_reply on public.messages;
create trigger guard_reply before insert on public.messages for each row execute function public.guard_reply();
drop trigger if exists guard_reply on public.dm_messages;
create trigger guard_reply before insert on public.dm_messages for each row execute function public.guard_reply();

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
  if exists (select 1 from bans where server_id = inv.server_id and user_id = auth.uid()) then raise exception 'You can''t join that server.'; end if;
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

-- a group DM with friends of yours (up to 10 people, you included), named or not
create or replace function public.create_group(p_users uuid[], p_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare d uuid; u uuid; people uuid[];
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  people := array(select distinct x from unnest(coalesce(p_users, '{}')) x where x is not null and x <> auth.uid());
  if cardinality(people) < 1 then raise exception 'Pick at least one friend.'; end if;
  if cardinality(people) > 9 then raise exception 'A group DM holds up to 10 people.'; end if;
  foreach u in array people loop
    if not is_friend(u) then raise exception 'You can only add your friends to a group DM.'; end if;
  end loop;
  insert into dms (kind, name, owner) values ('group', left(trim(coalesce(p_name, '')), 100), auth.uid()) returning id into d;
  insert into dm_members (dm_id, user_id, added_by) values (d, auth.uid(), auth.uid());
  insert into dm_members (dm_id, user_id, added_by) select d, x, auth.uid() from unnest(people) x;
  return d;
end $$;

-- add friends of yours to a group DM you're in
create or replace function public.add_to_group(p_dm uuid, p_users uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare u uuid; people uuid[];
begin
  if not exists (select 1 from dms where id = p_dm and kind = 'group') or not in_dm(p_dm) then raise exception 'You''re not in that group.'; end if;
  people := array(select distinct x from unnest(coalesce(p_users, '{}')) x where x is not null
                  and not exists (select 1 from dm_members m where m.dm_id = p_dm and m.user_id = x));
  foreach u in array people loop
    if not is_friend(u) then raise exception 'You can only add your friends to a group DM.'; end if;
  end loop;
  if (select count(*) from dm_members where dm_id = p_dm) + cardinality(people) > 10 then raise exception 'A group DM holds up to 10 people.'; end if;
  insert into dm_members (dm_id, user_id, added_by) select p_dm, x, auth.uid() from unnest(people) x;
end $$;

-- what's new for you: each channel and DM's unread messages, how many of them ping you, and when it last spoke.
-- (In a channel, a ping is your @name, @everyone or @here from an admin, or a reply to you. In a DM every message is one.)
create or replace function public.unread()
returns table (place uuid, unread int, mentions int, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id,
    (select count(*)::int from messages x where x.channel_id = c.id and x.author <> auth.uid() and x.created_at > coalesce(r.read_at, m.joined_at)),
    (select count(*)::int from messages x where x.channel_id = c.id and x.author <> auth.uid() and x.created_at > coalesce(r.read_at, m.joined_at)
       and (strpos(coalesce(x.text, ''), '<@' || auth.uid()::text || '>') > 0
            or (coalesce(x.text, '') ~ '(^|[^[:alnum:]_])@(everyone|here)([^[:alnum:]_]|$)'
                and exists (select 1 from server_members a where a.server_id = c.server_id and a.user_id = x.author and a.role in ('owner', 'admin')))
            or exists (select 1 from messages y where y.id = x.reply_to and y.author = auth.uid()))),
    (select max(x.created_at) from messages x where x.channel_id = c.id)
  from channels c
  join server_members m on m.server_id = c.server_id and m.user_id = auth.uid()
  left join reads r on r.user_id = auth.uid() and r.place = c.id
  union all
  select d.id, n.k, n.k, (select max(x.created_at) from dm_messages x where x.dm_id = d.id)
  from dms d
  left join reads r on r.user_id = auth.uid() and r.place = d.id
  cross join lateral (select count(*)::int as k from dm_messages x where x.dm_id = d.id and x.author <> auth.uid() and x.created_at > coalesce(r.read_at, d.created_at)) n
  where in_dm(d.id);
$$;

-- an invite's server, for the card a link turns into (anyone signed in who has the code may look)
create or replace function public.invite_info(p_code text)
returns table (server_id uuid, name text, icon text, img text, banner text, description text, created_at timestamptz,
               members int, online int, joined boolean, usable boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.icon, s.img, s.banner, s.description, s.created_at,
    (select count(*)::int from server_members m where m.server_id = s.id),
    (select count(*)::int from server_members m join seen w on w.user_id = m.user_id join profiles p on p.id = m.user_id
       where m.server_id = s.id and w.at > now() - interval '5 minutes' and p.status <> 'invisible'),
    is_member(s.id),
    (i.expires_at is null or i.expires_at > now()) and (i.max_uses is null or i.uses < i.max_uses)
      and not exists (select 1 from bans b where b.server_id = s.id and b.user_id = auth.uid())
  from invites i join servers s on s.id = i.server_id
  where i.code = lower(trim(coalesce(p_code, ''))) and auth.uid() is not null;
$$;

-- "I'm here": Fluentdat says this every few minutes while it's open
create or replace function public.heartbeat()
returns void language sql security definer set search_path = public as $$
  insert into seen (user_id, at) select auth.uid(), now() where auth.uid() is not null
    on conflict (user_id) do update set at = now();
$$;

-- Discover: public servers, biggest first (with how many people are in each), optionally searched or by category
create or replace function public.discover(p_query text default '', p_category text default '')
returns table (id uuid, name text, icon text, img text, banner text, description text, category text, members bigint, joined boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.icon, s.img, s.banner, s.description, s.category,
    (select count(*) from server_members m where m.server_id = s.id), is_member(s.id), s.created_at
  from servers s
  where s.public
    and (coalesce(p_category, '') = '' or s.category = p_category)
    and (coalesce(p_query, '') = '' or s.name ilike '%' || p_query || '%' or s.description ilike '%' || p_query || '%')
    and not exists (select 1 from bans b where b.server_id = s.id and b.user_id = auth.uid())
  order by 8 desc, s.created_at desc
  limit 60;
$$;

-- join a public server straight from Discover
create or replace function public.join_public(p_server uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from servers where id = p_server and public) then raise exception 'That server isn''t public.'; end if;
  if exists (select 1 from bans where server_id = p_server and user_id = auth.uid()) then raise exception 'You can''t join that server.'; end if;
  insert into server_members (server_id, user_id) values (p_server, auth.uid()) on conflict do nothing;
  return p_server;
end $$;

-- ban someone (and remove them). Admins ban members; only the owner bans an admin; nobody bans the owner.
create or replace function public.ban_member(p_server uuid, p_user uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare target text;
begin
  if not is_admin(p_server) then raise exception 'Only this server''s admins can ban people.'; end if;
  if p_user = auth.uid() then raise exception 'You can''t ban yourself.'; end if;
  if exists (select 1 from servers where id = p_server and owner = p_user) then raise exception 'Nobody can ban the owner.'; end if;
  select role into target from server_members where server_id = p_server and user_id = p_user;
  if target = 'admin' and not is_owner(p_server) then raise exception 'Only the owner can ban an admin.'; end if;
  insert into bans (server_id, user_id, banned_by, reason) values (p_server, p_user, auth.uid(), left(coalesce(p_reason, ''), 200))
    on conflict (server_id, user_id) do update set reason = excluded.reason, banned_by = excluded.banned_by, created_at = now();
  delete from server_members where server_id = p_server and user_id = p_user;
end $$;

-- the ban list, with who they are (they no longer share the server, so their profile isn't otherwise visible)
create or replace function public.server_bans(p_server uuid)
returns table (user_id uuid, handle text, name text, avatar text, reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.user_id, p.handle, p.name, p.avatar, b.reason, b.created_at
  from bans b join profiles p on p.id = b.user_id
  where b.server_id = p_server and is_admin(p_server)
  order by b.created_at desc;
$$;

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
    values (new.id, h, left(coalesce(meta -> 'custom_claims' ->> 'global_name', meta ->> 'full_name', meta ->> 'name', h), 40),
      case when (meta ->> 'avatar_url') ~ '^https://(cdn\.discordapp\.com|avatars\.githubusercontent\.com)/' then meta ->> 'avatar_url' else '' end);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- only signed-in people may call the actions (the helpers only ever answer about the caller, so they're harmless)
revoke all on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid), public.discover(text, text),
  public.join_public(uuid), public.ban_member(uuid, uuid, text), public.server_bans(uuid), public.create_group(uuid[], text),
  public.add_to_group(uuid, uuid[]), public.unread(), public.invite_info(text), public.heartbeat() from public, anon;
grant execute on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid), public.discover(text, text),
  public.join_public(uuid), public.ban_member(uuid, uuid, text), public.server_bans(uuid), public.create_group(uuid[], text),
  public.add_to_group(uuid, uuid[]), public.unread(), public.invite_info(text), public.heartbeat() to authenticated;
-- the rules call these helpers, so signed-in people need to be able to run them (granted here rather than left to the
-- project's defaults, so it works however the project was set up)
grant execute on function public.is_member(uuid), public.is_admin(uuid), public.is_owner(uuid), public.channel_server(uuid),
  public.in_dm(uuid), public.knows(uuid), public.is_friend(uuid), public.topic_ok(text), public.file_ok(text, boolean) to authenticated;

-- ===================== who may touch the tables at all =====================
-- signed-in people go through the rules above; signed-out visitors get nothing
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends,
  public.roles, public.member_roles, public.bans, public.dm_members, public.calls, public.reads, public.seen to authenticated;
revoke all on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends,
  public.roles, public.member_roles, public.bans, public.dm_members, public.calls, public.reads, public.seen from anon;

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
    begin alter publication supabase_realtime add table public.roles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.member_roles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.friends; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.dm_members; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.calls; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.reads; exception when duplicate_object then null; end;
  end if;
end $$;

-- ===================== attachments and voice messages (Supabase Storage) =====================
-- a private bucket: files are only ever fetched by signed-in people the rules above let in (10 MB each)
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit) values ('files', 'files', false, 10485760)
      on conflict (id) do update set public = false, file_size_limit = 10485760;
    execute 'drop policy if exists "fluentdat: read files where you are" on storage.objects';
    execute 'create policy "fluentdat: read files where you are" on storage.objects for select to authenticated using (bucket_id = ''files'' and public.file_ok(name, false))';
    execute 'drop policy if exists "fluentdat: upload files where you are" on storage.objects';
    execute 'create policy "fluentdat: upload files where you are" on storage.objects for insert to authenticated with check (bucket_id = ''files'' and public.file_ok(name, true))';
    execute 'drop policy if exists "fluentdat: delete your own files" on storage.objects';
    execute 'create policy "fluentdat: delete your own files" on storage.objects for delete to authenticated using (bucket_id = ''files'' and split_part(name, ''/'', 3) = auth.uid()::text)';
  end if;
exception when insufficient_privilege then raise notice 'Fluentdat: couldn''t set up file storage (%)', sqlerrm;
end $$;

-- ===================== calls (Supabase Realtime, private channels) =====================
-- browsers in a call find each other through a private channel only that DM's people (or that server's members) can join
do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "fluentdat: calls you are in (listen)" on realtime.messages';
    execute 'create policy "fluentdat: calls you are in (listen)" on realtime.messages for select to authenticated using (public.topic_ok(realtime.topic()))';
    execute 'drop policy if exists "fluentdat: calls you are in (talk)" on realtime.messages';
    execute 'create policy "fluentdat: calls you are in (talk)" on realtime.messages for insert to authenticated with check (public.topic_ok(realtime.topic()))';
  end if;
exception when insufficient_privilege then raise notice 'Fluentdat: couldn''t set up call channels (%)', sqlerrm;
end $$;
