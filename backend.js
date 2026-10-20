// Where Fluentdat keeps things. Two of them, with the same shape, so the app never has to care which is in use:
//   LocalStore   this browser only (store.js) — what you get before signing in
//   GitHubStore  a private GitHub repo (github.js) — shared with your team once you sign in
// The app talks to `Store`, which forwards to whichever is live and tells the app when anything changes.
import { LocalStore } from './store.js';
import { GitHubStore } from './github.js';

let impl = LocalStore;
const listeners = new Set();
const emit = () => { for (const cb of listeners) try { cb(); } catch {} };
LocalStore.onChange(() => { if (impl === LocalStore) emit(); });
GitHubStore.onChange(() => { if (impl === GitHubStore) emit(); });

// things only the GitHub side has — harmless answers when you're offline in this browser
const whenLocal = {
  account: () => null,
  syncState: () => ({ loading: false, error: '', lastSync: 0, repo: '' }),
  setActive: () => {},
  members: () => null,                      // (the app works it out from you + your friends)
  profile: () => null,
  myProfile: () => ({}),
  setProfile: () => {},
  updateServer: () => {}, updateChannel: () => {}, updateCategory: () => {},
  removeCategory: () => {}, removeServer: () => {},
  syncNow: () => {},
};

export const Store = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'onChange') return (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
    if (prop === 'signedIn') return impl === GitHubStore;
    if (prop === 'signIn') return async (token) => { const r = await GitHubStore.signIn(token); impl = GitHubStore; emit(); return r; };
    if (prop === 'signOut') return () => { GitHubStore.signOut(); impl = LocalStore; emit(); };
    const v = impl[prop];
    if (v === undefined && impl === LocalStore && prop in whenLocal) return whenLocal[prop];
    return typeof v === 'function' ? v.bind(impl) : v;
  },
  has: (_t, prop) => prop in impl || prop in whenLocal,
});

// already signed in from last time? pick the GitHub side straight away
if (GitHubStore.resume()) impl = GitHubStore;
