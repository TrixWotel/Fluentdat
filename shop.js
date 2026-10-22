// The Shop and Quests, like Discord's: avatar decorations drawn around an avatar, profile effects that play over a profile
// card, profile frames drawn around one (nameplates are in plates.js; everything costs Datbux: datbux.js), and Quests:
// things to do in Fluentdat that give you some of them.
// A decoration is an SVG a little bigger than the avatar (130 × 130, the avatar being the circle of radius 50 in the
// middle); an effect is a layer of little pieces the page's CSS moves (index.html, "the Shop").
import { el } from './ui.js';

// [id, name, the Quest that gives it ('' when there's none)]
export const DECORATIONS = [
  ['halo', 'Halo', ''], ['flame', 'Ring of Fire', ''], ['catears', 'Cat Ears', ''], ['leaves', 'Leafy Wreath', ''],
  ['gears', 'Robot Gears', ''], ['glitch', 'Glitch', ''], ['hearts', 'Orbiting Hearts', ''],
  ['sparkle', 'Sparkles', 'first-steps'], ['rainbow', 'Rainbow Ring', 'chatterbox'], ['neon', 'Neon Ring', 'connected'],
  ['orbit', 'Planet Ring', 'show-and-tell'], ['crown', 'Crown', 'planner'],
  ['bubbles', 'Bubble Ring', ''], ['starring', 'Star Ring', ''], ['snowflakes', 'Snowflakes', ''], ['devil', 'Devil Horns', ''],
  ['angel', 'Angel Wings', ''], ['bunny', 'Bunny Ears', ''], ['headphones', 'Headphones', ''], ['flowers', 'Flower Crown', ''],
  ['bolts', 'Lightning', ''], ['notes', 'Music Notes', ''], ['pixel', '8-Bit Ring', ''], ['foxears', 'Fox Ears', ''],
  ['clouds', 'Cloud Puffs', ''], ['aurora', 'Aurora Ring', ''], ['sakura', 'Cherry Blossoms', ''], ['witch', 'Witch Hat', ''],
  ['bow', 'Big Bow', ''], ['shades', 'Cool Shades', ''], ['moon', 'Moon and Stars', ''], ['crystals', 'Crystal Ring', ''],
];
export const EFFECTS = [
  ['snow', 'Snowfall', ''], ['sparkles', 'Twinkles', ''], ['bubbles', 'Bubbles', ''], ['petals', 'Petals', ''], ['embers', 'Embers', ''], ['pixels', 'Pixel Rain', ''],
  ['hearts', 'Floating Hearts', 'reactor'], ['confetti', 'Confetti', 'party-up'], ['stars', 'Starry Night', 'game-on'],
  ['rain', 'Rain', ''], ['fireflies', 'Fireflies', ''], ['leaves', 'Falling Leaves', ''], ['butterflies', 'Butterflies', ''], ['music', 'Music Notes', ''],
  ['comets', 'Comets', ''], ['code', 'Code Rain', ''], ['balloons', 'Balloons', ''], ['aurora', 'Aurora', ''], ['lightning', 'Lightning', ''],
  ['galaxy', 'Galaxy Dust', ''], ['smoke', 'Smoke', ''], ['coins', 'Coin Shower', ''], ['ghosts', 'Ghosts', ''], ['clovers', 'Lucky Clovers', ''],
  ['diamonds', 'Diamonds', ''], ['waves', 'Ocean Waves', ''], ['flames', 'Flames', ''], ['bokeh', 'Bokeh', ''], ['paws', 'Paw Prints', ''],
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
const star5 = 'M0-7l2 4.6 5 .5-3.8 3.3 1.2 4.9L0 2.8-4.4 5.3-3.2.4-7-2.9l5-.5z';
const heart = 'M0 4 C-7 -2 -3 -9 0 -4.5 C3 -9 7 -2 0 4Z';
const ringAt = (i, n, rad = 57) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [(65 + rad * Math.cos(a)).toFixed(1), (65 + rad * Math.sin(a)).toFixed(1)]; };
const flake = '<g stroke="#e8f6ff" stroke-width="1.6" stroke-linecap="round" fill="none">' + [0, 60, 120].map((a) => `<path transform="rotate(${a})" d="M0-8V8M-2.5-6 0-3.5 2.5-6M-2.5 6 0 3.5 2.5 6"/>`).join('') + '</g>';
const blossom = (x, y, s, c = '#ffc6d9', mid = '#f06595') => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<path transform="rotate(${a})" d="M0 0C-4-4-4-9 0-10 4-9 4-4 0 0Z" fill="${c}" stroke="${mid}" stroke-width=".6"/>`).join('')}<circle r="1.8" fill="${mid}"/></g>`;
const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><g fill="#fff" stroke="#dbe4ff" stroke-width="1.2"><circle cx="-8" cy="2" r="7"/><circle cx="0" cy="-3" r="9"/><circle cx="9" cy="2" r="7"/><rect x="-14" y="2" width="28" height="7" rx="3.5"/></g></g>`;
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
    case 'bubbles': return [[18, 30, 9, 0], [112, 22, 7, 0.5], [120, 92, 10, 1], [14, 98, 7, 1.5], [65, 4, 6, 0.8], [100, 118, 5, 2], [30, 120, 6, 0.3]].map(([x, y, r, d]) =>
      `<g class="d-bob" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="#9be7ff" fill-opacity=".18" stroke="#c9f3ff" stroke-width="1.6"/><circle cx="${(x - r * 0.35).toFixed(1)}" cy="${(y - r * 0.35).toFixed(1)}" r="${(r * 0.25).toFixed(1)}" fill="#fff" fill-opacity=".85"/></g>`).join('');
    case 'starring': return `<g class="d-spin-slow">${Array.from({ length: 8 }, (_, i) => { const [x, y] = ringAt(i, 8, 58); return `<g transform="translate(${x} ${y}) scale(${i % 2 ? 0.8 : 1.15})"><path d="${star5}" fill="${i % 2 ? '#fff4b8' : '#ffd43b'}" stroke="#c98d0b" stroke-width=".8"/></g>`; }).join('')}</g>`;
    case 'snowflakes': return [[20, 22, 1.2, 0], [110, 18, 0.9, 0.7], [122, 72, 1, 1.4], [104, 116, 1.1, 0.3], [18, 104, 0.8, 1], [8, 62, 0.7, 1.8]].map(([x, y, sc, d]) =>
      `<g transform="translate(${x} ${y}) scale(${sc})"><g class="d-twirl" style="animation-delay:-${d}s">${flake}</g></g>`).join('');
    case 'devil': return `<g class="d-bob"><path d="M30 30C20 16 22 6 30 0 30 10 36 18 44 24Z" fill="#e53935" stroke="#7f1212" stroke-width="2" stroke-linejoin="round"/><path d="M100 30C110 16 108 6 100 0 100 10 94 18 86 24Z" fill="#e53935" stroke="#7f1212" stroke-width="2" stroke-linejoin="round"/></g>
      <g class="d-wag"><path d="M106 110C122 118 128 102 118 94" fill="none" stroke="#e53935" stroke-width="3.2" stroke-linecap="round"/><path d="M118 94l-2-9 8 5z" fill="#e53935" stroke="#7f1212" stroke-width="1"/></g>`;
    case 'angel': {
      const wing = '<path d="M0 0C-10-14-30-18-40-8-30-6-26-2-24 2-34 0-40 6-40 12-30 8-22 10-18 14-24 18-26 24-22 28-12 20-4 12 0 0Z" fill="#fff" stroke="#cfd8ff" stroke-width="1.4"/><path d="M-6-2C-14-8-24-10-32-6M-8 2C-16 2-24 6-30 10M-6 6C-12 10-16 16-18 22" stroke="#dbe4ff" stroke-width="1" fill="none"/>';
      return `<g class="d-flap-l"><g transform="translate(20 62)">${wing}</g></g><g class="d-flap-r"><g transform="translate(110 62) scale(-1 1)">${wing}</g></g>`;
    }
    case 'bunny': return `<g class="d-ear-l"><path d="M34 34C24 6 30-14 40-12 50-10 50 14 46 32Z" fill="#fafafa" stroke="#c9c9d6" stroke-width="2"/><path d="M38 28C33 8 36-4 40-4 44-4 44 12 42 28Z" fill="#ffc1d6"/></g>
      <g class="d-ear-r"><path d="M96 34C106 6 100-14 90-12 80-10 80 14 84 32Z" fill="#fafafa" stroke="#c9c9d6" stroke-width="2"/><path d="M92 28C97 8 94-4 90-4 86-4 86 12 88 28Z" fill="#ffc1d6"/></g>`;
    case 'headphones': return `<path d="M14 66C14 20 116 20 116 66" fill="none" stroke="#2b2d31" stroke-width="7" stroke-linecap="round"/><path d="M14 66C14 20 116 20 116 66" fill="none" stroke="#5865f2" stroke-width="3" stroke-linecap="round"/>
      <rect x="4" y="54" width="18" height="32" rx="8" fill="#5865f2" stroke="#2b2d31" stroke-width="2.5"/><rect x="108" y="54" width="18" height="32" rx="8" fill="#5865f2" stroke="#2b2d31" stroke-width="2.5"/>
      <g class="d-note"><path d="M120 30V16l8-2v12" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="118" cy="30" r="2.6" fill="#fff"/><circle cx="126" cy="28" r="2.6" fill="#fff"/></g>`;
    case 'flowers': return `<path d="M14 40C30 14 100 14 116 40" fill="none" stroke="#3fb950" stroke-width="3"/>` + [[18, 36, '#ff8fab', 1], [34, 22, '#ffd1dc', 0.9], [52, 14, '#b197fc', 1], [78, 14, '#ff8fab', 1], [96, 22, '#ffd1dc', 0.9], [112, 36, '#b197fc', 1], [65, 10, '#ffffff', 0.8]]
      .map(([x, y, c, sc]) => blossom(x, y, sc, c, '#e64980')).join('') + `<g fill="#3fb950"><ellipse cx="26" cy="30" rx="4" ry="2" transform="rotate(-40 26 30)"/><ellipse cx="104" cy="30" rx="4" ry="2" transform="rotate(40 104 30)"/></g>`;
    case 'bolts': return [[14, 30, 1, 0], [116, 24, 1.1, 0.4], [118, 100, 0.9, 0.8], [12, 104, 1, 1.2]].map(([x, y, sc, d]) =>
      `<g transform="translate(${x} ${y}) scale(${sc})"><path class="d-flash" style="animation-delay:${d}s" d="M0-12-5 1h4l-3 11L6-3H1l3-9Z" fill="#ffe066" stroke="#f59f00" stroke-width="1.2" stroke-linejoin="round"/></g>`).join('')
      + `<circle cx="65" cy="65" r="57" fill="none" stroke="#ffe066" stroke-width="1.5" stroke-dasharray="3 9" class="d-spin"/>`;
    case 'notes': return `<g class="d-spin-slow">${[0, 90, 180, 270].map((a, i) => `<g transform="rotate(${a} 65 65) translate(65 3)">${i % 2
      ? '<path d="M-3 4V-8l8-2V2" fill="none" stroke="#b197fc" stroke-width="2"/><circle cx="-5" cy="4" r="3" fill="#b197fc"/><circle cx="3" cy="2" r="3" fill="#b197fc"/>'
      : '<path d="M0 4V-9c4 2 6 4 6 7" fill="none" stroke="#74c0fc" stroke-width="2"/><circle cx="-2.4" cy="4" r="3.2" fill="#74c0fc"/>'}</g>`).join('')}</g>`;
    case 'pixel': {
      let out = '';
      for (let i = 0; i < 32; i++) { const [x, y] = ringAt(i, 32, 56); out += `<rect x="${Math.round(x / 6) * 6 - 3}" y="${Math.round(y / 6) * 6 - 3}" width="6" height="6" fill="${['#ff5c8a', '#ffd43b', '#69db7c', '#4dabf7'][i % 4]}"/>`; }
      return `<g class="d-hue">${out}</g>`;
    }
    case 'foxears': return `<g class="d-ear-l"><path d="M18 46L22 0l32 22Z" fill="#f08c28" stroke="#8a3c00" stroke-width="2.4" stroke-linejoin="round"/><path d="M22 0l-3 12 11-4Z" fill="#3a2a20"/><path d="M26 38l2-26 18 12Z" fill="#fff4e6"/></g>
      <g class="d-ear-r"><path d="M112 46L108 0 76 22Z" fill="#f08c28" stroke="#8a3c00" stroke-width="2.4" stroke-linejoin="round"/><path d="M108 0l3 12-11-4Z" fill="#3a2a20"/><path d="M104 38l-2-26-18 12Z" fill="#fff4e6"/></g>`;
    case 'clouds': return `<g class="d-sway">${cloud(22, 104, 1.2)}${cloud(65, 120, 1.4)}${cloud(108, 104, 1.2)}${cloud(112, 26, 0.8)}</g>`;
    case 'aurora': return `<defs><linearGradient id="da${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ef0c2"/><stop offset=".5" stop-color="#7b61ff"/><stop offset="1" stop-color="#ff6ec7"/></linearGradient><filter id="dab${k}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter></defs>
      <g class="d-spin"><circle cx="65" cy="65" r="56" fill="none" stroke="url(#da${k})" stroke-width="7" filter="url(#dab${k})" opacity=".85"/><circle cx="65" cy="65" r="56" fill="none" stroke="url(#da${k})" stroke-width="2.5"/></g>`;
    case 'sakura': return `<path d="M6 92C20 70 18 40 36 22" fill="none" stroke="#6b3e2e" stroke-width="2.6" stroke-linecap="round"/><path d="M18 50c6-2 10-6 12-12" fill="none" stroke="#6b3e2e" stroke-width="1.8" stroke-linecap="round"/>
      ${blossom(36, 22, 1.2)}${blossom(18, 46, 1)}${blossom(10, 76, 0.9)}${blossom(104, 16, 0.9)}${blossom(120, 38, 0.8)}` + [[90, 110, 0], [70, 124, 1], [114, 86, 2]].map(([x, y, d]) => `<ellipse class="d-tw" style="animation-delay:${d}s" cx="${x}" cy="${y}" rx="3" ry="2" fill="#ffc6d9"/>`).join('');
    case 'witch': return `<g transform="rotate(-14 60 18)"><g class="d-bob"><path d="M28 30 62-24 74 26Z" fill="#3b2459" stroke="#1b0f2b" stroke-width="2" stroke-linejoin="round"/><ellipse cx="60" cy="30" rx="40" ry="8" fill="#3b2459" stroke="#1b0f2b" stroke-width="2"/>
      <path d="M34 25h48l-1.5 6H35.5Z" fill="#f59f00"/><rect x="54" y="23" width="10" height="9" rx="1.5" fill="none" stroke="#ffd43b" stroke-width="2"/></g></g>`;
    case 'bow': return `<g transform="translate(65 10)"><g class="d-bob"><path d="M0 0C-12-14-34-12-32 2-30 14-12 10 0 0Z" fill="#ff6b9a" stroke="#c2255c" stroke-width="2"/><path d="M0 0C12-14 34-12 32 2 30 14 12 10 0 0Z" fill="#ff6b9a" stroke="#c2255c" stroke-width="2"/>
      <path d="M-4 2-14 22l8-2 4 6ZM4 2l10 20-8-2-4 6Z" fill="#ff6b9a" stroke="#c2255c" stroke-width="1.6" stroke-linejoin="round"/><circle r="5" fill="#ff8fab" stroke="#c2255c" stroke-width="2"/></g></g>`;
    case 'shades': return `<g class="d-bob"><path d="M28 51h74" stroke="#111" stroke-width="3"/><path d="M27 49h31v8c0 9-8 14-16 14-9 0-15-6-15-14Z" fill="#111" stroke="#000" stroke-width="1.4"/><path d="M72 49h31v8c0 9-6 14-15 14-8 0-16-5-16-14Z" fill="#111" stroke="#000" stroke-width="1.4"/>
      <path class="d-glint" d="M33 54l9 0M77 54l9 0" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>`;
    case 'moon': return `<defs><mask id="dm${k}"><circle cx="106" cy="20" r="17" fill="#fff"/><circle cx="114" cy="13" r="14" fill="#000"/></mask></defs><g class="d-bob"><circle cx="106" cy="20" r="17" fill="#ffe8a3" mask="url(#dm${k})"/></g>`
      + [[16, 26, 0.7, 0], [32, 8, 0.5, 0.8], [10, 84, 0.6, 1.4], [122, 98, 0.5, 2], [86, 6, 0.45, 1]].map(([x, y, sc, d]) => `<g transform="translate(${x} ${y}) scale(${sc})"><path class="d-tw" style="animation-delay:${d}s" d="${star4}" fill="#fff6c4"/></g>`).join('');
    case 'crystals': return `<g class="d-spin-slow">${Array.from({ length: 10 }, (_, i) => `<g transform="rotate(${i * 36} 65 65) translate(65 6) scale(${i % 2 ? 0.8 : 1.1})"><path d="M0-12 5-2 2 10H-3l-2-12Z" fill="${i % 2 ? '#a5d8ff' : '#d0bfff'}" fill-opacity=".85" stroke="#fff" stroke-width=".8"/></g>`).join('')}</g>`;
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
const COUNT = { snow: 26, sparkles: 16, bubbles: 14, petals: 16, embers: 18, pixels: 22, hearts: 12, confetti: 30, stars: 28,
  rain: 40, fireflies: 14, leaves: 16, butterflies: 9, music: 12, comets: 5, code: 26, balloons: 8, aurora: 4, lightning: 2,
  galaxy: 40, smoke: 10, coins: 18, ghosts: 7, clovers: 14, diamonds: 14, waves: 3, flames: 22, bokeh: 12, paws: 10 };
// (each piece's colour, in turn, for the effects that have several)
const COLORS = { confetti: ['#ff4d6d', '#ffd43b', '#4dabf7', '#69db7c', '#b197fc', '#ff922b'], butterflies: ['#ff8fab', '#74c0fc', '#ffd43b', '#b197fc', '#69db7c'],
  music: ['#b197fc', '#74c0fc', '#ff8fab', '#ffffff'], balloons: ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#da77f2'], aurora: ['#4ef0c2', '#7b61ff', '#38d9a9', '#ff6ec7'],
  galaxy: ['#ffffff', '#a5d8ff', '#ffc9de', '#d0bfff', '#ffe066'], bokeh: ['#ffd43b', '#ff8787', '#74c0fc', '#b197fc', '#63e6be'] };
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
    if (COLORS[id]) p.style.setProperty('--c', COLORS[id][i % COLORS[id].length]);
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
  ['ocean', 'Ocean Waves', ''], ['blossom', 'Sakura Branch', ''], ['neonsign', 'Neon Lights', ''], ['pixelhearts', 'Pixel Hearts', ''],
  ['planets', 'Planets', ''], ['pines', 'Pine Forest', ''], ['candy', 'Candy Shop', ''], ['circuit', 'Circuit Board', ''],
  ['skies', 'Sunny Sky', ''], ['inferno', 'Inferno', ''], ['frost', 'Frost', ''], ['garden', 'Flower Garden', ''],
  ['melody', 'Melody', ''], ['royal', 'Royal Gold', ''], ['bats', 'Spooky Bats', ''], ['synth', 'Retro Sunset', ''],
  ['paws', 'Paw Prints', ''], ['lanterns', 'Paper Lanterns', ''], ['shrooms', 'Mushroom Forest', ''], ['overrainbow', 'Over the Rainbow', ''],
];
export const frameInfo = (id) => FRAMES.find((f) => f[0] === id) || null;
const FRAME_EDGE = { moonlit: '#3d5a5a', stardust: '#b28bff', eyes: '#e9e9e9', goo: '#09090b', candles: '#41d3dd', eclipse: '#ff9a3c',
  autumn: '#e2672b', roses: '#b9a6e8', wings: '#ffffffb0', thorns: '#8d959b', kitty: '#f7b6c8', bunny: '#c9b6ff',
  ocean: '#4dabf7', blossom: '#f7a8c8', neonsign: '#ff4fd8', pixelhearts: '#ff6b9a', planets: '#845ef7', pines: '#2b8a3e', candy: '#ff8787', circuit: '#20c997',
  skies: '#74c0fc', inferno: '#ff6b00', frost: '#a5d8ff', garden: '#69db7c', melody: '#b197fc', royal: '#f5c542', bats: '#7950f2', synth: '#ff4fa3',
  paws: '#e9b97c', lanterns: '#ff6b6b', shrooms: '#e03131', overrainbow: '#ffd43b' };
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
// a band hanging from the top edge, or rising from the bottom one, with a wavy edge (amp up and down, every len)
function waveTop(y, amp, len, fill, extra = '') { let d = `M0 0H300V${y}`, i = 0; for (let x = 300; x > 0; x -= len, i++) d += `Q${f1(x - len / 2)} ${f1(y + (i % 2 ? -amp : amp))} ${f1(x - len)} ${y}`; return `<path fill="${fill}"${extra} d="${d}V0Z"/>`; }
function waveBot(y, amp, len, fill, extra = '') { let d = `M0 60V${y}`, i = 0; for (let x = 0; x < 300; x += len, i++) d += `Q${f1(x + len / 2)} ${f1(y + (i % 2 ? amp : -amp))} ${f1(x + len)} ${y}`; return `<path fill="${fill}"${extra} d="${d}V60Z"/>`; }
const PAW = '<ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-5.5" cy="-3" r="2.2"/><circle cx="-2" cy="-6.5" r="2.2"/><circle cx="2" cy="-6.5" r="2.2"/><circle cx="5.5" cy="-3" r="2.2"/>';
const FLAME = 'M0 0C-6-6-5-12 0-18 0-12 6-10 4-4 7-7 7-11 6-13 10-8 9-2 5 2 3 4-3 4 0 0Z';
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
    case 'ocean': {
      let top = waveTop(16, 5, 30, '#1c7ed6') + waveTop(10, 4, 24, '#4dabf7', ' opacity=".85"'), bot = waveBot(44, 4, 30, '#1864ab') + waveBot(51, 3, 20, '#339af0', ' opacity=".9"');
      for (let i = 0; i < 10; i++) top += `<circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(r() * 300)}" cy="${f1(24 + r() * 26)}" r="${f1(1 + r() * 2)}" fill="none" stroke="#a5d8ff" stroke-width="1"/>`;
      bot += at(64, 36, '<path fill="#ffa94d" d="M0 0c6-6 14-6 18 0-4 6-12 6-18 0zM18 0l6-5v10z"/><circle cx="5" cy="-1" r="1.2" fill="#222"/>') + at(236, 40, '<path fill="#63e6be" d="M0 0c-6-5-13-5-16 0 3 5 10 5 16 0zM-16 0l-5-4v8z"/><circle cx="-5" cy="-1" r="1" fill="#222"/>');
      return { top, bot };
    }
    case 'blossom': {
      let top = `<path d="M-4 10C40 24 80 4 130 14S220 30 304 8" fill="none" stroke="#6b3e2e" stroke-width="5" stroke-linecap="round"/><path d="M60 16c8 8 20 10 30 8M170 18c-6 10-4 18 4 24M240 16c10-2 18 2 22 10" fill="none" stroke="#6b3e2e" stroke-width="2.6" stroke-linecap="round"/>`;
      for (let i = 0; i < 16; i++) top += blossom(f1(10 + r() * 280), f1(6 + r() * 18), (0.8 + r() * 0.6).toFixed(2));
      for (let i = 0; i < 8; i++) top += `<ellipse class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(r() * 300)}" cy="${f1(30 + r() * 30)}" rx="3" ry="2" fill="#ffc6d9"/>`;
      let bot = ''; for (let i = 0; i < 12; i++) bot += `<ellipse cx="${f1(r() * 300)}" cy="${f1(50 + r() * 8)}" rx="3" ry="1.8" fill="#ffc6d9"/>`;
      return { top, bot };
    }
    case 'neonsign': {
      const glow = (d, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="5" opacity=".35" stroke-linecap="round" stroke-linejoin="round"/><path class="pf-buzz" d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      return { top: glow('M-4 6H304', '#ff4fd8') + glow('M150 34c-10-12-28-6-22 6 3 7 22 18 22 18s19-11 22-18c6-12-12-18-22-6z', '#ff4fd8') + glow('M60 30l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z', '#5ff4ff') + glow('M240 28l-8 14h8l-4 14 14-18h-8l6-10z', '#ffe066'),
        bot: glow('M-4 54H304', '#5ff4ff') + glow('M20 46h40M240 46h40', '#ff4fd8') };
    }
    case 'pixelhearts': {
      const ph = (x, y, c) => at(x, y, ['0 1', '1 0', '2 1', '3 0', '4 1', '0 2', '1 1', '2 2', '3 1', '4 2', '1 2', '3 2', '1 3', '2 3', '3 3', '2 4', '2 1'].map((p) => { const [a, b] = p.split(' '); return `<rect x="${a * 3}" y="${b * 3}" width="3" height="3" fill="${c}"/>`; }).join(''));
      let top = '', bot = '';
      for (let i = 0; i < 12; i++) top += ph(6 + i * 25, 4 + (i % 2) * 8, i % 3 ? '#ff6b9a' : '#ffd43b');
      for (let i = 0; i < 12; i++) bot += ph(6 + i * 25, 44 + (i % 2) * 4, i % 3 ? '#ff6b9a' : '#ff8fab');
      return { top: `<g class="pf-steps">${top}</g>`, bot };
    }
    case 'planets': {
      let top = `<circle cx="60" cy="24" r="16" fill="#ff922b"/><ellipse cx="60" cy="24" rx="28" ry="6" fill="none" stroke="#ffd8a8" stroke-width="2.5" transform="rotate(-18 60 24)"/>
        <circle cx="236" cy="20" r="11" fill="#4dabf7"/><path d="M228 16c4 2 10 1 14-2M227 23c5 1 11 0 16-3" stroke="#d0ebff" stroke-width="1.5" fill="none"/><circle cx="150" cy="10" r="5" fill="#cc5de8"/>`;
      for (let i = 0; i < 26; i++) top += `<circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(r() * 300)}" cy="${f1(r() * 50)}" r="${f1(0.5 + r())}" fill="#fff"/>`;
      return { top, bot: `<circle cx="34" cy="50" r="8" fill="#69db7c"/><circle cx="270" cy="52" r="6" fill="#ffd43b"/><path d="M110 56c20-6 60-6 80 0" stroke="#845ef7" stroke-width="2" fill="none" opacity=".6"/>` };
    }
    case 'pines': {
      const pine = (x, y, h, c) => `<path fill="${c}" d="M${f1(x)} ${f1(y - h)}l${f1(h * 0.28)} ${f1(h * 0.38)}h${f1(-h * 0.12)}l${f1(h * 0.2)} ${f1(h * 0.3)}h${f1(-h * 0.12)}l${f1(h * 0.24)} ${f1(h * 0.32)}H${f1(x - h * 0.4)}l${f1(h * 0.24)}-${f1(h * 0.32)}h${f1(-h * 0.12)}l${f1(h * 0.2)}-${f1(h * 0.3)}h${f1(-h * 0.12)}Z"/>`;
      let bot = '';
      for (let i = 0; i < 16; i++) bot += pine(r() * 300, 62, 18 + r() * 22, i % 2 ? '#1b4332' : '#2b8a3e');
      let top = `<circle cx="248" cy="22" r="13" fill="#fff3bf"/>`;
      for (let i = 0; i < 18; i++) top += `<circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(r() * 300)}" cy="${f1(r() * 40)}" r="${f1(0.5 + r() * 0.9)}" fill="#fff"/>`;
      return { top, bot };
    }
    case 'candy': {
      const cane = (x, flip) => at(x, 4, `<path d="M0 46V8a8 8 0 0 1 16 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M0 46V8a8 8 0 0 1 16 0" fill="none" stroke="#ff6b6b" stroke-width="6" stroke-dasharray="4 4" stroke-linecap="round"/>`, flip ? ' scale(-1 1)' : '');
      const lolly = (x, y, c) => at(x, y, `<path d="M0 0v22" stroke="#fff" stroke-width="2"/><circle r="9" fill="${c}"/><path d="M0 0m-6 0a6 6 0 1 0 6-6" fill="none" stroke="#fff" stroke-width="2"/>`);
      return { top: `<path d="M0 0H300V9H0Z" fill="#ff8787"/><path d="M0 0H300V9H0Z" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="10 10"/>${cane(22)}${cane(278, true)}${lolly(120, 20, '#74c0fc')}${lolly(180, 18, '#b197fc')}`,
        bot: `<g>${[30, 70, 110, 150, 190, 230, 270].map((x, i) => at(x, 50, `<rect x="-7" y="-5" width="14" height="10" rx="5" fill="${['#ff8787', '#ffd43b', '#69db7c', '#74c0fc'][i % 4]}"/><path d="M-7 0l-5-4v8zM7 0l5-4v8z" fill="${['#ff8787', '#ffd43b', '#69db7c', '#74c0fc'][i % 4]}"/>`)).join('')}</g>` };
    }
    case 'circuit': {
      let top = '', bot = '';
      for (let i = 0; i < 9; i++) { const x = 10 + i * 34 + r() * 8, y = 6 + r() * 18; top += `<path d="M${f1(x)} 0V${f1(y)}h${f1(10 + r() * 14)}v${f1(6 + r() * 10)}" fill="none" stroke="#20c997" stroke-width="2"/><circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#63e6be"/>`; }
      for (let i = 0; i < 7; i++) { const x = 20 + i * 42 + r() * 8, y = 44 + r() * 8; bot += `<path d="M${f1(x)} 60V${f1(y)}h${f1(-12 - r() * 10)}" fill="none" stroke="#20c997" stroke-width="2"/><rect x="${f1(x - 3)}" y="${f1(y - 3)}" width="6" height="6" fill="#0b7285"/>`; }
      return { top: `<path d="M0 3H300" stroke="#0ca678" stroke-width="3"/>${top}`, bot: `<path d="M0 57H300" stroke="#0ca678" stroke-width="3"/>${bot}` };
    }
    case 'skies': {
      let top = `<g class="pf-spin" style="transform-origin:40px 22px">${Array.from({ length: 10 }, (_, i) => `<path d="M40 22l${f1(26 * Math.cos(i * 0.628))} ${f1(26 * Math.sin(i * 0.628))}" stroke="#ffd43b" stroke-width="2.4"/>`).join('')}</g><circle cx="40" cy="22" r="14" fill="#ffd43b"/>`;
      top += cloud(120, 14, 1.3) + cloud(200, 22, 1) + cloud(270, 10, 1.2);
      return { top, bot: cloud(40, 50, 1) + cloud(150, 54, 1.3) + cloud(262, 50, 1.1) };
    }
    case 'inferno': {
      let top = '', bot = '';
      for (let i = 0; i < 16; i++) top += at(4 + i * 19.5, 2, `<g class="pf-flick" style="animation-delay:${f1(-r())}s"><path fill="${i % 2 ? '#ff6b00' : '#ffa94d'}" d="${FLAME}"/></g>`, ` scale(${(0.9 + r() * 0.5).toFixed(2)} -${(0.9 + r() * 0.6).toFixed(2)})`);
      for (let i = 0; i < 16; i++) bot += at(4 + i * 19.5, 60, `<g class="pf-flick" style="animation-delay:${f1(-r())}s"><path fill="${i % 2 ? '#ff6b00' : '#ffd43b'}" d="${FLAME}"/></g>`, ` scale(${(1 + r() * 0.6).toFixed(2)})`);
      return { top: `<path d="M0 0H300V4H0Z" fill="#ff6b00"/>${top}`, bot };
    }
    case 'frost': {
      let d = 'M0 0H300V6', x = 300;
      while (x > 0) { const w = 6 + r() * 8, l = 8 + r() * 26; d += `L${f1(x - w / 2)} ${f1(6 + l)}L${f1(Math.max(0, x - w))} 6`; x -= w; }
      let top = `<path fill="#d0ebff" d="${d}L0 6Z"/><path fill="#fff" opacity=".6" d="M0 0H300V3H0Z"/>`;
      for (let i = 0; i < 6; i++) top += at(20 + r() * 260, 30 + r() * 24, `<g class="pf-tw" style="animation-delay:${f1(-r() * 3)}s">${flake}</g>`, ` scale(${(0.6 + r() * 0.5).toFixed(2)})`);
      return { top, bot: waveBot(48, 3, 40, '#e7f5ff') + waveBot(52, 2, 25, '#d0ebff') };
    }
    case 'garden': {
      const tulip = (x, y, c) => at(x, y, `<path d="M0 0v-16" stroke="#2f9e44" stroke-width="2"/><path d="M0-6c-6-2-9-6-9-9 4 0 7 3 9 6" fill="#40c057"/><path d="M-6-22c0-6 3-8 6-4 3-4 6-2 6 4 0 4-3 6-6 6s-6-2-6-6z" fill="${c}"/>`);
      const daisy = (x, y) => at(x, y, `<path d="M0 0v-12" stroke="#2f9e44" stroke-width="2"/>` + blossom(0, -16, 0.7, '#fff', '#fab005'));
      let bot = '';
      for (let i = 0; i < 12; i++) bot += i % 2 ? tulip(14 + i * 25 + r() * 6, 60, ['#ff6b6b', '#cc5de8', '#ffa94d'][i % 3]) : daisy(14 + i * 25 + r() * 6, 60);
      const bee = (x, y) => at(x, y, `<g class="pf-bob"><ellipse rx="5" ry="3.6" fill="#ffd43b" stroke="#222" stroke-width=".8"/><path d="M-1.5-3.4v6.8M1.5-3.4v6.8" stroke="#222" stroke-width="1.2"/><ellipse cx="-1" cy="-4.6" rx="3" ry="2" fill="#fff" opacity=".8"/></g>`);
      return { top: `<path d="M-4 6C40 16 80 2 130 10s100 10 174-4" fill="none" stroke="#2f9e44" stroke-width="2.4"/>` + [40, 110, 190, 260].map((x) => `<ellipse cx="${x}" cy="${8 + r() * 4}" rx="6" ry="3" fill="#40c057"/>`).join('') + bee(70, 30) + bee(230, 24), bot };
    }
    case 'melody': {
      let top = [8, 13, 18, 23, 28].map((y) => `<path d="M0 ${y}H300" stroke="#b197fc" stroke-width="1" opacity=".7"/>`).join('');
      for (let i = 0; i < 10; i++) { const x = 18 + i * 29, y = 8 + Math.floor(r() * 5) * 5; top += `<g class="pf-bob" style="animation-delay:${f1(-r() * 2)}s"><ellipse cx="${x}" cy="${y + 2}" rx="3.6" ry="2.6" fill="#e5dbff" transform="rotate(-20 ${x} ${y + 2})"/><path d="M${x + 3.2} ${y + 1}v-14" stroke="#e5dbff" stroke-width="1.4"/></g>`; }
      let bot = '';
      for (let i = 0; i < 25; i++) bot += `<rect x="${i * 12}" y="44" width="11" height="16" fill="#f8f9fa" stroke="#868e96" stroke-width=".6"/>`;
      for (let i = 0; i < 25; i++) if (![2, 6, 9, 13, 16, 20, 23].includes(i % 25)) bot += `<rect x="${i * 12 + 8}" y="44" width="7" height="9" fill="#212529"/>`;
      return { top, bot };
    }
    case 'royal': {
      const swirl = (x, flip) => at(x, 6, `<path d="M0 0c10 0 16 8 12 14-3 5-10 3-9-2 1-4 6-3 6 0M12 14c6 8 18 8 22 0" fill="none" stroke="#f5c542" stroke-width="2.2" stroke-linecap="round"/>`, flip ? ' scale(-1 1)' : '');
      return { top: `<path d="M0 0H300V5H0Z" fill="#f5c542"/>${swirl(30)}${swirl(84)}${swirl(270, true)}${swirl(216, true)}
        <g transform="translate(150 8)"><path d="M-22 26-26 4l11 9 11-15 11 15 11-9-4 22Z" fill="#f5c542" stroke="#9c6b00" stroke-width="1.6" stroke-linejoin="round"/><circle cx="0" cy="-2" r="3" fill="#ff5c8a"/><circle cx="-14" cy="18" r="2.4" fill="#5cc8ff"/><circle cx="14" cy="18" r="2.4" fill="#5cc8ff"/></g>`,
        bot: `<path d="M0 55H300V60H0Z" fill="#f5c542"/>${at(20, 50, '<path d="M0 0c8-8 20-8 26 0" fill="none" stroke="#f5c542" stroke-width="2"/>')}${at(254, 50, '<path d="M0 0c8-8 20-8 26 0" fill="none" stroke="#f5c542" stroke-width="2"/>')}` };
    }
    case 'bats': {
      const bat = (x, y, s) => at(x, y, `<g class="pf-flap"><path fill="#1a1028" d="M0 0c-4-6-12-8-18-4 4 0 6 2 6 6-4-2-8-1-10 2 6-1 10 1 12 4 2-4 6-6 10-6 4 0 8 2 10 6 2-3 6-5 12-4-2-3-6-4-10-2 0-4 2-6 6-6-6-4-14-2-18 4z"/></g>`, ` scale(${s.toFixed(2)})`);
      const web = (x, flip) => at(x, 0, `<g fill="none" stroke="#ced4da" stroke-width=".9" opacity=".8"><path d="M0 0l36 0M0 0l30 18M0 0l16 30M0 0l0 36"/><path d="M10 0c0 4-2 6-1 9 2 3 6 2 9 4M20 0c0 7-4 11-3 16 3 5 9 4 14 8"/></g>`, flip ? ' scale(-1 1)' : '');
      let top = web(0) + web(300, true);
      for (let i = 0; i < 6; i++) top += bat(60 + r() * 180, 10 + r() * 30, 0.6 + r() * 0.6);
      return { top, bot: `<g fill="#ff922b">${[30, 270].map((x) => `<ellipse cx="${x}" cy="54" rx="14" ry="9"/><path d="M${x} 45v-5" stroke="#2f9e44" stroke-width="3"/>`).join('')}</g><g fill="#1a1028">${[30, 270].map((x) => `<path d="M${x - 6} 52l3-4 3 4zM${x + 6} 52l-3-4-3 4zM${x - 6} 57q6 3 12 0"/>`).join('')}</g>` };
    }
    case 'synth': {
      const sun = `<defs><linearGradient id="pfs-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd43b"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs><circle cx="150" cy="34" r="30" fill="url(#pfs-sun)"/>`
        + [36, 43, 50, 57].map((y, i) => `<rect x="110" y="${y}" width="80" height="${2 + i}" fill="#1b1036"/>`).join('');
      let bot = `<path d="M0 60V40H300V60Z" fill="#1b1036"/>`;
      for (let x = -60; x <= 360; x += 30) bot += `<path d="M150 40L${x} 60" stroke="#ff4fa3" stroke-width="1" opacity=".8"/>`;
      for (const y of [44, 49, 55]) bot += `<path d="M0 ${y}H300" stroke="#ff4fa3" stroke-width="1" opacity=".8"/>`;
      return { top: sun + `<path d="M0 3H300" stroke="#5ff4ff" stroke-width="2"/>`, bot };
    }
    case 'paws': {
      let top = '', bot = '';
      for (let i = 0; i < 10; i++) top += at(14 + i * 30, 10 + (i % 2) * 12, `<g fill="#e9b97c">${PAW}</g>`, ` rotate(${70 + (i % 2) * 20})`);
      for (let i = 0; i < 10; i++) bot += at(14 + i * 30, 46 + (i % 2) * 8, `<g fill="#d9a066">${PAW}</g>`, ` rotate(${-70 - (i % 2) * 20})`);
      return { top, bot };
    }
    case 'lanterns': {
      const lantern = (x, y, c) => at(x, y, `<g class="pf-sway" style="animation-delay:${f1(-r() * 2)}s"><path d="M0 0v6" stroke="#5c3a1e" stroke-width="1.2"/><ellipse cx="0" cy="16" rx="9" ry="11" fill="${c}"/><path d="M-9 16h18M-6 8c3 3 3 13 0 16M6 8c-3 3-3 13 0 16" stroke="#00000030" stroke-width="1" fill="none"/><rect x="-4" y="4" width="8" height="3" fill="#5c3a1e"/><rect x="-4" y="26" width="8" height="3" fill="#5c3a1e"/><path d="M0 29v6" stroke="#ffd43b" stroke-width="1.5"/></g>`);
      let top = `<path d="M-4 4C60 16 100 16 150 8s100 8 154-4" fill="none" stroke="#5c3a1e" stroke-width="1.6"/>`;
      [[30, 7], [80, 11], [130, 10], [180, 9], [230, 11], [278, 7]].forEach(([x, y], i) => { top += lantern(x, y, ['#ff6b6b', '#ff922b', '#ffd43b'][i % 3]); });
      return { top, bot: `<path d="M-4 52C80 44 220 44 304 52" fill="none" stroke="#5c3a1e" stroke-width="1.4"/>` };
    }
    case 'shrooms': {
      const shroom = (x, s, c) => at(x, 60, `<path d="M-4 0v-10h8V0Z" fill="#f8f0e3"/><path d="M-12-9c0-10 24-10 24 0Z" fill="${c}"/><circle cx="-5" cy="-14" r="1.8" fill="#fff"/><circle cx="3" cy="-16" r="1.5" fill="#fff"/><circle cx="7" cy="-11" r="1.3" fill="#fff"/>`, ` scale(${s})`);
      let bot = waveBot(54, 2, 30, '#2f9e44');
      for (let i = 0; i < 9; i++) bot += shroom(16 + i * 34 + r() * 10, (0.8 + r() * 0.7).toFixed(2), i % 3 ? '#e03131' : '#9c36b5');
      let top = '';
      for (let i = 0; i < 14; i++) top += `<circle class="pf-tw" style="animation-delay:${f1(-r() * 3)}s" cx="${f1(r() * 300)}" cy="${f1(r() * 40)}" r="${f1(0.8 + r())}" fill="#d0ff8a"/>`;
      return { top, bot };
    }
    case 'overrainbow': {
      const cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
      const top = cols.map((c, i) => `<path d="M${30 + i * 6} 60A${120 - i * 6} ${54 - i * 5} 0 0 1 ${270 - i * 6} 60" fill="none" stroke="${c}" stroke-width="6"/>`).join('') + cloud(34, 52, 1.4) + cloud(266, 52, 1.4);
      return { top, bot: cloud(60, 52, 1) + cloud(240, 54, 1.1) };
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
