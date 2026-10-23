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
create index if not exists messages_by_author on public.messages (author);

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
create index if not exists dm_messages_by_author on public.dm_messages (author);

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
-- the people they've banned from all of Fluentdat (TrixWotel's /ban): while banned, someone can't write anything (a
-- message, a reaction, a DM, a call, a file, a purchase…) and sees nothing but why they're banned
create table if not exists public.app_bans (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  banned_by uuid references public.profiles (id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
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
create index if not exists reactions_by_user on public.reactions (user_id);

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
-- who boosts a server (25 Datbux a day, paid ahead: a boost counts while it's paid for): 2 boosts make level 1, 7 level
-- 2, 14 level 3, and each level holds more emoji and stickers
create table if not exists public.server_boosts (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);
alter table public.server_boosts add column if not exists paid_until timestamptz not null default (now() + interval '1 day');
alter table public.server_boosts add column if not exists auto boolean not null default true;      -- (another day is paid as the last one runs out)
-- who's interested in an event
create table if not exists public.event_interest (
  event_id uuid not null references public.server_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
-- Datbux, Fluentdat's own currency: earned with daily, weekly, monthly and yearly tasks, spent in the Shop, and sent or
-- traded between people. Only the functions further down change any of this, so nobody can make Datbux up.
-- your settings (Customize: your theme, your layout, and every part of Fluentdat you changed), kept with your account so
-- each device you sign in on looks the same; only you see or change yours
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  earned bigint not null default 0,        -- from tasks (and the welcome)
  spent bigint not null default 0,         -- in the Shop
  sent bigint not null default 0,          -- to other people (and in trades)
  received bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.datbux_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  kind text not null check (kind in ('welcome', 'task', 'buy', 'send', 'receive', 'trade', 'boost', 'staff')),
  note text not null default '' check (char_length(note) <= 160),
  other uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists datbux_log_by_user on public.datbux_log (user_id, created_at desc);
create table if not exists public.task_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  task text not null check (task ~ '^[a-z0-9-]{1,32}$'),
  period text not null check (period ~ '^[0-9W-]{4,10}$'),
  claimed_at timestamptz not null default now(),
  primary key (user_id, task, period)
);
-- what the Shop sells for Datbux, and the price (set here, so nobody can pay less); what isn't listed is free
create table if not exists public.shop_items (
  kind text not null check (kind in ('deco', 'font', 'effect', 'frame', 'plate')),
  item text not null check (item ~ '^[a-z0-9-]{1,24}$'),
  price int not null check (price between 0 and 1000000),
  primary key (kind, item)
);
create table if not exists public.owned_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('deco', 'font', 'effect', 'frame', 'plate')),
  item text not null check (item ~ '^[a-z0-9-]{1,24}$'),
  how text not null default 'buy' check (how in ('buy', 'trade', 'grant', 'quest')),
  got_at timestamptz not null default now(),
  primary key (user_id, kind, item)
);
alter table public.datbux_log drop constraint if exists datbux_log_kind_check;
alter table public.datbux_log add constraint datbux_log_kind_check check (kind in ('welcome', 'task', 'buy', 'send', 'receive', 'trade', 'boost', 'staff'));
alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in ('deco', 'font', 'effect', 'frame', 'plate'));
alter table public.owned_items drop constraint if exists owned_items_kind_check;
alter table public.owned_items add constraint owned_items_kind_check check (kind in ('deco', 'font', 'effect', 'frame', 'plate'));
alter table public.owned_items drop constraint if exists owned_items_how_check;
alter table public.owned_items add constraint owned_items_how_check check (how in ('buy', 'trade', 'grant', 'quest'));
-- what each Quest gives you once it's done (the Quests themselves are counted in your browser)
create table if not exists public.quest_rewards (
  quest text primary key check (quest ~ '^[a-z0-9-]{1,24}$'),
  kind text not null check (kind in ('deco', 'font', 'effect', 'frame', 'plate')),
  item text not null check (item ~ '^[a-z0-9-]{1,24}$')
);
-- the Shop's bundles: a few things that go together, for 10–25% less than they cost one by one (cut: that's simply its
-- price, so nothing says so; what you have already isn't paid for again), and a little less again on the holiday one is
-- made for and on sale days (shop_sales)
create table if not exists public.shop_bundles (
  id text primary key check (id ~ '^[a-z0-9-]{1,24}$'),
  name text not null check (char_length(name) between 1 and 40),
  holiday text check (holiday ~ '^[a-z0-9-]{1,24}$'),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 2 and 6),
  position int not null default 0
);
alter table public.shop_bundles add column if not exists holiday text check (holiday ~ '^[a-z0-9-]{1,24}$');
alter table public.shop_bundles drop column if exists pct;
alter table public.shop_bundles add column if not exists cut int not null default 15 check (cut between 10 and 25);
-- a trade between two people: Datbux and things from the Shop each way; the other person accepts or declines it
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  give_bux int not null default 0 check (give_bux between 0 and 1000000),
  give_items jsonb not null default '[]'::jsonb,
  want_bux int not null default 0 check (want_bux between 0 and 1000000),
  want_items jsonb not null default '[]'::jsonb,
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'done', 'declined', 'cancelled', 'failed')),
  why text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists trades_to on public.trades (to_user, status);
create index if not exists trades_from on public.trades (from_user, status);
-- linked channels: text channels (in any servers) where what's said in one shows in all the others, as
-- "#channel / name / time / message". Whoever manages a channel links it and gets the link's code; whoever manages a
-- channel somewhere else adds theirs with that code. Up to 10 channels in a link, and a channel is in one link at most
create table if not exists public.channel_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.channel_link_members (
  channel_id uuid primary key references public.channels (id) on delete cascade,
  link_id uuid not null references public.channel_links (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  changed_at timestamptz not null default now()          -- (when its link last got or lost a channel)
);
create index if not exists channel_link_members_by_link on public.channel_link_members (link_id);
-- Discord channels linked with a text channel here (up to 10 each): what's said in one shows in the others, as
-- "#channel / name / time / message", like a linked channel. Whoever manages the channel here pastes a webhook made in
-- the Discord channel (only someone who may manage that channel's webhooks can make one): the database writes with it,
-- and reads the Discord channel with Fluentdat's own bot (its token is kept in Supabase's Vault). Nobody signed in can
-- read these rows, so a webhook's token never leaves the database
create table if not exists public.discord_links (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  webhook_id text not null unique,
  webhook_token text not null,
  discord_channel text,                                  -- (Discord's number for the channel, once the webhook says it)
  discord_guild text,
  name text not null default '',                         -- (the channel's name, and its server's, as Discord last said)
  guild_name text not null default '',
  last_seen text not null,                               -- (the newest Discord message already brought over)
  status text not null default 'starting' check (status in ('starting', 'ok', 'broken')),
  error text not null default '',
  read_at timestamptz not null default now(),            -- (not asking Discord again before these: it said to wait)
  write_at timestamptz not null default now(),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now()
);
create index if not exists discord_links_by_channel on public.discord_links (channel_id);
create unique index if not exists discord_links_one_each on public.discord_links (discord_channel) where discord_channel is not null;
-- what's waiting to go to Discord, in order: a line to say, or a message there to delete
create table if not exists public.discord_outbox (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.discord_links (id) on delete cascade,
  kind text not null check (kind in ('say', 'drop')),
  message_id uuid,                                       -- (say: the message here it's the line of)
  line text not null default '',
  dmsg text,                                             -- (drop: the message in Discord)
  tries int not null default 0
);
create index if not exists discord_outbox_by_link on public.discord_outbox (link_id, id);
-- the Discord message each message here went out in (lines said close together share one), for replies and deleting
create table if not exists public.discord_sent (
  message_id uuid not null,
  link_id uuid not null references public.discord_links (id) on delete cascade,
  dmsg text not null,
  line text not null,
  pos int not null,
  primary key (message_id, link_id)
);
create index if not exists discord_sent_by_dmsg on public.discord_sent (link_id, dmsg);
-- what's been asked of Discord and not yet answered (pg_net sends it; the next round reads the answer)
create table if not exists public.discord_requests (
  id bigint primary key,                                 -- (pg_net's number for it)
  link_id uuid not null references public.discord_links (id) on delete cascade,
  kind text not null,                                    -- (hook, chan, guild and poll read; send and drop write)
  outbox bigint[] not null default '{}',
  sent_at timestamptz not null default now()
);
-- (each line goes out in Discord under the name of whoever said it, "TrixWotel (#sync)", and their picture when it's on
-- the web; plain_names: Discord turned a name down, so this channel's go without @ # : and `)
alter table public.discord_outbox add column if not exists who text not null default '';
alter table public.discord_outbox add column if not exists avatar text;
alter table public.discord_sent add column if not exists who text not null default '';
alter table public.discord_sent add column if not exists avatar text;
alter table public.discord_links add column if not exists plain_names boolean not null default false;

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
-- a profile frame from the Shop (drawn around your profile card), and a status bubble (Discord's: what you're up to, in a
-- bubble beside your picture), until a time or until you clear it
alter table public.profiles add column if not exists frame text not null default '';
alter table public.profiles add column if not exists bubble text not null default '';
alter table public.profiles add column if not exists bubble_until timestamptz;
-- who may see each part of your profile: { part: 'everyone' | 'friends' | 'me' } (a part not named: everyone). Your name,
-- @handle, picture, decorations, banner and About are always for everyone
alter table public.profiles add column if not exists privacy jsonb not null default '{}'::jsonb;
create or replace function public.privacy_ok(p jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(p) = 'object' and not exists (select 1 from jsonb_each(p) e
    where e.key not in ('friends', 'collection', 'wishlist', 'games', 'fav', 'activity', 'playing', 'connections', 'since', 'boosting', 'badges')
       or jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') not in ('everyone', 'friends', 'me'));
$$;
alter table public.profiles drop constraint if exists profiles_privacy_ok;
alter table public.profiles add constraint profiles_privacy_ok check (public.privacy_ok(privacy));
-- your badges: which you show first and which you hide; and your Game Time (the hours you said you were playing, timed
-- by the database and only ever added to by it)
alter table public.profile_extras add column if not exists badges jsonb not null default '{}'::jsonb;
alter table public.profile_extras add column if not exists play_seconds bigint not null default 0;
-- (when each of your badges came: { badge: time }, for your profile's Collection log; see guard_profile_extras)
alter table public.profile_extras add column if not exists badge_log jsonb not null default '{}'::jsonb;
-- a role's icon (an emoji, or a small picture), shown beside its name, as on Discord; and when a channel (a thread) was made
alter table public.roles add column if not exists icon text not null default '';
alter table public.channels add column if not exists created_at timestamptz not null default now();
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
-- a linked channel's copy of a message: the message it was copied from (gone with it), and where that was said
-- ({ server, channel, name, from }: as they were called then)
alter table public.messages add column if not exists link_src uuid;
alter table public.messages add column if not exists linked jsonb;
create index if not exists messages_by_link_src on public.messages (link_src) where link_src is not null;
do $$ begin
  alter table public.messages add constraint messages_link_src_fk foreign key (link_src) references public.messages (id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_linked_shape check (linked is null or (jsonb_typeof(linked) = 'object' and octet_length(linked::text) <= 1000));
exception when duplicate_object then null; end $$;
-- (a message from Discord keeps its number there, for the replies that answer it)
create index if not exists messages_by_dmsg on public.messages ((linked->>'dmsg')) where linked ? 'dmsg';

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
-- (a banner or nameplate: a picture, one of the ten gradients, or any colour or two; a nameplate can be one from the Shop)
alter table public.profiles drop constraint if exists profiles_shapes;
alter table public.profiles add constraint profiles_shapes check (color ~ '^#[0-9a-fA-F]{6}$'
  and (avatar = '' or avatar ~ '^data:image/(png|jpeg|webp|gif);base64,' or avatar ~ '^https://(cdn\.discordapp\.com|avatars\.githubusercontent\.com)/')
  and (banner = '' or banner ~ '^(g:[0-9]|#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?)$' or banner ~ '^data:image/(png|jpeg|webp|gif);base64,')
  and (plate = '' or plate ~ '^(g:[0-9]|#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?)$' or plate ~ '^np:[a-z0-9-]{1,24}$' or plate ~ '^data:image/(png|jpeg|webp|gif);base64,'));
alter table public.profiles drop constraint if exists profiles_style;
alter table public.profiles add constraint profiles_style check ((theme1 = '' or theme1 ~ '^#[0-9a-fA-F]{6}$') and (theme2 = '' or theme2 ~ '^#[0-9a-fA-F]{6}$')
  and name_font ~ '^[a-z0-9]{0,16}$' and name_effect ~ '^[a-z]{0,16}$'
  and (name_color1 = '' or name_color1 ~ '^#[0-9a-fA-F]{6}$') and (name_color2 = '' or name_color2 ~ '^#[0-9a-fA-F]{6}$')
  and tag ~ '^[A-Za-z0-9]{0,4}$' and tag_badge ~ '^[a-z0-9]{0,20}$' and (tag_color = '' or tag_color ~ '^#[0-9a-fA-F]{6}$'));
alter table public.profiles drop constraint if exists profiles_cosmetics;
alter table public.profiles add constraint profiles_cosmetics check (decoration ~ '^[a-z0-9-]{0,24}$' and effect ~ '^[a-z0-9-]{0,24}$' and frame ~ '^[a-z0-9-]{0,24}$');
alter table public.profiles drop constraint if exists profiles_bubble;
alter table public.profiles add constraint profiles_bubble check (char_length(bubble) <= 128 and bubble !~ '[[:cntrl:]]');
alter table public.roles drop constraint if exists roles_icon;
alter table public.roles add constraint roles_icon check (icon = '' or (char_length(icon) <= 16 and icon !~ '[[:space:][:cntrl:]<>/:.\\]')
  or (length(icon) <= 40000 and icon ~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$'));
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
  if app_banned() then return false; end if;
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
  if p_write and (who <> auth.uid()::text or app_banned()) then return false; end if;
  if k = 'dm' then return in_dm(place::uuid); end if;
  if k = 'ch' then return chan_can(place::uuid, case when p_write then 'attach' else 'view' end)
    -- (…or, to read it, in a linked channel that has a copy of the message it came with)
    or (not p_write and exists (select 1 from messages s join messages c on c.link_src = s.id
      where s.channel_id = place::uuid and s.files @> jsonb_build_array(jsonb_build_object('path', p_name)) and chan_can(c.channel_id, 'view'))); end if;
  return false;
end $$;

-- may you see this part of their profile? (what they chose: everyone, their friends, or only them; your own, always)
create or replace function public.shown_to_me(p_owner uuid, p_part text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid() or coalesce((select case coalesce(privacy ->> p_part, 'everyone') when 'everyone' then true when 'friends' then is_friend(p_owner) else false end
    from profiles where id = p_owner), false);
$$;

-- one of the people who run Fluentdat?
create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;
-- banned from all of Fluentdat?
create or replace function public.app_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_bans where user_id = auth.uid());
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
  return is_admin(sv::uuid) and not app_banned();
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
-- linked channels: whoever can read a channel sees that it's linked (the rest, and the code, through link_info); links
-- are made and changed only through their functions
alter table public.channel_links enable row level security;
alter table public.channel_link_members enable row level security;
drop policy if exists "see that a channel you read is linked" on public.channel_link_members;
create policy "see that a channel you read is linked" on public.channel_link_members for select to authenticated using (chan_can(channel_id, 'view'));
-- (Discord's linked channels: seen through discord_info, changed through their functions, and never read directly)
alter table public.discord_links enable row level security;
alter table public.discord_outbox enable row level security;
alter table public.discord_sent enable row level security;
alter table public.discord_requests enable row level security;

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
drop policy if exists "boost" on public.server_boosts;                -- (boosting costs Datbux: boost_server)
drop policy if exists "stop boosting" on public.server_boosts;
create policy "stop boosting" on public.server_boosts for delete to authenticated using (user_id = auth.uid());
-- Datbux: you see your own wallet, history, tasks and trades, what the Shop costs, and what people you know have; only the
-- functions change anything
alter table public.wallets enable row level security;
drop policy if exists "your wallet" on public.wallets;
create policy "your wallet" on public.wallets for select to authenticated using (user_id = auth.uid());
alter table public.datbux_log enable row level security;
drop policy if exists "your Datbux history" on public.datbux_log;
create policy "your Datbux history" on public.datbux_log for select to authenticated using (user_id = auth.uid());
alter table public.task_claims enable row level security;
drop policy if exists "your tasks" on public.task_claims;
create policy "your tasks" on public.task_claims for select to authenticated using (user_id = auth.uid());
alter table public.shop_items enable row level security;
drop policy if exists "the Shop's prices" on public.shop_items;
create policy "the Shop's prices" on public.shop_items for select to authenticated using (true);
alter table public.owned_items enable row level security;
drop policy if exists "what people you know have" on public.owned_items;
create policy "what people you know have" on public.owned_items for select to authenticated using (knows(user_id) and shown_to_me(user_id, 'collection'));
alter table public.quest_rewards enable row level security;
drop policy if exists "what Quests give" on public.quest_rewards;
create policy "what Quests give" on public.quest_rewards for select to authenticated using (true);
alter table public.shop_bundles enable row level security;
drop policy if exists "the Shop's bundles" on public.shop_bundles;
create policy "the Shop's bundles" on public.shop_bundles for select to authenticated using (true);
alter table public.trades enable row level security;
drop policy if exists "your trades" on public.trades;
create policy "your trades" on public.trades for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
-- your settings: yours only
alter table public.user_settings enable row level security;
drop policy if exists "your settings" on public.user_settings;
create policy "your settings" on public.user_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists "keep your settings" on public.user_settings;
create policy "keep your settings" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "change your settings" on public.user_settings;
create policy "change your settings" on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "forget your settings" on public.user_settings;
create policy "forget your settings" on public.user_settings for delete to authenticated using (user_id = auth.uid());
-- whoever started a thread can remove it (admins and channel managers can anyway)
drop policy if exists "remove your threads" on public.channels;
create policy "remove your threads" on public.channels for delete to authenticated using (kind = 'thread' and created_by = auth.uid());

-- a profile's Connections, widgets and activity: seen by whoever can see the profile, kept by its owner
alter table public.profile_extras enable row level security;
-- (someone else's come through profile_extras_of, without the parts they keep from you)
drop policy if exists "see the extras of people you know" on public.profile_extras;
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
alter table public.app_bans enable row level security;
alter table public.app_invites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.server_emoji enable row level security;
alter table public.server_stickers enable row level security;

drop policy if exists "see whether you're one" on public.app_admins;
create policy "see whether you're one" on public.app_admins for select to authenticated using (user_id = auth.uid());
drop policy if exists "your own ban, or every one for the people who run fluentdat" on public.app_bans;
create policy "your own ban, or every one for the people who run fluentdat" on public.app_bans for select to authenticated using (user_id = auth.uid() or is_app_admin());

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
  if new.owner is distinct from old.owner and coalesce(current_setting('fluentdat.transfer', true), '') <> 'on' then raise exception 'A server''s owner can''t be changed.'; end if;
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

-- a game on a profile: its name, and maybe the name of its picture on Wikipedia (its cover), its Steam number (for its cover
-- from Steam), the name of its logo on Wikimedia Commons, or a small picture of its own; never a web address, so nobody can
-- see who looks at a profile
create or replace function public.game_ok(g jsonb, p_pictures boolean default true) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(g) = 'object'
    and not exists (select 1 from jsonb_object_keys(g) k where k not in ('n', 'w', 's', 'l', 'i', 'at'))
    and jsonb_typeof(g->'n') = 'string' and length(g->>'n') between 1 and 80 and (g->>'n') !~ '[[:cntrl:]]'
    and (g->'s' is null or (jsonb_typeof(g->'s') = 'string' and (g->>'s') ~ '^[0-9]{1,10}$'))
    and (g->'l' is null or (jsonb_typeof(g->'l') = 'string' and (g->>'l') ~ '^[^/\\?#<>|"{}[:cntrl:]]{1,180}\.(svg|png|jpe?g|gif|webp)$'))
    and (g->'w' is null or (jsonb_typeof(g->'w') = 'string' and (g->>'w') ~ '^[^/\\?#<>|"{}[:cntrl:]]{1,180}\.(svg|png|jpe?g|gif|webp)$'))
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
  if coalesce(jsonb_typeof(new.badges), '') <> 'object' or exists (select 1 from jsonb_object_keys(new.badges) k where k not in ('order', 'hidden'))
     or exists (select 1 from jsonb_each(new.badges) e where coalesce(jsonb_typeof(e.value), '') <> 'array' or jsonb_array_length(e.value) > 120
                or exists (select 1 from jsonb_array_elements(e.value) b where coalesce(jsonb_typeof(b), '') <> 'string' or (b #>> '{}') !~ '^[a-z0-9-]{1,24}$')) then
    raise exception 'Your badges are kept by name: the order you show them in, and the ones you hide.';
  end if;
  -- (your badges' log: the database writes the time a badge first shows up in it. One that knows its own day, like time on
  -- Fluentdat, may say so, but not before your account or after now. What's there stays as it was)
  if coalesce(jsonb_typeof(new.badge_log), '') <> 'object' or (select count(*) from jsonb_object_keys(new.badge_log)) > 140
     or exists (select 1 from jsonb_object_keys(new.badge_log) k where k !~ '^[a-z0-9-]{1,24}$') then
    raise exception 'Your badges'' log is kept by badge name (up to 140).';
  end if;
  new.badge_log := coalesce((select jsonb_object_agg(e.key, to_jsonb(case when (e.value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$'
      then greatest(least((e.value #>> '{}')::timestamptz, now()), coalesce((select created_at from profiles where id = new.id), now())) else now() end))
    from jsonb_each(new.badge_log) e), '{}'::jsonb);
  if TG_OP = 'UPDATE' then new.badge_log := new.badge_log || coalesce(old.badge_log, '{}'::jsonb); end if;
  -- (Game Time only goes up when the database times a game you stopped playing)
  if coalesce(current_setting('fluentdat.playtime', true), '') <> 'on' then
    new.play_seconds := case when TG_OP = 'UPDATE' then old.play_seconds else 0 end;
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
declare secs bigint := 0;
begin
  if new.playing is not null and jsonb_typeof(new.playing) = 'null' then new.playing := null; end if;
  if TG_OP = 'UPDATE' and new.playing is not distinct from old.playing then return new; end if;
  -- (a game you stop, or swap for another, adds its time to your Game Time: up to 12 hours a game)
  if TG_OP = 'UPDATE' and old.playing is not null and (new.playing is null or (old.playing - 'at') <> (new.playing - 'at')) then
    begin secs := greatest(0, least(43200, extract(epoch from now() - (old.playing->>'at')::timestamptz)))::bigint;
    exception when others then secs := 0; end;
    if secs > 0 then
      perform set_config('fluentdat.playtime', 'on', true);
      insert into profile_extras (id, play_seconds) values (new.id, secs) on conflict (id) do update set play_seconds = profile_extras.play_seconds + secs;
      perform set_config('fluentdat.playtime', '', true);
    end if;
  end if;
  if new.playing is null then return new; end if;
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
-- 7 resource pages, and up to 25 rules) and up to 12 game servers (a name, an address, maybe a game and a note)
-- your settings are an object of what Customize keeps: your preferences, your themes and which one is on (256 KB at most)
create or replace function public.guard_user_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(jsonb_typeof(new.data), '') <> 'object' or exists (select 1 from jsonb_object_keys(new.data) k where k not in ('v', 'prefs', 'themes', 'theme'))
     or (new.data ? 'prefs' and jsonb_typeof(new.data->'prefs') <> 'object')
     or (new.data ? 'themes' and (jsonb_typeof(new.data->'themes') <> 'array' or jsonb_array_length(new.data->'themes') > 60))
     or (new.data ? 'theme' and (jsonb_typeof(new.data->'theme') <> 'string' or length(new.data->>'theme') > 80))
     or octet_length(new.data::text) > 262144 then
    raise exception 'Those aren''t settings Fluentdat can keep (or they''re over 256 KB).';
  end if;
  new.user_id := coalesce(new.user_id, auth.uid());
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_user_settings on public.user_settings;
create trigger guard_user_settings before insert or update on public.user_settings for each row execute function public.guard_user_settings();

create or replace function public.server_extras_ok(f jsonb, g jsonb, gs jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(f) = 'object'
    and not exists (select 1 from jsonb_each(f) e where e.key not in ('browse', 'games', 'guide', 'events', 'member_events', 'boost', 'shop', 'rules') or jsonb_typeof(e.value) <> 'boolean')
    and jsonb_typeof(g) = 'object' and not exists (select 1 from jsonb_object_keys(g) k where k not in ('welcome', 'todos', 'res', 'rules'))
    and (g->'rules' is null or (jsonb_typeof(g->'rules') = 'array' and jsonb_array_length(g->'rules') <= 25 and not exists (
      select 1 from jsonb_array_elements(g->'rules') r where coalesce(jsonb_typeof(r), '') <> 'string' or length(r #>> '{}') not between 1 and 300 or (r #>> '{}') ~ '[[:cntrl:]]')))
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
-- linked channels: only the database makes their copies, so nobody can pass a message off as one from somewhere else
create or replace function public.guard_link_copy() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('fluentdat.linking', true), '') <> 'on' then new.link_src := null; new.linked := null; end if;
  return new;
end $$;
drop trigger if exists guard_link_copy on public.messages;
create trigger guard_link_copy before insert on public.messages for each row execute function public.guard_link_copy();
-- …and a message in a linked channel goes into each of the others, saying where it was said and who said it (a copy
-- answers the copy of what the original answered). A copy that can't be made doesn't stop the message itself
create or replace function public.copy_to_links() returns trigger
language plpgsql security definer set search_path = public as $$
declare l uuid; c channels%rowtype; sname text; who text; root uuid; t record; rep uuid; lk jsonb;
begin
  if new.link_src is not null or new.bot then return null; end if;
  select link_id into l from channel_link_members where channel_id = new.channel_id;
  if l is null then return null; end if;
  select * into c from channels where id = new.channel_id;
  select name into sname from servers where id = c.server_id;
  select coalesce(nullif(m.nick, ''), nullif(p.name, ''), p.handle) into who
    from profiles p left join server_members m on m.server_id = c.server_id and m.user_id = p.id where p.id = new.author;
  -- (a message from Discord goes on saying it's from there)
  lk := coalesce(new.linked, jsonb_build_object('server', left(coalesce(sname, ''), 100), 'channel', c.name, 'name', left(coalesce(who, ''), 100), 'from', new.channel_id));
  if new.reply_to is not null then select coalesce(link_src, id) into root from messages where id = new.reply_to; end if;
  perform set_config('fluentdat.linking', 'on', true);
  for t in select k.channel_id from channel_link_members k join channels ch on ch.id = k.channel_id
           where k.link_id = l and k.channel_id <> new.channel_id and ch.kind = 'text' loop
    begin
      rep := null;
      if root is not null then select id into rep from messages where channel_id = t.channel_id and (id = root or link_src = root) limit 1; end if;
      insert into messages (channel_id, author, text, sticker, action, files, forwarded, reply_to, link_src, linked, created_at)
        values (t.channel_id, new.author, new.text, new.sticker, new.action, new.files, new.forwarded, rep, new.id, lk, new.created_at);
    exception when others then raise notice 'Fluentdat: a linked copy wasn''t made (%)', sqlerrm;
    end;
  end loop;
  perform set_config('fluentdat.linking', '', true);
  return null;
end $$;
drop trigger if exists copy_to_links on public.messages;
create trigger copy_to_links after insert on public.messages for each row execute function public.copy_to_links();
-- (a channel joining or leaving a link touches the link's other channels, so the people in them hear of it live: they
-- can't see the other side's row. A link whose last channel went, taken out or deleted, goes too)
create or replace function public.link_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare l uuid := coalesce(new.link_id, old.link_id); ch uuid := coalesce(new.channel_id, old.channel_id);
begin
  update channel_link_members set changed_at = now() where link_id = l and channel_id <> ch;
  if TG_OP = 'DELETE' then delete from channel_links where id = l and not exists (select 1 from channel_link_members where link_id = l); end if;
  return null;
end $$;
drop trigger if exists link_changed on public.channel_link_members;
create trigger link_changed after insert or delete on public.channel_link_members for each row execute function public.link_changed();
revoke all on function public.guard_link_copy(), public.copy_to_links(), public.link_changed() from public, anon, authenticated;
-- Discord's linked channels: a message here waits to go to each of them, to show there under the name of whoever said
-- it and where, "TrixWotel (#sync)", with their picture when it's on the web (a copy from a linked channel says where it
-- was said, and nothing goes back to the Discord channel it came from). @mentions, channels and emoji go as words;
-- pictures and files as what they are. One that can't be made doesn't stop the message itself
create or replace function public.discord_text_out(p_text text, p_server uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare t text := coalesce(p_text, ''); m text[]; v text;
  uuid_re constant text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
begin
  for m in select regexp_matches(t, '<@(' || uuid_re || ')>', 'g') loop
    select coalesce(nullif(sm.nick, ''), nullif(p.name, ''), p.handle) into v
      from profiles p left join server_members sm on sm.server_id = p_server and sm.user_id = p.id where p.id = m[1]::uuid;
    t := replace(t, '<@' || m[1] || '>', '@' || coalesce(v, 'someone'));
  end loop;
  for m in select regexp_matches(t, '<#(' || uuid_re || ')>', 'g') loop
    select name into v from channels where id = m[1]::uuid;
    t := replace(t, '<#' || m[1] || '>', '#' || coalesce(v, 'channel'));
  end loop;
  return regexp_replace(t, '<a?:([A-Za-z0-9_]{2,32}):' || uuid_re || '>', ':\1:', 'g');
end $$;
-- the name it goes out under (80 characters at most). Discord won't take "discord" or "clyde" in one, so those get a
-- look-alike letter; plain, without @ # : and ` as well, for a channel where Discord turned a name down
create or replace function public.discord_name(p_name text, p_channel text, p_plain boolean default false) returns text
language plpgsql immutable as $$
declare tail text := ' (#' || left(coalesce(nullif(trim(p_channel), ''), 'channel'), 30) || ')'; n text;
begin
  n := left(coalesce(nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), ''), 'Someone'), 80 - char_length(tail)) || tail;
  if p_plain then n := translate(n, '@#:`', ''); end if;
  n := regexp_replace(n, '(d)(isc)o(rd)', '\1\2' || chr(1086) || '\3', 'gi');
  return regexp_replace(n, '(cl)y(de)', '\1' || chr(1091) || '\2', 'gi');
end $$;
create or replace function public.discord_out() returns trigger
language plpgsql security definer set search_path = public as $$
declare c channels%rowtype; ch text; who text; body text; f jsonb; av text;
begin
  if new.bot or not exists (select 1 from discord_links where channel_id = new.channel_id and status = 'ok') then return null; end if;
  begin
    select * into c from channels where id = new.channel_id;
    if new.linked is not null then ch := new.linked->>'channel'; who := new.linked->>'name';
    else
      ch := c.name;
      select coalesce(nullif(m.nick, ''), nullif(p.name, ''), p.handle) into who
        from profiles p left join server_members m on m.server_id = c.server_id and m.user_id = p.id where p.id = new.author;
    end if;
    -- (their picture, when it's on the web: Discord can't show one kept in Fluentdat)
    if coalesce(new.linked->>'discord', '') <> 'true' then select avatar into av from profiles where id = new.author and avatar ~ '^https://'; end if;
    body := discord_text_out(new.text, c.server_id);
    if new.action and body <> '' then body := '*' || body || '*'; end if;
    if new.sticker is not null then body := concat_ws(' ', nullif(body, ''), case when new.sticker->>'photo' = 'true' then '[picture]' else '[sticker]' end); end if;
    if jsonb_typeof(new.files) = 'array' then
      for f in select value from jsonb_array_elements(new.files) loop
        body := concat_ws(' ', nullif(body, ''), case f->>'kind' when 'image' then '[picture]' when 'video' then '[video]' when 'voice' then '[voice message]'
          else '[file: ' || left(coalesce(f->>'name', 'file'), 100) || ']' end);
      end loop;
    end if;
    if body = '' then return null; end if;
    if char_length(body) > 2000 then body := left(body, 1999) || '…'; end if;
    insert into discord_outbox (link_id, kind, message_id, line, who, avatar)
      select id, 'say', new.id, body, discord_name(who, ch, plain_names), av from discord_links
      where channel_id = new.channel_id and status = 'ok' and discord_channel is distinct from (new.linked->>'dchan');
  exception when others then raise notice 'Fluentdat: a line for Discord wasn''t made (%)', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists discord_out on public.messages;
create trigger discord_out after insert on public.messages for each row execute function public.discord_out();
-- deleting a message here deletes it in Discord too (a line that hasn't gone yet doesn't go). Lines that went out
-- together in one Discord message with it are said again without it
create or replace function public.discord_drop() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not exists (select 1 from discord_sent where message_id = old.id) and not exists (select 1 from discord_outbox where message_id = old.id) then return null; end if;
  begin
    delete from discord_outbox where kind = 'say' and message_id = old.id;
    for s in delete from discord_sent where message_id = old.id returning link_id, dmsg loop
      insert into discord_outbox (link_id, kind, dmsg) values (s.link_id, 'drop', s.dmsg);
      insert into discord_outbox (link_id, kind, message_id, line, who, avatar)
        select link_id, 'say', message_id, line, who, avatar from discord_sent where link_id = s.link_id and dmsg = s.dmsg order by pos;
      delete from discord_sent where link_id = s.link_id and dmsg = s.dmsg;
    end loop;
  exception when others then raise notice 'Fluentdat: a message wasn''t deleted in Discord (%)', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists discord_drop on public.messages;
create trigger discord_drop after delete on public.messages for each row execute function public.discord_drop();
revoke all on function public.discord_text_out(text, uuid), public.discord_name(text, text, boolean), public.discord_out(), public.discord_drop() from public, anon, authenticated;

-- ===================== actions (the only ways to do these) =====================
-- a server's boost level: 2 boosts make level 1, 7 level 2, 14 level 3 (as on Discord)
create or replace function public.boost_level(p_server uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when n >= 14 then 3 when n >= 7 then 2 when n >= 2 then 1 else 0 end from (select count(*) n from server_boosts where server_id = p_server and paid_until > now()) x;
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
-- which setup.sql this is, so Fluentdat knows what the database can do (8: games' pictures from Wikipedia; 9: Datbux; 10: settings
-- that follow your account, and a server's rules; 11: boosts for Datbux, everything in the Shop for Datbux, nameplates;
-- 15: TrixWotel's commands: bans from all of Fluentdat, taking someone out of a server, Datbux from the people who run it;
-- 16: who sees what of your profile; 17: deleting your account, and handing a server on; 18: linked channels; 19: Discord
-- channels linked too; 20: what goes to Discord shows under each person's name; 21: a hundred more decorations, and
-- bundles 10–25% less than their things, with smaller sales)
create or replace function public.setup_version() returns int language sql immutable as $$ select 21 $$;

-- ===================== Datbux =====================
-- someone's wallet, made the first time it's needed (with a welcome of 200 Datbux)
create or replace function public.wallet_open(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into wallets (user_id, balance, earned) values (p_user, 200, 200) on conflict (user_id) do nothing;
  if found then insert into datbux_log (user_id, amount, kind, note) values (p_user, 200, 'welcome', 'Welcome to Datbux'); end if;
end $$;
-- the tasks: what, how often, how many Datbux, what's counted, and how many of it
create or replace function public.datbux_tasks() returns table (task text, every text, reward int, counts text, goal int)
language sql immutable set search_path = public as $$
  values ('daily-checkin', 'day', 50, 'none', 1), ('daily-message', 'day', 30, 'messages', 1), ('daily-react', 'day', 20, 'reactions', 3),
    ('weekly-messages', 'week', 200, 'messages', 50), ('weekly-react', 'week', 100, 'reactions', 20), ('weekly-thread', 'week', 120, 'threads', 1),
    ('monthly-days', 'month', 600, 'days', 10), ('monthly-messages', 'month', 500, 'messages', 300),
    ('yearly-checkin', 'year', 2500, 'none', 1), ('yearly-messages', 'year', 3000, 'messages', 2000)
$$;
-- this day's, week's, month's or year's name (2026-10-21, 2026-W43, 2026-10, 2026) and when it began (UTC)
create or replace function public.task_period(p_every text, out key text, out since timestamptz)
language sql stable set search_path = public as $$
  select case p_every when 'day' then to_char(now() at time zone 'utc', 'YYYY-MM-DD') when 'week' then to_char(now() at time zone 'utc', 'IYYY-"W"IW')
           when 'month' then to_char(now() at time zone 'utc', 'YYYY-MM') else to_char(now() at time zone 'utc', 'YYYY') end,
         date_trunc(case p_every when 'day' then 'day' when 'week' then 'week' when 'month' then 'month' else 'year' end, now() at time zone 'utc') at time zone 'utc';
$$;
-- how much of a task someone has done since a time
create or replace function public.task_count(p_user uuid, p_counts text, p_since timestamptz) returns int
language sql stable security definer set search_path = public as $$
  select (case p_counts
    when 'none' then 1
    when 'messages' then (select count(*) from messages where author = p_user and not bot and linked is null and created_at >= p_since)
      + (select count(*) from dm_messages where author = p_user and not bot and created_at >= p_since)
    when 'reactions' then (select count(*) from reactions where user_id = p_user and active and created_at >= p_since)
    when 'threads' then (select count(*) from channels where kind = 'thread' and created_by = p_user and created_at >= p_since)
    when 'days' then (select count(distinct (x.t at time zone 'utc')::date) from (select created_at t from messages where author = p_user and not bot and linked is null and created_at >= p_since
      union all select created_at from dm_messages where author = p_user and not bot and created_at >= p_since) x)
    else 0 end)::int;
$$;
-- your tasks: how far along each is, whether you've claimed it this time, and when it comes back
create or replace function public.task_progress() returns table (task text, every text, reward int, goal int, have int, claimed boolean, resets timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare t record; p record;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  for t in select * from datbux_tasks() loop
    select * into p from task_period(t.every);
    task := t.task; every := t.every; reward := t.reward; goal := t.goal;
    have := least(t.goal, task_count(auth.uid(), t.counts, p.since));
    claimed := exists (select 1 from task_claims c where c.user_id = auth.uid() and c.task = t.task and c.period = p.key);
    resets := p.since + case t.every when 'day' then interval '1 day' when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 year' end;
    return next;
  end loop;
end $$;
-- claim a task you've done (once each day, week, month or year): its Datbux go in your wallet
create or replace function public.claim_task(p_task text) returns bigint
language plpgsql security definer set search_path = public as $$
declare t record; p record; done int;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into t from datbux_tasks() d where d.task = p_task;
  if not found then raise exception 'There''s no such task.'; end if;
  select * into p from task_period(t.every);
  if exists (select 1 from task_claims c where c.user_id = auth.uid() and c.task = p_task and c.period = p.key) then
    raise exception 'You''ve claimed that already. It comes back next %.', t.every;
  end if;
  done := task_count(auth.uid(), t.counts, p.since);
  if done < t.goal then raise exception 'Not done yet: % of %.', done, t.goal; end if;
  perform wallet_open(auth.uid());
  insert into task_claims (user_id, task, period) values (auth.uid(), p_task, p.key);
  update wallets set balance = balance + t.reward, earned = earned + t.reward, updated_at = now() where user_id = auth.uid();
  insert into datbux_log (user_id, amount, kind, note) values (auth.uid(), t.reward, 'task', p_task);
  return (select balance from wallets where user_id = auth.uid());
end $$;
-- buy something in the Shop: it's yours (to wear, or to trade)
create or replace function public.buy_item(p_kind text, p_item text) returns bigint
language plpgsql security definer set search_path = public as $$
declare cost int; bal bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select s.price into cost from shop_items s where s.kind = p_kind and s.item = p_item;
  if not found then raise exception 'That isn''t in the Shop.'; end if;
  if exists (select 1 from owned_items o where o.user_id = auth.uid() and o.kind = p_kind and o.item = p_item) then raise exception 'You have that already.'; end if;
  perform wallet_open(auth.uid());
  select balance into bal from wallets where user_id = auth.uid() for update;
  if bal < cost then raise exception 'That costs % Datbux, and you have %.', cost, bal; end if;
  update wallets set balance = balance - cost, spent = spent + cost, updated_at = now() where user_id = auth.uid();
  insert into owned_items (user_id, kind, item, how) values (auth.uid(), p_kind, p_item, 'buy');
  insert into datbux_log (user_id, amount, kind, note) values (auth.uid(), -cost, 'buy', p_kind || ':' || p_item);
  return bal - cost;
end $$;
-- the Shop's holidays on a day (UTC): a bundle made for a 'theme' one costs less while it's on, and on a 'sale' day every
-- bundle does (as datbux.js HOLIDAYS). Black Friday runs from the day after Thanksgiving (November's fourth Thursday) to
-- Cyber Monday
create or replace function public.shop_sales(p_at timestamptz default now()) returns table (id text, name text, kind text, pct int, ends date)
language sql stable set search_path = public as $$
  with d as (select (p_at at time zone 'utc')::date as day),
  t as (select day, extract(year from day)::int as yr, make_date(extract(year from day)::int, 11, 1) as nov1 from d),
  h (id, name, kind, pct, starts, ends) as (
    select 'valentines', 'Valentine’s Day', 'theme', 10, make_date(yr, 2, 7), make_date(yr, 2, 14) from t union all
    select 'hanami', 'Cherry Blossom Season', 'theme', 10, make_date(yr, 3, 20), make_date(yr, 4, 10) from t union all
    select 'halloween', 'Halloween', 'theme', 10, make_date(yr, 10, 17), make_date(yr, 10, 31) from t union all
    select 'winter', 'Winter Holidays', 'theme', 10, make_date(yr, 12, 15), make_date(yr, 12, 31) from t union all
    select 'blackfriday', 'Black Friday', 'sale', 15, nov1 + ((4 - extract(dow from nov1)::int + 7) % 7) + 22, nov1 + ((4 - extract(dow from nov1)::int + 7) % 7) + 25 from t union all
    select 'yearend', 'Year-End Sale', 'sale', 10, make_date(yr, 12, 26), make_date(yr, 12, 31) from t)
  select h.id, h.name, h.kind, h.pct, h.ends from h, d where d.day between h.starts and h.ends;
$$;
-- how much off a bundle is at a time: its holiday's, or a sale's (whichever is more)
create or replace function public.bundle_pct(p_bundle text, p_at timestamptz default now()) returns int
language sql stable set search_path = public as $$
  select coalesce(max(s.pct), 0)::int from shop_bundles b, shop_sales(p_at) s where b.id = p_bundle and (s.kind = 'sale' or s.id = b.holiday);
$$;
-- what a bundle costs someone now: its things they don't have yet, at the bundle's own rate (their prices less its cut),
-- less what's off today; to the nearest 10 (0: they have it all)
create or replace function public.bundle_cost(p_bundle text, p_user uuid) returns bigint
language sql stable security definer set search_path = public as $$
  with s as (select coalesce(sum(i.price), 0)::bigint as total from shop_bundles b cross join lateral jsonb_array_elements(b.items) it
               join shop_items i on i.kind = it ->> 'k' and i.item = it ->> 'i'
             where b.id = p_bundle and not exists (select 1 from owned_items o where o.user_id = p_user and o.kind = it ->> 'k' and o.item = it ->> 'i')),
       c as (select coalesce((select cut from shop_bundles where id = p_bundle), 0) as cut),
       p as (select bundle_pct(p_bundle, now()) as pct)
  select case when s.total = 0 then 0 else greatest(10, round(s.total * (100 - c.cut) * (100 - p.pct) / 100000.0) * 10)::bigint end from s, c, p;
$$;
-- buy a bundle: everything in it is yours (what you had already, you keep; it isn't paid for twice)
create or replace function public.buy_bundle(p_bundle text) returns bigint
language plpgsql security definer set search_path = public as $$
declare b shop_bundles%rowtype; cost bigint; bal bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into b from shop_bundles where id = p_bundle;
  if not found then raise exception 'That bundle isn''t in the Shop.'; end if;
  perform wallet_open(auth.uid());
  select balance into bal from wallets where user_id = auth.uid() for update;
  cost := bundle_cost(p_bundle, auth.uid());
  if cost <= 0 then raise exception 'You have everything in the % Bundle already.', b.name; end if;
  if bal < cost then raise exception 'That costs % Datbux, and you have %.', cost, bal; end if;
  update wallets set balance = balance - cost, spent = spent + cost, updated_at = now() where user_id = auth.uid();
  insert into owned_items (user_id, kind, item, how) select auth.uid(), it ->> 'k', it ->> 'i', 'buy' from jsonb_array_elements(b.items) it on conflict do nothing;
  insert into datbux_log (user_id, amount, kind, note) values (auth.uid(), -cost, 'buy', 'bundle:' || b.id);
  return bal - cost;
end $$;
-- send someone you know some Datbux (up to 100,000 at a time)
create or replace function public.send_datbux(p_to uuid, p_amount int, p_note text default '') returns bigint
language plpgsql security definer set search_path = public as $$
declare bal bigint; words text := left(trim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), 160);
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_to is null or p_to = auth.uid() then raise exception 'Send Datbux to someone else.'; end if;
  if not knows(p_to) then raise exception 'You can only send Datbux to people you know.'; end if;
  if blocked_with(p_to) then raise exception 'You can''t send them anything.'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'Send between 1 and 100,000 Datbux.'; end if;
  perform wallet_open(auth.uid()); perform wallet_open(p_to);
  perform 1 from wallets where user_id in (auth.uid(), p_to) order by user_id for update;
  select balance into bal from wallets where user_id = auth.uid();
  if bal < p_amount then raise exception 'You have % Datbux.', bal; end if;
  update wallets set balance = balance - p_amount, sent = sent + p_amount, updated_at = now() where user_id = auth.uid();
  update wallets set balance = balance + p_amount, received = received + p_amount, updated_at = now() where user_id = p_to;
  insert into datbux_log (user_id, amount, kind, note, other) values (auth.uid(), -p_amount, 'send', words, p_to), (p_to, p_amount, 'receive', words, auth.uid());
  return bal - p_amount;
end $$;
-- what a trade can hold each way: up to 10 things from the Shop (by kind and name), each once
create or replace function public.trade_items_ok(p jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 10
    and not exists (select 1 from jsonb_array_elements(p) x where jsonb_typeof(x) <> 'object' or coalesce(x->>'k', '') not in ('deco', 'font', 'effect', 'frame', 'plate')
      or coalesce(x->>'i', '') !~ '^[a-z0-9-]{1,24}$' or exists (select 1 from jsonb_object_keys(x) k where k not in ('k', 'i')))
    and (select count(*) = count(distinct (x->>'k') || ':' || (x->>'i')) from jsonb_array_elements(p) x), false);
$$;
create or replace function public.owns_all(p_user uuid, p jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from jsonb_array_elements(p) x where not exists (select 1 from owned_items o where o.user_id = p_user and o.kind = x->>'k' and o.item = x->>'i'));
$$;
create or replace function public.owns_any(p_user uuid, p jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jsonb_array_elements(p) x join owned_items o on o.user_id = p_user and o.kind = x->>'k' and o.item = x->>'i');
$$;
-- offer someone you know a trade (it waits for them; at most 10 waiting from you)
create or replace function public.offer_trade(p_to uuid, p_give_bux int, p_give_items jsonb, p_want_bux int, p_want_items jsonb, p_note text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare t_id uuid; bal bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_to is null or p_to = auth.uid() then raise exception 'Trade with someone else.'; end if;
  if not knows(p_to) then raise exception 'You can only trade with people you know.'; end if;
  if blocked_with(p_to) then raise exception 'You can''t trade with them.'; end if;
  p_give_bux := coalesce(p_give_bux, 0); p_want_bux := coalesce(p_want_bux, 0);
  p_give_items := coalesce(p_give_items, '[]'::jsonb); p_want_items := coalesce(p_want_items, '[]'::jsonb);
  if p_give_bux < 0 or p_want_bux < 0 or p_give_bux > 100000 or p_want_bux > 100000 then raise exception 'Up to 100,000 Datbux each way.'; end if;
  if not trade_items_ok(p_give_items) or not trade_items_ok(p_want_items) then raise exception 'A trade holds up to 10 things from the Shop each way.'; end if;
  if p_give_bux = 0 and p_want_bux = 0 and jsonb_array_length(p_give_items) = 0 and jsonb_array_length(p_want_items) = 0 then raise exception 'Put something in the trade.'; end if;
  if not owns_all(auth.uid(), p_give_items) then raise exception 'You can only offer things you have.'; end if;
  if not owns_all(p_to, p_want_items) then raise exception 'They don''t have all of that.'; end if;
  if owns_any(p_to, p_give_items) then raise exception 'They have some of that already.'; end if;
  if owns_any(auth.uid(), p_want_items) then raise exception 'You have some of that already.'; end if;
  perform wallet_open(auth.uid());
  select balance into bal from wallets where user_id = auth.uid();
  if bal < p_give_bux then raise exception 'You have % Datbux.', bal; end if;
  if (select count(*) from trades where from_user = auth.uid() and status = 'open') >= 10 then raise exception 'You have 10 trades waiting already. Cancel one first.'; end if;
  insert into trades (from_user, to_user, give_bux, give_items, want_bux, want_items, note)
    values (auth.uid(), p_to, p_give_bux, p_give_items, p_want_bux, p_want_items, left(trim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), 200))
    returning id into t_id;
  return t_id;
end $$;
-- something changing hands (taken off first, if its owner is wearing it)
create or replace function public.move_item(p_from uuid, p_to uuid, p_kind text, p_item text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from owned_items where user_id = p_from and kind = p_kind and item = p_item;
  insert into owned_items (user_id, kind, item, how) values (p_to, p_kind, p_item, 'trade') on conflict do nothing;
  if p_kind = 'deco' then update profiles set decoration = '' where id = p_from and decoration = p_item;
  elsif p_kind = 'font' then update profiles set name_font = '' where id = p_from and name_font = p_item;
  elsif p_kind = 'effect' then update profiles set effect = '' where id = p_from and effect = p_item;
  elsif p_kind = 'frame' then update profiles set frame = '' where id = p_from and frame = p_item;
  elsif p_kind = 'plate' then update profiles set plate = '' where id = p_from and plate = 'np:' || p_item; end if;
end $$;
-- the other person's answer: accepting checks both sides still have it all, then swaps everything at once
create or replace function public.answer_trade(p_trade uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; a bigint; b bigint; x jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into t from trades where id = p_trade for update;
  if not found or t.to_user <> auth.uid() then raise exception 'There''s no such trade for you.'; end if;
  if t.status <> 'open' then raise exception 'That trade is over already.'; end if;
  if not coalesce(p_accept, false) then update trades set status = 'declined', decided_at = now() where id = p_trade; return 'declined'; end if;
  perform wallet_open(t.from_user); perform wallet_open(t.to_user);
  perform 1 from wallets where user_id in (t.from_user, t.to_user) order by user_id for update;
  select balance into a from wallets where user_id = t.from_user;
  select balance into b from wallets where user_id = t.to_user;
  if a < t.give_bux or b < t.want_bux or not owns_all(t.from_user, t.give_items) or not owns_all(t.to_user, t.want_items) then
    update trades set status = 'failed', decided_at = now(), why = case when a < t.give_bux then 'They don''t have those Datbux any more.' when b < t.want_bux then 'You don''t have enough Datbux.'
      when not owns_all(t.from_user, t.give_items) then 'They don''t have what they offered any more.' else 'You don''t have what they asked for any more.' end where id = p_trade;
    return 'failed';
  end if;
  update wallets set balance = balance - t.give_bux + t.want_bux, sent = sent + t.give_bux, received = received + t.want_bux, updated_at = now() where user_id = t.from_user;
  update wallets set balance = balance - t.want_bux + t.give_bux, sent = sent + t.want_bux, received = received + t.give_bux, updated_at = now() where user_id = t.to_user;
  for x in select * from jsonb_array_elements(t.give_items) loop perform move_item(t.from_user, t.to_user, x->>'k', x->>'i'); end loop;
  for x in select * from jsonb_array_elements(t.want_items) loop perform move_item(t.to_user, t.from_user, x->>'k', x->>'i'); end loop;
  if t.give_bux <> t.want_bux then
    insert into datbux_log (user_id, amount, kind, note, other) values (t.from_user, t.want_bux - t.give_bux, 'trade', 'Trade', t.to_user), (t.to_user, t.give_bux - t.want_bux, 'trade', 'Trade', t.from_user);
  end if;
  update trades set status = 'done', decided_at = now() where id = p_trade;
  return 'done';
end $$;
create or replace function public.cancel_trade(p_trade uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update trades set status = 'cancelled', decided_at = now() where id = p_trade and from_user = auth.uid() and status = 'open';
  if not found then raise exception 'There''s no trade of yours waiting like that.'; end if;
end $$;
-- ===================== boosting, for Datbux =====================
-- a boost costs 25 Datbux a day, paid ahead: a day, or up to 30 at once (and never more than 90 days ahead). A boost that
-- ran out starts again from today.
create or replace function public.boost_price() returns int language sql immutable as $$ select 25 $$;
create or replace function public.boost_server(p_server uuid, p_days int default 1) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare cost int; bal bigint; was timestamptz; until timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_server is null or not is_member(p_server) then raise exception 'Join the server to boost it.'; end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'Boost for 1 to 30 days at a time.'; end if;
  select paid_until into was from server_boosts where server_id = p_server and user_id = auth.uid() for update;
  until := greatest(coalesce(was, now()), now()) + make_interval(days => p_days);
  if until > now() + interval '90 days' then raise exception 'You can pay up to 90 days ahead.'; end if;
  cost := boost_price() * p_days;
  perform wallet_open(auth.uid());
  select balance into bal from wallets where user_id = auth.uid() for update;
  if bal < cost then raise exception 'That costs % Datbux, and you have %.', cost, bal; end if;
  update wallets set balance = balance - cost, spent = spent + cost, updated_at = now() where user_id = auth.uid();
  insert into datbux_log (user_id, amount, kind, note) values (auth.uid(), -cost, 'boost', left(coalesce((select name from servers where id = p_server), ''), 160));
  insert into server_boosts (server_id, user_id, created_at, paid_until, auto) values (p_server, auth.uid(), now(), until, true)
    on conflict (server_id, user_id) do update set paid_until = until, auto = true,
      created_at = case when server_boosts.paid_until > now() then server_boosts.created_at else now() end;
  return until;
end $$;
-- keep paying for a boost, or let it run out (stopping one now is deleting it)
create or replace function public.set_boost_auto(p_server uuid, p_auto boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update server_boosts set auto = coalesce(p_auto, true) where server_id = p_server and user_id = auth.uid();
  if not found then raise exception 'You aren''t boosting that server.'; end if;
end $$;
-- another day for each of someone's boosts that has less than a day left, while their Datbux last (one that ran out
-- stays off until they boost again)
create or replace function public.renew_boosts_for(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0; bal bigint; price int := boost_price();
begin
  if not exists (select 1 from server_boosts where user_id = p_user and auto and paid_until > now() and paid_until < now() + interval '1 day') then return 0; end if;
  perform wallet_open(p_user);
  for b in select server_id from server_boosts where user_id = p_user and auto and paid_until > now() and paid_until < now() + interval '1 day' order by paid_until loop
    select balance into bal from wallets where user_id = p_user for update;
    exit when bal < price;
    update wallets set balance = balance - price, spent = spent + price, updated_at = now() where user_id = p_user;
    insert into datbux_log (user_id, amount, kind, note) values (p_user, -price, 'boost', left(coalesce((select name from servers where id = b.server_id), ''), 160));
    update server_boosts set paid_until = paid_until + interval '1 day' where server_id = b.server_id and user_id = p_user;
    n := n + 1;
  end loop;
  return n;
end $$;
-- yours (Fluentdat asks while it's open)
create or replace function public.renew_boosts() returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return renew_boosts_for(auth.uid());
end $$;
-- everyone's (every hour, where Supabase's pg_cron is turned on)
create or replace function public.renew_all_boosts() returns int
language plpgsql security definer set search_path = public as $$
declare u uuid; n int := 0;
begin
  for u in select distinct user_id from server_boosts where auto and paid_until > now() and paid_until < now() + interval '1 day' loop
    n := n + renew_boosts_for(u);
  end loop;
  return n;
end $$;
-- a Quest's reward, once you've finished the Quest (the ones you finished are on your profile)
create or replace function public.claim_quest_reward(p_quest text) returns text
language plpgsql security definer set search_path = public as $$
declare r quest_rewards%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into r from quest_rewards where quest = p_quest;
  if not found then raise exception 'There''s no such Quest.'; end if;
  if not exists (select 1 from profile_extras where id = auth.uid() and quests ? p_quest) then raise exception 'Finish that Quest first.'; end if;
  insert into owned_items (user_id, kind, item, how) values (auth.uid(), r.kind, r.item, 'quest') on conflict do nothing;
  return r.item;
end $$;
-- you can wear something from the Shop that's free, or that you have
create or replace function public.shop_ok(p_kind text, p_item text, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_item, '') = '' or not exists (select 1 from shop_items s where s.kind = p_kind and s.item = p_item and s.price > 0)
    or exists (select 1 from owned_items o where o.user_id = p_user and o.kind = p_kind and o.item = p_item);
$$;
create or replace function public.guard_shop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.decoration is distinct from old.decoration and not shop_ok('deco', new.decoration, new.id) then raise exception 'Get that decoration in the Shop first.'; end if;
  if new.name_font is distinct from old.name_font and not shop_ok('font', new.name_font, new.id) then raise exception 'Get that font in the Shop first.'; end if;
  if new.effect is distinct from old.effect and not shop_ok('effect', new.effect, new.id) then raise exception 'Get that effect in the Shop first.'; end if;
  if new.frame is distinct from old.frame and not shop_ok('frame', new.frame, new.id) then raise exception 'Get that frame in the Shop first.'; end if;
  if new.plate is distinct from old.plate and new.plate like 'np:%' and not exists (select 1 from shop_items where kind = 'plate' and item = substr(new.plate, 4)) then
    raise exception 'That isn''t a nameplate from the Shop.';
  end if;
  if new.plate is distinct from old.plate and not shop_ok('plate', case when new.plate like 'np:%' then substr(new.plate, 4) else '' end, new.id) then
    raise exception 'Get that nameplate in the Shop first.';
  end if;
  return new;
end $$;
drop trigger if exists guard_shop on public.profiles;
create trigger guard_shop before update on public.profiles for each row execute function public.guard_shop();
-- what someone's badges are made of (earned by doing things, as on Discord), for whoever may see their profile: the
-- messages they wrote, reactions, threads, friends, the biggest server they run, since when they boost, their events,
-- Quests, connections, games on their Board, Game Time, and whether they help run Fluentdat
create or replace function public.badge_stats(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare x profile_extras%rowtype; pr profiles%rowtype; wal wallets%rowtype; res jsonb;
begin
  if auth.uid() is null or p_user is null or not knows(p_user) then raise exception 'You can only see the badges of people you know.'; end if;
  select * into x from profile_extras where id = p_user;
  select * into pr from profiles where id = p_user;
  select * into wal from wallets where user_id = p_user;
  res := jsonb_build_object(
    'servers', (select count(*) from server_members where user_id = p_user), 'owns', (select count(*) from servers where owner = p_user),
    'files', (select count(*) from messages where author = p_user and linked is null and jsonb_typeof(files) = 'array' and jsonb_array_length(files) > 0)
      + (select count(*) from dm_messages where author = p_user and jsonb_typeof(files) = 'array' and jsonb_array_length(files) > 0),
    'pins', (select count(*) from pins where pinned_by = p_user), 'calls', (select count(*) from calls where started_by = p_user),
    'bot_cmds', (select count(*) from messages where author = p_user and bot),
    'said42', exists (select 1 from messages where author = p_user and not bot and trim(text) = '42') or exists (select 1 from dm_messages where author = p_user and not bot and trim(text) = '42'),
    'said_hello', exists (select 1 from messages where author = p_user and not bot and text ilike '%hello fluentdat%') or exists (select 1 from dm_messages where author = p_user and not bot and text ilike '%hello fluentdat%'),
    'self_react', exists (select 1 from reactions r join messages m on m.id = r.message_id where r.user_id = p_user and r.active and m.author = p_user)
      or exists (select 1 from reactions r join dm_messages m on m.id = r.message_id where r.user_id = p_user and r.active and m.author = p_user),
    'emoji_kinds', (select count(distinct emoji) from reactions where user_id = p_user and active),
    'night', (select count(*) from messages where author = p_user and not bot and linked is null and extract(hour from created_at at time zone 'utc') < 4)
      + (select count(*) from dm_messages where author = p_user and not bot and extract(hour from created_at at time zone 'utc') < 4),
    'want', coalesce((select sum(jsonb_array_length(v->'g')) from jsonb_array_elements(x.widgets) v where v->>'t' = 'want'), 0),
    'looks', jsonb_build_object('avatar', coalesce(pr.avatar, '') <> '', 'banner', coalesce(pr.banner, '') <> '', 'bio', coalesce(pr.about, '') <> '', 'pronouns', coalesce(pr.pronouns, '') <> '',
      'theme', coalesce(pr.theme1, '') <> '' or coalesce(pr.theme2, '') <> '', 'style', coalesce(pr.name_font, '') <> '' or coalesce(pr.name_effect, '') <> '',
      'deco', coalesce(pr.decoration, '') <> '', 'effect', coalesce(pr.effect, '') <> '', 'frame', coalesce(pr.frame, '') <> '', 'plate', coalesce(pr.plate, '') <> '',
      'bubble', coalesce(pr.bubble, '') <> '', 'tag', coalesce(pr.tag, '') <> ''),
    'bux_earned', coalesce(wal.earned, 0), 'bux_spent', coalesce(wal.spent, 0), 'bux_sent', coalesce(wal.sent, 0),
    'sent_people', (select count(distinct other) from datbux_log where user_id = p_user and kind = 'send'),
    'trades', (select count(*) from trades where status = 'done' and (from_user = p_user or to_user = p_user)),
    'owned', (select count(*) from owned_items where user_id = p_user), 'tasks', (select count(*) from task_claims where user_id = p_user),
    'streak', (select coalesce(max(n), 0) from (select count(*) n from (select d, d - (row_number() over (order by d))::int g
      from (select period::date d from task_claims where user_id = p_user and task = 'daily-checkin') q) r group by g) z)) || jsonb_build_object(
    'since', (select created_at from profiles where id = p_user),
    'messages', (select count(*) from messages where author = p_user and not bot and linked is null) + (select count(*) from dm_messages where author = p_user and not bot),
    'reactions', (select count(*) from reactions where user_id = p_user and active),
    'threads', (select count(*) from channels where kind = 'thread' and created_by = p_user),
    'friends', (select count(*) from friends f where f.owner = p_user and exists (select 1 from friends g where g.owner = f.friend and g.friend = p_user)),
    'members', coalesce((select max(n) from (select count(*) n from servers s join server_members m on m.server_id = s.id where s.owner = p_user group by s.id) t), 0),
    'boost_since', (select min(created_at) from server_boosts where user_id = p_user and paid_until > now()),
    'events', (select count(*) from server_events where created_by = p_user),
    'quests', coalesce(jsonb_array_length(x.quests), 0),
    'connections', coalesce(jsonb_array_length(x.connections), 0),
    'games', coalesce((select sum(jsonb_array_length(w->'g')) from jsonb_array_elements(x.widgets) w where w->>'t' = 'likes'), 0),
    'play_seconds', coalesce(x.play_seconds, 0),
    'staff', exists (select 1 from app_admins where user_id = p_user));
  -- (only what they let you see: badges kept from you tell nothing but, if you may see it, since when they've boosted;
  -- and a part they keep from you isn't counted into the badges you do see)
  if not shown_to_me(p_user, 'badges') then res := jsonb_build_object('hidden', true, 'boost_since', res -> 'boost_since'); end if;
  if not shown_to_me(p_user, 'boosting') then res := res - 'boost_since'; end if;
  if not shown_to_me(p_user, 'since') then res := res - 'since'; end if;
  if not shown_to_me(p_user, 'collection') then res := res - 'owned'; end if;
  if not shown_to_me(p_user, 'wishlist') then res := res - 'want'; end if;
  if not shown_to_me(p_user, 'games') then res := res - 'games'; end if;
  if not shown_to_me(p_user, 'connections') then res := res - 'connections'; end if;
  return res;
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

-- ===================== who sees what of a profile =====================
-- when they joined and what they're playing (read only through here: see the grants), and which parts of their profile
-- they keep from you, for everyone you know (or just the ones asked for)
create or replace function public.profile_more(p_ids uuid[] default null)
returns table (id uuid, since timestamptz, playing jsonb, hides text[])
language sql stable security definer set search_path = public as $$
  select p.id, case when 'since' = any(h.hides) then null else p.created_at end, case when 'playing' = any(h.hides) then null else p.playing end, h.hides
  from profiles p
  cross join lateral (select array(select e.key from jsonb_each_text(p.privacy) e
    where p.id <> auth.uid() and (e.value = 'me' or (e.value = 'friends' and not is_friend(p.id))))) h(hides)
  where auth.uid() is not null and (p_ids is null or p.id = any(p_ids)) and knows(p.id);
$$;
-- someone's extras (connections, Board, Activity, badge choices and log), without the parts they keep from you
create or replace function public.profile_extras_of(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', e.id, 'updated_at', e.updated_at,
    'connections', case when shown_to_me(e.id, 'connections') then e.connections else '[]'::jsonb end,
    'widgets', coalesce((select jsonb_agg(w order by o) from jsonb_array_elements(e.widgets) with ordinality x(w, o)
      where shown_to_me(e.id, case w ->> 't' when 'want' then 'wishlist' when 'likes' then 'games' else 'fav' end)), '[]'::jsonb),
    'activity', case when shown_to_me(e.id, 'activity') then e.activity else '[]'::jsonb end,
    'quests', case when shown_to_me(e.id, 'badges') then e.quests else '[]'::jsonb end,
    'badges', case when shown_to_me(e.id, 'badges') then e.badges else '{}'::jsonb end,
    'badge_log', case when shown_to_me(e.id, 'badges') and shown_to_me(e.id, 'collection') then e.badge_log else '{}'::jsonb end,
    'play_seconds', case when shown_to_me(e.id, 'badges') then e.play_seconds else 0 end)
  from profile_extras e where e.id = p_user and auth.uid() is not null and knows(p_user);
$$;

-- ===================== your account =====================
-- does your account have a password (to sign in with your email, or your username, and it)?
create or replace function public.has_password() returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce((select encrypted_password is not null and encrypted_password <> '' from auth.users where id = auth.uid()), false);
end $$;
-- hand a server to someone in it (Discord's Transfer Ownership): only its owner can, and stays on as an admin
create or replace function public.transfer_server(p_server uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner(p_server) then raise exception 'Only the owner can hand the server on.'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'Pick someone else in the server.'; end if;
  if not exists (select 1 from server_members where server_id = p_server and user_id = p_user) then raise exception 'They need to be in the server first.'; end if;
  perform set_config('fluentdat.transfer', 'on', true);
  update servers set owner = p_user where id = p_server;
  perform set_config('fluentdat.transfer', '', true);
  update server_members set role = 'admin' where server_id = p_server and user_id = auth.uid();
  update server_members set role = 'owner' where server_id = p_server and user_id = p_user;
end $$;
-- delete your account, and everything that's yours with it: your profile, messages, DMs, friends, Datbux, and the servers
-- only you are in. Not while you own a server other people are in (hand it on first), nor as the last one who runs Fluentdat
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from app_admins where user_id = me) and not exists (select 1 from app_admins where user_id <> me) then
    raise exception 'You''re the only one who runs Fluentdat. Make someone else one of the people who run it first (setup.sql says how).';
  end if;
  if exists (select 1 from servers s where s.owner = me and exists (select 1 from server_members m where m.server_id = s.id and m.user_id <> me)) then
    raise exception 'You own a server other people are in. Hand it on (Server Settings → Members → Transfer Ownership) or delete it first.';
  end if;
  perform set_config('fluentdat.leaving', 'on', true);
  begin
    execute 'update storage.objects set owner = null where owner = $1' using me;     -- (their files are gone from their messages; nobody owns them now)
  exception when others then null;
  end;
  delete from auth.users where id = me;          -- (their profile goes with it, and so does everything that's theirs)
end $$;

-- ===================== TrixWotel's commands (for the people who run Fluentdat) =====================
-- /ban: ban someone from all of Fluentdat (never yourself, nor anyone else who runs it)
create or replace function public.app_ban(p_user uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can ban someone from it.'; end if;
  if p_user is null or not exists (select 1 from profiles where id = p_user) then raise exception 'There''s nobody like that.'; end if;
  if p_user = auth.uid() then raise exception 'You can''t ban yourself.'; end if;
  if exists (select 1 from app_admins where user_id = p_user) then raise exception 'Nobody who runs Fluentdat can be banned from it.'; end if;
  insert into app_bans (user_id, banned_by, reason) values (p_user, auth.uid(), left(coalesce(p_reason, ''), 200))
    on conflict (user_id) do update set reason = excluded.reason, banned_by = excluded.banned_by, created_at = now();
end $$;
-- /unban: let them back in (true if they were banned)
create or replace function public.app_unban(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can lift a ban.'; end if;
  delete from app_bans where user_id = p_user;
  return found;
end $$;
-- /bans: who's banned, why, and by whom
create or replace function public.app_ban_list()
returns table (user_id uuid, handle text, name text, avatar text, reason text, created_at timestamptz, by_handle text)
language sql stable security definer set search_path = public as $$
  select b.user_id, p.handle, p.name, p.avatar, b.reason, b.created_at, q.handle
  from app_bans b join profiles p on p.id = b.user_id left join profiles q on q.id = b.banned_by
  where is_app_admin()
  order by b.created_at desc;
$$;
-- /kick: take someone out of a server, any server (never its owner); an invite brings them back
create or replace function public.staff_kick(p_server uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can do that.'; end if;
  if exists (select 1 from servers where id = p_server and owner = p_user) then raise exception 'Nobody can take a server''s owner out of it.'; end if;
  delete from server_members where server_id = p_server and user_id = p_user;
  return found;
end $$;
-- /givebux: Datbux for anyone, yourself too (1 to 1,000,000 at a time); their Bank shows it came from Fluentdat
create or replace function public.staff_give_bux(p_user uuid, p_amount int) returns bigint
language plpgsql security definer set search_path = public as $$
declare b bigint;
begin
  if not is_app_admin() then raise exception 'Only the people who run Fluentdat can hand out Datbux.'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'Give between 1 and 1,000,000 Datbux at a time.'; end if;
  if p_user is null or not exists (select 1 from profiles where id = p_user) then raise exception 'There''s nobody like that.'; end if;
  perform wallet_open(p_user);
  update wallets set balance = balance + p_amount, updated_at = now() where user_id = p_user returning balance into b;
  insert into datbux_log (user_id, amount, kind, note, other) values (p_user, p_amount, 'staff', 'From the people who run Fluentdat', auth.uid());
  return b;
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
  where auth.uid() is not null and p.id <> auth.uid() and p.id <> p_other and shown_to_me(p_other, 'friends')
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

-- ===================== linked channels =====================
-- a channel's link: its channels (the server each is in), for anyone who can read the channel. The code is only for
-- whoever manages the channel, and "removable" marks the channels you may take out (yours to manage, or any, while
-- you made the link and still manage one of its channels)
create or replace function public.link_info(p_channel uuid)
returns table (link_id uuid, code text, channel_id uuid, channel text, server_id uuid, server text, here boolean, removable boolean, added_at timestamptz)
language sql stable security definer set search_path = public as $$
  select k.link_id, case when chan_can(p_channel, 'manage_channels') then l.code end, c.id, c.name, s.id, s.name, c.id = p_channel,
    chan_can(c.id, 'manage_channels') or (l.created_by = auth.uid() and chan_can(p_channel, 'manage_channels')), k.added_at
  from channel_link_members me join channel_links l on l.id = me.link_id
    join channel_link_members k on k.link_id = me.link_id join channels c on c.id = k.channel_id join servers s on s.id = c.server_id
  where me.channel_id = p_channel and chan_can(p_channel, 'view')
  order by k.added_at, c.name;
$$;
-- your channels that are linked, and with how many others (for the top bar; Discord channels count too)
create or replace function public.my_links()
returns table (channel_id uuid, others int)
language sql stable security definer set search_path = public as $$
  select c.id, (select count(*)::int from channel_link_members o join channel_link_members k on k.link_id = o.link_id where k.channel_id = c.id and o.channel_id <> c.id)
    + (select count(*)::int from discord_links d where d.channel_id = c.id)
  from channels c
  where (exists (select 1 from channel_link_members k where k.channel_id = c.id) or exists (select 1 from discord_links d where d.channel_id = c.id))
    and is_member(c.server_id) and chan_can(c.id, 'view');
$$;
-- link a channel: a new link with only this channel in it, and its code for the other side
create or replace function public.link_channel(p_channel uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text; l uuid;
begin
  if not chan_can(p_channel, 'manage_channels') then raise exception 'Only whoever manages this channel can link it.'; end if;
  if not exists (select 1 from channels where id = p_channel and kind = 'text') then raise exception 'Only text channels can be linked.'; end if;
  if exists (select 1 from channel_link_members where channel_id = p_channel) then raise exception 'This channel is linked already.'; end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into channel_links (code, created_by) values (c, auth.uid()) returning id into l;
  insert into channel_link_members (channel_id, link_id, added_by) values (p_channel, l, auth.uid());
  return c;
end $$;
-- add a channel to a link, with the link's code
create or replace function public.join_link(p_code text, p_channel uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l uuid; cur uuid;
begin
  if not chan_can(p_channel, 'manage_channels') then raise exception 'Only whoever manages this channel can link it.'; end if;
  if not exists (select 1 from channels where id = p_channel and kind = 'text') then raise exception 'Only text channels can be linked.'; end if;
  select id into l from channel_links where code = lower(trim(coalesce(p_code, ''))) for update;
  if l is null then raise exception 'That link code doesn''t work. (It may have been changed for a new one.)'; end if;
  select link_id into cur from channel_link_members where channel_id = p_channel;
  if cur = l then return l; end if;
  if cur is not null then raise exception 'This channel is in another link. Take it out of that one first.'; end if;
  if (select count(*) from channel_link_members where link_id = l) >= 10 then raise exception 'A link holds up to 10 channels.'; end if;
  insert into channel_link_members (channel_id, link_id, added_by) values (p_channel, l, auth.uid());
  return l;
end $$;
-- take a channel out of its link (whoever manages it, or whoever made the link while they still manage one of its
-- channels)
create or replace function public.unlink_channel(p_channel uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l uuid;
begin
  select link_id into l from channel_link_members where channel_id = p_channel;
  if l is null then return; end if;
  if not (chan_can(p_channel, 'manage_channels') or (exists (select 1 from channel_links where id = l and created_by = auth.uid())
          and exists (select 1 from channel_link_members k where k.link_id = l and chan_can(k.channel_id, 'manage_channels')))) then
    raise exception 'Only whoever manages that channel (or made the link) can take it out.';
  end if;
  delete from channel_link_members where channel_id = p_channel;
end $$;
-- a new code for a channel's link (the old one stops working; channels already in it stay)
create or replace function public.new_link_code(p_channel uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text; l uuid;
begin
  select link_id into l from channel_link_members where channel_id = p_channel;
  if l is null or not chan_can(p_channel, 'manage_channels') then raise exception 'Only whoever manages a linked channel can change its link''s code.'; end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  update channel_links set code = c where id = l;
  return c;
end $$;

-- ===================== Discord's linked channels =====================
-- Fluentdat's Discord bot's token, from Supabase's Vault (supabase/SETUP.md, step 11), or nothing
create or replace function public.discord_token() returns text
language plpgsql stable security definer set search_path = public as $$
declare t text;
begin
  select decrypted_secret into t from vault.decrypted_secrets where name = 'fluentdat_discord_bot' order by created_at desc limit 1;
  return nullif(trim(t), '');
exception when others then return null;
end $$;
-- whether the database asks Discord every few seconds (pg_net to ask, pg_cron to run discord_tick)
create or replace function public.discord_cron_on() returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from pg_extension where extname = 'pg_net') and exists (select 1 from cron.job where jobname = 'fluentdat-discord' and active);
exception when others then return false;
end $$;
-- Discord's number for a moment (to ask for what was said after it)
create or replace function public.discord_snowflake(p_at timestamptz) returns text
language sql stable as $$ select ((((extract(epoch from p_at) * 1000)::bigint - 1420070400000) << 22))::text $$;
-- for the Linked Channels window: whether Discord channels can be linked, and the bot's number (for its invite link:
-- a bot's token starts with it, in base64)
create or replace function public.discord_ready() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tok text := discord_token(); p text; bot text;
begin
  if tok is not null then
    begin
      p := translate(split_part(tok, '.', 1), '-_', '+/');
      bot := convert_from(decode(p || repeat('=', (4 - length(p) % 4) % 4), 'base64'), 'UTF8');
      if bot !~ '^[0-9]{15,22}$' then bot := null; end if;
    exception when others then bot := null;
    end;
  end if;
  return jsonb_build_object('ready', tok is not null and discord_cron_on(), 'bot', bot);
end $$;
-- a channel's Discord channels, for anyone who can read it (and what's wrong with one, for whoever manages it)
create or replace function public.discord_info(p_channel uuid)
returns table (link_id uuid, name text, guild text, status text, error text, added_at timestamptz)
language sql stable security definer set search_path = public as $$
  select k.id, k.name, k.guild_name, k.status, case when chan_can(p_channel, 'manage_channels') then k.error else '' end, k.added_at
  from discord_links k where k.channel_id = p_channel and chan_can(p_channel, 'view')
  order by k.added_at;
$$;
-- link a Discord channel with this one, by a webhook made in it (Discord: the channel's settings → Integrations →
-- Webhooks → New Webhook → Copy Webhook URL). What's said there from now on shows here, and what's said here goes there
create or replace function public.link_discord(p_channel uuid, p_webhook text)
returns uuid language plpgsql security definer set search_path = public as $$
declare m text[]; l uuid;
begin
  if app_banned() or not chan_can(p_channel, 'manage_channels') then raise exception 'Only whoever manages this channel can link it.'; end if;
  if not exists (select 1 from channels where id = p_channel and kind = 'text') then raise exception 'Only text channels can be linked.'; end if;
  if not coalesce((discord_ready()->>'ready')::boolean, false) then raise exception 'Linking with Discord isn''t turned on for this Fluentdat yet (supabase/SETUP.md, step 11).'; end if;
  m := regexp_match(trim(coalesce(p_webhook, '')), '^https://(?:(?:canary|ptb)\.)?discord(?:app)?\.com/api(?:/v[0-9]+)?/webhooks/([0-9]{15,22})/([A-Za-z0-9_-]{20,100})/?$');
  if m is null then raise exception 'That isn''t a Discord webhook URL. In Discord, open the channel''s settings → Integrations → Webhooks → New Webhook, then Copy Webhook URL.'; end if;
  if exists (select 1 from discord_links where webhook_id = m[1]) then raise exception 'That webhook is linked already.'; end if;
  if (select count(*) from discord_links where channel_id = p_channel) >= 10 then raise exception 'A channel can be linked with up to 10 Discord channels.'; end if;
  insert into discord_links (channel_id, webhook_id, webhook_token, last_seen, added_by)
    values (p_channel, m[1], m[2], discord_snowflake(now()), auth.uid()) returning id into l;
  return l;
end $$;
-- take a Discord channel out (whoever manages the channel here; what was already brought over stays)
create or replace function public.unlink_discord(p_link uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ch uuid;
begin
  select channel_id into ch from discord_links where id = p_link;
  if ch is null then return; end if;
  if not chan_can(ch, 'manage_channels') then raise exception 'Only whoever manages this channel can take a Discord channel out.'; end if;
  delete from discord_links where id = p_link;
end $$;
-- start a Discord channel that stopped working again from the beginning (checking the webhook, then catching up on what
-- was said there meanwhile)
create or replace function public.retry_discord(p_link uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ch uuid;
begin
  select channel_id into ch from discord_links where id = p_link;
  if ch is null or not chan_can(ch, 'manage_channels') then raise exception 'Only whoever manages this channel can do that.'; end if;
  update discord_links set status = 'starting', error = '', discord_channel = null, read_at = now(), write_at = now() where id = p_link;
end $$;
-- ask Discord something (pg_net sends it once this round is over, and the next round reads the answer)
create or replace function public.discord_ask(p_link uuid, p_kind text, p_method text, p_url text, p_token text default null,
  p_params jsonb default '{}', p_body jsonb default null, p_outbox bigint[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare h jsonb := '{"User-Agent": "DiscordBot (https://github.com/TrixWotel/Fluentdat, 19)"}'; r bigint;
begin
  if p_token is not null then h := h || jsonb_build_object('Authorization', 'Bot ' || p_token); end if;
  if p_method = 'POST' then
    r := net.http_post(url => p_url, body => p_body, params => p_params, headers => h || '{"Content-Type": "application/json"}', timeout_milliseconds => 10000);
  elsif p_method = 'DELETE' then
    r := net.http_delete(url => p_url, params => p_params, headers => h, timeout_milliseconds => 10000);
  else
    r := net.http_get(url => p_url, params => p_params, headers => h, timeout_milliseconds => 10000);
  end if;
  insert into discord_requests (id, link_id, kind, outbox) values (r, p_link, p_kind, p_outbox);
end $$;
-- a message from Discord, brought over as a line saying where it was said and who said it. Mentions, channels, emoji and
-- times become words, and pictures and files their links (which Discord stops after a day or so). Nothing in it can
-- ping anyone here
create or replace function public.discord_bring(p_link uuid, d jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k discord_links%rowtype; t text; who text; u jsonb; m text[]; ref text; rep uuid; author uuid;
begin
  select * into k from discord_links where id = p_link;
  -- (only what people said: not joins, pins and the like, and not what Fluentdat itself said there)
  if not found or coalesce((d->>'type')::int, 0) not in (0, 19, 20, 23) or d->>'webhook_id' = k.webhook_id then return; end if;
  t := coalesce(d->>'content', '');
  for u in select value from jsonb_array_elements(case when jsonb_typeof(d->'mentions') = 'array' then d->'mentions' else '[]' end) loop
    who := '@' || coalesce(nullif(u->>'global_name', ''), u->>'username', 'someone');
    t := replace(replace(t, '<@' || (u->>'id') || '>', who), '<@!' || (u->>'id') || '>', who);
  end loop;
  t := replace(t, '<#' || k.discord_channel || '>', '#' || k.name);
  t := regexp_replace(t, '<@!?[0-9]+>', '@someone', 'g');
  t := regexp_replace(t, '<@&[0-9]+>', '@role', 'g');
  t := regexp_replace(t, '<#[0-9]+>', '#channel', 'g');
  t := regexp_replace(t, '<a?:([A-Za-z0-9_]{2,32}):[0-9]+>', ':\1:', 'g');
  for m in select regexp_matches(t, '(<t:(-?[0-9]{1,12})(?::[tTdDfFR])?>)', 'g') loop
    t := replace(t, m[1], to_char(to_timestamp(m[2]::bigint) at time zone 'utc', 'Mon FMDD, YYYY HH24:MI "UTC"'));
  end loop;
  -- (no <@someone here>, and no @everyone)
  t := regexp_replace(t, '<(@|#|a?:[A-Za-z0-9_]{2,32}:)([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})>', '\1\2', 'g');
  t := regexp_replace(t, '@(everyone|here)', '@' || chr(8203) || '\1', 'g');
  for u in select value from jsonb_array_elements(case when jsonb_typeof(d->'attachments') = 'array' then d->'attachments' else '[]' end) loop
    t := concat_ws(E'\n', nullif(t, ''), u->>'url');
  end loop;
  for u in select value from jsonb_array_elements(case when jsonb_typeof(d->'sticker_items') = 'array' then d->'sticker_items' else '[]' end) loop
    t := concat_ws(' ', nullif(t, ''), '[sticker: ' || coalesce(u->>'name', '') || ']');
  end loop;
  -- (a bot's message may be all embed: its title and words)
  if trim(t) = '' and jsonb_typeof(d->'embeds') = 'array' then
    select coalesce(string_agg(concat_ws(' — ', nullif(e->>'title', ''), nullif(e->>'description', '')), E'\n'), '') into t from jsonb_array_elements(d->'embeds') e;
  end if;
  if trim(t) = '' then return; end if;
  who := coalesce(nullif(d->'author'->>'global_name', ''), d->'author'->>'username', 'Someone');
  ref := d->'message_reference'->>'message_id';
  if ref is not null then
    select id into rep from messages where channel_id = k.channel_id and linked->>'dmsg' = ref limit 1;
    if rep is null then select message_id into rep from discord_sent where link_id = k.id and dmsg = ref order by pos desc limit 1; end if;
  end if;
  -- (posted here by whoever linked the Discord channel, else the server's owner: the line says who said it there)
  author := k.added_by;
  if author is null then select s.owner into author from channels c join servers s on s.id = c.server_id where c.id = k.channel_id; end if;
  perform set_config('fluentdat.linking', 'on', true);
  insert into messages (channel_id, author, text, reply_to, linked, created_at)
    values (k.channel_id, author, left(t, 4000), rep, jsonb_build_object('server', left(coalesce(nullif(k.guild_name, ''), 'Discord'), 60), 'channel', left(k.name, 60),
      'name', left(who, 40), 'from', null, 'discord', true, 'dchan', k.discord_channel, 'dmsg', d->>'id'), coalesce((d->>'timestamp')::timestamptz, now()));
  perform set_config('fluentdat.linking', '', true);
end $$;
-- what Discord answered
create or replace function public.discord_answer(p_req bigint, p_status int, p_body text, p_failed boolean)
returns void language plpgsql security definer set search_path = public as $$
declare q discord_requests%rowtype; k discord_links%rowtype; j jsonb; d jsonb; newest text; wait interval; why text; i int := 0; o record;
begin
  delete from discord_requests where id = p_req returning * into q;
  if not found then return; end if;
  begin delete from net._http_response where id = p_req; exception when others then null; end;
  select * into k from discord_links where id = q.link_id;
  if not found then return; end if;
  begin j := p_body::jsonb; exception when others then j := null; end;
  -- Discord said to wait: ask again after that
  if p_status = 429 then
    wait := make_interval(secs => least(greatest(coalesce((j->>'retry_after')::numeric, 5), 1), 600)::double precision);
    if q.kind in ('send', 'drop') then update discord_links set write_at = now() + wait where id = k.id;
    else update discord_links set read_at = now() + wait where id = k.id; end if;
    return;
  end if;
  -- no answer, or Discord in trouble: again in a little while (what's waiting to go is let go after three tries)
  if p_failed or p_status is null or p_status >= 500 then
    if q.kind in ('send', 'drop') then
      update discord_outbox set tries = tries + 1 where id = any(q.outbox);
      delete from discord_outbox where id = any(q.outbox) and tries >= 3;
      update discord_links set write_at = now() + interval '10 seconds' where id = k.id;
    else update discord_links set read_at = now() + interval '10 seconds' where id = k.id; end if;
    return;
  end if;
  -- Discord turned the name down: this channel's names go plain from now on, and these go again
  if q.kind = 'send' and p_status = 400 and jsonb_typeof(j->'errors') = 'object' and j->'errors' ? 'username'
     and exists (select 1 from discord_outbox where id = any(q.outbox) and who ~ '[@#:`]') then
    update discord_links set plain_names = true where id = k.id;
    update discord_outbox set who = translate(who, '@#:`', ''), tries = tries + 1 where id = any(q.outbox);
    return;
  end if;
  if p_status >= 400 then
    -- (a message already gone there, or a line Discord won't take: let it go)
    if q.kind = 'drop' or (q.kind = 'send' and p_status not in (401, 403, 404)) then delete from discord_outbox where id = any(q.outbox); return; end if;
    if q.kind = 'guild' then update discord_links set guild_name = 'Discord' where id = k.id; return; end if;
    why := case
      when q.kind in ('hook', 'send') then 'The webhook doesn''t work any more (it may have been deleted in Discord). Make a new one there, and link it again.'
      when p_status = 401 then 'Fluentdat''s Discord bot can''t sign in: its token in Supabase''s Vault needs changing (supabase/SETUP.md, step 11).'
      when p_status = 403 then 'Fluentdat''s Discord bot can''t read that channel. Add the bot to the Discord server, and let it see the channel and read its message history.'
      when p_status = 404 then 'That Discord channel is gone.'
      else 'Discord said no (' || p_status || ').' end;
    update discord_links set status = 'broken', error = why where id = k.id;
    delete from discord_outbox where link_id = k.id;
    return;
  end if;
  if q.kind = 'hook' then
    -- (the webhook says which channel it posts in)
    if j->>'id' is distinct from k.webhook_id or coalesce(j->>'type', '') <> '1' or coalesce(j->>'channel_id', '') !~ '^[0-9]{15,22}$' then
      update discord_links set status = 'broken', error = 'That isn''t a webhook Fluentdat can post with. Make one in the channel''s settings → Integrations → Webhooks.' where id = k.id;
    elsif exists (select 1 from discord_links where discord_channel = j->>'channel_id' and id <> k.id) then
      update discord_links set status = 'broken', error = 'That Discord channel is linked with a channel here already.' where id = k.id;
    else
      update discord_links set discord_channel = j->>'channel_id', discord_guild = j->>'guild_id', error = '' where id = k.id;
    end if;
  elsif q.kind = 'chan' then
    if coalesce(j->>'type', '') not in ('0', '5') then
      update discord_links set status = 'broken', error = 'Only Discord text and announcement channels can be linked.' where id = k.id;
    else
      update discord_links set name = left(coalesce(j->>'name', ''), 60), discord_guild = coalesce(discord_guild, j->>'guild_id'), status = 'ok', error = '' where id = k.id;
    end if;
  elsif q.kind = 'guild' then
    update discord_links set guild_name = left(coalesce(nullif(j->>'name', ''), 'Discord'), 60) where id = k.id;
  elsif q.kind = 'poll' then
    -- (Discord gives the newest first; one message that can't be brought over doesn't hold up the rest)
    if jsonb_typeof(j) = 'array' then
      for d in select value from jsonb_array_elements(j) where value->>'id' ~ '^[0-9]{1,20}$' order by (value->>'id')::numeric loop
        begin perform discord_bring(k.id, d);
        exception when others then raise notice 'Fluentdat: a message from Discord wasn''t brought over (%)', sqlerrm;
        end;
        newest := d->>'id';
      end loop;
    end if;
    update discord_links set last_seen = coalesce(newest, last_seen), error = '' where id = k.id;
  elsif q.kind = 'send' then
    -- (which Discord message each line went out in)
    if j->>'id' is not null then
      for o in select * from discord_outbox where id = any(q.outbox) order by id loop
        i := i + 1;
        if exists (select 1 from messages where id = o.message_id) then
          insert into discord_sent (message_id, link_id, dmsg, line, pos, who, avatar) values (o.message_id, k.id, j->>'id', o.line, i, o.who, o.avatar) on conflict do nothing;
        end if;
      end loop;
    end if;
    delete from discord_outbox where id = any(q.outbox);
  else
    delete from discord_outbox where id = any(q.outbox);
  end if;
end $$;
-- every couple of seconds (pg_cron): read Discord's answers, then ask again. For each Discord channel: what's been said
-- there since last time (while it's starting: which channel the webhook posts in, and its name), and what's waiting to
-- go there: as many of one person's messages in a row as fit in one Discord message, under their name (Discord takes
-- about 30 messages a minute in a channel)
create or replace function public.discord_tick() returns void
language plpgsql security definer set search_path = public as $$
declare tok text; r record; k discord_links%rowtype; o discord_outbox%rowtype; hook text; lines text; ids bigint[]; who text; av text;
  api constant text := 'https://discord.com/api/v10';
begin
  if not pg_try_advisory_xact_lock(hashtext('fluentdat-discord')) then return; end if;
  -- (what went out first, so a reply there to a line that just went out finds what it answers)
  for r in select h.id, h.status_code, h.content, coalesce(h.timed_out, false) or h.error_msg is not null as failed
           from discord_requests q join net._http_response h on h.id = q.id order by q.kind in ('send', 'drop') desc, q.id loop
    begin
      perform discord_answer(r.id, r.status_code, r.content, r.failed);
    exception when others then
      raise notice 'Fluentdat: an answer from Discord couldn''t be read (%)', sqlerrm;
      delete from discord_requests where id = r.id;
    end;
  end loop;
  -- (asked a minute ago and never answered: as good as failed)
  for r in select id from discord_requests where sent_at < now() - interval '1 minute' loop
    perform discord_answer(r.id, null, null, true);
  end loop;
  tok := discord_token();
  if tok is null then return; end if;
  for k in select * from discord_links l where l.status <> 'broken' and l.read_at <= now()
           and not exists (select 1 from discord_requests q where q.link_id = l.id and q.kind in ('hook', 'chan', 'guild', 'poll')) loop
    begin
      if k.discord_channel is null then perform discord_ask(k.id, 'hook', 'GET', api || '/webhooks/' || k.webhook_id || '/' || k.webhook_token);
      elsif k.status = 'starting' then perform discord_ask(k.id, 'chan', 'GET', api || '/channels/' || k.discord_channel, tok);
      elsif k.guild_name = '' and k.discord_guild is not null then perform discord_ask(k.id, 'guild', 'GET', api || '/guilds/' || k.discord_guild, tok);
      else perform discord_ask(k.id, 'poll', 'GET', api || '/channels/' || k.discord_channel || '/messages', tok, jsonb_build_object('after', k.last_seen, 'limit', '50'));
      end if;
    exception when others then
      raise notice 'Fluentdat: Discord couldn''t be asked (%)', sqlerrm;
      update discord_links set read_at = now() + interval '30 seconds' where id = k.id;
    end;
  end loop;
  for k in select * from discord_links l where l.status = 'ok' and l.write_at <= now() and exists (select 1 from discord_outbox b where b.link_id = l.id)
           and not exists (select 1 from discord_requests q where q.link_id = l.id and q.kind in ('send', 'drop')) loop
    hook := api || '/webhooks/' || k.webhook_id || '/' || k.webhook_token;
    select * into o from discord_outbox where link_id = k.id order by id limit 1;
    begin
      if o.kind = 'drop' then perform discord_ask(k.id, 'drop', 'DELETE', hook || '/messages/' || o.dmsg, null, '{}', null, array[o.id]);
      else
        lines := ''; ids := '{}'; who := o.who; av := o.avatar;
        for o in select * from discord_outbox where link_id = k.id order by id loop
          exit when o.kind <> 'say' or (cardinality(ids) > 0 and (o.who is distinct from who or o.avatar is distinct from av or char_length(lines) + 1 + char_length(o.line) > 2000));
          lines := case when lines = '' then o.line else lines || E'\n' || o.line end;
          ids := ids || o.id;
        end loop;
        -- (pinging nobody there, whatever it says; a line from before there were names goes under the webhook's own)
        perform discord_ask(k.id, 'send', 'POST', hook, null, '{"wait": "true"}', jsonb_build_object('content', lines, 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb))
          || case when who <> '' then jsonb_build_object('username', who) else '{}' end || case when av is not null then jsonb_build_object('avatar_url', av) else '{}' end, ids);
      end if;
    exception when others then
      raise notice 'Fluentdat: Discord couldn''t be told (%)', sqlerrm;
      delete from discord_outbox where link_id = k.id and kind = 'drop' and id = o.id;
      update discord_links set write_at = now() + interval '30 seconds' where id = k.id;
    end;
  end loop;
  -- (pg_cron keeps a line for every round: of this one's, only the last few minutes)
  begin
    delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname = 'fluentdat-discord') and end_time < now() - interval '5 minutes';
  exception when others then null;
  end;
end $$;

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
  public.set_nick(uuid, uuid, text), public.set_server_privacy(uuid, boolean), public.badge_stats(uuid) to authenticated;
grant execute on function public.setup_version() to anon, authenticated;
revoke all on function public.wallet_open(uuid), public.task_count(uuid, text, timestamptz), public.move_item(uuid, uuid, text, text),
  public.owns_all(uuid, jsonb), public.owns_any(uuid, jsonb), public.shop_ok(text, text, uuid) from public, anon, authenticated;
revoke all on function public.task_progress(), public.claim_task(text), public.buy_item(text, text), public.send_datbux(uuid, int, text),
  public.offer_trade(uuid, int, jsonb, int, jsonb, text), public.answer_trade(uuid, boolean), public.cancel_trade(uuid) from public, anon;
grant execute on function public.task_progress(), public.claim_task(text), public.buy_item(text, text), public.send_datbux(uuid, int, text),
  public.offer_trade(uuid, int, jsonb, int, jsonb, text), public.answer_trade(uuid, boolean), public.cancel_trade(uuid) to authenticated;
revoke all on function public.perm_for(uuid, uuid, text), public.chan_perm(uuid, uuid, text), public.verify_connection(uuid, jsonb) from public, anon, authenticated;
-- (boosting and Quest rewards: yours to ask for; renewing everyone's is the database's own job)
revoke all on function public.renew_boosts_for(uuid), public.renew_all_boosts() from public, anon, authenticated;
revoke all on function public.boost_server(uuid, int), public.set_boost_auto(uuid, boolean), public.renew_boosts(), public.claim_quest_reward(text) from public, anon;
grant execute on function public.boost_server(uuid, int), public.set_boost_auto(uuid, boolean), public.renew_boosts(), public.claim_quest_reward(text), public.boost_price() to authenticated;
-- (bundles: yours to buy; what one costs someone else isn't anyone's business)
revoke all on function public.bundle_cost(text, uuid) from public, anon, authenticated;
revoke all on function public.buy_bundle(text), public.shop_sales(timestamptz), public.bundle_pct(text, timestamptz) from public, anon;
grant execute on function public.buy_bundle(text), public.shop_sales(timestamptz), public.bundle_pct(text, timestamptz) to authenticated;

-- (TrixWotel's commands: anyone signed in may ask, and only the people who run Fluentdat get anything done)
grant execute on function public.app_banned() to authenticated;
grant execute on function public.privacy_ok(jsonb), public.shown_to_me(uuid, text) to authenticated;
revoke all on function public.has_password(), public.transfer_server(uuid, uuid), public.delete_my_account() from public, anon;
grant execute on function public.has_password(), public.transfer_server(uuid, uuid), public.delete_my_account() to authenticated;
revoke all on function public.profile_more(uuid[]), public.profile_extras_of(uuid) from public, anon;
grant execute on function public.profile_more(uuid[]), public.profile_extras_of(uuid) to authenticated;
revoke all on function public.app_ban(uuid, text), public.app_unban(uuid), public.app_ban_list(), public.staff_kick(uuid, uuid), public.staff_give_bux(uuid, int) from public, anon;
grant execute on function public.app_ban(uuid, text), public.app_unban(uuid), public.app_ban_list(), public.staff_kick(uuid, uuid), public.staff_give_bux(uuid, int) to authenticated;
revoke all on function public.link_info(uuid), public.my_links(), public.link_channel(uuid), public.join_link(text, uuid), public.unlink_channel(uuid), public.new_link_code(uuid) from public, anon;
grant execute on function public.link_info(uuid), public.my_links(), public.link_channel(uuid), public.join_link(text, uuid), public.unlink_channel(uuid), public.new_link_code(uuid) to authenticated;
revoke all on function public.discord_ready(), public.discord_info(uuid), public.link_discord(uuid, text), public.unlink_discord(uuid), public.retry_discord(uuid) from public, anon;
grant execute on function public.discord_ready(), public.discord_info(uuid), public.link_discord(uuid, text), public.unlink_discord(uuid), public.retry_discord(uuid) to authenticated;
-- (and what only the database itself runs: above all the bot's token, which nobody signed in may ever ask for)
revoke all on function public.discord_token(), public.discord_cron_on(), public.discord_snowflake(timestamptz),
  public.discord_ask(uuid, text, text, text, text, jsonb, jsonb, bigint[]), public.discord_bring(uuid, jsonb), public.discord_answer(bigint, int, text, boolean),
  public.discord_tick() from public, anon, authenticated;

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
grant select, insert, update, delete on public.user_settings to authenticated;
revoke all on public.user_settings from anon;
-- (Datbux: looked at only; changed only by its functions)
grant select on public.wallets, public.datbux_log, public.task_claims, public.shop_items, public.owned_items, public.trades, public.quest_rewards, public.shop_bundles to authenticated;
revoke insert, update, delete, truncate on public.wallets, public.datbux_log, public.task_claims, public.shop_items, public.owned_items, public.trades, public.quest_rewards, public.shop_bundles from authenticated;
revoke all on public.wallets, public.datbux_log, public.task_claims, public.shop_items, public.owned_items, public.trades, public.quest_rewards, public.shop_bundles from anon;
-- (boosts: looked at by the server's people, started through boost_server, stopped by deleting your own)
revoke insert, update on public.server_boosts from authenticated;
-- (profiles: every column but when someone joined and what they're playing, which come through profile_more, where each
-- person decides who sees them)
do $$ declare cols text; begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols from pg_attribute
    where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped and attname not in ('created_at', 'playing');
  revoke select on public.profiles from authenticated;
  execute format('grant select (%s) on public.profiles to authenticated', cols);
end $$;
-- (bans from all of Fluentdat: looked at, by the one banned and the people who run it; made only through app_ban)
grant select on public.app_bans to authenticated;
revoke insert, update, delete, truncate on public.app_bans from authenticated;
revoke all on public.app_bans from anon;
-- (linked channels: seen through link_info and my_links, changed through their functions; a link's code, never directly)
grant select on public.channel_link_members to authenticated;
revoke insert, update, delete, truncate on public.channel_link_members from authenticated;
revoke all on public.channel_links from anon, authenticated;
revoke all on public.channel_link_members from anon;
-- (Discord's linked channels: through their functions only, so a webhook's token never leaves the database)
revoke all on public.discord_links, public.discord_outbox, public.discord_sent, public.discord_requests from anon, authenticated;

-- TrixWotel runs Fluentdat. (To add someone else: insert into public.app_admins select id from public.profiles where handle = 'their handle';)
insert into public.app_admins (user_id) select id from public.profiles where handle = 'trixwotel' on conflict do nothing;

-- the Shop's prices in Datbux: everything in it (decorations, name fonts, effects, frames, nameplates); a Quest's reward is
-- yours once you've done the Quest. A decoration costs about a week of tasks (100 a day and 420 a week: 1,120)
insert into public.shop_items (kind, item, price) values
  ('deco', 'halo', 800), ('deco', 'flame', 1250), ('deco', 'catears', 950), ('deco', 'leaves', 950), ('deco', 'gears', 1100), ('deco', 'glitch', 1250),
  ('deco', 'hearts', 1100), ('deco', 'sparkle', 950), ('deco', 'rainbow', 1100), ('deco', 'neon', 1100), ('deco', 'orbit', 1100), ('deco', 'crown', 1250),
  ('deco', 'bubbles', 800), ('deco', 'starring', 950), ('deco', 'snowflakes', 950), ('deco', 'devil', 1100), ('deco', 'angel', 1250), ('deco', 'bunny', 950),
  ('deco', 'headphones', 1100), ('deco', 'flowers', 1100), ('deco', 'bolts', 1250), ('deco', 'notes', 950), ('deco', 'pixel', 800), ('deco', 'foxears', 950),
  ('deco', 'clouds', 800), ('deco', 'aurora', 1400), ('deco', 'sakura', 1100), ('deco', 'witch', 1250), ('deco', 'bow', 950), ('deco', 'shades', 1100),
  ('deco', 'moon', 1250), ('deco', 'crystals', 1400),
  -- (the hundred more: decorations.js)
  ('deco', 'sunsetring', 950), ('deco', 'oceanring', 950), ('deco', 'mintring', 850), ('deco', 'lavaring', 1200), ('deco', 'goldring', 1300), ('deco', 'silverring', 1050),
  ('deco', 'doublering', 1000), ('deco', 'dashring', 850), ('deco', 'chainring', 1000), ('deco', 'prismring', 1250), ('deco', 'heartbeat', 1000), ('deco', 'bearears', 950),
  ('deco', 'mouseears', 900), ('deco', 'pandaears', 950), ('deco', 'dogears', 1000), ('deco', 'wolfears', 1000), ('deco', 'frogeyes', 950), ('deco', 'antennae', 1000),
  ('deco', 'antlers', 1100), ('deco', 'unicorn', 1300), ('deco', 'dragonhorns', 1250), ('deco', 'ramhorns', 1150), ('deco', 'tigerears', 1000), ('deco', 'elfears', 950),
  ('deco', 'partyhat', 950), ('deco', 'santahat', 1100), ('deco', 'tophat', 1100), ('deco', 'cowboy', 1100), ('deco', 'beanie', 950), ('deco', 'chefhat', 950),
  ('deco', 'gradcap', 1050), ('deco', 'pirate', 1150), ('deco', 'viking', 1200), ('deco', 'propeller', 1050), ('deco', 'wizard', 1200), ('deco', 'tiara', 1300),
  ('deco', 'beret', 900), ('deco', 'jester', 1150), ('deco', 'roundglasses', 900), ('deco', 'heartglasses', 1000), ('deco', 'starglasses', 1000), ('deco', 'monocle', 950),
  ('deco', 'blush', 850), ('deco', 'visor', 1250), ('deco', 'zzz', 850), ('deco', 'question', 850), ('deco', 'exclaim', 850), ('deco', 'angry', 850),
  ('deco', 'idea', 950), ('deco', 'lovebubbles', 950), ('deco', 'sunflower', 1100), ('deco', 'daisies', 950), ('deco', 'vines', 950), ('deco', 'mushrooms', 1050),
  ('deco', 'mapleleaves', 1000), ('deco', 'pinewreath', 1100), ('deco', 'raincloud', 950), ('deco', 'sunrays', 1100), ('deco', 'rainbowarc', 1150), ('deco', 'tulips', 950),
  ('deco', 'bees', 1050), ('deco', 'butterflies', 1100), ('deco', 'ladybugs', 950), ('deco', 'goldfish', 1050), ('deco', 'ducks', 950), ('deco', 'catpaws', 950),
  ('deco', 'birds', 1000), ('deco', 'octopus', 1250), ('deco', 'sharkfin', 1100), ('deco', 'donuts', 950), ('deco', 'pizza', 950), ('deco', 'sushi', 1000),
  ('deco', 'candies', 950), ('deco', 'lollipops', 900), ('deco', 'cherries', 850), ('deco', 'boba', 950), ('deco', 'rocket', 1150), ('deco', 'ufo', 1150),
  ('deco', 'planets', 1250), ('deco', 'blackhole', 1350), ('deco', 'satellite', 1050), ('deco', 'spacehelmet', 1300), ('deco', 'pumpkins', 1100), ('deco', 'ghosts', 1100),
  ('deco', 'bats', 1050), ('deco', 'skulls', 1050), ('deco', 'xmaslights', 1150), ('deco', 'holly', 1050), ('deco', 'cupid', 1100), ('deco', 'eastereggs', 950),
  ('deco', 'fireworks', 1200), ('deco', 'shamrocks', 950), ('deco', 'controller', 1050), ('deco', 'hpbar', 950), ('deco', 'swords', 1150), ('deco', 'dice', 950),
  ('deco', 'magiccircle', 1400), ('deco', 'fairydust', 1000), ('deco', 'phoenix', 1400), ('deco', 'batwings', 1250),
  ('font', 'tempo', 100), ('font', 'sakura', 100), ('font', 'jelly', 150), ('font', 'modern', 150), ('font', 'medieval', 200), ('font', 'pixel', 200),
  ('font', 'vampyre', 250), ('font', 'chunky', 150), ('font', 'comic', 80), ('font', 'script', 200), ('font', 'type', 80), ('font', 'marker', 150),
  ('font', 'elegant', 250), ('font', 'lobster', 150), ('font', 'bangers', 150), ('font', 'righteous', 120), ('font', 'audiowide', 150), ('font', 'monoton', 250),
  ('font', 'cinzel', 200), ('font', 'caveat', 120), ('font', 'satisfy', 150), ('font', 'shadows', 120), ('font', 'luckiest', 150), ('font', 'blackops', 200),
  ('font', 'silkscreen', 150), ('font', 'terminal', 120), ('font', 'vibes', 250), ('font', 'fatface', 200), ('font', 'bebas', 120), ('font', 'glitchy', 250),
  ('font', 'indie', 100), ('font', 'rampart', 200), ('font', 'cherry', 200),
  ('effect', 'snow', 120), ('effect', 'sparkles', 150), ('effect', 'bubbles', 120), ('effect', 'petals', 150), ('effect', 'embers', 180), ('effect', 'pixels', 160),
  ('effect', 'hearts', 200), ('effect', 'confetti', 200), ('effect', 'stars', 200), ('effect', 'rain', 120), ('effect', 'fireflies', 180), ('effect', 'leaves', 150),
  ('effect', 'butterflies', 220), ('effect', 'music', 180), ('effect', 'comets', 250), ('effect', 'code', 200), ('effect', 'balloons', 180), ('effect', 'aurora', 300),
  ('effect', 'lightning', 250), ('effect', 'galaxy', 220), ('effect', 'smoke', 150), ('effect', 'coins', 250), ('effect', 'ghosts', 200), ('effect', 'clovers', 150),
  ('effect', 'diamonds', 300), ('effect', 'waves', 220), ('effect', 'flames', 250), ('effect', 'bokeh', 180), ('effect', 'paws', 150),
  ('frame', 'moonlit', 250), ('frame', 'stardust', 250), ('frame', 'eyes', 200), ('frame', 'goo', 200), ('frame', 'candles', 300), ('frame', 'eclipse', 300),
  ('frame', 'autumn', 250), ('frame', 'roses', 250), ('frame', 'wings', 300), ('frame', 'thorns', 200), ('frame', 'kitty', 250), ('frame', 'bunny', 250),
  ('frame', 'ocean', 250), ('frame', 'blossom', 300), ('frame', 'neonsign', 300), ('frame', 'pixelhearts', 200), ('frame', 'planets', 300), ('frame', 'pines', 250),
  ('frame', 'candy', 250), ('frame', 'circuit', 250), ('frame', 'skies', 200), ('frame', 'inferno', 350), ('frame', 'frost', 300), ('frame', 'garden', 250),
  ('frame', 'melody', 250), ('frame', 'royal', 400), ('frame', 'bats', 300), ('frame', 'synth', 300), ('frame', 'paws', 200), ('frame', 'lanterns', 300),
  ('frame', 'shrooms', 250), ('frame', 'overrainbow', 300),
  ('plate', 'sunset', 100), ('plate', 'ocean', 120), ('plate', 'galaxy', 150), ('plate', 'sakura', 120), ('plate', 'forest', 120), ('plate', 'lava', 150),
  ('plate', 'circuit', 150), ('plate', 'candy', 80), ('plate', 'pixel', 100), ('plate', 'aurora', 200), ('plate', 'stars', 150), ('plate', 'clouds', 100),
  ('plate', 'neon', 180), ('plate', 'gold', 250), ('plate', 'frost', 120), ('plate', 'autumn', 120), ('plate', 'code', 150), ('plate', 'checkers', 80),
  ('plate', 'waves', 100), ('plate', 'polka', 60), ('plate', 'zigzag', 60), ('plate', 'hearts', 100), ('plate', 'bubbles', 100), ('plate', 'flames', 150),
  ('plate', 'rainbow', 120), ('plate', 'marble', 150), ('plate', 'camo', 80), ('plate', 'honey', 100), ('plate', 'music', 100), ('plate', 'paws', 80)
on conflict (kind, item) do update set price = excluded.price;
-- the bundles, the holiday each is made for, and how much less than its things it costs (more for a bigger bundle: 2
-- things 10%, 3 15%, 4 20%, 5 25%); a little less again on that holiday and on sale days
insert into public.shop_bundles (id, name, holiday, items, position, cut) values
  ('spooky', 'Spooky Night', 'halloween', '[{"k":"deco","i":"witch"},{"k":"effect","i":"ghosts"},{"k":"frame","i":"bats"},{"k":"font","i":"vampyre"}]', 0, 20),
  ('blossom', 'Cherry Blossom', 'hanami', '[{"k":"deco","i":"sakura"},{"k":"effect","i":"petals"},{"k":"frame","i":"blossom"},{"k":"plate","i":"sakura"}]', 1, 20),
  ('cosmic', 'Cosmic', null, '[{"k":"deco","i":"moon"},{"k":"effect","i":"galaxy"},{"k":"plate","i":"galaxy"}]', 2, 15),
  ('arcade', 'Arcade', null, '[{"k":"deco","i":"pixel"},{"k":"effect","i":"pixels"},{"k":"frame","i":"pixelhearts"},{"k":"plate","i":"pixel"},{"k":"font","i":"silkscreen"}]', 3, 25),
  ('inferno', 'Inferno', null, '[{"k":"deco","i":"flame"},{"k":"effect","i":"flames"},{"k":"frame","i":"inferno"},{"k":"plate","i":"lava"}]', 4, 20),
  ('frost', 'Winter Frost', 'winter', '[{"k":"deco","i":"snowflakes"},{"k":"effect","i":"snow"},{"k":"frame","i":"frost"}]', 5, 15),
  ('synthwave', 'Synthwave', null, '[{"k":"deco","i":"neon"},{"k":"frame","i":"synth"},{"k":"plate","i":"neon"},{"k":"font","i":"audiowide"}]', 6, 20),
  ('royal', 'Royal Court', null, '[{"k":"deco","i":"crown"},{"k":"frame","i":"royal"},{"k":"plate","i":"gold"}]', 7, 15),
  ('lovestruck', 'Love Struck', 'valentines', '[{"k":"deco","i":"hearts"},{"k":"effect","i":"hearts"}]', 8, 10),
  ('headliner', 'Headliner', null, '[{"k":"deco","i":"headphones"},{"k":"effect","i":"music"},{"k":"frame","i":"melody"},{"k":"plate","i":"music"}]', 9, 20)
on conflict (id) do update set name = excluded.name, holiday = excluded.holiday, items = excluded.items, position = excluded.position, cut = excluded.cut;
delete from public.shop_bundles where id not in ('spooky', 'blossom', 'cosmic', 'arcade', 'inferno', 'frost', 'synthwave', 'royal', 'lovestruck', 'headliner');
-- (what people wore before there was anything to pay with stays theirs)
insert into public.owned_items (user_id, kind, item, how) select id, 'deco', decoration, 'grant' from public.profiles where decoration ~ '^[a-z0-9-]{1,24}$' on conflict do nothing;
insert into public.owned_items (user_id, kind, item, how) select id, 'font', name_font, 'grant' from public.profiles where name_font ~ '^[a-z0-9-]{1,24}$' on conflict do nothing;
insert into public.owned_items (user_id, kind, item, how) select id, 'effect', effect, 'grant' from public.profiles where effect ~ '^[a-z0-9-]{1,24}$' on conflict do nothing;
insert into public.owned_items (user_id, kind, item, how) select id, 'frame', frame, 'grant' from public.profiles where frame ~ '^[a-z0-9-]{1,24}$' on conflict do nothing;
insert into public.owned_items (user_id, kind, item, how) select id, 'plate', substr(plate, 4), 'grant' from public.profiles where plate ~ '^np:[a-z0-9-]{1,24}$' on conflict do nothing;
-- the Quests' rewards, and the ones people already finished
insert into public.quest_rewards (quest, kind, item) values ('first-steps', 'deco', 'sparkle'), ('chatterbox', 'deco', 'rainbow'), ('reactor', 'effect', 'hearts'),
  ('connected', 'deco', 'neon'), ('show-and-tell', 'deco', 'orbit'), ('party-up', 'effect', 'confetti'), ('game-on', 'effect', 'stars'), ('planner', 'deco', 'crown')
on conflict (quest) do update set kind = excluded.kind, item = excluded.item;
insert into public.owned_items (user_id, kind, item, how) select x.id, q.kind, q.item, 'quest' from public.profile_extras x join public.quest_rewards q on x.quests ? q.quest on conflict do nothing;
-- (where Supabase's pg_cron is turned on: everyone's boosts are kept paid every hour, with Fluentdat open or not; and,
-- with pg_net on too, Discord's linked channels are read and written every 2 seconds, or every minute where pg_cron is
-- too old for seconds)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin perform cron.schedule('fluentdat-boosts', '7 * * * *', 'select public.renew_all_boosts()'); exception when others then null; end;
    if exists (select 1 from pg_extension where extname = 'pg_net') then
      begin perform cron.schedule('fluentdat-discord', '2 seconds', 'select public.discord_tick()');
      exception when others then
        begin perform cron.schedule('fluentdat-discord', '* * * * *', 'select public.discord_tick()'); exception when others then null; end;
      end;
    end if;
  end if;
end $$;

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
    begin alter publication supabase_realtime add table public.wallets; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.owned_items; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.trades; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.user_settings; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.app_bans; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.channel_link_members; exception when duplicate_object then null; end;
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

-- ===================== banned from Fluentdat =====================
-- someone banned (app_bans) writes nothing to any table, even through the database's own functions, and sees nothing in
-- any table but their ban. (Running setup.sql again puts this on tables that come later too.)
create or replace function public.no_banned_writes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('fluentdat.leaving', true), '') = 'on' then return null; end if;     -- (deleting their account)
  if auth.uid() is not null and exists (select 1 from app_bans where user_id = auth.uid()) then
    raise exception 'You''re banned from Fluentdat.';
  end if;
  return null;
end $$;
revoke all on function public.no_banned_writes() from public, anon, authenticated;
do $$ declare t record; begin
  for t in select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('drop trigger if exists no_banned_writes on public.%I', t.relname);
    execute format('create trigger no_banned_writes before insert or update or delete on public.%I for each statement execute function public.no_banned_writes()', t.relname);
    if t.relrowsecurity and t.relname <> 'app_bans' then
      execute format('drop policy if exists "nothing for people banned from fluentdat" on public.%I', t.relname);
      execute format('create policy "nothing for people banned from fluentdat" on public.%I as restrictive for select to authenticated using ((select not public.app_banned()))', t.relname);
    end if;
  end loop;
end $$;
