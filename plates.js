// Nameplates from the Shop: a picture behind your name in member lists and DMs, worn as np:<name> (and bought with
// Datbux). Each is drawn here as a CSS background: gradients, and small SVG patterns tiled across. (Plain colours,
// gradients and your own pictures are still free in the profile editor.)

const svg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
// (the same scatter every time)
const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const dots = (w, h, n, cols, seed, rmax = 1.2) => { const r = seeded(seed); let out = ''; for (let i = 0; i < n; i++) out += `<circle cx='${(r() * w).toFixed(1)}' cy='${(r() * h).toFixed(1)}' r='${(0.4 + r() * rmax).toFixed(1)}' fill='${cols[i % cols.length]}'/>`; return out; };
const STAR4 = 'M0-5L1.2-1.2 5 0 1.2 1.2 0 5-1.2 1.2-5 0-1.2-1.2Z';
const HEART = 'M0 3C-5-1-3-6 0-3 3-6 5-1 0 3Z';
const PAW = "<ellipse cx='0' cy='3' rx='4.2' ry='3.4'/><circle cx='-4.6' cy='-2.4' r='1.8'/><circle cx='-1.6' cy='-5.4' r='1.8'/><circle cx='1.6' cy='-5.4' r='1.8'/><circle cx='4.6' cy='-2.4' r='1.8'/>";
const at = (x, y, inner, extra = '') => `<g transform='translate(${x} ${y})${extra}'>${inner}</g>`;

// [id, name, its background]
export const NAMEPLATES = [
  ['sunset', 'Sunset Glow', 'radial-gradient(circle at 84% 135%, #ffe066 0 24%, #ffa94d 25% 29%, transparent 30%), linear-gradient(180deg, #2b1055 0%, #7597de 38%, #ff7e5f 74%, #feb47b 100%)'],
  ['ocean', 'Ocean Depths', `${svg(80, 44, "<path d='M0 30Q20 22 40 30T80 30V44H0Z' fill='#1864ab'/><path d='M0 37Q20 31 40 37T80 37V44H0Z' fill='#0b4f8a'/>")} repeat-x 0 100% / 80px 100%, linear-gradient(#74c0fc, #1971c2)`],
  ['galaxy', 'Galaxy', `${svg(70, 44, dots(70, 44, 18, ['#fff', '#d0bfff', '#a5d8ff'], 11) + at(52, 12, `<path d='${STAR4}' fill='#fff'/>`))} 0 0 / 70px 44px, radial-gradient(ellipse at 28% 62%, #7b2ff7aa, transparent 60%), radial-gradient(ellipse at 76% 28%, #f107a3aa, transparent 55%), #0b0723`],
  ['sakura', 'Sakura', `${svg(60, 44, [[12, 10, 20], [40, 26, 110], [24, 36, 60], [52, 6, 160]].map(([x, y, a]) => at(x, y, "<ellipse rx='4' ry='2.4' fill='#fff' fill-opacity='.85'/><ellipse rx='2.4' ry='1.2' fill='#f783ac'/>", ` rotate(${a})`)).join(''))} 0 0 / 60px 44px, linear-gradient(135deg, #ffdeeb, #fcc2d7 60%, #f783ac)`],
  ['forest', 'Pine Forest', `${svg(60, 44, "<path d='M10 44L18 27h-4l7-12h-4l7-11 7 11h-4l7 12h-4l8 17Z' fill='#1b4332'/><path d='M40 44l5-10h-3l4-8h-2l4-7 4 7h-2l4 8h-3l5 10Z' fill='#2b8a3e'/>")} repeat-x 0 100% / 60px 100%, linear-gradient(#a5d8ff, #d3f9d8)`],
  ['lava', 'Lava', 'radial-gradient(circle at 18% 72%, #ffd43b 0 7%, transparent 20%), radial-gradient(circle at 54% 30%, #ff922b 0 9%, transparent 26%), radial-gradient(circle at 86% 76%, #ffa94d 0 8%, transparent 22%), linear-gradient(90deg, #7f0000, #c92a2a 50%, #e8590c)'],
  ['circuit', 'Circuit', `${svg(60, 44, "<path d='M0 10H18V30H40V12H60M10 44V34H28' stroke='#38d9a9' stroke-width='2' fill='none'/><circle cx='18' cy='10' r='2.6' fill='#63e6be'/><circle cx='40' cy='30' r='2.6' fill='#63e6be'/><circle cx='28' cy='34' r='2.6' fill='#63e6be'/>")} 0 0 / 60px 44px, #083d33`],
  ['candy', 'Candy Stripes', 'repeating-linear-gradient(45deg, #ff8fab 0 10px, #fff0f6 10px 20px)'],
  ['pixel', 'Pixel Hearts', `${svg(26, 22, ['1 0', '3 0', '0 1', '1 1', '2 1', '3 1', '4 1', '0 2', '1 2', '2 2', '3 2', '4 2', '1 3', '2 3', '3 3', '2 4'].map((p) => { const [a, b] = p.split(' '); return `<rect x='${4 + a * 3}' y='${4 + b * 3}' width='3' height='3' fill='#f06595'/>`; }).join(''))} 0 0 / 26px 22px, #ffdeeb`],
  ['aurora', 'Aurora', 'radial-gradient(ellipse at 18% 120%, #38d9a9dd, transparent 60%), radial-gradient(ellipse at 58% -24%, #7b61ffdd, transparent 62%), radial-gradient(ellipse at 96% 84%, #ff6ec7aa, transparent 52%), #0b1a2b'],
  ['stars', 'Starry Night', `${svg(60, 44, dots(60, 44, 14, ['#fff', '#fff3bf'], 23) + at(14, 30, `<path d='${STAR4}' fill='#fff3bf'/>`) + at(46, 10, `<path d='${STAR4}' fill='#fff' transform='scale(.7)'/>`))} 0 0 / 60px 44px, linear-gradient(#0b1d3a, #1e3a6e)`],
  ['clouds', 'Cloud Nine', `${svg(70, 44, "<g fill='#fff' fill-opacity='.9'><circle cx='14' cy='30' r='7'/><circle cx='22' cy='25' r='9'/><circle cx='31' cy='30' r='7'/><rect x='8' y='30' width='29' height='6' rx='3'/><circle cx='52' cy='12' r='5'/><circle cx='58' cy='9' r='6'/><circle cx='64' cy='12' r='5'/><rect x='48' y='12' width='20' height='4' rx='2'/></g>")} 0 0 / 70px 44px, linear-gradient(#74c0fc, #d0ebff)`],
  ['neon', 'Neon Grid', 'linear-gradient(#ff4fd860 1px, transparent 1px) 0 0 / 100% 11px, linear-gradient(90deg, #5ff4ff60 1px, transparent 1px) 0 0 / 16px 100%, linear-gradient(#1b0636, #3a0f6b)'],
  ['gold', 'Gold Leaf', 'linear-gradient(110deg, #7a5200 0%, #f5c542 18%, #fff3bf 28%, #e0a800 40%, #8a5a00 55%, #f5c542 72%, #fff3bf 80%, #b07d00 100%)'],
  ['frost', 'Frost', `${svg(48, 44, [[12, 12, 1], [36, 32, 0.8]].map(([x, y, s]) => at(x, y, [0, 60, 120].map((a) => `<path transform='rotate(${a})' d='M0-7V7M-2-5 0-3 2-5M-2 5 0 3 2 5' stroke='#fff' stroke-width='1.3' fill='none' stroke-linecap='round'/>`).join(''), ` scale(${s})`)).join(''))} 0 0 / 48px 44px, linear-gradient(135deg, #e7f5ff, #a5d8ff 60%, #74c0fc)`],
  ['autumn', 'Autumn', `${svg(56, 44, [[12, 12, '#e8590c', 20], [40, 30, '#c92a2a', -30], [30, 8, '#f59f00', 70]].map(([x, y, c, a]) => at(x, y, `<path d='M0-7l1.6 3 2.4-1.5-.8 4 3.2-.8-1.6 3.2 2.4.8-4 1.6.8 2.4-4-1.6v3.2h-.4V5.6l-4 1.6.8-2.4-4-1.6 2.4-.8-1.6-3.2 3.2.8-.8-4L-1.6-4Z' fill='${c}'/>`, ` rotate(${a})`)).join(''))} 0 0 / 56px 44px, linear-gradient(90deg, #ffe8cc, #ffc078)`],
  ['code', 'Code Rain', `${svg(48, 44, "<g font-family='monospace' font-size='9' fill='#2f9e44'><text x='2' y='10'>1011</text><text x='20' y='22' fill='#69db7c'>0110</text><text x='6' y='34'>1001</text><text x='26' y='42' fill='#40c057'>11</text></g>")} 0 0 / 48px 44px, #050a05`],
  ['checkers', 'Checkers', 'repeating-conic-gradient(#2b2d31 0 25%, #4c4f56 0 50%) 0 0 / 14px 14px'],
  ['waves', 'Waves', `${svg(40, 14, "<path d='M0 8Q10 2 20 8T40 8' stroke='#ffffff80' fill='none' stroke-width='2'/>")} 0 0 / 40px 14px, linear-gradient(90deg, #0ca678, #1098ad)`],
  ['polka', 'Polka Dots', 'radial-gradient(#ffffff80 22%, transparent 24%) 0 0 / 14px 14px, radial-gradient(#ffffff40 22%, transparent 24%) 7px 7px / 14px 14px, #7048e8'],
  ['zigzag', 'Zigzag', 'linear-gradient(135deg, #ffa94d 25%, transparent 25%) -8px 0 / 16px 16px, linear-gradient(225deg, #ffa94d 25%, transparent 25%) -8px 0 / 16px 16px, linear-gradient(315deg, #ffa94d 25%, transparent 25%) 0 0 / 16px 16px, linear-gradient(45deg, #ffa94d 25%, transparent 25%) 0 0 / 16px 16px, #e8590c'],
  ['hearts', 'Hearts', `${svg(40, 44, at(10, 12, `<path d='${HEART}' fill='#f06595' transform='scale(1.6)'/>`) + at(30, 32, `<path d='${HEART}' fill='#ff8fab' transform='scale(1.3)'/>`))} 0 0 / 40px 44px, #ffe3e3`],
  ['bubbles', 'Bubbles', `${svg(48, 44, "<g fill='none' stroke='#d0ebff' stroke-width='1.4'><circle cx='10' cy='12' r='6'/><circle cx='34' cy='28' r='9'/><circle cx='20' cy='38' r='3.5'/><circle cx='42' cy='6' r='3'/></g><circle cx='8' cy='10' r='1.5' fill='#fff'/><circle cx='31' cy='25' r='2' fill='#fff'/>")} 0 0 / 48px 44px, linear-gradient(#4dabf7, #1864ab)`],
  ['flames', 'Flames', `${svg(40, 44, "<path d='M8 44C2 36 6 28 12 22c0 8 6 10 6 4 6 6 8 12 4 18Z' fill='#ff6b00'/><path d='M28 44c-5-6-2-12 3-16 0 6 4 7 4 3 4 4 5 9 2 13Z' fill='#ffa94d'/><path d='M12 44c-3-4-1-8 2-10 0 4 3 4 3 2 2 3 2 6 0 8Z' fill='#ffd43b'/>")} repeat-x 0 100% / 40px 100%, linear-gradient(#1a0500, #7f1d00)`],
  ['rainbow', 'Rainbow', 'linear-gradient(90deg, #ff6b6b, #ffa94d, #ffd43b, #69db7c, #4dabf7, #9775fa)'],
  ['marble', 'Marble', 'linear-gradient(115deg, transparent 40%, #adb5bd66 42%, transparent 44%), linear-gradient(160deg, transparent 60%, #868e9655 61%, transparent 63%), linear-gradient(80deg, transparent 75%, #ced4da77 76%, transparent 78%), radial-gradient(ellipse at 30% 40%, #f8f9fa, #dee2e6)'],
  ['camo', 'Camo', 'radial-gradient(circle at 20% 30%, #4b5320 0 18%, transparent 19%) 0 0 / 60px 44px, radial-gradient(circle at 70% 64%, #3a3f1a 0 20%, transparent 21%) 0 0 / 60px 44px, radial-gradient(circle at 45% 84%, #6b705c 0 15%, transparent 16%) 0 0 / 60px 44px, radial-gradient(circle at 86% 18%, #2f3317 0 12%, transparent 13%) 0 0 / 60px 44px, #8a8f5f'],
  ['honey', 'Honeycomb', `${svg(30, 26, "<path d='M7.5 0h15l7.5 13-7.5 13h-15L0 13Z' fill='none' stroke='#e67700' stroke-width='1.5'/>")} 0 0 / 30px 26px, linear-gradient(#ffd43b, #fab005)`],
  ['music', 'Music', `${svg(44, 44, "<g fill='#e5dbff'><path d='M10 30V12l12-3v16' fill='none' stroke='#e5dbff' stroke-width='1.6'/><ellipse cx='8' cy='30' rx='3' ry='2.2'/><ellipse cx='20' cy='25' rx='3' ry='2.2'/><path d='M34 14v12' stroke='#e5dbff' stroke-width='1.4'/><ellipse cx='32' cy='26' rx='2.6' ry='2'/></g>")} 0 0 / 44px 44px, linear-gradient(#5f3dc4, #845ef7)`],
  ['paws', 'Paw Prints', `${svg(44, 44, at(12, 14, `<g fill='#c08552'>${PAW}</g>`, ' rotate(-20)') + at(32, 32, `<g fill='#d9a066'>${PAW}</g>`, ' rotate(15)'))} 0 0 / 44px 44px, #f3d9b1`],
];
const BG = Object.fromEntries(NAMEPLATES.map(([id, , bg]) => [id, bg]));
export const plateInfo = (id) => NAMEPLATES.find((p) => p[0] === id) || null;
// a nameplate's background (for CSS), or '' for one there isn't
export const plateBg = (id) => BG[id] || '';
