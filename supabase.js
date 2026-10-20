// Fluentdat's data in Supabase: sign in with email (a magic link), Discord or GitHub, and messages arrive live.
// The database decides who sees what (supabase/setup.sql — row level security), so this file never has to
// trust itself: a stranger who signs up sees nothing, you join a server with an invite code, and DMs are
// readable only by the two people in them. Same shape as store.js and github.js, so the app doesn't care.
import { SUPABASE } from './config.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
const FLUBOT = { name: 'Flubot', color: '#5b7fd6', bot: true };
const here = () => location.origin + location.pathname;
const uuid = () => crypto.randomUUID();
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));
const byTime = (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at);
const byPos = (a, b) => (a.position - b.position) || String(a.name).localeCompare(b.name);

let sb = null, session = null, live = null, structure = null, active = null, following = false;
let cache = blank();
const pending = new Map();          // messages you've sent that the server hasn't confirmed yet (kept through reloads)
const asking = new Set();           // profiles being fetched
const rooms = new Map();            // server id → its presence channel (who has Fluentdat open right now)
let online = {};                    // user id → the status they're showing, while they're here
let state = { loading: false, error: '', lastSync: 0 };
const listeners = new Set();
function blank() { return { me: null, profiles: {}, servers: [], categories: [], channels: [], members: [], dmIndex: [], friends: [], msgs: {}, dms: {} }; }
const emit = () => { for (const cb of listeners) try { cb(); } catch {} };
const friendly = (m) => (/row-level security/i.test(m) ? 'You don’t have permission to do that here.' : m);
const must = ({ data, error }) => { if (error) throw new Error(friendly(error.message || String(error))); return data; };
// an update or delete the rules refuse comes back as "nothing changed" rather than an error, so ask for the rows back
const took = (refused) => (r) => { const data = must(r); if (!data || !data.length) throw new Error(refused); return data; };
const why = (e) => String((e && e.message) || e).slice(0, 200);
// a secret key here would hand everyone full control of the database, so refuse to use one
const secret = (k) => /^sb_secret_/.test(k) || (() => { try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch { return false; } })();
if (SUPABASE.anonKey && secret(SUPABASE.anonKey)) console.error('Fluentdat: config.js has a SECRET Supabase key. Put the publishable key there instead, and reset the secret one in Supabase.');
const configured = () => (!!(SUPABASE.url && SUPABASE.anonKey) && !secret(SUPABASE.anonKey)) || !!globalThis.__fluentdatSupabase;
const myId = () => session && session.user.id;

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
    status: p.id === myId() ? myStatus() : online[p.id] || 'offline' };
}
// (Flubot's lines are posted by whoever ran the command — say who, so nobody can pass words off as the bot's)
const toMessage = (r) => ({ id: r.id, ts: Date.parse(r.created_at), text: r.text, sticker: r.sticker, action: r.action,
  user: r.bot ? { ...FLUBOT, via: (cache.profiles[r.author] || {}).handle || '' } : toUser(cache.profiles[r.author]) });
const toServer = (r) => ({ id: r.id, name: r.name, icon: r.icon, img: r.img, owner: r.owner });
const toCategory = (r) => ({ id: r.id, server: r.server_id, name: r.name, position: r.position });
const toChannel = (r) => ({ id: r.id, server: r.server_id, category: r.category_id, name: r.name, kind: r.kind, position: r.position });
const otherIn = (d) => (d.user_a === myId() ? d.user_b : d.user_a);

// ---------- loading ----------
async function loadAll() {
  if (!session) return;
  state.loading = true; state.error = ''; emit();
  try {
    const q = (t) => sb.from(t).select('*').then(must);
    const [profiles, servers, members, categories, channels, dms, friends] =
      await Promise.all(['profiles', 'servers', 'server_members', 'categories', 'channels', 'dms', 'friends'].map(q));
    cache.profiles = Object.fromEntries(profiles.map((p) => [p.id, p]));
    cache.me = cache.profiles[myId()] || null;
    cache.servers = servers.map(toServer);
    cache.members = members;
    cache.categories = categories.sort(byPos).map(toCategory);
    cache.channels = channels.sort(byPos).map(toChannel);
    cache.dmIndex = dms;
    cache.friends = friends.map((f) => f.friend);
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
}
// someone new spoke (they've only just joined): find out who they are
function meet(id) {
  if (!id || cache.profiles[id] || asking.has(id)) return;
  asking.add(id);
  sb.from('profiles').select('*').eq('id', id).then(must)
    .then((rows) => { if (rows[0]) { cache.profiles[id] = rows[0]; emit(); } }, () => {})
    .then(() => asking.delete(id));
}

// live: new messages in what you're looking at; anything structural (channels, members, profiles) reloads the lot
function watch(a) {
  if (live) { sb.removeChannel(live); live = null; }
  if (!a) return;
  const dm = a.kind === 'dm', table = dm ? 'dm_messages' : 'messages', col = dm ? 'dm_id' : 'channel_id', bucket = dm ? cache.dms : cache.msgs;
  live = sb.channel('fluentdat-' + a.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `${col}=eq.${a.id}` }, ({ new: row }) => {
      const list = (bucket[a.id] = bucket[a.id] || []);
      if (!row.bot) meet(row.author);
      if (!list.some((m) => m.id === row.id)) { list.push(row); list.sort(byTime); emit(); }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, ({ old }) => {
      if (old && (bucket[a.id] || []).some((m) => m.id === old.id)) { bucket[a.id] = bucket[a.id].filter((m) => m.id !== old.id); emit(); }
    })
    .subscribe();
}
// who's here: everyone in a server shares a presence channel (named by the server's id, which only members know)
function watchPresence() {
  const want = new Set(cache.servers.map((s) => s.id));
  for (const [id, ch] of rooms) if (!want.has(id)) { sb.removeChannel(ch); rooms.delete(id); }
  for (const id of want) {
    if (rooms.has(id)) continue;
    const ch = sb.channel('fluentdat-here-' + id, { config: { presence: { key: myId() } } });
    ch.on('presence', { event: 'sync' }, recount);
    ch.subscribe((st) => { if (st === 'SUBSCRIBED') announce(ch); });
    rooms.set(id, ch);
  }
  recount();
}
function announce(ch) { try { if (myStatus() === 'invisible') ch.untrack(); else ch.track({ status: myStatus() }); } catch {} }
function recount() {
  const next = {};
  for (const ch of rooms.values()) for (const [id, metas] of Object.entries(ch.presenceState() || {})) if (metas && metas[0]) next[id] = metas[0].status || 'online';
  const changed = JSON.stringify(next) !== JSON.stringify(online);
  online = next;
  if (changed) emit();
}
function watchStructure() {
  if (structure) return;
  let t = 0;
  const again = () => { clearTimeout(t); t = setTimeout(loadAll, 400); };
  structure = sb.channel('fluentdat-structure');
  for (const table of ['servers', 'channels', 'categories', 'server_members', 'profiles', 'dms']) structure.on('postgres_changes', { event: '*', schema: 'public', table }, again);
  structure.subscribe();
}
// signed in: load everything, keep it live, and notice if the session ends (signed out in another tab, or it ran out)
async function start() {
  if (!following) { following = true; sb.auth.onAuthStateChange((_e, s) => { session = s; if (!s) { cache = blank(); active = null; emit(); } }); }
  await loadAll();
  watchStructure();
}
// a change that didn't take: put things back as they really are, then say why (after, so the reload doesn't wipe it)
function push(p, undo) {
  return p.catch(async (e) => {
    if (undo) try { await undo(); } catch {}
    state.error = why(e); emit();
  });
}

function sendTo(dm, id, msg) {
  const row = { id: uuid(), author: myId(), text: msg.text == null ? null : msg.text, sticker: msg.sticker || null,
    action: !!msg.action, bot: !!(msg.user && msg.user.bot), [dm ? 'dm_id' : 'channel_id']: id };
  const bucket = dm ? cache.dms : cache.msgs, shown = { ...row, created_at: new Date().toISOString() };
  (bucket[id] = bucket[id] || []).push(shown);
  pending.set(row.id, shown);
  emit();
  push(sb.from(dm ? 'dm_messages' : 'messages').insert(row).then(must).then(() => pending.delete(row.id)),
    () => { pending.delete(row.id); bucket[id] = (bucket[id] || []).filter((m) => m.id !== row.id); });
  return true;
}

export const SupabaseStore = {
  get backend() { return cache.me ? `Supabase (@${cache.me.handle})` : 'Supabase'; },
  configured,
  account: () => (session ? { id: session.user.id, login: cache.me ? cache.me.handle : session.user.email, email: session.user.email || '', provider: (session.user.app_metadata || {}).provider || 'email' } : null),
  // is there a sign-in to pick up? (from last time, or just back from Discord / an email link) — answered without the network
  pending() {
    if (!configured()) return false;
    if (globalThis.__fluentdatSupabase) return true;
    const q = new URL(location.href).searchParams, h = new URLSearchParams(location.hash.slice(1));
    if (q.has('code') || q.has('error_description') || h.has('error_description')) return true;
    try { return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k)); } catch { return false; }
  },
  syncState: () => ({ ...state, repo: 'Supabase' }),

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
  async signOut() {
    if (live) { sb.removeChannel(live); live = null; }
    if (structure) { sb.removeChannel(structure); structure = null; }
    for (const ch of rooms.values()) sb.removeChannel(ch);
    rooms.clear(); online = {};
    if (sb) await sb.auth.signOut({ scope: 'local' });   // (just this browser — your phone stays signed in)
    session = null; cache = blank(); active = null; pending.clear(); emit();
  },

  init: () => cache,
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  setActive(kind, id) {
    if (!session || !id) return;
    if (active && active.kind === kind && active.id === id) return;
    active = { kind, id };
    watch(active);
    push(loadMessages(active).then(emit));
  },
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
      name: String(name).trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'channel', kind, position: SupabaseStore.channels(sv).length }));
    await loadAll(); return id;
  },
  updateServer(id, patch) {
    const s = SupabaseStore.server(id); if (s) Object.assign(s, patch); emit();
    const row = {}; for (const k of ['name', 'icon', 'img']) if (k in patch) row[k] = patch[k];
    push(sb.from('servers').update(row).eq('id', id).select('id').then(took('Only this server’s admins can change it.')), loadAll);
  },
  updateChannel(id, patch) {
    const c = SupabaseStore.channel(id); if (c) Object.assign(c, patch); emit();
    const row = {}; if ('name' in patch) row.name = patch.name; if ('kind' in patch) row.kind = patch.kind; if ('category' in patch) row.category_id = patch.category || null;
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
  members: (sv) => cache.members.filter((m) => m.server_id === sv).map((m) => ({ ...toUser(cache.profiles[m.user_id]), id: m.user_id, role: m.role, me: m.user_id === myId() })),
  async createInvite(sv, maxUses = null, hours = 168) { return must(await sb.rpc('create_invite', { p_server: sv, p_max_uses: maxUses, p_hours: hours })); },
  async joinServer(code) { const id = must(await sb.rpc('join_server', { p_code: String(code).trim() })); await loadAll(); return id; },
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

  // ---- direct messages ----
  dmList: () => cache.dmIndex.map((d) => ({ id: d.id, user: { ...toUser(cache.profiles[otherIn(d)]), id: otherIn(d) } })),
  dm: (id) => (cache.dms[id] || []).map(toMessage),
  dmUser(id) { const d = cache.dmIndex.find((x) => x.id === id); return d ? { ...toUser(cache.profiles[otherIn(d)]), id: otherIn(d) } : null; },
  async ensureDM(user) {
    if (!isUuid(user.id)) throw new Error(`${user.name || 'That'} can’t be messaged here.`);
    const id = must(await sb.rpc('open_dm', { p_other: user.id }));
    if (!cache.dmIndex.some((d) => d.id === id)) await loadAll();
    return id;
  },
  sendDM: (id, msg) => sendTo(true, id, msg),

  // ---- friends (added by exact @handle; nobody can browse everyone) ----
  friends: () => cache.friends.map((id) => ({ ...toUser(cache.profiles[id]), id })),
  async addFriendByHandle(handle) {
    const found = must(await sb.rpc('find_user', { p_handle: handle }));
    const u = found && found[0];
    if (!u) throw new Error(`Nobody is called @${String(handle).replace(/^@/, '')}.`);
    if (u.id === myId()) throw new Error('That’s you.');
    if (!cache.friends.includes(u.id)) must(await sb.from('friends').insert({ owner: myId(), friend: u.id }));
    await loadAll();
    return toUser(u);
  },
  addFriend(user) { if (isUuid(user.id)) push(sb.from('friends').insert({ owner: myId(), friend: user.id }).then(must).then(loadAll)); },
  removeFriend(id) { cache.friends = cache.friends.filter((f) => f !== id); emit(); push(sb.from('friends').delete().eq('owner', myId()).eq('friend', id).then(must), loadAll); },

  // ---- you ----
  profile: (id) => cache.profiles[id] || null,
  myProfile: () => (cache.me ? { ...toUser(cache.me), stickers: cache.me.stickers || [] } : {}),
  setProfile(patch) {
    if (!cache.me) return;
    const row = {}; for (const k of ['name', 'color', 'avatar', 'pronouns', 'about', 'status', 'stickers']) if (k in patch) row[k] = patch[k] == null ? (k === 'stickers' ? [] : '') : patch[k];
    Object.assign(cache.me, row);
    if ('status' in row) for (const ch of rooms.values()) announce(ch);
    emit();
    push(sb.from('profiles').update({ ...row, updated_at: new Date().toISOString() }).eq('id', myId()).then(must), loadAll);
  },
  stickers: () => ((cache.me && cache.me.stickers) || []).slice(),
  addSticker(s) { SupabaseStore.setProfile({ stickers: [...SupabaseStore.stickers(), { id: 's_' + uuid().slice(0, 8), ...s }] }); },
  removeSticker(id) { SupabaseStore.setProfile({ stickers: SupabaseStore.stickers().filter((x) => x.id !== id) }); },

  dump: () => JSON.stringify({ me: cache.me, servers: cache.servers, categories: cache.categories, channels: cache.channels, dms: cache.dmIndex, friends: cache.friends }, null, 2),
};
