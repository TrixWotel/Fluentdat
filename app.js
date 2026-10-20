// Fluentdat — a Discord-style chat that runs in the browser (data in store.js). Servers hold categories of channels;
// there are direct messages, a friends list, a member list, status (online/idle/dnd/invisible), a profile you can
// customise, stickers you can make, and your own CSS themes you can edit. UI icons are inline SVG (not OS emoji).
// It all saves locally for now; swapping store.js for a GitHub-backed one is what makes it multi-person.
import { Store } from './backend.js';

const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k)); return n; };

const DEFAULT_PREFS = {
  density: 'cozy', fontSize: 15, reduceMotion: false, highContrast: false, notify: false, sendOnEnter: true, dmFrom: 'anyone',
  // layout — all of these really move something (Settings → Layout)
  rail: 'on', railSize: 'm', iconShape: 'squircle', sideW: 'medium', chanIcons: 'on', cats: 'on', sideHead: 'on', userPanel: 'on',
  topbar: 'on', callBtns: 'on', banner: 'on',
  avatars: 'on', avatarSize: 'm', avatarShape: 'round', timestamps: '12', group: true, dividers: 'on', msgWidth: 'full', hover: 'on',
  membersDefault: true, memberW: 'medium', memberOffline: true, memberStatusText: false,
  composerSticker: 'on', composerSend: 'on', radius: 'soft', uiFont: 'system',
};
const LAYOUT_PRESETS = {
  Default: {},
  Compact: { density: 'compact', fontSize: 14, avatarSize: 's', railSize: 's', sideW: 'narrow', dividers: 'off', memberW: 'narrow', radius: 'sharp' },
  Spacious: { density: 'cozy', fontSize: 16, avatarSize: 'l', sideW: 'wide', msgWidth: 'readable', radius: 'round', memberW: 'wide' },
  Minimal: { rail: 'off', sideHead: 'off', userPanel: 'off', callBtns: 'off', avatars: 'off', timestamps: 'off', dividers: 'off', composerSticker: 'off', banner: 'off', membersDefault: false, hover: 'off' },
};
let prefs = loadPrefs();

// ---------- icons ----------
const ICON = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/>',
  micOff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-1m14 0v1a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/>',
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  camOff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>',
  hangup: '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 8.63 19.24M5 9a16 16 0 0 1-.7-2.81A2 2 0 0 1 6.08 4H9a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81"/><line x1="23" y1="1" x2="1" y2="23"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  bot: '<rect x="4" y="9" width="16" height="11" rx="2.5"/><path d="M12 9V6"/><circle cx="12" cy="4.5" r="1.5"/><circle cx="9" cy="14" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.1" fill="currentColor" stroke="none"/><path d="M9.5 17.5h5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  personAdd: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  id: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="12" r="2.5"/><path d="M14 10h5M14 14h5"/>',
  palette: '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9.6-10-9.6z"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="16.5" cy="11" r="1.3" fill="currentColor" stroke="none"/>',
  dot: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>', chevD: '<path d="M6 9l6 6 6-6"/>', chevR: '<path d="M9 18l6-6-6-6"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6"/>',
};
const svgHTML = (n, s) => `<svg class="ic" viewBox="0 0 24 24"${s ? ` width="${s}" height="${s}"` : ''}>${ICON[n] || ''}</svg>`;
const icon = (n, s) => { const d = document.createElement('div'); d.innerHTML = svgHTML(n, s); return d.firstElementChild; };

// ---------- images ----------
const readImage = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });
function scaled(img, max) { const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s); const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); c.getContext('2d').drawImage(img, 0, 0, w, h); return c.toDataURL('image/png'); }
const pickFile = (cb) => { const i = el('input', { type: 'file', accept: 'image/*' }); i.onchange = () => { if (i.files[0]) cb(i.files[0]); }; i.click(); };

// ---------- you ----------
const COLORS = ['#5b7fd6', '#4bbf73', '#e8743b', '#d6554b', '#b05bd6', '#d6b23b', '#3bc6d6', '#e86ba8'];
const STATUSES = [['online', 'Online'], ['idle', 'Idle'], ['dnd', 'Do Not Disturb'], ['invisible', 'Invisible']];
function loadMe() { try { const m = JSON.parse(localStorage.getItem('fluency.me')); if (m && m.name) return { avatar: '', pronouns: '', about: '', status: 'online', id: 'local-' + Math.random().toString(36).slice(2, 10), ...m }; } catch {} return { id: 'local-' + Math.random().toString(36).slice(2, 10), name: 'You', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '', pronouns: '', about: '', status: 'online' }; }
let me = loadMe();
const saveMe = () => { try { localStorage.setItem('fluency.me', JSON.stringify(me)); } catch {} };
const initials = (name) => String(name || '?').trim().slice(0, 2).toUpperCase();
const stamp = () => { const u = { name: me.name, color: me.color }; if (me.avatar) u.avatar = me.avatar; if (me.pronouns) u.pronouns = me.pronouns; if (me.about) u.about = me.about; return u; };
const asMember = () => ({ id: 'me', name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status, me: true });

function avatarEl(user, { size, status } = {}) {
  const a = el('div', { className: 'avatar' });
  if (size) { a.style.width = a.style.height = size + 'px'; }
  const fill = el('div', { className: 'fill', style: `background:${user.color || '#5b7fd6'}` });
  if (user.avatar) fill.append(el('img', { src: user.avatar, alt: '' }));
  else if (user.bot) { fill.append(icon('bot', 20)); fill.style.color = '#fff'; }
  else fill.append(document.createTextNode(initials(user.name)));
  a.append(fill);
  const st = status || (user.me ? me.status : user.status);
  if (st) a.append(el('div', { className: 'dot ' + st }));
  return a;
}

// ---------- themes (built-in + your own) ----------
const BUILTIN = [['dark', 'Dark'], ['midnight', 'Midnight'], ['ember', 'Ember'], ['forest', 'Forest'], ['light', 'Light']];
const VARS = ['rail', 'side', 'main', 'input', 'hover', 'text', 'muted', 'bright', 'accent', 'accent-text', 'line'];
const loadThemes = () => { try { return JSON.parse(localStorage.getItem('fluency.themes')) || []; } catch { return []; } };
const saveThemes = (t) => { try { localStorage.setItem('fluency.themes', JSON.stringify(t)); } catch {} };
function applyTheme(id) {
  const cur = document.getElementById('fluency-custom-css'); if (cur) cur.remove();
  VARS.forEach((v) => document.documentElement.style.removeProperty('--' + v));
  const custom = loadThemes().find((t) => t.id === id);
  if (custom) {
    document.documentElement.dataset.theme = 'dark';
    VARS.forEach((v) => { if (custom.vars[v]) document.documentElement.style.setProperty('--' + v, custom.vars[v]); });
    if (custom.css) document.head.append(el('style', { id: 'fluency-custom-css', textContent: custom.css }));
  } else document.documentElement.dataset.theme = BUILTIN.some((b) => b[0] === id) ? id : 'dark';
  try { localStorage.setItem('fluency.theme', id); } catch {}
}
const currentTheme = () => { try { return localStorage.getItem('fluency.theme') || 'dark'; } catch { return 'dark'; } };
applyTheme(currentTheme());
const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue('--' + v).trim() || '#000000';

// ---------- state ----------
let view = 'server', serverId = (Store.servers()[0] || {}).id || null, channelId = null, dmId = null, friendsTab = 'online', showMembers = true;
// keep the chosen server/channel pointing at something real (data can arrive or vanish while you're looking)
function ensureSelection() {
  const svs = Store.servers();
  if (!serverId || !svs.some((s) => s.id === serverId)) serverId = svs[0] ? svs[0].id : null;
  const chans = serverId ? Store.channels(serverId) : [];
  if (!channelId || !chans.some((c) => c.id === channelId)) channelId = firstChannel(serverId);
}
const collapsed = new Set();
function firstChannel(sv) { if (!sv) return null; const c = Store.channels(sv).find((x) => x.kind === 'text') || Store.channels(sv)[0]; return c ? c.id : null; }


// ---------- the server rail ----------
function renderRail() {
  const rail = $('#rail');
  const home = el('button', { className: 'srv home' + (view === 'home' ? ' on' : ''), title: 'Direct Messages', onclick: () => { view = 'home'; dmId = dmId || null; closeCall(); renderAll(); } }); home.append(icon('home', 24));
  rail.replaceChildren(home, el('hr'),
    ...Store.servers().map((s) => {
      const b = el('button', { className: 'srv' + (view === 'server' && s.id === serverId ? ' on' : ''), title: s.name, onclick: () => { view = 'server'; serverId = s.id; channelId = firstChannel(s.id); closeCall(); renderAll(); } });
      if (s.img) b.append(el('img', { src: s.img, alt: '' })); else if (ICON[s.icon]) b.append(icon(s.icon, 24)); else b.textContent = initials(s.name);
      return b;
    }),
    (() => { const b = el('button', { className: 'srv add', title: 'Add a server', onclick: createServer }); b.append(icon('plus', 24)); return b; })());
}

// ---------- the sidebar ----------
function renderSide() {
  const head = $('#side-head'), body = $('#side-body');
  if (view === 'home') {
    head.className = 'side-head'; head.replaceChildren('Messages');
    const friends = el('button', { className: 'nav-btn' + (!dmId ? ' on' : ''), onclick: () => { dmId = null; renderAll(); } }, icon('users'), 'Friends');
    const list = el('div', {}, el('div', { className: 'cat' }, el('span', { className: 'nm' }, 'Direct Messages')));
    for (const d of Store.dmList()) {
      const row = el('button', { className: 'dm-row' + (dmId === d.id ? ' on' : ''), onclick: () => { dmId = d.id; Store.setActive('dm', d.id); renderAll(); } },
        avatarEl(d.user, { size: 32 }), el('div', { className: 'who' }, el('div', { className: 'nm2' }, d.user.name)));
      list.append(row);
    }
    body.replaceChildren(friends, list);
  } else if (!serverId || !Store.server(serverId)) {
    head.className = 'side-head'; head.replaceChildren(Store.syncState().loading ? 'Loading…' : 'No servers');
    body.replaceChildren(el('div', { style: 'color:var(--muted);padding:14px 10px;font-size:.9rem' },
      Store.syncState().loading ? 'Fetching your servers from GitHub…' : 'Make one with the + in the server rail.'));
  } else {
    const server = Store.server(serverId);
    head.className = 'side-head btn-like';
    head.replaceChildren(el('span', {}, server.name), el('span', { className: 'drop' }, icon('chevD', 18)));
    head.onclick = (e) => serverMenu(e.currentTarget);
    body.replaceChildren();
    const cats = Store.categories(serverId), chans = Store.channels(serverId);
    const groups = cats.length ? cats : [{ id: null, name: 'Channels' }];
    for (const cat of groups) {
      const mine = chans.filter((c) => (cat.id ? c.category === cat.id : true));
      const isCollapsed = collapsed.has(cat.id);
      const header = el('div', { className: 'cat' + (isCollapsed ? ' collapsed' : ''), onclick: () => { if (isCollapsed) collapsed.delete(cat.id); else collapsed.add(cat.id); renderSide(); } },
        el('span', { className: 'caret' }, icon('chevD')), el('span', { className: 'nm' }, cat.name),
        el('span', { className: 'add', title: 'New channel', onclick: (e) => { e.stopPropagation(); newChannel(cat.id); } }, icon('plus')));
      body.append(header);
      if (isCollapsed) continue;
      for (const c of mine) {
        const row = el('button', { className: 'chan' + (c.id === channelId && view === 'server' ? ' on' : ''), onclick: () => { channelId = c.id; Store.setActive('channel', c.id); closeCall(); renderAll(); $('#app').classList.remove('show-side'); } },
          icon(c.kind === 'voice' ? 'volume' : 'hash', 18), el('span', { className: 'nm' }, c.name));
        if (chans.length > 1) { const x = el('span', { className: 'x', title: 'Delete channel', onclick: (e) => { e.stopPropagation(); if (confirm(`Delete #${c.name}?`)) { Store.removeChannel(c.id); if (channelId === c.id) channelId = firstChannel(serverId); renderAll(); } } }, icon('x')); row.append(x); }
        body.append(row);
      }
    }
  }
}

// ---------- the user panel ----------
function renderMe() {
  const gear = el('button', { className: 'gear', title: 'Settings', onclick: () => openUserSettings('account') }); gear.append(icon('gear'));
  const av = avatarEl(asMember()); av.onclick = (e) => { e.stopPropagation(); showAccount(e.currentTarget); };
  const stName = (STATUSES.find((s) => s[0] === me.status) || [, 'Online'])[1];
  $('#me-panel').replaceChildren(av, el('div', { className: 'who' }, el('div', { className: 'nm' }, me.name), el('div', { className: 'st' }, me.pronouns || stName)), gear);
}

// ---------- the top bar ----------
function renderTop() {
  const top = $('#top'), menu = el('button', { className: 'menu', title: 'Menu', onclick: () => $('#app').classList.toggle('show-side') }); menu.append(icon('menu'));
  const parts = [menu];
  if (view === 'home' && !dmId) { parts.push(el('span', { className: 'hash' }, icon('users')), el('span', {}, 'Friends')); }
  else if (view === 'home') { const u = Store.dmUser(dmId) || { name: '?' }; parts.push(avatarEl(u, { size: 24 }), el('span', {}, u.name), spacer(), callBtns()); }
  else { const c = Store.channel(channelId);
    if (!c) parts.push(el('span', {}, Store.syncState().loading ? 'Loading…' : 'Fluentdat'));
    else parts.push(el('span', { className: 'hash' }, icon(c.kind === 'voice' ? 'volume' : 'hash')), el('span', {}, c.name), spacer(), callBtns(), membersBtn()); }
  top.replaceChildren(...parts.flat().filter(Boolean));
}
const spacer = () => el('span', { className: 'spacer' });
function callBtns() { const v = el('button', { className: 'act', title: 'Join voice', onclick: () => startCall(false) }, icon('phone')); const vd = el('button', { className: 'act', title: 'Start video', onclick: () => startCall(true) }, icon('video')); return [v, vd]; }
function membersBtn() { const b = el('button', { className: 'act' + (showMembers ? ' on' : ''), title: 'Members', onclick: () => { showMembers = !showMembers; $('#app').classList.toggle('show-members', showMembers); renderMembers(); } }, icon('users')); return b; }

// ---------- messages ----------
const fmt = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(.+?)\*(?=\W|$)/g, '$1<i>$2</i>').replace(/`(.+?)`/g, '<code>$1</code>');
function when(ts) {
  const d = new Date(ts);
  if (prefs.timestamps === '24') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (prefs.timestamps === 'rel') { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function messageList(msgs) {
  const wrap = el('div', { className: 'msgs' });
  let last = null, lastDay = null;
  for (const m of msgs) {
    if (!lastDay || !sameDay(lastDay, m.ts)) { wrap.append(el('div', { className: 'day' }, new Date(m.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))); lastDay = m.ts; last = null; }
    const cont = prefs.group && last && last.user.name === m.user.name && !last.user.bot === !m.user.bot && (m.ts - last.ts) < 5 * 60000;
    const body = el('div', { className: 'body' });
    if (!cont) {
      const nm = el('span', { className: 'nm', style: `--who:${m.user.color || 'var(--bright)'}`, onclick: (e) => showProfile(m.user, e.currentTarget) }, m.user.name);
      const meta = el('div', { className: 'meta' }, nm); if (m.user.bot) meta.append(el('span', { className: 'tag' }, 'bot')); meta.append(el('span', { className: 'when' }, when(m.ts)));
      body.append(meta);
    }
    if (m.sticker) { const st = typeof m.sticker === 'string' ? { kind: 'emoji', data: m.sticker } : m.sticker; body.append(st.kind === 'img' ? el('div', { className: 'sticker' }, el('img', { src: st.data, alt: 'sticker' })) : el('div', { className: 'sticker' }, st.data)); }
    if (m.text != null) { const t = el('div', { className: 'text' + (m.action ? ' action' : '') }); t.innerHTML = fmt(m.action ? `${m.user.name} ${m.text}` : m.text); body.append(t); }
    const av = avatarEl(m.user); av.onclick = (e) => showProfile(m.user, e.currentTarget);
    wrap.append(el('div', { className: 'msg' + (cont ? ' cont' : '') }, av, body));
    last = m;
  }
  return wrap;
}

// ---------- the main content ----------
function renderContent() {
  const content = $('#content'), composer = $('#composer');
  if (view === 'home' && !dmId) { content.replaceChildren(friendsPage()); composer.hidden = true; return; }
  const ch = view === 'home' ? null : Store.channel(channelId);
  if (view === 'server' && !ch) {
    content.replaceChildren(el('div', { className: 'empty-note' }, Store.syncState().loading ? 'Loading your servers…' : 'No channel here yet. Make one from the server menu.'));
    composer.hidden = true; return;
  }
  const msgs = view === 'home' ? Store.dm(dmId) : Store.messages(channelId);
  content.replaceChildren(messageList(msgs));
  const name = view === 'home' ? (Store.dmUser(dmId) || {}).name : (ch.kind === 'voice' ? '' : '#') + ch.name;
  $('#input').placeholder = 'Message ' + name;
  composer.hidden = false;
  content.scrollTop = content.scrollHeight;
}

// ---------- members ----------
function memberList() {
  const real = Store.members && Store.members();
  return real && real.length ? real : [asMember(), ...Store.friends()];
}
function renderMembers() {
  const box = $('#members');
  if (view !== 'server' || !showMembers) { box.replaceChildren(); return; }
  const all = memberList();
  const online = all.filter((m) => m.status && m.status !== 'offline' && m.status !== 'invisible');
  const offline = all.filter((m) => !online.includes(m));
  const member = (m) => {
    const who = el('div', { style: 'min-width:0;flex:1' }, el('div', { className: 'nm', style: `--who:${m.color}` }, m.name));
    if (prefs.memberStatusText) who.append(el('div', { style: 'font-size:.74rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, m.about || (m.bot ? 'Bot' : (m.status || 'offline'))));
    return el('button', { className: 'mem' + (online.includes(m) ? '' : ' off'), onclick: (e) => showProfile(m, e.currentTarget) }, avatarEl(m), who);
  };
  const grp = (title, list) => list.length ? [el('div', { className: 'mem-cat' }, `${title} — ${list.length}`), ...list.map(member)] : [];
  box.replaceChildren(...grp('Online', online), ...(prefs.memberOffline ? grp('Offline', offline) : []));
}

function renderAll() { ensureSelection(); renderRail(); renderSide(); renderMe(); renderTop(); renderContent(); renderMembers(); renderBanner(); $('#app').classList.toggle('show-members', showMembers && view === 'server'); }
function renderBanner() {
  const b = $('#banner'), st = Store.syncState(), acc = Store.account();
  b.replaceChildren();
  if (acc) {
    const when = st.lastSync ? 'synced ' + new Date(st.lastSync).toLocaleTimeString() : 'syncing…';
    b.append(st.error ? `Sync trouble: ${st.error}` : `Synced with GitHub as ${acc.login} — ${when}`);
  } else b.append('Saving in this browser only. Sign in with GitHub to share with your team.');
  b.onclick = () => openUserSettings(acc ? 'sync' : 'account');
}

// ---------- friends page ----------
function friendsPage() {
  const wrap = el('div', { className: 'friends' });
  const tabs = el('div', { className: 'ftabs' }, ...[['online', 'Online'], ['all', 'All'], ['add', 'Add Friend']].map(([id, label]) =>
    el('button', { className: 'ftab' + (friendsTab === id ? ' on' : '') + (id === 'add' ? ' add' : ''), onclick: () => { friendsTab = id; renderContent(); } }, label)));
  wrap.append(tabs);
  const body = el('div', { className: 'fbody' });
  if (friendsTab === 'add') {
    const inp = el('input', { placeholder: 'Enter a username to add' });
    const add = () => { const u = inp.value.trim(); if (!u) return; Store.addFriend({ id: 'u_' + u.toLowerCase(), name: u, color: COLORS[Math.floor(Math.random() * COLORS.length)], status: 'offline' }); inp.value = ''; toast(`Added ${u} locally. Real friend requests come with accounts.`); friendsTab = 'all'; renderContent(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    body.append(el('h4', {}, 'Add Friend'), el('div', { style: 'color:var(--muted);margin-bottom:4px' }, 'You can add anyone by their username. (For now this is local — friend requests sync once accounts land.)'), el('div', { className: 'add-form' }, inp, el('button', { className: 'btn primary', onclick: add }, 'Send Request')));
  } else {
    let list = Store.friends();
    if (friendsTab === 'online') list = list.filter((f) => f.status && f.status !== 'offline' && f.status !== 'invisible');
    if (!list.length) body.append(el('div', { className: 'empty-note' }, friendsTab === 'online' ? 'No friends online right now.' : 'No friends yet — add someone from the Add Friend tab.'));
    else { body.append(el('h4', {}, `${friendsTab === 'online' ? 'Online' : 'All Friends'} — ${list.length}`));
      for (const f of list) {
        const msg = el('button', { title: 'Message', onclick: () => { const id = Store.ensureDM(f); view = 'home'; dmId = id; renderAll(); } }, icon('message', 18));
        const rm = el('button', { title: 'Remove friend', onclick: () => { if (confirm(`Remove ${f.name}?`)) { Store.removeFriend(f.id); renderContent(); } } }, icon('x', 18));
        body.append(el('div', { className: 'frow' }, avatarEl(f, { size: 40 }), el('div', {}, el('div', { className: 'nm' }, f.name), el('div', { className: 'st2' }, f.bot ? 'Bot' : (f.status === 'offline' ? 'Offline' : 'Online'))), el('div', { className: 'acts' }, msg, rm)));
      }
    }
  }
  wrap.append(body);
  return wrap;
}

// ---------- popouts ----------
let pop = null;
const closePop = () => { if (pop) { pop.remove(); pop = null; } };
function placePop(anchor, h) { const r = anchor.getBoundingClientRect(), w = pop.offsetWidth || 300; pop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px'; pop.style.top = (r.bottom + (h || pop.offsetHeight) + 8 > innerHeight ? Math.max(12, r.top - (h || pop.offsetHeight) - 8) : r.bottom + 8) + 'px'; }
function showProfile(user, anchor) {
  closePop();
  const mine = user.me || user.name === me.name;
  const actions = el('div', { className: 'card' });
  if (mine) actions.append(el('button', { onclick: () => { closePop(); openUserSettings('profile'); } }, icon('edit'), 'Edit Profile'));
  else {
    actions.append(el('button', { onclick: () => { const id = Store.ensureDM(normFriend(user)); view = 'home'; dmId = id; closePop(); renderAll(); } }, icon('message'), 'Message'));
    if (!Store.friends().some((f) => f.id === (user.id || 'u_' + user.name.toLowerCase())) && !user.bot) actions.append(el('hr'), el('button', { onclick: () => { Store.addFriend(normFriend(user)); closePop(); toast(`Added ${user.name} locally.`); } }, icon('personAdd'), 'Add Friend'));
  }
  pop = el('div', { className: 'pop' },
    el('div', { className: 'banner-c', style: `background:${user.color || '#5b7fd6'}` }),
    el('div', { className: 'inner' }, avatarEl(user, { size: 74 }),
      el('div', { className: 'pn' }, user.name, user.bot ? el('span', { className: 'tag' }, 'bot') : null),
      user.pronouns ? el('div', { className: 'pr' }, user.pronouns) : null,
      user.about ? el('div', { className: 'ab' }, user.about) : null, actions));
  document.body.append(pop); placePop(anchor);
}
const normFriend = (u) => ({ id: u.id || 'u_' + String(u.name).toLowerCase(), name: u.name, color: u.color, avatar: u.avatar, bot: u.bot, status: u.status || 'offline' });

// your own account popout (click your avatar in the user panel)
function showAccount(anchor) {
  closePop();
  const row = (ic, label, extra, onclick) => el('button', { onclick }, icon(ic), el('span', {}, label), extra || null);
  const card = el('div', { className: 'card' },
    row('edit', 'Edit Profile', null, () => { closePop(); openUserSettings('profile'); }),
    el('hr'), row('dot', 'Set Status', el('span', { className: 'chev' }, icon('chevR', 16)), (e) => { e.stopPropagation(); statusMenu(); }),
    el('hr'), row('palette', 'Themes', el('span', { className: 'chev' }, icon('chevR', 16)), () => { closePop(); openThemes(); }),
    el('hr'), row('id', 'Copy User ID', null, () => { navigator.clipboard?.writeText(me.id).then(() => toast('User ID copied.'), () => toast(me.id)); }));
  pop = el('div', { className: 'pop' },
    el('div', { className: 'banner-c', style: `background:${me.color}` }),
    el('div', { className: 'inner' }, avatarEl(asMember(), { size: 74 }),
      el('div', { className: 'pn' }, me.name), el('div', { className: 'pr' }, me.pronouns || (STATUSES.find((s) => s[0] === me.status) || [, 'Online'])[1]),
      me.about ? el('div', { className: 'ab' }, me.about) : null, card));
  document.body.append(pop); placePop(anchor);
}
function statusMenu() {
  const inner = pop.querySelector('.inner'), card = inner.querySelector('.card');
  card.replaceChildren(...STATUSES.map(([id, label]) => el('button', { onclick: () => { me.status = id; saveMe(); renderMe(); renderMembers(); closePop(); } }, el('span', { className: 'dot ' + id, style: 'position:static;border:none;width:12px;height:12px' }), el('span', {}, label), me.status === id ? el('span', { className: 'chev' }, icon('check', 16)) : null)));
}

// ---------- sending, commands, bot ----------
function target() { return view === 'home' ? { send: (m) => Store.sendDM(dmId, m), bot: (Store.dmUser(dmId) || {}).bot } : { send: (m) => Store.send(channelId, m), bot: false }; }
const postMine = (extra) => target().send({ user: stamp(), ...extra });
function send() {
  const inp = $('#input'), raw = inp.value.trim(); if (!raw) return;
  inp.value = ''; inp.style.height = 'auto';
  if (raw.startsWith('/') && view === 'server') return runCommand(raw.slice(1));
  postMine({ text: raw });
  if (view === 'server') botReplies(raw); else if (target().bot) dmBot(raw);
}
const botSay = (text) => view === 'home' ? Store.sendDM(dmId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text }) : Store.send(channelId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text });
function runCommand(line) {
  const [cmd, ...rest] = line.split(' '); const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case 'help': return botSay('Commands: `/me <action>`, `/shrug`, `/roll [n]`, `/flip`, `/nick <name>`, `/theme <name>`, `/clear`. Try `!ping` too.');
    case 'me': return arg ? postMine({ text: arg, action: true }) : null;
    case 'shrug': return postMine({ text: (arg ? arg + ' ' : '') + '¯\\\\\\_(ツ)\\_/¯' });
    case 'roll': { const n = Math.max(2, parseInt(arg, 10) || 6); return botSay(`🎲 **${me.name}** rolled a **${1 + Math.floor(Math.random() * n)}** (1–${n}).`); }
    case 'flip': return botSay(`🪙 **${me.name}** got **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**.`);
    case 'nick': if (arg) { me.name = arg.slice(0, 24); saveMe(); renderAll(); botSay(`You're now **${me.name}**.`); } return;
    case 'theme': { const all = [...BUILTIN, ...loadThemes().map((t) => [t.id, t.name])], t = all.find((x) => x[1].toLowerCase() === arg.toLowerCase() || x[0] === arg.toLowerCase()); if (t) { applyTheme(t[0]); botSay(`Theme set to **${t[1]}**.`); } else botSay('Themes: ' + all.map((x) => '`' + x[1] + '`').join(', ') + '. Make your own in Themes.'); return; }
    case 'clear': return Store.clear(channelId);
    default: return botSay(`I don't know \`/${cmd}\`. Try \`/help\`.`);
  }
}
function botReplies(text) { const t = text.toLowerCase(); if (t === '!ping') return setTimeout(() => botSay('pong 🏓'), 250); if (t === '!help') return setTimeout(() => botSay('I auto-reply to `!ping`. Slash commands like `/roll` work too.'), 250); if (/\b(hi|hello|hey)\b/.test(t) && Math.random() < 0.34) return setTimeout(() => botSay(`👋 Hey ${me.name}!`), 400); }
function dmBot(text) { const id = dmId; setTimeout(() => { if (dmId === id || true) Store.sendDM(id, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text: /\?$/.test(text) ? 'Good question — once accounts are in, you can ask real teammates here too.' : 'Got it 👍' }); }, 500); }

// ---------- stickers ----------
const STICKERS = ['🤖', '🎉', '🔥', '👍', '😂', '❤️', '🚀', '💯', '🙏', '👀', '✅', '⚡'];
const EMOJI = '😀 😁 😂 🤣 😊 😍 😎 🤔 😴 😭 😤 🥳 🤝 👏 🙌 💪 🧠 👀 ✅ ❌ ⭐ 🔥 💡 ⚙️ 🔧 🔩 🛠️ 🤖 🚀 🎯 📸 🎮'.split(' ');
let picker = null;
const closePicker = () => { if (picker) { picker.remove(); picker = null; } };
function togglePicker() {
  if (picker) return closePicker();
  const custom = Store.stickers();
  const mk = el('button', { className: 'mk', onclick: createSticker }, icon('plus'), 'Create');
  picker = el('div', { className: 'picker' },
    el('div', { className: 'hdr' }, el('h4', {}, 'Your stickers'), mk),
    custom.length ? el('div', { className: 'set big' }, ...custom.map((s) => { const b = el('button', { title: s.name || 'sticker', oncontextmenu: (e) => { e.preventDefault(); if (confirm('Delete this sticker?')) { Store.removeSticker(s.id); closePicker(); setTimeout(togglePicker, 0); } }, onclick: () => { postMine({ sticker: { kind: s.kind, data: s.data } }); closePicker(); } }); b.append(s.kind === 'img' ? el('img', { src: s.data, alt: s.name || '' }) : document.createTextNode(s.data)); return b; })) : el('div', { className: 'empty' }, 'None yet — tap Create (right-click one to delete).'),
    el('div', { className: 'hdr' }, el('h4', {}, 'Stickers')), el('div', { className: 'set big' }, ...STICKERS.map((s) => el('button', { onclick: () => { postMine({ sticker: { kind: 'emoji', data: s } }); closePicker(); } }, s))),
    el('div', { className: 'hdr' }, el('h4', {}, 'Emoji')), el('div', { className: 'set' }, ...EMOJI.map((e) => el('button', { onclick: () => { const i = $('#input'); i.value += e; i.focus(); } }, e))));
  document.body.append(picker);
}
function createSticker() {
  closePicker();
  const emoji = el('input', { placeholder: 'An emoji or short text, e.g. 🤖 or GG', maxLength: 12 }), name = el('input', { placeholder: 'Name (optional)', maxLength: 24 });
  let imgData = '';
  const preview = el('div', { className: 'avatar', style: 'width:72px;height:72px;border-radius:14px;background:var(--input);font-size:2rem' }, el('div', { className: 'fill', style: 'background:var(--input)' }, '🙂'));
  const up = el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { imgData = scaled(await readImage(f), 160); preview.replaceChildren(el('img', { src: imgData, alt: '', style: 'width:100%;height:100%;object-fit:contain' })); emoji.value = ''; } catch { toast('Couldn’t read that image.'); } }) }, 'Upload image…');
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog' },
    el('h3', {}, 'Create a sticker'),
    el('div', { className: 'avatar-edit' }, preview, el('div', {}, up, el('div', { style: 'color:var(--muted);font-size:.8rem;margin-top:8px' }, 'or type an emoji / short text below'))),
    el('div', { className: 'field', style: 'margin-top:16px' }, el('label', {}, 'Emoji or text'), emoji),
    el('div', { className: 'field' }, el('label', {}, 'Name'), name),
    el('div', { className: 'row' }, el('button', { className: 'btn', textContent: 'Cancel', onclick: () => scrim.remove() }),
      el('button', { className: 'btn primary', textContent: 'Save sticker', onclick: () => { if (imgData) Store.addSticker({ kind: 'img', data: imgData, name: name.value.trim() }); else if (emoji.value.trim()) Store.addSticker({ kind: 'emoji', data: emoji.value.trim(), name: name.value.trim() }); else return toast('Add an image or some text first.'); scrim.remove(); setTimeout(togglePicker, 0); } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim);
}

// ---------- calls ----------
let stream = null, micOn = true, camOn = true;
async function startCall(video) {
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video }); } catch { toast('Couldn’t reach your camera or mic. Check the browser’s permission for this site.'); return; }
  camOn = video; micOn = true; $('#call').classList.add('on');
  const v = el('video', { autoplay: true, muted: true, playsInline: true }); v.srcObject = stream;
  $('#call-videos').replaceChildren(el('div', { className: 'tile' }, v, el('span', {}, me.name + ' (you)')));
  $('#c-cam').hidden = !video; syncCallButtons();
}
function syncCallButtons() { $('#c-mic').replaceChildren(icon(micOn ? 'mic' : 'micOff')); $('#c-mic').classList.toggle('off', !micOn); $('#c-cam').replaceChildren(icon(camOn ? 'cam' : 'camOff')); $('#c-cam').classList.toggle('off', !camOn); $('#c-leave').replaceChildren(icon('hangup')); }
function closeCall() { if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; } $('#call').classList.remove('on'); $('#call-videos').replaceChildren(); }

// ---------- settings (profile editor) ----------
function openSettings() {
  const name = el('input', { value: me.name, maxLength: 24 }), pronouns = el('input', { value: me.pronouns || '', maxLength: 24, placeholder: 'e.g. she/her, they/them' }), about = el('textarea', { value: me.about || '', maxLength: 300, placeholder: 'A little about you' });
  let color = me.color, avatar = me.avatar || '';
  const preview = avatarEl({ name: me.name, color, avatar });
  const setAvatar = (data) => { avatar = data; const f = preview.querySelector('.fill'); f.style.background = color; f.replaceChildren(data ? el('img', { src: data, alt: '' }) : document.createTextNode(initials(name.value))); };
  const upload = el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { setAvatar(scaled(await readImage(f), 128)); } catch { toast('Couldn’t read that image.'); } }) }, 'Upload…');
  const clearImg = el('button', { className: 'btn ghost', onclick: () => setAvatar('') }, 'Use colour');
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => { const b = el('button', { className: c === color ? 'on' : '', style: `background:${c}` }); b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); preview.querySelector('.fill').style.background = c; }; return b; }));
  name.oninput = () => { if (!avatar) preview.querySelector('.fill').textContent = initials(name.value); };
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog' },
    el('h3', {}, 'Your profile'),
    el('div', { className: 'field' }, el('label', {}, 'Avatar'), el('div', { className: 'avatar-edit' }, preview, el('div', {}, upload, ' ', clearImg, el('div', { style: 'margin-top:10px' }, swatches)))),
    el('div', { className: 'field' }, el('label', {}, 'Display name'), name),
    el('div', { className: 'field' }, el('label', {}, 'Pronouns'), pronouns),
    el('div', { className: 'field' }, el('label', {}, 'About me'), about),
    el('div', { className: 'row' }, el('button', { className: 'btn ghost', textContent: 'Themes…', onclick: () => { scrim.remove(); openThemes(); } }, ), el('span', { style: 'flex:1' }), el('button', { className: 'btn', textContent: 'Close', onclick: () => scrim.remove() }),
      el('button', { className: 'btn primary', textContent: 'Save', onclick: () => { me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color, avatar, pronouns: pronouns.value.trim(), about: about.value.trim() }; saveMe(); renderAll(); scrim.remove(); } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim); name.focus(); name.select();
}

// ---------- theme editor (your own CSS themes) ----------
function openThemes() {
  const list = el('div', {});
  const draw = () => {
    const cur = currentTheme();
    const line = (id, label, swatchBg, custom) => { const b = el('button', { className: 'ftab' + (cur === id ? ' on' : ''), style: 'flex:1;justify-content:flex-start', onclick: () => { applyTheme(id); renderAll(); draw(); } }, el('span', { className: 'swatch-dot', style: `background:${swatchBg}` }), label); const wrap = el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px' }, b); if (custom) { wrap.append(el('button', { className: 'btn', onclick: () => editTheme(id) }, 'Edit'), el('button', { className: 'btn danger', onclick: () => { if (confirm('Delete this theme?')) { const left = loadThemes().filter((t) => t.id !== id); saveThemes(left); if (cur === id) applyTheme('dark'); renderAll(); draw(); } } }, 'Delete')); } return wrap; };
    list.replaceChildren(
      el('h4', { style: 'color:var(--muted);font-size:.72rem;text-transform:uppercase;margin:0 0 8px' }, 'Built-in'),
      ...BUILTIN.map(([id, label]) => line(id, label, '', false)),
      el('h4', { style: 'color:var(--muted);font-size:.72rem;text-transform:uppercase;margin:16px 0 8px' }, 'Your themes'),
      ...(loadThemes().length ? loadThemes().map((t) => line(t.id, t.name, t.vars.accent || '#5b7fd6', true)) : [el('div', { style: 'color:var(--muted);font-size:.85rem' }, 'None yet — make one below.')]));
  };
  draw();
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog' },
    el('h3', {}, 'Themes'), list,
    el('div', { className: 'row' }, el('button', { className: 'btn', textContent: 'Close', onclick: () => scrim.remove() }), el('button', { className: 'btn primary', textContent: 'New theme', onclick: () => { scrim.remove(); editTheme(null); } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim);
}
function editTheme(id) {
  const existing = id ? loadThemes().find((t) => t.id === id) : null;
  const base = {}; VARS.forEach((v) => { base[v] = (existing && existing.vars[v]) || cssVar(v) || '#222222'; });
  const name = el('input', { value: existing ? existing.name : 'My Theme', maxLength: 30 });
  const inputs = {};
  const grid = el('div', { className: 'vars-grid' }, ...VARS.map((v) => { const c = el('input', { type: 'color', value: toHex(base[v]) }); inputs[v] = c; c.oninput = live; return el('div', { className: 'var-row' }, c, el('label', {}, v)); }));
  const css = el('textarea', { className: 'code', placeholder: '/* optional extra CSS, e.g. .msg .text { font-style: italic } */', value: existing ? existing.css || '' : '' }); css.oninput = live;
  function vals() { const vars = {}; VARS.forEach((v) => vars[v] = inputs[v].value); return vars; }
  function live() { const tmp = { id: '__preview', vars: vals(), css: css.value }; VARS.forEach((v) => document.documentElement.style.setProperty('--' + v, tmp.vars[v])); const s = document.getElementById('fluency-custom-css'); if (s) s.remove(); if (css.value) document.head.append(el('style', { id: 'fluency-custom-css', textContent: css.value })); }
  live();
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog wide' },
    el('h3', {}, existing ? 'Edit theme' : 'New theme'),
    el('div', { className: 'field' }, el('label', {}, 'Name'), name),
    el('div', { className: 'field' }, el('label', {}, 'Colours'), grid),
    el('div', { className: 'field' }, el('label', {}, 'Advanced CSS (optional)'), css),
    el('div', { className: 'row' },
      el('button', { className: 'btn', textContent: 'Cancel', onclick: () => { applyTheme(currentTheme()); scrim.remove(); } }),
      el('button', { className: 'btn primary', textContent: 'Save & apply', onclick: () => {
        const themes = loadThemes(); const tid = id || 'custom_' + Math.random().toString(36).slice(2, 8);
        const t = { id: tid, name: name.value.trim() || 'My Theme', vars: vals(), css: css.value };
        const i = themes.findIndex((x) => x.id === tid); if (i >= 0) themes[i] = t; else themes.push(t);
        saveThemes(themes); applyTheme(tid); renderAll(); scrim.remove();
      } }))));
  scrim.onclick = (e) => { if (e.target === scrim) { applyTheme(currentTheme()); scrim.remove(); } };
  document.body.append(scrim); name.focus();
}
function toHex(c) { c = String(c).trim(); if (/^#[0-9a-f]{6}$/i.test(c)) return c; if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join(''); const m = c.match(/\d+/g); if (m && m.length >= 3) return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join(''); return '#222222'; }

// ---------- create server / channel ----------
function createServer() { const n = prompt('Server name'); if (!n) return; view = 'server'; serverId = Store.addServer(n, ''); channelId = firstChannel(serverId); renderAll(); }
function newChannel(categoryId) { const n = prompt('New channel name'); if (!n) return; channelId = Store.addChannel(serverId, categoryId, n); renderAll(); }
function serverMenu(anchor) {
  closePop();
  pop = el('div', { className: 'pop', style: 'width:220px' }, el('div', { className: 'card', style: 'margin:0' },
    el('button', { onclick: () => { closePop(); openServerSettings(serverId); } }, icon('gear'), 'Server Settings'),
    el('hr'),
    el('button', { onclick: () => { closePop(); const n = prompt('New channel name'); if (n) { channelId = Store.addChannel(serverId, Store.categories(serverId)[0]?.id, n); renderAll(); } } }, icon('plus'), 'Create Channel'),
    el('hr'), el('button', { onclick: () => { closePop(); const n = prompt('New category name'); if (n) { Store.addCategory(serverId, n); renderAll(); } } }, icon('plus'), 'Create Category')));
  document.body.append(pop); placePop(anchor);
}

let toastT = 0;
function toast(text) { let t = $('#toast'); if (!t) { t = el('div', { id: 'toast' }); Object.assign(t.style, { position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)', background: 'var(--rail)', color: 'var(--text)', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 10px 30px #0007', zIndex: 70, maxWidth: '90%', textAlign: 'center' }); document.body.append(t); } t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3400); }

// ---------- wiring ----------
$('#sticker-btn').append(icon('smile')); $('#send-btn').append(icon('send'));
const input = $('#input');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(innerHeight * 0.4, input.scrollHeight) + 'px'; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && prefs.sendOnEnter) { e.preventDefault(); send(); } });
$('#send-btn').onclick = () => { send(); input.focus(); };
$('#sticker-btn').onclick = (e) => { e.stopPropagation(); togglePicker(); };
document.addEventListener('click', (e) => { if (picker && !picker.contains(e.target) && !$('#sticker-btn').contains(e.target)) closePicker(); if (pop && !pop.contains(e.target) && !e.target.closest('.msg .nm, .msg .avatar, #me-panel .avatar, .mem, .side-head')) closePop(); });
$('#c-mic').onclick = () => { if (!stream) return; micOn = !micOn; stream.getAudioTracks().forEach((t) => { t.enabled = micOn; }); syncCallButtons(); };
$('#c-cam').onclick = () => { if (!stream) return; camOn = !camOn; stream.getVideoTracks().forEach((t) => { t.enabled = camOn; }); syncCallButtons(); };
$('#c-leave').onclick = closeCall;
addEventListener('resize', closePop);

Store.onChange(() => { ensureSelection(); renderRail(); renderContent(); renderSide(); renderMembers(); if (picker) closePicker(); alertNew(); });

// a nudge when something new lands while you're looking elsewhere
let lastSeen = 0;
function alertNew() {
  const msgs = view === 'home' && dmId ? Store.dm(dmId) : (view === 'server' && channelId ? Store.messages(channelId) : []);
  const latest = msgs.length ? msgs[msgs.length - 1] : null;
  if (!latest || latest.ts <= lastSeen) { if (latest) lastSeen = Math.max(lastSeen, latest.ts); return; }
  const mine = latest.user && (latest.user.login ? latest.user.login === (Store.account() || {}).login : latest.user.name === me.name);
  lastSeen = latest.ts;
  if (mine || !document.hidden) return;
  if (prefs.notify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(latest.user.name + ' in Fluentdat', { body: (latest.text || 'sent a sticker').slice(0, 120) }); } catch {}
  }
  if (prefs.sound) blip();
}
function blip() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = new C(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 660; g.gain.value = 0.04;
    o.connect(g); g.connect(ctx.destination); o.start();
    o.stop(ctx.currentTime + 0.09);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}
Store.init();
renderAll();

// ===================== preferences =====================
function loadPrefs() { try { return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem('fluentdat.prefs')) || {}) }; } catch { return { ...DEFAULT_PREFS }; } }
function savePrefs() { try { localStorage.setItem('fluentdat.prefs', JSON.stringify(prefs)); } catch {} applyPrefs(); }
function applyPrefs() {
  const d = document.documentElement, S = (k, v) => d.setAttribute('data-' + k, v);
  S('density', prefs.density);
  S('motion', prefs.reduceMotion ? 'off' : 'on');
  S('contrast', prefs.highContrast ? 'high' : 'normal');
  for (const [attr, val] of [['rail', prefs.rail], ['railsize', prefs.railSize], ['iconshape', prefs.iconShape], ['sidew', prefs.sideW],
    ['chanicons', prefs.chanIcons], ['cats', prefs.cats], ['sidehead', prefs.sideHead], ['userpanel', prefs.userPanel],
    ['topbar', prefs.topbar], ['callbtns', prefs.callBtns], ['banner', prefs.banner], ['avatars', prefs.avatars],
    ['avatarshape', prefs.avatarShape], ['dividers', prefs.dividers], ['memberw', prefs.memberW], ['hover', prefs.hover],
    ['composer-sticker', prefs.composerSticker], ['composer-send', prefs.composerSend], ['radius', prefs.radius], ['uifont', prefs.uiFont]]) S(attr, val);
  S('timestamps', prefs.timestamps === 'off' ? 'off' : 'on');
  d.style.setProperty('--avatar', { s: '28px', m: '36px', l: '44px' }[prefs.avatarSize] || '36px');
  d.style.setProperty('--msg-max', prefs.msgWidth === 'readable' ? '860px' : 'none');
  document.body.style.fontSize = Math.max(12, Math.min(20, prefs.fontSize)) + 'px';
}
// change one thing and redraw the parts that are drawn by hand
function setPref(key, value) { prefs[key] = value; savePrefs(); renderAll(); }
applyPrefs();
showMembers = prefs.membersDefault !== false;
renderAll();

// ===================== settings building blocks =====================
function sw(on, onchange) { const b = el('button', { className: 'sw' + (on ? ' on' : ''), role: 'switch' }); b.onclick = () => { const next = !b.classList.contains('on'); b.classList.toggle('on', next); onchange(next); }; return b; }
function row2(title, desc, control) { return el('div', { className: 'row2' }, el('div', { className: 'lbl' }, el('b', {}, title), desc ? el('span', {}, desc) : null), control || null); }
function sel(value, options, onchange) { const s = el('select'); for (const [v, label] of options) s.append(el('option', { value: v, textContent: label, selected: v === String(value) })); s.onchange = () => onchange(s.value); return s; }
function iconBtn(name, title, onclick, cls) { const b = el('button', { title, className: cls || '', onclick }); b.append(icon(name, 17)); return b; }

function overlay(navItems, firstSection, render) {
  let section = firstSection, navQuery = '';
  const nav = el('div', { className: 'sx-nav' }), body = el('div', { className: 'sx-body' });
  const panel = el('div', { className: 'sx', role: 'dialog' }, nav, body);
  const close = el('button', { className: 'sx-close', title: 'Close (Esc)', onclick: () => shut() }); close.append(icon('x', 18));
  panel.append(close);
  const box = el('div', { className: 'sx-backdrop' }, panel);
  // (only a click that starts AND ends outside closes it, so dragging a slider out of the window doesn't)
  let downOutside = false;
  box.addEventListener('mousedown', (e) => { downOutside = e.target === box; });
  box.addEventListener('click', (e) => { if (downOutside && e.target === box) shut(); });
  function shut() { box.remove(); document.removeEventListener('keydown', esc); renderAll(); }
  const esc = (e) => { if (e.key === 'Escape') shut(); };
  document.addEventListener('keydown', esc);
  function draw() {
    nav.replaceChildren();
    for (const item of navItems) {
      if (item.head) { nav.append(el('h4', {}, typeof item.head === 'function' ? item.head() : item.head)); continue; }
      if (item.hr) { nav.append(el('hr')); continue; }
      if (item.profile) {
        const edit = el('span', { className: 'sx-edit', onclick: () => { section = 'profile'; draw(); } }, 'Edit Profile', icon('edit', 13));
        nav.append(el('div', { className: 'sx-me' }, avatarEl(asMember(), { size: 42 }), el('div', { className: 'who' }, el('b', {}, me.name), edit)));
        continue;
      }
      if (item.search) {
        const q = el('input', { type: 'text', placeholder: 'Search settings', value: navQuery,
          style: 'width:100%;background:var(--input);border:1px solid var(--line);border-radius:8px;padding:7px 10px;color:var(--text);font:inherit;margin-bottom:6px' });
        q.oninput = () => { navQuery = q.value.toLowerCase(); for (const b of nav.querySelectorAll('button')) b.hidden = !!navQuery && !b.textContent.toLowerCase().includes(navQuery); q.focus(); };
        nav.append(q); continue;
      }
      const b = el('button', { className: (item.id === section ? 'on ' : '') + (item.cls || ''), onclick: () => { if (item.action) return item.action(shut); section = item.id; draw(); } });
      if (item.icon) b.append(icon(item.icon, 17));
      b.append(el('span', {}, item.label));
      nav.append(b);
    }
    body.replaceChildren(el('div', { className: 'sx-inner' }, ...[render(section, draw, shut)].flat().filter(Boolean)));
  }
  draw();
  document.body.append(box);
  return { shut, go: (s) => { section = s; draw(); } };
}

// ===================== signing in to GitHub =====================
function signInDialog(after) {
  const tok = el('input', { type: 'password', placeholder: 'github_pat_...', style: 'width:100%;background:var(--input);border:1px solid var(--line);border-radius:9px;padding:10px 12px;color:var(--text);font:inherit' });
  const msg = el('div', { style: 'color:#e5534b;font-size:.85rem;min-height:1.2em;margin-top:8px' });
  const go = el('button', { className: 'btn primary', textContent: 'Sign in' });
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog' },
    el('h3', {}, 'Sign in with GitHub'),
    el('div', { className: 'note-box' },
      el('div', {}, 'Fluentdat keeps your team’s messages in the private ', el('b', {}, 'Fluentdat-Data'), ' repository. It needs a fine grained token so it can read and write there. The token stays in this browser only.'),
      el('ol', {},
        el('li', {}, 'On GitHub: Settings → Developer settings → Personal access tokens → ', el('b', {}, 'Fine-grained tokens'), ' → Generate new token'),
        el('li', {}, 'Repository access: ', el('b', {}, 'Only select repositories'), ' → Fluentdat-Data'),
        el('li', {}, 'Permissions → Repository permissions → ', el('b', {}, 'Contents: Read and write')),
        el('li', {}, 'Generate it, copy the token, and paste it below'))),
    el('div', { className: 'field', style: 'margin-top:16px' }, el('label', {}, 'Token'), tok), msg,
    el('div', { className: 'row' }, el('button', { className: 'btn', textContent: 'Cancel', onclick: () => scrim.remove() }), go)));
  go.onclick = async () => {
    const t = tok.value.trim(); if (!t) return;
    go.textContent = 'Checking…'; go.disabled = true; msg.textContent = '';
    try { const r = await Store.signIn(t); adoptProfile(); scrim.remove(); toast(`Signed in as ${r.login}. Your team’s data is syncing.`); renderAll(); after && after(); }
    catch (e) { msg.textContent = String(e.message || e); go.textContent = 'Sign in'; go.disabled = false; }
  };
  tok.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim); tok.focus();
}
// on signing in: take the profile that's already on GitHub, or put this browser's up there
function adoptProfile() {
  if (!Store.signedIn) return;
  const p = Store.myProfile();
  if (p && p.name) { me = { ...me, ...p }; saveMe(); }
  else Store.setProfile({ name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status });
}
const pushProfile = () => { if (Store.signedIn) Store.setProfile({ name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status }); };

// ===================== user settings =====================
function openUserSettings(section = 'account') {
  const nav = [
    { profile: true },
    { search: true },
    { head: 'User Settings' },
    { id: 'account', label: 'My Account', icon: 'user' },
    { id: 'profile', label: 'Profile', icon: 'edit' },
    { id: 'sync', label: 'Data & Sync', icon: 'cloud' },
    { hr: true }, { head: 'App Settings' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'layout', label: 'Layout', icon: 'layout' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'privacy', label: 'Privacy & Safety', icon: 'shield' },
    { id: 'accessibility', label: 'Accessibility', icon: 'eye' },
    { id: 'keys', label: 'Keyboard Shortcuts', icon: 'keyboard' },
    { hr: true },
    { id: 'about', label: 'About', icon: 'info' },
    { id: 'signout', label: Store.signedIn ? 'Sign Out' : 'Reset Local Data', cls: 'danger', icon: 'logout', action: (shut) => {
        if (Store.signedIn) { if (confirm('Sign out? Your team data stays on GitHub; this browser goes back to local only.')) { Store.signOut(); shut(); toast('Signed out.'); } }
        else if (confirm('Clear everything stored in this browser (servers, messages, stickers)?')) { Store.reset(); shut(); toast('Local data cleared.'); }
      } },
  ];
  openUserSettings.ref = overlay(nav, section, (sec, redraw, shut) => {
    if (sec === 'account') return accountPane(redraw);
    if (sec === 'profile') return profilePane(redraw);
    if (sec === 'sync') return syncPane(redraw);
    if (sec === 'appearance') return appearancePane(redraw);
    if (sec === 'layout') return layoutPane(redraw);
    if (sec === 'notifications') return notificationsPane(redraw);
    if (sec === 'privacy') return privacyPane(redraw);
    if (sec === 'accessibility') return accessibilityPane(redraw);
    if (sec === 'keys') return keysPane();
    return aboutPane();
  });
}

function accountPane(redraw) {
  const acc = Store.account();
  const out = [el('h2', {}, 'My Account'), el('p', { className: 'sub' }, 'Who you are in Fluentdat, and where your data lives.')];
  out.push(el('div', { style: 'display:flex;align-items:center;gap:16px;padding:18px;background:var(--side);border-radius:12px;margin-bottom:12px' },
    avatarEl(asMember(), { size: 64 }),
    el('div', { style: 'flex:1;min-width:0' },
      el('div', { style: 'font-weight:700;color:var(--bright);font-size:1.15rem' }, me.name),
      el('div', { style: 'color:var(--muted);font-size:.86rem' }, acc ? '@' + acc.login + ' on GitHub' : 'Signed out — this browser only'),
      me.about ? el('div', { style: 'margin-top:6px;font-size:.88rem' }, me.about) : null),
    el('button', { className: 'btn', onclick: () => openUserSettings.ref.go('profile') }, 'Edit Profile')));
  out.push(el('h3', {}, 'Account'));
  out.push(row2('GitHub account', acc ? 'Signed in. Messages, profiles and DMs sync with your team.' : 'Sign in to share servers, messages and DMs with your team.',
    acc ? el('button', { className: 'btn', onclick: () => { if (confirm('Sign out of GitHub?')) { Store.signOut(); redraw(); renderAll(); } } }, 'Sign Out')
      : el('button', { className: 'btn primary', onclick: () => signInDialog(redraw) }, 'Sign in with GitHub')));
  out.push(row2('User ID', 'Handy when someone needs to add you.', el('button', { className: 'btn', onclick: () => { const v = acc ? acc.login : me.id; navigator.clipboard?.writeText(v).then(() => toast('Copied ' + v), () => toast(v)); } }, 'Copy')));
  out.push(row2('Status', 'How you show up to everyone else.', sel(me.status, STATUSES, (v) => { me.status = v; saveMe(); pushProfile(); renderAll(); })));
  return out;
}

function profilePane(redraw) {
  const name = el('input', { type: 'text', value: me.name, maxLength: 24 });
  const pron = el('input', { type: 'text', value: me.pronouns || '', maxLength: 24, placeholder: 'she/her, they/them…' });
  const about = el('textarea', { value: me.about || '', maxLength: 300, placeholder: 'A little about you', style: 'width:100%;background:var(--input);border:1px solid var(--line);border-radius:9px;padding:10px 12px;color:var(--text);font:inherit;min-height:80px;resize:vertical' });
  const preview = avatarEl({ name: me.name, color: me.color, avatar: me.avatar }, { size: 72 });
  let color = me.color, avatar = me.avatar || '';
  const setAv = (d) => { avatar = d; const f = preview.querySelector('.fill'); f.style.background = color; f.replaceChildren(d ? el('img', { src: d, alt: '' }) : document.createTextNode(initials(name.value))); };
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => { const b = el('button', { className: c === color ? 'on' : '', style: `background:${c}` }); b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); preview.querySelector('.fill').style.background = c; }; return b; }));
  const save = () => { me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color, avatar, pronouns: pron.value.trim(), about: about.value.trim() }; saveMe(); pushProfile(); renderAll(); toast('Profile saved.'); };
  return [el('h2', {}, 'Profile'), el('p', { className: 'sub' }, Store.signedIn ? 'This is what your teammates see.' : 'Saved in this browser. Sign in to share it with your team.'),
    el('h3', {}, 'Avatar'),
    el('div', { className: 'avatar-edit', style: 'padding:12px 0' }, preview, el('div', {},
      el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { setAv(scaled(await readImage(f), 128)); } catch { toast('Couldn’t read that image.'); } }) }, 'Upload…'), ' ',
      el('button', { className: 'btn ghost', onclick: () => setAv('') }, 'Use colour'),
      el('div', { style: 'margin-top:10px' }, swatches))),
    el('h3', {}, 'Details'),
    row2('Display name', 'Shown on every message you send.', name),
    row2('Pronouns', 'Appears under your name on your profile card.', pron),
    el('div', { style: 'padding:14px 0' }, el('div', { style: 'font-weight:600;color:var(--bright);margin-bottom:6px' }, 'About me'), about),
    el('div', { className: 'row' }, el('button', { className: 'btn primary', onclick: save }, 'Save Profile'))];
}

function syncPane(redraw) {
  const st = Store.syncState(), acc = Store.account();
  const out = [el('h2', {}, 'Data & Sync'), el('p', { className: 'sub' }, 'Where Fluentdat keeps your servers, messages and profile.')];
  out.push(row2('Storing in', acc ? st.repo + ' (private repository)' : 'This browser only (nothing leaves your device)',
    el('span', { className: 'chip ' + (acc ? 'good' : '') }, acc ? 'GitHub' : 'Local')));
  if (acc) {
    out.push(row2('Last synced', st.lastSync ? new Date(st.lastSync).toLocaleTimeString() : 'not yet', el('button', { className: 'btn', onclick: () => { Store.syncNow(); toast('Syncing…'); setTimeout(redraw, 900); } }, 'Sync Now')));
    if (st.error) out.push(el('div', { className: 'note-box', style: 'border:1px solid #e5534b;color:#e5534b;margin-top:10px' }, st.error));
    out.push(el('h3', {}, 'How it works'));
    out.push(el('div', { className: 'note-box' }, 'Every message is a commit in the private repository, written with your own token. Fluentdat checks for new messages every few seconds, so things land a second or two apart rather than instantly. Anyone you want in the team needs to be a collaborator on that repository and sign in with their own token.'));
  } else {
    out.push(el('div', { className: 'note-box', style: 'margin-top:10px' }, 'Right now everything is kept in this browser. Clearing site data would wipe it, and nobody else can see it. Sign in with GitHub to share with your team and keep a backup.'));
    out.push(el('div', { className: 'row' }, el('button', { className: 'btn primary', onclick: () => signInDialog(redraw) }, 'Sign in with GitHub')));
  }
  out.push(el('h3', {}, 'Your data'));
  out.push(row2('Export', 'Download everything this browser has as a JSON file.', el('button', { className: 'btn', onclick: () => {
    const blob = new Blob([Store.dump()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'fluentdat-data.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } }, 'Export JSON')));
  out.push(row2('Clear local data', 'Servers, messages and stickers stored in this browser.', el('button', { className: 'btn danger', onclick: () => { if (confirm('Clear everything stored in this browser?')) { Store.reset && Store.reset(); toast('Local data cleared.'); renderAll(); } } }, 'Clear')));
  return out;
}

function appearancePane(redraw) {
  const cur = currentTheme();
  const themeRow = el('div', { className: 'themes', style: 'flex-wrap:wrap' },
    ...BUILTIN.map(([id, label]) => el('button', { className: cur === id ? 'on' : '', onclick: () => { applyTheme(id); renderAll(); redraw(); } }, label)),
    ...loadThemes().map((t) => el('button', { className: cur === t.id ? 'on' : '', onclick: () => { applyTheme(t.id); renderAll(); redraw(); } }, el('span', { className: 'swatch-dot', style: `background:${t.vars.accent || '#5b7fd6'}` }), t.name)));
  return [el('h2', {}, 'Appearance'), el('p', { className: 'sub' }, 'Themes you can edit, and how messages are laid out.'),
    el('h3', {}, 'Theme'), el('div', { style: 'padding:10px 0' }, themeRow),
    el('div', { className: 'row', style: 'justify-content:flex-start' },
      el('button', { className: 'btn primary', onclick: () => editTheme(null) }, 'Make a Theme'),
      el('button', { className: 'btn', onclick: () => openThemes() }, 'Manage Themes…')),
    el('h3', {}, 'Messages'),
    row2('Display', 'Cozy gives each message room. Compact fits more on screen.', sel(prefs.density, [['cozy', 'Cozy'], ['compact', 'Compact']], (v) => { prefs.density = v; savePrefs(); })),
    row2('Text size', 'Everything in the app scales with this.', (() => { const r = el('input', { type: 'range', min: 12, max: 20, step: 1, value: prefs.fontSize }); r.oninput = () => { prefs.fontSize = +r.value; savePrefs(); }; return r; })())];
}

function notificationsPane(redraw) {
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  return [el('h2', {}, 'Notifications'), el('p', { className: 'sub' }, 'Get a nudge when a new message arrives while Fluentdat is in the background.'),
    el('h3', {}, 'Desktop notifications'),
    row2('Notify me about new messages', perm === 'denied' ? 'Blocked by the browser — allow notifications for this site in your browser settings.' : 'Only when the tab isn’t focused.',
      sw(prefs.notify && perm === 'granted', async (on) => {
        if (!on) { prefs.notify = false; savePrefs(); return; }
        if (typeof Notification === 'undefined') { toast('This browser has no notifications.'); return redraw(); }
        const p = await Notification.requestPermission();
        prefs.notify = p === 'granted'; savePrefs();
        if (p !== 'granted') toast('The browser didn’t allow notifications.');
        redraw();
      })),
    row2('Permission', 'What the browser currently allows.', el('span', { className: 'chip ' + (perm === 'granted' ? 'good' : perm === 'denied' ? 'bad' : '') }, perm)),
    el('h3', {}, 'Sounds'),
    row2('Message sound', 'A short blip for new messages. (Off by default so nothing surprises you.)', sw(!!prefs.sound, (on) => { prefs.sound = on; savePrefs(); }))];
}

function privacyPane() {
  return [el('h2', {}, 'Privacy & Safety'), el('p', { className: 'sub' }, 'What Fluentdat stores, and who can reach you.'),
    el('h3', {}, 'Direct messages'),
    row2('Who can DM me', 'Applies to new conversations started from your profile.', sel(prefs.dmFrom, [['anyone', 'Anyone'], ['friends', 'Friends only'], ['none', 'No one']], (v) => { prefs.dmFrom = v; savePrefs(); })),
    el('h3', {}, 'What Fluentdat knows'),
    el('div', { className: 'note-box' },
      el('div', {}, 'There is no Fluentdat server and no analytics. Nothing is tracked, and nothing is sent anywhere except:'),
      el('ol', {},
        el('li', {}, 'Signed out: everything stays in this browser.'),
        el('li', {}, 'Signed in: your messages and profile go to your own private GitHub repository, using your own token.'),
        el('li', {}, 'Your token is kept in this browser only and is never put in a message or committed.'))),
    el('h3', {}, 'Be aware'),
    el('div', { className: 'note-box' }, 'Anyone who can read the data repository can read every message in it, and git keeps history, so a deleted message still exists in earlier commits. Treat it like a shared notebook, not a secure vault.')];
}

function accessibilityPane() {
  return [el('h2', {}, 'Accessibility'), el('p', { className: 'sub' }, 'Make Fluentdat easier to read and use.'),
    row2('Reduce motion', 'Turns off animations and transitions throughout the app.', sw(prefs.reduceMotion, (on) => { prefs.reduceMotion = on; savePrefs(); })),
    row2('Higher contrast', 'Stronger text and outlines around channels.', sw(prefs.highContrast, (on) => { prefs.highContrast = on; savePrefs(); })),
    row2('Text size', 'The same control as in Appearance.', (() => { const r = el('input', { type: 'range', min: 12, max: 20, step: 1, value: prefs.fontSize }); r.oninput = () => { prefs.fontSize = +r.value; savePrefs(); }; return r; })()),
    row2('Enter sends the message', 'Off means Enter makes a new line, and you send with the button.', sw(prefs.sendOnEnter, (on) => { prefs.sendOnEnter = on; savePrefs(); }))];
}

function keysPane() {
  const keys = [['Enter', 'Send the message'], ['Shift + Enter', 'New line'], ['Esc', 'Close settings or a dialog'], ['/help', 'List the chat commands'], ['/roll, /flip', 'Dice and coin'], ['/me <action>', 'Write an action'], ['/nick <name>', 'Change your display name'], ['/theme <name>', 'Switch theme'], ['/clear', 'Empty the channel'], ['!ping', 'Flubot replies']];
  return [el('h2', {}, 'Keyboard Shortcuts'), el('p', { className: 'sub' }, 'And the commands you can type into any channel.'),
    el('div', { className: 'sx-list' }, ...keys.map(([k, what]) => el('div', { className: 'it' }, el('code', { style: 'background:var(--input);padding:3px 8px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:.85rem' }, k), el('span', { className: 'nm3', style: 'color:var(--muted)' }, what))))];
}

function aboutPane() {
  return [el('h2', {}, 'About Fluentdat'), el('p', { className: 'sub' }, 'A chat app built from scratch, running entirely in your browser.'),
    el('div', { className: 'note-box' },
      el('div', {}, el('b', {}, 'Fluentdat'), ' — servers, channels, DMs, friends, stickers and themes, with no backend server of its own. The app is a static site; your data is either in this browser or in your own private GitHub repository.'),
      el('ol', {}, el('li', {}, 'Built by TrixWotel'), el('li', {}, 'Map of the stack: static HTML, CSS and JavaScript modules — no framework, no build step'), el('li', {}, 'Data layer swaps between local storage and GitHub without the UI knowing'))),
    el('h3', {}, 'Storage in use'),
    row2('Backend', Store.backend, el('span', { className: 'chip ' + (Store.signedIn ? 'good' : '') }, Store.signedIn ? 'GitHub' : 'Local'))];
}

// ===================== server settings =====================
function openServerSettings(svId, section = 'overview') {
  const sv = Store.server(svId); if (!sv) return;
  const nav = [
    { head: () => (Store.server(svId) || sv).name },
    { id: 'overview', label: 'Overview', icon: 'gear' },
    { id: 'channels', label: 'Channels', icon: 'hash' },
    { id: 'categories', label: 'Categories', icon: 'menu' },
    { id: 'members', label: 'Members', icon: 'users' },
    { id: 'invite', label: 'Invite People', icon: 'personAdd' },
    { hr: true },
    { id: 'danger', label: 'Delete Server', cls: 'danger', icon: 'trash' },
  ];
  overlay(nav, section, (sec, redraw, shut) => {
    if (sec === 'overview') return svOverview(sv, redraw);
    if (sec === 'channels') return svChannels(sv, redraw);
    if (sec === 'categories') return svCategories(sv, redraw);
    if (sec === 'members') return svMembers(sv);
    if (sec === 'invite') return svInvite(sv);
    return svDanger(sv, shut);
  });
}

function svOverview(sv, redraw) {
  const name = el('input', { type: 'text', value: sv.name, maxLength: 40 });
  const preview = el('div', { className: 'srv', style: 'width:72px;height:72px;border-radius:22px' });
  const drawIcon = () => { preview.replaceChildren(); if (sv.img) preview.append(el('img', { src: sv.img, alt: '' })); else if (ICON[sv.icon]) preview.append(icon(sv.icon, 32)); else preview.textContent = initials(name.value); };
  drawIcon();
  return [el('h2', {}, 'Server Overview'), el('p', { className: 'sub' }, 'The name and icon everyone sees in the server list.'),
    el('h3', {}, 'Server icon'),
    el('div', { className: 'avatar-edit', style: 'padding:12px 0' }, preview, el('div', {},
      el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { Store.updateServer(sv.id, { img: scaled(await readImage(f), 128), icon: '' }); sv.img = Store.server(sv.id).img; drawIcon(); renderRail(); toast('Icon updated.'); } catch { toast('Couldn’t read that image.'); } }) }, 'Upload…'), ' ',
      el('button', { className: 'btn ghost', onclick: () => { Store.updateServer(sv.id, { img: '', icon: 'bot' }); sv.img = ''; sv.icon = 'bot'; drawIcon(); renderRail(); } }, 'Use the robot'), ' ',
      el('button', { className: 'btn ghost', onclick: () => { Store.updateServer(sv.id, { img: '', icon: '' }); sv.img = ''; sv.icon = ''; drawIcon(); renderRail(); } }, 'Use initials'))),
    el('h3', {}, 'Name'),
    row2('Server name', 'Shown at the top of the channel list.', name),
    el('div', { className: 'row' }, el('button', { className: 'btn primary', onclick: () => { const v = name.value.trim(); if (!v) return; Store.updateServer(sv.id, { name: v }); sv.name = v; renderAll(); toast('Server updated.'); redraw(); } }, 'Save')),
    el('h3', {}, 'Details'),
    row2('Channels', String(Store.channels(sv.id).length), null),
    row2('Categories', String(Store.categories(sv.id).length), null)];
}

function svChannels(sv, redraw) {
  const cats = Store.categories(sv.id);
  const list = el('div', { className: 'sx-list' });
  for (const c of Store.channels(sv.id)) {
    const row = el('div', { className: 'it' }, icon(c.kind === 'voice' ? 'volume' : 'hash', 17), el('span', { className: 'nm3' }, c.name),
      sel(c.category || '', cats.map((x) => [x.id, x.name]), (v) => { Store.updateChannel(c.id, { category: v }); renderAll(); }),
      sel(c.kind, [['text', 'Text'], ['voice', 'Voice']], (v) => { Store.updateChannel(c.id, { kind: v }); renderAll(); }),
      iconBtn('edit', 'Rename', () => { const n = prompt('New channel name', c.name); if (n && n.trim()) { Store.updateChannel(c.id, { name: n.trim().replace(/\s+/g, '-').toLowerCase() }); renderAll(); redraw(); } }),
      iconBtn('trash', 'Delete channel', () => { if (confirm(`Delete #${c.name} and its messages?`)) { Store.removeChannel(c.id); if (channelId === c.id) channelId = firstChannel(sv.id); renderAll(); redraw(); } }, 'del'));
    list.append(row);
  }
  return [el('h2', {}, 'Channels'), el('p', { className: 'sub' }, 'Rename channels, move them between categories, or switch text and voice.'),
    list,
    el('div', { className: 'row', style: 'justify-content:flex-start' },
      el('button', { className: 'btn primary', onclick: () => { const n = prompt('New channel name'); if (n && n.trim()) { Store.addChannel(sv.id, cats[0] && cats[0].id, n); renderAll(); redraw(); } } }, 'Create Channel'))];
}

function svCategories(sv, redraw) {
  const list = el('div', { className: 'sx-list' });
  for (const c of Store.categories(sv.id)) {
    const n = Store.channels(sv.id).filter((x) => x.category === c.id).length;
    list.append(el('div', { className: 'it' }, icon('menu', 17), el('span', { className: 'nm3' }, c.name), el('span', { style: 'color:var(--muted);font-size:.85rem' }, `${n} channel${n === 1 ? '' : 's'}`),
      iconBtn('edit', 'Rename', () => { const v = prompt('New category name', c.name); if (v && v.trim()) { Store.updateCategory(c.id, { name: v.trim() }); renderAll(); redraw(); } }),
      iconBtn('trash', 'Delete category and its channels', () => { if (confirm(`Delete “${c.name}” and its ${n} channel(s)?`)) { Store.removeCategory(c.id); channelId = firstChannel(sv.id); renderAll(); redraw(); } }, 'del')));
  }
  return [el('h2', {}, 'Categories'), el('p', { className: 'sub' }, 'Groups that channels sit under in the sidebar.'),
    list,
    el('div', { className: 'row', style: 'justify-content:flex-start' },
      el('button', { className: 'btn primary', onclick: () => { const n = prompt('New category name'); if (n && n.trim()) { Store.addCategory(sv.id, n); renderAll(); redraw(); } } }, 'Create Category'))];
}

function svMembers(sv) {
  const list = el('div', { className: 'sx-list' });
  for (const m of memberList()) {
    list.append(el('div', { className: 'it' }, avatarEl(m, { size: 32 }),
      el('span', { className: 'nm3' }, m.name, m.me ? el('span', { className: 'chip', style: 'margin-left:8px' }, 'you') : null),
      el('span', { style: 'color:var(--muted);font-size:.84rem' }, m.bot ? 'Bot' : (m.status && m.status !== 'offline' && m.status !== 'invisible' ? 'Online' : 'Offline'))));
  }
  return [el('h2', {}, 'Members'), el('p', { className: 'sub' }, Store.signedIn ? 'Everyone with a profile in the shared data repository.' : 'You and your friends in this browser. Sign in to see your real team.'), list];
}

function svInvite(sv) {
  return [el('h2', {}, 'Invite People'), el('p', { className: 'sub' }, 'How someone else joins ' + sv.name + '.'),
    Store.signedIn
      ? el('div', { className: 'note-box' },
        el('div', {}, 'Fluentdat has no invite links, because there is no server handing them out. Someone joins by being let into the data repository:'),
        el('ol', {},
          el('li', {}, 'On GitHub open ', el('b', {}, Store.syncState().repo), ' → Settings → Collaborators'),
          el('li', {}, 'Add their GitHub username and let them accept the invite'),
          el('li', {}, 'They open Fluentdat, make their own fine grained token for that repository with ', el('b', {}, 'Contents: Read and write'), ', and sign in'),
          el('li', {}, 'Their messages and profile then show up here')))
      : el('div', { className: 'note-box' }, 'You are not signed in, so this server only exists in your browser and nobody else can join it. Sign in with GitHub from User Settings first, then invite people to the data repository.'),
    el('h3', {}, 'A caution'),
    el('div', { className: 'note-box' }, 'Anyone you add can read everything in the repository, including old messages kept in the git history, and can write as themselves. Only add people you trust with all of it.')];
}

function svDanger(sv, shut) {
  return [el('h2', {}, 'Delete Server'), el('p', { className: 'sub' }, 'This removes the server, its categories, channels and messages.'),
    el('div', { className: 'note-box', style: 'border:1px solid #e5534b' }, 'There is no undo in the app. If you are signed in, the old contents stay in the git history of the data repository, but Fluentdat will not show them again.'),
    el('div', { className: 'row', style: 'justify-content:flex-start' },
      el('button', { className: 'btn danger', onclick: () => {
        if (Store.servers().length < 2) return toast('This is your only server — make another one first.');
        if (prompt(`Type the server name to delete it: ${sv.name}`) !== sv.name) return toast('Name did not match, nothing deleted.');
        Store.removeServer(sv.id); serverId = Store.servers()[0].id; channelId = firstChannel(serverId); shut(); toast('Server deleted.');
      } }, 'Delete ' + sv.name))];
}

// ===================== layout settings =====================
function layoutPane(redraw) {
  const P = (k, v) => () => { setPref(k, v); redraw(); };
  const pick = (key, options) => sel(prefs[key], options, (v) => { setPref(key, v); });
  const flip = (key) => sw(prefs[key] === 'on' || prefs[key] === true, (on) => { setPref(key, typeof prefs[key] === 'boolean' ? on : (on ? 'on' : 'off')); });
  const onoff = [['on', 'Shown'], ['off', 'Hidden']];
  return [
    el('h2', {}, 'Layout'), el('p', { className: 'sub' }, 'Rearrange Fluentdat. Everything here changes the app as soon as you touch it.'),

    el('h3', {}, 'Presets'),
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;padding:4px 0 12px' }, ...Object.keys(LAYOUT_PRESETS).map((name) =>
      el('button', { className: 'btn', onclick: () => { prefs = { ...prefs, ...DEFAULT_PREFS, ...LAYOUT_PRESETS[name] }; savePrefs(); showMembers = prefs.membersDefault !== false; renderAll(); redraw(); toast(name + ' layout applied.'); } }, name))),

    el('h3', {}, 'Server rail'),
    row2('Server rail', 'The strip of server icons down the left.', pick('rail', onoff)),
    row2('Icon size', 'How big those server icons are.', pick('railSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']])),
    row2('Icon shape', 'Squircle is the Discord look.', pick('iconShape', [['squircle', 'Squircle'], ['round', 'Circle'], ['square', 'Rounded square']])),

    el('h3', {}, 'Channel sidebar'),
    row2('Width', 'The channel list column.', pick('sideW', [['narrow', 'Narrow'], ['medium', 'Medium'], ['wide', 'Wide']])),
    row2('Server header', 'The server name and dropdown at the top.', pick('sideHead', onoff)),
    row2('Category headings', 'The TEXT CHANNELS / VOICE CHANNELS groupings.', pick('cats', onoff)),
    row2('Channel icons', 'The # and speaker marks beside each channel.', pick('chanIcons', onoff)),
    row2('User panel', 'You, your status and the settings cog at the bottom.', pick('userPanel', onoff)),

    el('h3', {}, 'Top bar'),
    row2('Top bar', 'The channel name strip above the messages.', pick('topbar', onoff)),
    row2('Call buttons', 'Voice and video buttons in the top bar.', pick('callBtns', onoff)),
    row2('Status banner', 'The sync line across the very top.', pick('banner', onoff)),

    el('h3', {}, 'Messages'),
    row2('Spacing', 'Cozy gives each message room, compact fits more in.', pick('density', [['cozy', 'Cozy'], ['compact', 'Compact']])),
    row2('Avatars', 'Profile pictures beside messages.', pick('avatars', onoff)),
    row2('Avatar size', 'Also changes the member list and DM list.', pick('avatarSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']])),
    row2('Avatar shape', '', pick('avatarShape', [['round', 'Circle'], ['squircle', 'Squircle'], ['square', 'Rounded square']])),
    row2('Timestamps', 'Beside the name on each message.', pick('timestamps', [['12', '1:30 PM'], ['24', '13:30'], ['rel', '5m ago'], ['off', 'Hidden']])),
    row2('Group messages', 'Several messages in a row from one person share a heading.', sw(prefs.group, (on) => setPref('group', on))),
    row2('Date dividers', 'The “Monday, October 19” lines.', pick('dividers', onoff)),
    row2('Reading width', 'Readable keeps long lines from stretching across a wide screen.', pick('msgWidth', [['full', 'Use the full width'], ['readable', 'Readable column']])),
    row2('Highlight on hover', 'The subtle background as your pointer passes a message.', pick('hover', onoff)),

    el('h3', {}, 'Member list'),
    row2('Show by default', 'Whether the member list is open when you arrive.', sw(prefs.membersDefault, (on) => { prefs.membersDefault = on; savePrefs(); showMembers = on; renderAll(); })),
    row2('Width', '', pick('memberW', [['narrow', 'Narrow'], ['medium', 'Medium'], ['wide', 'Wide']])),
    row2('Include offline', 'Show the people who aren’t around right now.', sw(prefs.memberOffline, (on) => setPref('memberOffline', on))),
    row2('Second line', 'Show each person’s about text under their name.', sw(prefs.memberStatusText, (on) => setPref('memberStatusText', on))),

    el('h3', {}, 'Message box'),
    row2('Sticker button', '', pick('composerSticker', onoff)),
    row2('Send button', 'Turning this off leaves just Enter to send.', pick('composerSend', onoff)),

    el('h3', {}, 'Shape & type'),
    row2('Corners', 'How rounded buttons, channels and messages are.', pick('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']])),
    row2('Interface font', 'The font used everywhere in the app.', pick('uiFont', [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospaced']])),
    row2('Text size', 'Scales the whole interface.', (() => { const r = el('input', { type: 'range', min: 12, max: 20, step: 1, value: prefs.fontSize }); r.oninput = () => { prefs.fontSize = +r.value; savePrefs(); }; return r; })()),

    el('h3', {}, 'Start over'),
    row2('Reset layout', 'Put every option on this page back to the default.', el('button', { className: 'btn danger', onclick: () => { if (!confirm('Reset the layout to defaults?')) return; prefs = { ...prefs, ...DEFAULT_PREFS }; savePrefs(); showMembers = true; renderAll(); redraw(); toast('Layout reset.'); } }, 'Reset')),
  ];
}
