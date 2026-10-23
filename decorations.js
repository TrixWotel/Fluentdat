// A hundred more avatar decorations for the Shop (shop.js has the first ones, and lists these after them; datbux.js and
// setup.sql have their prices). Each is an SVG a little bigger than the avatar: 130 × 130, the avatar being the circle of
// radius 50 in the middle. The page's CSS moves them (app.css, the .deco .d-… classes); a class that moves something is
// never on the element that places it, or the one would undo the other.

// [id, name, the Quest that gives it ('' when there's none)]
export const MORE_DECORATIONS = [
  // rings
  ['sunsetring', 'Sunset Ring', ''], ['oceanring', 'Ocean Ring', ''], ['mintring', 'Mint Ring', ''], ['lavaring', 'Lava Ring', ''],
  ['goldring', 'Golden Ring', ''], ['silverring', 'Silver Ring', ''], ['doublering', 'Double Orbit', ''], ['dashring', 'Dash Ring', ''],
  ['chainring', 'Chain Link', ''], ['prismring', 'Prism Ring', ''], ['heartbeat', 'Heartbeat', ''],
  // ears and horns
  ['bearears', 'Bear Ears', ''], ['mouseears', 'Mouse Ears', ''], ['pandaears', 'Panda Ears', ''], ['dogears', 'Floppy Dog Ears', ''],
  ['wolfears', 'Wolf Ears', ''], ['frogeyes', 'Frog Eyes', ''], ['antennae', 'Alien Antennae', ''], ['antlers', 'Antlers', ''],
  ['unicorn', 'Unicorn Horn', ''], ['dragonhorns', 'Dragon Horns', ''], ['ramhorns', 'Ram Horns', ''], ['tigerears', 'Tiger Ears', ''],
  ['elfears', 'Elf Ears', ''],
  // hats
  ['partyhat', 'Party Hat', ''], ['santahat', 'Santa Hat', ''], ['tophat', 'Top Hat', ''], ['cowboy', 'Cowboy Hat', ''],
  ['beanie', 'Pom-Pom Beanie', ''], ['chefhat', 'Chef’s Hat', ''], ['gradcap', 'Graduation Cap', ''], ['pirate', 'Pirate Hat', ''],
  ['viking', 'Viking Helmet', ''], ['propeller', 'Propeller Cap', ''], ['wizard', 'Wizard Hat', ''], ['tiara', 'Tiara', ''],
  ['beret', 'Beret', ''], ['jester', 'Jester Hat', ''],
  // glasses and faces
  ['roundglasses', 'Round Glasses', ''], ['heartglasses', 'Heart Glasses', ''], ['starglasses', 'Star Glasses', ''],
  ['monocle', 'Monocle', ''], ['blush', 'Rosy Cheeks', ''], ['visor', 'Cyber Visor', ''],
  // moods
  ['zzz', 'Sleepy Zzz', ''], ['question', 'Question Marks', ''], ['exclaim', 'Exclamation', ''], ['angry', 'Anger Mark', ''],
  ['idea', 'Bright Idea', ''], ['lovebubbles', 'Love Bubbles', ''],
  // nature
  ['sunflower', 'Sunflower', ''], ['daisies', 'Daisy Chain', ''], ['vines', 'Ivy Vine', ''], ['mushrooms', 'Mushroom Ring', ''],
  ['mapleleaves', 'Maple Leaves', ''], ['pinewreath', 'Pine Wreath', ''], ['raincloud', 'Rain Cloud', ''], ['sunrays', 'Sunbeams', ''],
  ['rainbowarc', 'Over the Rainbow', ''], ['tulips', 'Tulip Bed', ''],
  // critters
  ['bees', 'Busy Bees', ''], ['butterflies', 'Butterflies', ''], ['ladybugs', 'Ladybugs', ''], ['goldfish', 'Goldfish', ''],
  ['ducks', 'Rubber Ducks', ''], ['catpaws', 'Cat Paws', ''], ['birds', 'Little Birds', ''], ['octopus', 'Octopus Hug', ''],
  ['sharkfin', 'Shark Circling', ''],
  // food
  ['donuts', 'Donut Ring', ''], ['pizza', 'Pizza Party', ''], ['sushi', 'Sushi Ring', ''], ['candies', 'Candy Ring', ''],
  ['lollipops', 'Lollipops', ''], ['cherries', 'Cherries', ''], ['boba', 'Boba Tea', ''],
  // space
  ['rocket', 'Rocket Orbit', ''], ['ufo', 'UFO', ''], ['planets', 'Solar System', ''], ['blackhole', 'Black Hole', ''],
  ['satellite', 'Satellite', ''], ['spacehelmet', 'Space Helmet', ''],
  // holidays
  ['pumpkins', 'Jack-o’-Lanterns', ''], ['ghosts', 'Ghost Pals', ''], ['bats', 'Bat Swarm', ''], ['skulls', 'Skull Ring', ''],
  ['xmaslights', 'Holiday Lights', ''], ['holly', 'Holly Wreath', ''], ['cupid', 'Cupid’s Arrow', ''], ['eastereggs', 'Easter Eggs', ''],
  ['fireworks', 'Fireworks', ''], ['shamrocks', 'Lucky Shamrocks', ''],
  // games
  ['controller', 'Game Controller', ''], ['hpbar', 'Extra Lives', ''], ['swords', 'Crossed Swords', ''], ['dice', 'Lucky Dice', ''],
  // magic
  ['magiccircle', 'Magic Circle', ''], ['fairydust', 'Fairy Dust', ''], ['phoenix', 'Phoenix Wings', ''], ['batwings', 'Bat Wings', ''],
];

// ---------- helpers ----------
const f = (v) => (+v).toFixed(1);
const delay = (d) => (d ? ` style="animation-delay:${f(d)}s"` : '');
// something placed at (x, y), turned and scaled
const at = (x, y, inner, s = 1, rot = 0) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ''}${s !== 1 ? ` scale(${s})` : ''}">${inner}</g>`;
// …moving (one of app.css's classes, a moment later)
const moving = (cls, inner, d = 0) => `<g class="${cls}"${delay(d)}>${inner}</g>`;
// n of a thing around the avatar, r from its middle, each turned to point out (drawn pointing up, at 0 0)
const spokes = (n, r, draw, from = 0) => Array.from({ length: n }, (_, i) => `<g transform="rotate(${f(from + (i * 360) / n)} 65 65) translate(65 ${f(65 - r)})">${draw(i)}</g>`).join('');
// …the same at the angles given (degrees, clockwise from the top)
const spokesAt = (angles, r, draw) => angles.map((a, i) => `<g transform="rotate(${f(a)} 65 65) translate(65 ${f(65 - r)})">${draw(i)}</g>`).join('');
// …or upright, at their places around it: all the way round, or spread from one angle to another
const placeAt = (deg, r) => { const a = ((deg - 90) * Math.PI) / 180; return [65 + r * Math.cos(a), 65 + r * Math.sin(a)]; };
const around = (n, r, draw, from = 0, to = null) => Array.from({ length: n }, (_, i) => {
  const deg = to === null ? from + (i * 360) / n : from + (n > 1 ? (i * (to - from)) / (n - 1) : 0), [x, y] = placeAt(deg, r);
  return at(x, y, draw(i));
}).join('');
// the same on both sides (drawn on the left; the right one moves a moment later)
const pair = (inner, cls = '') => `<g${cls ? ` class="${cls}"` : ''}>${inner}</g><g transform="translate(130 0) scale(-1 1)"><g${cls ? ` class="${cls}" style="animation-delay:1.3s"` : ''}>${inner}</g></g>`;
const lin = (id, cols, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${cols.map((c, i) => `<stop offset="${f(i / (cols.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const ring = (stroke, w = 4, r = 56, more = '') => `<circle cx="65" cy="65" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}"${more}/>`;
// an arc of the circle r round the avatar, from one angle to another (degrees, clockwise from the top)
const arc = (r, a1, a2) => { const [x1, y1] = placeAt(a1, r), [x2, y2] = placeAt(a2, r); return `M${f(x1)} ${f(y1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)}`; };
const glow = (id, sd = 2) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// ---------- shapes (each around 0 0) ----------
const STAR = 'M0-7l2 4.6 5 .5-3.8 3.3 1.2 4.9L0 2.8-4.4 5.3-3.2.4-7-2.9l5-.5z';
const SPARK = 'M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10z';
const HEART = 'M0 4C-7-2-3-9 0-4.5 3-9 7-2 0 4Z';
const LEAF = 'M0 0C-4-4-4-9 0-11 4-9 4-4 0 0Z';
const MAPLE = 'M0-9l2 4 3-2-1 5 4-1-2 4 3 1-5 2 1 3-5-2v4h-0.4v-4l-5 2 1-3-5-2 3-1-2-4 4 1-1-5 3 2z';
const sparkle = (x, y, s, d, fill = '#fff') => at(x, y, moving('d-tw', `<path d="${SPARK}" fill="${fill}"/>`, d), s);
const cloud = (x, y, s, fill = '#fff', edge = '#dbe4ff') => at(x, y, `<g fill="${fill}" stroke="${edge}" stroke-width="1.2"><circle cx="-8" cy="2" r="7"/><circle cx="0" cy="-3" r="9"/><circle cx="9" cy="2" r="7"/><rect x="-14" y="2" width="28" height="7" rx="3.5"/></g>`, s);
const RUNES = ['M-2-3v6M-2 0l3-3', 'M-2-3l4 6M2-3l-4 6', 'M-2 3V-3l4 3-4 3', 'M0-3v6M-2-1h4', 'M-2-3h4l-4 6h4', 'M-2 3l2-6 2 6M-1 1h2'];
// a pixel heart, 7 by 6 (on: the pixels to draw)
const PIXEL_HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const pixels = (ox, oy, px, on) => PIXEL_HEART.flatMap((row, y) => [...row].map((c, x) => (c === 'X' && on(x) ? `M${f(ox + x * px)} ${f(oy + y * px)}h${px}v${px}h-${px}Z` : ''))).join('');

const ART = {
  // ---------- rings ----------
  sunsetring: (k) => `<defs>${lin('ss' + k, ['#ffd166', '#ff7b54', '#e84a8a', '#7b4ae8'])}</defs>${moving('d-spin-slow', ring(`url(#ss${k})`, 6))}${ring('#fff', 1, 60, ' stroke-opacity=".45"')}`,
  oceanring: (k) => `<defs>${lin('oc' + k, ['#a5f3fc', '#22b8cf', '#1864ab'])}</defs>${ring(`url(#oc${k})`, 5)}${ring('#e3fafc', 2, 61, ' stroke-dasharray="9 7" stroke-linecap="round" class="d-dash"')}`,
  mintring: (k) => `<defs>${lin('mi' + k, ['#c3fae8', '#38d9a9', '#0ca678'])}</defs>${ring(`url(#mi${k})`, 5)}`
    + around(12, 61.5, (i) => moving('d-tw', `<circle r="${i % 2 ? 1.6 : 2.4}" fill="${i % 2 ? '#fff' : '#96f2d7'}"/>`, i * 0.2)),
  lavaring: (k) => `<defs>${lin('lv' + k, ['#ffe066', '#ff6b00', '#c92a2a', '#5c0f0f'])}</defs>${ring('#3b0a0a', 8)}<g class="d-glow-o">${ring(`url(#lv${k})`, 4, 56, ' class="d-pulse"')}</g>`
    + moving('d-spin-slow', ring('#ffd43b', 1.5, 56, ' stroke-dasharray="2 14 6 22" stroke-linecap="round"')),
  goldring: (k) => `<defs>${lin('gd' + k, ['#fff4b8', '#f5c542', '#c98d0b', '#f5c542'])}</defs>${ring(`url(#gd${k})`, 6)}${ring('#9c6b00', 1, 59.5)}${ring('#9c6b00', 1, 52.5)}`
    + around(4, 56, (i) => `<path d="M0-4 3 0 0 4-3 0Z" fill="${['#ff6b9a', '#4dabf7', '#69db7c', '#b197fc'][i]}" stroke="#fff" stroke-width=".6"/>`, 45)
    + `<path class="d-glint" d="${arc(56, -45, -12)}" fill="none" stroke="#fffbe6" stroke-width="2.4" stroke-linecap="round"/>`,
  silverring: (k) => `<defs>${lin('sv' + k, ['#f8f9fa', '#adb5bd', '#495057', '#dee2e6'])}</defs>${ring(`url(#sv${k})`, 6)}`
    + around(16, 56, () => '<circle r="1.3" fill="#f8f9fa" stroke="#495057" stroke-width=".5"/>', 11.25)
    + `<path class="d-glint" d="${arc(56, 40, 75)}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
  doublering: () => moving('d-spin', `${ring('#74c0fc', 1.6, 55)}<circle cx="65" cy="10" r="3.4" fill="#d0ebff" stroke="#1c7ed6"/>`)
    + moving('d-spin-rev', `${ring('#f783ac', 1.6, 61)}<circle cx="65" cy="126" r="3.4" fill="#ffdeeb" stroke="#d6336c"/>`),
  dashring: () => moving('d-spin', ['#ff6b6b', '#ffd43b', '#51cf66', '#339af0'].map((c, i) => ring(c, 4, 57, ` stroke-dasharray="7 37.8" stroke-dashoffset="${f(-i * 11.2)}" stroke-linecap="round"`)).join('')),
  chainring: () => spokes(24, 57, (i) => (i % 2 ? '<ellipse rx="7" ry="1.4" fill="#495057"/>' : '<ellipse rx="7" ry="3.6" fill="none" stroke="#ced4da" stroke-width="2.2"/><ellipse rx="7" ry="3.6" fill="none" stroke="#868e96" stroke-width=".6"/>')),
  prismring: () => { const c = 2 * Math.PI * 56, seg = c / 7; return moving('d-hue', ['#ff6b6b', '#ff922b', '#ffd43b', '#51cf66', '#22b8cf', '#5c7cfa', '#cc5de8'].map((col, i) => ring(col, 6, 56, ` stroke-dasharray="${f(seg - 1.5)} ${f(c - seg + 1.5)}" stroke-dashoffset="${f(-i * seg)}"`)).join(''))
    + around(5, 62, (i) => moving('d-tw', `<path d="${SPARK}" transform="scale(.3)" fill="#fff"/>`, i * 0.4), 20, 340); },
  heartbeat: () => `${ring('#ff8787', 1.2, 58, ' stroke-opacity=".5"')}<path d="M0 118H40l4-6 5 12 6-24 6 30 4-12h65" fill="none" stroke="#ff4d6d" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="150 60" class="d-dash"/>`
    + at(114, 20, moving('d-tw', `<path d="${HEART}" fill="#ff4d6d" stroke="#fff" stroke-width=".6"/>`), 1.8),

  // ---------- ears and horns ----------
  bearears: () => pair('<circle cx="30" cy="24" r="14" fill="#8b5a2b" stroke="#4a2c10" stroke-width="2"/><circle cx="30" cy="24" r="7" fill="#d9a066"/>', 'd-ear-l'),
  mouseears: () => pair('<circle cx="24" cy="22" r="19" fill="#5c5f66" stroke="#2b2d31" stroke-width="2"/><circle cx="24" cy="22" r="12" fill="#f4a7c0"/>', 'd-ear-l'),
  pandaears: () => pair('<circle cx="30" cy="23" r="13" fill="#141414" stroke="#000" stroke-width="1.5"/><circle cx="27" cy="20" r="3" fill="#3a3a3a"/>', 'd-ear-l'),
  dogears: () => pair('<path d="M34 20C18 12 4 26 4 50c0 18 6 30 14 30 8 0 12-12 14-26 2-12 6-24 10-30Z" fill="#a9713f" stroke="#5c3a17" stroke-width="2" stroke-linejoin="round"/><path d="M28 28C16 26 12 40 12 54c0 12 4 18 8 18 6 0 8-10 10-22" fill="#c98f5a"/>', 'd-ear-l'),
  wolfears: () => pair('<path d="M18 44 20-2l32 24Z" fill="#868e96" stroke="#343a40" stroke-width="2.4" stroke-linejoin="round"/><path d="M20-2l-2 13 10-5Z" fill="#343a40"/><path d="M25 36l1-24 17 12Z" fill="#dee2e6"/>', 'd-ear-l'),
  frogeyes: () => pair('<circle cx="44" cy="16" r="13" fill="#69db7c" stroke="#2b8a3e" stroke-width="2"/><circle cx="44" cy="15" r="8" fill="#fff"/><circle cx="46" cy="16" r="4.2" fill="#111"/><circle cx="47.5" cy="14" r="1.3" fill="#fff"/>', 'd-bob'),
  antennae: () => pair('<path d="M50 18C46 8 38 2 32-4" fill="none" stroke="#2b2d31" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="-5" r="5.5" fill="#a9e34b" stroke="#5c940d" stroke-width="1.4" class="d-pulse"/>', 'd-bob'),
  antlers: () => pair('<g fill="none" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M44 20C38 8 30 0 22-8"/><path d="M34 6C26 6 18 2 14-4"/><path d="M28-1C28-8 26-13 22-17"/><path d="M40 13C34 14 28 13 24 10"/></g>'),
  unicorn: (k) => `<defs>${lin('un' + k, ['#fff4b8', '#f5c542', '#e8a8ff'], 0, 1)}</defs><path d="M57 22 65-20 73 22Z" fill="url(#un${k})" stroke="#c98d0b" stroke-width="1.4" stroke-linejoin="round"/>`
    + '<path d="M59 14l11-4M60 6l9-3M62-2l6-2M63-10l3-1" stroke="#c98d0b" stroke-width="1.2" stroke-linecap="round"/>' + sparkle(44, 2, 0.45, 0, '#fff4b8') + sparkle(88, 6, 0.35, 0.8, '#e8a8ff') + sparkle(80, -14, 0.3, 1.5),
  dragonhorns: (k) => `<defs>${lin('dh' + k, ['#9775fa', '#5f3dc4', '#2b1d52'], 0, 1)}</defs>`
    + pair(`<path d="M46 22C34 14 26 2 30-14 34-2 42 6 54 16Z" fill="url(#dh${k})" stroke="#1b1028" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 15l-6 2M35 7l-6 1M32-1h-5" stroke="#d0bfff" stroke-width="1" stroke-linecap="round"/>`),
  ramhorns: () => { const d = 'M46 24C36 12 16 14 10 30 4 46 16 60 30 56 40 53 40 40 32 38 26 36 22 42 26 46';
    return pair(`<path d="${d}" fill="none" stroke="#c8a273" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8a6a3e" stroke-width="7" stroke-dasharray="1.2 4"/>`); },
  tigerears: () => pair('<path d="M18 40C14 20 24 8 38 10 46 12 50 20 48 26Z" fill="#f08c28" stroke="#5c2c00" stroke-width="2"/><path d="M24 34C22 22 28 16 36 17 40 18 42 22 41 25Z" fill="#fff4e6"/><path d="M28 12l3 6M36 10l1 6M20 22l5 3" stroke="#222" stroke-width="2" stroke-linecap="round"/>', 'd-ear-l'),
  elfears: () => pair('<path d="M18 52C10 42 2 30-2 20 8 24 18 32 22 42 22 48 20 52 18 52Z" fill="#f2c6a0" stroke="#b07a50" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 46C12 38 8 32 5 26 11 30 16 36 18 42Z" fill="#e0a984"/>', 'd-ear-l'),

  // ---------- hats ----------
  partyhat: (k) => `<defs><clipPath id="ph${k}"><path d="M30 30 50-16 70 30Z"/></clipPath></defs><g transform="rotate(-16 50 26)">` + moving('d-bob', `<path d="M30 30 50-16 70 30Z" fill="#5c7cfa"/>`
    + `<g clip-path="url(#ph${k})" stroke="#ffd43b" stroke-width="5">${[-6, 6, 18, 30].map((y) => `<path d="M20 ${y + 10}L80 ${y - 14}"/>`).join('')}</g>`
    + '<path d="M30 30 50-16 70 30Z" fill="none" stroke="#364fc7" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="50" cy="30" rx="21" ry="3.5" fill="#ff6b9a"/><circle cx="50" cy="-17" r="5" fill="#ff6b9a" stroke="#c2255c"/>') + '</g>',
  santahat: () => '<g transform="rotate(-10 60 24)">' + moving('d-bob', '<path d="M28 30C30 6 52-8 78-2 96 2 108 16 110 34 102 26 94 20 86 18 92 24 96 30 98 30Z" fill="#e03131" stroke="#8a1c1c" stroke-width="1.6" stroke-linejoin="round"/>'
    + '<rect x="24" y="24" width="78" height="12" rx="6" fill="#fff" stroke="#dee2e6" stroke-width="1.2"/><circle cx="110" cy="36" r="7" fill="#fff" stroke="#dee2e6" stroke-width="1.2"/>') + '</g>',
  tophat: () => '<g transform="rotate(-12 62 22)">' + moving('d-bob', '<rect x="42" y="-14" width="40" height="38" rx="3" fill="#1b1b1f" stroke="#000" stroke-width="1.4"/><rect x="42" y="12" width="40" height="7" fill="#c92a2a"/>'
    + '<ellipse cx="62" cy="25" rx="32" ry="6" fill="#1b1b1f" stroke="#000" stroke-width="1.4"/><path d="M47-10v30" stroke="#fff" stroke-opacity=".15" stroke-width="3"/>') + '</g>',
  cowboy: () => moving('d-bob', '<path d="M40 28C38 8 46-4 55 1 60 4 70 4 75 1 84-4 92 8 90 28Z" fill="#a0672d" stroke="#5c3a17" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 22h50v6H40Z" fill="#5c3a17"/>'
    + '<path d="M8 26C24 40 106 40 122 26 114 22 104 26 90 28H40C26 26 16 22 8 26Z" fill="#b5793a" stroke="#5c3a17" stroke-width="1.6" stroke-linejoin="round"/>'),
  beanie: () => moving('d-bob', '<path d="M22 34C22 2 108 2 108 34Z" fill="#e8590c" stroke="#a63c06" stroke-width="1.6"/><path d="M40 12c4 6 6 14 6 22M65 6v28M90 12c-4 6-6 14-6 22" stroke="#ff922b" stroke-width="2" fill="none"/>'
    + `<rect x="18" y="26" width="94" height="12" rx="5" fill="#ff922b" stroke="#a63c06" stroke-width="1.4"/><path d="${Array.from({ length: 15 }, (_, i) => `M${24 + i * 6} 28v8`).join('')}" stroke="#e8590c" stroke-width="1.4"/>`
    + '<circle cx="65" cy="2" r="8" fill="#fff4e6" stroke="#e8590c" stroke-width="1.4"/>'),
  chefhat: () => moving('d-bob', '<g fill="#fff" stroke="#ced4da" stroke-width="1.4"><circle cx="46" cy="4" r="13"/><circle cx="84" cy="4" r="13"/><circle cx="65" cy="-4" r="15"/><path d="M42 10h46v18H42Z"/></g>'
    + '<path d="M43.5 10h43" stroke="#fff" stroke-width="4"/><path d="M52 14v12M65 14v12M78 14v12" stroke="#e9ecef" stroke-width="1.4"/>'),
  gradcap: () => moving('d-bob', '<path d="M38 14v12c0 6 54 6 54 0V14" fill="#2b2d31" stroke="#111" stroke-width="1.4"/><path d="M14 12 65-6 116 12 65 30Z" fill="#343a40" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>'
    + '<circle cx="65" cy="12" r="2.2" fill="#f5c542"/><path d="M65 12 104 18v16" fill="none" stroke="#f5c542" stroke-width="1.6"/><path d="M101 33h6l1 9h-8Z" fill="#f5c542"/>'),
  pirate: () => moving('d-bob', '<path d="M14 28C24 4 46-2 65 8 84-2 106 4 116 28 98 22 82 22 65 30 48 22 32 22 14 28Z" fill="#1b1b1f" stroke="#f5c542" stroke-width="1.8" stroke-linejoin="round"/>'
    + '<path d="M56 22l18-7M56 15l18 7" stroke="#f8f9fa" stroke-width="1.8" stroke-linecap="round"/><circle cx="65" cy="14" r="5.5" fill="#f8f9fa"/><rect x="62" y="17" width="6" height="4" rx="1" fill="#f8f9fa"/>'
    + '<circle cx="63" cy="13.5" r="1.4" fill="#1b1b1f"/><circle cx="67" cy="13.5" r="1.4" fill="#1b1b1f"/>'),
  viking: () => pair('<path d="M30 26C18 22 8 10 10-4 16 6 26 12 36 16Z" fill="#f1e3c6" stroke="#8a7a5a" stroke-width="1.6" stroke-linejoin="round"/>')
    + '<path d="M26 36C26 4 104 4 104 36Z" fill="#adb5bd" stroke="#495057" stroke-width="1.6"/><path d="M65 6v30" stroke="#868e96" stroke-width="5"/>'
    + `<rect x="22" y="30" width="86" height="9" rx="3" fill="#868e96" stroke="#495057" stroke-width="1.4"/>${[30, 46, 84, 100].map((x) => `<circle cx="${x}" cy="34.5" r="1.6" fill="#dee2e6"/>`).join('')}`,
  propeller: () => '<path d="M30 34C30 8 100 8 100 34Z" fill="#ffd43b" stroke="#e67700" stroke-width="1.6"/><path d="M65 9.5C52 10 42 18 40 34H65ZM65 9.5C78 10 88 18 90 34H65Z" fill="#ff6b6b"/>'
    + '<path d="M65 9.5V34" stroke="#4dabf7" stroke-width="6"/><path d="M26 34h78" stroke="#e67700" stroke-width="3" stroke-linecap="round"/><path d="M65 10V2" stroke="#495057" stroke-width="2"/>'
    + at(65, 1, moving('d-prop', '<ellipse rx="16" ry="2.6" fill="#4dabf7" stroke="#1864ab"/>')) + '<circle cx="65" cy="1" r="2.2" fill="#495057"/>',
  wizard: () => '<g transform="rotate(-14 62 26)">' + moving('d-bob', '<path d="M30 30C46 18 54 0 60-28 66-6 80 14 96 30Z" fill="#364fc7" stroke="#1c2a6e" stroke-width="1.6" stroke-linejoin="round"/>'
    + '<ellipse cx="63" cy="31" rx="40" ry="7" fill="#364fc7" stroke="#1c2a6e" stroke-width="1.6"/><path d="M38 25c16 4 34 4 52 0" stroke="#f5c542" stroke-width="3" fill="none"/>'
    + [[56, 6, 0.9, 0], [70, 16, 0.7, 0.8], [62, -12, 0.6, 1.5]].map(([x, y, s, d]) => at(x, y, moving('d-tw', `<path d="${STAR}" fill="#ffe066"/>`, d), s)).join('')) + '</g>',
  tiara: (k) => `<defs>${lin('ti' + k, ['#f8f9fa', '#ced4da', '#868e96'], 0, 1)}</defs><path d="M28 30C40 20 90 20 102 30L100 36C88 27 42 27 30 36Z" fill="url(#ti${k})" stroke="#868e96" stroke-width="1.2"/>`
    + `<path d="M42 24 48 12 54 22 65 2 76 22 82 12 88 24C78 21 52 21 42 24Z" fill="url(#ti${k})" stroke="#868e96" stroke-width="1.2" stroke-linejoin="round"/>`
    + '<circle cx="65" cy="15" r="3.6" fill="#f06595" stroke="#fff" stroke-width=".8"/><circle cx="48" cy="18" r="2.2" fill="#4dabf7"/><circle cx="82" cy="18" r="2.2" fill="#4dabf7"/>' + sparkle(65, 2, 0.35, 0) + sparkle(92, 18, 0.25, 1.1),
  beret: () => '<g transform="rotate(-14 52 18)">' + moving('d-bob', '<ellipse cx="52" cy="18" rx="36" ry="12" fill="#c92a2a" stroke="#7d1a1a" stroke-width="1.6"/><path d="M22 22c18 8 42 8 60 0" stroke="#7d1a1a" stroke-width="2.4" fill="none"/>'
    + '<path d="M52 6c0-4 2-6 4-7" stroke="#7d1a1a" stroke-width="2.4" stroke-linecap="round" fill="none"/>') + '</g>',
  jester: () => moving('d-bob', '<path d="M30 30C26 14 18 4 6 0 22-2 40 6 52 22Z" fill="#7048e8" stroke="#3b1f99" stroke-width="1.4" stroke-linejoin="round"/><path d="M100 30C104 14 112 4 124 0 108-2 90 6 78 22Z" fill="#37b24d" stroke="#1f6e2e" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M52 22C58 4 72 4 78 22Z" fill="#f03e3e" stroke="#8a1c1c" stroke-width="1.4"/><path d="M26 32c20-12 58-12 78 0l-2 6c-20-10-54-10-74 0Z" fill="#ffd43b" stroke="#e67700" stroke-width="1.2"/>'
    + at(6, 1, moving('d-tw', '<circle r="4" fill="#ffd43b" stroke="#e67700"/>')) + at(124, 1, moving('d-tw', '<circle r="4" fill="#ffd43b" stroke="#e67700"/>', 0.8)) + '<circle cx="65" cy="4" r="3.4" fill="#ffd43b" stroke="#e67700"/>'),

  // ---------- glasses and faces ----------
  roundglasses: () => moving('d-bob', '<g fill="#a5d8ff" fill-opacity=".18" stroke="#2b2d31" stroke-width="3.2"><circle cx="46" cy="58" r="13"/><circle cx="84" cy="58" r="13"/></g>'
    + '<path d="M59 57c3-3 9-3 12 0M33 56l-16-4M97 56l16-4" stroke="#2b2d31" stroke-width="3" fill="none" stroke-linecap="round"/><path class="d-glint" d="M39 52l5-4M77 52l5-4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'),
  heartglasses: () => moving('d-bob', [46, 84].map((x) => at(x, 61, `<path d="${HEART}" fill="#ff4d6d" fill-opacity=".85" stroke="#c9184a" stroke-width=".7"/>`, 2)).join('')
    + '<path d="M59 52c4-2 8-2 12 0M32 52l-15-4M98 52l15-4" stroke="#c9184a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path class="d-glint" d="M38 54l4-3M76 54l4-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
  starglasses: () => moving('d-bob', [46, 84].map((x) => at(x, 58, `<path d="${STAR}" fill="#ffd43b" fill-opacity=".9" stroke="#e67700" stroke-width=".6" stroke-linejoin="round"/>`, 2.3)).join('')
    + '<path d="M60 54c3-2 7-2 10 0M31 54l-14-4M99 54l14-4" stroke="#e67700" stroke-width="2.6" fill="none" stroke-linecap="round"/><path class="d-glint" d="M40 52l4-3M78 52l4-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
  monocle: () => '<circle cx="84" cy="57" r="12" fill="#e7f5ff" fill-opacity=".25" stroke="#c98d0b" stroke-width="3"/><path d="M95 62C104 76 108 90 112 104" fill="none" stroke="#c98d0b" stroke-width="1.6" stroke-dasharray="3 2"/>'
    + '<circle cx="112" cy="105" r="2.4" fill="#c98d0b"/><path class="d-glint" d="M77 52l5-4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  blush: () => '<g fill="#ff8fab" fill-opacity=".5"><ellipse cx="40" cy="76" rx="10" ry="5.5"/><ellipse cx="90" cy="76" rx="10" ry="5.5"/></g>'
    + '<path d="M35 74l-2 4M40 74l-2 4M45 74l-2 4M85 74l-2 4M90 74l-2 4M95 74l-2 4" stroke="#ff6b9a" stroke-width="1.4" stroke-linecap="round"/>' + sparkle(24, 64, 0.3, 0, '#ffc9de') + sparkle(108, 66, 0.3, 0.9, '#ffc9de'),
  visor: (k) => `<defs>${lin('vi' + k, ['#00e5ff', '#7b61ff', '#ff2bd6'], 1, 0)}</defs><rect x="22" y="47" width="86" height="18" rx="9" fill="url(#vi${k})" fill-opacity=".6" stroke="#1b1b1f" stroke-width="2.4"/>`
    + moving('d-visor', '<rect x="26" y="54" width="20" height="3" rx="1.5" fill="#fff"/>') + '<path d="M22 56H12M108 56h10" stroke="#1b1b1f" stroke-width="3" stroke-linecap="round"/>',

  // ---------- moods ----------
  zzz: () => [[96, 30, 1, 0], [106, 18, 1.3, 0.6], [118, 4, 1.6, 1.2]].map(([x, y, s, d]) => at(x, y, moving('d-note', '<path d="M-4-4h8l-8 8h8" fill="none" stroke="#748ffc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', d), s)).join(''),
  question: () => [[108, 16, 1.2, 0], [93, 4, 0.8, 0.7]].map(([x, y, s, d]) => at(x, y, moving('d-bob', '<path d="M-5-5c0-6 10-6 10 0 0 5-5 5-5 10M0 10.5v.5" fill="none" stroke="#fab005" stroke-width="3.2" stroke-linecap="round"/>', d), s)).join(''),
  exclaim: () => [[110, 14, 1.2, 0], [97, 6, 0.8, 0.5]].map(([x, y, s, d]) => at(x, y, moving('d-bob', '<path d="M0-9v11M0 8v.5" stroke="#f03e3e" stroke-width="4.5" stroke-linecap="round"/>', d), s)).join(''),
  angry: () => at(108, 22, moving('d-pulse', '<path d="M-9-3c4 0 6-2 6-6M3-9c0 4 2 6 6 6M9 3c-4 0-6 2-6 6M-3 9c0-4-2-6-6-6" fill="none" stroke="#e03131" stroke-width="3.4" stroke-linecap="round"/>'), 1.2),
  idea: () => at(108, 14, moving('d-pulse', `<g stroke="#ffd43b" stroke-width="2.4" stroke-linecap="round">${[-150, -115, -80, -45, -10].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${f(14 * Math.cos(r))} ${f(-2 + 14 * Math.sin(r))}L${f(19 * Math.cos(r))} ${f(-2 + 19 * Math.sin(r))}"/>`; }).join('')}</g>`)
    + '<circle cy="-2" r="10" fill="#ffe066" stroke="#f59f00" stroke-width="1.6"/><path d="M-3-4l3 4 3-4" stroke="#f59f00" fill="none" stroke-width="1.2"/><path d="M-5 7h10v5H-5Z" fill="#adb5bd" stroke="#495057"/>'),
  lovebubbles: () => [[100, 40, 1.2, 0], [114, 26, 0.9, 0.7], [92, 20, 0.8, 1.4], [120, 50, 0.7, 2]].map(([x, y, s, d]) => at(x, y, moving('d-note', `<path d="${HEART}" fill="#ff6b9a" stroke="#fff" stroke-width=".6"/>`, d), s * 1.6)).join(''),

  // ---------- nature ----------
  sunflower: () => spokes(22, 58.5, (i) => `<ellipse cy="-1" rx="3.6" ry="8" fill="${i % 2 ? '#ffd43b' : '#fcc419'}" stroke="#e67700" stroke-width=".7"/>`) + ring('#7c4a1d', 4, 51.5)
    + around(22, 51.5, () => '<circle r="1" fill="#3d2410"/>', 8),
  daisies: () => ring('#51cf66', 1.6, 59) + moving('d-sway', around(10, 59, () => `${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cy="-4.6" rx="2" ry="4.6" transform="rotate(${a})" fill="#fff" stroke="#dee2e6" stroke-width=".5"/>`).join('')}<circle r="2.6" fill="#fcc419"/>`)),
  vines: () => moving('d-sway', ring('#2f9e44', 2, 58) + spokes(16, 58, (i) => `<path d="${LEAF}" transform="rotate(${i % 2 ? 40 : -40}) scale(.9)" fill="${i % 3 ? '#40c057' : '#69db7c'}" stroke="#2b8a3e" stroke-width=".7"/>`)),
  mushrooms: () => around(5, 57, (i) => moving('d-bob', `<g transform="scale(${[1, 0.8, 1.2, 0.8, 1][i]})"><path d="M-2.5 0v7h5V0" fill="#fff4e6" stroke="#c9a27a" stroke-width=".8"/><path d="M-9 1C-9-8 9-8 9 1Z" fill="#f03e3e" stroke="#a51111"/>`
    + '<circle cx="-4" cy="-3" r="1.5" fill="#fff"/><circle cx="2" cy="-5" r="1.3" fill="#fff"/><circle cx="5" cy="-1" r="1.1" fill="#fff"/></g>', i * 0.4), 120, 240),
  mapleleaves: () => moving('d-sway', spokes(12, 59, (i) => `<path d="${MAPLE}" transform="rotate(${(i * 47) % 60 - 30}) scale(1.1)" fill="${['#e2672b', '#f29a2e', '#c43f1f', '#f5c542'][i % 4]}"/>`)),
  pinewreath: () => ring('#1e5e2c', 6, 58) + spokes(40, 58, (i) => `<path d="M0 3-4-5M0 3 4-5" stroke="${i % 3 ? '#2b8a3e' : '#37b24d'}" stroke-width="2" stroke-linecap="round"/>`)
    + spokes(6, 58, () => '<circle cx="-2" r="2.2" fill="#e03131"/><circle cx="2" cy="-1" r="2.2" fill="#c92a2a"/><circle cy="2.4" r="2" fill="#ff6b6b"/>', 30)
    + at(65, 122, '<path d="M0 0C-6-6-14-6-14 0-14 6-6 6 0 0ZM0 0C6-6 14-6 14 0 14 6 6 6 0 0Z" fill="#e03131" stroke="#8a1c1c"/><path d="M-1 1-5 10M1 1l4 9" stroke="#e03131" stroke-width="3"/><circle r="3" fill="#c92a2a"/>'),
  raincloud: () => [[92, 36, 0], [101, 38, 0.5], [110, 36, 1]].map(([x, y, d]) => moving('d-fall', `<path d="M${x} ${y}c-2 3-2 5 0 5s2-2 0-5Z" fill="#74c0fc"/>`, d)).join('') + moving('d-bob', cloud(101, 22, 1.1, '#ced4da', '#868e96')),
  sunrays: () => moving('d-spin-slow', spokes(16, 61, (i) => `<path d="M-3 4 0-${i % 2 ? 6 : 9} 3 4Z" fill="#ffd43b"/>`)) + ring('#fcc419', 3, 54),
  rainbowarc: () => ['#ff6b6b', '#ff922b', '#ffd43b', '#51cf66', '#339af0', '#845ef7'].map((c, i) => `<path d="M${f(65 - (69 - i * 3.4))} 66A${f(69 - i * 3.4)} ${f(69 - i * 3.4)} 0 0 1 ${f(65 + 69 - i * 3.4)} 66" fill="none" stroke="${c}" stroke-width="3.6"/>`).join('')
    + moving('d-bob', cloud(4, 66, 0.9) + cloud(126, 66, 0.9)),
  tulips: () => around(5, 60, (i) => moving('d-sway', at(0, 0, `<path d="M0 0v10" stroke="#2f9e44" stroke-width="1.6"/><path d="M0 6c3-2 5-2 6-1-2 2-4 3-6 3" fill="#40c057"/><path d="M-5-6c0 5 2 8 5 8s5-3 5-8l-2.5 2.5L0-6l-2.5 3.5Z" fill="${['#f03e3e', '#f783ac', '#fcc419', '#f03e3e', '#cc5de8'][i]}" stroke="#862e2e" stroke-width=".7"/>`, 1.3), i * 0.5), 120, 240),

  // ---------- critters ----------
  bees: () => ring('#ffd43b', 1, 60, ' stroke-dasharray="2 5" stroke-opacity=".7"') + moving('d-spin-slow', spokes(3, 60, () => '<g transform="scale(1.1)"><ellipse cx="-1" cy="-5" rx="3" ry="2.4" fill="#e7f5ff" fill-opacity=".85" stroke="#adb5bd" stroke-width=".5"/><ellipse cx="2" cy="-5" rx="3" ry="2.4" fill="#e7f5ff" fill-opacity=".85" stroke="#adb5bd" stroke-width=".5"/>'
    + '<ellipse rx="6" ry="4.4" fill="#ffd43b" stroke="#5c3d00" stroke-width=".8"/><path d="M-1.5-4v8M1.5-4v8" stroke="#2b2b2b" stroke-width="1.6"/><circle cx="4.4" cy="-.6" r=".8" fill="#222"/></g>')),
  butterflies: () => [[18, 28, '#ff8fab', 0], [114, 40, '#74c0fc', 0.6], [102, 114, '#ffd43b', 1.2]].map(([x, y, c, d]) => at(x, y, moving('d-bob', moving('d-flutter', `<path d="M0 0C-6-8-12-6-10 0-12 6-6 8 0 0Z" fill="${c}" stroke="#495057" stroke-width=".7"/><path d="M0 0C6-8 12-6 10 0 12 6 6 8 0 0Z" fill="${c}" stroke="#495057" stroke-width=".7"/>`, d)
    + '<path d="M0-4v8" stroke="#343a40" stroke-width="1.4" stroke-linecap="round"/>', d), 1.5)).join(''),
  ladybugs: () => moving('d-spin-slow', spokes(4, 57, () => '<circle cx="5" r="2.6" fill="#212529"/><circle r="5.2" fill="#f03e3e" stroke="#7d1a1a" stroke-width=".7"/><path d="M-5 0h10" stroke="#212529" stroke-width=".8"/><circle cx="-2" cy="-2.4" r="1.1" fill="#212529"/><circle cx="-2" cy="2.4" r="1.1" fill="#212529"/><circle cx="1.6" cy="-3" r=".9" fill="#212529"/><circle cx="1.6" cy="3" r=".9" fill="#212529"/>', 20)),
  goldfish: () => ring('#74c0fc', 1.2, 60, ' stroke-dasharray="1 6" stroke-linecap="round"') + moving('d-spin-slow', spokes(2, 60, () => '<path d="M-8 0-13-5v10Z" fill="#ff922b" stroke="#d9480f" stroke-width=".8"/><ellipse rx="8" ry="5" fill="#ff922b" stroke="#d9480f" stroke-width=".8"/><circle cx="4" cy="-1.4" r="1.2" fill="#212529"/><path d="M0-5c1 2 1 8 0 10" stroke="#ffd8a8" fill="none"/>'))
    + around(5, 63, (i) => moving('d-tw', `<circle r="${[2, 1.4, 2.4, 1.2, 1.8][i]}" fill="#e7f5ff" fill-opacity=".4" stroke="#a5d8ff" stroke-width=".8"/>`, i * 0.5), 30),
  ducks: () => around(3, 60, (i) => moving('d-bob', '<ellipse cy="2" rx="8" ry="5.5" fill="#ffd43b" stroke="#e67700" stroke-width=".8"/><circle cx="4" cy="-5" r="4.2" fill="#ffd43b" stroke="#e67700" stroke-width=".8"/><path d="M8-5.5l4 1.5-4 1.5Z" fill="#ff922b"/><circle cx="5" cy="-6" r=".9" fill="#212529"/><path d="M-6 0c2 2 5 2 7 0" stroke="#e67700" fill="none" stroke-width=".8"/>', i * 0.5), 140, 220),
  catpaws: () => [38, 92].map((x, i) => at(x, 117, moving('d-bob', '<ellipse cy="2" rx="12" ry="9" fill="#f8f9fa" stroke="#adb5bd" stroke-width="1.4"/><ellipse cy="4" rx="4.5" ry="3.5" fill="#ffa8c5"/>'
    + [-7, -2.4, 2.4, 7].map((dx, j) => `<ellipse cx="${dx}" cy="${j % 3 ? -4.5 : -2.5}" rx="2" ry="2.3" fill="#ffa8c5"/>`).join(''), i * 0.6))).join(''),
  birds: () => { const bird = (body, wing) => `<path d="M-6-1l-6-4 1 6Z" fill="${wing}"/><ellipse rx="7" ry="5.5" fill="${body}" stroke="${wing}" stroke-width=".8"/><circle cx="5" cy="-5" r="4" fill="${body}" stroke="${wing}" stroke-width=".8"/><path d="M8.5-5.5l3.5 1-3.5 1.2Z" fill="#fab005"/><circle cx="6" cy="-6" r=".9" fill="#212529"/><path d="M-2 0c2 3 5 3 7 1" stroke="${wing}" fill="none" stroke-width=".8"/><path d="M-1 5v3M2 5v3" stroke="#e67700"/>`;
    return at(44, 14, moving('d-bob', bird('#74c0fc', '#1864ab'))) + `<g transform="translate(88 12) scale(-1 1)">${moving('d-bob', bird('#ffa8c5', '#c2255c'), 0.7)}</g>`; },
  octopus: () => moving('d-sway', spokesAt([125, 150, 175, 200, 225, 250].map((a) => a - 7), 58, (i) => `<path d="M0 12C${i % 2 ? -5 : 5} 4 ${i % 2 ? 4 : -4}-2 0-8c-2-3 ${i % 2 ? -6 : 6}-1 ${i % 2 ? -4 : 4} 2" fill="none" stroke="#9c36b5" stroke-width="4.6" stroke-linecap="round"/>`
    + '<circle cy="2" r=".9" fill="#f3d9fa"/><circle cy="-3" r=".8" fill="#f3d9fa"/>')),
  sharkfin: () => ring('#4dabf7', 2, 60, ' stroke-dasharray="4 6" stroke-opacity=".7" class="d-dash"') + moving('d-spin-slow', spokes(1, 60, () => '<path d="M-8 2C-4-2 2-10 6-12 4-6 4-2 8 2Z" fill="#868e96" stroke="#343a40"/><path d="M-12 3c4 2 20 2 24 0" stroke="#d0ebff" stroke-width="1.6" fill="none"/>')),

  // ---------- food ----------
  donuts: () => moving('d-spin-slow', spokes(5, 58, (i) => `<circle r="5" fill="none" stroke="#d4a373" stroke-width="5"/><circle r="5" fill="none" stroke="${['#ff8fab', '#845ef7', '#ffd43b', '#69db7c', '#4dabf7'][i]}" stroke-width="3.4"/>`
    + '<path d="M-3-4l1-1M3-4l1 1M5 1l1 1M-5 2l-1 1M0 5h1.5" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>')),
  pizza: () => spokes(8, 59, () => '<path d="M0 9-7-5Q0-9 7-5Z" fill="#ffd43b" stroke="#e8590c"/><path d="M-7-5Q0-9 7-5" stroke="#c97b2a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-2" cy="-1" r="1.6" fill="#e03131"/><circle cx="2.4" cy="2" r="1.4" fill="#e03131"/><circle cx="1" cy="-4" r="1.2" fill="#e03131"/>', 22.5),
  sushi: () => around(6, 59, (i) => (i % 2 ? '<circle r="6.5" fill="#212529"/><circle r="4.6" fill="#f8f9fa"/><circle r="2.2" fill="#ff8a5c"/><circle cx=".8" cy="-1" r=".8" fill="#69db7c"/>'
    : '<rect x="-8" y="-1" width="16" height="7" rx="3.5" fill="#f8f9fa" stroke="#ced4da" stroke-width=".8"/><path d="M-9 0c0-4 4-6 9-6s9 2 9 6c-6-2-12-2-18 0Z" fill="#ff8a5c" stroke="#e8590c" stroke-width=".8"/><path d="M-5-3l2 2M0-4l2 2M5-3l2 2" stroke="#ffd8c2"/>'), 30),
  candies: () => moving('d-spin-slow', spokes(8, 58, (i) => { const c = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'][i % 4]; return `<path d="M-6 0-10-4v8ZM6 0l4-4v8Z" fill="${c}"/><circle r="5" fill="${c}" stroke="#fff"/><path d="M-3-2c2 1 4 1 6 0" stroke="#fff" fill="none"/>`; })),
  lollipops: () => [[20, 28, -30, '#ff6b9a', 0], [112, 30, 25, '#4dabf7', 0.6], [110, 108, 145, '#ffd43b', 1.2]].map(([x, y, r, c, d]) => at(x, y, moving('d-bob', `<path d="M0 0v18" stroke="#f8f9fa" stroke-width="2.4" stroke-linecap="round"/><circle r="8" fill="${c}" stroke="#fff" stroke-width=".8"/><path d="M0 0a2 2 0 0 1 4 0 4 4 0 0 1-8 0 6 6 0 0 1 12 0" fill="none" stroke="#fff" stroke-width="1.6"/>`, d), 1, r)).join(''),
  cherries: () => [[106, 18, 1.1, 0], [22, 106, 0.9, 0.8]].map(([x, y, s, d]) => at(x, y, moving('d-bob', '<path d="M-4 6C-2-2 0-6 4-10M4 6C4-2 4-6 4-10" stroke="#2b8a3e" stroke-width="1.4" fill="none"/><path d="M4-10c4-2 8 0 8 2-4 1-6 0-8-2Z" fill="#40c057"/>'
    + '<circle cx="-4" cy="8" r="5" fill="#e03131" stroke="#a51111" stroke-width=".8"/><circle cx="5" cy="8" r="5" fill="#e03131" stroke="#a51111" stroke-width=".8"/><circle cx="-5.5" cy="6.5" r="1.3" fill="#fff" fill-opacity=".8"/><circle cx="3.5" cy="6.5" r="1.3" fill="#fff" fill-opacity=".8"/>', d), s)).join(''),
  boba: () => at(108, 100, moving('d-bob', '<path d="M-10-12h20l-3 26h-14Z" fill="#e9c8a8" stroke="#8a5a2b" stroke-width="1.2"/><path d="M-11-14h22v3h-22Z" fill="#f8f9fa" stroke="#adb5bd"/>'
    + `${[[-5, 9], [-1, 10], [3, 9], [6, 6], [-3, 6], [1, 6], [-6, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#3d2410"/>`).join('')}<path d="M2-26 0-12" stroke="#ff6b9a" stroke-width="3.4" stroke-linecap="round"/>`)),

  // ---------- space ----------
  rocket: () => ring('#ced4da', 1, 60, ' stroke-dasharray="1 5" stroke-opacity=".6"') + moving('d-spin', spokes(1, 60, () => moving('d-pulse', '<path d="M-9-3c-4 0-7 1-9 3 2 2 5 3 9 3Z" fill="#ff922b"/>')
    + '<path d="M-8-4h12c4 0 7 2 9 4-2 2-5 4-9 4H-8Z" fill="#f1f3f5" stroke="#495057"/><circle cx="3" r="2.2" fill="#74c0fc" stroke="#495057" stroke-width=".8"/><path d="M-8-4-12-8v5ZM-8 4l-4 4V3Z" fill="#f03e3e"/>')),
  ufo: () => at(104, 22, moving('d-bob', '<path d="M-12 22 0 4 12 22Z" fill="#b2f2bb" fill-opacity=".35"/><ellipse cy="-3" rx="7" ry="6" fill="#a5d8ff" fill-opacity=".9" stroke="#1c7ed6"/><ellipse rx="17" ry="5.5" fill="#adb5bd" stroke="#495057" stroke-width="1.2"/>'
    + [-10, -3.5, 3.5, 10].map((x, i) => moving('d-blink', `<circle cx="${x}" cy="1" r="1.4" fill="${i % 2 ? '#ffd43b' : '#ff6b6b'}"/>`, i * 0.3)).join(''))),
  planets: () => ring('#dee2e6', 0.8, 55, ' stroke-opacity=".4"') + ring('#dee2e6', 0.8, 62, ' stroke-opacity=".4"') + moving('d-spin', spokes(1, 55, () => '<circle r="4" fill="#ff8787" stroke="#c92a2a"/>'))
    + moving('d-spin-slow', spokes(1, 62, () => '<circle r="5" fill="#ffd43b" stroke="#e67700"/><ellipse rx="9" ry="2.4" fill="none" stroke="#e67700" stroke-width="1.2" transform="rotate(-20)"/>', 120))
    + moving('d-spin-rev', spokes(1, 62, () => '<circle r="3.4" fill="#69db7c" stroke="#2b8a3e"/><circle cx="-1" cy="-1" r="1" fill="#4dabf7"/>', 240)),
  blackhole: (k) => `<defs>${lin('bh' + k, ['#ffe066', '#ff6b00', '#7b2ff7', '#1b1b1f'])}<filter id="bb${k}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter></defs>`
    + moving('d-spin', ring(`url(#bh${k})`, 7, 56, ` filter="url(#bb${k})"`) + ring(`url(#bh${k})`, 2, 56)) + moving('d-spin-rev', ring('#b197fc', 1, 61, ' stroke-dasharray="14 10 3 10"') + ring('#ffd8a8', 1, 52, ' stroke-dasharray="3 12" stroke-opacity=".7"')),
  satellite: () => ring('#dee2e6', 0.8, 61, ' stroke-dasharray="2 4" stroke-opacity=".5"') + moving('d-spin-slow', spokes(1, 61, () => '<rect x="-14" y="-2.5" width="9" height="5" fill="#1c7ed6" stroke="#0b4f8c" stroke-width=".7"/><rect x="5" y="-2.5" width="9" height="5" fill="#1c7ed6" stroke="#0b4f8c" stroke-width=".7"/><path d="M-9.5-2.5v5M9.5-2.5v5" stroke="#74c0fc" stroke-width=".6"/>'
    + '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1" fill="#ced4da" stroke="#495057"/><path d="M0-3.5v-4" stroke="#495057"/>' + moving('d-pulse', '<circle cy="-8.5" r="1.3" fill="#f03e3e"/>'), 300)),
  spacehelmet: () => '<circle cx="65" cy="65" r="59" fill="#d0ebff" fill-opacity=".12" stroke="#e9ecef" stroke-width="4"/><circle cx="65" cy="65" r="61" fill="none" stroke="#868e96" stroke-width="1"/>'
    + `<path class="d-glint" d="${arc(52, -55, -20)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M24 104c22 18 60 18 82 0l6 8c-26 22-68 22-94 0Z" fill="#dee2e6" stroke="#868e96" stroke-width="1.4"/>`
    + [34, 50, 65, 80, 96].map((x) => `<circle cx="${x}" cy="${x === 65 ? 123 : x === 50 || x === 80 ? 121 : 116}" r="1.4" fill="#868e96"/>`).join('') + moving('d-pulse', '<circle cx="110" cy="24" r="3" fill="#ff6b6b"/>'),

  // ---------- holidays ----------
  pumpkins: () => [[24, 104, 1.1, 0], [106, 110, 0.9, 0.6], [112, 24, 0.8, 1.2]].map(([x, y, s, d]) => at(x, y, moving('d-bob', '<ellipse rx="10" ry="8" fill="#f76707" stroke="#a63c06"/><ellipse rx="4.5" ry="8" fill="#ff922b" stroke="#a63c06" stroke-width=".8"/>'
    + '<path d="M0-8c0-3 1-5 3-6" stroke="#2b8a3e" stroke-width="2" fill="none" stroke-linecap="round"/>' + moving('d-flash', '<path d="M-7-1-4-5-1-1ZM1-1 4-5 7-1Z" fill="#ffe066"/><path d="M-6 2c3 4 9 4 12 0l-2 2-2-1-2 2-2-2-2 1Z" fill="#ffe066"/>', d), d), s)).join(''),
  ghosts: () => [[18, 30, 0], [114, 46, 0.7], [100, 114, 1.4]].map(([x, y, d]) => at(x, y, moving('d-bob', '<path d="M-8 8V-2C-8-8-4-11 0-11S8-8 8-2V8L5 5 2.5 8 0 5-2.5 8-5 5Z" fill="#f8f9fa" fill-opacity=".92" stroke="#ced4da" stroke-width=".8"/>'
    + '<circle cx="-3" cy="-3" r="1.4" fill="#212529"/><circle cx="3" cy="-3" r="1.4" fill="#212529"/><ellipse cy="1.5" rx="1.5" ry="2" fill="#212529"/>', d), 1.3)).join(''),
  bats: () => { const wing = '<path d="M-2-1C-6-6-12-6-16-2-13-2-12 1-12 3-10 1-8 1-7 3-6 1-4 1-2 2Z" fill="#2b2240"/>';
    return [[16, 30, 1.6, 0], [112, 18, 1.3, 0.5], [118, 96, 1.4, 1]].map(([x, y, s, d]) => at(x, y, moving('d-bob', moving('d-flutter', `${wing}<g transform="scale(-1 1)">${wing}</g>`, d)
      + '<ellipse rx="2.6" ry="3.4" fill="#2b2240"/><path d="M-2-2-2.4-5.6-.6-3ZM2-2l.4-3.6L.6-3Z" fill="#2b2240"/><circle cx="-1" cy="-1" r=".6" fill="#ff6b6b"/><circle cx="1" cy="-1" r=".6" fill="#ff6b6b"/>', d), s)).join(''); },
  skulls: () => moving('d-spin-slow', spokes(6, 58, () => '<circle cy="-1" r="5.4" fill="#f1f3f5" stroke="#868e96" stroke-width=".7"/><rect x="-3" y="3" width="6" height="3.6" rx="1" fill="#f1f3f5" stroke="#868e96" stroke-width=".7"/>'
    + '<circle cx="-2" cy="-1" r="1.5" fill="#343a40"/><circle cx="2" cy="-1" r="1.5" fill="#343a40"/><path d="M-1.3 5v1.6M0 5v1.6M1.3 5v1.6" stroke="#868e96" stroke-width=".5"/>')),
  xmaslights: () => { let d = ''; for (let a = 0; a <= 360; a += 11.25) { const [x, y] = placeAt(a, a % 22.5 ? 59.5 : 57); d += `${a ? 'L' : 'M'}${f(x)} ${f(y)}`; }
    return `<path d="${d}" fill="none" stroke="#2b8a3e" stroke-width="1.4" stroke-linejoin="round"/>` + spokes(16, 59.5, (i) => `<rect x="-1.6" y="-1" width="3.2" height="3" fill="#495057"/>${moving('d-blink', `<ellipse cy="-4.5" rx="3" ry="4.2" fill="${['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#cc5de8'][i % 5]}"/>`, (i % 4) * 0.4)}`, 11.25); },
  holly: () => spokes(18, 58, (i) => `<path d="M0 0C-1-2-4-2-4-5-2-5-2-7-3-9-1-8 1-8 3-9 2-7 2-5 4-5 4-2 1-2 0 0Z" transform="rotate(${i % 2 ? 35 : -35})" fill="${i % 2 ? '#2b8a3e' : '#37b24d'}" stroke="#1e5e2c" stroke-width=".6"/>`)
    + spokes(6, 58, () => '<circle cx="-2" r="2.2" fill="#e03131"/><circle cx="2" cy="-1" r="2.2" fill="#c92a2a"/><circle cy="2.4" r="2" fill="#ff6b6b"/>', 10),
  cupid: () => at(108, 22, moving('d-tw', `<path d="${HEART}" fill="#ff4d6d" stroke="#fff" stroke-width=".5"/>`), 2.4) + '<path d="M86 44 126 4" stroke="#8b5a2b" stroke-width="2.2" stroke-linecap="round"/><path d="M126 4l-8 1 7 7Z" fill="#adb5bd" stroke="#495057" stroke-width=".8"/>'
    + '<path d="M86 44l-6 2 2-6M89 41l-6 2 2-6" stroke="#ff6b9a" stroke-width="2" fill="none" stroke-linecap="round"/>' + at(28, 24, moving('d-tw', `<path d="${HEART}" fill="#ffa8c5"/>`, 0.6), 1.3) + at(16, 46, moving('d-tw', `<path d="${HEART}" fill="#ff8fab"/>`, 1.2), 1),
  eastereggs: () => around(6, 60, (i) => { const [c, d] = [['#ffc9de', '#e64980'], ['#c5f6fa', '#1098ad'], ['#fff3bf', '#f59f00'], ['#d3f9d8', '#2f9e44'], ['#e5dbff', '#7048e8'], ['#ffe8cc', '#e8590c']][i];
    return moving('d-bob', `<ellipse rx="5.5" ry="7" fill="${c}" stroke="${d}" stroke-width=".8"/><path d="M-5.3-1l2.6-2 2.7 2 2.7-2 2.6 2" stroke="${d}" stroke-width="1.2" fill="none"/><path d="M-5 3h10" stroke="${d}" stroke-width="1" stroke-dasharray="1.5 1.5"/>`, i * 0.4); }, 110, 250),
  fireworks: () => [[18, 22, '#ff6b6b', 0], [112, 18, '#ffd43b', 0.8], [114, 106, '#4dabf7', 1.6], [16, 104, '#cc5de8', 0.4]].map(([x, y, c, d]) => at(x, y, moving('d-tw', Array.from({ length: 12 }, (_, j) => {
    const a = (j * 30 * Math.PI) / 180; return `<path d="M${f(3 * Math.cos(a))} ${f(3 * Math.sin(a))}L${f(9 * Math.cos(a))} ${f(9 * Math.sin(a))}" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${f(11.5 * Math.cos(a))}" cy="${f(11.5 * Math.sin(a))}" r=".9" fill="${c}"/>`; }).join(''), d))).join(''),
  shamrocks: () => moving('d-spin-slow', spokes(8, 58, () => `<g transform="scale(.8)">${[0, 120, 240].map((a) => `<path d="${HEART}" transform="rotate(${a}) translate(0 -4)" fill="#40c057" stroke="#2b8a3e" stroke-width=".6"/>`).join('')}<path d="M0 1v7" stroke="#2b8a3e" stroke-width="1.4"/></g>`)),

  // ---------- games ----------
  controller: () => at(106, 104, moving('d-bob', '<path d="M-14-6h28c5 0 8 4 8 9s-2 9-6 9c-3 0-5-3-7-5h-18c-2 2-4 5-7 5-4 0-6-4-6-9s3-9 8-9Z" fill="#495057" stroke="#212529" stroke-width="1.2"/><path d="M-11 1h6M-8-2v6" stroke="#f8f9fa" stroke-width="2"/>'
    + '<circle cx="7" cy="-1" r="1.6" fill="#ff6b6b"/><circle cx="11" cy="2" r="1.6" fill="#4dabf7"/><circle cx="3" cy="2" r="1.6" fill="#ffd43b"/><circle cx="7" cy="5" r="1.6" fill="#69db7c"/>'), 1, -14),
  hpbar: () => moving('d-bob', [0, 1, 2, 3, 4].map((i) => { const x = 23 + i * 17, y = -2, px = 2; return `<path d="${pixels(x, y, px, (c) => i < 4 || c < 4)}" fill="#f03e3e"/>`
    + (i === 4 ? `<path d="${pixels(x, y, px, (c) => c >= 4)}" fill="#495057"/>` : '') + `<path d="${pixels(x, y, px, (c) => c === 1)}" fill="#ffa8a8" opacity=".9"/>`; }).join('')),
  swords: () => [-40, 40].map((r) => at(108, 26, '<path d="M0-20 2-16V8h-4V-16Z" fill="#dee2e6" stroke="#868e96" stroke-width=".8"/><path d="M0-17V6" stroke="#fff" stroke-width=".8"/><path d="M-6 8h12v2.5H-6Z" fill="#f5c542" stroke="#9c6b00" stroke-width=".6"/><path d="M-1.4 10.5h2.8v6h-2.8Z" fill="#8b5a2b"/><circle cy="18" r="2" fill="#f5c542"/>', 1, r)).join('')
    + sparkle(108, 4, 0.3, 0),
  dice: () => { const pips = { 1: [[0, 0]], 3: [[-4, -4], [0, 0], [4, 4]], 5: [[-4, -4], [4, -4], [0, 0], [-4, 4], [4, 4]], 6: [[-4, -4], [4, -4], [-4, 0], [4, 0], [-4, 4], [4, 4]] };
    const die = (n) => `<rect x="-8" y="-8" width="16" height="16" rx="3.5" fill="#f8f9fa" stroke="#495057" stroke-width="1.2"/>${pips[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${n === 1 ? '#e03131' : '#212529'}"/>`).join('')}`;
    return at(20, 106, moving('d-bob', die(5)), 1, -15) + at(112, 104, moving('d-bob', die(6), 0.6), 1, 20) + at(114, 24, moving('d-bob', die(1), 1.2), 0.8, 10); },

  // ---------- magic ----------
  magiccircle: (k) => `<defs>${glow('mc' + k, 1.6)}</defs><g filter="url(#mc${k})">` + moving('d-spin-slow', `<g stroke="#b197fc" fill="none">${ring('#b197fc', 1.4, 62)}${ring('#b197fc', 1, 52)}${spokes(12, 57, (i) => `<path d="${RUNES[i % RUNES.length]}" stroke-width="1.2" stroke-linecap="round"/>`)}</g>`)
    + moving('d-spin-rev', spokes(3, 62, () => '<circle r="2.4" fill="#e5dbff"/>')) + '</g>',
  fairydust: () => Array.from({ length: 14 }, (_, i) => { const [x, y] = placeAt(-150 + i * 17, 56 + (i % 3) * 4), c = ['#ffc9de', '#c5f6fa', '#fff3bf', '#e5dbff'][i % 4];
    return i % 3 === 1 ? at(x, y, moving('d-tw', `<circle r="1.4" fill="${c}"/>`, i * 0.25)) : sparkle(x, y, 0.22 + (i % 4) * 0.06, i * 0.25, c); }).join(''),
  phoenix: (k) => { const wing = `<path d="M0 0C-10-14-30-18-40-8-30-6-26-2-24 2-34 0-40 6-40 12-30 8-22 10-18 14-24 18-26 24-22 28-12 20-4 12 0 0Z" fill="url(#px${k})" stroke="#c92a2a" stroke-width="1.2"/><path d="M-6-2C-14-8-24-10-32-6M-8 2C-16 2-24 6-30 10M-6 6C-12 10-16 16-18 22" stroke="#ffe066" stroke-width="1" fill="none"/>`;
    return `<defs>${lin('px' + k, ['#ffe066', '#ff922b', '#e03131'], 1, 1)}</defs><g class="d-glow-o"><g class="d-flap-l"><g transform="translate(20 62)">${wing}</g></g><g class="d-flap-r"><g transform="translate(110 62) scale(-1 1)">${wing}</g></g></g>`; },
  batwings: () => { const wing = '<path d="M0 0C-6-10-18-18-34-16-30-10-30-4-32 2-26-2-22-2-18 4-16-2-10-2-6 6Z" fill="#2b2240" stroke="#120d1f" stroke-width="1.2" stroke-linejoin="round"/><path d="M-2 1-30-14M-4 3-26-2M-4 4-16 0" stroke="#4a3a6b" stroke-width=".9" fill="none"/>';
    return `<g class="d-flap-l"><g transform="translate(20 62)">${wing}</g></g><g class="d-flap-r"><g transform="translate(110 62) scale(-1 1)">${wing}</g></g>`; },
};

// the decoration's SVG (k keeps its gradients' and filters' names its own)
export const moreDecoSVG = (id, k) => (ART[id] ? ART[id](k) : '');
