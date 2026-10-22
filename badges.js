// Badges, like Discord's: earned by doing things in Fluentdat. There are 100 of them, 20 kinds of five (Common up to
// Legendary), and 10 secret ones nobody sees until they're earned. What they're made of comes from the database
// (badge_stats: it counts, for people who know each other), or, signed out, from what's kept in this browser. The
// pictures are Fluentdat's own: flat, in their rarity's colour.

export const RARITY = [['Common', '#9aa3ad'], ['Uncommon', '#3fae74'], ['Rare', '#4f86f7'], ['Epic', '#a35cf0'], ['Legendary', '#ef9a1a']];
const STAFF = ['Staff', '#6f7bf7'], LOCKED = '#6d7480';

// the pictures (on a 32 grid): `f` is the badge's colour, the marks over it are white
const W = '#fff';
const GLYPH = {
  chatter: (f) => `<path fill="${f}" d="M5 7.5A3.5 3.5 0 0 1 8.5 4h15A3.5 3.5 0 0 1 27 7.5v10a3.5 3.5 0 0 1-3.5 3.5H16l-6 5.2c-.7.6-1.7.1-1.7-.8V21A3.5 3.5 0 0 1 5 17.5z"/>
    <g fill="${W}"><circle cx="11" cy="12.5" r="1.9"/><circle cx="16" cy="12.5" r="1.9"/><circle cx="21" cy="12.5" r="1.9"/></g>`,
  gametime: (f) => `<path fill="${f}" d="M9.5 9h13a6.5 6.5 0 0 1 6.3 8.1l-1 3.9a3.2 3.2 0 0 1-5.4 1.4L19.8 20h-7.6l-2.6 2.4a3.2 3.2 0 0 1-5.4-1.4l-1-3.9A6.5 6.5 0 0 1 9.5 9z"/>
    <g fill="${W}"><path d="M10 12h2v2h2v2h-2v2h-2v-2H8v-2h2z"/><circle cx="21.5" cy="13.4" r="1.5"/><circle cx="24.3" cy="16.2" r="1.5"/></g>`,
  time: (f) => `<path fill="${f}" d="M9.5 5h13v1.2c0 4.3-3.7 6.6-5.3 9.8 1.6 3.2 5.3 5.5 5.3 9.8V27h-13v-1.2c0-4.3 3.7-6.6 5.3-9.8C13.2 12.8 9.5 10.5 9.5 6.2z"/>
    <rect fill="${f}" x="7" y="3" width="18" height="2.6" rx="1.3"/><rect fill="${f}" x="7" y="26.4" width="18" height="2.6" rx="1.3"/>
    <path fill="${W}" d="M12.6 25.2h6.8c-.7-2.4-2.4-3.6-3.4-4.9-1 1.3-2.7 2.5-3.4 4.9zM13.4 9h5.2c-.6 1.4-1.6 2.4-2.6 3.5-1-1.1-2-2.1-2.6-3.5z"/>`,
  quester: (f) => `<path fill="${f}" d="M16 2.5l3.4 9.9L29.5 16l-10.1 3.6L16 29.5l-3.4-9.9L2.5 16l10.1-3.6z"/><circle cx="16" cy="16" r="3.2" fill="${W}"/>`,
  booster: (f) => `<path fill="${f}" d="M16 3l11 6.3v13.4L16 29 5 22.7V9.3z"/>
    <path d="M16 3v26M5 9.3l11 6.4 11-6.4M5 22.7l11-7 11 7" stroke="${W}" stroke-width="1.4" fill="none"/>`,
  builder: (f) => `<path fill="${f}" d="M4 28V13h3.5v3h3v-3H14v3h4v-3h3.5v3h3v-3H28v15h-8.5v-5a3.5 3.5 0 0 0-7 0v5z"/>
    <path fill="${f}" d="M15 4.5h1.6v8.5H15z"/><path fill="${f}" d="M16.6 4.5l5.4 2.1-5.4 2.1z"/>`,
  reactor: (f) => `<path fill="${f}" d="M16 27.5s-10.5-6.3-12.6-12.6C1.9 10.4 4.8 5.5 9.6 5.5c2.7 0 4.9 1.5 6.4 3.8 1.5-2.3 3.7-3.8 6.4-3.8 4.8 0 7.7 4.9 6.2 9.4C26.5 21.2 16 27.5 16 27.5z"/>`,
  weaver: (f) => `<rect fill="${f}" x="7" y="4" width="18" height="4.2" rx="1.6"/><rect fill="${f}" x="7" y="23.8" width="18" height="4.2" rx="1.6"/>
    <rect fill="${f}" x="9.6" y="8" width="12.8" height="16" rx="1"/>
    <path d="M9.6 11.5h12.8M9.6 15h12.8M9.6 18.5h12.8M9.6 22h12.8" stroke="${W}" stroke-width="1.2"/>
    <path d="M22.4 20c3 0 5.6 1.6 5.6 4.5S25.5 29 23 29" stroke="${f}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  friendly: (f) => `<circle fill="${f}" cx="12" cy="11" r="5.2"/><path fill="${f}" d="M2.8 27c0-5.3 4.1-9 9.2-9s9.2 3.7 9.2 9z"/>
    <circle fill="${f}" cx="22.6" cy="12" r="4.3"/><path fill="${f}" d="M20.4 18.3c4.6-.7 8.8 2.6 8.8 7.7h-6.4c0-2.9-.9-5.4-2.4-7.7z"/>`,
  connected: (f) => `<g fill="none" stroke="${f}" stroke-width="3.6" stroke-linecap="round"><path d="M14.4 9.6l2.3-2.3a5.6 5.6 0 0 1 7.9 7.9l-2.3 2.3"/>
    <path d="M17.6 22.4l-2.3 2.3a5.6 5.6 0 0 1-7.9-7.9l2.3-2.3"/><path d="M12.8 19.2l6.4-6.4"/></g>`,
  collector: (f) => `<path fill="${f}" d="M11 3h13a2 2 0 0 1 2 2v13h-2V5H11z"/>
    <path fill="${f}" d="M6 7.5A1.5 1.5 0 0 1 7.5 6h13A1.5 1.5 0 0 1 22 7.5V25a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>
    <rect x="9" y="10" width="10" height="7.5" rx="1.2" fill="${W}"/><path d="M9.5 23h1.8M13 23h1.8M16.5 23h1.8" stroke="${W}" stroke-width="2"/>`,
  host: (f) => `<rect fill="${f}" x="4.5" y="7" width="23" height="20.5" rx="3.4"/><rect fill="${f}" x="9" y="3.5" width="2.8" height="6.5" rx="1.4"/><rect fill="${f}" x="20.2" y="3.5" width="2.8" height="6.5" rx="1.4"/>
    <path fill="${W}" d="M16 12.2l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"/>`,
  explorer: (f) => `<circle cx="16" cy="16" r="12.5" fill="${f}"/><path fill="${W}" d="M21.6 10.4l-3 7.6-7.6 3 3-7.6z"/><circle cx="16" cy="16" r="1.7" fill="${f}"/>`,
  sharer: (f) => `<path fill="${f}" d="M8 3.5h10.8L26 10.7V26.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-21a2 2 0 0 1 2-2z"/><path fill="${W}" d="M18.8 3.5v5.7a1.5 1.5 0 0 0 1.5 1.5H26z"/>
    <path fill="${W}" d="M9.5 24.5l4-5.2 3 3.6 2.1-2.6 3.9 4.2z"/><circle fill="${W}" cx="12.2" cy="15" r="1.9"/>`,
  caller: (f) => `<path fill="${f}" d="M9.2 4.5c1-.6 2.3-.3 2.9.7l2.6 4.3c.6 1 .3 2.2-.6 2.9l-1.9 1.4c1.2 2.6 3.3 4.8 5.9 6l1.4-1.9c.7-.9 1.9-1.2 2.9-.6l4.3 2.6c1 .6 1.3 1.9.7 2.9l-1.5 2.4c-.9 1.5-2.7 2.2-4.4 1.8C13 25.5 6.5 19 5.1 10.6c-.3-1.7.4-3.4 1.8-4.4z"/>`,
  stylist: (f) => `<path fill="${f}" d="M16 3.5C8.8 3.5 3.5 8.6 3.5 15.2c0 6.8 5.5 12.3 12.3 12.3 1.9 0 2.9-1.2 2.9-2.6 0-.7-.3-1.3-.7-1.8-.4-.5-.7-1.1-.7-1.8 0-1.4 1.2-2.6 2.6-2.6h3.1c3.2 0 5.5-2.6 5.5-5.8C28.5 8 22.9 3.5 16 3.5z"/>
    <g fill="${W}"><circle cx="9.3" cy="15.2" r="2"/><circle cx="12.3" cy="9.6" r="2"/><circle cx="18.8" cy="8.4" r="2"/><circle cx="23.6" cy="12.6" r="2"/></g>`,
  shopper: (f) => `<path fill="${f}" d="M6.5 10.5h19l-1.3 15.8a2 2 0 0 1-2 1.7H9.8a2 2 0 0 1-2-1.7z"/>
    <path d="M11.5 13.5V9.5a4.5 4.5 0 0 1 9 0v4" stroke="${f}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle fill="${W}" cx="11.5" cy="14.5" r="1.4"/><circle fill="${W}" cx="20.5" cy="14.5" r="1.4"/>`,
  trader: (f) => `<path fill="${f}" d="M21 3.5l7 6.3-7 6.3v-4.2H6.5V8H21z"/><path fill="${f}" d="M11 15.9v4.2h14.5v3.9H11v4.2l-7-6.2z"/>`,
  tasker: (f) => `<path fill="${f}" d="M9 6h3.2a3.8 3.8 0 0 1 7.6 0H23a2.5 2.5 0 0 1 2.5 2.5v18A2.5 2.5 0 0 1 23 29H9a2.5 2.5 0 0 1-2.5-2.5v-18A2.5 2.5 0 0 1 9 6z"/>
    <path d="M11 18.2l3.5 3.5 6.8-7.2" stroke="${W}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="6.2" r="1.5" fill="${W}"/>`,
  streak: (f) => `<path fill="${f}" d="M16.5 2.5c.6 4.4 3.5 6.6 5.8 9.3 2.2 2.6 3.7 5.3 3.7 8.6 0 5.2-4.4 9.1-10 9.1S6 25.6 6 20.4c0-3.7 1.9-6.6 4.3-8.8.4 2.2 1.5 3.7 3 4.5-.3-5.5 1.1-10.3 3.2-13.6z"/>
    <path fill="${W}" d="M16.2 17.2c2.2 1.9 3.8 3.6 3.8 6 0 2.2-1.8 3.8-4 3.8s-4-1.6-4-3.8c0-2.2 1.6-4 4.2-6z"/>`,
  // the secret ones
  answer: (f) => `<rect fill="${f}" x="4" y="4" width="24" height="24" rx="7"/><text x="16" y="21.2" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="${W}">42</text>`,
  hello: (f) => `<path fill="${f}" d="M16 4C9 4 3.5 8.7 3.5 14.5c0 3.2 1.7 6.1 4.4 8l-1 4.6c-.2.8.7 1.4 1.4 1l5.2-3.1c.8.1 1.6.2 2.5.2 7 0 12.5-4.7 12.5-10.5S23 4 16 4z"/>
    <text x="16" y="19" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${W}">Hi!</text>`,
  early: (f) => `<path fill="${f}" d="M15 28.5V18C9.5 18 5.5 14.2 5.5 8.6V6.8h1.8c4.4 0 7.6 2.5 8.6 6.2C17 9 20.5 6.2 25 6.2h1.5v1.6c0 5.8-4.3 9.9-9.4 9.9v10.8z"/><rect fill="${f}" x="9" y="27" width="14" height="2.5" rx="1.2"/>`,
  selflove: (f) => `<path fill="${f}" d="M16 27.5s-10.5-6.3-12.6-12.6C1.9 10.4 4.8 5.5 9.6 5.5c2.7 0 4.9 1.5 6.4 3.8 1.5-2.3 3.7-3.8 6.4-3.8 4.8 0 7.7 4.9 6.2 9.4C26.5 21.2 16 27.5 16 27.5z"/>
    <circle cx="12.4" cy="13.6" r="1.6" fill="${W}"/><circle cx="19.6" cy="13.6" r="1.6" fill="${W}"/><path d="M12 17.6c1.1 1.5 2.4 2.2 4 2.2s2.9-.7 4-2.2" stroke="${W}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  generous: (f) => `<rect fill="${f}" x="5" y="13" width="22" height="15" rx="2"/><rect fill="${f}" x="3.5" y="8.5" width="25" height="5.5" rx="1.5"/>
    <path fill="${W}" d="M14.6 8.5h2.8V28h-2.8z"/><path d="M16 8.5c-1.5-3.6-6.3-4.6-6.3-1.6 0 1.6 2.6 1.6 6.3 1.6zm0 0c1.5-3.6 6.3-4.6 6.3-1.6 0 1.6-2.6 1.6-6.3 1.6z" fill="none" stroke="${f}" stroke-width="2"/>`,
  midnight: (f) => `<path fill="${f}" d="M18.5 4.5A11.8 11.8 0 1 0 27.6 21.4 9.4 9.4 0 0 1 18.5 4.5z"/><path fill="${f}" d="M24.5 4.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/>`,
  bigspender: (f) => `<path fill="${f}" d="M6.5 10.5h19l-1.3 15.8a2 2 0 0 1-2 1.7H9.8a2 2 0 0 1-2-1.7z"/>
    <path d="M11.5 13.5V9.5a4.5 4.5 0 0 1 9 0v4" stroke="${f}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path fill="${W}" d="M16 14.2l1.4 2.9 3.2.5-2.3 2.2.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z"/>`,
  emoji: (f) => `<circle fill="${f}" cx="16" cy="16" r="12.5"/><g fill="${W}"><circle cx="11.8" cy="13" r="1.9"/><circle cx="20.2" cy="13" r="1.9"/></g>
    <path d="M10.5 18.5c1.3 2.6 3.3 3.9 5.5 3.9s4.2-1.3 5.5-3.9" stroke="${W}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  flubot: (f) => `<rect fill="${f}" x="6" y="9" width="20" height="16" rx="4"/><rect fill="${f}" x="15" y="4.5" width="2" height="5"/><circle fill="${f}" cx="16" cy="4.5" r="2"/>
    <rect fill="${f}" x="3" y="14" width="3" height="6" rx="1.5"/><rect fill="${f}" x="26" y="14" width="3" height="6" rx="1.5"/>
    <g fill="${W}"><circle cx="12" cy="16.5" r="2.2"/><circle cx="20" cy="16.5" r="2.2"/><rect x="12" y="21" width="8" height="1.8" rx=".9"/></g>`,
  completionist: (f) => `<path fill="${f}" d="M9 4h14v7.5a7 7 0 0 1-14 0z"/><path d="M9 7H5.5v2.3A4.5 4.5 0 0 0 10 13.8M23 7h3.5v2.3A4.5 4.5 0 0 1 22 13.8" stroke="${f}" stroke-width="2.2" fill="none"/>
    <path fill="${f}" d="M14 17.5h4V23h-4z"/><rect fill="${f}" x="10" y="23" width="12" height="4.5" rx="1.5"/><path fill="${W}" d="M16 6.8l1.1 2.2 2.4.4-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.4z"/>`,
  staff: (f) => `<path fill="${f}" d="M16 3l11 4v8.2c0 6.9-4.7 11.6-11 13.8-6.3-2.2-11-6.9-11-13.8V7z"/>
    <circle cx="16" cy="15.4" r="5.4" fill="none" stroke="${W}" stroke-width="2.3" stroke-dasharray="25 9" transform="rotate(-80 16 15.4)"/><circle cx="16" cy="15.4" r="1.9" fill="${W}"/>`,
};

const DAY = 864e5;
const days = (s, now) => (s.since ? Math.max(0, Math.floor((now - Date.parse(s.since)) / DAY)) : 0);
const months = (from, now) => { const a = new Date(from), b = new Date(now); let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); if (b.getDate() < a.getDate()) m--; return Math.max(0, m); };
const addMonths = (t, n) => { const d = new Date(t); d.setMonth(d.getMonth() + n); return d.getTime(); };
const n = (s, k) => Number(s && s[k]) || 0;
export const fmt = (v) => Math.floor(v).toLocaleString('en-US');
const looks = (s) => Object.values((s && s.looks) || {}).filter(Boolean).length;
const said = (one, many) => (v) => `${fmt(v)} ${Math.floor(v) === 1 ? one : many}`;

// the 20 kinds: what each counts (and how to say it), how to earn it, and its five badges (from how much, and their names)
export const KINDS = [
  { id: 'chatter', name: 'Chatter', unit: ['message', 'messages'], value: (s) => n(s, 'messages'), line: said('message sent', 'messages sent'),
    how: 'Write messages in your servers, DMs and groups (Flubot’s lines don’t count).',
    tiers: [[1, 'Hello World'], [100, 'Chatty'], [500, 'Talkative'], [2000, 'Storyteller'], [10000, 'Living Legend']] },
  { id: 'gametime', name: 'Game Time', unit: ['hour', 'hours'], value: (s) => n(s, 'play_seconds') / 3600, line: said('hour of games played', 'hours of games played'),
    how: 'Say what you’re playing (your Activity, or your profile’s Playing). Each game counts until you stop or switch, up to 12 hours a game.',
    tiers: [[1, 'Warm-up'], [10, 'Weekend Player'], [50, 'Regular'], [200, 'Committed'], [500, 'Marathoner']] },
  { id: 'time', name: 'Time Here', unit: ['day', 'days'], value: (s, now) => (s.since ? days(s, now) : -1), line: said('day on Fluentdat', 'days on Fluentdat'),
    how: 'Stick around: these come with how long you’ve had your account.', date: (s, t) => Date.parse(s.since) + t * DAY,
    tiers: [[0, 'Newcomer'], [30, 'Settled In'], [180, 'Veteran'], [365, 'One Year Strong'], [730, 'Elder']] },
  { id: 'quester', name: 'Quester', unit: ['Quest', 'Quests'], value: (s) => n(s, 'quests'), line: said('Quest finished', 'Quests finished'),
    how: 'Finish Quests (Direct Messages → Quests) and claim their rewards.', tiers: [[1, 'Adventurer'], [2, 'Pathfinder'], [4, 'Hero'], [6, 'Champion'], [8, 'Questmaster']] },
  { id: 'booster', name: 'Server Booster', unit: ['month', 'months'], value: (s, now) => (s.boost_since ? months(s.boost_since, now) : -1),
    line: (v) => (v < 1 ? 'Boosting a server' : `Boosting for ${fmt(v)} month${v === 1 ? '' : 's'}`), date: (s, t) => addMonths(Date.parse(s.boost_since), t),
    how: 'Boost a server (its menu → Server Boost; it’s free). The longer you keep boosting, the more you get.',
    tiers: [[0, 'Booster'], [1, 'One Month'], [3, 'Three Months'], [6, 'Six Months'], [12, 'One Year']] },
  { id: 'builder', name: 'Community Builder', unit: ['member', 'members'], value: (s) => n(s, 'members'), line: said('member in your biggest server', 'members in your biggest server'),
    how: 'Make a server and bring people in: it counts the members of the biggest server you own.', tiers: [[2, 'Founder'], [5, 'Gatherer'], [15, 'Organizer'], [50, 'Leader'], [150, 'Icon']] },
  { id: 'reactor', name: 'Reactor', unit: ['reaction', 'reactions'], value: (s) => n(s, 'reactions'), line: said('reaction', 'reactions'),
    how: 'React to messages.', tiers: [[10, 'Fan'], [50, 'Cheerleader'], [250, 'Hype Machine'], [1000, 'Applause'], [5000, 'Emoji Royalty']] },
  { id: 'weaver', name: 'Thread Weaver', unit: ['thread', 'threads'], value: (s) => n(s, 'threads'), line: said('thread started', 'threads started'),
    how: 'Start threads in your servers’ channels.', tiers: [[1, 'Spinner'], [5, 'Knitter'], [15, 'Weaver'], [40, 'Tapestry Maker'], [100, 'Master Weaver']] },
  { id: 'friendly', name: 'Friendly', unit: ['friend', 'friends'], value: (s) => n(s, 'friends'), line: said('friend', 'friends'),
    how: 'Make friends: someone counts once you’ve both added each other.', tiers: [[1, 'Buddy'], [5, 'Pal'], [15, 'Social'], [30, 'Popular'], [60, 'Life of the Party']] },
  { id: 'connected', name: 'Connected', unit: ['connection', 'connections'], value: (s) => n(s, 'connections'), line: said('connection', 'connections'),
    how: 'Add your accounts elsewhere to your profile (Connections).', tiers: [[1, 'Linked'], [2, 'Networked'], [4, 'Well Connected'], [6, 'Everywhere'], [10, 'Omnipresent']] },
  { id: 'collector', name: 'Game Collector', unit: ['game', 'games'], value: (s) => n(s, 'games'), line: said('game on the Board', 'games on the Board'),
    how: 'Put games you like on your Board (your full profile → Board).', tiers: [[1, 'Starter Shelf'], [5, 'Collector'], [10, 'Curator'], [15, 'Hoarder'], [20, 'Museum']] },
  { id: 'host', name: 'Event Host', unit: ['event', 'events'], value: (s) => n(s, 'events'), line: said('event made', 'events made'),
    how: 'Make events in your servers.', tiers: [[1, 'Planner'], [3, 'Host'], [10, 'Party Starter'], [25, 'Showrunner'], [50, 'Festival Maker']] },
  { id: 'explorer', name: 'Explorer', unit: ['server', 'servers'], value: (s) => n(s, 'servers'), line: said('server joined', 'servers joined'),
    how: 'Join servers (or make your own).', tiers: [[1, 'Wanderer'], [3, 'Traveller'], [5, 'Explorer'], [10, 'Globetrotter'], [25, 'Citizen of Everywhere']] },
  { id: 'sharer', name: 'Sharer', unit: ['message with files', 'messages with files'], value: (s) => n(s, 'files'), line: said('message with files', 'messages with files'),
    how: 'Send pictures, videos and files in your messages.', tiers: [[1, 'Show and Tell'], [10, 'Sharer'], [50, 'Uploader'], [200, 'Gallery Keeper'], [500, 'Library of Everything']] },
  { id: 'caller', name: 'Caller', unit: ['call', 'calls'], value: (s) => n(s, 'calls'), line: said('call started', 'calls started'),
    how: 'Start voice and video calls, in DMs, groups or voice channels.', tiers: [[1, 'Hello?'], [5, 'On the Line'], [25, 'Party Line'], [75, 'Switchboard'], [200, 'Broadcaster']] },
  { id: 'stylist', name: 'Stylist', unit: ['part of your look', 'parts of your look'], value: (s) => looks(s), line: (v) => `${fmt(v)} of 12 parts of a look`,
    how: 'Make your profile yours: a picture, a banner, an About, pronouns, a theme, a name style, a decoration, an effect, a frame, a nameplate, a status and a tag.',
    tiers: [[1, 'Fresh Look'], [3, 'Stylish'], [6, 'Trendsetter'], [9, 'Fashion Icon'], [12, 'Masterpiece']] },
  { id: 'shopper', name: 'Shopper', unit: ['thing from the Shop', 'things from the Shop'], value: (s) => n(s, 'owned'), line: said('thing from the Shop', 'things from the Shop'),
    how: 'Buy decorations and name fonts in the Shop with Datbux.', tiers: [[1, 'First Find'], [3, 'Shopper'], [6, 'Wardrobe'], [10, 'Big Collection'], [15, 'Treasure Trove']] },
  { id: 'trader', name: 'Trader', unit: ['trade', 'trades'], value: (s) => n(s, 'trades'), line: said('trade made', 'trades made'),
    how: 'Trade Datbux and Shop things with people you know (their profile → Trade).', tiers: [[1, 'First Deal'], [5, 'Bargainer'], [15, 'Merchant'], [40, 'Broker'], [100, 'Trade Baron']] },
  { id: 'tasker', name: 'Task Master', unit: ['task', 'tasks'], value: (s) => n(s, 'tasks'), line: said('Datbux task done', 'Datbux tasks done'),
    how: 'Do Datbux tasks (Direct Messages → Datbux) and claim them.', tiers: [[1, 'Getting Started'], [10, 'Reliable'], [50, 'Diligent'], [150, 'Tireless'], [365, 'Unstoppable']] },
  { id: 'streak', name: 'Streak', unit: ['day in a row', 'days in a row'], value: (s) => n(s, 'streak'), line: (v) => `Best: ${fmt(v)} day${v === 1 ? '' : 's'} in a row`,
    how: 'Claim the daily check-in (Direct Messages → Datbux) day after day.', tiers: [[3, 'On a Roll'], [7, 'Week Streak'], [14, 'Fortnight'], [30, 'Month Streak'], [100, 'Unbreakable']] },
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

// the 10 secret ones: nobody sees them until they're earned (what they're for shows once you have one)
export const SECRETS = [
  ['answer', 'answer', 'The Answer', 2, 'Said “42”, and nothing else.', (s) => !!s.said42],
  ['hello', 'hello', 'Hello, Fluentdat', 0, 'Said “hello Fluentdat”.', (s) => !!s.said_hello],
  ['early-adopter', 'early', 'Early Adopter', 4, 'Was here in Fluentdat’s first year (2026).', (s) => !!s.since && Date.parse(s.since) < Date.UTC(2027, 0, 1)],
  ['self-love', 'selflove', 'Self-Love', 1, 'Reacted to their own message.', (s) => !!s.self_react],
  ['generous', 'generous', 'Generous Soul', 3, 'Sent Datbux to five different people.', (s) => n(s, 'sent_people') >= 5],
  ['midnight-oil', 'midnight', 'Midnight Oil', 2, 'Sent 10 messages between midnight and 4 a.m. (UTC).', (s) => n(s, 'night') >= 10],
  ['big-spender', 'bigspender', 'Big Spender', 3, 'Spent 2,000 Datbux.', (s) => n(s, 'bux_spent') >= 2000],
  ['emoji-expert', 'emoji', 'Emoji Connoisseur', 3, 'Reacted with 30 different emoji.', (s) => n(s, 'emoji_kinds') >= 30],
  ['flubot-friend', 'flubot', 'Flubot’s Friend', 2, 'Asked Flubot for things 20 times.', (s) => n(s, 'bot_cmds') >= 20],
  ['completionist', 'completionist', 'Completionist', 4, 'Earned 50 badges.', null],
].map(([id, glyph, name, r, how, test]) => ({ id, glyph, name, rarity: RARITY[r], r, how, test, secret: true }));

// every badge, by name: the 100 (the kinds' five each), the secret ones and Staff
export const BADGES = KINDS.flatMap((k) => k.tiers.map(([at, name], i) => ({ id: `${k.id}-${i + 1}`, kind: k, tier: i, at, name, rarity: RARITY[i], r: i, glyph: k.id })));
const STAFF_BADGE = { id: 'staff', name: 'Fluentdat Staff', rarity: STAFF, r: 5, how: 'Given to the people who run Fluentdat.', glyph: 'staff', special: true };
export const BADGE = Object.fromEntries([...BADGES, ...SECRETS, STAFF_BADGE].map((b) => [b.id, b]));
export const COUNT = BADGES.length;

// where someone is with one badge: whether they have it, and how far along they are
export function badgeState(def, stats, now = Date.now()) {
  if (!stats || !def) return null;
  if (def.special) return stats.staff ? { def, id: def.id, have: true, value: 1, progress: 1, rarity: def.rarity, name: def.name } : null;
  if (def.secret) return { def, id: def.id, have: false, value: 0, progress: 0, rarity: def.rarity, name: def.name, secret: true };
  const k = def.kind, v = k.value(stats, now);
  if (v == null) return null;
  const have = v >= def.at;
  return { def, id: def.id, kind: k, tier: def.tier, value: v, have, name: def.name, rarity: def.rarity,
    progress: have ? 1 : def.at > 0 ? Math.max(0, Math.min(1, v / def.at)) : 0,
    unlocked: have && k.date ? k.date(stats, def.at) : 0 };
}
// all of someone's badges: the ones they have (in the order they chose, hidden ones left out unless asked), the ones still
// to earn, and how many secret ones are still hidden. (An order saved before there were 100 badges named the kinds:
// that's still followed.)
export function badgesOf(stats, { order = [], hidden = [], all = false } = {}) {
  if (!stats) return { shown: [], have: [], todo: [], secretsLeft: SECRETS.length, count: 0 };
  const now = Date.now(), states = BADGES.map((d) => badgeState(d, stats, now)).filter(Boolean);
  const got = states.filter((s) => s.have), secrets = SECRETS.filter((d) => d.test && d.test(stats)).map((d) => ({ ...badgeState(d, stats), have: true, progress: 1 }));
  if (got.length + secrets.length >= 50) secrets.push({ ...badgeState(BADGE.completionist, stats), have: true, progress: 1 });
  const staff = badgeState(STAFF_BADGE, stats), have = [...(staff ? [staff] : []), ...got, ...secrets];
  const best = new Map(); for (const s of got) { const b = best.get(s.kind.id); if (!b || s.tier > b.tier) best.set(s.kind.id, s); }
  const kindOf = (s) => (s.kind ? s.kind.id : s.id);
  const pos = (s) => {
    let i = order.indexOf(s.id); if (i >= 0) return i;
    i = order.indexOf(kindOf(s)); if (i >= 0) return i + (4 - (s.tier || 0)) / 10;
    return 1000 + (s.def.special ? 0 : s.kind && best.get(s.kind.id) !== s ? 600 : 0) + (5 - s.def.r) * 60 + (s.kind ? KINDS.indexOf(s.kind) : 30);
  };
  have.sort((a, b) => pos(a) - pos(b));
  const off = (s) => hidden.includes(s.id) || hidden.includes(kindOf(s));
  return { shown: all ? have : have.filter((s) => !off(s)), have, todo: states.filter((s) => !s.have), secretsLeft: SECRETS.length - secrets.length,
    count: got.length, hiddenOf: off };
}
// a badge's picture, flat, in its rarity's colour (grey and faint until it's earned)
export function badgeIcon(id, size = 22, { locked = false, title = '' } = {}) {
  const d = BADGE[id], g = d && GLYPH[d.glyph]; if (!g) return document.createElement('span');
  const wrap = document.createElement('span');
  wrap.className = 'bdg-ic' + (locked ? ' locked' : '');
  wrap.innerHTML = `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${g(locked ? LOCKED : d.rarity[1])}</svg>`;
  if (title) wrap.title = title;
  return wrap;
}
// "71 more hours", "2 more Quests" (to this badge)
export function toNext(st) {
  if (!st || st.have || !st.kind) return '';
  const left = Math.max(0, st.def.at - st.value), [one, many] = st.kind.unit;
  if (st.kind.id === 'booster' && st.value < 0) return 'Boost any server';
  if (st.kind.id === 'time' && st.value < 0) return '';
  const k = Math.ceil(left);
  return `${fmt(k)} more ${k === 1 ? one : many}`;
}
// "1 hour", "250 messages" (where a badge starts)
export function tierAt(def) {
  if (!def || !def.kind) return '';
  const [one, many] = def.kind.unit, at = def.at;
  if (def.kind.id === 'booster') return at === 0 ? 'Any boost' : `${fmt(at)} ${at === 1 ? one : many}`;
  if (def.kind.id === 'time' && at === 0) return 'Day one';
  return `${fmt(at)} ${at === 1 ? one : many}`;
}
