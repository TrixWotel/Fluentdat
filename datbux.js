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
  'deco:halo': 150, 'deco:flame': 300, 'deco:catears': 200, 'deco:leaves': 200, 'deco:gears': 250, 'deco:glitch': 300,
  'deco:hearts': 250, 'deco:sparkle': 200, 'deco:rainbow': 250, 'deco:neon': 250, 'deco:orbit': 250, 'deco:crown': 300,
  'deco:bubbles': 150, 'deco:starring': 200, 'deco:snowflakes': 200, 'deco:devil': 250, 'deco:angel': 300, 'deco:bunny': 200,
  'deco:headphones': 250, 'deco:flowers': 250, 'deco:bolts': 300, 'deco:notes': 200, 'deco:pixel': 150, 'deco:foxears': 200,
  'deco:clouds': 150, 'deco:aurora': 350, 'deco:sakura': 250, 'deco:witch': 300, 'deco:bow': 200, 'deco:shades': 250,
  'deco:moon': 300, 'deco:crystals': 350,
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
