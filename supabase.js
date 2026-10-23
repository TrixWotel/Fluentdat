// Fluentdat's data in Supabase: sign in with email (a magic link), Discord or GitHub, and messages arrive live.
// The database decides who sees what (supabase/setup.sql — row level security), so this file never has to
// trust itself: a stranger who signs up sees nothing, you join a server with an invite code, and DMs are
// readable only by the people in them. Same shape as store.js and github.js, so the app doesn't care.
import { SUPABASE, ICE_SERVERS } from './config.js';
import { mentionIds, mentionsEveryone } from './format.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
const FLUBOT = { name: 'Flubot', color: '#5b7fd6', bot: true };
const here = () => location.origin + location.pathname;
const uuid = () => crypto.randomUUID();
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));
const byTime = (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at);
const byPos = (a, b) => (a.position - b.position) || String(a.name).localeCompare(b.name);
// (a boost counts while it's paid for; on an older setup.sql there's no paying, so always)
const boostOn = (b) => !b.paid_until || Date.parse(b.paid_until) > Date.now();

let structure7 = null;
let structure8 = null;
const tradeListeners = new Set();
let sb = null, session = null, feed = null, extras = null, structure = null, structure2 = null, structure3 = null, structure4 = null, structure5 = null, structure6 = null, pinsLive = null, reacts = null, active = null, following = false, providersOn = null, beat = 0;
let styled = true;                  // (false on an older database: no profile themes, name styles or server tags there yet)
let cache = blank();
const pending = new Map();          // messages you've sent that the server hasn't confirmed yet (kept through reloads)
const asking = new Set();           // profiles being fetched
const rooms = new Map();            // server id → its presence channel (who has Fluentdat open right now, and who's in voice)
let online = {};                    // user id → the status they're showing, while they're here
let voiceNow = {};                  // server id → { voice channel id → [{ uid, mic, deaf, cam, screen }] }
let myVoice = null;                 // the voice channel you're in: { sv, ch, mic, deaf, cam, screen }
let state = { loading: false, error: '', lastSync: 0, needsSetup: false };
const listeners = new Set(), messageListeners = new Set(), callListeners = new Set();
function blank() {
  return { me: null, profiles: {}, full: {}, servers: [], categories: [], channels: [], members: [], roles: [], memberRoles: [], dmIndex: [],
    dmMembers: [], friendRows: [], msgs: {}, dms: {}, calls: {}, reads: {}, unread: {}, loaded: new Set(),
    emoji: [], stickers: [], blocks: [], admin: false, reacts: {}, perms: [], extras: {}, events: [], interest: [], pins: {}, boosts: [], threadInfo: {},
    wallet: null, owned: [], shop: {}, trades: [], bundles: [], sales: [], settings: null, ban: null, links: {} };
}
const emit = () => { for (const cb of listeners) try { cb(); } catch {} };
const must = ({ data, error }) => { if (error) throw new Error(friendly(error.message || String(error))); return data; };
// an update or delete the rules refuse comes back as "nothing changed" rather than an error, so ask for the rows back
const took = (refused) => (r) => { const data = must(r); if (!data || !data.length) throw new Error(refused); return data; };
const why = (e) => String((e && e.message) || e).slice(0, 200);
// a part of the database an older setup.sql didn't make yet: Fluentdat carries on without it, and says to run the new one
const NEW_SETUP = 'This needs the newest supabase/setup.sql: run it again in Supabase (SQL Editor → paste → Run).';
const missing = (e) => /does not exist|could not find|schema cache|PGRST20[0-9]|42P01|42703|newest supabase\/setup\.sql/i.test(why(e));
const friendly = (m) => (/row-level security/i.test(m) ? 'You don’t have permission to do that here.' : missing(m) ? NEW_SETUP : m);
async function soft(p, fallback) { try { return await p; } catch (e) { if (missing(e)) { state.needsSetup = true; return fallback; } throw e; } }
// a secret key here would hand everyone full control of the database, so refuse to use one
const secret = (k) => /^sb_secret_/.test(k) || (() => { try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch { return false; } })();
if (SUPABASE.anonKey && secret(SUPABASE.anonKey)) console.error('Fluentdat: config.js has a SECRET Supabase key. Put the publishable key there instead, and reset the secret one in Supabase.');
const configured = () => (!!(SUPABASE.url && SUPABASE.anonKey) && !secret(SUPABASE.anonKey)) || !!globalThis.__fluentdatSupabase;
const myId = () => session && session.user.id;
// (is the page in front of you? — outside a browser, as in the tests, it isn't)
const visible = () => typeof document !== 'undefined' && document.visibilityState === 'visible';
const looking = (place) => !!active && active.id === place && visible() && document.hasFocus();

async function client() {
  if (sb) return sb;
  if (globalThis.__fluentdatSupabase) return (sb = globalThis.__fluentdatSupabase);   // (tests hand in their own)
  const { createClient } = await import(LIB);
  sb = createClient(SUPABASE.url, SUPABASE.anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return sb;
}

// ---------- rows → what the app draws ----------
const myStatus = () => (cache.me && cache.me.status) || 'online';
function toUser(p) {
  if (!p) return { name: 'Someone', color: '#8a8f98' };
  return { id: p.id, login: p.handle, name: p.name || p.handle, color: p.color, avatar: p.avatar, pronouns: p.pronouns, about: p.about,
    plate: p.plate || '', since: p.created_at ? Date.parse(p.created_at) : 0, status: p.id === myId() ? myStatus() : online[p.id] || 'offline',
    theme: p.theme1 || p.theme2 ? [p.theme1 || '', p.theme2 || ''] : null,
    style: p.name_font || p.name_effect || p.name_color1 ? { font: p.name_font || '', effect: p.name_effect || '', c1: p.name_color1 || '', c2: p.name_color2 || '' } : null,
    tag: p.tag && p.tag_server ? { text: p.tag, badge: p.tag_badge || '', color: p.tag_color || '', server: p.tag_server } : null,
    playing: p.playing && typeof p.playing === 'object' && p.playing.n ? p.playing : null,
    decoration: p.decoration || '', effect: p.effect || '', frame: p.frame || '',
    hides: Array.isArray(p.hides) ? p.hides : [], privacy: p.privacy && typeof p.privacy === 'object' && !Array.isArray(p.privacy) ? p.privacy : {},
    // (a status bubble shows until its time is up)
    bubble: p.bubble && !(p.bubble_until && Date.parse(p.bubble_until) <= Date.now()) ? p.bubble : '', bubbleUntil: p.bubble && p.bubble_until ? Date.parse(p.bubble_until) || 0 : 0 };
}
const userOf = (id) => ({ ...toUser(cache.profiles[id]), id });
// (Flubot's lines are posted by whoever ran the command — say who, so nobody can pass words off as the bot's)
// (a linked channel's copy says where it was said, and who said it, as they were called then; so does a message from a
// linked Discord channel, which only the database makes too)
const fromDiscord = (r) => !!(r.linked && typeof r.linked === 'object' && r.linked.discord);
const toLinked = (r) => ((r.link_src || fromDiscord(r)) && r.linked && typeof r.linked === 'object' ? { server: String(r.linked.server || ''), channel: String(r.linked.channel || ''),
  name: String(r.linked.name || ''), from: r.linked.from || null, src: r.link_src || null, discord: fromDiscord(r) } : null);
const toMessage = (r) => ({ id: r.id, ts: Date.parse(r.created_at), text: r.text, sticker: r.sticker, action: r.action, reply: r.reply_to || null, forwarded: r.forwarded || null, linked: toLinked(r),
  files: Array.isArray(r.files) ? r.files : null, mine: r.author === myId() && !fromDiscord(r), sending: pending.has(r.id), progress: r._progress,
  // (a linked channel's copy goes by the name it was said under there, which may be someone you don't otherwise know;
  // someone on Discord is only a name here, posted for them by whoever linked the channel)
  user: r.bot ? { ...FLUBOT, via: (cache.profiles[r.author] || {}).handle || '' } : fromDiscord(r) ? { name: String(r.linked.name || 'Someone'), discord: true }
    : r.link_src && r.linked && r.linked.name ? { ...userOf(r.author), name: String(r.linked.name) } : userOf(r.author) });
const toServer = (r) => ({ id: r.id, name: r.name, icon: r.icon, img: r.img, owner: r.owner, banner: r.banner || '', description: r.description || '',
  tag: r.tag || '', tagBadge: r.tag_badge || '', tagColor: r.tag_color || '',
  features: r.features && typeof r.features === 'object' ? r.features : {}, guide: r.guide && typeof r.guide === 'object' ? r.guide : {}, gameServers: Array.isArray(r.game_servers) ? r.game_servers : [],
  category: r.category || '', public: !!r.public, since: Date.parse(r.created_at) || 0 });
const toRole = (r) => ({ id: r.id, server: r.server_id, name: r.name, color: r.color, hoist: r.hoist, position: r.position, icon: r.icon || '' });
// a trade, as the page shows it
const toTrade = (r) => ({ id: r.id, from: r.from_user, to: r.to_user, giveBux: Number(r.give_bux) || 0, giveItems: Array.isArray(r.give_items) ? r.give_items : [],
  wantBux: Number(r.want_bux) || 0, wantItems: Array.isArray(r.want_items) ? r.want_items : [], note: r.note || '', status: r.status, why: r.why || '',
  at: Date.parse(r.created_at) || 0, decided: r.decided_at ? Date.parse(r.decided_at) : 0 });
// someone's roles in a server, top one first
const rolesOf = (sv, uid) => cache.memberRoles.filter((x) => x.server_id === sv && x.user_id === uid)
  .map((x) => cache.roles.find((r) => r.id === x.role_id)).filter(Boolean).sort(byPos);
const toExtras = (r) => ({ connections: Array.isArray(r && r.connections) ? r.connections : [], widgets: Array.isArray(r && r.widgets) ? r.widgets : [],
  activity: Array.isArray(r && r.activity) ? r.activity : [], quests: Array.isArray(r && r.quests) ? r.quests : [],
  badges: { order: Array.isArray(r && r.badges && r.badges.order) ? r.badges.order : [], hidden: Array.isArray(r && r.badges && r.badges.hidden) ? r.badges.hidden : [] },
  playSeconds: Number(r && (r.play_seconds ?? r.playSeconds)) || 0,
  badgeLog: [r && r.badge_log, r && r.badgeLog].find((v) => v && typeof v === 'object' && !Array.isArray(v)) || {} });
const toCategory = (r) => ({ id: r.id, server: r.server_id, name: r.name, position: r.position });
const toChannel = (r) => ({ id: r.id, server: r.server_id, category: r.category_id, name: r.name, kind: r.kind, position: r.position, topic: r.topic || '',
  parent: r.parent_id || null, starter: r.starter || null, by: r.created_by || null, archived: !!r.archived });
const otherIn = (d) => (d.user_a === myId() ? d.user_b : d.user_a);
const isGroup = (d) => d && d.kind === 'group';
const groupPeople = (id) => cache.dmMembers.filter((m) => m.dm_id === id).map((m) => m.user_id);
// text channels are lower-case-with-dashes (like Discord); voice channels keep their spaces and capitals
const chanName = (name, kind) => (kind === 'voice' ? String(name).trim().replace(/\s+/g, ' ') : String(name).trim().replace(/\s+/g, '-').toLowerCase()).slice(0, 60) || (kind === 'voice' ? 'Voice' : 'channel');
const placeKind = (id) => (cache.dmIndex.some((d) => d.id === id) ? 'dm' : 'channel');
const serverOfChannel = (id) => (cache.channels.find((c) => c.id === id) || {}).server || null;
const roleIn = (sv, uid) => (cache.members.find((m) => m.server_id === sv && m.user_id === uid) || {}).role || null;
// what someone may do in a category or channel: the database's rules (perm_for and chan_perm in setup.sql), worked out
// here too, so the app only offers what will work. Owners and admins may do anything; members see, post, attach, react
// and join voice unless the category says otherwise (@everyone, then their roles, denies before allows, then them by name)
export const PERMS = ['view', 'manage_channels', 'manage_perms', 'invite', 'send', 'attach', 'react', 'mention_everyone', 'manage_messages', 'connect'];
const BASE_PERMS = new Set(['view', 'send', 'attach', 'react', 'connect']);
function permFor(uid, catId, perm) {
  const cat = cache.categories.find((c) => c.id === catId); if (!cat || !uid) return false;
  const r = roleIn(cat.server, uid); if (!r) return false;
  if (r === 'owner' || r === 'admin') return true;
  const rows = cache.perms.filter((x) => x.category_id === catId), has = (row, k) => !!row && (row[k] || []).includes(perm);
  let ok = BASE_PERMS.has(perm);
  const every = rows.find((x) => x.target === 'everyone');
  if (has(every, 'deny')) ok = false; if (has(every, 'allow')) ok = true;
  const mine = new Set(cache.memberRoles.filter((x) => x.server_id === cat.server && x.user_id === uid).map((x) => 'role:' + x.role_id));
  const roleRows = rows.filter((x) => mine.has(x.target));
  if (roleRows.some((x) => has(x, 'deny'))) ok = false; if (roleRows.some((x) => has(x, 'allow'))) ok = true;
  const them = rows.find((x) => x.target === 'member:' + uid);
  if (has(them, 'deny')) ok = false; if (has(them, 'allow')) ok = true;
  return ok;
}
function chanPerm(uid, chId, perm) {
  const c = cache.channels.find((x) => x.id === chId); if (!c || !uid) return false;
  if (!c.category) { const r = roleIn(c.server, uid); return r === 'owner' || r === 'admin' || (!!r && BASE_PERMS.has(perm)); }
  if (perm !== 'view' && !permFor(uid, c.category, 'view')) return false;
  return permFor(uid, c.category, perm);
}
// a server's emoji and stickers: their pictures are in the public "expressions" bucket, so they're plain links
const expressionUrl = (path) => (path && sb ? sb.storage.from('expressions').getPublicUrl(path).data.publicUrl : '');
const toEmoji = (r) => ({ id: r.id, server: r.server_id, name: r.name, animated: !!r.animated, path: r.path, url: expressionUrl(r.path), by: r.created_by });
const toSticker = (r) => ({ id: r.id, server: r.server_id, name: r.name, emoji: r.emoji || '', description: r.description || '', animated: !!r.animated, path: r.path, url: expressionUrl(r.path), by: r.created_by });

// ---------- loading ----------
const PROFILE_COLS = 'id,handle,name,color,avatar,pronouns,about,status,plate,updated_at';      // (when they joined, and what they're playing, come from profile_more: see moreOf)
const PROFILE_STYLE = ',theme1,theme2,name_font,name_effect,name_color1,name_color2,tag_server,tag,tag_badge,tag_color';
// (newest first: an older database lacks the later columns, and Fluentdat carries on with what it has)
const PROFILE_SETS = [PROFILE_COLS + PROFILE_STYLE + ',decoration,effect,frame,bubble,bubble_until', PROFILE_COLS + PROFILE_STYLE + ',decoration,effect',
  PROFILE_COLS + PROFILE_STYLE, PROFILE_COLS + PROFILE_STYLE, PROFILE_COLS];
let profileSet = 0;
async function profilesQ(q) {
  for (;;) {
    try { return await q('profiles', PROFILE_SETS[profileSet]); }
    catch (e) {
      if (!missing(e) || profileSet === PROFILE_SETS.length - 1) throw e;
      profileSet++; state.needsSetup = true; if (profileSet === PROFILE_SETS.length - 1) styled = false;   // (and what each set lacks stays off)
    }
  }
}
// when people joined, what they're playing, and the parts of their profile they keep from you: the database decides what
// you may see (from setup.sql 16; an older one has no say, and lets everyone read when anyone joined)
async function moreOf(ver, ids) {
  if (ver >= 16) return (await soft(sb.rpc('profile_more', ids ? { p_ids: ids } : {}).then(must), [])).map((m) => ({ id: m.id, created_at: m.since || null, playing: m.playing || null, hides: m.hides || [] }));
  const q = sb.from('profiles').select('id,created_at,playing');
  return (await soft((ids ? q.eq('id', ids[0]) : q).then(must), [])).map((m) => ({ id: m.id, created_at: m.created_at || null, playing: m.playing || null, hides: [] }));
}
// (each reload is numbered: one that finishes after a newer one started leaves its older results unused)
let loadSeq = 0;
// what you just said about events, kept on top of a reload until the database has surely caught up
const interestOps = new Map();          // event id → { on, at }
const statsKept = new Map();            // person → { at, v }: what their badges are made of, as last asked
const SETUP_VERSION = 20;               // (the setup.sql this Fluentdat goes with: see setup_version() there)
// what you just changed on your profile, kept on top of a reload until the database has surely caught up (a reload that
// set off before your change, and came back after it, would show the old name, status or bubble for a moment)
const meOps = new Map();                // column → { v, until }
// a reload of everything. Only the newest one's answer is kept, and an older one still going waits for it, so whoever
// waits for a reload sees what it brought
let newestLoad = null;
function loadAll() { const p = loadOnce(); newestLoad = p; return p; }
async function loadOnce() {
  if (!session) return;
  const seq = ++loadSeq;
  state.loading = true; state.error = ''; emit();
  try {
    const q = (t, cols = '*') => sb.from(t).select(cols).then(must);
    const [profiles, mine, servers, members, categories, channels, dms, friends, roles, memberRoles, dmMembers, reads, unread, emoji, stickers, blocks, admin, perms, events, interest, boosts, version] = await Promise.all([
      profilesQ(q),
      sb.from('profiles').select('banner,stickers,privacy').eq('id', myId()).then(must).catch(() => sb.from('profiles').select('banner,stickers').eq('id', myId()).then(must)),
      q('servers'), q('server_members'), q('categories'), q('channels'), q('dms'), q('friends'), q('roles'), q('member_roles'),
      soft(q('dm_members'), []), soft(q('reads'), []), soft(sb.rpc('unread').then(must), null),
      soft(q('server_emoji'), []), soft(q('server_stickers'), []), soft(q('blocks'), []), soft(sb.rpc('is_app_admin').then(must), false),
      soft(q('category_perms'), []), soft(q('server_events'), []), soft(q('event_interest'), []), soft(q('server_boosts'), []),
      soft(sb.rpc('setup_version').then(must), 0)]);
    if (seq !== loadSeq) return newestLoad;
    // (Datbux: your wallet, what you have, the Shop's prices, your trades; the version is known once they are)
    const ver = Number(version) || 0;
    // (when each person joined, what they're playing, and which parts of their profile they keep from you)
    const more = await moreOf(ver, null);
    if (seq !== loadSeq) return newestLoad;
    const byId = new Map(more.map((m) => [m.id, m]));
    for (const p of profiles) Object.assign(p, byId.get(p.id) || { created_at: null, playing: null, hides: [] });
    if (ver >= 9) {
      const [wal, owned, shop, trades, bundles, sales] = await Promise.all([soft(sb.from('wallets').select('*').eq('user_id', myId()).then(must), []),
        soft(sb.from('owned_items').select('kind,item,how,got_at').eq('user_id', myId()).then(must), []), soft(q('shop_items'), []),
        soft(sb.from('trades').select('*').order('created_at', { ascending: false }).limit(80).then(must), []),
        ver >= 13 ? soft(sb.from('shop_bundles').select('id,name,holiday,items,position').order('position').then(must), []) : [],
        ver >= 13 ? soft(sb.rpc('shop_sales').then(must), []) : []]);
      if (seq !== loadSeq) return newestLoad;
      cache.wallet = wal[0] || null; cache.owned = owned; cache.shop = Object.fromEntries(shop.map((r) => [r.kind + ':' + r.item, Number(r.price) || 0])); cache.trades = trades;
      cache.bundles = bundles.filter((b) => Array.isArray(b.items)).map((b) => ({ id: b.id, name: b.name, holiday: b.holiday || null, items: b.items.filter((x) => x && x.k && x.i) }));
      cache.sales = (Array.isArray(sales) ? sales : []).filter((h) => h && h.id).map((h) => ({ id: h.id, name: h.name, kind: h.kind, pct: Number(h.pct) || 0, ends: Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(String(h.ends)) ? h.ends + 'T00:00:00Z' : String(h.ends)) || 0 }));
      // (something you were putting on that isn't yours any more, after a trade, isn't kept on top)
      for (const [k, kind] of [['decoration', 'deco'], ['name_font', 'font'], ['effect', 'effect'], ['frame', 'frame']]) {
        const op = meOps.get(k);
        if (op && op.v && (cache.shop[kind + ':' + op.v] || 0) > 0 && !owned.some((o) => o.kind === kind && o.item === op.v)) meOps.delete(k);
      }
    }
    // (banned from Fluentdat: why, and since when; the database shows such a person nothing else)
    if (ver >= 15) {
      const ban = await soft(sb.from('app_bans').select('reason,created_at').eq('user_id', myId()).then(must), []);
      if (seq !== loadSeq) return newestLoad;
      cache.ban = ban[0] ? { reason: ban[0].reason || '', at: Date.parse(ban[0].created_at) || 0 } : null;
    }
    // (your channels that are linked with channels elsewhere, and with how many)
    if (ver >= 18) {
      const links = await soft(sb.rpc('my_links').then(must), []);
      if (seq !== loadSeq) return newestLoad;
      cache.links = Object.fromEntries((links || []).map((r) => [r.channel_id, Number(r.others) || 0]));
    }
    // (your settings, as Customize keeps them with your account)
    if (ver >= 10) {
      const got = await soft(sb.from('user_settings').select('data,updated_at').eq('user_id', myId()).then(must), null);
      if (seq !== loadSeq) return newestLoad;
      if (got) cache.settings = got[0] ? { data: got[0].data || {}, at: Date.parse(got[0].updated_at) || 0 } : null;
    }
    cache.version = ver;
    if (cache.version < SETUP_VERSION) state.needsSetup = true;
    cache.profiles = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const self = profiles.find((x) => x.id === myId());
    cache.me = self ? { ...self, ...(mine[0] || {}) } : null;
    if (cache.me) {
      for (const [k, op] of meOps) { if (op.until && Date.now() > op.until) meOps.delete(k); else cache.me[k] = op.v; }
      cache.profiles[cache.me.id] = cache.me;
    }
    cache.full = {};
    const mineIn = new Set(members.filter((m) => m.user_id === myId()).map((m) => m.server_id));
    cache.servers = servers.filter((sv) => mineIn.has(sv.id)).map(toServer);      // (public servers you haven't joined are visible, not yours)
    cache.members = members;
    cache.roles = roles;
    cache.memberRoles = memberRoles;
    cache.categories = categories.sort(byPos).map(toCategory);
    cache.channels = channels.sort(byPos).map(toChannel);
    cache.dmIndex = dms;
    cache.dmMembers = dmMembers;
    cache.friendRows = friends;
    cache.reads = Object.fromEntries(reads.map((r) => [r.place, r]));
    cache.emoji = emoji; cache.stickers = stickers; cache.blocks = blocks; cache.admin = admin === true; cache.perms = perms;
    cache.events = events; cache.interest = interest; cache.boosts = boosts;
    for (const [id, op] of interestOps) {
      if (Date.now() - op.at > 10000) { interestOps.delete(id); continue; }
      cache.interest = cache.interest.filter((i) => !(i.event_id === id && i.user_id === myId()));
      if (op.on) cache.interest.push({ event_id: id, user_id: myId(), created_at: new Date(op.at).toISOString() });
    }
    if (unread) cache.unread = Object.fromEntries(unread.map((u) => [u.place, { unread: u.unread, mentions: u.mentions, last: u.last_at ? Date.parse(u.last_at) : 0 }]));
    // (the first time on this version: what's already there counts as read, rather than every old message at once)
    if (unread && !reads.length && unread.some((u) => u.unread)) await soft(markAllRead(unread.map((u) => u.place)), null);
    if (active) await loadMessages(active);
    watchPresence();
    state.lastSync = Date.now();
  } catch (e) { state.error = why(e); }
  state.loading = false; emit();
}
async function loadMessages(a) {
  const dm = a.kind === 'dm';
  const col = dm ? 'dm_id' : 'channel_id';
  const rows = must(await sb.from(dm ? 'dm_messages' : 'messages').select('*').eq(col, a.id)
    .order('created_at', { ascending: false }).limit(300)).reverse();
  for (const p of pending.values()) if (p[col] === a.id && !rows.some((m) => m.id === p.id)) rows.push(p);
  (dm ? cache.dms : cache.msgs)[a.id] = rows;
  if (dm) cache.calls[a.id] = (await soft(sb.from('calls').select('*').eq('dm_id', a.id).order('created_at', { ascending: false }).limit(50).then(must), [])).reverse();
  cache.pins[a.id] = await soft(sb.from('pins').select('*').eq('place', a.id).then(must), []);
  cache.reacts[a.id] = await soft(sb.from('reactions').select('message_id,place,user_id,emoji,active,created_at').eq('place', a.id).eq('active', true).then(must), []);
  cache.loaded.add(a.id);
}
// someone new spoke (they've only just joined): find out who they are
function meet(id) {
  if (!id || cache.profiles[id] || asking.has(id)) return;
  asking.add(id);
  sb.from('profiles').select(PROFILE_SETS[profileSet]).eq('id', id).then(must)
    .then(async (rows) => { if (!rows[0]) return; const m = (await moreOf(cache.version || 0, [id]).catch(() => []))[0]; cache.profiles[id] = { ...rows[0], ...(m || {}) }; emit(); }, () => {})
    .then(() => asking.delete(id));
}

// ---------- live ----------
// every message in every channel and DM you can read arrives here (the database only sends you those): it goes into
// the conversation if that's loaded, counts as unread (and maybe as a ping) if you're elsewhere, and the app may say so
function watchMessages() {
  if (feed) return;
  const add = (dm) => ({ new: row }) => {
    const place = dm ? row.dm_id : row.channel_id, bucket = dm ? cache.dms : cache.msgs;
    if (!row.bot && !row.link_src && !fromDiscord(row)) meet(row.author);   // (a copy's author may be someone you don't know: the copy says who)
    if (bucket[place] && !bucket[place].some((m) => m.id === row.id)) { bucket[place].push(row); bucket[place].sort(byTime); }
    const mineToo = row.author === myId() && !row.bot && !fromDiscord(row);     // (what Discord says in a channel you linked isn't yours)
    const u = (cache.unread[place] = cache.unread[place] || { unread: 0, mentions: 0, last: 0 });
    u.last = Date.parse(row.created_at) || Date.now();
    const ti = !dm && cache.threadInfo[place]; if (ti) { ti.count++; ti.last = u.last; }       // (a thread's message count)
    const ping = !mineToo && (dm || pings(row, place));
    const here = looking(place);
    if (!mineToo && !here) { u.unread++; if (ping) u.mentions++; }
    if (here && !mineToo) markRead(place);
    emit();
    if (!mineToo) for (const cb of messageListeners) try { cb({ place, dm, ping, message: toMessage(row), server: dm ? null : serverOfChannel(place) }); } catch {}
  };
  const drop = (dm) => ({ old }) => {
    const bucket = dm ? cache.dms : cache.msgs;
    for (const [place, list] of Object.entries(bucket)) if (old && list.some((m) => m.id === old.id)) { bucket[place] = list.filter((m) => m.id !== old.id); emit(); }
  };
  feed = sb.channel('fluentdat-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, add(false))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, add(true))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, drop(false))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dm_messages' }, drop(true))
    .subscribe();
  // (calls and reading come on a channel of their own: on an older database without them, messages still arrive)
  extras = sb.channel('fluentdat-extras')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, ({ new: row }) => callChanged(row, true))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, ({ new: row }) => callChanged(row, false))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reads' }, ({ new: row }) => {
      if (!row || !row.place || row.user_id !== myId()) return;
      cache.reads[row.place] = row;
      const u = cache.unread[row.place];
      if (u && Date.parse(row.read_at) >= u.last) { u.unread = 0; u.mentions = 0; }
      emit();
    })
    .subscribe();
  pinsLive = sb.channel('fluentdat-pins')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, ({ eventType, new: row, old }) => {
      const r = eventType === 'DELETE' ? old : row; if (!r || !r.place || !cache.pins[r.place]) return;
      cache.pins[r.place] = cache.pins[r.place].filter((x) => x.message_id !== r.message_id);
      if (eventType !== 'DELETE') cache.pins[r.place].push(row);
      emit();
    })
    .subscribe();
  reacts = sb.channel('fluentdat-reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, ({ new: row }) => {
      if (!row || !row.place) return;
      const list = cache.reacts[row.place]; if (!list) return;          // (a conversation that isn't open learns them when it opens)
      const i = list.findIndex((r) => r.message_id === row.message_id && r.user_id === row.user_id && r.emoji === row.emoji);
      if (i >= 0) list[i] = row; else list.push(row);
      if (row.user_id && !row.bot) meet(row.user_id);
      emit();
    })
    .subscribe();
}
// does this channel message ping you? your @name, @everyone/@here from an admin, or a reply to one of yours
function pings(row, place) {
  const me = myId(), text = row.text || '';
  if (mentionIds(text).includes(String(me).toLowerCase())) return true;
  if (mentionsEveryone(text) && chanPerm(row.author, place, 'mention_everyone')) return true;
  if (row.reply_to) { const to = (cache.msgs[place] || []).find((m) => m.id === row.reply_to); if (to && to.author === me && !fromDiscord(to)) return true; }
  return false;
}
function callChanged(row, started) {
  const list = (cache.calls[row.dm_id] = cache.calls[row.dm_id] || []), i = list.findIndex((c) => c.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  emit();
  for (const cb of callListeners) try { cb({ call: toCall(row), started }); } catch {}
}
const toCall = (r) => ({ id: r.id, dm: r.dm_id, by: userOf(r.started_by), mine: r.started_by === myId(), video: !!r.video,
  ts: Date.parse(r.created_at), ended: r.ended_at ? Date.parse(r.ended_at) : 0 });

// who's here: everyone in a server shares a presence channel (named by the server's id, which only members know),
// and says which voice channel they're in
function watchPresence() {
  const want = new Set(cache.servers.map((s) => s.id));
  for (const [id, ch] of rooms) if (!want.has(id)) { sb.removeChannel(ch); rooms.delete(id); }
  for (const id of want) {
    if (rooms.has(id)) continue;
    const ch = sb.channel('fluentdat-here-' + id, { config: { presence: { key: myId() } } });
    ch.on('presence', { event: 'sync' }, recount);
    ch.subscribe((st) => { if (st === 'SUBSCRIBED') announce(ch, id); });
    rooms.set(id, ch);
  }
  recount();
}
function announce(ch, sv) {
  try {
    const v = myVoice && myVoice.sv === sv ? { voice: myVoice.ch, mic: myVoice.mic, deaf: myVoice.deaf, cam: myVoice.cam, screen: myVoice.screen } : {};
    if (myStatus() === 'invisible' && !v.voice) ch.untrack(); else ch.track({ status: myStatus() === 'invisible' ? 'offline' : myStatus(), ...v });
  } catch {}
}
function recount() {
  const next = {}, voice = {};
  for (const [sv, ch] of rooms) for (const [id, metas] of Object.entries(ch.presenceState() || {})) {
    if (!metas || !metas[0]) continue;
    const m = metas.find((x) => x.voice) || metas[0];
    if (m.status && m.status !== 'offline') next[id] = m.status;
    if (m.voice) ((voice[sv] = voice[sv] || {})[m.voice] = voice[sv][m.voice] || []).push({ uid: id, mic: m.mic !== false, deaf: !!m.deaf, cam: !!m.cam, screen: !!m.screen });
  }
  const changed = JSON.stringify(next) !== JSON.stringify(online) || JSON.stringify(voice) !== JSON.stringify(voiceNow);
  online = next; voiceNow = voice;
  if (changed) emit();
}
function watchStructure() {
  if (structure) return;
  let t = 0;
  const again = () => { clearTimeout(t); t = setTimeout(loadAll, 400); };
  structure = sb.channel('fluentdat-structure');
  for (const table of ['servers', 'channels', 'categories', 'server_members', 'profiles', 'dms', 'roles', 'member_roles']) structure.on('postgres_changes', { event: '*', schema: 'public', table }, again);
  structure.subscribe();
  // a friend request or a new group reaches you as an insert (a deletion would tell everyone, so those wait for the
  // next reload). Its own channel, since an older database has no dm_members.
  structure2 = sb.channel('fluentdat-structure-2');
  for (const table of ['friends', 'dm_members']) structure2.on('postgres_changes', { event: 'INSERT', schema: 'public', table }, again);
  structure2.subscribe();
  // a server's emoji and stickers (their own channel: an older database has none)
  structure3 = sb.channel('fluentdat-structure-3');
  for (const table of ['server_emoji', 'server_stickers']) structure3.on('postgres_changes', { event: '*', schema: 'public', table }, again);
  structure3.subscribe();
  // a category's permissions (their own channel too)
  structure4 = sb.channel('fluentdat-structure-4');
  structure4.on('postgres_changes', { event: '*', schema: 'public', table: 'category_perms' }, again);
  structure4.subscribe();
  // a server's events, and who's interested (their own channel too)
  structure5 = sb.channel('fluentdat-structure-5');
  for (const table of ['server_events', 'event_interest']) structure5.on('postgres_changes', { event: '*', schema: 'public', table }, again);
  structure5.subscribe();
  // who boosts which server (its own channel too)
  structure6 = sb.channel('fluentdat-structure-6');
  structure6.on('postgres_changes', { event: '*', schema: 'public', table: 'server_boosts' }, again);
  structure6.subscribe();
  // (Datbux: your wallet, what you have, and trades for you; an offer is told to the app)
  structure7 = sb.channel('fluentdat-structure-7');
  for (const table of ['wallets', 'owned_items', 'user_settings', 'app_bans']) structure7.on('postgres_changes', { event: '*', schema: 'public', table }, again);
  structure7.on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, ({ eventType, new: row }) => {
    again();
    if (eventType === 'INSERT' && row && row.to_user === myId()) for (const cb of tradeListeners) try { cb(toTrade(row)); } catch {}
  });
  structure7.subscribe();
  // a channel linked with others, or taken out (its own channel: an older database has no links)
  structure8 = sb.channel('fluentdat-structure-8');
  structure8.on('postgres_changes', { event: '*', schema: 'public', table: 'channel_link_members' }, again);
  structure8.subscribe();
}
// signed in: load everything, keep it live, and notice if the session ends (signed out in another tab, or it ran out)
async function start() {
  if (!following) { following = true; sb.auth.onAuthStateChange((_e, s) => { session = s; if (!s) { cache = blank(); active = null; emit(); } }); }
  await loadAll();
  watchStructure();
  watchMessages();
  heartbeat();
}
// "I'm here" every few minutes (for the online count on invite cards)
function heartbeat() {
  clearInterval(beat);
  const go = () => { if (session && visible()) Promise.resolve(sb.rpc('heartbeat')).then(() => {}, () => {}); };
  go(); beat = setInterval(go, 4 * 60000);
}
// a change that didn't take: put things back as they really are, then say why (after, so the reload doesn't wipe it)
function push(p, undo) {
  return p.catch(async (e) => {
    if (undo) try { await undo(); } catch {}
    state.error = missing(e) ? NEW_SETUP : why(e); emit();
  });
}

function sendTo(dm, id, msg) {
  const row = { id: uuid(), author: myId(), text: msg.text == null || msg.text === '' ? null : msg.text, sticker: msg.sticker || null,
    action: !!msg.action, bot: !!(msg.user && msg.user.bot), [dm ? 'dm_id' : 'channel_id']: id };
  if (msg.reply) row.reply_to = msg.reply;
  if (msg.files && msg.files.length) row.files = msg.files;
  if (msg.forwarded) row.forwarded = msg.forwarded;
  const bucket = dm ? cache.dms : cache.msgs, shown = { ...row, created_at: new Date().toISOString() };
  (bucket[id] = bucket[id] || []).push(shown);
  pending.set(row.id, shown);
  emit();
  push(sb.from(dm ? 'dm_messages' : 'messages').insert(row).then(must).then(() => { pending.delete(row.id); emit(); }),
    () => { pending.delete(row.id); bucket[id] = (bucket[id] || []).filter((m) => m.id !== row.id); });
  return true;
}
// reading: what you've read is kept per place, across your devices
const lastMarked = {};
function markRead(place) {
  if (!place || !session) return;
  const u = cache.unread[place];
  if (u) { u.unread = 0; u.mentions = 0; }
  if (Date.now() - (lastMarked[place] || 0) < 2500) return;
  lastMarked[place] = Date.now();
  const read_at = new Date().toISOString();
  cache.reads[place] = { ...(cache.reads[place] || { place, notify: 'default', muted_until: null }), read_at };
  sb.from('reads').upsert({ user_id: myId(), place, read_at }).then(() => {}, () => {});
}
// Mark Unread: you've read up to just before this message (and it isn't marked read again until you come back to it)
function markUnread(place, ts) {
  if (!place || !session) return;
  const read_at = new Date(ts - 1).toISOString(), dm = placeKind(place) === 'dm';
  cache.reads[place] = { ...(cache.reads[place] || { place, notify: 'default', muted_until: null }), read_at };
  const after = (cache.dms[place] || cache.msgs[place] || []).filter((r) => Date.parse(r.created_at) >= ts && r.author !== myId());
  cache.unread[place] = { ...(cache.unread[place] || { last: 0 }), unread: after.length, mentions: dm ? after.length : after.filter((r) => pings(r, place)).length };
  lastMarked[place] = Date.now();
  emit();
  push(sb.from('reads').upsert({ user_id: myId(), place, read_at }).then(must));
}
async function markAllRead(places) {
  const read_at = new Date().toISOString();
  for (const p of places) { const u = cache.unread[p]; if (u) { u.unread = 0; u.mentions = 0; } }
  if (places.length) await sb.from('reads').upsert(places.map((place) => ({ user_id: myId(), place, read_at }))).then(must);
}
// uploads go straight to Supabase Storage (with progress where the browser can tell); the rules check the folder
async function upload(path, file, onProgress) {
  if (globalThis.__fluentdatSupabase || !globalThis.XMLHttpRequest) { must(await sb.storage.from('files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })); return; }
  const token = (await sb.auth.getSession()).data.session?.access_token;
  await new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${SUPABASE.url.replace(/\/$/, '')}/storage/v1/object/files/${path.split('/').map(encodeURIComponent).join('/')}`);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.setRequestHeader('apikey', SUPABASE.anonKey);
    x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => { if (x.status < 300) res(); else { let m = x.responseText; try { m = JSON.parse(m).message || m; } catch {} rej(new Error(/maximum allowed size|too large|413/i.test(m + x.status) ? 'That file is bigger than 10 MB.' : /bucket not found/i.test(m) ? NEW_SETUP : friendly(m || 'Upload failed.'))); } };
    x.onerror = () => rej(new Error('The upload didn’t go through. Check your connection.'));
    x.send(file);
  });
}
// a signed link to an attachment, good for an hour (kept, and asked for again when it's close to running out)
const links = new Map();
async function fileLink(path, download) {
  const key = path + (download ? '|' + download : ''), have = links.get(key);
  if (have && have.until > Date.now()) return have.p;
  const p = sb.storage.from('files').createSignedUrl(path, 3600, download ? { download } : undefined).then(must).then((d) => d.signedUrl);
  links.set(key, { p, until: Date.now() + 50 * 60000 });
  p.catch(() => links.delete(key));
  return p;
}
// (adding a way to sign in that didn't work: what to do about it)
const linkTrouble = (m) => (/already linked|identity_already_exists|already (been )?(used|taken)/i.test(m) ? 'that account already has a Fluentdat account of its own. Sign in with it and delete that account (My Account), then add it here.'
  : /manual linking/i.test(m) ? 'adding ways to sign in is turned off for this Fluentdat. Whoever runs it can turn on “Allow manual linking” in Supabase (Authentication → Sign In / Providers).' : m);
// signing in with a password: your email's, or (accounts made from a one-time link) the address made up from your username
async function signInPassword(email, password, what = 'username') {
  const r = await sb.auth.signInWithPassword({ email, password: String(password || '') });
  if (r.error) throw new Error(/invalid login|invalid credentials/i.test(r.error.message || '') ? `That ${what} and password don’t match.` : friendly(r.error.message || String(r.error)));
  session = (r.data && r.data.session) || (await sb.auth.getSession()).data.session;
  if (!session) throw new Error('Couldn’t sign in. Try again.');
  await start();
}
// a picture's file type, for the "expressions" bucket (an animated PNG is a PNG)
const pictureExt = (file) => ({ 'image/gif': 'gif', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/apng': 'png' }[String(file.type || '').toLowerCase()] || 'png');

export const SupabaseStore = {
  get backend() { return cache.me ? `Supabase (@${cache.me.handle})` : 'Supabase'; },
  configured,
  account: () => (session ? { id: session.user.id, login: cache.me ? cache.me.handle : session.user.email, email: session.user.email || '', provider: (session.user.app_metadata || {}).provider || 'email',
    password: /@users\.fluentdat\.invalid$/i.test(session.user.email || '') } : null),
  // is there a sign-in to pick up? (from last time, or just back from Discord / an email link) — answered without the network
  pending() {
    if (!configured()) return false;
    if (globalThis.__fluentdatSupabase) return true;
    const q = new URL(location.href).searchParams, h = new URLSearchParams(location.hash.slice(1));
    if (q.has('code') || q.has('error_description') || h.has('error_description')) return true;
    try { return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k)); } catch { return false; }
  },
  syncState: () => ({ ...state, repo: 'Supabase' }),
  needsSetup: () => state.needsSetup,

  // ---- signing in ----
  // back from a magic link or Discord/GitHub? (the sign-in code is in the address) — or still signed in from before
  async resume() {
    if (!SupabaseStore.pending()) return false;
    const url = new URL(location.href), h = new URLSearchParams(url.hash.slice(1));
    const err = url.searchParams.get('error_description') || h.get('error_description');
    await client();
    const { data } = await sb.auth.getSession();
    session = data && data.session;
    if (url.searchParams.has('code') || err) {     // (tidy the address so a reload doesn't try again)
      for (const k of ['code', 'error', 'error_code', 'error_description']) { url.searchParams.delete(k); h.delete(k); }
      const hash = h.toString();
      history.replaceState(null, '', url.pathname + (url.search || '') + (hash ? '#' + hash : ''));
    }
    if (err) state.error = 'Sign-in didn’t finish: ' + linkTrouble(err);
    if (!session) return false;
    await start();
    return true;
  },
  // which sign-in methods the project has switched on (so the sign-in window only offers those)
  async providers() {
    if (providersOn) return providersOn;
    try {
      const j = await (await fetch(SUPABASE.url.replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: SUPABASE.anonKey } })).json();
      const ext = j.external || {};
      providersOn = { discord: !!ext.discord, github: !!ext.github, email: ext.email !== false,
        twitch: !!ext.twitch, spotify: !!ext.spotify, twitter: !!(ext.twitter || ext.x) };          // (the last three: for verified connections)
    } catch { providersOn = { discord: true, github: true, email: true }; }     // (can't tell: offer them all)
    return providersOn;
  },
  async signInEmail(email) { await client(); must(await sb.auth.signInWithOtp({ email: String(email).trim(), options: { emailRedirectTo: here() } })); },
  // the code in the same email — for when the link opens on another device (a phone) instead of this browser
  async verifyEmailCode(email, code) {
    await client();
    const r = await sb.auth.verifyOtp({ email: String(email).trim(), token: String(code).replace(/\s+/g, ''), type: 'email' });
    if (r.error && /expired|invalid/i.test(r.error.message || '')) throw new Error('That code didn’t work, or it has run out. Check it, or go back and ask for a new email.');
    const data = must(r);
    session = (data && data.session) || (await sb.auth.getSession()).data.session;
    if (!session) throw new Error('That code didn’t work. Ask for a new email and try again.');
    await start();
    return true;
  },
  async signInOAuth(provider) { await client(); must(await sb.auth.signInWithOAuth({ provider, options: { redirectTo: here() } })); },
  // ---- accounts made from a one-time link: a username and a password (no email) ----
  // what a one-time link is (asked signed out, on the page it opens): { ok, by, expires } or null
  async appInviteCheck(code) {
    await client();
    const r = must(await sb.rpc('app_invite_check', { p_code: String(code || '').trim() }));
    const row = Array.isArray(r) ? r[0] : r;
    return row ? { ok: !!row.ok, by: row.by_name || 'Someone', expires: row.expires_at ? Date.parse(row.expires_at) : 0 } : null;
  },
  // make the account, then sign in to it
  async redeemAppInvite(code, handle, password, name) {
    await client();
    const email = must(await sb.rpc('redeem_app_invite', { p_code: String(code || '').trim(), p_handle: String(handle || '').trim(), p_password: String(password || ''), p_name: String(name || '').trim() }));
    await signInPassword(email, password);
    return SupabaseStore.account();
  },
  // a password with your username, or your email (anything with an @ in the middle)
  async signInAny(who, password) {
    const w = String(who || '').trim();
    if (/^[^@\s]+@[^@\s]+$/.test(w)) { await client(); await signInPassword(w, password, 'email'); return SupabaseStore.account(); }
    return SupabaseStore.signInUsername(w, password);
  },
  async signInUsername(handle, password) {
    await client();
    const email = must(await sb.rpc('login_email', { p_handle: String(handle || '').trim() }));
    if (!email) throw new Error('There’s no account with that username and a password. (Signed in with Discord, GitHub or email before? Use that instead.)');
    await signInPassword(email, password);
    return SupabaseStore.account();
  },
  // a new password (or your first: then you can sign in with your email, or username, and it)
  async changePassword(password) {
    const r = await sb.auth.updateUser({ password: String(password || '') });
    if (r.error) throw new Error(/reauthenticat/i.test(r.error.message || '') ? 'For your safety, sign out and in again, then set it.' : friendly(r.error.message || String(r.error)));
  },
  // ---- your account: the ways you sign in, your email, handing a server on, and deleting it ----
  canAccount: () => (cache.version || 0) >= 17,
  async hasPassword() { return !!must(await sb.rpc('has_password')); },
  async signInMethods() {
    const r = await sb.auth.getUserIdentities();
    if (r.error) throw new Error(friendly(r.error.message || String(r.error)));
    return ((r.data && r.data.identities) || []).map((i) => { const d = i.identity_data || {};
      return { provider: i.provider, name: i.provider === 'discord' ? d.full_name || String(d.name || '').split('#')[0] : d.user_name || d.preferred_username || d.email || '', raw: i }; });
  },
  async unlinkAccount(raw) {
    must(await sb.auth.unlinkIdentity(raw));
    const r = await sb.auth.refreshSession(); if (r.data && r.data.session) session = r.data.session;
    emit();
  },
  // a new email: a link goes to it (and, if Supabase asks for it, one to the old one too) to finish
  async changeEmail(email) {
    const r = await sb.auth.updateUser({ email: String(email || '').trim() }, { emailRedirectTo: location.origin + location.pathname });
    if (r.error) throw new Error(/rate limit/i.test(r.error.message || '') ? 'Too many emails just now. Try again in a little while.' : friendly(r.error.message || String(r.error)));
  },
  async transferServer(sv, user) { must(await sb.rpc('transfer_server', { p_server: sv, p_user: user })); await loadAll(); },
  // your files first (storage keeps them otherwise: they're found from your messages), then your account and all that's yours
  async deleteAccount() {
    try {
      const rows = [...must(await sb.from('messages').select('files').eq('author', myId())), ...must(await sb.from('dm_messages').select('files').eq('author', myId()))];
      const paths = rows.flatMap((r) => (Array.isArray(r.files) ? r.files : [])).map((f) => f && f.path).filter((x) => typeof x === 'string' && x.split('/')[2] === myId());
      for (let i = 0; i < paths.length; i += 100) await sb.storage.from('files').remove(paths.slice(i, i + 100));
    } catch {}
    must(await sb.rpc('delete_my_account'));
    await SupabaseStore.signOut();
  },
  // someone by their @handle (for a profile link)
  async findUser(handle) {
    const found = must(await sb.rpc('find_user', { p_handle: String(handle || '').replace(/^@/, '') }));
    return found && found[0] ? { ...toUser(found[0]), id: found[0].id } : null;
  },
  async signOut() {
    for (const ch of [feed, extras, structure, structure2, structure3, structure4, structure5, structure6, structure7, structure8, pinsLive, reacts, ...rooms.values()]) if (ch) sb.removeChannel(ch);
    feed = extras = structure = structure2 = structure3 = structure4 = structure5 = structure6 = structure7 = structure8 = pinsLive = reacts = null; rooms.clear(); online = {}; voiceNow = {}; myVoice = null; clearInterval(beat);
    if (sb) await sb.auth.signOut({ scope: 'local' });   // (just this browser — your phone stays signed in)
    session = null; cache = blank(); active = null; pending.clear(); emit();
  },

  init: () => cache,
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  // a new message somewhere you can read (not yours): { place, dm, ping, message, server }
  onMessage(cb) { messageListeners.add(cb); return () => messageListeners.delete(cb); },
  setActive(kind, id) {
    if (!session || !id) return;
    if (active && active.kind === kind && active.id === id) return;
    active = { kind, id };
    push(loadMessages(active).then(emit));
  },
  loaded: (id) => !session || cache.loaded.has(id),
  syncNow: () => push(loadAll()),

  // ---- servers, categories, channels ----
  servers: () => cache.servers.slice(),
  server: (id) => cache.servers.find((s) => s.id === id) || null,
  categories: (sv) => cache.categories.filter((c) => c.server === sv),
  channels: (sv) => cache.channels.filter((c) => c.server === sv && c.kind !== 'thread'),
  channel: (id) => cache.channels.find((c) => c.id === id) || null,
  role: (sv) => (cache.members.find((m) => m.server_id === sv && m.user_id === myId()) || {}).role || null,
  canManage: (sv) => ['owner', 'admin'].includes(SupabaseStore.role(sv)),
  async addServer(name, icon) { const id = must(await sb.rpc('create_server', { p_name: name, p_icon: icon || '' })); await loadAll(); return id; },
  async addCategory(sv, name) {
    const id = uuid();
    must(await sb.from('categories').insert({ id, server_id: sv, name: String(name).trim().slice(0, 60) || 'New Category', position: SupabaseStore.categories(sv).length }));
    await loadAll(); return id;
  },
  async addChannel(sv, cat, name, kind = 'text') {
    const id = uuid();
    must(await sb.from('channels').insert({ id, server_id: sv, category_id: cat || (SupabaseStore.categories(sv)[0] || {}).id || null,
      name: chanName(name, kind), kind, position: SupabaseStore.channels(sv).length }));
    await loadAll(); return id;
  },
  updateServer(id, patch) {
    const s = SupabaseStore.server(id); if (s) Object.assign(s, patch); emit();
    const row = {}; for (const k of ['name', 'icon', 'img', 'banner', 'description', 'category', 'public']) if (k in patch) row[k] = patch[k];
    for (const [k, col] of [['tag', 'tag'], ['tagBadge', 'tag_badge'], ['tagColor', 'tag_color'], ['features', 'features'], ['guide', 'guide'], ['gameServers', 'game_servers']]) if (k in patch) row[col] = patch[k];
    push(sb.from('servers').update(row).eq('id', id).select('id').then(took('Only this server’s admins can change it.')), loadAll);
  },
  updateChannel(id, patch) {
    const c = SupabaseStore.channel(id); if (c) Object.assign(c, patch); emit();
    const row = {}; if ('name' in patch) row.name = patch.name; if ('kind' in patch) row.kind = patch.kind; if ('category' in patch) row.category_id = patch.category || null;
    if ('topic' in patch) row.topic = String(patch.topic || '').slice(0, 1024);
    push(sb.from('channels').update(row).eq('id', id).select('id').then(took('You don’t have permission to change this channel.')), loadAll);
  },
  updateCategory(id, patch) {
    const c = cache.categories.find((x) => x.id === id); if (c) Object.assign(c, patch);
    if ('position' in patch) cache.categories.sort(byPos);
    emit();
    const row = {}; if ('name' in patch) row.name = String(patch.name).trim().slice(0, 60); if ('position' in patch) row.position = patch.position;
    push(sb.from('categories').update(row).eq('id', id).select('id').then(took('You don’t have permission to change this category.')), loadAll);
  },
  // categories in a new order (Move to…): each one's place in the list
  moveCategories(sv, ids) {
    ids.forEach((id, i) => { const c = cache.categories.find((x) => x.id === id); if (c) c.position = i; });
    cache.categories.sort(byPos); emit();
    push(Promise.all(ids.map((id, i) => sb.from('categories').update({ position: i }).eq('id', id).select('id').then(took('Only this server’s admins can move categories.')))), loadAll);
  },
  // ---- a category's permissions: may you (or someone) do this here? id: a channel or a category ----
  can(id, perm, user = myId()) {
    if (cache.channels.some((c) => c.id === id)) return chanPerm(user, id, perm);
    if (cache.categories.some((c) => c.id === id)) return permFor(user, id, perm);
    return placeKind(id) === 'dm';                      // (a DM or group is yours to use; a channel you can't see isn't)
  },
  // …anywhere in the server (making invites, say, which a category can allow)
  canAnywhere(sv, perm) { return SupabaseStore.canManage(sv) || cache.categories.some((c) => c.server === sv && permFor(myId(), c.id, perm)); },
  categoryPerms: (id) => cache.perms.filter((x) => x.category_id === id).map((x) => ({ target: x.target, allow: [...(x.allow || [])], deny: [...(x.deny || [])] })),
  async setCategoryPerm(id, target, allow, deny) {
    const cat = cache.categories.find((c) => c.id === id); if (!cat) return;
    deny = [...new Set(deny)]; allow = [...new Set(allow)].filter((k) => !deny.includes(k));
    const row = { category_id: id, server_id: cat.server, target, allow, deny };
    const i = cache.perms.findIndex((x) => x.category_id === id && x.target === target), before = i >= 0 ? cache.perms[i] : null;
    if (i >= 0) cache.perms[i] = row; else cache.perms.push(row);
    emit();
    try { must(await sb.from('category_perms').upsert(row)); }
    catch (e) { cache.perms = cache.perms.filter((x) => !(x.category_id === id && x.target === target)); if (before) cache.perms.push(before); emit(); throw e; }
  },
  async removeCategoryPerm(id, target) {
    const before = cache.perms.find((x) => x.category_id === id && x.target === target);
    cache.perms = cache.perms.filter((x) => x !== before); emit();
    try { took('You can only remove what you may do yourself.')(await sb.from('category_perms').delete().eq('category_id', id).eq('target', target).select('target')); }
    catch (e) { if (before) cache.perms.push(before); emit(); throw e; }
  },
  removeChannel(id) {
    cache.channels = cache.channels.filter((c) => c.id !== id); emit();
    push(sb.from('channels').delete().eq('id', id).select('id').then(took('You don’t have permission to delete this channel.')), loadAll);
  },
  removeCategory(id) {
    cache.categories = cache.categories.filter((c) => c.id !== id); cache.channels = cache.channels.filter((c) => c.category !== id); emit();
    push(sb.from('categories').delete().eq('id', id).select('id').then(took('Only this server’s admins can delete categories.')), loadAll);
  },
  removeServer(id) {
    cache.servers = cache.servers.filter((s) => s.id !== id); emit();
    push(sb.from('servers').delete().eq('id', id).select('id').then(took('Only the server’s owner can delete it.')), loadAll);
  },

  // ---- members, roles, invites ----
  members: (sv) => cache.members.filter((m) => m.server_id === sv).map((m) => {
    const rs = rolesOf(sv, m.user_id);
    return { ...toUser(cache.profiles[m.user_id]), id: m.user_id, role: m.role, me: m.user_id === myId(), roles: rs.map((r) => r.id), nick: m.nick || '',
      booster: cache.boosts.some((b) => b.server_id === sv && b.user_id === m.user_id && boostOn(b)),
      roleColor: (rs.find((r) => r.color) || {}).color || '', group: rs.find((r) => r.hoist) ? toRole(rs.find((r) => r.hoist)) : null,
      roleIcon: rs.find((r) => r.icon) ? toRole(rs.find((r) => r.icon)) : null };
  }),
  memberColor: (sv, uid) => (rolesOf(sv, uid).find((r) => r.color) || {}).color || '',
  // (the icon of someone's highest role that has one, shown beside their name)
  memberIcon: (sv, uid) => { const r = rolesOf(sv, uid).find((x) => x.icon); return r ? toRole(r) : null; },

  // ---- roles (a name and a colour that admins hand out) ----
  roles: (sv) => cache.roles.filter((r) => r.server_id === sv).sort(byPos).map(toRole),
  // a new role: there at once (the reload that follows only confirms it)
  async addRole(sv, role = {}) {
    const id = uuid(), row = { id, server_id: sv, name: String(role.name || 'new role').trim().slice(0, 40) || 'new role', color: role.color || '', hoist: role.hoist !== false, position: SupabaseStore.roles(sv).length };
    must(await sb.from('roles').insert(row));
    if (!cache.roles.some((r) => r.id === id)) cache.roles = [...cache.roles, { icon: '', ...row }];
    emit(); loadAll(); return id;
  },
  updateRole(id, patch) {
    const r = cache.roles.find((x) => x.id === id); if (r) Object.assign(r, patch); emit();
    const row = {}; for (const k of ['name', 'color', 'hoist', 'position', ...((cache.version || 0) >= 9 ? ['icon'] : [])]) if (k in patch) row[k] = patch[k];
    push(sb.from('roles').update(row).eq('id', id).select('id').then(took('Only this server’s admins can change roles.')), loadAll);
  },
  removeRole(id) {
    cache.roles = cache.roles.filter((r) => r.id !== id); cache.memberRoles = cache.memberRoles.filter((x) => x.role_id !== id); emit();
    push(sb.from('roles').delete().eq('id', id).select('id').then(took('Only this server’s admins can delete roles.')), loadAll);
  },
  async giveRole(sv, user, roleId, on) {
    if (on) must(await sb.from('member_roles').insert({ server_id: sv, user_id: user, role_id: roleId }));
    else took('Only this server’s admins can take roles away.')(await sb.from('member_roles').delete().eq('user_id', user).eq('role_id', roleId).select('role_id'));
    await loadAll();
  },

  // ---- Discover: public servers anyone signed in can find and join ----
  async discover(query = '', category = '') {
    return must(await sb.rpc('discover', { p_query: String(query).trim(), p_category: category || '' })).map((r) => ({ ...toServer(r), members: Number(r.members) || 0, joined: !!r.joined }));
  },
  async joinPublic(id) { must(await sb.rpc('join_public', { p_server: id })); await loadAll(); return id; },

  // ---- bans ----
  async ban(sv, user, reason = '') { must(await sb.rpc('ban_member', { p_server: sv, p_user: user, p_reason: reason })); await loadAll(); },
  async bans(sv) { return must(await sb.rpc('server_bans', { p_server: sv })).map((b) => ({ id: b.user_id, login: b.handle, name: b.name || b.handle, avatar: b.avatar, reason: b.reason, ts: Date.parse(b.created_at) })); },
  async unban(sv, user) { took('Only this server’s admins can lift bans.')(await sb.from('bans').delete().eq('server_id', sv).eq('user_id', user).select('user_id')); },

  // ---- a new server from a template: its categories and channels in one go ----
  async applyTemplate(sv, tpl) {
    const cats = SupabaseStore.categories(sv), chans = SupabaseStore.channels(sv), catRows = [], chanRows = [];
    for (const [i, c] of tpl.entries()) {
      const have = cats.find((x) => x.name.toLowerCase() === c.name.toLowerCase()), id = have ? have.id : uuid();
      if (have) { if (have.position !== i) must(await sb.from('categories').update({ position: i }).eq('id', id)); }
      else catRows.push({ id, server_id: sv, name: c.name, position: i });
      c.channels.forEach(([name, kind], j) => {
        if (!chans.some((x) => x.name === name && x.category === id)) chanRows.push({ id: uuid(), server_id: sv, category_id: id, name, kind: kind || 'text', position: j + 1 });
      });
    }
    if (catRows.length) must(await sb.from('categories').insert(catRows));
    if (chanRows.length) must(await sb.from('channels').insert(chanRows));
    await loadAll();
  },
  async createInvite(sv, maxUses = null, hours = 168) { return must(await sb.rpc('create_invite', { p_server: sv, p_max_uses: maxUses, p_hours: hours })); },
  async joinServer(code) { const id = must(await sb.rpc('join_server', { p_code: String(code).trim() })); await loadAll(); return id; },
  // an invite link's server, for its card in a message
  async inviteInfo(code) {
    const r = must(await sb.rpc('invite_info', { p_code: String(code || '').trim() }));
    const row = Array.isArray(r) ? r[0] : r;
    return row ? { ...toServer({ ...row, id: row.server_id }), members: row.members || 0, online: row.online || 0, joined: !!row.joined, usable: !!row.usable } : null;
  },
  async setMemberRole(sv, user, role) { must(await sb.rpc('set_member_role', { p_server: sv, p_user: user, p_role: role })); await loadAll(); },
  async removeMember(sv, user) {
    took(user === myId() ? 'The owner can’t leave their own server.' : 'Only admins can remove people, and never the owner.')(
      await sb.from('server_members').delete().eq('server_id', sv).eq('user_id', user).select('user_id'));
    await loadAll();
  },
  leaveServer(sv) { return SupabaseStore.removeMember(sv, myId()); },

  // ---- messages ----
  messages: (id) => (cache.msgs[id] || []).map(toMessage),
  send: (id, msg) => sendTo(false, id, msg),
  clear(id) {
    cache.msgs[id] = []; emit();
    push(sb.from('messages').delete().eq('channel_id', id).then(must).then(() => active && active.id === id && loadMessages(active)).then(emit));
  },

  deleteMessage(where, id) {
    const bucket = where.dm ? cache.dms : cache.msgs, before = bucket[where.id] || [], row = before.find((m) => m.id === id);
    bucket[where.id] = before.filter((m) => m.id !== id); emit();
    push(sb.from(where.dm ? 'dm_messages' : 'messages').delete().eq('id', id).select('id').then(took('You can only delete your own messages here.'))
      .then(() => {          // (its attachments too, if they're yours)
        const mine = ((row && row.files) || []).map((f) => f.path).filter((p) => p && p.split('/')[2] === myId());
        if (mine.length) sb.storage.from('files').remove(mine).then(() => {}, () => {});
      }),
      () => { bucket[where.id] = before; });
  },

  // ---- attachments and voice messages (Supabase Storage) ----
  // a file for a channel or DM: uploaded into that place's folder, and described for the message
  async uploadFile(where, file, onProgress, extra = {}) {
    const ext = ((String(file.name || '').match(/\.([a-z0-9]{1,8})$/i) || [])[1] || (String(file.type).split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin').toLowerCase();
    const path = `${where.dm ? 'dm' : 'ch'}/${where.id}/${myId()}/${uuid()}.${ext}`;
    try { await upload(path, file, onProgress); }
    catch (e) { throw new Error(/bucket not found|not found/i.test(why(e)) ? NEW_SETUP : why(e)); }
    return { path, name: String(file.name || 'file').slice(0, 120), size: file.size || 0, type: String(file.type || '').slice(0, 80), ...extra };
  },
  fileUrl: (path) => fileLink(path),
  downloadUrl: (path, name) => fileLink(path, name || true),

  // ---- direct messages and group DMs ----
  dmList: () => cache.dmIndex.map((d) => (isGroup(d) ? SupabaseStore.dmInfo(d.id) : { id: d.id, kind: 'dm', user: userOf(otherIn(d)) }))
    .map((d) => ({ ...d, last: (cache.unread[d.id] || {}).last || 0 })),
  dm: (id) => [...(cache.dms[id] || []).map(toMessage), ...(cache.calls[id] || []).map((c) => ({ id: 'call-' + c.id, ts: Date.parse(c.created_at), call: toCall(c), user: userOf(c.started_by) }))]
    .sort((a, b) => a.ts - b.ts),
  dmUser(id) { const d = cache.dmIndex.find((x) => x.id === id); return d && !isGroup(d) ? userOf(otherIn(d)) : null; },
  // a DM or group's details: who's in it (you included), and a group's name, picture and owner
  dmInfo(id) {
    const d = cache.dmIndex.find((x) => x.id === id); if (!d) return null;
    if (!isGroup(d)) return { id, kind: 'dm', user: userOf(otherIn(d)), people: [userOf(otherIn(d)), userOf(myId())] };
    const people = groupPeople(id).map(userOf);
    return { id, kind: 'group', name: d.name || '', icon: d.icon || '', owner: d.owner, people, since: Date.parse(d.created_at) || 0 };
  },
  async ensureDM(user) {
    if (!isUuid(user.id)) throw new Error(`${user.name || 'That'} can’t be messaged here.`);
    const id = must(await sb.rpc('open_dm', { p_other: user.id }));
    if (!cache.dmIndex.some((d) => d.id === id)) await loadAll();
    return id;
  },
  sendDM: (id, msg) => sendTo(true, id, msg),
  async createGroup(ids, name = '') {
    const id = await soft(sb.rpc('create_group', { p_users: ids, p_name: name }).then(must), null);
    if (!id) throw new Error(NEW_SETUP);
    await loadAll(); return id;
  },
  async addToGroup(id, ids) { must(await sb.rpc('add_to_group', { p_dm: id, p_users: ids })); await loadAll(); },
  async leaveGroup(id) { took('You’re not in that group.')(await sb.from('dm_members').delete().eq('dm_id', id).eq('user_id', myId()).select('user_id')); await loadAll(); },
  async removeFromGroup(id, user) { took('Only the group’s owner can remove people.')(await sb.from('dm_members').delete().eq('dm_id', id).eq('user_id', user).select('user_id')); await loadAll(); },
  updateGroup(id, patch) {
    const d = cache.dmIndex.find((x) => x.id === id); if (d) Object.assign(d, patch); emit();
    const row = {}; for (const k of ['name', 'icon']) if (k in patch) row[k] = patch[k];
    push(sb.from('dms').update(row).eq('id', id).select('id').then(took('Only the people in a group can change it.')), loadAll);
  },

  // ---- calls in DMs and groups (who started one and when it ended; the call itself is in calls.js) ----
  async startCall(dm, video) { return must(await sb.from('calls').insert({ id: uuid(), dm_id: dm, started_by: myId(), video: !!video }).select('*'))[0].id; },
  endCall(id) { sb.from('calls').update({ ended_at: new Date().toISOString() }).eq('id', id).then(() => {}, () => {}); },
  calls: (dm) => (cache.calls[dm] || []).map(toCall),
  call: (id) => { for (const list of Object.values(cache.calls)) { const c = list.find((x) => x.id === id); if (c) return toCall(c); } return null; },
  onCall(cb) { callListeners.add(cb); return () => callListeners.delete(cb); },
  onTrade(cb) { tradeListeners.add(cb); return () => tradeListeners.delete(cb); },
  // ---- Datbux: your wallet, the Shop's prices and what you have, tasks, sending, trades (the database does all of it) ----
  canBux: () => (cache.version || 0) >= 9,
  wallet: () => { const w = cache.wallet; return w ? { balance: +w.balance || 0, earned: +w.earned || 0, spent: +w.spent || 0, sent: +w.sent || 0, received: +w.received || 0 } : null; },
  priceOf: (kind, item) => (kind + ':' + item in cache.shop ? cache.shop[kind + ':' + item] : null),
  // the Shop's bundles (what their things cost, less on their holiday and sale days: the holidays on today, as the
  // database counts them), and buying one: your balance after
  canBundles: () => (cache.version || 0) >= 13,
  bundles: () => cache.bundles.slice(),
  sales: () => cache.sales.slice(),
  async buyBundle(id) {
    const bal = Number(must(await sb.rpc('buy_bundle', { p_bundle: id })));
    // (it's yours at once: what the bundle holds, and what's left; the rest comes with a reload)
    const b = cache.bundles.find((x) => x.id === id);
    if (b) for (const x of b.items) if (!cache.owned.some((o) => o.kind === x.k && o.item === x.i)) cache.owned.push({ kind: x.k, item: x.i, how: 'buy', got_at: new Date().toISOString() });
    if (cache.wallet) cache.wallet = { ...cache.wallet, balance: bal };
    emit(); loadAll();
    return bal;
  },
  owns: (kind, item) => cache.owned.some((o) => o.kind === kind && o.item === item),
  ownedList: () => cache.owned.map((o) => ({ kind: o.kind, item: o.item, how: o.how, at: Date.parse(o.got_at || '') || 0 })),
  async ownedBy(uid) { return (must(await sb.from('owned_items').select('kind,item,how,got_at').eq('user_id', uid)) || []).map((o) => ({ kind: o.kind, item: o.item, how: o.how, at: Date.parse(o.got_at || '') || 0 })); },
  canBadgeLog: () => (cache.version || 0) >= 14,                // (when each badge came, kept on the profile)
  async taskProgress() { return (must(await sb.rpc('task_progress')) || []).map((t) => ({ ...t, resets: Date.parse(t.resets) || 0 })); },
  async claimTask(task) { const b = must(await sb.rpc('claim_task', { p_task: task })); await loadAll(); return Number(b); },
  async buyItem(kind, item) { const b = must(await sb.rpc('buy_item', { p_kind: kind, p_item: item })); await loadAll(); return Number(b); },
  async sendBux(to, amount, note = '') { must(await sb.rpc('send_datbux', { p_to: to, p_amount: amount, p_note: note })); await loadAll(); },
  async offerTrade(to, give, want, note = '') {
    const id = must(await sb.rpc('offer_trade', { p_to: to, p_give_bux: give.bux || 0, p_give_items: give.items || [], p_want_bux: want.bux || 0, p_want_items: want.items || [], p_note: note }));
    await loadAll(); return id;
  },
  async answerTrade(id, accept) { const r = must(await sb.rpc('answer_trade', { p_trade: id, p_accept: !!accept })); await loadAll(); return r; },
  async cancelTrade(id) { must(await sb.rpc('cancel_trade', { p_trade: id })); await loadAll(); },
  trades: () => cache.trades.map(toTrade),
  async buxLog() { return must(await sb.from('datbux_log').select('*').order('id', { ascending: false }).limit(60)) || []; },
  // ---- your settings (Customize), kept with your account: { data, at } (at: when they last changed), or null ----
  canSync: () => (cache.version || 0) >= 10,
  settings: () => cache.settings,
  async saveSettings(data) {
    const r = must(await sb.from('user_settings').upsert({ user_id: myId(), data }).select('updated_at'));
    cache.settings = { data, at: Date.parse(r[0].updated_at) || Date.now() };
    return cache.settings.at;
  },
  // a call's private live channel ("call:<id>" or "vc:<voice channel id>"), which only its people may join
  callChannel: (topic, key) => sb.channel(topic, { config: { private: true, presence: { key }, broadcast: { self: false, ack: false } } }),
  dropChannel: (ch) => { try { sb.removeChannel(ch); } catch {} },
  iceServers: () => ICE_SERVERS,
  // voice channels: who's in which (from everyone's presence), and saying where you are
  voice: (sv) => voiceNow[sv] || {},
  voiceAll: () => voiceNow,
  setVoice(v) {
    const before = myVoice && myVoice.sv;
    myVoice = v && v.sv ? { mic: true, deaf: false, cam: false, screen: false, ...v } : null;
    for (const sv of new Set([before, myVoice && myVoice.sv].filter(Boolean))) { const ch = rooms.get(sv); if (ch) announce(ch, sv); }
  },
  myId,

  // ---- unread, pings, muting ----
  unread: (place) => cache.unread[place] || { unread: 0, mentions: 0, last: 0 },
  // when you'd read a place up to (for the red NEW line)
  readAt: (place) => Date.parse((cache.reads[place] || {}).read_at || '') || 0,
  markRead, markUnread,
  async markServerRead(sv) { await markAllRead(cache.channels.filter((c) => c.server === sv).map((c) => c.id)); emit(); },
  // a place's settings: muted until when, and what it may tell you about ('default', 'all', 'mentions' or 'none')
  placeSettings: (place) => { const r = cache.reads[place]; return { muted: !!(r && r.muted_until && Date.parse(r.muted_until) > Date.now()), mutedUntil: r && r.muted_until ? Date.parse(r.muted_until) : 0, notify: (r && r.notify) || 'default' }; },
  setPlaceSettings(place, patch) {
    const row = { user_id: myId(), place };
    if ('mutedUntil' in patch) row.muted_until = patch.mutedUntil == null ? null : patch.mutedUntil === Infinity ? 'infinity' : new Date(patch.mutedUntil).toISOString();
    if ('notify' in patch) row.notify = patch.notify;
    cache.reads[place] = { ...(cache.reads[place] || { place, read_at: new Date(0).toISOString() }), ...row };
    emit();
    push(sb.from('reads').upsert(row).then(must));
  },
  placeKind,

  // ---- friends: a request until they add you back ----
  friends() {
    // (an older database only shows you your own list: there, everyone you added is a friend, as it used to be)
    if (state.needsSetup) return cache.friendRows.filter((f) => f.owner === myId()).map((f) => userOf(f.friend));
    const out = new Set(cache.friendRows.filter((f) => f.owner === myId()).map((f) => f.friend));
    return cache.friendRows.filter((f) => f.friend === myId() && out.has(f.owner)).map((f) => userOf(f.owner));
  },
  friendRequests() {
    const out = new Set(cache.friendRows.filter((f) => f.owner === myId()).map((f) => f.friend));
    const inc = new Set(cache.friendRows.filter((f) => f.friend === myId()).map((f) => f.owner));
    return { incoming: [...inc].filter((id) => !out.has(id)).map(userOf), outgoing: [...out].filter((id) => !inc.has(id)).map(userOf) };
  },
  friendState(id) {
    if (state.needsSetup) return cache.friendRows.some((f) => f.owner === myId() && f.friend === id) ? 'friend' : 'none';
    const out = cache.friendRows.some((f) => f.owner === myId() && f.friend === id), inc = cache.friendRows.some((f) => f.owner === id && f.friend === myId());
    return out && inc ? 'friend' : out ? 'outgoing' : inc ? 'incoming' : 'none';
  },
  // add by exact @handle: sends a request, or accepts theirs if they already asked
  async addFriendByHandle(handle) {
    const found = must(await sb.rpc('find_user', { p_handle: handle }));
    const u = found && found[0];
    if (!u) throw new Error(`Hm, didn’t work. Double check that the @handle is correct: nobody is called @${String(handle).replace(/^@/, '')}.`);
    if (u.id === myId()) throw new Error('That’s you!');
    const before = SupabaseStore.friendState(u.id);
    if (before === 'friend') throw new Error(`You’re already friends with ${u.name || u.handle}.`);
    if (before === 'outgoing') throw new Error(`You already sent ${u.name || u.handle} a friend request.`);
    must(await sb.from('friends').insert({ owner: myId(), friend: u.id }));
    await loadAll();
    return { ...toUser(u), id: u.id, state: before === 'incoming' ? 'accepted' : 'sent' };
  },
  async addFriend(user) { if (isUuid(user.id)) { must(await sb.from('friends').insert({ owner: myId(), friend: user.id })); await loadAll(); } },
  async acceptFriend(id) { must(await sb.from('friends').insert({ owner: myId(), friend: id })); await loadAll(); },
  async ignoreFriend(id) { cache.friendRows = cache.friendRows.filter((f) => !(f.owner === id && f.friend === myId())); emit(); must(await sb.from('friends').delete().eq('owner', id).eq('friend', myId())); await loadAll(); },
  async cancelFriend(id) { cache.friendRows = cache.friendRows.filter((f) => !(f.owner === myId() && f.friend === id)); emit(); must(await sb.from('friends').delete().eq('owner', myId()).eq('friend', id)); await loadAll(); },
  removeFriend(id) {
    cache.friendRows = cache.friendRows.filter((f) => !((f.owner === myId() && f.friend === id) || (f.owner === id && f.friend === myId()))); emit();
    push(Promise.all([sb.from('friends').delete().eq('owner', myId()).eq('friend', id).then(must), sb.from('friends').delete().eq('owner', id).eq('friend', myId()).then(must)]), loadAll);
  },
  refreshFriends: () => push(sb.from('friends').select('*').then(must).then((rows) => { cache.friendRows = rows; emit(); })),

  // ---- you ----
  profile: (id) => cache.profiles[id] || null,
  person: (id) => (cache.profiles[id] ? userOf(id) : null),
  myProfile: () => (cache.me ? { ...toUser(cache.me), banner: cache.me.banner || '', stickers: cache.me.stickers || [] } : {}),
  // the whole profile (with the banner, which isn't loaded for everyone up front)
  async profileFull(id) {
    if (id === myId()) return cache.me ? { ...toUser(cache.me), banner: cache.me.banner || '' } : null;
    if (!cache.full[id]) {
      const rows = must(await sb.from('profiles').select(PROFILE_SETS[profileSet] + ',banner,stickers').eq('id', id)); if (!rows[0]) return null;
      const m = cache.profiles[id] || (await moreOf(cache.version || 0, [id]).catch(() => []))[0] || {};
      cache.full[id] = { created_at: m.created_at || null, playing: m.playing || null, hides: m.hides || [], ...rows[0] };
    }
    return { ...toUser(cache.full[id]), banner: cache.full[id].banner || '' };
  },
  mutualServers: (uid) => cache.servers.filter((sv) => cache.members.some((m) => m.server_id === sv.id && m.user_id === uid)).length,
  mutualServerList: (uid) => cache.servers.filter((sv) => cache.members.some((m) => m.server_id === sv.id && m.user_id === uid)),
  // friends you both have (the database works it out: you can't see their friends otherwise)
  async mutualFriends(uid) {
    if (!isUuid(uid) || uid === myId()) return [];
    return (await soft(sb.rpc('mutual_friends', { p_other: uid }).then(must), [])).map((p) => ({ ...toUser(p), id: p.id }));
  },
  // when you became friends (when the second of you added the other)
  friendSince(uid) {
    const rows = cache.friendRows.filter((f) => (f.owner === myId() && f.friend === uid) || (f.owner === uid && f.friend === myId()));
    return rows.length === 2 ? Math.max(...rows.map((f) => Date.parse(f.created_at) || 0)) : 0;
  },

  // ---- reactions: under each message, which emoji, how many, whether one is yours, and who (in the order they came) ----
  reactions(place) {
    const out = new Map(), me = myId();
    for (const r of (cache.reacts[place] || []).filter((x) => x.active).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
      let list = out.get(r.message_id); if (!list) out.set(r.message_id, (list = []));
      let e = list.find((x) => x.emoji === r.emoji); if (!e) list.push((e = { emoji: r.emoji, count: 0, me: false, users: [] }));
      e.count++; e.users.push(r.user_id); if (r.user_id === me) e.me = true;
    }
    return out;
  },
  async react(place, messageId, emoji, on) {
    const list = (cache.reacts[place] = cache.reacts[place] || []), me = myId();
    const i = list.findIndex((r) => r.message_id === messageId && r.user_id === me && r.emoji === emoji), before = i >= 0 ? { ...list[i] } : null;
    if (i >= 0) list[i] = { ...list[i], active: on };
    else list.push({ message_id: messageId, place, user_id: me, emoji, active: on, created_at: new Date().toISOString() });
    emit();                                 // (it shows at once; the database has the last word)
    try {
      if (on) must(await sb.from('reactions').upsert({ message_id: messageId, place, user_id: me, emoji, active: true }));
      else must(await sb.from('reactions').update({ active: false }).eq('message_id', messageId).eq('user_id', me).eq('emoji', emoji));
    } catch (e) {
      const j = list.findIndex((r) => r.message_id === messageId && r.user_id === me && r.emoji === emoji);
      if (j >= 0) { if (before) list[j] = before; else list.splice(j, 1); }
      emit(); throw e;
    }
  },
  // ---- threads: channels of their own under a text channel ----
  threads: (ch) => cache.channels.filter((c) => c.parent === ch),
  threadInfo: (id) => cache.threadInfo[id] || null,
  async threadsInfo(ch) {
    const rows = await soft(sb.rpc('threads_info', { p_channel: ch }).then(must), []);
    for (const r of rows || []) cache.threadInfo[r.id] = { count: Number(r.messages) || 0, last: r.last_at ? Date.parse(r.last_at) : 0 };
    emit();
  },
  async createThread(ch, message, name) { const id = must(await sb.rpc('create_thread', { p_parent: ch, p_message: message || null, p_name: name })); await loadAll(); return id; },
  async editThread(id, patch) {
    const c = cache.channels.find((x) => x.id === id), had = c && { name: c.name, archived: c.archived }; if (c) Object.assign(c, patch); emit();
    try { must(await sb.rpc('edit_thread', { p_thread: id, p_name: patch.name || '', p_archived: 'archived' in patch ? !!patch.archived : null })); }
    catch (e) { if (c) Object.assign(c, had); emit(); throw e; }
    await loadAll();
  },
  // ---- pins: a conversation's pinned messages ----
  pins: (place) => (cache.pins[place] || []).slice().sort((a, b) => Date.parse(b.pinned_at) - Date.parse(a.pinned_at)),
  pinned: (place, id) => (cache.pins[place] || []).some((x) => x.message_id === id),
  canPin(place) {
    const c = cache.channels.find((x) => x.id === place);
    return c ? SupabaseStore.canManage(c.server) || SupabaseStore.can(place, 'manage_messages') : cache.dmIndex.some((d) => d.id === place);
  },
  async pin(place, id, on) {
    const list = (cache.pins[place] = cache.pins[place] || []), had = list.slice();
    cache.pins[place] = list.filter((x) => x.message_id !== id).concat(on ? [{ place, message_id: id, pinned_by: myId(), pinned_at: new Date().toISOString() }] : []); emit();
    try {
      if (on) must(await sb.from('pins').insert({ place, message_id: id, pinned_by: myId() }));
      else took('You don’t have permission to unpin that.')(await sb.from('pins').delete().eq('place', place).eq('message_id', id).select('message_id'));
    } catch (e) { cache.pins[place] = had; emit(); throw e; }
  },
  // the pinned messages themselves (fetching any that aren't loaded)
  async pinnedMessages(place) {
    const dm = !cache.channels.some((c) => c.id === place), have = (dm ? cache.dms : cache.msgs)[place] || [];
    const out = [];
    for (const p of SupabaseStore.pins(place)) {
      let row = have.find((m) => m.id === p.message_id);
      if (!row) row = (await soft(sb.from(dm ? 'dm_messages' : 'messages').select('*').eq('id', p.message_id).then(must), []))[0];
      if (row) { if (!row.bot) meet(row.author); out.push({ ...toMessage(row), pinnedAt: Date.parse(p.pinned_at) || 0 }); }
    }
    return out;
  },
  // ---- boosts (25 Datbux a day, paid ahead; free on an older setup.sql): who boosts a server, its level, and yours ----
  canPaidBoosts: () => (cache.version || 0) >= 11,
  canPlates: () => (cache.version || 0) >= 11,                 // (nameplates from the Shop, and everything in it for Datbux)
  boosts: (sv) => cache.boosts.filter((b) => b.server_id === sv && boostOn(b)).map((b) => b.user_id),
  boostLevel(sv) { const n = SupabaseStore.boosts(sv).length; return n >= 14 ? 3 : n >= 7 ? 2 : n >= 2 ? 1 : 0; },
  // yours: { since, paidUntil, auto, on } (on: paid for now), or null
  myBoost(sv) {
    const b = cache.boosts.find((x) => x.server_id === sv && x.user_id === myId());
    return b ? { since: Date.parse(b.created_at) || 0, paidUntil: b.paid_until ? Date.parse(b.paid_until) : 0, auto: b.auto !== false, on: boostOn(b) } : null;
  },
  async boostFor(sv, days = 1) {
    if (SupabaseStore.canPaidBoosts()) must(await sb.rpc('boost_server', { p_server: sv, p_days: days }));
    else must(await sb.from('server_boosts').insert({ server_id: sv, user_id: myId() }));
    await loadAll();
  },
  async stopBoost(sv) { must(await sb.from('server_boosts').delete().eq('server_id', sv).eq('user_id', myId())); await loadAll(); },
  async setBoostAuto(sv, auto) { must(await sb.rpc('set_boost_auto', { p_server: sv, p_auto: !!auto })); await loadAll(); },
  // another day for your boosts that have less than a day left (while your Datbux last): how many
  async renewBoosts() {
    if (!SupabaseStore.canPaidBoosts() || !cache.boosts.some((b) => b.user_id === myId() && boostOn(b) && b.auto !== false && Date.parse(b.paid_until) - Date.now() < 864e5)) return 0;
    const n = Number(must(await sb.rpc('renew_boosts'))) || 0;
    if (n) await loadAll();
    return n;
  },
  async boost(sv, on) { return on ? SupabaseStore.boostFor(sv, 1) : SupabaseStore.stopBoost(sv); },
  // a Quest's reward, once you've finished the Quest: what it was
  async claimQuestReward(quest) { if (!SupabaseStore.canPaidBoosts()) return null; const r = must(await sb.rpc('claim_quest_reward', { p_quest: quest })); await loadAll(); return r; },
  // ---- your name in a server, and whether its people can start DMs with you ----
  nickIn: (sv, uid) => (cache.members.find((m) => m.server_id === sv && m.user_id === uid) || {}).nick || '',
  async setNick(sv, uid, nick) { must(await sb.rpc('set_nick', { p_server: sv, p_user: uid, p_nick: String(nick || '') })); await loadAll(); },
  serverDMs: (sv) => (cache.members.find((m) => m.server_id === sv && m.user_id === myId()) || {}).allow_dms !== false,
  async setServerDMs(sv, on) { must(await sb.rpc('set_server_privacy', { p_server: sv, p_allow_dms: !!on })); await loadAll(); },
  // ---- search (Search "<server>"): words, from someone, with something, in a channel; newest first ----
  async searchServer(sv, o = {}) {
    const rows = must(await sb.rpc('search_messages', { p_server: sv, p_query: o.q || '', p_from: o.from || null, p_has: o.has || '', p_in: o.in || null,
      p_before: o.before ? new Date(o.before).toISOString() : null, p_limit: 25 })) || [];
    for (const r of rows) if (!r.bot) meet(r.author);
    return rows.map((r) => ({ ...toMessage(r), place: r.channel_id }));
  },
  async searchDM(dm, o = {}) {
    const rows = must(await sb.rpc('search_dm', { p_dm: dm, p_query: o.q || '', p_from: o.from || null, p_has: o.has || '', p_before: o.before ? new Date(o.before).toISOString() : null, p_limit: 25 })) || [];
    return rows.map((r) => ({ ...toMessage(r), place: r.dm_id }));
  },
  // every DM and group chat at once (Direct Messages → Browse): each one's newest 25, put together, the newest 25 of those
  async searchAllDMs(o = {}) {
    const ids = SupabaseStore.dmList().map((d) => d.id), out = []; let failed = null;
    for (let i = 0; i < ids.length; i += 4) {
      const got = await Promise.all(ids.slice(i, i + 4).map((id) => SupabaseStore.searchDM(id, o).catch((e) => { failed = failed || e; return []; })));
      out.push(...got.flat());
    }
    if (!out.length && failed) throw failed;
    return out.sort((a, b) => b.ts - a.ts).slice(0, 25);
  },
  // ---- a server's events (Discord's): upcoming and happening ones, soonest first, with who's interested ----
  events(sv) {
    const now = Date.now(), me = myId();
    return cache.events.filter((e) => e.server_id === sv && (Date.parse(e.ends_at || '') || Date.parse(e.starts_at) + 3 * 3600e3) > now)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .map((e) => { const who = cache.interest.filter((i) => i.event_id === e.id).map((i) => i.user_id);
        return { id: e.id, server: e.server_id, title: e.title, description: e.description || '', start: Date.parse(e.starts_at), end: e.ends_at ? Date.parse(e.ends_at) : 0,
          channel: e.channel_id || null, place: e.place || '', by: e.created_by, mine: e.created_by === me, interested: who.length, me: who.includes(me), who }; });
  },
  canMakeEvents: (sv) => SupabaseStore.canManage(sv) || !!((SupabaseStore.server(sv) || {}).features || {}).member_events,
  async addEvent(sv, ev) {
    const row = { id: uuid(), server_id: sv, title: ev.title, description: ev.description || '', starts_at: new Date(ev.start).toISOString(), ends_at: ev.end ? new Date(ev.end).toISOString() : null,
      channel_id: ev.channel || null, place: ev.channel ? '' : ev.place || '', created_by: myId() };
    must(await sb.from('server_events').insert(row));
    cache.events.push({ ...row, created_at: new Date().toISOString() }); emit(); return row.id;
  },
  async updateEvent(id, ev) {
    const row = { title: ev.title, description: ev.description || '', starts_at: new Date(ev.start).toISOString(), ends_at: ev.end ? new Date(ev.end).toISOString() : null, channel_id: ev.channel || null, place: ev.channel ? '' : ev.place || '' };
    took('Only whoever made the event, or an admin, can change it.')(await sb.from('server_events').update(row).eq('id', id).select('id'));
    const e = cache.events.find((x) => x.id === id); if (e) Object.assign(e, row); emit();
  },
  async removeEvent(id) {
    took('Only whoever made the event, or an admin, can cancel it.')(await sb.from('server_events').delete().eq('id', id).select('id'));
    cache.events = cache.events.filter((x) => x.id !== id); cache.interest = cache.interest.filter((i) => i.event_id !== id); emit();
  },
  async setInterested(id, on) {
    const me = myId(), had = cache.interest.filter((i) => i.event_id === id && i.user_id === me);
    interestOps.set(id, { on, at: Date.now() });
    cache.interest = cache.interest.filter((i) => !(i.event_id === id && i.user_id === me));
    if (on) cache.interest.push({ event_id: id, user_id: me, created_at: new Date().toISOString() });
    emit();
    try { if (on) must(await sb.from('event_interest').upsert({ event_id: id, user_id: me })); else must(await sb.from('event_interest').delete().eq('event_id', id).eq('user_id', me)); }
    catch (e) { interestOps.delete(id); cache.interest = cache.interest.filter((i) => !(i.event_id === id && i.user_id === me)).concat(had); emit(); throw e; }
  },
  // ---- a profile's extras, fetched when someone opens it: Connections, the Board's widgets, the games played lately ----
  async profileExtras(id) {
    if (!isUuid(id)) return toExtras(null);
    if (id !== myId() && (cache.version || 0) >= 16) return (cache.extras[id] = toExtras(await soft(sb.rpc('profile_extras_of', { p_user: id }).then(must), null)));
    const rows = await soft(sb.from('profile_extras').select('*').eq('id', id).then(must), []);
    return (cache.extras[id] = toExtras(rows[0]));
  },
  extrasNow: (id) => cache.extras[id] || null,          // (what was fetched last, to show at once while it's fetched again)
  async setProfileExtras(patch) {
    const id = myId(), was = cache.extras[id], row = { id };
    for (const k of ['connections', 'widgets', 'activity', 'quests', ...(profileSet === 0 ? ['badges'] : [])]) if (k in patch) row[k] = patch[k];
    if ('badgeLog' in patch && SupabaseStore.canBadgeLog()) row.badge_log = patch.badgeLog;
    // (an older database doesn't know games' pictures from Wikipedia yet: they're found again by name meanwhile)
    if (row.widgets && !SupabaseStore.canWikiGames()) row.widgets = row.widgets.map((w) => (w && Array.isArray(w.g) ? { ...w, g: w.g.map(({ w: _, ...g }) => g) } : w));
    cache.extras[id] = { ...toExtras(was), ...patch }; emit();
    try { const r = must(await sb.from('profile_extras').upsert(row).select('*')); cache.extras[id] = toExtras(r[0]); emit(); return cache.extras[id]; }
    catch (e) { cache.extras[id] = was; emit(); throw e; }
  },
  // the game you say you're playing ({ n, s, l }), or null; the database times it and adds it to your recent activity
  setPlaying(game) {
    if (!cache.me || profileSet > 2) return;
    const g = game ? Object.fromEntries(['n', ...(SupabaseStore.canWikiGames() ? ['w'] : []), 's', 'l'].filter((k) => game[k]).map((k) => [k, game[k]])) : null;
    cache.me.playing = g ? { ...g, at: new Date().toISOString() } : null; emit();
    push(sb.from('profiles').update({ playing: g }).eq('id', myId()).then(must), loadAll);
  },
  canPlay: () => profileSet <= 2,
  canDecorate: () => profileSet <= 1,
  canFrame: () => profileSet === 0,             // (frames, status bubbles and badges: the newest setup.sql)
  canWikiGames: () => (cache.version || 0) >= 8,   // (games' pictures from Wikipedia)
  canPrivacy: () => (cache.version || 0) >= 16,     // (who sees what of your profile)
  // what someone's badges are made of: the database counts (for people you know), kept for a minute
  async badgeStats(uid) {
    const id = uid || myId(), had = statsKept.get(id);
    if (!id || profileSet !== 0) return null;
    if (had && Date.now() - had.at < 60000) return had.v;
    let v = null;
    try { v = await soft(sb.rpc('badge_stats', { p_user: id }).then(must), null); } catch { v = null; }
    statsKept.set(id, { at: Date.now(), v }); return v;
  },
  badgeStatsNow: (uid) => (statsKept.get(uid || myId()) || {}).v || null,
  // the accounts you sign in with (Discord, GitHub…): what a connection can be checked against
  identities: () => ((session && session.user && session.user.identities) || []).map((i) => {
    const d = i.identity_data || {};
    return { provider: i.provider, name: i.provider === 'discord' ? d.full_name || String(d.name || '').split('#')[0] : d.user_name || d.preferred_username || d.nickname || d.name || '' };
  }),
  // link another sign-in to your account (off unless the project allows it): the page goes there and comes back
  async linkAccount(provider) {
    const r = await sb.auth.linkIdentity({ provider, options: { redirectTo: location.origin + location.pathname } });
    if (r.error) throw new Error(linkTrouble(r.error.message || String(r.error)));
  },
  // ---- server tags: a server's admins give it one; its members may wear it (only one at a time) ----
  styled: () => styled,
  async adoptTag(serverId) { must(await sb.rpc('adopt_tag', { p_server: serverId || null })); await loadAll(); },
  async tagInfo(serverId) {
    const r = must(await sb.rpc('tag_info', { p_server: serverId }));
    const row = Array.isArray(r) ? r[0] : r;
    return row ? { ...toServer(row), members: Number(row.members) || 0, joined: !!row.joined } : null;
  },

  // ---- blocking: they can't message you or ask to be your friend, and you don't see their messages ----
  blocked: (uid) => cache.blocks.some((b) => b.blocked === uid),
  blockedIds: () => cache.blocks.map((b) => b.blocked),
  async block(uid) { must(await sb.rpc('block_user', { p_user: uid })); await loadAll(); },
  async unblock(uid) { must(await sb.rpc('unblock_user', { p_user: uid })); await loadAll(); },
  // ---- reports, to the people who run Fluentdat ----
  async report({ target = null, place = null, message = null, excerpt = '', reason }) {
    must(await sb.from('reports').insert({ reporter: myId(), target: isUuid(target) ? target : null, place: isUuid(place) ? place : null,
      message: isUuid(message) ? message : null, excerpt: String(excerpt || '').slice(0, 600), reason: String(reason || '').slice(0, 500) }));
  },
  // ---- linked channels: what's said in one shows in the others ("#channel / name / time / message") ----
  canLinks: () => (cache.version || 0) >= 18,
  linkedWith: (channel) => (channel in cache.links ? cache.links[channel] : -1),     // (how many others; -1: not linked)
  async linkInfo(channel) {
    return (must(await sb.rpc('link_info', { p_channel: channel })) || []).map((r) => ({ link: r.link_id, code: r.code || '', channel: r.channel_id, name: r.channel,
      server: r.server_id, serverName: r.server, here: !!r.here, removable: !!r.removable, at: Date.parse(r.added_at) || 0 }));
  },
  async linkChannel(channel) { const code = must(await sb.rpc('link_channel', { p_channel: channel })); await loadAll(); return code; },
  async joinLink(code, channel) { must(await sb.rpc('join_link', { p_code: code, p_channel: channel })); await loadAll(); },
  async unlinkChannel(channel) { must(await sb.rpc('unlink_channel', { p_channel: channel })); await loadAll(); },
  async newLinkCode(channel) { return must(await sb.rpc('new_link_code', { p_channel: channel })); },
  // ---- Discord channels linked with a channel here, by a webhook made in each (the database reads and writes them) ----
  canDiscord: () => (cache.version || 0) >= 19,
  async discordReady() { const r = must(await sb.rpc('discord_ready')) || {}; return { ready: !!r.ready, bot: r.bot || '' }; },
  async discordInfo(channel) {
    return (must(await sb.rpc('discord_info', { p_channel: channel })) || []).map((r) => ({ link: r.link_id, name: r.name || '', guild: r.guild || '', status: r.status,
      error: r.error || '', at: Date.parse(r.added_at) || 0 }));
  },
  async linkDiscord(channel, webhook) { must(await sb.rpc('link_discord', { p_channel: channel, p_webhook: webhook })); await loadAll(); },
  async unlinkDiscord(link) { must(await sb.rpc('unlink_discord', { p_link: link })); await loadAll(); },
  async retryDiscord(link) { must(await sb.rpc('retry_discord', { p_link: link })); },
  // ---- for the people who run Fluentdat (TrixWotel): one-time links to make an account, and the reports ----
  isAppAdmin: () => !!cache.admin,
  // (and TrixWotel's commands: bans from all of Fluentdat, taking someone out of a server, Datbux for anyone)
  canStaff: () => (cache.version || 0) >= 15,
  banned: () => cache.ban,
  async appBan(user, reason = '') { must(await sb.rpc('app_ban', { p_user: user, p_reason: reason })); },
  async appUnban(user) { return !!must(await sb.rpc('app_unban', { p_user: user })); },
  async appBans() {
    return (must(await sb.rpc('app_ban_list')) || []).map((r) => ({ id: r.user_id, login: r.handle, name: r.name || r.handle, avatar: r.avatar || '', reason: r.reason || '', ts: Date.parse(r.created_at) || 0, by: r.by_handle || '' }));
  },
  async staffKick(sv, user) { const gone = !!must(await sb.rpc('staff_kick', { p_server: sv, p_user: user })); await loadAll(); return gone; },
  async staffGiveBux(user, amount) { const b = Number(must(await sb.rpc('staff_give_bux', { p_user: user, p_amount: amount }))); if (user === myId()) await loadAll(); return b; },
  async createAppInvite(note = '', days = 7) { return must(await sb.rpc('create_app_invite', { p_note: note, p_days: days })); },
  async appInvites() {
    return must(await sb.rpc('app_invites_list')).map((r) => ({ code: r.code, note: r.note, ts: Date.parse(r.created_at), expires: r.expires_at ? Date.parse(r.expires_at) : 0,
      used: r.used_at ? Date.parse(r.used_at) : 0, usedBy: r.used_handle ? { login: r.used_handle, name: r.used_name || r.used_handle } : null, by: r.by_handle || '' }));
  },
  async revokeAppInvite(code) { must(await sb.rpc('revoke_app_invite', { p_code: code })); },
  async appReports() {
    return must(await sb.rpc('app_reports')).map((r) => ({ id: r.id, ts: Date.parse(r.created_at), reason: r.reason, excerpt: r.excerpt, resolved: !!r.resolved, place: r.place, message: r.message,
      reporter: { login: r.reporter_handle || '?', name: r.reporter_name || r.reporter_handle || 'Someone' }, target: r.target_handle ? { login: r.target_handle, name: r.target_name || r.target_handle } : null }));
  },
  async resolveReport(id, on) { took('Only the people who run Fluentdat can do that.')(await sb.from('reports').update({ resolved: !!on }).eq('id', id).select('id')); },

  // ---- a server's own emoji and stickers (its admins add them; everyone signed in can use and see them) ----
  emojiAll: () => cache.emoji.map(toEmoji),
  serverEmoji: (sv) => cache.emoji.filter((e) => e.server_id === sv).map(toEmoji),
  serverStickers: (sv) => cache.stickers.filter((s) => s.server_id === sv).map(toSticker),
  expressionUrl,
  async addEmoji(sv, file, name) {
    const ext = pictureExt(file), path = `${sv}/emoji/${uuid()}.${ext}`;
    must(await sb.storage.from('expressions').upload(path, file, { contentType: file.type || 'image/png', upsert: false }));
    try { must(await sb.from('server_emoji').insert({ server_id: sv, name, path, animated: ext === 'gif', created_by: myId() })); }
    catch (e) { sb.storage.from('expressions').remove([path]).then(() => {}, () => {}); throw e; }
    await loadAll();
  },
  async renameEmoji(id, name) { took('Only this server’s admins can rename its emoji.')(await sb.from('server_emoji').update({ name }).eq('id', id).select('id')); await loadAll(); },
  async removeEmoji(id) {
    const e = cache.emoji.find((x) => x.id === id);
    took('Only this server’s admins can remove its emoji.')(await sb.from('server_emoji').delete().eq('id', id).select('id'));
    if (e) sb.storage.from('expressions').remove([e.path]).then(() => {}, () => {});
    await loadAll();
  },
  async addServerSticker(sv, file, { name, emoji = '', description = '' }) {
    const ext = pictureExt(file), path = `${sv}/sticker/${uuid()}.${ext}`;
    must(await sb.storage.from('expressions').upload(path, file, { contentType: file.type || 'image/png', upsert: false }));
    try { must(await sb.from('server_stickers').insert({ server_id: sv, name, emoji, description, path, animated: ext === 'gif' || /apng/.test(file.type || ''), created_by: myId() })); }
    catch (e) { sb.storage.from('expressions').remove([path]).then(() => {}, () => {}); throw e; }
    await loadAll();
  },
  async updateServerSticker(id, patch) {
    const row = {}; for (const k of ['name', 'emoji', 'description']) if (k in patch) row[k] = patch[k];
    took('Only this server’s admins can change its stickers.')(await sb.from('server_stickers').update(row).eq('id', id).select('id')); await loadAll();
  },
  async removeServerSticker(id) {
    const s = cache.stickers.find((x) => x.id === id);
    took('Only this server’s admins can remove its stickers.')(await sb.from('server_stickers').delete().eq('id', id).select('id'));
    if (s) sb.storage.from('expressions').remove([s.path]).then(() => {}, () => {});
    await loadAll();
  },
  setProfile(patch) {
    if (!cache.me) return;
    const keys = ['name', 'color', 'avatar', 'pronouns', 'about', 'status', 'stickers', 'banner', 'plate', ...(styled ? ['theme1', 'theme2', 'name_font', 'name_effect', 'name_color1', 'name_color2'] : []),
      ...(profileSet <= 1 ? ['decoration', 'effect'] : []), ...(profileSet === 0 ? ['frame', 'bubble', 'bubble_until'] : []), ...((cache.version || 0) >= 16 ? ['privacy'] : [])];
    const row = {}; for (const k of keys) if (k in patch) row[k] = patch[k] == null || patch[k] === '' ? (k === 'stickers' ? [] : k === 'bubble_until' ? null : '') : patch[k];
    Object.assign(cache.me, row);
    const ops = Object.keys(row).map((k) => { const op = { v: row[k], until: 0 }; meOps.set(k, op); return [k, op]; });
    const settle = (ok) => { for (const [k, op] of ops) if (meOps.get(k) === op) { if (ok) op.until = Date.now() + 5000; else meOps.delete(k); } };
    if ('status' in row) for (const [sv, ch] of rooms) announce(ch, sv);
    emit();
    push(sb.from('profiles').update({ ...row, updated_at: new Date().toISOString() }).eq('id', myId()).then(must).then(() => settle(true)), () => { settle(false); return loadAll(); });
  },
  stickers: () => ((cache.me && cache.me.stickers) || []).slice(),
  addSticker(s) { SupabaseStore.setProfile({ stickers: [...SupabaseStore.stickers(), { id: 's_' + uuid().slice(0, 8), ...s }] }); },
  removeSticker(id) { SupabaseStore.setProfile({ stickers: SupabaseStore.stickers().filter((x) => x.id !== id) }); },

  dump: () => JSON.stringify({ me: cache.me, servers: cache.servers, categories: cache.categories, channels: cache.channels, dms: cache.dmIndex, friends: cache.friendRows }, null, 2),
};
