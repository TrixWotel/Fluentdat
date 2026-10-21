// Fluentdat's logo (the ring open at the top right, the dot and the spark) in 30 looks: for the Home button, the tab's
// icon, the sign-in window, and for themes (a theme can bring its own; Settings → Appearance → App Icon picks one).
// A paint is a colour ('#rrggbb', 'var(--accent)', 'currentColor') or a list of colours (a gradient, corner to corner).
const RING = 'M83.76 45.97A34 34 0 1 1 54.03 16.24', SPARK = 'M74 22v8M70 26h8';
export const LOGOS = [
  ['accent', 'Theme Accent', { tile: 'var(--accent)', mark: 'var(--accent-text)' }],
  ['classic', 'Classic', { tile: '#000000', mark: '#ffffff' }],
  ['inverted', 'Inverted', { tile: '#ffffff', mark: '#000000' }],
  ['blurple', 'Blurple', { tile: '#5865f2', mark: '#ffffff' }],
  ['midnight', 'Midnight', { tile: ['#0b1b3a', '#1f3f7a'], mark: '#9cc3ff' }],
  ['sunset', 'Sunset', { tile: ['#ff7a45', '#e0398f'], mark: '#ffffff' }],
  ['ocean', 'Ocean', { tile: ['#0ea5b7', '#1e4fd8'], mark: '#ffffff' }],
  ['forest', 'Forest', { tile: ['#2f8a4c', '#0f3d22'], mark: '#e9f7d8' }],
  ['ember', 'Ember', { tile: '#140b08', mark: ['#ffb347', '#ff4e1a'] }],
  ['neon', 'Neon', { tile: '#05060a', mark: '#38f2ff', glow: true }],
  ['candy', 'Candy', { tile: ['#ff9ac9', '#ff5fa2'], mark: '#ffffff', dot: '#ffe14d' }],
  ['gold', 'Gold', { tile: '#0d0b06', mark: ['#fff1a8', '#d4a017', '#8a6410'] }],
  ['rose', 'Rose', { tile: '#e8577e', mark: '#fff4f6' }],
  ['mint', 'Mint', { tile: '#a7f3d0', mark: '#065f46' }],
  ['lavender', 'Lavender', { tile: '#d9c8ff', mark: '#5b3fbf' }],
  ['cherry', 'Cherry Cola', { tile: ['#a3122e', '#4a0714'], mark: '#ffd6de' }],
  ['steel', 'Steel', { tile: ['#4b5563', '#1f2937'], mark: ['#f9fafb', '#9ca3af'] }],
  ['galaxy', 'Galaxy', { tile: ['#3a1477', '#07031a'], radial: true, mark: '#ffffff', stars: true }],
  ['rainbow', 'Rainbow', { tile: '#0b0b0f', mark: ['#ff4d4d', '#ffb84d', '#ffee4d', '#4dff88', '#4dc3ff', '#9b6bff'] }],
  ['holo', 'Holographic', { tile: ['#a5f3fc', '#c4b5fd', '#fbcfe8', '#fde68a'], mark: '#ffffff', shadow: true, shimmer: true }],
  ['sakura', 'Sakura', { tile: '#ffe4ec', mark: '#e0457b' }],
  ['ice', 'Ice', { tile: ['#e0f2ff', '#a5d8ff'], mark: '#1c64c4' }],
  ['lava', 'Lava', { tile: ['#3b0703', '#120201'], mark: '#ff6a1f', glow: true }],
  ['duotone', 'Duotone', { tile: '#111827', mark: '#f472b6', dot: '#60a5fa', spark: '#facc15' }],
  ['pixel', 'Pixel', { tile: '#000000', mark: '#ffffff', pixel: true }],
  ['terminal', 'Terminal', { tile: '#020a04', mark: '#39ff6a', glow: true, pixel: true }],
  ['bold', 'Bold', { tile: '#000000', mark: '#ffffff', sw: 12, dotR: 16 }],
  ['thin', 'Thin', { tile: '#000000', mark: '#ffffff', sw: 4, dotR: 10 }],
  ['circle', 'Circle', { tile: 'var(--accent)', mark: 'var(--accent-text)', shape: 'circle' }],
  ['outline', 'Outline', { tile: 'none', outline: true, mark: 'currentColor' }],
  ['ghost', 'Ghost', { tile: 'none', mark: 'currentColor' }],
];
const BY = new Map(LOGOS.map(([id, name, o]) => [id, { id, name, ...o }]));
export const logoInfo = (id) => BY.get(id) || BY.get('accent');
// the built-in themes' own logos (a custom theme can choose any)
export const THEME_LOGO = { dark: 'accent', midnight: 'midnight', ember: 'ember', forest: 'forest', light: 'inverted' };

let uid = 0;
const STAR_AT = [[18, 20, 1.6], [30, 76, 1.2], [84, 70, 1.4], [70, 86, 1], [12, 52, 1], [88, 40, 1.1], [44, 10, 0.9]];
// the logo as SVG markup. square: the tile fills the box (the Home button rounds it itself); resolve: turns var(--…) and
// currentColor into real colours (a tab icon is drawn outside the page, so it can't use the page's)
export function logoSVG(id, { size = null, square = false, resolve = (c) => c } = {}) {
  const v = logoInfo(id), n = ++uid, defs = [];
  const paint = (p, key) => {
    if (Array.isArray(p)) {
      const gid = `lg${n}${key}`, stops = p.map((c, i) => `<stop offset="${(i / (p.length - 1)).toFixed(3)}" stop-color="${resolve(c)}"/>`).join('');
      defs.push(v.radial && key === 't' ? `<radialGradient id="${gid}" cx=".35" cy=".3" r=".9">${stops}</radialGradient>`
        : `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">${stops}</linearGradient>`);
      return `url(#${gid})`;
    }
    return resolve(p);
  };
  const mark = paint(v.mark, 'm'), dot = v.dot ? paint(v.dot, 'd') : mark, spark = v.spark ? paint(v.spark, 's') : mark;
  const sw = v.sw || 8, dotR = v.dotR || 14, rx = v.shape === 'circle' ? 50 : square ? 0 : 22;
  let tile = '';
  if (v.tile !== 'none') tile = `<rect width="100" height="100" rx="${rx}" style="fill:${paint(v.tile, 't')}"/>`;
  else if (v.outline) tile = `<rect x="3" y="3" width="94" height="94" rx="${Math.max(0, rx - 3)}" style="fill:none;stroke:${resolve('currentColor')};stroke-width:4;opacity:.55"/>`;
  if (v.stars) tile += STAR_AT.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:#fff;opacity:.75"/>`).join('');
  if (v.glow) defs.push(`<filter id="lg${n}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  if (v.shadow) defs.push(`<filter id="lg${n}h" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#5b21b6" flood-opacity=".45"/></filter>`);
  const filter = v.glow ? ` filter="url(#lg${n}g)"` : v.shadow ? ` filter="url(#lg${n}h)"` : '';
  let body;
  if (v.pixel) {
    // the mark on a 25 × 25 grid of squares, the way the original was drawn
    const cells = [];
    for (let gy = 0; gy < 25; gy++) for (let gx = 0; gx < 25; gx++) {
      const x = gx * 4 + 2, y = gy * 4 + 2, d = Math.hypot(x - 50, y - 50), a = Math.atan2(y - 50, x - 50) * 180 / Math.PI;
      const ring = Math.abs(d - 34) <= sw / 2 + 0.5 && !(a > -78 && a < -12);
      const isDot = d <= dotR, isSpark = (Math.abs(x - 74) <= 2 && y >= 22 && y <= 30) || (Math.abs(y - 26) <= 2 && x >= 70 && x <= 78);
      if (ring || isDot || isSpark) cells.push(`<rect x="${gx * 4}" y="${gy * 4}" width="4.2" height="4.2" style="fill:${isSpark ? spark : isDot ? dot : mark}"/>`);
    }
    body = `<g${filter}>${cells.join('')}</g>`;
  } else {
    body = `<g${filter} style="fill:none;stroke-linecap:round"><path d="${RING}" style="stroke:${mark};stroke-width:${sw}"/>` +
      `<path class="lg-spark" d="${SPARK}" style="stroke:${spark};stroke-width:${Math.max(3, sw / 2)}"/>` +
      `<circle class="lg-dot" cx="50" cy="50" r="${dotR}" style="fill:${dot};stroke:none"/></g>`;
  }
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="lg${v.shimmer ? ' shimmer' : ''}" viewBox="0 0 100 100"${dim} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fluentdat">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') + tile + body + '</svg>';
}
export function logoEl(id, opts) { const d = document.createElement('div'); d.innerHTML = logoSVG(id, opts); return d.firstElementChild; }
// the tab's icon, in the chosen look (the page's colours worked out first)
export function setFavicon(id) {
  try {
    const cs = getComputedStyle(document.documentElement);
    const resolve = (c) => (c === 'currentColor' ? (cs.getPropertyValue('--text').trim() || '#e8eaee') : String(c).replace(/var\((--[a-z-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || '#5b7fd6'));
    const href = 'data:image/svg+xml,' + encodeURIComponent(logoSVG(id, { resolve }));
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link); }
    if (link.href !== href) { link.type = 'image/svg+xml'; link.href = href; }
  } catch {}
}
