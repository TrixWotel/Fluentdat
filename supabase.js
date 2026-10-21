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

let sb = null, session = null, feed = null, extras = null, structure = null, structure2 = null, structure3 = null, reacts = null, active = null, following = false, providersOn = null, beat = 0;
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
    emoji: [], stickers: [], blocks: [], admin: false, reacts: {} };
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
    tag: p.tag && p.tag_server ? { text: p.tag, badge: p.tag_badge || '', color: p.tag_color || '', server: p.tag_server } : null };
}
const userOf = (id) => ({ ...toUser(cache.profiles[id]), id });
// (Flubot's lines are posted by whoever ran the command — say who, so nobody can pass words off as the bot's)
const toMessage = (r) => ({ id: r.id, ts: Date.parse(r.created_at), text: r.text, sticker: r.sticker, action: r.action, reply: r.reply_to || null, forwarded: r.forwarded || null,
  files: Array.isArray(r.files) ? r.files : null, mine: r.author === myId(), sending: pending.has(r.id), progress: r._progress,
  user: r.bot ? { ...FLUBOT, via: (cache.profiles[r.author] || {}).handle || '' } : userOf(r.author) });
const toServer = (r) => ({ id: r.id, name: r.name, icon: r.icon, img: r.img, owner: r.owner, banner: r.banner || '', description: r.description || '',
  tag: r.tag || '', tagBadge: r.tag_badge || '', tagColor: r.tag_color || '',
  category: r.category || '', public: !!r.public, since: Date.parse(r.created_at) || 0 });
const toRole = (r) => ({ id: r.id, server: r.server_id, name: r.name, color: r.color, hoist: r.hoist, position: r.position });
// someone's roles in a server, top one first
const rolesOf = (sv, uid) => cache.memberRoles.filter((x) => x.server_id === sv && x.user_id === uid)
  .map((x) => cache.roles.find((r) => r.id === x.role_id)).filter(Boolean).sort(byPos);
const toCategory = (r) => ({ id: r.id, server: r.server_id, name: r.name, position: r.position });
const toChannel = (r) => ({ id: r.id, server: r.server_id, category: r.category_id, name: r.name, kind: r.kind, position: r.position, topic: r.topic || '' });
const otherIn = (d) => (d.user_a === myId() ? d.user_b : d.user_a);
const isGroup = (d) => d && d.kind === 'group';
const groupPeople = (id) => cache.dmMembers.filter((m) => m.dm_id === id).map((m) => m.user_id);
// text channels are lower-case-with-dashes (like Discord); voice channels keep their spaces and capitals
const chanName = (name, kind) => (kind === 'voice' ? String(name).trim().replace(/\s+/g, ' ') : String(name).trim().replace(/\s+/g, '-').toLowerCase()).slice(0, 60) || (kind === 'voice' ? 'Voice' : 'channel');
const placeKind = (id) => (cache.dmIndex.some((d) => d.id === id) ? 'dm' : 'channel');
const serverOfChannel = (id) => (cache.channels.find((c) => c.id === id) || {}).server || null;
const roleIn = (sv, uid) => (cache.members.find((m) => m.server_id === sv && m.user_id === uid) || {}).role || null;
// a server's emoji and stickers: their pictures are in the public "expressions" bucket, so they're plain links
const expressionUrl = (path) => (path && sb ? sb.storage.from('expressions').getPublicUrl(path).data.publicUrl : '');
const toEmoji = (r) => ({ id: r.id, server: r.server_id, name: r.name, animated: !!r.animated, path: r.path, url: expressionUrl(r.path), by: r.created_by });
const toSticker = (r) => ({ id: r.id, server: r.server_id, name: r.name, emoji: r.emoji || '', description: r.description || '', animated: !!r.animated, path: r.path, url: expressionUrl(r.path), by: r.created_by });

// ---------- loading ----------
const PROFILE_COLS = 'id,handle,name,color,avatar,pronouns,about,status,plate,created_at,updated_at';
const PROFILE_STYLE = ',theme1,theme2,name_font,name_effect,name_color1,name_color2,tag_server,tag,tag_badge,tag_color';
async function profilesQ(q) {
  if (!styled) return q('profiles', PROFILE_COLS);
  try { return await q('profiles', PROFILE_COLS + PROFILE_STYLE); }
  catch (e) { if (!missing(e)) throw e; styled = false; state.needsSetup = true; return q('profiles', PROFILE_COLS); }
}
async function loadAll() {
  if (!session) return;
  state.loading = true; state.error = ''; emit();
  try {
    const q = (t, cols = '*') => sb.from(t).select(cols).then(must);
    const [profiles, mine, servers, members, categories, channels, dms, friends, roles, memberRoles, dmMembers, reads, unread, emoji, stickers, blocks, admin] = await Promise.all([
      profilesQ(q),
      sb.from('profiles').select('*').eq('id', myId()).then(must),
      q('servers'), q('server_members'), q('categories'), q('channels'), q('dms'), q('friends'), q('roles'), q('member_roles'),
      soft(q('dm_members'), []), soft(q('reads'), []), soft(sb.rpc('unread').then(must), null),
      soft(q('server_emoji'), []), soft(q('server_stickers'), []), soft(q('blocks'), []), soft(sb.rpc('is_app_admin').then(must), false)]);
    cache.profiles = Object.fromEntries(profiles.map((p) => [p.id, p]));
    cache.me = mine[0] || null;
    if (cache.me) cache.profiles[cache.me.id] = cache.me;
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
    cache.emoji = emoji; cache.stickers = stickers; cache.blocks = blocks; cache.admin = admin === true;
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
  cache.reacts[a.id] = await soft(sb.from('reactions').select('message_id,place,user_id,emoji,active,created_at').eq('place', a.id).eq('active', true).then(must), []);
  cache.loaded.add(a.id);
}
// someone new spoke (they've only just joined): find out who they are
function meet(id) {
  if (!id || cache.profiles[id] || asking.has(id)) return;
  asking.add(id);
  sb.from('profiles').select('*').eq('id', id).then(must)
    .then((rows) => { if (rows[0]) { cache.profiles[id] = rows[0]; emit(); } }, () => {})
    .then(() => asking.delete(id));
}

// ---------- live ----------
// every message in every channel and DM you can read arrives here (the database only sends you those): it goes into
// the conversation if that's loaded, counts as unread (and maybe as a ping) if you're elsewhere, and the app may say so
function watchMessages() {
  if (feed) return;
  const add = (dm) => ({ new: row }) => {
    const place = dm ? row.dm_id : row.channel_id, bucket = dm ? cache.dms : cache.msgs;
    if (!row.bot) meet(row.author);
    if (bucket[place] && !bucket[place].some((m) => m.id === row.id)) { bucket[place].push(row); bucket[place].sort(byTime); }
    const mineToo = row.author === myId() && !row.bot;
    const u = (cache.unread[place] = cache.unread[place] || { unread: 0, mentions: 0, last: 0 });
    u.last = Date.parse(row.created_at) || Date.now();
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
  if (mentionsEveryone(text) && ['owner', 'admin'].includes(roleIn(serverOfChannel(place), row.author))) return true;
  if (row.reply_to) { const to = (cache.msgs[place] || []).find((m) => m.id === row.reply_to); if (to && to.author === me) return true; }
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
// signing in with a password (accounts made from a one-time link: their address is made up from their username)
async function signInPassword(email, password) {
  const r = await sb.auth.signInWithPassword({ email, password: String(password || '') });
  if (r.error) throw new Error(/invalid login|invalid credentials/i.test(r.error.message || '') ? 'That username and password don’t match.' : friendly(r.error.message || String(r.error)));
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
    if (err) state.error = 'Sign-in didn’t finish: ' + err;
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
      providersOn = { discord: !!ext.discord, github: !!ext.github, email: ext.email !== false };
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
  async signInUsername(handle, password) {
    await client();
    const email = must(await sb.rpc('login_email', { p_handle: String(handle || '').trim() }));
    if (!email) throw new Error('There’s no account with that username and a password. (Signed in with Discord, GitHub or email before? Use that instead.)');
    await signInPassword(email, password);
    return SupabaseStore.account();
  },
  // a new password (accounts made from a one-time link)
  async changePassword(password) {
    const r = await sb.auth.updateUser({ password: String(password || '') });
    if (r.error) throw new Error(friendly(r.error.message || String(r.error)));
  },
  // someone by their @handle (for a profile link)
  async findUser(handle) {
    const found = must(await sb.rpc('find_user', { p_handle: String(handle || '').replace(/^@/, '') }));
    return found && found[0] ? { ...toUser(found[0]), id: found[0].id } : null;
  },
  async signOut() {
    for (const ch of [feed, extras, structure, structure2, structure3, reacts, ...rooms.values()]) if (ch) sb.removeChannel(ch);
    feed = extras = structure = structure2 = structure3 = reacts = null; rooms.clear(); online = {}; voiceNow = {}; myVoice = null; clearInterval(beat);
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
  channels: (sv) => cache.channels.filter((c) => c.server === sv),
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
    for (const [k, col] of [['tag', 'tag'], ['tagBadge', 'tag_badge'], ['tagColor', 'tag_color']]) if (k in patch) row[col] = patch[k];
    push(sb.from('servers').update(row).eq('id', id).select('id').then(took('Only this server’s admins can change it.')), loadAll);
  },
  updateChannel(id, patch) {
    const c = SupabaseStore.channel(id); if (c) Object.assign(c, patch); emit();
    const row = {}; if ('name' in patch) row.name = patch.name; if ('kind' in patch) row.kind = patch.kind; if ('category' in patch) row.category_id = patch.category || null;
    if ('topic' in patch) row.topic = String(patch.topic || '').slice(0, 1024);
    push(sb.from('channels').update(row).eq('id', id).select('id').then(took('Only this server’s admins can change channels.')), loadAll);
  },
  updateCategory(id, patch) {
    const c = cache.categories.find((x) => x.id === id); if (c) Object.assign(c, patch); emit();
    push(sb.from('categories').update({ name: patch.name }).eq('id', id).select('id').then(took('Only this server’s admins can change categories.')), loadAll);
  },
  removeChannel(id) {
    cache.channels = cache.channels.filter((c) => c.id !== id); emit();
    push(sb.from('channels').delete().eq('id', id).select('id').then(took('Only this server’s admins can delete channels.')), loadAll);
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
    return { ...toUser(cache.profiles[m.user_id]), id: m.user_id, role: m.role, me: m.user_id === myId(), roles: rs.map((r) => r.id),
      roleColor: (rs.find((r) => r.color) || {}).color || '', group: rs.find((r) => r.hoist) ? toRole(rs.find((r) => r.hoist)) : null };
  }),
  memberColor: (sv, uid) => (rolesOf(sv, uid).find((r) => r.color) || {}).color || '',

  // ---- roles (a name and a colour that admins hand out) ----
  roles: (sv) => cache.roles.filter((r) => r.server_id === sv).sort(byPos).map(toRole),
  async addRole(sv, role = {}) {
    const id = uuid();
    must(await sb.from('roles').insert({ id, server_id: sv, name: String(role.name || 'new role').trim().slice(0, 40) || 'new role',
      color: role.color || '', hoist: role.hoist !== false, position: SupabaseStore.roles(sv).length }));
    await loadAll(); return id;
  },
  updateRole(id, patch) {
    const r = cache.roles.find((x) => x.id === id); if (r) Object.assign(r, patch); emit();
    const row = {}; for (const k of ['name', 'color', 'hoist', 'position']) if (k in patch) row[k] = patch[k];
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
  async markServerRead(sv) { await markAllRead(SupabaseStore.channels(sv).map((c) => c.id)); emit(); },
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
    if (!cache.full[id]) { const rows = must(await sb.from('profiles').select('*').eq('id', id)); if (!rows[0]) return null; cache.full[id] = rows[0]; }
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
  // ---- for the people who run Fluentdat (TrixWotel): one-time links to make an account, and the reports ----
  isAppAdmin: () => !!cache.admin,
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
    const keys = ['name', 'color', 'avatar', 'pronouns', 'about', 'status', 'stickers', 'banner', 'plate', ...(styled ? ['theme1', 'theme2', 'name_font', 'name_effect', 'name_color1', 'name_color2'] : [])];
    const row = {}; for (const k of keys) if (k in patch) row[k] = patch[k] == null ? (k === 'stickers' ? [] : '') : patch[k];
    Object.assign(cache.me, row);
    if ('status' in row) for (const [sv, ch] of rooms) announce(ch, sv);
    emit();
    push(sb.from('profiles').update({ ...row, updated_at: new Date().toISOString() }).eq('id', myId()).then(must), loadAll);
  },
  stickers: () => ((cache.me && cache.me.stickers) || []).slice(),
  addSticker(s) { SupabaseStore.setProfile({ stickers: [...SupabaseStore.stickers(), { id: 's_' + uuid().slice(0, 8), ...s }] }); },
  removeSticker(id) { SupabaseStore.setProfile({ stickers: SupabaseStore.stickers().filter((x) => x.id !== id) }); },

  dump: () => JSON.stringify({ me: cache.me, servers: cache.servers, categories: cache.categories, channels: cache.channels, dms: cache.dmIndex, friends: cache.friendRows }, null, 2),
};
