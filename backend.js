// Where Fluentdat keeps things. Three of them, with the same shape, so the app never has to care which is in use:
//   LocalStore     this browser only (store.js) — what you get before signing in
//   SupabaseStore  Supabase (supabase.js) — sign in with email, Discord or GitHub; messages arrive live
//   GitHubStore    a private GitHub repo (github.js) — the older way: sign in by pasting a GitHub token
// The app talks to `Store`, which forwards to whichever is live and tells the app when anything changes.
import { LocalStore } from './store.js';
import { GitHubStore } from './github.js';
import { SupabaseStore } from './supabase.js';

let impl = LocalStore;
let resuming = SupabaseStore.pending();      // picking up a Supabase sign-in: show nothing local in the meantime
let resumeError = '';
const listeners = new Set();
const emit = () => { for (const cb of listeners) try { cb(); } catch {} };
// new messages, calls and trades (Supabase only): the app listens here from the start, before any sign-in is picked up
const messageListeners = new Set(), callListeners = new Set(), tradeListeners = new Set();
SupabaseStore.onMessage((e) => { if (impl === SupabaseStore) for (const cb of messageListeners) try { cb(e); } catch {} });
SupabaseStore.onCall((e) => { if (impl === SupabaseStore) for (const cb of callListeners) try { cb(e); } catch {} });
SupabaseStore.onTrade((e) => { if (impl === SupabaseStore) for (const cb of tradeListeners) try { cb(e); } catch {} });
for (const s of [LocalStore, GitHubStore, SupabaseStore]) s.onChange(() => {
  // signed out somewhere else (another tab), or the session ran out: back to this browser's own data
  if (s === SupabaseStore && impl === SupabaseStore && !SupabaseStore.account()) { impl = LocalStore; emit(); return; }
  if (impl === s) emit();
});

// things not every storage has — harmless answers when the live one doesn't
const fallback = {
  account: () => null,
  syncState: () => ({ loading: false, error: '', lastSync: 0, repo: '' }),
  setActive: () => {},
  members: () => null,                       // (the app works it out from you + your friends)
  profile: () => null,
  myProfile: () => ({}),
  setProfile: () => {},
  updateServer: () => {}, updateChannel: () => {}, updateCategory: () => {},
  removeCategory: () => {}, removeServer: () => {},
  syncNow: () => {},
  reset: () => {},
  role: () => 'owner',                       // (in your own browser, everything is yours)
  canManage: () => true,
  createInvite: async () => { throw new Error('Sign in with email, Discord or GitHub to make invites.'); },
  joinServer: async () => { throw new Error('Sign in with email, Discord or GitHub to join a server.'); },
  setMemberRole: async () => {},
  removeMember: async () => {},
  leaveServer: async () => {},
  // (these need people to share with, so they come with signing in)
  memberColor: () => '',
  memberIcon: () => null,
  roles: () => [],
  addRole: async () => { throw new Error(SIGN_IN + 'make roles.'); },
  updateRole: () => {}, removeRole: () => {},
  giveRole: async () => { throw new Error(SIGN_IN + 'give people roles.'); },
  discover: async () => { throw new Error(SIGN_IN + 'browse public servers.'); },
  joinPublic: async () => { throw new Error(SIGN_IN + 'join public servers.'); },
  ban: async () => { throw new Error(SIGN_IN + 'ban people.'); },
  bans: async () => [],
  unban: async () => {},
  profileFull: async () => null,
  mutualServers: () => 0,
  mutualServerList: () => [],
  mutualFriends: async () => [],
  friendSince: () => 0,
  blockedIds: () => [],
  reactions: () => new Map(),
  react: async () => { throw new Error(SIGN_IN + 'react to messages.'); },
  styled: () => false,
  // a category's permissions (in your own browser, everything is yours)
  can: () => true,
  canAnywhere: () => true,
  categoryPerms: () => [],
  setCategoryPerm: async () => { throw new Error(SIGN_IN + 'set permissions.'); },
  removeCategoryPerm: async () => {},
  moveCategories: (sv, ids) => ids.forEach((id, i) => Store.updateCategory(id, { position: i })),
  // your profile's Connections, Board and recent games ('me': kept in this browser; nobody else's are known here)
  profileExtras: async (id) => (id === 'me' ? localExtras() : blankExtras()),
  extrasNow: (id) => (id === 'me' ? localExtras() : null),
  setProfileExtras: async (patch) => saveExtras(patch),
  setPlaying: (g) => { if (g) { const was = localExtras().activity.filter((x) => x.n !== g.n); saveExtras({ activity: [{ ...g, at: new Date().toISOString() }, ...was].slice(0, 10) }); } },
  canPlay: () => true,
  identities: () => [],
  linkAccount: async () => { throw new Error(SIGN_IN + 'link your accounts.'); },
  canDecorate: () => true,
  canFrame: () => true,
  canWikiGames: () => true,
  // (Datbux signed out: the app keeps a wallet of its own in this browser; sending and trading come with signing in)
  canBux: () => false, canBundles: () => false, bundles: () => [], sales: () => [], canBadgeLog: () => true, buyBundle: async () => { throw new Error(SIGN_IN + 'buy bundles.'); }, onTrade: () => () => {}, wallet: () => null, priceOf: () => null, owns: () => false, ownedList: () => [], trades: () => [],
  ownedBy: async () => [], buxLog: async () => [],
  // (settings follow an account only when signed in: here they're this browser's)
  canSync: () => false, settings: () => null, saveSettings: async () => 0,
  sendBux: async () => { throw new Error(SIGN_IN + 'send Datbux.'); },
  offerTrade: async () => { throw new Error(SIGN_IN + 'trade.'); },
  // (badges here are worked out by the app from what's in this browser)
  badgeStats: async () => null, badgeStatsNow: () => null,
  // a server's events: these come with signing in
  events: () => [],
  canMakeEvents: () => false,
  addEvent: async () => { throw new Error(SIGN_IN + 'make events.'); },
  updateEvent: async () => { throw new Error(SIGN_IN + 'change events.'); },
  removeEvent: async () => {},
  setInterested: async () => { throw new Error(SIGN_IN + 'say you’re interested.'); },
  // threads, pins, boosts, server nicknames and DM privacy: these come with signing in
  threads: () => [], threadInfo: () => null, threadsInfo: async () => {},
  createThread: async () => { throw new Error(SIGN_IN + 'start threads.'); },
  editThread: async () => {},
  pins: () => [], pinned: () => false, canPin: () => false, pinnedMessages: async () => [],
  pin: async () => { throw new Error(SIGN_IN + 'pin messages.'); },
  boosts: () => [], boostLevel: () => 0, myBoost: () => null, canPaidBoosts: () => false, canPlates: () => true,
  boostFor: async () => { throw new Error(SIGN_IN + 'boost servers.'); }, stopBoost: async () => {}, setBoostAuto: async () => {}, renewBoosts: async () => 0, claimQuestReward: async () => null,
  boost: async () => { throw new Error(SIGN_IN + 'boost servers.'); },
  nickIn: () => '', serverDMs: () => true,
  setNick: async () => { throw new Error(SIGN_IN + 'set a nickname in a server.'); },
  setServerDMs: async () => { throw new Error(SIGN_IN + 'change who can message you.'); },
  // searching what's kept in this browser
  searchServer: async (sv, o = {}) => localSearch(Store.channels(sv).map((c) => [c.id, Store.messages(c.id)]), o),
  searchDM: async (dm, o = {}) => localSearch([[dm, Store.dm(dm)]], o),
  searchAllDMs: async (o = {}) => localSearch(Store.dmList().map((d) => [d.id, Store.dm(d.id)]), o),
  adoptTag: async () => { throw new Error(SIGN_IN + 'wear a server tag.'); },
  tagInfo: async () => null,
  findUser: async () => null,
  changePassword: async () => { throw new Error('Sign in first.'); },
  // blocking, reports, server emoji and stickers, and Fluentdat's own one-time links: these come with signing in
  blocked: () => false,
  block: async () => { throw new Error(SIGN_IN + 'block people.'); },
  unblock: async () => {},
  report: async () => { throw new Error(SIGN_IN + 'report something.'); },
  isAppAdmin: () => false, canStaff: () => false, banned: () => null, canPrivacy: () => false, canAccount: () => false,
  // (linked channels join servers other people run, so they come with signing in)
  canLinks: () => false, linkedWith: () => -1, linkInfo: async () => [],
  linkChannel: async () => { throw new Error(SIGN_IN + 'link channels.'); }, joinLink: async () => { throw new Error(SIGN_IN + 'link channels.'); },
  unlinkChannel: async () => {}, newLinkCode: async () => '',
  canDiscord: () => false, discordReady: async () => ({ ready: false, bot: '' }), discordInfo: async () => [],
  linkDiscord: async () => { throw new Error(SIGN_IN + 'link Discord channels.'); }, unlinkDiscord: async () => {}, retryDiscord: async () => {},
  markUnread: () => {},
  emojiAll: () => [], serverEmoji: () => [], serverStickers: () => [], expressionUrl: () => '',
  addEmoji: async () => { throw new Error(SIGN_IN + 'add server emoji.'); },
  addServerSticker: async () => { throw new Error(SIGN_IN + 'add server stickers.'); },
  person: () => null,
  myId: () => null,
  needsSetup: () => false,
  loaded: () => true,
  readAt: () => 0,
  // friend requests, unread counts, muting, groups, calls, files: these come with signing in
  friendRequests: () => ({ incoming: [], outgoing: [] }),
  friendState: (id) => (Store.friends().some((f) => f.id === id) ? 'friend' : 'none'),
  acceptFriend: async () => {}, ignoreFriend: async () => {}, cancelFriend: async () => {}, refreshFriends: () => {},
  unread: () => ({ unread: 0, mentions: 0, last: 0 }),
  markRead: () => {}, markServerRead: async () => {},
  placeSettings: () => ({ muted: false, mutedUntil: 0, notify: 'default' }),
  setPlaceSettings: () => {},
  dmInfo(id) { const u = Store.dmUser(id); return u ? { id, kind: 'dm', user: u, people: [u] } : null; },
  createGroup: async () => { throw new Error(SIGN_IN + 'make group DMs.'); },
  addToGroup: async () => { throw new Error(SIGN_IN + 'make group DMs.'); },
  leaveGroup: async () => {}, removeFromGroup: async () => {}, updateGroup: () => {},
  startCall: async () => { throw new Error(SIGN_IN + 'call people.'); },
  endCall: () => {}, calls: () => [], call: () => null,
  voice: () => ({}), voiceAll: () => ({}), setVoice: () => {},
  inviteInfo: async () => null,
  uploadFile: async () => { throw new Error(SIGN_IN + 'send files.'); },
  fileUrl: async (p) => p, downloadUrl: async (p) => p,
  // a template's categories and channels, one at a time (stores that can, do it in one go)
  applyTemplate: async (sv, tpl) => {
    for (const c of tpl) {
      const have = Store.categories(sv).find((x) => x.name.toLowerCase() === c.name.toLowerCase());
      const cat = have ? have.id : await Store.addCategory(sv, c.name);
      for (const [name, kind] of c.channels) if (!Store.channels(sv).some((x) => x.name === name && x.category === cat)) await Store.addChannel(sv, cat, name, kind || 'text');
    }
  },
};
const SIGN_IN = 'Sign in with Discord, GitHub or email to ';
// search through messages kept here: [[place, messages]] → the newest 25 that match (words, from, has, in, before)
function localSearch(places, o) {
  const q = String(o.q || '').toLowerCase(), out = [];
  for (const [place, list] of places) {
    if (o.in && o.in !== place) continue;
    for (const m of list || []) {
      if (m.call || (o.before && m.ts >= o.before) || (o.from && (m.user || {}).id !== o.from)) continue;
      const files = m.files || [], text = String(m.text || '');
      if (q && !text.toLowerCase().includes(q) && !files.some((f) => String(f.name || '').toLowerCase().includes(q))) continue;
      if (o.has === 'link' && !/https?:\/\//i.test(text)) continue;
      if (['file', 'image', 'video'].includes(o.has) && !files.some((f) => o.has === 'file' || f.kind === o.has)) continue;
      out.push({ ...m, place });
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 25);
}
const EXTRAS = 'fluentdat.extras';
const blankExtras = () => ({ connections: [], widgets: [], activity: [], quests: [], badges: { order: [], hidden: [] }, playSeconds: 0, badgeLog: {} });
function localExtras() {
  try {
    const v = JSON.parse(localStorage.getItem(EXTRAS)) || {}, b = v.badges && typeof v.badges === 'object' ? v.badges : {};
    return { connections: Array.isArray(v.connections) ? v.connections : [], widgets: Array.isArray(v.widgets) ? v.widgets : [], activity: Array.isArray(v.activity) ? v.activity : [],
      quests: Array.isArray(v.quests) ? v.quests : [], badges: { order: Array.isArray(b.order) ? b.order : [], hidden: Array.isArray(b.hidden) ? b.hidden : [] }, playSeconds: 0,
      badgeLog: v.badgeLog && typeof v.badgeLog === 'object' && !Array.isArray(v.badgeLog) ? v.badgeLog : {} };
  }
  catch { return blankExtras(); }
}
function saveExtras(patch) {
  const next = { ...localExtras(), ...patch };
  try { localStorage.setItem(EXTRAS, JSON.stringify(next)); } catch { throw new Error('This browser has no room left for that (try fewer pictures).'); }
  emit(); return next;
}
// while a sign-in is being picked up
const waiting = {
  servers: () => [], server: () => null, dmList: () => [], friends: () => [], stickers: () => [], account: () => null,
  friendRequests: () => ({ incoming: [], outgoing: [] }), unread: () => ({ unread: 0, mentions: 0, last: 0 }), voice: () => ({}), dmInfo: () => null,
  syncState: () => ({ loading: true, error: '', lastSync: 0, repo: '' }),
};

export const Store = new Proxy({}, {
  get(_t, prop) {
    switch (prop) {
      case 'onChange': return (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
      case 'onMessage': return (cb) => { messageListeners.add(cb); return () => messageListeners.delete(cb); };
      case 'onCall': return (cb) => { callListeners.add(cb); return () => callListeners.delete(cb); };
      case 'onTrade': return (cb) => { tradeListeners.add(cb); return () => tradeListeners.delete(cb); };
      case 'kind': return impl === SupabaseStore ? 'supabase' : impl === GitHubStore ? 'github' : 'local';
      case 'signedIn': return impl !== LocalStore;
      case 'configured': return SupabaseStore.configured();
      case 'resuming': return resuming;
      case 'resumeError': return resumeError;
      case 'signIn': return async (token) => { const r = await GitHubStore.signIn(token); impl = GitHubStore; emit(); return r; };
      case 'signInEmail': return (email) => SupabaseStore.signInEmail(email);
      case 'signInOAuth': return (provider) => SupabaseStore.signInOAuth(provider);
      case 'providers': return () => SupabaseStore.providers();
      case 'verifyEmailCode': return async (email, code) => { await SupabaseStore.verifyEmailCode(email, code); impl = SupabaseStore; emit(); return SupabaseStore.account(); };
      // a username and password (an account made from a one-time link), or making one with that link
      case 'signInUsername': return async (handle, pw) => { const a = await SupabaseStore.signInUsername(handle, pw); impl = SupabaseStore; emit(); return a; };
      case 'signInAny': return async (who, pw) => { const a = await SupabaseStore.signInAny(who, pw); impl = SupabaseStore; emit(); return a; };
      case 'redeemAppInvite': return async (code, handle, pw, name) => { const a = await SupabaseStore.redeemAppInvite(code, handle, pw, name); impl = SupabaseStore; emit(); return a; };
      case 'appInviteCheck': return (code) => SupabaseStore.appInviteCheck(code);
      case 'signOut': return async () => {
        if (impl === SupabaseStore) await SupabaseStore.signOut(); else GitHubStore.signOut();
        impl = LocalStore; emit();
      };
    }
    if (resuming && prop in waiting) return waiting[prop];
    const v = impl[prop];
    if (v === undefined && prop in fallback) return fallback[prop];
    return typeof v === 'function' ? v.bind(impl) : v;
  },
  has: (_t, prop) => prop in impl || prop in fallback,
});

// still signed in from last time? (a GitHub token is known straight away; Supabase checks with the server)
if (GitHubStore.resume()) impl = GitHubStore;
export const ready = SupabaseStore.resume()
  .then((ok) => { if (ok) impl = SupabaseStore; else resumeError = SupabaseStore.syncState().error || ''; return ok; })
  .catch((e) => { resumeError = String((e && e.message) || e); return false; })
  .finally(() => { resuming = false; emit(); });
