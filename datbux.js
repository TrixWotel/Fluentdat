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
// what the Shop asks (Datbux), as in setup.sql; what isn't here is free
export const PRICES = {
  'deco:halo': 150, 'deco:flame': 300, 'deco:catears': 200, 'deco:leaves': 200, 'deco:gears': 250, 'deco:glitch': 300, 'deco:hearts': 250,
  'deco:sparkle': 0, 'deco:rainbow': 0, 'deco:neon': 0, 'deco:orbit': 0, 'deco:crown': 0,
  'font:tempo': 100, 'font:sakura': 100, 'font:jelly': 150, 'font:modern': 150, 'font:medieval': 200, 'font:pixel': 200, 'font:vampyre': 250,
  'font:chunky': 150, 'font:comic': 0, 'font:script': 200, 'font:type': 0, 'font:marker': 150, 'font:elegant': 250,
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
