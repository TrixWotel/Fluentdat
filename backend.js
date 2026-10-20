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
// while a sign-in is being picked up
const waiting = {
  servers: () => [], server: () => null, dmList: () => [], friends: () => [], stickers: () => [], account: () => null,
  syncState: () => ({ loading: true, error: '', lastSync: 0, repo: '' }),
};

export const Store = new Proxy({}, {
  get(_t, prop) {
    switch (prop) {
      case 'onChange': return (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
      case 'kind': return impl === SupabaseStore ? 'supabase' : impl === GitHubStore ? 'github' : 'local';
      case 'signedIn': return impl !== LocalStore;
      case 'configured': return SupabaseStore.configured();
      case 'resuming': return resuming;
      case 'resumeError': return resumeError;
      case 'signIn': return async (token) => { const r = await GitHubStore.signIn(token); impl = GitHubStore; emit(); return r; };
      case 'signInEmail': return (email) => SupabaseStore.signInEmail(email);
      case 'signInOAuth': return (provider) => SupabaseStore.signInOAuth(provider);
      case 'verifyEmailCode': return async (email, code) => { await SupabaseStore.verifyEmailCode(email, code); impl = SupabaseStore; emit(); return SupabaseStore.account(); };
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
