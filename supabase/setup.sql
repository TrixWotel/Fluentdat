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
--   * You can block someone: they can't message you, ask to be your friend or start a DM with you.
--   * Someone new can also make an account with a username and a password (no email), from a one-time link that only
--     the people who run Fluentdat (TrixWotel) can make.
--   * A server's admins add its own emoji and stickers (pictures, GIFs too); everyone signed in can see them.
--   * Reactions: anyone who can read a message can react to it (up to 20 different emoji a message); only your own come back off.
--   * A server's admins can give it a tag (up to 4 letters and a badge); its members may wear it on their profile, and
--     nobody can wear a tag that isn't from a server they're in.
--   * A category's permissions (like Discord's) say who may see its channels, post, attach files, react, ping @everyone,
--     delete others' messages, manage its channels or its permissions, make invites and join its voice channels, for
--     @everyone, a role or one member. Owners and admins may do everything. A private category is one @everyone can't see.

-- ===================== tables =====================
-- (passwords for accounts made from a one-time link are hashed with pgcrypto, which Supabase keeps in "extensions")
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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

-- the people who run Fluentdat (TrixWotel): they make the one-time links that let someone make an account, and read reports
create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade
);
-- a one-time link to make an account with a username and a password (no email), made by one of the people who run Fluentdat
create table if not exists public.app_invites (
  code text primary key,
  created_by uuid references public.profiles (id) on delete set null,
  note text not null default '' check (char_length(note) <= 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz
);
-- people you've blocked: they can't message you, ask to be your friend or start a DM with you, and you don't see their messages
create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
-- a profile or a message reported to the people who run Fluentdat
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target uuid references public.profiles (id) on delete cascade,
  place uuid,
  message uuid,
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);
-- a server's own emoji and stickers (their pictures are in the "expressions" storage bucket, in the server's folder)
create table if not exists public.server_emoji (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (name ~ '^[A-Za-z0-9_]{2,32}$'),
  path text not null,
  animated boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (server_id, name),
  check (path ~ ('^' || server_id::text || '/emoji/[0-9a-f-]{36}\.(png|gif|webp|jpg)$'))
);
create table if not exists public.server_stickers (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 30),
  emoji text not null default '' check (char_length(emoji) <= 32),
  description text not null default '' check (char_length(description) <= 100),
  path text not null,
  animated boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (path ~ ('^' || server_id::text || '/sticker/[0-9a-f-]{36}\.(png|gif|webp|jpg)$'))
);

-- reactions: an emoji under a message, from one person. Taking one back keeps its row, switched off, so the change
-- reaches everyone live (a deleted row couldn't say which conversation it was in)
create table if not exists public.reactions (
  message_id uuid not null,
  place uuid not null,                                   -- the channel or DM the message is in
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 80 and emoji !~ '\s'
    and (emoji ~ '^<a?:[A-Za-z0-9_]{2,32}:[0-9a-f-]{36}>$' or (char_length(emoji) <= 16 and emoji !~ '[<>]'))),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists reactions_place on public.reactions (place);

-- a category's permissions for @everyone, a role ('role:<id>') or one member ('member:<id>'): what they're allowed and denied
create table if not exists public.category_perms (
  category_id uuid not null references public.categories (id) on delete cascade,
  server_id uuid not null references public.servers (id) on delete cascade,
  target text not null check (target = 'everyone' or target ~ '^(role|member):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  allow text[] not null default '{}',
  deny text[] not null default '{}',
  primary key (category_id, target),
  check (allow <@ array['view','manage_channels','manage_perms','invite','send','attach','react','mention_everyone','manage_messages','connect']::text[] and deny <@ array['view','manage_channels','manage_perms','invite','send','attach','react','mention_everyone','manage_messages','connect']::text[])
);

-- what a profile shows besides its card, fetched when someone opens it (like Discord's): links to your accounts elsewhere
-- (Connections), the Board's widgets (games you like, want to play, your favourite) and the games you played lately
create table if not exists public.profile_extras (
  id uuid primary key references public.profiles (id) on delete cascade,
  connections jsonb not null default '[]'::jsonb,
  widgets jsonb not null default '[]'::jsonb,
  activity jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,                  -- the Quests you finished (their rewards are yours)
  updated_at timestamptz not null default now()
);

-- a server's events (Discord's): when, what, and where (one of its voice channels, or somewhere else)
create table if not exists public.server_events (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  channel_id uuid references public.channels (id) on delete set null,
  place text not null default '' check (length(place) <= 100),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists server_events_by_server on public.server_events (server_id, starts_at);
-- pinned messages: in a channel (or thread) or a DM, up to 50 each
create table if not exists public.pins (
  place uuid not null,
  message_id uuid not null,
  pinned_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (place, message_id)
);
-- who boosts a server (free here): 2 boosts make level 1, 7 level 2, 14 level 3, and each level holds more emoji and stickers
create table if not exists public.server_boosts (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);
-- who's interested in an event
create table if not exists public.event_interest (
  event_id uuid not null references public.server_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- (running this again over an older Fluentdat: add what's new)
alter table public.profiles add column if not exists banner text not null default '';
alter table public.profiles add column if not exists plate text not null default '';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
-- a profile's theme (two colours: the top and bottom of the card) and display name style (a font, an effect, colours)
alter table public.profiles add column if not exists theme1 text not null default '';
alter table public.profiles add column if not exists theme2 text not null default '';
alter table public.profiles add column if not exists name_font text not null default '';
alter table public.profiles add column if not exists name_effect text not null default '';
alter table public.profiles add column if not exists name_color1 text not null default '';
alter table public.profiles add column if not exists name_color2 text not null default '';
-- the server tag someone wears: copied from the server (by adopt_tag) so everyone who sees the profile sees the tag
alter table public.profiles add column if not exists tag_server uuid references public.servers (id) on delete set null;
alter table public.profiles add column if not exists tag text not null default '';
alter table public.profiles add column if not exists tag_badge text not null default '';
alter table public.profiles add column if not exists tag_color text not null default '';
-- the game you say you're playing, and since when (shown under your name, as on Discord)
alter table public.profiles add column if not exists playing jsonb;
-- what you picked in the Shop: an avatar decoration and a profile effect (by name; Fluentdat draws them); the Quests done
alter table public.profiles add column if not exists decoration text not null default '';
alter table public.profiles add column if not exists effect text not null default '';
alter table public.profile_extras add column if not exists quests jsonb not null default '[]'::jsonb;
-- what a server's sidebar offers above its channels (Browse Channels, Game Servers, Server Guide, Events), its Server
-- Guide (a welcome, to-dos and resource pages), and the game servers its people play on
alter table public.servers add column if not exists features jsonb not null default '{}'::jsonb;
alter table public.servers add column if not exists guide jsonb not null default '{}'::jsonb;
alter table public.servers add column if not exists game_servers jsonb not null default '[]'::jsonb;
-- threads (Discord's): a channel of its own under a text channel (maybe started from one of its messages), sharing its
-- category, so its permissions are the channel's; archived ones leave the list until someone posts again
alter table public.channels add column if not exists parent_id uuid references public.channels (id) on delete cascade;
alter table public.channels add column if not exists starter uuid;
alter table public.channels add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.channels add column if not exists archived boolean not null default false;
create index if not exists channels_by_parent on public.channels (parent_id);
create unique index if not exists channels_one_thread_a_message on public.channels (starter) where starter is not null;
-- your name in a server (Edit Per-server Profile), and whether its people can start DMs with you (Privacy Settings)
alter table public.server_members add column if not exists nick text not null default '';
alter table public.server_members add column if not exists allow_dms boolean not null default true;
alter table public.servers add column if not exists tag text not null default '';
alter table public.servers add column if not exists tag_badge text not null default '';
alter table public.servers add column if not exists tag_color text not null default '';
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
-- a forwarded message says where it came from: { from, by, at }
alter table public.messages add column if not exists forwarded jsonb;
alter table public.dm_messages add column if not exists forwarded jsonb;

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
-- (a banner or nameplate: a picture, one of the ten gradients, or any colour or two)
alter table public.profiles drop constraint if exists profiles_shapes;
alter table public.profiles add constraint profiles_shapes check (color ~ '^#[0-9a-fA-F]{6}$'
  and (avatar = '' or avatar ~ '^data:image/(png|jpeg|webp|gif);base64,' or avatar ~ '^https://(cdn\.discordapp\.com|avatars\.githubusercontent\.com)/')
  and (banner = '' or banner ~ '^(g:[0-9]|#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?)$' or banner ~ '^data:image/(png|jpeg|webp|gif);base64,')
  and (plate = '' or plate ~ '^(g:[0-9]|#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?)$' or plate ~ '^data:image/(png|jpeg|webp|gif);base64,'));
alter table public.profiles drop constraint if exists profiles_style;
alter table public.profiles add constraint profiles_style check ((theme1 = '' or theme1 ~ '^#[0-9a-fA-F]{6}$') and (theme2 = '' or theme2 ~ '^#[0-9a-fA-F]{6}$')
  and name_font ~ '^[a-z0-9]{0,16}$' and name_effect ~ '^[a-z]{0,16}$'
  and (name_color1 = '' or name_color1 ~ '^#[0-9a-fA-F]{6}$') and (name_color2 = '' or name_color2 ~ '^#[0-9a-fA-F]{6}$')
  and tag ~ '^[A-Za-z0-9]{0,4}$' and tag_badge ~ '^[a-z0-9]{0,20}$' and (tag_color = '' or tag_color ~ '^#[0-9a-fA-F]{6}$'));
alter table public.profiles drop constraint if exists profiles_cosmetics;
alter table public.profiles add constraint profiles_cosmetics check (decoration ~ '^[a-z0-9-]{0,24}$' and effect ~ '^[a-z0-9-]{0,24}$');
alter table public.channels drop constraint if exists channels_kind_check;
alter table public.channels add constraint channels_kind_check check (kind in ('text', 'voice', 'thread'));
alter table public.channels drop constraint if exists channels_thread_shape;
alter table public.channels add constraint channels_thread_shape check ((kind = 'thread') = (parent_id is not null));
alter table public.server_members drop constraint if exists server_members_nick;
alter table public.server_members add constraint server_members_nick check (char_length(nick) <= 32 and nick !~ '[[:cntrl:]]');
alter table public.servers drop constraint if exists servers_shapes;
alter table public.servers add constraint servers_shapes check ((img = '' or img ~ '^data:image/(png|jpeg|webp|gif);base64,')
  and (banner = '' or banner ~ '^(g:[0-9]|#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?)$' or banner ~ '^data:image/(png|jpeg|webp|gif);base64,'));
alter table public.servers drop constraint if exists servers_tag;
alter table public.servers add constraint servers_tag check (tag ~ '^[A-Za-z0-9]{0,4}$' and tag_badge ~ '^[a-z0-9]{0,20}$' and (tag_color = '' or tag_color ~ '^#[0-9a-fA-F]{6}$'));
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

do $$ begin
  alter table public.messages add constraint messages_forwarded_shape check (forwarded is null or (jsonb_typeof(forwarded) = 'object' and octet_length(forwarded::text) <= 1000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_forwarded_shape check (forwarded is null or (jsonb_typeof(forwarded) = 'object' and octet_length(forwarded::text) <= 1000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_sticker_server check (sticker is null or coalesce(sticker ->> 'kind', '') <> 'server' or (sticker ->> 'path') ~ '^[0-9a-f-]{36}/sticker/[0-9a-f-]{36}\.(png|gif|webp|jpg)$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dm_messages add constraint dm_messages_sticker_server check (sticker is null or coalesce(sticker ->> 'kind', '') <> 'server' or (sticker ->> 'path') ~ '^[0-9a-f-]{36}/sticker/[0-9a-f-]{36}\.(png|gif|webp|jpg)$');
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
  if k = 'vc' then return exists (select 1 from channels c where c.id = v::uuid and c.kind = 'voice' and chan_can(c.id, 'connect')); end if;
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
  if k = 'ch' then return chan_can(place::uuid, case when p_write then 'attach' else 'view' end); end if;
  return false;
end $$;

-- one of the people who run Fluentdat?
create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

-- has either of you blocked the other?
create or replace function public.blocked_with(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = auth.uid() and blocked = p_other) or (blocker = p_other and blocked = auth.uid()));
$$;

-- a two-person DM where one of them has blocked the other (nobody writes in it then)
create or replace function public.dm_blocked(p_dm uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dms d join blocks b on (b.blocker = d.user_a and b.blocked = d.user_b) or (b.blocker = d.user_b and b.blocked = d.user_a)
                 where d.id = p_dm and d.kind = 'dm');
$$;

-- a server emoji's or sticker's picture: "<server id>/emoji/<file>" or "<server id>/sticker/<file>", added or removed by that server's admins
create or replace function public.expression_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sv text := split_part(p_name, '/', 1);
begin
  if sv !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or split_part(p_name, '/', 2) not in ('emoji', 'sticker')
     or split_part(p_name, '/', 3) !~ '^[0-9a-f-]{36}\.(png|gif|webp|jpg)$' or split_part(p_name, '/', 4) <> '' then return false; end if;
  return is_admin(sv::uuid);
end $$;

-- what someone may do in a category: owners and admins anything; members see, post, attach, react and join voice unless
-- the category says otherwise (@everyone first, then their roles, denies before allows, then them by name)
create or replace function public.perm_for(p_user uuid, p_category uuid, p_perm text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sv uuid; r text; ok boolean; o category_perms%rowtype;
begin
  if p_user is null then return false; end if;
  select server_id into sv from categories where id = p_category;
  if sv is null then return false; end if;
  select role into r from server_members where server_id = sv and user_id = p_user;
  if r is null then return false; end if;
  if r in ('owner', 'admin') then return true; end if;
  ok := p_perm in ('view', 'send', 'attach', 'react', 'connect');
  select * into o from category_perms where category_id = p_category and target = 'everyone';
  if found then
    if p_perm = any(o.deny) then ok := false; end if;
    if p_perm = any(o.allow) then ok := true; end if;
  end if;
  if exists (select 1 from category_perms cp join member_roles mr on cp.target = 'role:' || mr.role_id::text
             where cp.category_id = p_category and mr.server_id = sv and mr.user_id = p_user and p_perm = any(cp.deny)) then ok := false; end if;
  if exists (select 1 from category_perms cp join member_roles mr on cp.target = 'role:' || mr.role_id::text
             where cp.category_id = p_category and mr.server_id = sv and mr.user_id = p_user and p_perm = any(cp.allow)) then ok := true; end if;
  select * into o from category_perms where category_id = p_category and target = 'member:' || p_user::text;
  if found then
    if p_perm = any(o.deny) then ok := false; end if;
    if p_perm = any(o.allow) then ok := true; end if;
  end if;
  return ok;
end $$;
-- …in a channel: its category's say (nothing works where you can't see), or a member's usual rights outside any category
create or replace function public.chan_perm(p_user uuid, p_channel uuid, p_perm text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c channels%rowtype; r text;
begin
  select * into c from channels where id = p_channel;
  if not found or p_user is null then return false; end if;
  if c.category_id is null then
    select role into r from server_members where server_id = c.server_id and user_id = p_user;
    return r in ('owner', 'admin') or (r is not null and p_perm in ('view', 'send', 'attach', 'react', 'connect'));
  end if;
  if p_perm <> 'view' and not perm_for(p_user, c.category_id, 'view') then return false; end if;
  return perm_for(p_user, c.category_id, p_perm);
end $$;
-- …and for you (what the rules ask)
create or replace function public.cat_can(p_category uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select perm_for(auth.uid(), p_category, p_perm);
$$;
create or replace function public.chan_can(p_channel uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select chan_perm(auth.uid(), p_channel, p_perm);
$$;

-- can you read this channel or DM? and is this message in it?
create or replace function public.place_ok(p_place uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from channels where id = p_place) then chan_can(p_place, 'view') else in_dm(p_place) end;
$$;
-- may you react there?
create or replace function public.react_ok(p_place uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from channels where id = p_place) then chan_can(p_place, 'react') else in_dm(p_place) end;
$$;
-- …or join in with an emoji someone already put on that message (as on Discord: Add Reactions is about new ones)
create or replace function public.react_with(p_place uuid, p_message uuid, p_emoji text) returns boolean
language sql stable security definer set search_path = public as $$
  select react_ok(p_place) or (place_ok(p_place) and exists (select 1 from reactions
    where message_id = p_message and place = p_place and emoji = p_emoji and active and user_id <> auth.uid()));
$$;
create or replace function public.message_in(p_message uuid, p_place uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from messages where id = p_message and channel_id = p_place)
      or exists (select 1 from dm_messages where id = p_message and dm_id = p_place);
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
-- a server's events: seen by its members; made by its admins (and its members, when the server lets them); changed or
-- cancelled by whoever made them, or an admin. Who's interested: seen by the members, said by each for themselves
create or replace function public.can_make_events(p_server uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(p_server) or (is_member(p_server) and coalesce((select (features->>'member_events')::boolean from servers where id = p_server), false));
$$;
alter table public.server_events enable row level security;
drop policy if exists "members see their servers' events" on public.server_events;
create policy "members see their servers' events" on public.server_events for select to authenticated using (is_member(server_id));
drop policy if exists "make events" on public.server_events;
create policy "make events" on public.server_events for insert to authenticated with check (created_by = auth.uid() and can_make_events(server_id));
drop policy if exists "change events" on public.server_events;
create policy "change events" on public.server_events for update to authenticated
  using (is_member(server_id) and (is_admin(server_id) or created_by = auth.uid())) with check (is_admin(server_id) or created_by = auth.uid());
drop policy if exists "cancel events" on public.server_events;
create policy "cancel events" on public.server_events for delete to authenticated using (is_member(server_id) and (is_admin(server_id) or created_by = auth.uid()));
alter table public.event_interest enable row level security;
drop policy if exists "see who's interested" on public.event_interest;
create policy "see who's interested" on public.event_interest for select to authenticated
  using (exists (select 1 from server_events e where e.id = event_id and is_member(e.server_id)));
drop policy if exists "say you're interested" on public.event_interest;
create policy "say you're interested" on public.event_interest for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from server_events e where e.id = event_id and is_member(e.server_id)));
drop policy if exists "take it back" on public.event_interest;
create policy "take it back" on public.event_interest for delete to authenticated using (user_id = auth.uid());

-- pinned messages: seen by whoever can read the place; pinned and unpinned by whoever may manage its messages (anyone
-- in a DM)
create or replace function public.pin_ok(p_place uuid, p_message uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from channels where id = p_place)
    then exists (select 1 from messages where id = p_message and channel_id = p_place) and chan_can(p_place, 'manage_messages')
    else in_dm(p_place) and exists (select 1 from dm_messages where id = p_message and dm_id = p_place) end;
$$;
alter table public.pins enable row level security;
drop policy if exists "see the pins where you read" on public.pins;
create policy "see the pins where you read" on public.pins for select to authenticated using (place_ok(place));
drop policy if exists "pin" on public.pins;
create policy "pin" on public.pins for insert to authenticated with check (pinned_by = auth.uid() and pin_ok(place, message_id));
drop policy if exists "unpin" on public.pins;
create policy "unpin" on public.pins for delete to authenticated using (pin_ok(place, message_id));
-- boosts: the server's members see them; each boosts (and stops) for themselves
alter table public.server_boosts enable row level security;
drop policy if exists "members see the boosts" on public.server_boosts;
create policy "members see the boosts" on public.server_boosts for select to authenticated using (is_member(server_id));
drop policy if exists "boost" on public.server_boosts;
create policy "boost" on public.server_boosts for insert to authenticated with check (user_id = auth.uid() and is_member(server_id));
drop policy if exists "stop boosting" on public.server_boosts;
create policy "stop boosting" on public.server_boosts for delete to authenticated using (user_id = auth.uid());
-- whoever started a thread can remove it (admins and channel managers can anyway)
drop policy if exists "remove your threads" on public.channels;
create policy "remove your threads" on public.channels for delete to authenticated using (kind = 'thread' and created_by = auth.uid());

-- a profile's Connections, widgets and activity: seen by whoever can see the profile, kept by its owner
alter table public.profile_extras enable row level security;
drop policy if exists "see the extras of people you know" on public.profile_extras;
create policy "see the extras of people you know" on public.profile_extras for select to authenticated using (knows(id));
drop policy if exists "keep your own extras" on public.profile_extras;
create policy "keep your own extras" on public.profile_extras for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

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
create policy "members see categories" on public.categories for select to authenticated using (is_member(server_id) and cat_can(id, 'view'));
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated using (is_admin(server_id)) with check (is_admin(server_id));
drop policy if exists "managers rename categories" on public.categories;
create policy "managers rename categories" on public.categories for update to authenticated using (cat_can(id, 'manage_channels')) with check (cat_can(id, 'manage_channels'));

drop policy if exists "members see channels" on public.channels;
create policy "members see channels" on public.channels for select to authenticated using (is_member(server_id) and chan_can(id, 'view'));
drop policy if exists "admins manage channels" on public.channels;
create policy "admins manage channels" on public.channels for all to authenticated using (is_admin(server_id)) with check (is_admin(server_id));
drop policy if exists "managers manage their category's channels" on public.channels;
create policy "managers manage their category's channels" on public.channels for all to authenticated
  using (category_id is not null and cat_can(category_id, 'manage_channels')) with check (category_id is not null and cat_can(category_id, 'manage_channels'));

-- a category's permissions: seen by the server's members (so a category made private for you leaves your screen at
-- once), changed by admins and whoever may manage its permissions
alter table public.category_perms enable row level security;
drop policy if exists "see a category's permissions" on public.category_perms;
create policy "see a category's permissions" on public.category_perms for select to authenticated using (is_member(server_id));
drop policy if exists "change a category's permissions" on public.category_perms;
create policy "change a category's permissions" on public.category_perms for all to authenticated
  using (cat_can(category_id, 'manage_perms')) with check (cat_can(category_id, 'manage_perms'));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated using (chan_can(channel_id, 'view'));
drop policy if exists "members post as themselves" on public.messages;
create policy "members post as themselves" on public.messages for insert to authenticated
  with check (author = auth.uid() and chan_can(channel_id, 'send')
    and (files is null or jsonb_array_length(files) = 0 or chan_can(channel_id, 'attach')));
drop policy if exists "authors or admins delete" on public.messages;
create policy "authors or admins delete" on public.messages for delete to authenticated
  using (author = auth.uid() or is_admin(channel_server(channel_id)) or chan_can(channel_id, 'manage_messages'));

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
create policy "start a call as yourself" on public.calls for insert to authenticated with check (started_by = auth.uid() and in_dm(dm_id) and not dm_blocked(dm_id));
drop policy if exists "the people in a dm end its calls" on public.calls;
create policy "the people in a dm end its calls" on public.calls for update to authenticated using (in_dm(dm_id)) with check (in_dm(dm_id));

drop policy if exists "your own reading and muting" on public.reads;
create policy "your own reading and muting" on public.reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "the two people read it" on public.dm_messages;
create policy "the two people read it" on public.dm_messages for select to authenticated using (in_dm(dm_id));
drop policy if exists "the two people write as themselves" on public.dm_messages;
create policy "the two people write as themselves" on public.dm_messages for insert to authenticated
  with check (author = auth.uid() and in_dm(dm_id) and not dm_blocked(dm_id));
drop policy if exists "authors delete their dm messages" on public.dm_messages;
create policy "authors delete their dm messages" on public.dm_messages for delete to authenticated using (author = auth.uid());

-- a row "owner → friend" is a friend request until the other person adds one back; then you're friends
drop policy if exists "your own friends list" on public.friends;
drop policy if exists "see requests to and from you" on public.friends;
create policy "see requests to and from you" on public.friends for select to authenticated using (owner = auth.uid() or friend = auth.uid());
drop policy if exists "ask as yourself" on public.friends;
create policy "ask as yourself" on public.friends for insert to authenticated with check (owner = auth.uid() and not blocked_with(friend));
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

alter table public.app_admins enable row level security;
alter table public.app_invites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.server_emoji enable row level security;
alter table public.server_stickers enable row level security;

drop policy if exists "see whether you're one" on public.app_admins;
create policy "see whether you're one" on public.app_admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "the people who run fluentdat see its links" on public.app_invites;
create policy "the people who run fluentdat see its links" on public.app_invites for select to authenticated using (is_app_admin());
drop policy if exists "the people who run fluentdat take back unused links" on public.app_invites;
create policy "the people who run fluentdat take back unused links" on public.app_invites for delete to authenticated using (is_app_admin() and used_by is null);

-- (blocking and unblocking go through block_user() and unblock_user(); you only ever see your own list)
drop policy if exists "your own blocks" on public.blocks;
create policy "your own blocks" on public.blocks for select to authenticated using (blocker = auth.uid());

drop policy if exists "report as yourself" on public.reports;
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter = auth.uid());
drop policy if exists "your reports, or every one for the people who run fluentdat" on public.reports;
create policy "your reports, or every one for the people who run fluentdat" on public.reports for select to authenticated using (reporter = auth.uid() or is_app_admin());
drop policy if exists "the people who run fluentdat resolve reports" on public.reports;
create policy "the people who run fluentdat resolve reports" on public.reports for update to authenticated using (is_app_admin()) with check (is_app_admin());

-- server emoji and stickers show wherever they're used, so everyone signed in can see them; a server's admins manage its own
drop policy if exists "everyone signed in sees server emoji" on public.server_emoji;
create policy "everyone signed in sees server emoji" on public.server_emoji for select to authenticated using (true);
drop policy if exists "admins add emoji" on public.server_emoji;
create policy "admins add emoji" on public.server_emoji for insert to authenticated with check (is_admin(server_id) and created_by = auth.uid());
drop policy if exists "admins rename emoji" on public.server_emoji;
create policy "admins rename emoji" on public.server_emoji for update to authenticated using (is_admin(server_id)) with check (is_admin(server_id));
drop policy if exists "admins remove emoji" on public.server_emoji;
create policy "admins remove emoji" on public.server_emoji for delete to authenticated using (is_admin(server_id));

drop policy if exists "everyone signed in sees server stickers" on public.server_stickers;
create policy "everyone signed in sees server stickers" on public.server_stickers for select to authenticated using (true);
drop policy if exists "admins add stickers" on public.server_stickers;
create policy "admins add stickers" on public.server_stickers for insert to authenticated with check (is_admin(server_id) and created_by = auth.uid());
drop policy if exists "admins change stickers" on public.server_stickers;
create policy "admins change stickers" on public.server_stickers for update to authenticated using (is_admin(server_id)) with check (is_admin(server_id));
drop policy if exists "admins remove stickers" on public.server_stickers;
create policy "admins remove stickers" on public.server_stickers for delete to authenticated using (is_admin(server_id));

-- reactions: seen by whoever can read the message, and made by whoever may react there (or joins in with one already
-- on it); only your own can be switched off (or deleted), and switching one off is always allowed
alter table public.reactions enable row level security;
drop policy if exists "see reactions where you read" on public.reactions;
create policy "see reactions where you read" on public.reactions for select to authenticated using (place_ok(place));
drop policy if exists "react where you read" on public.reactions;
create policy "react where you read" on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and react_with(place, message_id, emoji) and message_in(message_id, place));
drop policy if exists "switch your reactions on and off" on public.reactions;
create policy "switch your reactions on and off" on public.reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and (not active or react_with(place, message_id, emoji)));
drop policy if exists "remove your reactions" on public.reactions;
create policy "remove your reactions" on public.reactions for delete to authenticated using (user_id = auth.uid());

-- an emoji or sticker keeps its server, picture and maker (only its name, and a sticker's emoji and description, change),
-- and a server holds up to 50 emoji and 30 stickers
create or replace function public.guard_expression() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if new.server_id is distinct from old.server_id or new.path is distinct from old.path or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at or new.animated is distinct from old.animated then
      raise exception 'Only an emoji''s or sticker''s name (and a sticker''s emoji and description) can change.';
    end if;
    return new;
  end if;
  if TG_TABLE_NAME = 'server_emoji' and (select count(*) from server_emoji where server_id = new.server_id) >= (array[50, 100, 150, 250])[boost_level(new.server_id) + 1] then
    raise exception 'This server holds up to % emoji (boosting it holds more).', (array[50, 100, 150, 250])[boost_level(new.server_id) + 1];
  end if;
  if TG_TABLE_NAME = 'server_stickers' and (select count(*) from server_stickers where server_id = new.server_id) >= (array[30, 45, 60, 90])[boost_level(new.server_id) + 1] then
    raise exception 'This server holds up to % stickers (boosting it holds more).', (array[30, 45, 60, 90])[boost_level(new.server_id) + 1];
  end if;
  return new;
end $$;
drop trigger if exists guard_expression on public.server_emoji;
create trigger guard_expression before insert or update on public.server_emoji for each row execute function public.guard_expression();
drop trigger if exists guard_expression on public.server_stickers;
create trigger guard_expression before insert or update on public.server_stickers for each row execute function public.guard_expression();

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

-- a reaction keeps its message, person and emoji (only whether it's on changes), and a message holds up to 20 different ones
create or replace function public.guard_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and (new.message_id, new.place, new.user_id, new.emoji, new.created_at)
      is distinct from (old.message_id, old.place, old.user_id, old.emoji, old.created_at) then
    raise exception 'Only whether a reaction is on can change.';
  end if;
  new.updated_at := now();
  if new.active and (TG_OP = 'INSERT' or not old.active)
     and not exists (select 1 from reactions where message_id = new.message_id and emoji = new.emoji and active and user_id <> new.user_id)
     and (select count(distinct emoji) from reactions where message_id = new.message_id and active) >= 20 then
    raise exception 'A message can have up to 20 different reactions.';
  end if;
  return new;
end $$;
drop trigger if exists guard_reaction on public.reactions;
create trigger guard_reaction before insert or update on public.reactions for each row execute function public.guard_reaction();
-- a channel or category stays in its server, and a channel's category is one of that server's
create or replace function public.guard_place() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and new.server_id is distinct from old.server_id then raise exception 'A channel or category stays in its server.'; end if;
  -- (a thread belongs to a text channel in the same server, and keeps that channel's category)
  if TG_TABLE_NAME = 'channels' and to_jsonb(new) ->> 'kind' = 'thread' and not exists (select 1 from channels p
     where p.id = (to_jsonb(new) ->> 'parent_id')::uuid and p.server_id = new.server_id and p.kind = 'text' and p.category_id is not distinct from (to_jsonb(new) ->> 'category_id')::uuid) then
    raise exception 'A thread belongs to a text channel in its server.';
  end if;
  -- (to_jsonb: a category has no category_id of its own, and plpgsql can't name a field a row doesn't have)
  if TG_TABLE_NAME = 'channels' and to_jsonb(new) ->> 'category_id' is not null
     and not exists (select 1 from categories where id = (to_jsonb(new) ->> 'category_id')::uuid and server_id = new.server_id) then
    raise exception 'That category is in another server.';
  end if;
  return new;
end $$;
drop trigger if exists guard_place on public.channels;
create trigger guard_place before insert or update on public.channels for each row execute function public.guard_place();
drop trigger if exists guard_place on public.categories;
create trigger guard_place before update on public.categories for each row execute function public.guard_place();

-- a category's permissions belong to its server, and someone who isn't an admin can only change the permissions they
-- have themselves (allowing, denying or clearing them)
create or replace function public.guard_category_perms() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; was text; now_ text;
begin
  if TG_OP = 'DELETE' then
    if not is_admin(old.server_id) then
      foreach k in array (old.allow || old.deny) loop
        if not cat_can(old.category_id, k) then raise exception 'You can only allow or deny what you may do yourself.'; end if;
      end loop;
    end if;
    return old;
  end if;
  select server_id into new.server_id from categories where id = new.category_id;
  if new.server_id is null then raise exception 'There''s no such category.'; end if;
  new.deny := array(select distinct unnest(new.deny));
  new.allow := array(select distinct unnest(new.allow) except select unnest(new.deny));      -- (one setting each)
  if not is_admin(new.server_id) then
    foreach k in array (new.allow || new.deny || case when TG_OP = 'UPDATE' then old.allow || old.deny else '{}'::text[] end) loop
      was := case when TG_OP = 'UPDATE' and k = any(old.deny) then 'deny' when TG_OP = 'UPDATE' and k = any(old.allow) then 'allow' else '' end;
      now_ := case when k = any(new.deny) then 'deny' when k = any(new.allow) then 'allow' else '' end;
      if was <> now_ and not cat_can(new.category_id, k) then raise exception 'You can only allow or deny what you may do yourself.'; end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists guard_category_perms on public.category_perms;
create trigger guard_category_perms before insert or update or delete on public.category_perms for each row execute function public.guard_category_perms();

-- a deleted message takes its reactions with it
create or replace function public.drop_reactions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from reactions where message_id = old.id;
  delete from pins where message_id = old.id;
  return old;
end $$;
drop trigger if exists drop_reactions on public.messages;
create trigger drop_reactions after delete on public.messages for each row execute function public.drop_reactions();
drop trigger if exists drop_reactions on public.dm_messages;
create trigger drop_reactions after delete on public.dm_messages for each row execute function public.drop_reactions();

-- a server tag on a profile is only ever its server's own: set by adopt_tag, kept up to date when the server changes
-- its tag, and taken off when the person leaves (or the tag or server goes). Taking it off yourself is always fine.
create or replace function public.guard_profile_tag() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.tag_server is null then new.tag := ''; new.tag_badge := ''; new.tag_color := ''; return new; end if;
  if (new.tag_server, new.tag, new.tag_badge, new.tag_color) is distinct from (old.tag_server, old.tag, old.tag_badge, old.tag_color)
     and coalesce(current_setting('fluentdat.tag', true), '') <> 'ok' then
    raise exception 'A server tag comes from its server: pick one from your profile.';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_tag on public.profiles;
create trigger guard_profile_tag before update on public.profiles for each row execute function public.guard_profile_tag();

-- a game on a profile: its name, and maybe its Steam number (for its cover from Steam), the name of its logo on Wikimedia
-- Commons, or a small picture of its own; never a web address, so nobody can see who looks at a profile
create or replace function public.game_ok(g jsonb, p_pictures boolean default true) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(g) = 'object'
    and not exists (select 1 from jsonb_object_keys(g) k where k not in ('n', 's', 'l', 'i', 'at'))
    and jsonb_typeof(g->'n') = 'string' and length(g->>'n') between 1 and 80 and (g->>'n') !~ '[[:cntrl:]]'
    and (g->'s' is null or (jsonb_typeof(g->'s') = 'string' and (g->>'s') ~ '^[0-9]{1,10}$'))
    and (g->'l' is null or (jsonb_typeof(g->'l') = 'string' and (g->>'l') ~ '^[^/\\?#<>|"{}[:cntrl:]]{1,180}\.(svg|png|jpe?g|gif|webp)$'))
    and (g->'i' is null or (p_pictures and jsonb_typeof(g->'i') = 'string' and length(g->>'i') <= 40000
      and (g->>'i') ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'))
    and (g->'at' is null or (jsonb_typeof(g->'at') = 'string' and (g->>'at') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T')), false);
$$;
-- a connection: an account on one of the services Fluentdat knows, by its name there (a website by its https address)
create or replace function public.connection_ok(c jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(c) = 'object'
    and not exists (select 1 from jsonb_object_keys(c) k where k not in ('s', 'n', 'v', 'u'))
    and c->>'s' in ('discord', 'github', 'steam', 'tiktok', 'youtube', 'twitch', 'spotify', 'x', 'instagram', 'reddit', 'roblox', 'bluesky',
      'xbox', 'playstation', 'epicgames', 'battlenet', 'riot', 'leagueoflegends', 'crunchyroll', 'website')
    and jsonb_typeof(c->'n') = 'string' and length(c->>'n') between 1 and 100 and (c->>'n') !~ '[[:cntrl:]]'
    and (c->>'s' <> 'website' or (c->>'n') ~ '^https://[^[:space:]<>"]+\.[^[:space:]<>"]+$'), false);
$$;
-- is a connection an account you sign in with (or linked)? Then it's marked verified (v), with your number there (u) for
-- its link. Whatever a connection says about itself is ignored.
create or replace function public.verify_connection(p_user uuid, c jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i record; names text[];
begin
  c := c - 'v' - 'u';
  for i in select provider, provider_id, identity_data d from auth.identities where user_id = p_user loop
    continue when not (i.provider = c->>'s' or (i.provider in ('twitter', 'x') and c->>'s' = 'x'));
    names := case i.provider
      when 'discord' then array[i.d->>'full_name', split_part(i.d->>'name', '#', 1)]
      when 'github' then array[i.d->>'user_name', i.d->>'preferred_username']
      when 'spotify' then array[i.provider_id, i.d->>'name', i.d->>'full_name']
      else array[i.d->>'user_name', i.d->>'preferred_username', i.d->>'nickname', i.d->>'name'] end;
    if lower(c->>'n') in (select lower(x) from unnest(names) x where coalesce(x, '') <> '') then
      return c || jsonb_build_object('v', true, 'u', i.provider_id);
    end if;
  end loop;
  return c;
end $$;
-- a profile's extras: up to 20 connections (checked against your sign-ins), up to 6 widgets (each kind once, up to 20
-- games, a favourite just one), and up to 10 recent games
create or replace function public.guard_profile_extras() returns trigger
language plpgsql security definer set search_path = public as $$
declare w jsonb; kinds text[] := '{}';
begin
  if coalesce(jsonb_typeof(new.connections), '') <> 'array' or jsonb_array_length(new.connections) > 20
     or exists (select 1 from jsonb_array_elements(new.connections) c where not connection_ok(c)) then
    raise exception 'A connection is an account on one of the services Fluentdat knows (up to 20).';
  end if;
  new.connections := (select coalesce(jsonb_agg(verify_connection(new.id, c) order by o), '[]'::jsonb) from jsonb_array_elements(new.connections) with ordinality t(c, o));
  if coalesce(jsonb_typeof(new.widgets), '') <> 'array' or jsonb_array_length(new.widgets) > 6 or length(new.widgets::text) > 400000 then
    raise exception 'Up to 6 widgets, and not too many pictures in them.';
  end if;
  for w in select * from jsonb_array_elements(new.widgets) loop
    if coalesce(jsonb_typeof(w), '') <> 'object' or exists (select 1 from jsonb_object_keys(w) k where k not in ('t', 'g'))
       or coalesce(w->>'t', '') not in ('likes', 'want', 'fav') or (w->>'t') = any (kinds)
       or coalesce(jsonb_typeof(w->'g'), '') <> 'array' or jsonb_array_length(w->'g') > (case w->>'t' when 'fav' then 1 else 20 end)
       or exists (select 1 from jsonb_array_elements(w->'g') g where not game_ok(g)) then
      raise exception 'A widget is a kind Fluentdat knows (each once) with up to 20 games.';
    end if;
    kinds := kinds || (w->>'t');
  end loop;
  if coalesce(jsonb_typeof(new.activity), '') <> 'array' or jsonb_array_length(new.activity) > 10
     or exists (select 1 from jsonb_array_elements(new.activity) g where not game_ok(g, false)) then
    raise exception 'Recent activity is up to 10 games.';
  end if;
  if coalesce(jsonb_typeof(new.quests), '') <> 'array' or jsonb_array_length(new.quests) > 50
     or exists (select 1 from jsonb_array_elements(new.quests) q where coalesce(jsonb_typeof(q), '') <> 'string' or (q #>> '{}') !~ '^[a-z0-9-]{1,24}$') then
    raise exception 'Quests are the names of the ones you finished.';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_profile_extras on public.profile_extras;
create trigger guard_profile_extras before insert or update on public.profile_extras for each row execute function public.guard_profile_extras();
-- the game you say you're playing: a game Fluentdat can show (no picture of its own), stamped with when you started
-- (the same game again keeps its start), and put at the top of your recent activity
create or replace function public.guard_playing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.playing is not null and jsonb_typeof(new.playing) = 'null' then new.playing := null; end if;
  if new.playing is null or (TG_OP = 'UPDATE' and new.playing is not distinct from old.playing) then return new; end if;
  if not game_ok(new.playing - 'at', false) then raise exception 'That isn''t a game Fluentdat can show.'; end if;
  if TG_OP = 'UPDATE' and old.playing is not null and (old.playing - 'at') = (new.playing - 'at') then new.playing := old.playing; return new; end if;
  new.playing := (new.playing - 'at') || jsonb_build_object('at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  insert into profile_extras (id, activity) values (new.id, jsonb_build_array(new.playing))
  on conflict (id) do update set activity = (select coalesce(jsonb_agg(x.g order by x.o), '[]'::jsonb) from (
    select new.playing g, 0::bigint o
    union all select t.g, t.o from jsonb_array_elements(profile_extras.activity) with ordinality t(g, o) where t.g->>'n' is distinct from new.playing->>'n') x where x.o < 10);
  return new;
end $$;
drop trigger if exists guard_playing on public.profiles;
create trigger guard_playing before insert or update on public.profiles for each row execute function public.guard_playing();

-- a server's sidebar extras: which are on, its Server Guide (a welcome, up to 7 to-dos that can point at a channel, up to
-- 7 resource pages) and up to 12 game servers (a name, an address, maybe a game and a note)
create or replace function public.server_extras_ok(f jsonb, g jsonb, gs jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(f) = 'object'
    and not exists (select 1 from jsonb_each(f) e where e.key not in ('browse', 'games', 'guide', 'events', 'member_events') or jsonb_typeof(e.value) <> 'boolean')
    and jsonb_typeof(g) = 'object' and not exists (select 1 from jsonb_object_keys(g) k where k not in ('welcome', 'todos', 'res'))
    and (g->'welcome' is null or (jsonb_typeof(g->'welcome') = 'string' and length(g->>'welcome') <= 1000))
    and (g->'todos' is null or (jsonb_typeof(g->'todos') = 'array' and jsonb_array_length(g->'todos') <= 7 and not exists (
      select 1 from jsonb_array_elements(g->'todos') t where coalesce(jsonb_typeof(t), '') <> 'object'
        or exists (select 1 from jsonb_object_keys(t) k where k not in ('t', 'c'))
        or coalesce(jsonb_typeof(t->'t'), '') <> 'string' or length(t->>'t') not between 1 and 100
        or (t->'c' is not null and coalesce(t->>'c', '') !~ '^[0-9a-f-]{36}$'))))
    and (g->'res' is null or (jsonb_typeof(g->'res') = 'array' and jsonb_array_length(g->'res') <= 7 and not exists (
      select 1 from jsonb_array_elements(g->'res') r where coalesce(jsonb_typeof(r), '') <> 'object'
        or exists (select 1 from jsonb_object_keys(r) k where k not in ('t', 'b'))
        or coalesce(jsonb_typeof(r->'t'), '') <> 'string' or length(r->>'t') not between 1 and 60
        or coalesce(jsonb_typeof(r->'b'), 'string') <> 'string' or length(coalesce(r->>'b', '')) > 1500)))
    and jsonb_typeof(gs) = 'array' and jsonb_array_length(gs) <= 12 and not exists (
      select 1 from jsonb_array_elements(gs) s where coalesce(jsonb_typeof(s), '') <> 'object'
        or exists (select 1 from jsonb_object_keys(s) k where k not in ('n', 'g', 'a', 'd'))
        or coalesce(jsonb_typeof(s->'n'), '') <> 'string' or length(s->>'n') not between 1 and 60 or (s->>'n') ~ '[[:cntrl:]]'
        or coalesce(s->>'a', '') !~ '^[A-Za-z0-9.-]{1,120}(:[0-9]{1,5})?$'
        or (s->'g' is not null and not game_ok(s->'g', false))
        or (s->'d' is not null and (coalesce(jsonb_typeof(s->'d'), '') <> 'string' or length(s->>'d') > 200))), false);
$$;
create or replace function public.guard_server_extras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and (new.features, new.guide, new.game_servers) is not distinct from (old.features, old.guide, old.game_servers) then return new; end if;
  if not server_extras_ok(new.features, new.guide, new.game_servers) then
    raise exception 'That isn''t a Server Guide, game server list or sidebar setting Fluentdat can keep.';
  end if;
  return new;
end $$;
drop trigger if exists guard_server_extras on public.servers;
create trigger guard_server_extras before insert or update on public.servers for each row execute function public.guard_server_extras();
-- an event stays in its server with who made it; its voice channel is one of that server's; it starts some time in the
-- next two years and lasts up to a week
create or replace function public.guard_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and (new.server_id, new.created_by, new.created_at) is distinct from (old.server_id, old.created_by, old.created_at) then
    raise exception 'An event stays in its server, with who made it.';
  end if;
  if new.channel_id is not null and not exists (select 1 from channels where id = new.channel_id and server_id = new.server_id) then
    raise exception 'That channel is in another server.';
  end if;
  if (TG_OP = 'INSERT' or new.starts_at is distinct from old.starts_at) and (new.starts_at < now() - interval '1 day' or new.starts_at > now() + interval '2 years') then
    raise exception 'An event starts some time in the next two years.';
  end if;
  if new.ends_at is not null and new.ends_at > new.starts_at + interval '7 days' then raise exception 'An event lasts up to a week.'; end if;
  new.title := trim(new.title); new.place := trim(new.place);
  return new;
end $$;
drop trigger if exists guard_event on public.server_events;
create trigger guard_event before insert or update on public.server_events for each row execute function public.guard_event();
create or replace function public.sync_server_tag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.tag, new.tag_badge, new.tag_color) is not distinct from (old.tag, old.tag_badge, old.tag_color) then return new; end if;
  perform set_config('fluentdat.tag', 'ok', true);
  if new.tag = '' then update profiles set tag_server = null where tag_server = new.id;
  else update profiles set tag = new.tag, tag_badge = new.tag_badge, tag_color = new.tag_color where tag_server = new.id; end if;
  perform set_config('fluentdat.tag', '', true);
  return new;
end $$;
drop trigger if exists sync_server_tag on public.servers;
create trigger sync_server_tag after update on public.servers for each row execute function public.sync_server_tag();
create or replace function public.drop_tag_on_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set tag_server = null where id = old.user_id and tag_server = old.server_id;
  return old;
end $$;
drop trigger if exists drop_tag_on_leave on public.server_members;
create trigger drop_tag_on_leave after delete on public.server_members for each row execute function public.drop_tag_on_leave();
-- leaving a server takes your boost with you
create or replace function public.drop_boost_on_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from server_boosts where server_id = old.server_id and user_id = old.user_id;
  return old;
end $$;
drop trigger if exists drop_boost_on_leave on public.server_members;
create trigger drop_boost_on_leave after delete on public.server_members for each row execute function public.drop_boost_on_leave();
-- up to 50 pins in a place
create or replace function public.guard_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from pins where place = new.place) >= 50 then raise exception 'A conversation holds up to 50 pinned messages.'; end if;
  new.pinned_at := now();
  return new;
end $$;
drop trigger if exists guard_pin on public.pins;
create trigger guard_pin before insert on public.pins for each row execute function public.guard_pin();
-- a message in an archived thread brings it back
create or replace function public.thread_wakes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update channels set archived = false where id = new.channel_id and archived;
  return new;
end $$;
drop trigger if exists thread_wakes on public.messages;
create trigger thread_wakes after insert on public.messages for each row execute function public.thread_wakes();

-- ===================== actions (the only ways to do these) =====================
-- a server's boost level: 2 boosts make level 1, 7 level 2, 14 level 3 (as on Discord)
create or replace function public.boost_level(p_server uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when n >= 14 then 3 when n >= 7 then 2 when n >= 2 then 1 else 0 end from (select count(*) n from server_boosts where server_id = p_server) x;
$$;
-- start a thread in a text channel (from one of its messages, or on its own): whoever may post there may
create or replace function public.create_thread(p_parent uuid, p_message uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c channels%rowtype; t uuid; nm text := left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 60);
begin
  select * into c from channels where id = p_parent;
  if not found or c.kind <> 'text' then raise exception 'Threads start in a text channel.'; end if;
  if not chan_can(p_parent, 'send') then raise exception 'You can''t post in that channel.'; end if;
  if nm = '' then raise exception 'Give the thread a name.'; end if;
  if p_message is not null then
    if not exists (select 1 from messages where id = p_message and channel_id = p_parent) then raise exception 'That message isn''t in this channel.'; end if;
    select id into t from channels where starter = p_message;
    if t is not null then return t; end if;
  end if;
  insert into channels (server_id, category_id, name, kind, position, parent_id, starter, created_by)
    values (c.server_id, c.category_id, nm, 'thread', 0, p_parent, p_message, auth.uid()) returning id into t;
  return t;
end $$;
-- rename or archive a thread: whoever started it, or whoever may manage its channels
create or replace function public.edit_thread(p_thread uuid, p_name text, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c channels%rowtype;
begin
  select * into c from channels where id = p_thread and kind = 'thread';
  if not found or not chan_can(p_thread, 'view') then raise exception 'There''s no such thread.'; end if;
  if c.created_by is distinct from auth.uid() and not chan_can(p_thread, 'manage_channels') then
    raise exception 'Only whoever started the thread, or someone who manages channels, can change it.';
  end if;
  update channels set name = coalesce(nullif(left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 60), ''), name), archived = coalesce(p_archived, archived) where id = p_thread;
end $$;
-- a channel's threads: how many messages each has, and when the last came (only what you can read is counted)
create or replace function public.threads_info(p_channel uuid) returns table (id uuid, messages bigint, last_at timestamptz)
language sql stable set search_path = public as $$
  select t.id, count(m.id), max(m.created_at) from channels t left join messages m on m.channel_id = t.id where t.parent_id = p_channel group by t.id;
$$;
-- searching a server's messages you can read (Search "<server>"): words in the text or a file's name, from someone,
-- with a file, picture, video or link, in a channel (and its threads); newest first, 25 at a time (before a time, for more)
create or replace function public.search_messages(p_server uuid, p_query text default '', p_from uuid default null, p_has text default '',
  p_in uuid default null, p_before timestamptz default null, p_limit int default 25) returns setof public.messages
language sql stable set search_path = public as $$
  select m.* from messages m join channels c on c.id = m.channel_id,
    (select '%' || replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat) q
  where c.server_id = p_server and (p_in is null or m.channel_id = p_in or c.parent_id = p_in) and (p_from is null or m.author = p_from)
    and (trim(coalesce(p_query, '')) = '' or m.text ilike q.pat or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(m.files) = 'array' then m.files else '[]'::jsonb end) f where f ->> 'name' ilike q.pat))
    and (coalesce(p_has, '') = '' or (p_has = 'link' and m.text ~* 'https?://')
      or (p_has in ('file', 'image', 'video') and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(m.files) = 'array' then m.files else '[]'::jsonb end) f where p_has = 'file' or f ->> 'kind' = p_has)))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc limit least(greatest(coalesce(p_limit, 25), 1), 50);
$$;
-- …and a DM's (or group's)
create or replace function public.search_dm(p_dm uuid, p_query text default '', p_from uuid default null, p_has text default '',
  p_before timestamptz default null, p_limit int default 25) returns setof public.dm_messages
language sql stable set search_path = public as $$
  select m.* from dm_messages m, (select '%' || replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat) q
  where m.dm_id = p_dm and (p_from is null or m.author = p_from)
    and (trim(coalesce(p_query, '')) = '' or m.text ilike q.pat or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(m.files) = 'array' then m.files else '[]'::jsonb end) f where f ->> 'name' ilike q.pat))
    and (coalesce(p_has, '') = '' or (p_has = 'link' and m.text ~* 'https?://')
      or (p_has in ('file', 'image', 'video') and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(m.files) = 'array' then m.files else '[]'::jsonb end) f where p_has = 'file' or f ->> 'kind' = p_has)))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc limit least(greatest(coalesce(p_limit, 25), 1), 50);
$$;
-- your name in one server (Edit Per-server Profile); admins can change members', and the owner anyone's
create or replace function public.set_nick(p_server uuid, p_user uuid, p_nick text) returns void
language plpgsql security definer set search_path = public as $$
declare r text; me text;
begin
  select role into r from server_members where server_id = p_server and user_id = p_user;
  if r is null then raise exception 'They aren''t in that server.'; end if;
  if p_user is distinct from auth.uid() then
    select role into me from server_members where server_id = p_server and user_id = auth.uid();
    if not (me = 'owner' or (me = 'admin' and r = 'member')) then raise exception 'Only admins can change other people''s nicknames (and only the owner an admin''s).'; end if;
  end if;
  update server_members set nick = left(trim(regexp_replace(coalesce(p_nick, ''), '[[:cntrl:]]', '', 'g')), 32) where server_id = p_server and user_id = p_user;
end $$;
-- whether a server's people can start DMs with you (Privacy Settings)
create or replace function public.set_server_privacy(p_server uuid, p_allow_dms boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update server_members set allow_dms = coalesce(p_allow_dms, true) where server_id = p_server and user_id = auth.uid();
  if not found then raise exception 'You aren''t in that server.'; end if;
end $$;
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
  if not (is_admin(p_server) or exists (select 1 from categories where server_id = p_server and cat_can(id, 'invite'))) then
    raise exception 'Only this server''s admins (and whoever a category lets) can make invites.';
  end if;
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
  if blocked_with(p_other) then raise exception 'You can''t message them.'; end if;
  if not (exists (select 1 from server_members x join server_members y on x.server_id = y.server_id where x.user_id = auth.uid() and y.user_id = p_other and y.allow_dms)
          or exists (select 1 from friends where owner = p_other and friend = auth.uid())) then
    raise exception 'You can message people you share a server with (unless they''ve turned that off), or who have added you as a friend.';
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
            or (coalesce(x.text, '') ~ '(^|[^[:alnum:]_])@(everyone|here)([^[:alnum:]_]|$)' and chan_perm(x.author, c.id, 'mention_everyone'))
            or exists (select 1 from messages y where y.id = x.reply_to and y.author = auth.uid()))),
    (select max(x.created_at) from messages x where x.channel_id = c.id)
  from channels c
  join server_members m on m.server_id = c.server_id and m.user_id = auth.uid()
  left join reads r on r.user_id = auth.uid() and r.place = c.id
  where chan_can(c.id, 'view')
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

-- wear a server's tag on your profile (null: none). Only a server you're in, and only while it has a tag
create or replace function public.adopt_tag(p_server uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s servers%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_server is null then update profiles set tag_server = null where id = auth.uid(); return; end if;
  if not is_member(p_server) then raise exception 'Join that server to wear its tag.'; end if;
  select * into s from servers where id = p_server;
  if coalesce(s.tag, '') = '' then raise exception 'That server doesn''t have a tag.'; end if;
  perform set_config('fluentdat.tag', 'ok', true);
  update profiles set tag_server = s.id, tag = s.tag, tag_badge = s.tag_badge, tag_color = s.tag_color where id = auth.uid();
  perform set_config('fluentdat.tag', '', true);
end $$;
-- a tag's server, for the card that opens when you click someone's tag (only servers that have a tag say anything)
create or replace function public.tag_info(p_server uuid)
returns table (id uuid, name text, icon text, img text, tag text, tag_badge text, tag_color text, members bigint, public boolean, joined boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.icon, s.img, s.tag, s.tag_badge, s.tag_color,
         (select count(*) from server_members m where m.server_id = s.id), s.public, is_member(s.id)
  from servers s where s.id = p_server and s.tag <> '' and auth.uid() is not null;
$$;

-- ===================== Fluentdat's own one-time invites, blocking, reports, mutual friends =====================
-- a one-time link that lets someone make an account (only the people who run Fluentdat); good for p_days days
create or replace function public.create_app_invite(p_note text default '', p_days int default 7)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can make these links.'; end if;
  c := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into app_invites (code, created_by, note, expires_at)
    values (c, auth.uid(), left(trim(coalesce(p_note, '')), 100), case when p_days is null or p_days <= 0 then null else now() + make_interval(days => least(p_days, 365)) end);
  return c;
end $$;

-- the page a link opens on asks this (signed out): is it still good, and who sent it
create or replace function public.app_invite_check(p_code text)
returns table (ok boolean, by_name text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.used_by is null and (i.expires_at is null or i.expires_at > now()), coalesce(nullif(p.name, ''), p.handle, 'Someone'), i.expires_at
  from app_invites i left join profiles p on p.id = i.created_by
  where i.code = lower(trim(coalesce(p_code, '')));
$$;

-- make an account with a one-time link: a username (your @handle) and a password, no email. The account's address is
-- made up from the username (and can't be a real one); this hands it back to sign in with.
create or replace function public.redeem_app_invite(p_code text, p_handle text, p_password text, p_name text default '')
returns text language plpgsql security definer set search_path = public, extensions as $$
declare inv app_invites%rowtype; h text := lower(trim(both '@' from trim(coalesce(p_handle, '')))); uid uuid := gen_random_uuid(); em text;
begin
  select * into inv from app_invites where code = lower(trim(coalesce(p_code, ''))) for update;
  if not found then raise exception 'That invite link doesn''t work.'; end if;
  if inv.used_by is not null then raise exception 'That invite link has already been used. Ask for a new one.'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'That invite link has expired. Ask for a new one.'; end if;
  if h !~ '^[a-z0-9_]{2,24}$' then raise exception 'A username is 2 to 24 letters, numbers or underscores.'; end if;
  if char_length(coalesce(p_password, '')) < 8 then raise exception 'Your password needs at least 8 characters.'; end if;
  if octet_length(p_password) > 72 then raise exception 'That password is too long (72 characters at most).'; end if;
  em := h || '@users.fluentdat.invalid';
  if exists (select 1 from profiles where handle = h) or exists (select 1 from auth.users where email = em) then raise exception 'That username is taken. Try another one.'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf', 10)), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('user_name', h, 'full_name', left(coalesce(nullif(trim(coalesce(p_name, '')), ''), h), 40)),
      now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  if not exists (select 1 from profiles where id = uid and handle = h) then raise exception 'That username is taken. Try another one.'; end if;
  update app_invites set used_by = uid, used_at = now() where code = inv.code;
  return em;
end $$;

-- signing in with a username: the address its account was made with (only for accounts made from a one-time link)
create or replace function public.login_email(p_handle text)
returns text language sql stable security definer set search_path = public as $$
  select u.email from profiles p join auth.users u on u.id = p.id
  where p.handle = lower(trim(both '@' from trim(coalesce(p_handle, '')))) and u.email like '%@users.fluentdat.invalid';
$$;

-- the one-time links made so far, newest first, and who used them (the people who run Fluentdat)
create or replace function public.app_invites_list()
returns table (code text, note text, created_at timestamptz, expires_at timestamptz, used_at timestamptz, used_handle text, used_name text, by_handle text)
language sql stable security definer set search_path = public as $$
  select i.code, i.note, i.created_at, i.expires_at, i.used_at, u.handle, u.name, b.handle
  from app_invites i left join profiles u on u.id = i.used_by left join profiles b on b.id = i.created_by
  where is_app_admin()
  order by i.created_at desc
  limit 200;
$$;
create or replace function public.revoke_app_invite(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can take links back.'; end if;
  delete from app_invites where code = lower(trim(coalesce(p_code, ''))) and used_by is null;
end $$;

-- block someone (you stop being friends too), or unblock them
create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'You can''t block yourself.'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'There''s nobody like that.'; end if;
  insert into blocks (blocker, blocked) values (auth.uid(), p_user) on conflict do nothing;
  delete from friends where (owner = auth.uid() and friend = p_user) or (owner = p_user and friend = auth.uid());
end $$;
create or replace function public.unblock_user(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from blocks where blocker = auth.uid() and blocked = p_user;
$$;

-- friends you both have
create or replace function public.mutual_friends(p_other uuid)
returns table (id uuid, handle text, name text, color text, avatar text)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.name, p.color, p.avatar from profiles p
  where auth.uid() is not null and p.id <> auth.uid() and p.id <> p_other
    and exists (select 1 from friends where owner = auth.uid() and friend = p.id) and exists (select 1 from friends where owner = p.id and friend = auth.uid())
    and exists (select 1 from friends where owner = p_other and friend = p.id) and exists (select 1 from friends where owner = p.id and friend = p_other)
  order by p.name
  limit 100;
$$;

-- every report, newest first, with who sent it and who it's about (the people who run Fluentdat)
create or replace function public.app_reports()
returns table (id uuid, created_at timestamptz, reason text, excerpt text, resolved boolean, place uuid, message uuid,
               reporter_handle text, reporter_name text, target_handle text, target_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, r.reason, r.excerpt, r.resolved, r.place, r.message, a.handle, a.name, t.handle, t.name
  from reports r left join profiles a on a.id = r.reporter left join profiles t on t.id = r.target
  where is_app_admin()
  order by r.created_at desc
  limit 200;
$$;

-- only signed-in people may call the actions (the helpers only ever answer about the caller, so they're harmless)
revoke all on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid), public.discover(text, text),
  public.join_public(uuid), public.ban_member(uuid, uuid, text), public.server_bans(uuid), public.create_group(uuid[], text),
  public.add_to_group(uuid, uuid[]), public.unread(), public.invite_info(text), public.heartbeat(),
  public.create_app_invite(text, int), public.app_invites_list(), public.revoke_app_invite(text), public.block_user(uuid),
  public.unblock_user(uuid), public.mutual_friends(uuid), public.app_reports(), public.adopt_tag(uuid), public.tag_info(uuid) from public, anon;
grant execute on function public.create_server(text, text), public.create_invite(uuid, int, int), public.join_server(text),
  public.set_member_role(uuid, uuid, text), public.find_user(text), public.open_dm(uuid), public.discover(text, text),
  public.join_public(uuid), public.ban_member(uuid, uuid, text), public.server_bans(uuid), public.create_group(uuid[], text),
  public.add_to_group(uuid, uuid[]), public.unread(), public.invite_info(text), public.heartbeat(),
  public.create_app_invite(text, int), public.app_invites_list(), public.revoke_app_invite(text), public.block_user(uuid),
  public.unblock_user(uuid), public.mutual_friends(uuid), public.app_reports(), public.adopt_tag(uuid), public.tag_info(uuid) to authenticated;
-- a one-time link is opened signed out: checking it, making the account with it, and signing in with a username need no sign-in
revoke all on function public.app_invite_check(text), public.redeem_app_invite(text, text, text, text), public.login_email(text) from public;
grant execute on function public.app_invite_check(text), public.redeem_app_invite(text, text, text, text), public.login_email(text) to anon, authenticated;
-- the rules call these helpers, so signed-in people need to be able to run them (granted here rather than left to the
-- project's defaults, so it works however the project was set up)
grant execute on function public.is_member(uuid), public.is_admin(uuid), public.is_owner(uuid), public.channel_server(uuid),
  public.in_dm(uuid), public.knows(uuid), public.is_friend(uuid), public.topic_ok(text), public.file_ok(text, boolean),
  public.is_app_admin(), public.blocked_with(uuid), public.dm_blocked(uuid), public.expression_ok(text),
  public.place_ok(uuid), public.message_in(uuid, uuid), public.react_ok(uuid), public.react_with(uuid, uuid, text), public.cat_can(uuid, text), public.chan_can(uuid, text),
  public.can_make_events(uuid), public.pin_ok(uuid, uuid), public.boost_level(uuid), public.create_thread(uuid, uuid, text), public.edit_thread(uuid, text, boolean),
  public.threads_info(uuid), public.search_messages(uuid, text, uuid, text, uuid, timestamptz, int), public.search_dm(uuid, text, uuid, text, timestamptz, int),
  public.set_nick(uuid, uuid, text), public.set_server_privacy(uuid, boolean) to authenticated;
revoke all on function public.perm_for(uuid, uuid, text), public.chan_perm(uuid, uuid, text), public.verify_connection(uuid, jsonb) from public, anon, authenticated;

-- ===================== who may touch the tables at all =====================
-- signed-in people go through the rules above; signed-out visitors get nothing
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends,
  public.roles, public.member_roles, public.bans, public.dm_members, public.calls, public.reads, public.seen,
  public.app_admins, public.app_invites, public.blocks, public.reports, public.server_emoji, public.server_stickers, public.reactions, public.category_perms, public.profile_extras,
  public.server_events, public.event_interest, public.pins, public.server_boosts to authenticated;
revoke all on public.profiles, public.servers, public.server_members, public.categories,
  public.channels, public.messages, public.invites, public.dms, public.dm_messages, public.friends,
  public.roles, public.member_roles, public.bans, public.dm_members, public.calls, public.reads, public.seen,
  public.app_admins, public.app_invites, public.blocks, public.reports, public.server_emoji, public.server_stickers, public.reactions, public.category_perms, public.profile_extras,
  public.server_events, public.event_interest, public.pins, public.server_boosts from anon;

-- TrixWotel runs Fluentdat. (To add someone else: insert into public.app_admins select id from public.profiles where handle = 'their handle';)
insert into public.app_admins (user_id) select id from public.profiles where handle = 'trixwotel' on conflict do nothing;

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
    begin alter publication supabase_realtime add table public.server_emoji; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.server_stickers; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.reactions; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.category_perms; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.server_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.event_interest; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.pins; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.server_boosts; exception when duplicate_object then null; end;
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
-- server emoji and stickers: a public bucket (their pictures show to anyone, like Discord's), where only a server's admins
-- add or remove its own (512 KB each)
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('expressions', 'expressions', true, 524288, array['image/png', 'image/apng', 'image/gif', 'image/webp', 'image/jpeg'])
      on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = excluded.allowed_mime_types;
    execute 'drop policy if exists "fluentdat: see emoji and stickers" on storage.objects';
    execute 'create policy "fluentdat: see emoji and stickers" on storage.objects for select to authenticated using (bucket_id = ''expressions'')';
    execute 'drop policy if exists "fluentdat: server admins add emoji and stickers" on storage.objects';
    execute 'create policy "fluentdat: server admins add emoji and stickers" on storage.objects for insert to authenticated with check (bucket_id = ''expressions'' and public.expression_ok(name))';
    execute 'drop policy if exists "fluentdat: server admins remove emoji and stickers" on storage.objects';
    execute 'create policy "fluentdat: server admins remove emoji and stickers" on storage.objects for delete to authenticated using (bucket_id = ''expressions'' and public.expression_ok(name))';
  end if;
exception when insufficient_privilege then raise notice 'Fluentdat: couldn''t set up emoji and sticker storage (%)', sqlerrm;
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
