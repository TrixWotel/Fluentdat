// Datbux, Fluentdat's own currency. The database keeps everyone's (supabase/setup.sql: wallets, claim_task, buy_item,
// send_datbux, the trades); this is what the page needs to show it: the tasks that earn it, and what the Shop asks for
// things (the database's own list wins when signed in; this one is for signed out, in this browser).

// the same tasks as datbux_tasks() in setup.sql: [id, how often, Datbux, what's counted, how many, what to do]
export const TASKS = [
  ['daily-checkin', 'day', 50, 'none', 1, 'Check in', 'Open Fluentdat and claim it.'],
  ['daily-message', 'day', 30, 'messages', 1, 'Say something', 'Send a message anywhere.'],
  ['daily-react', 'day', 20, 'reactions', 3, 'React 3 times', 'React to messages.'],
  ['weekly-messages', 'week', 200, 'messages', 50, 'Send 50 messages', 'In servers, DMs or groups.'],
  ['weekly-react', 'week', 100, 'reactions', 20, 'React 20 times', 'React to messages.'],
  ['weekly-thread', 'week', 120, 'threads', 1, 'Start a thread', 'From a message, or a channel’s Threads.'],
  ['monthly-days', 'month', 600, 'days', 10, 'Chat on 10 different days', 'A message on a day counts it.'],
  ['monthly-messages', 'month', 500, 'messages', 300, 'Send 300 messages', 'In servers, DMs or groups.'],
  ['yearly-checkin', 'year', 2500, 'none', 1, 'Check in this year', 'Once a year: a big one.'],
  ['yearly-messages', 'year', 3000, 'messages', 2000, 'Send 2,000 messages', 'In servers, DMs or groups.'],
].map(([id, every, reward, counts, goal, title, how]) => ({ id, every, reward, counts, goal, title, how }));
export const TASK = Object.fromEntries(TASKS.map((t) => [t.id, t]));
export const EVERY = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };
// what the Shop asks (Datbux), as in setup.sql: everything has a price (a Quest's reward is yours once you've done it)
export const PRICES = {
  'deco:halo': 800, 'deco:flame': 1250, 'deco:catears': 950, 'deco:leaves': 950, 'deco:gears': 1100, 'deco:glitch': 1250,
  'deco:hearts': 1100, 'deco:sparkle': 950, 'deco:rainbow': 1100, 'deco:neon': 1100, 'deco:orbit': 1100, 'deco:crown': 1250,
  'deco:bubbles': 800, 'deco:starring': 950, 'deco:snowflakes': 950, 'deco:devil': 1100, 'deco:angel': 1250, 'deco:bunny': 950,
  'deco:headphones': 1100, 'deco:flowers': 1100, 'deco:bolts': 1250, 'deco:notes': 950, 'deco:pixel': 800, 'deco:foxears': 950,
  'deco:clouds': 800, 'deco:aurora': 1400, 'deco:sakura': 1100, 'deco:witch': 1250, 'deco:bow': 950, 'deco:shades': 1100,
  'deco:moon': 1250, 'deco:crystals': 1400,
  'font:tempo': 100, 'font:sakura': 100, 'font:jelly': 150, 'font:modern': 150, 'font:medieval': 200, 'font:pixel': 200,
  'font:vampyre': 250, 'font:chunky': 150, 'font:comic': 80, 'font:script': 200, 'font:type': 80, 'font:marker': 150,
  'font:elegant': 250, 'font:lobster': 150, 'font:bangers': 150, 'font:righteous': 120, 'font:audiowide': 150, 'font:monoton': 250,
  'font:cinzel': 200, 'font:caveat': 120, 'font:satisfy': 150, 'font:shadows': 120, 'font:luckiest': 150, 'font:blackops': 200,
  'font:silkscreen': 150, 'font:terminal': 120, 'font:vibes': 250, 'font:fatface': 200, 'font:bebas': 120, 'font:glitchy': 250,
  'font:indie': 100, 'font:rampart': 200, 'font:cherry': 200,
  'effect:snow': 120, 'effect:sparkles': 150, 'effect:bubbles': 120, 'effect:petals': 150, 'effect:embers': 180, 'effect:pixels': 160,
  'effect:hearts': 200, 'effect:confetti': 200, 'effect:stars': 200, 'effect:rain': 120, 'effect:fireflies': 180, 'effect:leaves': 150,
  'effect:butterflies': 220, 'effect:music': 180, 'effect:comets': 250, 'effect:code': 200, 'effect:balloons': 180, 'effect:aurora': 300,
  'effect:lightning': 250, 'effect:galaxy': 220, 'effect:smoke': 150, 'effect:coins': 250, 'effect:ghosts': 200, 'effect:clovers': 150,
  'effect:diamonds': 300, 'effect:waves': 220, 'effect:flames': 250, 'effect:bokeh': 180, 'effect:paws': 150,
  'frame:moonlit': 250, 'frame:stardust': 250, 'frame:eyes': 200, 'frame:goo': 200, 'frame:candles': 300, 'frame:eclipse': 300,
  'frame:autumn': 250, 'frame:roses': 250, 'frame:wings': 300, 'frame:thorns': 200, 'frame:kitty': 250, 'frame:bunny': 250,
  'frame:ocean': 250, 'frame:blossom': 300, 'frame:neonsign': 300, 'frame:pixelhearts': 200, 'frame:planets': 300, 'frame:pines': 250,
  'frame:candy': 250, 'frame:circuit': 250, 'frame:skies': 200, 'frame:inferno': 350, 'frame:frost': 300, 'frame:garden': 250,
  'frame:melody': 250, 'frame:royal': 400, 'frame:bats': 300, 'frame:synth': 300, 'frame:paws': 200, 'frame:lanterns': 300,
  'frame:shrooms': 250, 'frame:overrainbow': 300,
  'plate:sunset': 100, 'plate:ocean': 120, 'plate:galaxy': 150, 'plate:sakura': 120, 'plate:forest': 120, 'plate:lava': 150,
  'plate:circuit': 150, 'plate:candy': 80, 'plate:pixel': 100, 'plate:aurora': 200, 'plate:stars': 150, 'plate:clouds': 100,
  'plate:neon': 180, 'plate:gold': 250, 'plate:frost': 120, 'plate:autumn': 120, 'plate:code': 150, 'plate:checkers': 80,
  'plate:waves': 100, 'plate:polka': 60, 'plate:zigzag': 60, 'plate:hearts': 100, 'plate:bubbles': 100, 'plate:flames': 150,
  'plate:rainbow': 120, 'plate:marble': 150, 'plate:camo': 80, 'plate:honey': 100, 'plate:music': 100, 'plate:paws': 80,
};
export const WELCOME = 200;
// the Shop's bundles, as in setup.sql: a few things that go together, for less (pct off what you don't have yet, to the
// nearest 10)
export const BUNDLES = [
  { id: 'spooky', name: 'Spooky Night', pct: 30, items: [{ k: 'deco', i: 'witch' }, { k: 'effect', i: 'ghosts' }, { k: 'frame', i: 'bats' }, { k: 'font', i: 'vampyre' }] },
  { id: 'blossom', name: 'Cherry Blossom', pct: 30, items: [{ k: 'deco', i: 'sakura' }, { k: 'effect', i: 'petals' }, { k: 'frame', i: 'blossom' }, { k: 'plate', i: 'sakura' }] },
  { id: 'cosmic', name: 'Cosmic', pct: 25, items: [{ k: 'deco', i: 'moon' }, { k: 'effect', i: 'galaxy' }, { k: 'plate', i: 'galaxy' }] },
  { id: 'arcade', name: 'Arcade', pct: 35, items: [{ k: 'deco', i: 'pixel' }, { k: 'effect', i: 'pixels' }, { k: 'frame', i: 'pixelhearts' }, { k: 'plate', i: 'pixel' }, { k: 'font', i: 'silkscreen' }] },
  { id: 'inferno', name: 'Inferno', pct: 30, items: [{ k: 'deco', i: 'flame' }, { k: 'effect', i: 'flames' }, { k: 'frame', i: 'inferno' }, { k: 'plate', i: 'lava' }] },
  { id: 'frost', name: 'Winter Frost', pct: 25, items: [{ k: 'deco', i: 'snowflakes' }, { k: 'effect', i: 'snow' }, { k: 'frame', i: 'frost' }] },
  { id: 'synthwave', name: 'Synthwave', pct: 30, items: [{ k: 'deco', i: 'neon' }, { k: 'frame', i: 'synth' }, { k: 'plate', i: 'neon' }, { k: 'font', i: 'audiowide' }] },
  { id: 'royal', name: 'Royal Court', pct: 25, items: [{ k: 'deco', i: 'crown' }, { k: 'frame', i: 'royal' }, { k: 'plate', i: 'gold' }] },
  { id: 'lovestruck', name: 'Love Struck', pct: 20, items: [{ k: 'deco', i: 'hearts' }, { k: 'effect', i: 'hearts' }] },
  { id: 'headliner', name: 'Headliner', pct: 30, items: [{ k: 'deco', i: 'headphones' }, { k: 'effect', i: 'music' }, { k: 'frame', i: 'melody' }, { k: 'plate', i: 'music' }] },
];
export const bundleCost = (b, price, owns) => Math.round(b.items.filter((x) => !owns(x.k, x.i)).reduce((n, x) => n + (price(x.k, x.i) || 0), 0) * (100 - b.pct) / 1000) * 10;
export const fmtBux = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');
// this day, week (Monday to Sunday), month or year, as the database names it (UTC): its name, and when it began and ends
const pad = (n) => String(n).padStart(2, '0');
export function period(every, now = new Date()) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  if (every === 'day') { const start = Date.UTC(y, m, d); return { key: `${y}-${pad(m + 1)}-${pad(d)}`, start, end: start + 864e5 }; }
  if (every === 'week') {
    const dow = now.getUTCDay() || 7, start = Date.UTC(y, m, d - dow + 1);
    const th = new Date(start + 3 * 864e5), wy = th.getUTCFullYear(), w = Math.floor((th - Date.UTC(wy, 0, 1)) / 864e5 / 7) + 1;   // (the ISO week: its Thursday's year)
    return { key: `${wy}-W${pad(w)}`, start, end: start + 7 * 864e5 };
  }
  if (every === 'month') return { key: `${y}-${pad(m + 1)}`, start: Date.UTC(y, m, 1), end: Date.UTC(y, m + 1, 1) };
  return { key: String(y), start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1) };
}
// "in 5 hours", "in 3 days"
export function resetsIn(t, now = Date.now()) {
  const s = Math.max(0, Math.round((t - now) / 1000));
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `in ${Math.round(s / 3600)} h`;
  return `in ${Math.round(s / 86400)} days`;
}
