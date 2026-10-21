// Picking any colour, like Discord's picker: a saturation and brightness square, a hue slider, the hex code, an
// eyedropper (where the browser has one), a row of starting points and the colours you used last.
import { el, icon } from './ui.js';

const RECENT = 'fluentdat.recentColors';
export const PRESETS = ['#000000', '#ffffff', '#5865f2', '#eb459e', '#ed4245', '#f0b232', '#23a55a', '#00a8fc', '#9b59b6', '#1abc9c'];
const clean = (h) => (/^#?[0-9a-f]{6}$/i.test(h || '') ? '#' + String(h).replace('#', '').toLowerCase() : null);
const recent = () => { try { const v = JSON.parse(localStorage.getItem(RECENT)); return Array.isArray(v) ? v.filter(clean).slice(0, 10) : []; } catch { return []; } };
const remember = (hex) => { try { localStorage.setItem(RECENT, JSON.stringify([hex, ...recent().filter((x) => x !== hex)].slice(0, 10))); } catch {} };

export function hexToHsv(hex) {
  const n = parseInt((clean(hex) || '#5865f2').slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}
export function hsvToHex(h, s, v) {
  const f = (k) => { const x = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

let open = null;
export const colorOpen = () => !!open;
export function closeColor() {
  if (!open) return;
  const o = open; open = null;
  removeEventListener('mousedown', o.away, true); removeEventListener('keydown', o.esc, true);
  o.box.classList.add('out'); setTimeout(() => o.box.remove(), 140);
  if (o.done) o.done(o.value);
}
// anchor: what it opens beside; value: '#rrggbb'; onInput(hex) as it moves; onDone(hex) when it closes
export function openColor({ anchor, value, presets = PRESETS, onInput = () => {}, onDone = () => {}, title = '' }) {
  if (open) closeColor();
  let [h, s, v] = hexToHsv(value);
  const box = el('div', { className: 'cp', role: 'dialog', ariaLabel: title || 'Pick a colour' });
  const sv = el('div', { className: 'cp-sv' }), knob = el('i', { className: 'cp-knob' }), hue = el('div', { className: 'cp-hue' }), hueKnob = el('i');
  sv.append(knob); hue.append(hueKnob);
  const hex = el('input', { className: 'cp-hex', type: 'text', maxLength: 7, spellcheck: false, ariaLabel: 'Hex code' });
  const pick = typeof window.EyeDropper === 'function' ? el('button', { className: 'cp-drop', title: 'Pick a colour from the screen', onclick: async () => {
    try { const r = await new window.EyeDropper().open(); const c = clean(r.sRGBHex); if (c) { [h, s, v] = hexToHsv(c); draw(true); } } catch {}
  } }, icon('brush', 16)) : null;
  const sw = (c) => el('button', { className: 'cp-sw', title: c, style: `background:${c}`, onclick: () => { [h, s, v] = hexToHsv(c); draw(true); } });
  const rec = recent();
  box.append(title ? el('div', { className: 'cp-title' }, title) : '', sv, hue, el('div', { className: 'cp-row' }, el('span', { className: 'cp-pre' }, '#'), hex, pick),
    el('div', { className: 'cp-sws' }, ...presets.map(sw)), rec.length ? el('div', { className: 'cp-sws cp-recent' }, ...rec.map(sw)) : '');
  const o = open = { box, value: clean(value) || hsvToHex(h, s, v), done: onDone,
    away: (e) => { if (!box.contains(e.target) && !(anchor && anchor.contains(e.target))) closeColor(); },
    esc: (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && e.target === hex)) { e.stopPropagation(); e.preventDefault(); closeColor(); } } };
  function draw(changed) {
    const c = hsvToHex(h, s, v);
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 1, 1)})`;
    knob.style.left = s * 100 + '%'; knob.style.top = (1 - v) * 100 + '%'; knob.style.background = c;
    hueKnob.style.left = h / 360 * 100 + '%'; hueKnob.style.background = hsvToHex(h, 1, 1);
    if (document.activeElement !== hex) hex.value = c.slice(1);
    if (changed && c !== o.value) { o.value = c; remember(c); onInput(c); }
  }
  const drag = (node, move) => node.addEventListener('pointerdown', (e) => {
    e.preventDefault(); node.setPointerCapture(e.pointerId); move(e);
    const mv = (ev) => move(ev), up = () => { node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up); };
    node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up);
  });
  drag(sv, (e) => { const r = sv.getBoundingClientRect(); s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); v = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); draw(true); });
  drag(hue, (e) => { const r = hue.getBoundingClientRect(); h = Math.min(359.9, Math.max(0, (e.clientX - r.left) / r.width * 360)); draw(true); });
  hex.addEventListener('input', () => { const c = clean(hex.value.trim()); if (c) { [h, s, v] = hexToHsv(c); draw(true); } });
  document.body.append(box);
  // beside the thing that opened it (above it if there's no room below)
  const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2 - 130, right: innerWidth / 2 + 130, top: innerHeight / 2 - 160, bottom: innerHeight / 2 - 160 };
  const w = box.offsetWidth, ht = box.offsetHeight;
  box.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  box.style.top = (r.bottom + 8 + ht < innerHeight ? r.bottom + 8 : Math.max(8, r.top - ht - 8)) + 'px';
  addEventListener('mousedown', o.away, true); addEventListener('keydown', o.esc, true);
  draw(false);
  return o;
}
// a colour as a little square you click to change (for forms): returns the button; .value is its colour
export function colorSwatch(value, onChange, { presets, title, empty = '' } = {}) {
  const b = el('button', { className: 'cswatch' + (value ? '' : ' none'), type: 'button', title: title || 'Pick a colour' });
  const set = (c) => { b.value = c || ''; b.style.background = c || ''; b.classList.toggle('none', !c); };
  b.onclick = (e) => { e.stopPropagation(); openColor({ anchor: b, value: b.value || '#5865f2', presets, title, onInput: (c) => { set(c); onChange(c, false); }, onDone: (c) => onChange(c, true) }); };
  b.set = set; set(value || empty);
  return b;
}
