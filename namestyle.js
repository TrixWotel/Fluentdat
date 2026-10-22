// Display name styles, like Discord's: a font, an effect and one or two colours, drawn wherever the name is.
// The fonts are free ones (Fontsource, from the same place as Supabase's library), fetched the first time a name
// that uses one is on screen.
export const FONTS = [
  ['', 'Default', null, 1],
  ['tempo', 'Tempo', ['pacifico', 'Pacifico'], 1],
  ['sakura', 'Sakura', ['varela-round', 'Varela Round'], 1],
  ['jelly', 'Jellybean', ['fredoka', 'Fredoka'], 1.04],
  ['modern', 'Modern', ['orbitron', 'Orbitron'], 0.9],
  ['medieval', 'Medieval', ['unifrakturmaguntia', 'UnifrakturMaguntia'], 1.12],
  ['pixel', '8Bit', ['press-start-2p', 'Press Start 2P'], 0.66],
  ['vampyre', 'Vampyre', ['creepster', 'Creepster'], 1.12],
  ['chunky', 'Chunky', ['bungee', 'Bungee'], 0.88],
  ['comic', 'Comic', ['comic-neue', 'Comic Neue'], 1.06],
  ['script', 'Script', ['dancing-script', 'Dancing Script'], 1.18],
  ['type', 'Typewriter', ['special-elite', 'Special Elite'], 1],
  ['marker', 'Marker', ['permanent-marker', 'Permanent Marker'], 1],
  ['elegant', 'Elegant', ['playfair-display', 'Playfair Display'], 1.04],
  ['lobster', 'Lobster', ['lobster', 'Lobster'], 1.05], ['bangers', 'Bangers', ['bangers', 'Bangers'], 1.08], ['righteous', 'Righteous', ['righteous', 'Righteous'], 1],
  ['audiowide', 'Audiowide', ['audiowide', 'Audiowide'], 0.9], ['monoton', 'Monoton', ['monoton', 'Monoton'], 0.92], ['cinzel', 'Cinzel', ['cinzel', 'Cinzel'], 0.95],
  ['caveat', 'Caveat', ['caveat', 'Caveat'], 1.22], ['satisfy', 'Satisfy', ['satisfy', 'Satisfy'], 1.15], ['shadows', 'Shadows', ['shadows-into-light', 'Shadows Into Light'], 1.15],
  ['luckiest', 'Luckiest', ['luckiest-guy', 'Luckiest Guy'], 0.95], ['blackops', 'Black Ops', ['black-ops-one', 'Black Ops One'], 0.95], ['silkscreen', 'Silkscreen', ['silkscreen', 'Silkscreen'], 0.82],
  ['terminal', 'Terminal', ['vt323', 'VT323'], 1.22], ['vibes', 'Great Vibes', ['great-vibes', 'Great Vibes'], 1.25], ['fatface', 'Fat Face', ['abril-fatface', 'Abril Fatface'], 1],
  ['bebas', 'Bebas', ['bebas-neue', 'Bebas Neue'], 1.12], ['glitchy', 'Glitchy', ['rubik-glitch', 'Rubik Glitch'], 0.95], ['indie', 'Indie Flower', ['indie-flower', 'Indie Flower'], 1.1],
  ['rampart', 'Rampart', ['rampart-one', 'Rampart One'], 1], ['cherry', 'Cherry Bomb', ['cherry-bomb-one', 'Cherry Bomb One'], 1],
];
export const EFFECTS = [['solid', 'Solid'], ['gradient', 'Gradient'], ['neon', 'Neon'], ['toon', 'Toon'], ['pop', 'Pop'], ['gummy', 'Gummy'], ['prism', 'Prism'], ['glow', 'Glow']];
export const NAME_COLORS = ['#ffffff', '#57f287', '#3498db', '#b845f5', '#e91e63', '#ed4245', '#f1c40f', '#ff8c42'];
const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '');
const loaded = new Set();
export function loadFont(id) {
  const f = FONTS.find((x) => x[0] === id);
  if (!f || !f[2] || loaded.has(id)) return;
  loaded.add(id);
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = `https://cdn.jsdelivr.net/npm/@fontsource/${f[2][0]}@5/index.css`;
  document.head.append(link);
}
export const fontFamily = (id) => { const f = FONTS.find((x) => x[0] === id); return f && f[2] ? `'${f[2][1]}'` : ''; };
// put a style on a name. colors: false keeps the font but not the colours and effect (where a server role colours the name)
export function styleName(node, style, { colors = true, fallback = '' } = {}) {
  for (const c of [...node.classList]) if (c === 'ns' || c.startsWith('ns-')) node.classList.remove(c);
  node.style.removeProperty('font-family'); node.style.removeProperty('--ns-scale'); node.style.removeProperty('--c1'); node.style.removeProperty('--c2');
  if (!style) return node;
  const f = FONTS.find((x) => x[0] === style.font);
  if (f && f[2]) { loadFont(f[0]); node.style.fontFamily = `'${f[2][1]}', system-ui, sans-serif`; node.style.setProperty('--ns-scale', f[3]); node.classList.add('ns-f'); }
  const effect = EFFECTS.some((e) => e[0] === style.effect) ? style.effect : '';
  const c1 = hex(style.c1), c2 = hex(style.c2);
  if (colors && effect && (c1 || effect === 'prism')) {
    node.classList.add('ns', 'ns-' + effect);
    node.style.setProperty('--c1', c1 || fallback || '#ffffff');
    node.style.setProperty('--c2', c2 || c1 || fallback || '#ffffff');
  }
  return node;
}
export const hasStyle = (s) => !!(s && (s.font || (s.effect && (s.c1 || s.effect === 'prism'))));
// a random style (Surprise Me)
export function surprise() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const c = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return { font: pick(FONTS)[0], effect: pick(EFFECTS)[0], c1: c(), c2: c() };
}
