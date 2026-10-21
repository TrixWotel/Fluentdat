// The Shop and Quests, like Discord's: avatar decorations drawn around an avatar (most cost Datbux: datbux.js), profile
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

// ---------- profile frames ----------
// [id, name, the Quest that unlocks it]: drawn around a profile card, as on Discord: a band of art over its top, one
// over its bottom, and a coloured edge (300 wide; the bands grow with the card)
export const FRAMES = [
  ['moonlit', 'Moonlit Crows', ''], ['stardust', 'Stardust', ''], ['eyes', 'Watching Eyes', ''], ['goo', 'Ink Drip', ''],
  ['candles', 'Candlelight', ''], ['eclipse', 'Eclipse', ''], ['autumn', 'Autumn Leaves', ''], ['roses', 'Rose Vine', ''],
  ['wings', 'Fairy Wings', ''], ['thorns', 'Thornwire', ''], ['kitty', 'Kitty Cloud', ''], ['bunny', 'Ribbon Bunny', ''],
];
export const frameInfo = (id) => FRAMES.find((f) => f[0] === id) || null;
const FRAME_EDGE = { moonlit: '#3d5a5a', stardust: '#b28bff', eyes: '#e9e9e9', goo: '#09090b', candles: '#41d3dd', eclipse: '#ff9a3c',
  autumn: '#e2672b', roses: '#b9a6e8', wings: '#ffffffb0', thorns: '#8d959b', kitty: '#f7b6c8', bunny: '#c9b6ff' };
// (the same art every time: placed with a seeded random)
const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const f1 = (v) => (+v).toFixed(1);
const at = (x, y, inner, extra = '') => `<g transform="translate(${f1(x)} ${f1(y)})${extra}">${inner}</g>`;
const SPARK = 'M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10z';
const MAPLE = 'M0-9l2 4 3-2-1 5 4-1-2 4 3 1-5 2 1 3-5-2v4h-0.4v-4l-5 2 1-3-5-2 3-1-2-4 4 1-1-5 3 2z';
// a straight edge with drips hanging from it, left to right along y (as path commands, from where the path is)
function drips(y, r, maxLen) {
  let d = '', x = 0;
  while (x < 296) {
    const w = 6 + r() * 8, cx = Math.min(300 - w / 2, x + 10 + r() * 14 + w / 2), l = 3 + r() * maxLen;
    d += `L${f1(cx - w / 2)} ${y}C${f1(cx - w / 2)} ${f1(y + l * 0.6)} ${f1(cx - w * 0.45)} ${f1(y + l)} ${f1(cx)} ${f1(y + l)}C${f1(cx + w * 0.45)} ${f1(y + l)} ${f1(cx + w / 2)} ${f1(y + l * 0.6)} ${f1(cx + w / 2)} ${y}`;
    x = cx + w / 2;
  }
  return d + `L300 ${y}`;
}
function frameArt(id) {
  const r = seeded([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1);
  switch (id) {
    case 'moonlit': {
      const crow = (x, y, s, flip) => at(x, y, `<path fill="#0b1212" d="M0 0c2.5-3 7-4 10-1.5l3.5-1-2.6 2.7c.6 2.8-1.7 5.2-5 5.3l-1.4 3.5-.9-3.4C1.2 5-.6 2.9 0 0z"/>`, ` scale(${flip ? -s : s} ${s})`);
      return { top: `<circle cx="150" cy="31" r="27" fill="#e6ecef" class="pf-moon"/><g fill="#c8d2d8"><circle cx="141" cy="24" r="4.6"/><circle cx="159" cy="38" r="6.2"/><circle cx="157" cy="19" r="2.8"/><circle cx="137" cy="41" r="2.3"/></g>
        <g fill="none" stroke="#162222" stroke-linecap="round"><path stroke-width="8" d="M-4 14C30 5 60 20 96 12s46 6 66 16"/><path stroke-width="3.6" d="M38 12c6-9 15-11 24-10M78 15c5 7 4 13-2 18M116 15c8-8 19-9 28-6M20 12c-2-6 0-11 5-14"/>
        <path stroke-width="8" d="M304 12c-30-7-58 10-88 6s-40 4-50 13"/><path stroke-width="3.6" d="M264 12c-4-8-13-11-22-10M226 18c-2 8 0 13 6 16M190 22c-6-6-15-7-22-3M284 12c2-6 0-11-5-14"/></g>
        ${crow(46, -1, 1.9)}${crow(228, 2, 1.7, true)}${crow(100, 4, 1.4)}<g fill="#fff" opacity=".75"><circle cx="22" cy="38" r="1.1"/><circle cx="279" cy="42" r="1.3"/><circle cx="88" cy="44" r=".9"/><circle cx="212" cy="38" r="1"/></g>`,
        bot: `<g fill="none" stroke="#1a2727" stroke-linecap="round"><path stroke-width="5" d="M-4 54c26-10 50 2 76-4M304 52c-30-8-54 4-82-2"/><path stroke-width="2.5" d="M30 49c4-6 10-8 16-7M262 47c-4-6-10-8-16-6"/></g>` };
    }
    case 'stardust': {
      const cols = ['#ff7ad9', '#7ae8ff', '#ffe27a', '#b994ff', '#ffffff'];
      const star = (x, y, s, i) => at(x, y, `<path class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" fill="${cols[i % cols.length]}" d="${SPARK}"/>`, ` scale(${s.toFixed(2)})`);
      let top = '', bot = '';
      for (let i = 0; i < 30; i++) top += star(r() * 300, 3 + r() * (i < 20 ? 22 : 44), 0.22 + r() * (i < 6 ? 0.9 : 0.5), i);
      for (let i = 0; i < 40; i++) top += `<circle cx="${f1(r() * 300)}" cy="${f1(r() * 36)}" r="${f1(0.5 + r())}" fill="${cols[i % cols.length]}" opacity=".8"/>`;
      for (let i = 0; i < 10; i++) bot += star(r() * 300, 26 + r() * 30, 0.22 + r() * 0.45, i);
      return { top, bot };
    }
    case 'eyes': {
      const eye = (x, y, w) => at(x, y, `<g class="pf-blink" style="animation-delay:${f1(-r() * 5)}s"><ellipse rx="${f1(w)}" ry="${f1(w * 0.56)}" fill="#fff" stroke="#000" stroke-width="1.6"/>
        <circle r="${f1(w * 0.37)}" cx="${f1((r() - 0.5) * w * 0.5)}" fill="#111"/><circle cx="${f1(w * 0.14)}" cy="${f1(-w * 0.14)}" r="${f1(w * 0.1)}" fill="#fff"/></g>`);
      let band = 'M0 0H300V18', x = 300;
      while (x > 0) { const nx = Math.max(0, x - 24 - r() * 18); band += `C${f1(x - 6)} ${f1(30 + r() * 10)} ${f1(nx + 6)} ${f1(30 + r() * 10)} ${f1(nx)} 18`; x = nx; }
      let top = `<path fill="#060606" d="${band}Z"/>`;
      for (let i = 0; i < 9; i++) top += eye(16 + i * 33.5 + (r() - 0.5) * 8, 13 + r() * 9, 6 + r() * 6);
      let bot = '<path fill="#060606" d="M0 60V44C24 34 40 50 64 42s40 6 62-2 46 8 70 0 44 6 64-2 28 4 40 2V60Z"/>';
      for (let i = 0; i < 6; i++) bot += eye(24 + i * 51 + (r() - 0.5) * 10, 50 + r() * 4, 4 + r() * 3);
      return { top, bot };
    }
    case 'goo': {
      let d = 'M0 0H300V15', x = 300;
      while (x > 8) {
        const w = 7 + r() * 12, l = 8 + r() * 34, cx = x - 10 - r() * 20;
        if (cx - w / 2 < 0) break;
        d += `L${f1(cx + w / 2)} 15C${f1(cx + w / 2)} ${f1(15 + l * 0.6)} ${f1(cx + w * 0.9)} ${f1(15 + l)} ${f1(cx)} ${f1(15 + l)}C${f1(cx - w * 0.9)} ${f1(15 + l)} ${f1(cx - w / 2)} ${f1(15 + l * 0.6)} ${f1(cx - w / 2)} 15`;
        x = cx - w / 2;
      }
      let drops = '';
      for (let i = 0; i < 6; i++) drops += `<ellipse class="pf-drip" style="animation-delay:${f1(-r() * 4)}s" cx="${f1(20 + r() * 260)}" cy="${f1(40 + r() * 20)}" rx="2.4" ry="3.2" fill="#09090b"/>`;
      return { top: `<path fill="#09090b" d="${d}L0 15Z"/>${drops}<path d="M14 7c30-4 60 3 96-1M180 6c34-3 70 2 104-1" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        bot: `<path fill="#09090b" d="M0 60V46c18-8 30 4 46-2s22-12 40-4 30 8 48 2 34-6 50 0 32 8 52 0 24-6 34-2 20 6 30 4V60Z"/><g fill="#09090b"><circle cx="70" cy="38" r="3"/><circle cx="214" cy="40" r="2.3"/></g>` };
    }
    case 'candles': {
      let top = `<path fill="#35c3cc" d="M0 0V5${drips(5, r, 9)}V0Z"/><path fill="#2bb3bc" d="M0 38V45${drips(45, r, 13)}V38Z"/><path d="M0 39.5H300" stroke="#8ff3f8" stroke-width="1.5" opacity=".6"/>`;
      for (let i = 0; i < 8; i++) {
        const x = 20 + i * 37 + (r() - 0.5) * 8, h = 12 + r() * 13, y = 39 - h;
        top += `<rect x="${f1(x - 5)}" y="${f1(y)}" width="10" height="${f1(h + 1)}" rx="2.5" fill="#4fe0ea"/><rect x="${f1(x - 4)}" y="${f1(y + 1)}" width="3" height="${f1(h - 1)}" rx="1.5" fill="#fff" opacity=".4"/>
          <path d="M${f1(x + 2)} ${f1(y)}c0 3 2 4 2 7" stroke="#35c3cc" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)}v-2.6" stroke="#2a2a2a" stroke-width="1.2"/>`
          + at(x, y - 2.6, `<g class="pf-flick" style="animation-delay:${f1(-r())}s"><path class="pf-glow" fill="#ffb02e" d="M0-11c-4.6 4.6-4.6 9.2 0 11 4.6-1.8 4.6-6.4 0-11z"/><path fill="#fff4b0" d="M0-6.4c-2.2 2.4-2.2 4.6 0 5.8 2.2-1.2 2.2-3.4 0-5.8z"/></g>`);
      }
      return { top, bot: `<path fill="#35c3cc" d="M0 60V49c8 0 10-7 18-7s9 6 16 6 9 5 12 12ZM300 60V48c-8 0-11-6-19-6s-8 7-15 7-10 5-13 11Z"/>` };
    }
    case 'eclipse': {
      const cloud = (x, y, s, c) => at(x, y, `<g fill="${c}"><ellipse rx="22" ry="11"/><ellipse cx="-16" cy="4" rx="14" ry="9"/><ellipse cx="17" cy="5" rx="15" ry="8"/><ellipse cx="2" cy="-7" rx="13" ry="9"/></g>`, ` scale(${s})`);
      let top = '';
      for (let i = 0; i < 9; i++) top += cloud(r() * 300, 4 + r() * 20, 0.7 + r() * 0.7, i % 2 ? '#2a1d17' : '#3d2a1f');
      top += `<circle cx="150" cy="28" r="27" fill="none" stroke="#ffcf6b" stroke-width="3" class="pf-glow"/><circle cx="150" cy="28" r="24" fill="#050505"/><circle cx="150" cy="28" r="31" fill="none" stroke="#ff8a2a" stroke-width="2" opacity=".55" class="pf-glow"/>`;
      for (let i = 0; i < 5; i++) top += cloud(80 + r() * 140, 34 + r() * 14, 0.5 + r() * 0.5, '#2a1d17');
      let bot = '';
      for (let i = 0; i < 8; i++) bot += cloud(r() * 300, 50 + r() * 10, 0.6 + r() * 0.6, i % 2 ? '#2a1d17' : '#3d2a1f');
      return { top, bot };
    }
    case 'autumn': {
      const cols = ['#e2672b', '#f29a2e', '#c43f1f', '#f5c542', '#a8471f'];
      const leaf = (x, y, s, i) => at(x, y, i % 3 ? `<path fill="${cols[i % cols.length]}" d="${MAPLE}"/>` : `<ellipse rx="7" ry="3.6" fill="${cols[i % cols.length]}"/><path d="M-7 0H7" stroke="#7a2e12" stroke-width=".8"/>`, ` rotate(${f1(r() * 360)}) scale(${s.toFixed(2)})`);
      let top = '', bot = '';
      for (let i = 0; i < 60; i++) top += leaf(r() * 300, r() * (i < 40 ? 16 : 32), 0.8 + r() * 0.7, i);
      for (let i = 0; i < 34; i++) bot += leaf(r() * 300, 48 + r() * 14, 0.7 + r() * 0.6, i);
      return { top, bot };
    }
    case 'roses': {
      const rose = (x, y, s) => at(x, y, `<circle r="9" fill="#f3ead6"/><path d="M0-6a6 6 0 1 1-5.2 3M0-3a3 3 0 1 1-2.6 1.5M-6 4c3 2 9 2 12-1" stroke="#bfae8f" stroke-width="1.3" fill="none"/>`, ` scale(${s})`);
      const leaf = (x, y, a) => at(x, y, `<path fill="#8fae9a" d="M0 0c4-5 11-5 14 0-3 5-10 5-14 0z"/>`, ` rotate(${a})`);
      const top = `<g fill="none" stroke="#b9a6e8" stroke-width="2.6" stroke-linecap="round"><path d="M-4 10c30 10 52-12 78 0s42 14 76 2 50-12 78 0 46 8 76-6"/>
        <path d="M40 12c-6 8 2 16 10 11s2-12-4-8M110 4c6-8 16-6 16 2s-10 8-12 2M190 16c-4 8 4 14 11 9s1-11-5-7M262 6c6-8 15-5 14 3s-10 7-11 1"/></g>
        ${leaf(60, 12, -20)}${leaf(130, 8, 200)}${leaf(176, 14, -30)}${leaf(236, 10, 160)}${rose(84, 10, 1.25)}${rose(150, 16, 1.5)}${rose(216, 9, 1.2)}
        <path d="M-4 3c10 2 18 0 30-2M304 3c-10 2-18 0-30-2" stroke="#b9a6e8" stroke-width="2" fill="none"/>`;
      return { top, bot: `<g fill="none" stroke="#b9a6e8" stroke-width="2.4" stroke-linecap="round"><path d="M-4 52c24-8 40 6 64-2s34-8 50 0M304 52c-24-8-40 6-64-2s-34-8-50 0"/><path d="M40 50c4-7 12-6 12 0s-8 6-8 1M260 50c-4-7-12-6-12 0s8 6 8 1"/></g>${rose(150, 53, 1.1)}${leaf(128, 52, 180)}${leaf(158, 52, 0)}` };
    }
    case 'wings': {
      const wing = (flip) => `<g transform="translate(150 30) scale(${flip ? -1 : 1} 1)"><path d="M4 2C30-26 92-30 118-12 98-6 80 4 60 6 80 10 92 22 96 34 70 32 34 24 4 6z" fill="#fff" opacity=".62" stroke="#fff" stroke-width="1.2"/>
        <path d="M8 4C34-14 76-16 100-10M10 6c26 4 50 10 74 24M8 5c20-4 40-6 58-4" stroke="#d9e6ff" stroke-width="1" fill="none" opacity=".9"/></g>`;
      let dust = '';
      for (let i = 0; i < 22; i++) dust += `<circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(40 + r() * 220)}" cy="${f1(r() * 60)}" r="${f1(0.6 + r() * 1.4)}" fill="#fff"/>`;
      return { top: `${wing(false)}${wing(true)}<circle cx="150" cy="31" r="6" fill="#fff" class="pf-glow"/>${dust}`, bot: `<path d="M60 58c30-8 150-8 180 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>` };
    }
    case 'thorns': {
      const wire = (y, a) => {
        let p1 = `M-4 ${y}`, p2 = `M-4 ${y}`, thorns = '';
        for (let x = 0; x <= 304; x += 12) { p1 += `Q${x - 6} ${y - a} ${x} ${y}`; p2 += `Q${x - 6} ${y + a} ${x} ${y}`; if (x % 36 === 0) thorns += `<path fill="#6c757a" d="M${x - 3} ${y}l3-7 3 7zM${x + 3} ${y}l-3 7-3-7z"/>`; }
        return `<path d="${p1}" stroke="#8d959b" stroke-width="2.2" fill="none"/><path d="${p2}" stroke="#5f676c" stroke-width="2.2" fill="none"/>${thorns}`;
      };
      return { top: wire(10, 5) + wire(4, 2), bot: wire(52, 5) };
    }
    case 'kitty': {
      let stars = '';
      for (let i = 0; i < 6; i++) stars += at(30 + r() * 240, 6 + r() * 30, `<path class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" fill="#ffe27a" d="${SPARK}"/>`, ' scale(.4)');
      return { top: `<path fill="#fff0f4" stroke="#f3a9bf" stroke-width="2" d="M58 0h184c0 10-4 20-14 26 2 6-2 13-8 14-10 12-26 16-70 16s-60-4-70-16c-6-1-10-8-8-14C62 20 58 10 58 0z"/>
        <path fill="#fff0f4" stroke="#f3a9bf" stroke-width="2" d="M84 6l10-14 14 12M216 6l-10-14-14 12"/><path fill="#ffc6d6" d="M92 3l3-6 6 6M208 3l-3-6-6 6"/>
        <g fill="none" stroke="#5a3a45" stroke-width="2.2" stroke-linecap="round"><path d="M122 24q6-6 12 0M166 24q6-6 12 0"/><path d="M144 32q3 3 6 0 3 3 6 0"/></g>
        <g fill="#ffb3c7"><ellipse cx="116" cy="33" rx="7" ry="3.5"/><ellipse cx="184" cy="33" rx="7" ry="3.5"/></g>
        <path d="M92 28H74M94 34l-17 4M208 28h18M206 34l17 4" stroke="#f3a9bf" stroke-width="1.6" stroke-linecap="round"/>${stars}`,
        bot: `<g fill="#fff0f4" stroke="#f3a9bf" stroke-width="2"><ellipse cx="34" cy="58" rx="20" ry="11"/><ellipse cx="266" cy="58" rx="20" ry="11"/></g><g fill="#ffb3c7"><circle cx="26" cy="54" r="2.6"/><circle cx="34" cy="51" r="2.6"/><circle cx="42" cy="54" r="2.6"/><circle cx="258" cy="54" r="2.6"/><circle cx="266" cy="51" r="2.6"/><circle cx="274" cy="54" r="2.6"/></g>` };
    }
    case 'bunny': {
      let hearts = '';
      for (let i = 0; i < 7; i++) hearts += at(20 + r() * 260, 26 + r() * 20, `<path fill="${i % 2 ? '#ffb6d9' : '#c9b6ff'}" d="M0 3C-6-1-4-6 0-3c4-3 6 2 0 6z"/>`, ` scale(${(0.9 + r() * 0.6).toFixed(2)})`);
      return { top: `<g transform="translate(150 6)"><path fill="#fff" stroke="#e8dcff" stroke-width="1.5" d="M-14 2c-6-16-4-30 2-30s8 14 4 30zM14 2c6-16 4-30-2-30s-8 14-4 30z"/><path fill="#ffc6e0" d="M-11-2c-3-10-2-20 1-20s4 9 2 20zM11-2c3-10 2-20-1-20s-4 9-2 20z"/></g>
        <path d="M-4 8c40 14 80-8 120 4s28 10 34 10 18-2 34-10 80 10 120-4" stroke="#c9b6ff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-4 8c40 14 80-8 120 4" stroke="#ffb6d9" stroke-width="2" fill="none" opacity=".8"/>
        <g transform="translate(150 22)"><path fill="#ffb6d9" d="M0 0c-10-10-26-8-24 2s16 6 24-2zM0 0c10-10 26-8 24 2S8 8 0 0z"/><circle r="5" fill="#ff9ccb"/><path d="M-3 4l-8 16M3 4l8 16" stroke="#ffb6d9" stroke-width="4" stroke-linecap="round"/></g>${hearts}`,
        bot: `<path d="M-4 52c40-10 70 8 110-2M304 52c-40-10-70 8-110-2" stroke="#c9b6ff" stroke-width="5" fill="none" stroke-linecap="round"/>` };
    }
  }
  return null;
}
const ART = new Map();
// the frame, to lay over a profile card (it lets clicks through)
export function frameEl(id) {
  if (!frameInfo(id)) return null;
  if (!ART.has(id)) ART.set(id, frameArt(id));
  const a = ART.get(id); if (!a) return null;
  const box = el('div', { className: 'pframe pframe-' + id });
  box.setAttribute('aria-hidden', 'true');
  box.style.setProperty('--pf-c', FRAME_EDGE[id] || '#fff');
  box.innerHTML = `<svg class="pf-top" viewBox="0 0 300 90" preserveAspectRatio="xMidYMin meet">${a.top}</svg><svg class="pf-bot" viewBox="0 0 300 60" preserveAspectRatio="xMidYMax meet">${a.bot}</svg>`;
  return box;
}
