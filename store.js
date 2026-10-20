// Fluentdat's data, kept in this browser for now (localStorage). It's written behind a small interface so the same app
// can later save to GitHub instead (a private repo), the way Fluent's Obsidian vault syncs — only the functions here
// would change, not the rest of the app. Data also travels between this site's open tabs (the 'storage' event), so you
// can try two windows side by side. Model: servers hold categories, categories hold channels; plus direct messages,
// a friends list, and the stickers you make.
const KEY = 'fluency.data.v2';

const now = () => Date.now();
const uid = () => (now().toString(36) + Math.random().toString(36).slice(2, 7));

function seed() {
  const g = 'c_general', b = 'c_build', r = 'c_random', v = 'c_voice';
  const flubot = { id: 'flubot', name: 'Flubot', color: '#5b7fd6', bot: true, status: 'online' };
  return {
    servers: [{ id: 's_robotics', name: 'Robotics', icon: 'bot' }],
    categories: [
      { id: 'cat_text', server: 's_robotics', name: 'Text Channels' },
      { id: 'cat_voice', server: 's_robotics', name: 'Voice Channels' },
    ],
    channels: [
      { id: g, server: 's_robotics', category: 'cat_text', name: 'general', kind: 'text' },
      { id: b, server: 's_robotics', category: 'cat_text', name: 'build-log', kind: 'text' },
      { id: r, server: 's_robotics', category: 'cat_text', name: 'random', kind: 'text' },
      { id: v, server: 's_robotics', category: 'cat_voice', name: 'Meeting', kind: 'voice' },
    ],
    messages: {
      [g]: [{ id: uid(), user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text: 'Welcome to **Fluentdat** — your own chat. Type `/help` to see what it can do.', ts: now() }],
      [b]: [], [r]: [], [v]: [],
    },
    stickers: [],
    friends: [flubot],
    dms: { dm_flubot: { user: flubot, messages: [{ id: uid(), user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text: 'Hey! This is a direct message. Real DMs with teammates come with accounts — for now you can chat with me here.', ts: now() }] } },
  };
}

let data = null;
const listeners = new Set();
function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch { data = null; }
  if (!data || !data.servers) { data = seed(); save(); }
  return data;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
function emit() { for (const cb of listeners) try { cb(); } catch {} }
addEventListener('storage', (e) => { if (e.key === KEY) { data = null; load(); emit(); } });

export const LocalStore = {
  backend: 'this browser',
  init: () => load(),
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },

  // servers, categories, channels
  servers: () => load().servers.slice(),
  server: (id) => load().servers.find((s) => s.id === id) || null,
  categories: (serverId) => load().categories.filter((c) => c.server === serverId),
  channels: (serverId) => load().channels.filter((c) => c.server === serverId),
  channel: (id) => load().channels.find((c) => c.id === id) || null,
  addServer(name, icon) { const d = load(), id = 's_' + uid(); d.servers.push({ id, name: name.trim() || 'New Server', icon: icon || '' }); const cat = 'cat_' + uid(); d.categories.push({ id: cat, server: id, name: 'Text Channels' }); const ch = 'c_' + uid(); d.channels.push({ id: ch, server: id, category: cat, name: 'general', kind: 'text' }); d.messages[ch] = []; save(); emit(); return id; },
  addCategory(serverId, name) { const d = load(), id = 'cat_' + uid(); d.categories.push({ id, server: serverId, name: name.trim() || 'New Category' }); save(); emit(); return id; },
  addChannel(serverId, categoryId, name, kind = 'text') {
    const d = load(), id = 'c_' + uid();
    d.channels.push({ id, server: serverId, category: categoryId || (d.categories.find((c) => c.server === serverId) || {}).id, name: name.trim().replace(/\s+/g, '-').toLowerCase() || 'channel', kind });
    d.messages[id] = []; save(); emit();
    return id;
  },
  removeChannel(id) { const d = load(); d.channels = d.channels.filter((c) => c.id !== id); delete d.messages[id]; save(); emit(); },
  updateServer(id, patch) { const d = load(), s = d.servers.find((x) => x.id === id); if (s) Object.assign(s, patch); save(); emit(); },
  updateChannel(id, patch) { const d = load(), c = d.channels.find((x) => x.id === id); if (c) Object.assign(c, patch); save(); emit(); },
  updateCategory(id, patch) { const d = load(), c = d.categories.find((x) => x.id === id); if (c) Object.assign(c, patch); save(); emit(); },
  removeCategory(id) { const d = load(); d.categories = d.categories.filter((c) => c.id !== id); for (const c of d.channels.filter((x) => x.category === id)) delete d.messages[c.id]; d.channels = d.channels.filter((c) => c.category !== id); save(); emit(); },
  removeServer(id) {
    const d = load();
    for (const c of d.channels.filter((x) => x.server === id)) delete d.messages[c.id];
    d.servers = d.servers.filter((s) => s.id !== id); d.categories = d.categories.filter((c) => c.server !== id); d.channels = d.channels.filter((c) => c.server !== id);
    save(); emit();
  },

  // messages
  messages: (channelId) => (load().messages[channelId] || []).slice(),
  send(channelId, msg) { const d = load(); (d.messages[channelId] = d.messages[channelId] || []).push({ id: uid(), ts: now(), ...msg }); save(); emit(); return true; },
  clear(channelId) { const d = load(); d.messages[channelId] = []; save(); emit(); },

  // direct messages
  dmList: () => Object.entries(load().dms || {}).map(([id, d]) => ({ id, user: d.user })),
  dm: (id) => ((load().dms || {})[id] || {}).messages?.slice() || [],
  dmUser: (id) => ((load().dms || {})[id] || {}).user || null,
  ensureDM(user) { const d = load(); d.dms = d.dms || {}; const id = 'dm_' + user.id; if (!d.dms[id]) { d.dms[id] = { user, messages: [] }; save(); emit(); } return id; },
  sendDM(id, msg) { const d = load(); if (!d.dms[id]) return false; d.dms[id].messages.push({ id: uid(), ts: now(), ...msg }); save(); emit(); return true; },

  // friends
  friends: () => (load().friends || []).slice(),
  addFriend(user) { const d = load(); d.friends = d.friends || []; if (!d.friends.some((f) => f.id === user.id)) { d.friends.push(user); save(); emit(); } },
  removeFriend(id) { const d = load(); d.friends = (d.friends || []).filter((f) => f.id !== id); save(); emit(); },

  // stickers you make
  stickers: () => (load().stickers || []).slice(),
  addSticker(s) { const d = load(); (d.stickers = d.stickers || []).push({ id: 's_' + uid(), ...s }); save(); emit(); },
  removeSticker(id) { const d = load(); d.stickers = (d.stickers || []).filter((x) => x.id !== id); save(); emit(); },

  dump: () => JSON.stringify(load(), null, 2),
  reset() { data = seed(); save(); emit(); },
};
