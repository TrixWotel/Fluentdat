// The Shop and Quests, like Discord's (everything is free here): avatar decorations drawn around an avatar, profile
// effects that play over a profile card, and Quests: things to do in Fluentdat that unlock some of them.
// A decoration is an SVG a little bigger than the avatar (130 × 130, the avatar being the circle of radius 50 in the
// middle); an effect is a layer of little pieces the page's CSS moves (index.html, "the Shop").
import { el } from './ui.js';

// [id, name, the Quest that unlocks it ('' when it's free)]
export const DECORATIONS = [
  ['halo', 'Halo', ''], ['flame', 'Ring of Fire', ''], ['catears', 'Cat Ears', ''], ['leaves', 'Leafy Wreath', ''],
  ['gears', 'Robot Gears', ''], ['glitch', 'Glitch', ''], ['hearts', 'Orbiting Hearts', ''],
  ['sparkle', 'Sparkles', 'first-steps'], ['rainbow', 'Rainbow Ring', 'chatterbox'], ['neon', 'Neon Ring', 'connected'],
  ['orbit', 'Planet Ring', 'show-and-tell'], ['crown', 'Crown', 'planner'],
];
export const EFFECTS = [
  ['snow', 'Snowfall', ''], ['sparkles', 'Twinkles', ''], ['bubbles', 'Bubbles', ''], ['petals', 'Petals', ''], ['embers', 'Embers', ''], ['pixels', 'Pixel Rain', ''],
  ['hearts', 'Floating Hearts', 'reactor'], ['confetti', 'Confetti', 'party-up'], ['stars', 'Starry Night', 'game-on'],
];
// { id, title, what it's about, icon, colour (a hue), tasks: [what's counted, what to do, how many], reward: [kind, id] }
export const QUESTS = [
  { id: 'first-steps', title: 'First Steps', desc: 'Make yourself at home.', icon: 'sparkle', hue: 262,
    tasks: [['about', 'Write your About Me', 1], ['send', 'Send a message', 1], ['react', 'React to a message', 1]], reward: ['deco', 'sparkle'] },
  { id: 'chatterbox', title: 'Chatterbox', desc: 'Keep the conversation going.', icon: 'message', hue: 212, tasks: [['send', 'Send 50 messages', 50]], reward: ['deco', 'rainbow'] },
  { id: 'reactor', title: 'Reactor', desc: 'Let people know what you think.', icon: 'smilePlus', hue: 330, tasks: [['react', 'Add 20 reactions', 20]], reward: ['effect', 'hearts'] },
  { id: 'connected', title: 'Connected', desc: 'Show people where else to find you.', icon: 'link', hue: 186, tasks: [['connections', 'Add 2 connections to your profile', 2]], reward: ['deco', 'neon'] },
  { id: 'show-and-tell', title: 'Show and Tell', desc: 'Put the games you love on your Board.', icon: 'game', hue: 22, tasks: [['board', 'Have 5 games on your Board', 5]], reward: ['deco', 'orbit'] },
  { id: 'party-up', title: 'Party Up', desc: 'Hang out together.', icon: 'volume', hue: 142, tasks: [['voice', 'Join a voice channel 3 times', 3]], reward: ['effect', 'confetti'] },
  { id: 'game-on', title: 'Game On', desc: 'Tell people what you’re playing.', icon: 'game', hue: 45, tasks: [['play', 'Say what you’re playing', 1]], reward: ['effect', 'stars'] },
  { id: 'planner', title: 'Event Planner', desc: 'Get people together.', icon: 'calendar', hue: 0, tasks: [['event', 'Make an event, or say you’re interested in one', 1]], reward: ['deco', 'crown'] },
];
export const decoInfo = (id) => DECORATIONS.find((d) => d[0] === id) || null;
export const effectInfo = (id) => EFFECTS.find((e) => e[0] === id) || null;
export const questInfo = (id) => QUESTS.find((q) => q.id === id) || null;
// how far along a Quest is: [{ label, have, goal }], and whether it's done
export function questProgress(q, stats) {
  const tasks = q.tasks.map(([key, label, goal]) => ({ label, goal, have: Math.min(goal, Math.max(0, Number(stats[key]) || 0)) }));
  return { tasks, done: tasks.every((t) => t.have >= t.goal) };
}

// ---------- decorations ----------
let n = 0;
const gear = (cx, cy, r, teeth) => {
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`, `${(cx + rr * Math.cos(a2)).toFixed(1)} ${(cy + rr * Math.sin(a2)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z M${cx + r * 0.32} ${cy} A${r * 0.32} ${r * 0.32} 0 1 0 ${cx - r * 0.32} ${cy} A${r * 0.32} ${r * 0.32} 0 1 0 ${cx + r * 0.32} ${cy}Z`;
};
const star4 = 'M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4Z';
const heart = 'M0 4 C-7 -2 -3 -9 0 -4.5 C3 -9 7 -2 0 4Z';
function decoSVG(id) {
  const k = ++n, gold = `<linearGradient id="dg${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4b8"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#c98d0b"/></linearGradient>`;
  switch (id) {
    case 'halo': return `<defs>${gold}</defs><g class="d-bob"><ellipse cx="65" cy="12" rx="31" ry="7.5" fill="none" stroke="url(#dg${k})" stroke-width="5"/><ellipse cx="65" cy="11" rx="31" ry="7.5" fill="none" stroke="#fffbe6" stroke-opacity=".7" stroke-width="1.4"/></g>`;
    case 'sparkle': return [[16, 24, 1.1, 0], [113, 30, 0.75, 0.6], [110, 104, 1, 1.1], [22, 108, 0.65, 1.6], [65, 5, 0.6, 0.9], [122, 70, 0.5, 2]].map(([x, y, s, d]) =>
      `<g transform="translate(${x} ${y}) scale(${s})"><path class="d-tw" style="animation-delay:${d}s" d="${star4}" fill="#fff6c4" stroke="#f5c542" stroke-width="1"/></g>`).join('');
    case 'flame': return `<defs><linearGradient id="df${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d00"/><stop offset=".6" stop-color="#ff9500"/><stop offset="1" stop-color="#ffe066"/></linearGradient></defs>
      <circle cx="65" cy="65" r="55" fill="none" stroke="url(#df${k})" stroke-width="4" class="d-glow-o"/>` +
      [-70, -46, -23, 0, 23, 46, 70].map((a, i) => `<g transform="rotate(${a} 65 65)"><path class="d-fl" style="animation-delay:${(i * 0.13).toFixed(2)}s" d="M65 1 C73 10 71 17 65 20 C59 17 57 10 65 1Z" fill="url(#df${k})"/></g>`).join('');
    case 'neon': return `<defs><filter id="dn${k}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle class="d-pulse" cx="65" cy="65" r="56" fill="none" stroke="#5ff4ff" stroke-width="3" filter="url(#dn${k})"/><circle cx="65" cy="65" r="60" fill="none" stroke="#ff4fd8" stroke-width="1.2" stroke-dasharray="8 6" filter="url(#dn${k})" class="d-spin-slow"/>`;
    case 'rainbow': {
      const c = 2 * Math.PI * 56, seg = c / 6;
      return `<g class="d-spin">${['#ff4d4d', '#ffb84d', '#ffee4d', '#4dff88', '#4dc3ff', '#9b6bff'].map((col, i) =>
        `<circle cx="65" cy="65" r="56" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${seg.toFixed(2)} ${(c - seg).toFixed(2)}" stroke-dashoffset="${(-i * seg).toFixed(2)}"/>`).join('')}</g>`;
    }
    case 'catears': return `<g class="d-ear-l"><path d="M20 44 L27 3 L57 23 Z" fill="#3a3c43" stroke="#1e1f22" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 36 L32 14 L48 25 Z" fill="#f4a7c0"/></g>
      <g class="d-ear-r"><path d="M110 44 L103 3 L73 23 Z" fill="#3a3c43" stroke="#1e1f22" stroke-width="2.5" stroke-linejoin="round"/><path d="M102 36 L98 14 L82 25 Z" fill="#f4a7c0"/></g>`;
    case 'crown': return `<defs>${gold}</defs><g transform="rotate(-16 40 22)" class="d-bob"><path d="M17 33 L20 9 L31 22 L40 4 L49 22 L60 9 L63 33 Z" fill="url(#dg${k})" stroke="#9c6b00" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="17" y="31" width="46" height="6" rx="2" fill="url(#dg${k})" stroke="#9c6b00" stroke-width="1.4"/><circle cx="40" cy="5" r="3" fill="#ff5c8a"/><circle cx="20" cy="9" r="2.4" fill="#5cc8ff"/><circle cx="60" cy="9" r="2.4" fill="#5cc8ff"/><circle cx="40" cy="25" r="3" fill="#ff5c8a" class="d-tw"/></g>`;
    case 'leaves': {
      let out = '';
      for (let i = 0, a = 25; a <= 155; a += 13, i++) {
        const r = (a * Math.PI) / 180, x = 65 + 57 * Math.cos(r), y = 65 + 57 * Math.sin(r), rot = a + 90 + (i % 2 ? 28 : -28);
        out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="8" ry="3.6" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 3 ? '#3fb950' : '#7ee787'}" stroke="#196c2e" stroke-width=".8"/>`;
      }
      return `<g class="d-sway">${out}<circle cx="65" cy="122" r="4" fill="#ff7b72"/><circle cx="58" cy="120" r="3" fill="#ffa198"/><circle cx="72" cy="120" r="3" fill="#ffa198"/></g>`;
    }
    case 'hearts': return `<g class="d-spin-slow">${[0, 120, 240].map((a) => `<g transform="rotate(${a} 65 65) translate(65 5) scale(1.7)"><path d="${heart}" fill="#ff5c8a" stroke="#fff" stroke-width=".6"/></g>`).join('')}</g>`;
    case 'orbit': return `<defs><linearGradient id="do${k}" x1="0" x2="1"><stop offset="0" stop-color="#a5f3fc"/><stop offset=".5" stop-color="#c4b5fd"/><stop offset="1" stop-color="#f9a8d4"/></linearGradient></defs>
      <g transform="rotate(-18 65 65)"><ellipse cx="65" cy="65" rx="63" ry="15" fill="none" stroke="url(#do${k})" stroke-width="4" stroke-dasharray="150 30" class="d-dash"/></g>
      <circle cx="117" cy="40" r="6" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5" class="d-bob"/><circle cx="14" cy="92" r="3.5" fill="#c4b5fd" class="d-tw"/>`;
    case 'gears': return `<g class="d-gear" style="transform-origin:108px 104px"><path d="${gear(108, 104, 17, 9)}" fill="#b8c2cc" stroke="#5b6672" stroke-width="1.4" fill-rule="evenodd"/></g>
      <g class="d-gear-r" style="transform-origin:20px 24px"><path d="${gear(20, 24, 12, 7)}" fill="#ffb347" stroke="#8a5300" stroke-width="1.2" fill-rule="evenodd"/></g>`;
    case 'glitch': return `<g class="d-jit"><circle cx="63" cy="65" r="56" fill="none" stroke="#00e5ff" stroke-width="3" opacity=".85"/></g><g class="d-jit2"><circle cx="67" cy="65" r="56" fill="none" stroke="#ff2bd6" stroke-width="3" opacity=".85"/></g>
      <rect class="d-bar" x="4" y="30" width="34" height="5" fill="#00e5ff"/><rect class="d-bar d2" x="92" y="88" width="30" height="4" fill="#ff2bd6"/>`;
  }
  return '';
}
// the decoration, to lay over an avatar (it's bigger than the avatar, and lets clicks through)
export function decoEl(id) {
  if (!decoInfo(id)) return null;
  const s = el('span', { className: 'deco deco-' + id });
  s.innerHTML = `<svg viewBox="0 0 130 130" aria-hidden="true">${decoSVG(id)}</svg>`;
  return s;
}

// ---------- profile effects ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const COUNT = { snow: 26, sparkles: 16, bubbles: 14, petals: 16, embers: 18, pixels: 22, hearts: 12, confetti: 30, stars: 28 };
const CONFETTI = ['#ff4d6d', '#ffd43b', '#4dabf7', '#69db7c', '#b197fc', '#ff922b'];
// the effect, to lay over a profile card (pieces at random places, sizes and speeds)
export function effectEl(id) {
  if (!effectInfo(id)) return null;
  const box = el('div', { className: 'pfx pfx-' + id, ariaHidden: 'true' });
  for (let i = 0; i < (COUNT[id] || 16); i++) {
    const p = el('i');
    p.style.setProperty('--x', rnd(0, 100).toFixed(1) + '%');
    p.style.setProperty('--y', rnd(0, 100).toFixed(1) + '%');
    p.style.setProperty('--s', rnd(0.6, 1.4).toFixed(2));
    p.style.setProperty('--dur', rnd(5, 11).toFixed(1) + 's');
    p.style.setProperty('--delay', (-rnd(0, 11)).toFixed(1) + 's');
    p.style.setProperty('--drift', rnd(-30, 30).toFixed(0) + 'px');
    p.style.setProperty('--spin', (rnd(0, 1) > 0.5 ? 1 : -1) * rnd(180, 720).toFixed(0) + 'deg');
    if (id === 'confetti') p.style.setProperty('--c', CONFETTI[i % CONFETTI.length]);
    box.append(p);
  }
  if (id === 'stars') box.append(el('b', { className: 'pfx-shoot' }));
  return box;
}
