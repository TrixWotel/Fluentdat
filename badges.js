// Badges, like Discord's: earned by doing things in Fluentdat, each with levels (tiers) that change its colour. What a
// badge is made of comes from the database (badge_stats: it counts, for people who know each other), or, signed out,
// from what's kept in this browser. The pictures are Fluentdat's own.

// a level's colours (light, dark), from the first to the sixth
const TIER_COLORS = [['#f2b27a', '#a5622e'], ['#eef2f7', '#8793a6'], ['#ffe27d', '#cf8b14'], ['#86f2c4', '#1c9a66'], ['#94d3ff', '#2c6ad3'], ['#e6bfff', '#8742dd']];
const STAFF_COLORS = ['#a3adff', '#4d58d6'];
export const RARITY = [['Common', '#a4acb9'], ['Uncommon', '#3ec27b'], ['Rare', '#5d7cff'], ['Epic', '#b05cff'], ['Legendary', '#ff9b2e'], ['Mythic', '#ff4fa3']];

// the pictures (on a 32 grid): `f` is filled with the badge's colours, light marks are drawn over it
const GLYPH = {
  chatter: (f) => `<path fill="${f}" d="M5 7.5A3.5 3.5 0 0 1 8.5 4h15A3.5 3.5 0 0 1 27 7.5v10a3.5 3.5 0 0 1-3.5 3.5H16l-6 5.2c-.7.6-1.7.1-1.7-.8V21A3.5 3.5 0 0 1 5 17.5z"/>
    <g fill="#fff" opacity=".85"><circle cx="11" cy="12.5" r="1.9"/><circle cx="16" cy="12.5" r="1.9"/><circle cx="21" cy="12.5" r="1.9"/></g>`,
  gametime: (f) => `<path fill="${f}" d="M9.5 9h13a6.5 6.5 0 0 1 6.3 8.1l-1 3.9a3.2 3.2 0 0 1-5.4 1.4L19.8 20h-7.6l-2.6 2.4a3.2 3.2 0 0 1-5.4-1.4l-1-3.9A6.5 6.5 0 0 1 9.5 9z"/>
    <g fill="#fff" opacity=".85"><path d="M10 12h2v2h2v2h-2v2h-2v-2H8v-2h2z"/><circle cx="21.5" cy="13.4" r="1.5"/><circle cx="24.3" cy="16.2" r="1.5"/></g>`,
  time: (f) => `<path fill="${f}" d="M9.5 5h13v1.2c0 4.3-3.7 6.6-5.3 9.8 1.6 3.2 5.3 5.5 5.3 9.8V27h-13v-1.2c0-4.3 3.7-6.6 5.3-9.8C13.2 12.8 9.5 10.5 9.5 6.2z"/>
    <rect fill="${f}" x="7" y="3" width="18" height="2.6" rx="1.3"/><rect fill="${f}" x="7" y="26.4" width="18" height="2.6" rx="1.3"/>
    <path fill="#fff" opacity=".8" d="M12.6 25.2h6.8c-.7-2.4-2.4-3.6-3.4-4.9-1 1.3-2.7 2.5-3.4 4.9zM13.4 9h5.2c-.6 1.4-1.6 2.4-2.6 3.5-1-1.1-2-2.1-2.6-3.5z"/>`,
  quester: (f) => `<path fill="${f}" d="M16 2.5l3.4 9.9L29.5 16l-10.1 3.6L16 29.5l-3.4-9.9L2.5 16l10.1-3.6z"/>
    <circle cx="16" cy="16" r="3.2" fill="#fff" opacity=".85"/>`,
  booster: (f) => `<path fill="${f}" d="M16 3l11 6.3v13.4L16 29 5 22.7V9.3z"/>
    <path d="M16 3v26M5 9.3l11 6.4 11-6.4M5 22.7l11-7 11 7" stroke="#fff" stroke-width="1.3" fill="none" opacity=".55"/>`,
  builder: (f) => `<path fill="${f}" d="M4 28V13h3.5v3h3v-3H14v3h4v-3h3.5v3h3v-3H28v15h-8.5v-5a3.5 3.5 0 0 0-7 0v5z"/>
    <path fill="${f}" d="M15 4.5h1.6v8.5H15z"/><path fill="#fff" opacity=".9" d="M16.6 4.5l5.4 2.1-5.4 2.1z"/>`,
  reactor: (f) => `<path fill="${f}" d="M16 27.5s-10.5-6.3-12.6-12.6C1.9 10.4 4.8 5.5 9.6 5.5c2.7 0 4.9 1.5 6.4 3.8 1.5-2.3 3.7-3.8 6.4-3.8 4.8 0 7.7 4.9 6.2 9.4C26.5 21.2 16 27.5 16 27.5z"/>
    <path fill="#fff" opacity=".7" d="M9.5 9.2c-1.9.3-3.2 2-3.1 3.9.1.7 1.1.7 1.2 0 .2-1.4 1-2.4 2.2-2.7.7-.2.5-1.3-.3-1.2z"/>`,
  weaver: (f) => `<rect fill="${f}" x="7" y="4" width="18" height="4.2" rx="1.6"/><rect fill="${f}" x="7" y="23.8" width="18" height="4.2" rx="1.6"/>
    <rect fill="${f}" x="9.6" y="8" width="12.8" height="16" rx="1"/>
    <path d="M9.6 11.5h12.8M9.6 15h12.8M9.6 18.5h12.8M9.6 22h12.8" stroke="#fff" stroke-width="1.2" opacity=".6"/>
    <path d="M22.4 20c3 0 5.6 1.6 5.6 4.5S25.5 29 23 29" stroke="${f}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  friendly: (f) => `<circle fill="${f}" cx="12" cy="11" r="5.2"/><path fill="${f}" d="M2.8 27c0-5.3 4.1-9 9.2-9s9.2 3.7 9.2 9z"/>
    <circle fill="${f}" cx="22.6" cy="12" r="4.3" opacity=".8"/><path fill="${f}" opacity=".8" d="M20.4 18.3c4.6-.7 8.8 2.6 8.8 7.7h-6.4c0-2.9-.9-5.4-2.4-7.7z"/>`,
  connected: (f) => `<g fill="none" stroke="${f}" stroke-width="3.6" stroke-linecap="round"><path d="M14.4 9.6l2.3-2.3a5.6 5.6 0 0 1 7.9 7.9l-2.3 2.3"/>
    <path d="M17.6 22.4l-2.3 2.3a5.6 5.6 0 0 1-7.9-7.9l2.3-2.3"/><path d="M12.8 19.2l6.4-6.4"/></g>`,
  collector: (f) => `<path fill="${f}" opacity=".55" d="M11 3h13a2 2 0 0 1 2 2v13h-2V5H11z"/>
    <path fill="${f}" d="M6 7.5A1.5 1.5 0 0 1 7.5 6h13A1.5 1.5 0 0 1 22 7.5V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>
    <rect x="9" y="10" width="10" height="7.5" rx="1.2" fill="#fff" opacity=".75"/><path d="M9.5 23h1.8M13 23h1.8M16.5 23h1.8" stroke="#fff" stroke-width="2" opacity=".6"/>`,
  host: (f) => `<rect fill="${f}" x="4.5" y="7" width="23" height="20.5" rx="3.4"/><rect fill="${f}" x="9" y="3.5" width="2.8" height="6.5" rx="1.4"/><rect fill="${f}" x="20.2" y="3.5" width="2.8" height="6.5" rx="1.4"/>
    <path fill="#fff" opacity=".85" d="M16 12.2l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"/>`,
  staff: (f) => `<path fill="${f}" d="M16 3l11 4v8.2c0 6.9-4.7 11.6-11 13.8-6.3-2.2-11-6.9-11-13.8V7z"/>
    <circle cx="16" cy="15.4" r="5.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-dasharray="25 9" transform="rotate(-80 16 15.4)"/><circle cx="16" cy="15.4" r="1.9" fill="#fff"/>`,
};

const DAY = 864e5;
const days = (s, now) => (s.since ? Math.max(0, Math.floor((now - Date.parse(s.since)) / DAY)) : 0);
const months = (from, now) => { const a = new Date(from), b = new Date(now); let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); if (b.getDate() < a.getDate()) m--; return Math.max(0, m); };
const addMonths = (t, n) => { const d = new Date(t); d.setMonth(d.getMonth() + n); return d.getTime(); };
const n = (s, k) => Number(s && s[k]) || 0;
export const fmt = (v) => Math.floor(v).toLocaleString('en-US');

// every badge: its name, what it counts (and how to say it), its levels (from how much, and their names), how to earn it
export const BADGES = [
  { id: 'chatter', name: 'Chatter', unit: ['message', 'messages'], value: (s) => n(s, 'messages'), line: (v) => `${fmt(v)} message${v === 1 ? '' : 's'} sent`,
    how: 'Write messages in your servers, DMs and groups to level up this badge (Flubot’s lines don’t count).',
    tiers: [[1, 'Hello World'], [50, 'Chatty'], [250, 'Talkative'], [1000, 'Storyteller'], [5000, 'Orator'], [20000, 'Living Legend']] },
  { id: 'gametime', name: 'Game Time', unit: ['hour', 'hours'], value: (s) => n(s, 'play_seconds') / 3600, line: (v) => `${fmt(v)} hour${Math.floor(v) === 1 ? '' : 's'} of games played`,
    how: 'Say what you’re playing (your Activity, or your profile’s Playing). Each game counts until you stop or switch, up to 12 hours a game.',
    tiers: [[1, 'Warm-up'], [5, 'Weekend Player'], [20, 'Regular'], [75, 'Committed'], [200, 'Serious'], [500, 'Marathoner']] },
  { id: 'time', name: 'Time Here', unit: ['day', 'days'], value: (s, now) => (s.since ? days(s, now) : -1), line: (v) => `${fmt(v)} day${v === 1 ? '' : 's'} on Fluentdat`,
    how: 'Stick around: this badge grows with how long you’ve had your account.', date: (s, t) => Date.parse(s.since) + t * DAY,
    tiers: [[0, 'Newcomer'], [30, 'Regular'], [180, 'Veteran'], [365, 'One Year Strong'], [730, 'Elder']] },
  { id: 'quester', name: 'Quester', unit: ['Quest', 'Quests'], value: (s) => n(s, 'quests'), line: (v) => `${fmt(v)} Quest${v === 1 ? '' : 's'} finished`,
    how: 'Finish Quests (Direct Messages → Quests) and claim their rewards.', tiers: [[1, 'Adventurer'], [3, 'Explorer'], [5, 'Hero'], [8, 'Champion']] },
  { id: 'booster', name: 'Server Booster', unit: ['month', 'months'], value: (s, now) => (s.boost_since ? months(s.boost_since, now) : -1),
    line: (v) => (v < 1 ? 'Boosting a server' : `Boosting for ${fmt(v)} month${v === 1 ? '' : 's'}`), date: (s, t) => addMonths(Date.parse(s.boost_since), t),
    how: 'Boost a server (its menu → Server Boost; it’s free). The longer you keep boosting, the higher it goes.',
    tiers: [[0, 'Booster'], [1, 'One Month'], [3, 'Three Months'], [6, 'Six Months'], [12, 'One Year'], [24, 'Two Years']] },
  { id: 'builder', name: 'Community Builder', unit: ['member', 'members'], value: (s) => n(s, 'members'), line: (v) => `${fmt(v)} member${v === 1 ? '' : 's'} in your biggest server`,
    how: 'Make a server and bring people in: it counts the members of the biggest server you own.', tiers: [[2, 'Founder'], [5, 'Host'], [10, 'Organizer'], [25, 'Leader'], [100, 'Icon']] },
  { id: 'reactor', name: 'Reactor', unit: ['reaction', 'reactions'], value: (s) => n(s, 'reactions'), line: (v) => `${fmt(v)} reaction${v === 1 ? '' : 's'}`,
    how: 'React to messages.', tiers: [[10, 'Fan'], [100, 'Cheerleader'], [500, 'Hype Machine'], [2500, 'Emoji Royalty']] },
  { id: 'weaver', name: 'Thread Weaver', unit: ['thread', 'threads'], value: (s) => n(s, 'threads'), line: (v) => `${fmt(v)} thread${v === 1 ? '' : 's'} started`,
    how: 'Start threads in your servers’ channels.', tiers: [[1, 'Spinner'], [10, 'Weaver'], [50, 'Master Weaver']] },
  { id: 'friendly', name: 'Friendly', unit: ['friend', 'friends'], value: (s) => n(s, 'friends'), line: (v) => `${fmt(v)} friend${v === 1 ? '' : 's'}`,
    how: 'Make friends: someone counts once you’ve both added each other.', tiers: [[1, 'Buddy'], [5, 'Pal'], [15, 'Social'], [50, 'Popular']] },
  { id: 'connected', name: 'Connected', unit: ['connection', 'connections'], value: (s) => n(s, 'connections'), line: (v) => `${fmt(v)} connection${v === 1 ? '' : 's'}`,
    how: 'Add your accounts elsewhere to your profile (Connections).', tiers: [[1, 'Linked'], [3, 'Networked'], [6, 'Everywhere']] },
  { id: 'collector', name: 'Game Collector', unit: ['game', 'games'], value: (s) => n(s, 'games'), line: (v) => `${fmt(v)} game${v === 1 ? '' : 's'} on the Board`,
    how: 'Put games you like on your Board (your full profile → Board).', tiers: [[1, 'Starter Shelf'], [5, 'Collector'], [10, 'Curator'], [20, 'Archivist']] },
  { id: 'host', name: 'Event Host', unit: ['event', 'events'], value: (s) => n(s, 'events'), line: (v) => `${fmt(v)} event${v === 1 ? '' : 's'} made`,
    how: 'Make events in your servers.', tiers: [[1, 'Planner'], [5, 'Host'], [20, 'Party Starter']] },
  { id: 'staff', name: 'Fluentdat Staff', unit: ['', ''], value: (s) => (s && s.staff ? 1 : null), line: () => 'Helps run Fluentdat', how: 'Given to the people who run Fluentdat.', tiers: [[1, 'Staff']] },
];
export const BADGE = Object.fromEntries(BADGES.map((b) => [b.id, b]));

// where someone is with a badge: their level (-1: not yet), what's next, and how far along they are
export function badgeState(def, stats, now = Date.now()) {
  if (!stats) return null;
  const v = def.value(stats, now);
  if (v == null) return null;
  let tier = -1;
  def.tiers.forEach(([at], i) => { if (v >= at) tier = i; });
  const next = def.tiers[tier + 1] || null, from = tier >= 0 ? def.tiers[tier][0] : 0;
  return { def, id: def.id, value: v, tier, name: tier >= 0 ? def.tiers[tier][1] : '', next, progress: next ? Math.max(0, Math.min(1, (v - from) / (next[0] - from || 1))) : 1,
    unlocked: tier >= 0 && def.date ? def.date(stats, def.tiers[tier][0]) : 0, rarity: RARITY[Math.min(RARITY.length - 1, Math.max(0, tier))] };
}
// all of someone's badges: the ones they have (in the order they chose, hidden ones left out unless asked), and the rest
export function badgesOf(stats, { order = [], hidden = [], all = false } = {}) {
  const states = BADGES.map((d) => badgeState(d, stats)).filter(Boolean);
  const have = states.filter((s) => s.tier >= 0), pos = (s) => { const i = order.indexOf(s.id); return i < 0 ? 1000 + BADGES.indexOf(s.def) : i; };
  have.sort((a, b) => pos(a) - pos(b));
  return { shown: all ? have : have.filter((s) => !hidden.includes(s.id)), have, todo: states.filter((s) => s.tier < 0) };
}
// a badge's picture, in its level's colours
let gid = 0;
export function badgeIcon(id, tier = 0, size = 22, { title = '' } = {}) {
  const g = GLYPH[id]; if (!g) return document.createElement('span');
  const [a, b] = id === 'staff' ? STAFF_COLORS : tier < 0 ? ['#6d7480', '#3d424b'] : TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)];
  const k = 'bdg' + ++gid, wrap = document.createElement('span');
  wrap.className = 'bdg-ic bdg-' + id + (tier < 0 ? ' locked' : '');
  wrap.innerHTML = `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${g(`url(#${k})`)}</svg>`;
  if (title) wrap.title = title;
  return wrap;
}
// "71 more hours", "2 more Quests" (to the next level)
export function toNext(st) {
  if (!st || !st.next) return '';
  const left = Math.max(0, st.next[0] - st.value), [one, many] = st.def.unit;
  if (st.def.id === 'gametime') { const h = Math.ceil(left); return `${fmt(h)} more hour${h === 1 ? '' : 's'} of games`; }
  if (st.def.id === 'booster' && st.tier < 0) return 'Boost any server';
  const k = Math.ceil(left);
  return `${fmt(k)} more ${k === 1 ? one : many}`;
}
// "1 hour", "250 messages" (a level's starting point)
export function tierAt(def, at) {
  const [one, many] = def.unit;
  if (def.id === 'staff') return '';
  if (def.id === 'booster') return at === 0 ? 'Any boost' : `${fmt(at)} ${at === 1 ? one : many}`;
  return `${fmt(at)} ${at === 1 ? one : many}`;
}
