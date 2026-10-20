// Fluentdat's data in a private GitHub repo (TrixWotel/Fluentdat-Data), so a small team shares one set of servers,
// messages, profiles and DMs. You sign in with your own fine-grained token, so every write is your own commit and
// nobody's token is baked into this page. It isn't instant: the page polls the files you're looking at every few
// seconds (ETags make unchanged polls free), so messages land a second or two apart. Files:
//   config.json              servers, categories, channels
//   profiles.json            everyone's profile, by GitHub login
//   channels/<id>.json       a channel's messages          dms/<id>.json   a DM's messages
//   dms.json                 which DMs exist                friends/<login>.json  your friends (one file each, so no clashes)
const DEFAULT_API = 'https://api.github.com';
const REPO = 'TrixWotel/Fluentdat-Data';
const POLL_MS = 4000;
const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));

const api = () => { try { return localStorage.getItem('fluentdat.api') || DEFAULT_API; } catch { return DEFAULT_API; } };
const saved = () => { try { return JSON.parse(localStorage.getItem('fluentdat.gh')) || null; } catch { return null; } };
const save = (v) => { try { v ? localStorage.setItem('fluentdat.gh', JSON.stringify(v)) : localStorage.removeItem('fluentdat.gh'); } catch {} };

let auth = null;                 // { token, login }
let cache = null;                // { config, profiles, dmIndex, msgs:{}, dms:{}, friends:[] }
const etags = new Map(), shas = new Map();
const listeners = new Set();
let timer = 0, active = null, busy = false, state = { loading: false, error: '', lastSync: 0 };

const emit = () => { for (const cb of listeners) try { cb(); } catch {} };
const blank = () => ({ config: { servers: [], categories: [], channels: [] }, profiles: {}, dmIndex: {}, msgs: {}, dms: {}, friends: [] });

// ---------- talking to GitHub ----------
async function call(method, path, body, { etag } = {}) {
  const headers = { authorization: `Bearer ${auth.token}`, accept: 'application/vnd.github+json' };
  if (body) headers['content-type'] = 'application/json';
  if (etag && etags.has(etag)) headers['if-none-match'] = etags.get(etag);
  const r = await fetch(api() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 304) return { notModified: true };
  const text = await r.text();
  const json = text ? JSON.parse(text) : {};
  if (etag && r.headers.get('etag')) etags.set(etag, r.headers.get('etag'));
  if (!r.ok) { const e = new Error(json.message || `GitHub said ${r.status}`); e.status = r.status; throw e; }
  return json;
}
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

// read a JSON file (null when it isn't there); `keep` reuses the last value on an unchanged poll
async function readFile(path, keep) {
  try {
    const r = await call('GET', `/repos/${REPO}/contents/${path}`, null, { etag: path });
    if (r.notModified) return { json: keep, sha: shas.get(path), same: true };
    shas.set(path, r.sha);
    return { json: JSON.parse(unb64(r.content || '') || 'null'), sha: r.sha };
  } catch (e) { if (e.status === 404) return { json: null, sha: null }; throw e; }
}
async function writeFile(path, json, sha, message) {
  const body = { message, content: b64(JSON.stringify(json, null, 1)) };
  if (sha) body.sha = sha;
  const r = await call('PUT', `/repos/${REPO}/contents/${path}`, body);
  shas.set(path, r.content.sha);
  etags.delete(path);
  return r.content.sha;
}
// read, change, write — and if someone else wrote first, read again and redo the change on top
async function update(path, mutate, message, fallback = {}) {
  for (let i = 0; i < 5; i++) {
    const { json, sha } = await readFile(path);
    const next = mutate(json == null ? structuredClone(fallback) : json);
    try { await writeFile(path, next, sha, message); return next; }
    catch (e) { if ((e.status === 409 || e.status === 422) && i < 4) { etags.delete(path); shas.delete(path); continue; } throw e; }
  }
}

// ---------- loading ----------
const chanPath = (id) => `channels/${id}.json`;
const dmPath = (id) => `dms/${id}.json`;
function seedConfig() {
  const g = 'c_general', b = 'c_build', v = 'c_voice';
  return {
    servers: [{ id: 's_robotics', name: 'Robotics', icon: 'bot' }],
    categories: [{ id: 'cat_text', server: 's_robotics', name: 'Text Channels' }, { id: 'cat_voice', server: 's_robotics', name: 'Voice Channels' }],
    channels: [
      { id: g, server: 's_robotics', category: 'cat_text', name: 'general', kind: 'text' },
      { id: b, server: 's_robotics', category: 'cat_text', name: 'build-log', kind: 'text' },
      { id: v, server: 's_robotics', category: 'cat_voice', name: 'Meeting', kind: 'voice' },
    ],
  };
}
async function loadAll() {
  state.loading = true; state.error = ''; emit();
  try {
    // make the shared files on first run, so later polls find them instead of 404ing every few seconds
    const cfg = await readFile('config.json');
    cache.config = cfg.json || await update('config.json', () => seedConfig(), 'Start the server list', seedConfig());
    const prof = await readFile('profiles.json');
    cache.profiles = prof.json || await update('profiles.json', () => ({}), 'Start the profile list', {});
    const dmi = await readFile('dms.json');
    cache.dmIndex = dmi.json || await update('dms.json', () => ({}), 'Start the direct message list', {});
    cache.friends = ((await readFile(`friends/${auth.login}.json`)).json || {}).friends || [];
    await refreshActive(true);
    state.lastSync = Date.now();
  } catch (e) { state.error = why(e); }
  state.loading = false; emit();
}
const why = (e) => e.status === 401 ? 'That token was refused. Make a new one and sign in again.'
  : e.status === 404 ? `Can't see ${REPO}. Check the token has access to that repository.`
    : e.status === 403 ? 'The token can read but not write. It needs Contents: Read and write.'
      : 'Couldn’t reach GitHub: ' + String(e.message || e).slice(0, 120);

async function refreshActive(force) {
  if (!active) return;
  const path = active.kind === 'dm' ? dmPath(active.id) : chanPath(active.id);
  const store = active.kind === 'dm' ? cache.dms : cache.msgs;
  const r = await readFile(path, store[active.id] ? { messages: store[active.id] } : null);
  if (r.same && !force) return false;
  store[active.id] = (r.json && r.json.messages) || [];
  return true;
}

async function tick() {
  if (busy || !auth || state.loading) return;
  busy = true;
  try {
    let changed = await refreshActive(false);
    const p = await readFile('profiles.json', cache.profiles);
    if (!p.same) { cache.profiles = p.json || {}; changed = true; }
    const d = await readFile('dms.json', cache.dmIndex);
    if (!d.same) { cache.dmIndex = d.json || {}; changed = true; }
    const c = await readFile('config.json', cache.config);
    if (!c.same) { cache.config = c.json || cache.config; changed = true; }
    state.lastSync = Date.now(); state.error = '';
    if (changed) emit();
  } catch (e) { state.error = why(e); emit(); }
  busy = false;
}
const schedule = () => { clearInterval(timer); if (auth) timer = setInterval(tick, POLL_MS); };

// push a change, and put the error on screen if it doesn't land
function push(p) { return p.catch((e) => { state.error = why(e); emit(); }); }

// ---------- messages ----------
const me = () => cache.profiles[auth.login] || {};
const stampOf = () => ({ login: auth.login, name: me().name || auth.login, color: me().color || '#5b7fd6' });
// a message carries only who wrote it; the look comes from their profile, so changing your avatar updates everything
function dress(m) {
  const p = (m.user && m.user.login && cache.profiles[m.user.login]) || null;
  return p ? { ...m, user: { ...m.user, avatar: p.avatar, pronouns: p.pronouns, about: p.about, name: p.name || m.user.name, color: p.color || m.user.color } } : m;
}
function appendLocal(bucket, id, msg) { (bucket[id] = bucket[id] || []).push(msg); emit(); }
const merge = (a = [], b = []) => { const seen = new Map(); for (const m of [...a, ...b]) seen.set(m.id, m); return [...seen.values()].sort((x, y) => x.ts - y.ts); };

export const GitHubStore = {
  get backend() { return auth ? `GitHub (${auth.login})` : 'GitHub'; },
  account: () => (auth ? { login: auth.login } : null),
  syncState: () => ({ ...state, repo: REPO }),

  async signIn(token) {
    const probe = { token, login: '' };
    const prev = auth; auth = probe;
    try {
      const u = await call('GET', '/user');
      probe.login = u.login;
      await call('GET', `/repos/${REPO}`);            // can this token see the data repo?
      save({ token, login: u.login });
      cache = blank();
      etags.clear(); shas.clear();
      await loadAll();
      schedule();
      return { login: u.login };
    } catch (e) { auth = prev; const err = new Error(why(e)); throw err; }
  },
  signOut() { auth = null; cache = null; save(null); clearInterval(timer); etags.clear(); shas.clear(); state = { loading: false, error: '', lastSync: 0 }; },
  resume() { const s = saved(); if (!s) return false; auth = s; cache = blank(); loadAll().then(schedule); return true; },

  init() { return cache || blank(); },
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  setActive(kind, id) { if (!active || active.id !== id || active.kind !== kind) { active = { kind, id }; if (auth && !state.loading) push(refreshActive(true).then((c) => c && emit())); } },

  // servers / channels
  servers: () => (cache?.config.servers || []).slice(),
  server: (id) => (cache?.config.servers || []).find((s) => s.id === id) || null,
  categories: (sv) => (cache?.config.categories || []).filter((c) => c.server === sv),
  channels: (sv) => (cache?.config.channels || []).filter((c) => c.server === sv),
  channel: (id) => (cache?.config.channels || []).find((c) => c.id === id) || null,
  addServer(name, icon) {
    const id = 's_' + uid(), cat = 'cat_' + uid(), ch = 'c_' + uid();
    cache.config.servers.push({ id, name: name.trim() || 'New Server', icon: icon || '' });
    cache.config.categories.push({ id: cat, server: id, name: 'Text Channels' });
    cache.config.channels.push({ id: ch, server: id, category: cat, name: 'general', kind: 'text' });
    emit(); push(update('config.json', (c) => { c.servers.push({ id, name: name.trim() || 'New Server', icon: icon || '' }); c.categories.push({ id: cat, server: id, name: 'Text Channels' }); c.channels.push({ id: ch, server: id, category: cat, name: 'general', kind: 'text' }); return c; }, `Add the ${name} server`, seedConfig()));
    return id;
  },
  addCategory(sv, name) {
    const id = 'cat_' + uid(), row = { id, server: sv, name: name.trim() || 'New Category' };
    cache.config.categories.push(row); emit();
    push(update('config.json', (c) => { c.categories.push(row); return c; }, `Add the ${row.name} category`, seedConfig()));
    return id;
  },
  addChannel(sv, cat, name, kind = 'text') {
    const id = 'c_' + uid(), row = { id, server: sv, category: cat || (cache.config.categories.find((c) => c.server === sv) || {}).id, name: name.trim().replace(/\s+/g, '-').toLowerCase() || 'channel', kind };
    cache.config.channels.push(row); emit();
    push(update('config.json', (c) => { c.channels.push(row); return c; }, `Add #${row.name}`, seedConfig()));
    return id;
  },
  updateServer(id, patch) {
    const s = cache.config.servers.find((x) => x.id === id); if (s) Object.assign(s, patch); emit();
    push(update('config.json', (c) => { const t = c.servers.find((x) => x.id === id); if (t) Object.assign(t, patch); return c; }, 'Update the server', seedConfig()));
  },
  updateChannel(id, patch) {
    const ch = cache.config.channels.find((x) => x.id === id); if (ch) Object.assign(ch, patch); emit();
    push(update('config.json', (c) => { const t = c.channels.find((x) => x.id === id); if (t) Object.assign(t, patch); return c; }, 'Update the channel', seedConfig()));
  },
  updateCategory(id, patch) {
    const ct = cache.config.categories.find((x) => x.id === id); if (ct) Object.assign(ct, patch); emit();
    push(update('config.json', (c) => { const t = c.categories.find((x) => x.id === id); if (t) Object.assign(t, patch); return c; }, 'Update the category', seedConfig()));
  },
  removeChannel(id) {
    cache.config.channels = cache.config.channels.filter((c) => c.id !== id); emit();
    push(update('config.json', (c) => { c.channels = c.channels.filter((x) => x.id !== id); return c; }, 'Remove a channel', seedConfig()));
  },
  removeCategory(id) {
    cache.config.categories = cache.config.categories.filter((c) => c.id !== id);
    cache.config.channels = cache.config.channels.filter((c) => c.category !== id); emit();
    push(update('config.json', (c) => { c.categories = c.categories.filter((x) => x.id !== id); c.channels = c.channels.filter((x) => x.category !== id); return c; }, 'Remove a category', seedConfig()));
  },
  removeServer(id) {
    cache.config.servers = cache.config.servers.filter((s) => s.id !== id);
    cache.config.categories = cache.config.categories.filter((c) => c.server !== id);
    cache.config.channels = cache.config.channels.filter((c) => c.server !== id); emit();
    push(update('config.json', (c) => { c.servers = c.servers.filter((x) => x.id !== id); c.categories = c.categories.filter((x) => x.server !== id); c.channels = c.channels.filter((x) => x.server !== id); return c; }, 'Remove a server', seedConfig()));
  },

  // messages
  messages: (id) => (cache?.msgs[id] || []).map(dress),
  send(id, msg) {
    const m = { id: uid(), ts: Date.now(), ...msg, user: msg.user && msg.user.bot ? msg.user : stampOf() };
    appendLocal(cache.msgs, id, m);
    push(update(chanPath(id), (f) => ({ messages: merge(f.messages, [m]) }), 'A message', { messages: [] }).then((f) => { if (f) cache.msgs[id] = f.messages; }));
    return true;
  },
  clear(id) { cache.msgs[id] = []; emit(); push(update(chanPath(id), () => ({ messages: [] }), 'Clear a channel', { messages: [] })); },

  // direct messages
  dmList: () => Object.entries(cache?.dmIndex || {}).map(([id, d]) => ({ id, user: other(d) })),
  dm: (id) => (cache?.dms[id] || []).map(dress),
  dmUser: (id) => other((cache?.dmIndex || {})[id]),
  ensureDM(user) {
    const them = user.login || user.id, id = 'dm_' + [auth.login, them].sort().join('__');
    if (!cache.dmIndex[id]) {
      const row = { users: [auth.login, them], names: { [them]: user.name }, updated: Date.now() };
      cache.dmIndex[id] = row; emit();
      push(update('dms.json', (f) => { f[id] = row; return f; }, 'Start a DM', {}));
    }
    return id;
  },
  sendDM(id, msg) {
    const m = { id: uid(), ts: Date.now(), ...msg, user: msg.user && msg.user.bot ? msg.user : stampOf() };
    appendLocal(cache.dms, id, m);
    push(update(dmPath(id), (f) => ({ messages: merge(f.messages, [m]) }), 'A direct message', { messages: [] }).then((f) => { if (f) cache.dms[id] = f.messages; }));
    return true;
  },

  // friends (one file each, so two people never clash)
  friends: () => (cache?.friends || []).map((f) => ({ ...f, ...(cache.profiles[f.id] || {}), id: f.id })),
  addFriend(user) {
    const id = user.login || user.id;
    if ((cache.friends || []).some((f) => f.id === id)) return;
    const row = { id, name: user.name || id, color: user.color, status: user.status || 'offline' };
    cache.friends.push(row); emit();
    push(update(`friends/${auth.login}.json`, (f) => { f.friends = [...(f.friends || []).filter((x) => x.id !== id), row]; return f; }, 'Add a friend', { friends: [] }));
  },
  removeFriend(id) {
    cache.friends = (cache.friends || []).filter((f) => f.id !== id); emit();
    push(update(`friends/${auth.login}.json`, (f) => { f.friends = (f.friends || []).filter((x) => x.id !== id); return f; }, 'Remove a friend', { friends: [] }));
  },

  // your profile and stickers live in profiles.json, under your login
  profile: (login) => (cache?.profiles || {})[login] || null,
  myProfile: () => (auth ? (cache?.profiles || {})[auth.login] || {} : {}),
  setProfile(patch) {
    cache.profiles[auth.login] = { ...(cache.profiles[auth.login] || {}), ...patch }; emit();
    push(update('profiles.json', (f) => { f[auth.login] = { ...(f[auth.login] || {}), ...patch }; return f; }, 'Update my profile', {}));
  },
  stickers: () => (((cache?.profiles || {})[auth?.login] || {}).stickers || []).slice(),
  addSticker(s) { const list = [...GitHubStore.stickers(), { id: 's_' + uid(), ...s }]; GitHubStore.setProfile({ stickers: list }); },
  removeSticker(id) { GitHubStore.setProfile({ stickers: GitHubStore.stickers().filter((x) => x.id !== id) }); },

  members: () => Object.entries(cache?.profiles || {}).map(([login, p]) => ({ id: login, ...p, name: p.name || login, me: login === auth?.login })),
  syncNow: () => push(tick()),
  dump: () => JSON.stringify({ config: cache?.config, profiles: cache?.profiles, dmIndex: cache?.dmIndex }, null, 2),
};
function other(d) {
  if (!d) return null;
  const them = (d.users || []).find((u) => u !== auth?.login) || (d.users || [])[0];
  const p = (cache?.profiles || {})[them] || {};
  return { id: them, login: them, name: p.name || (d.names || {})[them] || them, color: p.color, avatar: p.avatar, status: p.status };
}
