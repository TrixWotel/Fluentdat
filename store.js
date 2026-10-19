// Fluentdat's data, kept in this browser for now (localStorage). It's written behind a small interface so the same app
// can later save to GitHub instead (a private repo, one message = one commit), the way Fluent's Obsidian vault syncs —
// only the few functions here would change, not the rest of the app. Messages also travel between this site's open tabs
// (the 'storage' event), so you can try two windows side by side.
const KEY = 'fluency.data.v1';

const now = () => Date.now();
const uid = () => (now().toString(36) + Math.random().toString(36).slice(2, 7));

function seed() {
  const g = 'c_general', b = 'c_build', r = 'c_random', v = 'c_voice';
  return {
    servers: [{ id: 's_robotics', name: 'Robotics', icon: '🤖' }],
    channels: [
      { id: g, server: 's_robotics', name: 'general', kind: 'text' },
      { id: b, server: 's_robotics', name: 'build-log', kind: 'text' },
      { id: r, server: 's_robotics', name: 'random', kind: 'text' },
      { id: v, server: 's_robotics', name: 'Meeting', kind: 'voice' },
    ],
    messages: {
      [g]: [{ id: uid(), user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text: 'Welcome to **Fluentdat** — your own chat. Type `/help` to see what it can do.', ts: now() }],
      [b]: [], [r]: [], [v]: [],
    },
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
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* (private window: stays in memory) */ } }
function emit() { for (const cb of listeners) try { cb(); } catch {} }

// other tabs of this site, writing the same store
addEventListener('storage', (e) => { if (e.key === KEY) { data = null; load(); emit(); } });

export const Store = {
  backend: 'this browser',
  init: () => load(),
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },

  servers: () => load().servers.slice(),
  channels: (serverId) => load().channels.filter((c) => c.server === serverId),
  channel: (id) => load().channels.find((c) => c.id === id) || null,
  messages: (channelId) => (load().messages[channelId] || []).slice(),

  send(channelId, msg) {
    const d = load();
    (d.messages[channelId] = d.messages[channelId] || []).push({ id: uid(), ts: now(), ...msg });
    save(); emit();
    return true;
  },
  clear(channelId) { const d = load(); d.messages[channelId] = []; save(); emit(); },

  addChannel(serverId, name, kind = 'text') {
    const d = load(), id = 'c_' + uid();
    d.channels.push({ id, server: serverId, name: name.trim().replace(/\s+/g, '-').toLowerCase() || 'channel', kind });
    d.messages[id] = []; save(); emit();
    return id;
  },
  removeChannel(id) {
    const d = load();
    d.channels = d.channels.filter((c) => c.id !== id); delete d.messages[id];
    save(); emit();
  },

  // everything, to hand off to a real backend later
  dump: () => JSON.stringify(load(), null, 2),
  reset() { data = seed(); save(); emit(); },
};
