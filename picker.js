// The emoji and sticker picker, Discord's way: Stickers and Emoji tabs, a search box, a rail down the left (Favorites,
// Frequently Used, each of your servers with its own, then the standard groups), the grid, and what you're pointing at
// along the bottom. An emoji goes into the message box (Shift-click keeps the picker open; right-click makes it a
// favorite); a sticker is sent. The standard emoji (emoji-data.js) are loaded the first time they're needed.
import { el, icon } from './ui.js';

let data = null, lib = null;          // (lib: the loaded emoji, and each by itself, kept for the next time the picker opens)
export const loadEmoji = () => (data = data || import('./emoji-data.js').then((m) => { lib = lib || { ...m, byChar: new Map(m.EMOJI.map((e) => [e[0], e])) }; return m; }));
const KEEP = { fav: 'fluentdat.emojiFavs', recent: 'fluentdat.emojiRecent' };
const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
// an emoji's key: the emoji itself, or c:<id> for one of a server's own
export const favorites = () => read(KEEP.fav).filter((x) => typeof x === 'string');
export function toggleFavorite(key) { const f = favorites(); write(KEEP.fav, f.includes(key) ? f.filter((x) => x !== key) : [key, ...f].slice(0, 60)); }
// each emoji you've used: [key, how often, when last], the most used first (Frequently Used, and the :name suggestions)
export function noteUse(key) {
  const list = read(KEEP.recent).filter((x) => Array.isArray(x)), i = list.findIndex((x) => x[0] === key);
  if (i >= 0) { list[i][1]++; list[i][2] = Date.now(); } else list.push([key, 1, Date.now()]);
  write(KEEP.recent, list.sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 48));
}
export const frequent = () => read(KEEP.recent).filter((x) => Array.isArray(x)).map((x) => x[0]);
const GROUP_ICON = { people: '🙂', nature: '🌿', food: '🍔', activities: '⚽', travel: '🚗', objects: '💡', symbols: '🔣', flags: '🏳️' };

// the standard emoji matching some text: the one called exactly that first, then names that start with it (shortest
// first, so :hea finds :heart: before :heart_eyes:), then names that have it, then words about it
export function findIn(EMOJI, q, limit = 80) {
  q = String(q || '').toLowerCase().replace(/^:+|:+$/g, '');
  if (!q) return [];
  const starts = [], has = [], words = [];
  for (const e of EMOJI) {
    const names = e[1].split(' '), hit = names.find((n) => n.startsWith(q));
    if (hit) starts.push({ e, name: hit, rank: hit === q ? -1 : hit.length }); else { const n = names.find((x) => x.includes(q)); if (n) has.push({ e, name: n }); else if (e[2].includes(q)) words.push({ e, name: names[0] }); }
  }
  starts.sort((a, b) => a.rank - b.rank);
  return [...starts, ...has, ...words].slice(0, limit).map(({ e, name }) => ({ emoji: e[0], name }));
}
export const findEmoji = async (q, limit) => findIn((await loadEmoji()).EMOJI, q, limit);
// :name: in what you wrote becomes the emoji (a standard one becomes the emoji itself, a server's own becomes
// <:name:id>), as Discord does when you send; nothing inside `code` is touched. custom(name) → a server emoji, or nothing
export async function withEmoji(text, custom) {
  if (!/:[A-Za-z0-9_+-]{2,32}:/.test(text || '')) return text;
  const { EMOJI } = await loadEmoji();
  const std = new Map();
  for (const e of EMOJI) for (const n of e[1].split(' ')) if (!std.has(n)) std.set(n, e[0]);
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/).map((part, i) => (i % 2 ? part : part.replace(/(^|[^\w<:]):([A-Za-z0-9_+-]{2,32}):(?![\w])/g, (all, pre, name) => {
    const c = custom(name);
    if (c) return `${pre}<${c.animated ? 'a' : ''}:${c.name}:${c.id}>`;
    const s = std.get(name.toLowerCase());
    return s ? pre + s : all;
  }))).join('');
}

// ---------- the picker ----------
// o: { tab ('emoji' | 'stickers'), emojiOnly (no Stickers tab), anchor, still (no animation),
//      servers: [{ id, name, face() → a little server icon }], emojiOf(sv) → [{ id, name, url, animated }], stickersOf(sv) → [{ id, name, url, emoji, description }],
//      own: your own stickers [{ id, kind, data, name }], builtin: emoji stickers ['🤖', …], safeImg(src),
//      canManage(sv), manage(sv, 'emoji' | 'stickers'), onEmoji(text, keepOpen, serverEmoji), onSticker(sticker, server), onCreateOwn(), onRemoveOwn(sticker), onTab(tab) }
let open = null;
export const isOpen = () => !!open;
export function closePicker(fast) {
  if (!open) return;
  const p = open; open = null;
  document.removeEventListener('mousedown', p.away, true); removeEventListener('keydown', p.esc, true);
  if (fast || p.still) { p.box.remove(); return; }
  p.box.classList.add('out'); setTimeout(() => p.box.remove(), 130);
}
export function openPicker(o) {
  closePicker(true);
  let tab = o.tab === 'stickers' && !o.emojiOnly ? 'stickers' : 'emoji', q = '', railBtns = new Map(), sections = [];
  const box = el('div', { className: 'xp' + (o.still ? ' still' : ''), role: 'dialog', ariaLabel: 'Emoji and stickers' });
  const search = el('input', { className: 'xp-q', type: 'search', autocomplete: 'off', spellcheck: false });
  const tabsEl = el('div', { className: 'xp-tabs' });
  const rail = el('nav', { className: 'xp-rail' }), grid = el('div', { className: 'xp-grid' }), foot = el('div', { className: 'xp-foot' });
  box.append(el('div', { className: 'xp-head' }, tabsEl, el('label', { className: 'xp-search' }, icon('search', 16), search)), el('div', { className: 'xp-main' }, rail, grid), foot);
  const custom = new Map();                 // c:<id> → { emoji, server }
  for (const sv of o.servers) for (const e of o.emojiOf(sv.id)) custom.set('c:' + e.id, { ...e, server: sv });

  const preview = (face, name, sub) => foot.replaceChildren(el('span', { className: 'xp-pv' }, face), el('div', { className: 'xp-pv-text' }, el('b', {}, name), sub ? el('small', {}, sub) : null));
  const restFoot = () => foot.replaceChildren(el('span', { className: 'xp-hint' }, tab === 'emoji' ? 'Shift-click to pick more than one · right-click for a favorite' : 'Click a sticker to send it'));
  // (a picture that won't load becomes a grey square with its name's first letter)
  const gone = (img, name) => () => img.replaceWith(el('span', { className: 'xp-gone', title: name }, String(name || '?').replace(/^:/, '').slice(0, 1).toUpperCase()));
  const pic = (src, name, extra = {}) => { const img = el('img', { src, alt: name, draggable: false, loading: 'lazy', ...extra }); img.onerror = gone(img, name); return img; };
  const face = (key) => {
    if (key.startsWith('c:')) { const c = custom.get(key); return c ? pic(o.safeImg(c.url), ':' + c.name + ':') : null; }
    return el('span', { className: 'xp-e' }, key);
  };
  const nameOf = (key) => { if (key.startsWith('c:')) { const c = custom.get(key); return c ? { name: ':' + c.name + ':', sub: c.server.name } : null; } const e = lib && lib.byChar.get(key); return { name: e ? ':' + e[1].split(' ')[0] + ':' : key, sub: '' }; };
  const cell = (key) => {
    const f = face(key); if (!f) return null;
    const info = nameOf(key);
    const b = el('button', { className: 'xp-cell', title: info.name, ariaLabel: info.name }, f);
    b.onmouseenter = () => preview(face(key), info.name, info.sub);
    b.onclick = (e) => {
      const c = key.startsWith('c:') ? custom.get(key) : null;
      noteUse(key);
      o.onEmoji(c ? `:${c.name}:` : key, e.shiftKey, c ? { id: c.id, name: c.name, animated: c.animated } : null);
      if (!e.shiftKey) closePicker();
    };
    b.oncontextmenu = (e) => { e.preventDefault(); toggleFavorite(key); const top = grid.scrollTop; draw(); grid.scrollTop = top; };
    return b;
  };
  const section = (id, title, kids, railFace, extra) => {
    const s = el('section', { className: 'xp-sec' }, el('h5', {}, el('span', {}, title), extra || null), el('div', { className: tab === 'emoji' ? 'xp-cells' : 'xp-stickers' }, ...kids));
    s.dataset.sec = id;
    sections.push(s);
    if (railFace) {
      const r = el('button', { className: 'xp-r', title, onclick: () => s.scrollIntoView({ block: 'start', behavior: o.still ? 'auto' : 'smooth' }) }, railFace);
      railBtns.set(id, r); rail.append(r);
    }
    return s;
  };
  const manageLink = (sv, kind) => (o.canManage(sv.id) ? el('button', { className: 'xp-add', onclick: () => { closePicker(true); o.manage(sv.id, kind); } }, icon('plus', 14), kind === 'emoji' ? 'Add Emoji' : 'Add Sticker') : null);

  function emojiTab() {
    if (!lib) return [el('div', { className: 'xp-empty' }, 'Loading emoji…')];
    if (q) {
      const ql = q.toLowerCase().replace(/^:+|:+$/g, '');
      const mine = [...custom.keys()].filter((k) => custom.get(k).name.toLowerCase().includes(ql));
      const std = findIn(lib.EMOJI, ql, 150).map((x) => x.emoji);
      const all = [...mine, ...std];
      return all.length ? [section('search', 'Search Results', all.map(cell).filter(Boolean))] : [el('div', { className: 'xp-empty' }, el('div', { className: 'xp-big' }, '🔍'), 'No emoji match that.')];
    }
    const out = [], favs = favorites().filter((k) => !k.startsWith('c:') || custom.has(k)), used = frequent().filter((k) => !k.startsWith('c:') || custom.has(k)).slice(0, 24);
    if (favs.length) out.push(section('fav', 'Favorites', favs.map(cell).filter(Boolean), icon('star', 18)));
    if (used.length) out.push(section('recent', 'Frequently Used', used.map(cell).filter(Boolean), icon('clock', 18)));
    for (const sv of o.servers) {
      const list = o.emojiOf(sv.id);
      if (!list.length && !o.canManage(sv.id)) continue;
      out.push(section('sv:' + sv.id, sv.name, list.length ? list.map((e) => cell('c:' + e.id)).filter(Boolean) : [el('div', { className: 'xp-none' }, 'No emoji yet.')], sv.face(), manageLink(sv, 'emoji')));
    }
    lib.GROUPS.forEach(([id, name], gi) => out.push(section(id, name, lib.EMOJI.filter((e) => e[3] === gi).map((e) => cell(e[0])), el('span', { className: 'xp-ge' }, GROUP_ICON[id] || '•'))));
    return out;
  }
  function stickersTab() {
    const ql = q.toLowerCase();
    const hit = (s) => !ql || [s.name, s.emoji, s.description].some((v) => String(v || '').toLowerCase().includes(ql));
    const sticker = (s, sv) => {
      const src = s.url ? o.safeImg(s.url) : s.kind === 'img' ? o.safeImg(s.data) : '';
      const b = el('button', { className: 'xp-st', title: s.name || 'sticker' }, src ? pic(src, s.name || 'sticker') : el('span', { className: 'xp-st-e' }, String(s.data || s.emoji || '').slice(0, 12)));
      b.onmouseenter = () => preview(src ? el('img', { src, alt: '' }) : el('span', {}, String(s.data || '').slice(0, 4)), s.name || 'Sticker', sv ? sv.name + (s.description ? ' · ' + s.description : '') : s.description || '');
      b.onclick = () => { o.onSticker(s, sv); closePicker(); };
      if (!sv && s.id && o.onRemoveOwn) b.oncontextmenu = (e) => { e.preventDefault(); closePicker(true); o.onRemoveOwn(s); };
      return b;
    };
    const out = [];
    for (const sv of o.servers) {
      const list = o.stickersOf(sv.id).filter(hit);
      if (!list.length && (ql || !o.canManage(sv.id))) continue;
      out.push(section('sv:' + sv.id, sv.name, list.length ? list.map((s) => sticker(s, sv)) : [el('div', { className: 'xp-none' }, 'No stickers yet.')], sv.face(), manageLink(sv, 'stickers')));
    }
    const own = o.own.filter(hit);
    if (own.length || !ql) out.push(section('own', 'Your Stickers', own.length ? own.map((s) => sticker(s, null)) : [el('div', { className: 'xp-none' }, 'None yet: make one from a picture or some text. (Right-click one to delete it.)')],
      icon('user', 18), o.onCreateOwn ? el('button', { className: 'xp-add', onclick: () => { closePicker(true); o.onCreateOwn(); } }, icon('plus', 14), 'Create') : null));
    const builtin = o.builtin.filter((e) => !ql || e.includes(ql)).map((e) => ({ kind: 'emoji', data: e, name: e }));
    if (builtin.length) out.push(section('builtin', 'Fluentdat', builtin.map((s) => sticker(s, null)), el('img', { src: 'icons/logo.svg', alt: '', className: 'xp-logo' })));
    return out.length ? out : [el('div', { className: 'xp-empty' }, el('div', { className: 'xp-big' }, '🔍'), 'No stickers match that.')];
  }
  function draw() {
    sections = []; railBtns = new Map(); rail.replaceChildren();
    tabsEl.hidden = !!o.emojiOnly;
    tabsEl.replaceChildren(...[['stickers', 'Stickers'], ['emoji', 'Emoji']].map(([id, label]) => el('button', { className: id === tab ? 'on' : '', onclick: () => { if (tab === id) return; tab = id; q = ''; search.value = ''; if (o.onTab) o.onTab(id); draw(); search.focus(); } }, label)));
    search.placeholder = tab === 'emoji' ? 'Find the perfect emoji' : 'Find the perfect sticker';
    box.dataset.tab = tab;
    grid.replaceChildren(...(tab === 'emoji' ? emojiTab() : stickersTab()));
    rail.hidden = !!q;
    grid.scrollTop = 0; mark(); restFoot();
  }
  // (the rail follows the grid: the section you're looking at is lit)
  function mark() {
    const top = grid.getBoundingClientRect().top + 8;
    let cur = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= top) cur = s;
    for (const [id, b] of railBtns) b.classList.toggle('on', !!cur && cur.dataset.sec === id);
  }
  grid.addEventListener('scroll', () => requestAnimationFrame(mark));
  search.addEventListener('input', () => { q = search.value.trim(); draw(); });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = grid.querySelector('.xp-cell, .xp-st'); if (first) { e.preventDefault(); first.click(); } }
  });
  // placed above the button that opened it, its right edge on the button's (all the way across on a phone)
  document.body.append(box);
  const r = o.anchor.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  if (innerWidth > 560) {
    box.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
    box.style.top = Math.max(8, r.top - h - 10) + 'px';
  }
  const p = open = { box, still: !!o.still,
    away: (e) => { if (!box.contains(e.target) && !o.anchor.contains(e.target)) closePicker(); },
    esc: (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePicker(); } } };
  // (Escape closes the picker before anything under it: the window hears keys before the page's own listeners do)
  document.addEventListener('mousedown', p.away, true); addEventListener('keydown', p.esc, true);
  draw();
  setTimeout(() => search.focus(), 0);
  if (!lib) loadEmoji().then(() => { if (open === p && tab === 'emoji') draw(); });
  return p;
}
