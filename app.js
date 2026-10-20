// Fluentdat — a Discord-style chat that runs in the browser (data in store.js). Servers hold categories of channels;
// there are direct messages, a friends list, a member list, status (online/idle/dnd/invisible), a profile you can
// customise, stickers you can make, and your own CSS themes you can edit. UI icons are inline SVG (not OS emoji).
// Signed out it all stays in this browser; sign in (Discord, GitHub or email, via Supabase) and it's shared and live.
import { Store, ready } from './backend.js';
import { $, el, ICON, BRAND, brand, svgHTML, icon, readImage, scaled, pickFile, shrink, toast, attempt, copyText, modal, ask, confirmBox, menu, closeMenu, GRADS, paint } from './ui.js';


const DEFAULT_PREFS = {
  density: 'cozy', fontSize: 15, reduceMotion: false, highContrast: false, notify: false, sendOnEnter: true, dmFrom: 'anyone',
  // layout — all of these really move something (Settings → Layout)
  rail: 'on', railSize: 'm', iconShape: 'squircle', sideW: 'medium', chanIcons: 'on', cats: 'on', sideHead: 'on', userPanel: 'on',
  topbar: 'on', banner: 'on',
  avatars: 'on', avatarSize: 'm', avatarShape: 'round', timestamps: '12', group: true, dividers: 'on', msgWidth: 'full', hover: 'on',
  membersDefault: true, memberW: 'medium', memberOffline: true, memberStatusText: false,
  radius: 'soft', uiFont: 'system',
  // buttons (Settings → Layout → Buttons): which are hidden, the order of each bar, their size, and whether they're labelled
  hidden: {}, order: {}, btnSize: 'm', btnLabels: 'off',
  // pictures and Discord-style extras
  serverBanner: 'on', bannerH: 'm', plates: 'on', memberGroups: 'on', startHeaders: 'on', dmPanel: true,
  micMuted: false, deafened: false,
};
const LAYOUT_PRESETS = {
  Default: {},
  Compact: { density: 'compact', fontSize: 14, avatarSize: 's', railSize: 's', sideW: 'narrow', dividers: 'off', memberW: 'narrow', radius: 'sharp' },
  Spacious: { density: 'cozy', fontSize: 16, avatarSize: 'l', sideW: 'wide', msgWidth: 'readable', radius: 'round', memberW: 'wide' },
  Minimal: { rail: 'off', sideHead: 'off', userPanel: 'off', avatars: 'off', timestamps: 'off', dividers: 'off', banner: 'off', membersDefault: false, hover: 'off',
    serverBanner: 'off', plates: 'off', startHeaders: 'off', dmPanel: false, hidden: { call: true, video: true, search: true, emoji: true, sticker: true, upload: true, mic: true, deafen: true, chanInvite: true, findDM: true } },
};
let prefs = loadPrefs();



// ---------- you ----------
const COLORS = ['#5b7fd6', '#4bbf73', '#e8743b', '#d6554b', '#b05bd6', '#d6b23b', '#3bc6d6', '#e86ba8'];
const STATUSES = [['online', 'Online'], ['idle', 'Idle'], ['dnd', 'Do Not Disturb'], ['invisible', 'Invisible']];
function loadMe() { try { const m = JSON.parse(localStorage.getItem('fluency.me')); if (m && m.name) return { avatar: '', pronouns: '', about: '', status: 'online', id: 'local-' + Math.random().toString(36).slice(2, 10), ...m }; } catch {} return { id: 'local-' + Math.random().toString(36).slice(2, 10), name: 'You', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '', pronouns: '', about: '', status: 'online' }; }
let me = loadMe();
const saveMe = () => { try { localStorage.setItem('fluency.me', JSON.stringify(me)); } catch {} };
const initials = (name) => String(name || '?').trim().slice(0, 2).toUpperCase();
const stamp = () => { const u = { name: me.name, color: me.color }; if (me.avatar) u.avatar = me.avatar; if (me.pronouns) u.pronouns = me.pronouns; if (me.about) u.about = me.about; return u; };
const asMember = () => ({ id: 'me', name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status, plate: me.plate || '', banner: me.banner || '', me: true });

// other people's profiles are theirs to fill in, so only colours and pictures of the expected shape are drawn
// (a stray web address would let a stranger see who looked at their profile)
const safeColor = (c, fallback = '#5b7fd6') => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback);
const safeImg = (u) => (typeof u === 'string' && (/^data:image\/(png|jpeg|webp|gif);base64,/.test(u)
  || /^https:\/\/(cdn\.discordapp\.com|avatars\.githubusercontent\.com|[a-z0-9-]+\.supabase\.co)\//.test(u)) ? u : '');
// is this person you?
function isMe(u) {
  if (!u) return false;
  if (u.me) return true;
  const acc = Store.account();
  if (acc && acc.id) return u.id === acc.id;
  if (acc && u.login) return u.login === acc.login;
  return !u.bot && u.name === me.name;
}
// a name's colour: their top role's colour in this server, else their own
const nameColor = (u, fallback = 'var(--bright)') => safeColor((view === 'server' && serverId && u && u.id && Store.memberColor(serverId, u.id)) || (u && u.color), fallback);
// a nameplate (picture or gradient) behind a row, when nameplates are on
function plateOn(row, plate) {
  const bg = prefs.plates !== 'off' && paint(plate);
  row.classList.toggle('plated', !!bg);
  if (bg) row.style.setProperty('--plate', bg); else row.style.removeProperty('--plate');
  return row;
}
const setBanner = (node, value, color) => { node.style.background = paint(value) || safeColor(color); };

// ---------- buttons you can show, hide and move (Settings → Layout → Buttons) ----------
// [id, what it is, icon, fixed] — a fixed one can be moved but not hidden (you always need a way into settings)
const BUTTONS = {
  rail: ['Server rail', [['home', 'Direct Messages', 'home'], ['servers', 'Your servers', 'bot', 1], ['add', 'Add a Server', 'plus'], ['discover', 'Discover', 'compass']]],
  header: ['Server header', [['invite', 'Invite People', 'personAdd'], ['serverMenu', 'Server menu arrow', 'chevD']]],
  channels: ['Channel list', [['newChannel', 'New channel (+)', 'plus'], ['chanInvite', 'Invite, on hover', 'personAdd'], ['delChannel', 'Delete channel (×)', 'x']]],
  dms: ['Direct messages', [['findDM', 'Find or start a conversation', 'search'], ['friendsNav', 'Friends', 'users'], ['newDM', 'New DM (+)', 'plus']]],
  top: ['Top bar', [['call', 'Start a voice call', 'phone'], ['video', 'Start a video call', 'video'], ['search', 'Search', 'search'], ['dmProfile', 'User profile, in DMs', 'user'], ['members', 'Member list', 'users']]],
  composer: ['Message box', [['upload', 'Send a picture', 'plusCircle'], ['input', 'The text box', 'edit', 1], ['emoji', 'Emoji', 'smile'], ['sticker', 'Stickers', 'sticker'], ['send', 'Send', 'send']]],
  panel: ['User panel', [['me', 'You (avatar and name)', 'user', 1], ['mic', 'Mute', 'mic'], ['deafen', 'Deafen', 'headphones'], ['settings', 'User Settings', 'gear', 1]]],
};
const shown = (id) => !(prefs.hidden || {})[id];
function ordered(group) {
  const all = BUTTONS[group][1].map((b) => b[0]), saved = ((prefs.order || {})[group] || []).filter((id) => all.includes(id));
  return [...saved, ...all.filter((id) => !saved.includes(id))];
}

function avatarEl(user, { size, status } = {}) {
  const a = el('div', { className: 'avatar' });
  if (size) { a.style.width = a.style.height = size + 'px'; }
  const fill = el('div', { className: 'fill' });
  fill.style.background = safeColor(user.color);
  const img = safeImg(user.avatar);
  if (img) fill.append(el('img', { src: img, alt: '' }));
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
let discoverCat = '', discoverQ = '', searchOpen = false, searchQ = '', searchKey = '';
// DMs you've closed (they come back when you message that person again)
const closedDMs = new Set((() => { try { return JSON.parse(localStorage.getItem('fluentdat.closedDMs')) || []; } catch { return []; } })());
const saveClosed = () => { try { localStorage.setItem('fluentdat.closedDMs', JSON.stringify([...closedDMs])); } catch {} };
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
  const parts = [], open = (fn) => () => { closeCall(); fn(); renderAll(); };
  const railBtn = (ic, title, on, onclick, cls) => { const b = el('button', { className: 'srv ' + cls + (on ? ' on' : ''), title, onclick }); b.append(icon(ic, 24)); return b; };
  for (const id of ordered('rail')) {
    if (!shown(id)) continue;
    if (id === 'home') parts.push(railBtn('home', 'Direct Messages', view === 'home', open(() => { view = 'home'; }), 'home'));
    else if (id === 'add') parts.push(railBtn('plus', 'Add a Server', false, () => addServerFlow(), 'add'));
    else if (id === 'discover') parts.push(railBtn('compass', 'Discover', view === 'discover', open(() => { view = 'discover'; }), 'add discover'));
    else if (id === 'servers') {
      if (parts.length) parts.push(el('hr'));
      for (const s of Store.servers()) {
        const b = el('button', { className: 'srv' + (view === 'server' && s.id === serverId ? ' on' : ''), title: s.name,
          onclick: open(() => { view = 'server'; serverId = s.id; channelId = firstChannel(s.id); }),
          oncontextmenu: (e) => { e.preventDefault(); serverCtx(s, e.clientX, e.clientY); } });
        const img = safeImg(s.img);
        if (img) b.append(el('img', { src: img, alt: '' })); else if (ICON[s.icon]) b.append(icon(s.icon, 24)); else b.textContent = initials(s.name);
        parts.push(b);
      }
    }
  }
  $('#rail').replaceChildren(...parts);
}

// ---------- the sidebar ----------
function renderSide() {
  const head = $('#side-head'), body = $('#side-body');
  head.onclick = null; head.className = 'side-head'; head.style.removeProperty('--banner');
  if (view === 'home') return dmSide(head, body);
  if (view === 'discover') {
    head.replaceChildren('Discover');
    body.replaceChildren(...DISCOVER_CATS.map(([id, label, ic]) => el('button', { className: 'nav-btn' + (discoverCat === id ? ' on' : ''),
      onclick: () => { discoverCat = id; renderSide(); renderContent(); $('#app').classList.remove('show-side'); } }, icon(ic), label)));
    return;
  }
  if (!serverId || !Store.server(serverId)) {
    head.replaceChildren(Store.syncState().loading ? 'Loading…' : 'No servers');
    body.replaceChildren(el('div', { style: 'color:var(--muted);padding:14px 10px;font-size:.9rem' },
      Store.syncState().loading ? 'Fetching your servers…' : 'Make one, join one with an invite, or find one in Discover: the buttons in the server rail.'));
    return;
  }
  const server = Store.server(serverId), can = Store.canManage(serverId), live = Store.kind === 'supabase';
  const bg = prefs.serverBanner !== 'off' && paint(server.banner);
  head.className = 'side-head btn-like' + (bg ? ' has-banner' : '');
  if (bg) head.style.setProperty('--banner', bg);
  const inviting = live ? can : true;                     // (signed out, Invite explains how it works)
  const row = el('div', { className: 'sh-row' }, el('span', { className: 'sh-name' }, server.name),
    shown('invite') && inviting ? el('button', { className: 'sh-btn', title: 'Invite People', onclick: (e) => { e.stopPropagation(); openServerSettings(serverId, 'invite'); } }, icon('personAdd', 18)) : null,
    shown('serverMenu') ? el('span', { className: 'drop' }, icon('chevD', 18)) : null);
  head.replaceChildren(row);
  head.onclick = () => serverMenu(row);
  body.replaceChildren();
  const cats = Store.categories(serverId), chans = Store.channels(serverId);
  const groups = cats.length ? cats : [{ id: null, name: 'Channels' }];
  for (const cat of groups) {
    const mine = chans.filter((c) => (cat.id ? c.category === cat.id : true));
    const isCollapsed = collapsed.has(cat.id);
    body.append(el('div', { className: 'cat' + (isCollapsed ? ' collapsed' : ''), onclick: () => { if (isCollapsed) collapsed.delete(cat.id); else collapsed.add(cat.id); renderSide(); } },
      el('span', { className: 'caret' }, icon('chevD')), el('span', { className: 'nm' }, cat.name),
      can && shown('newChannel') ? el('span', { className: 'add', title: 'Create Channel', onclick: (e) => { e.stopPropagation(); newChannelFlow(cat.id); } }, icon('plus')) : null));
    if (isCollapsed) continue;
    for (const c of mine) {
      const rowc = el('button', { className: 'chan' + (c.id === channelId && view === 'server' ? ' on' : ''),
        onclick: () => { channelId = c.id; closeCall(); renderAll(); $('#app').classList.remove('show-side'); },
        oncontextmenu: (e) => { e.preventDefault(); channelCtx(c, e.clientX, e.clientY); } },
        icon(c.kind === 'voice' ? 'volume' : 'hash', 18), el('span', { className: 'nm' }, c.name));
      if (shown('chanInvite') && inviting) rowc.append(el('span', { className: 'x ci', title: 'Invite People', onclick: (e) => { e.stopPropagation(); openServerSettings(serverId, 'invite'); } }, icon('personAdd')));
      if (shown('delChannel') && can && chans.length > 1) rowc.append(el('span', { className: 'x', title: 'Delete Channel', onclick: (e) => { e.stopPropagation(); deleteChannel(c); } }, icon('x')));
      body.append(rowc);
    }
  }
}
// the Direct Messages side: find a conversation, Friends, and your DMs
function dmSide(head, body) {
  head.replaceChildren(shown('findDM') ? el('button', { className: 'find-dm', onclick: () => newDMDialog() }, 'Find or start a conversation') : 'Messages');
  const parts = [];
  if (shown('friendsNav')) parts.push(el('button', { className: 'nav-btn' + (!dmId ? ' on' : ''), onclick: () => { dmId = null; renderAll(); } }, icon('users'), 'Friends'));
  parts.push(el('div', { className: 'cat dm-cat' }, el('span', { className: 'nm' }, 'Direct Messages'),
    shown('newDM') ? el('span', { className: 'add', title: 'Create DM', onclick: (e) => { e.stopPropagation(); newDMDialog(); } }, icon('plus')) : null));
  for (const d of Store.dmList()) {
    if (closedDMs.has(d.id) && d.id !== dmId) continue;
    const row = el('button', { className: 'dm-row' + (dmId === d.id ? ' on' : ''), onclick: () => { dmId = d.id; renderAll(); $('#app').classList.remove('show-side'); },
      oncontextmenu: (e) => { e.preventDefault(); dmCtx(d, e.clientX, e.clientY); } },
      avatarEl(d.user, { size: 32 }), el('div', { className: 'who' }, el('div', { className: 'nm2' }, d.user.name), d.user.about ? el('div', { className: 'sub2' }, d.user.about) : null));
    parts.push(plateOn(row, d.user.plate));
  }
  body.replaceChildren(...parts);
}

// ---------- the user panel ----------
function renderMe() {
  const panel = $('#me-panel'), parts = [];
  const pbtn = (ic, title, onclick, on, cls = '') => { const b = el('button', { className: 'pbtn' + (on ? ' on' : '') + (cls ? ' ' + cls : ''), title, onclick }); b.append(icon(ic)); return b; };
  const quiet = prefs.micMuted || prefs.deafened;
  for (const id of ordered('panel')) {
    if (id === 'me') {
      const av = avatarEl(asMember()); av.onclick = (e) => { e.stopPropagation(); showAccount(av); };
      const stName = (STATUSES.find((s) => s[0] === me.status) || [, 'Online'])[1];
      parts.push(av, el('div', { className: 'who', onclick: (e) => { e.stopPropagation(); showAccount(av); } }, el('div', { className: 'nm' }, me.name), el('div', { className: 'st' }, me.pronouns || stName)));
    } else if (id === 'settings') parts.push(pbtn('gear', 'User Settings', () => openUserSettings('account'), false, 'gear'));
    else if (id === 'mic' && shown('mic')) parts.push(pbtn(quiet ? 'micOff' : 'mic', quiet ? 'Unmute' : 'Mute', toggleMic, quiet));
    else if (id === 'deafen' && shown('deafen')) parts.push(pbtn(prefs.deafened ? 'headphonesOff' : 'headphones', prefs.deafened ? 'Undeafen' : 'Deafen', toggleDeafen, prefs.deafened));
  }
  panel.replaceChildren(...parts);
  plateOn(panel, me.plate);
}
// mute and deafen: they apply to calls, and deafen also silences Fluentdat's sounds (and mutes you, as on Discord)
function toggleMic() {
  if (prefs.deafened) { prefs.deafened = false; prefs.micMuted = false; } else prefs.micMuted = !prefs.micMuted;
  savePrefs(); applyMic(); renderMe(); toast(prefs.micMuted ? 'Muted.' : 'Unmuted.');
}
function toggleDeafen() { prefs.deafened = !prefs.deafened; savePrefs(); applyMic(); renderMe(); toast(prefs.deafened ? 'Deafened: sounds are off and your mic is muted.' : 'Undeafened.'); }
function applyMic() { micOn = !(prefs.micMuted || prefs.deafened); if (stream) { stream.getAudioTracks().forEach((t) => { t.enabled = micOn; }); syncCallButtons(); } }

// ---------- the top bar ----------
function renderTop() {
  const top = $('#top');
  if (document.activeElement === searchField && top.contains(searchField)) return;     // (don't pull the search box out from under you)
  const parts = [el('button', { className: 'menu', title: 'Menu', onclick: () => $('#app').classList.toggle('show-side') }, icon('menu'))];
  const act = (ic, title, onclick, on) => el('button', { className: 'act' + (on ? ' on' : ''), title, onclick }, icon(ic), prefs.btnLabels === 'on' ? el('span', { className: 'lbl' }, title) : null);
  let where = null;
  if (view === 'discover') parts.push(el('span', { className: 'hash' }, icon('compass')), el('span', {}, 'Discover'));
  else if (view === 'home' && !dmId) parts.push(el('span', { className: 'hash' }, icon('users')), el('span', {}, 'Friends'));
  else if (view === 'home') { const u = Store.dmUser(dmId) || { name: '?' }; parts.push(avatarEl(u, { size: 24 }), el('span', { className: 'ttl' }, u.name)); where = 'dm'; }
  else {
    const c = Store.channel(channelId);
    if (!c) parts.push(el('span', {}, Store.syncState().loading ? 'Loading…' : 'Fluentdat'));
    else { parts.push(el('span', { className: 'hash' }, icon(c.kind === 'voice' ? 'volume' : 'hash')), el('span', { className: 'ttl' }, c.name)); where = 'channel'; }
  }
  parts.push(el('span', { className: 'spacer' }));
  if (where) for (const id of ordered('top')) {
    if (!shown(id)) continue;
    if (id === 'call') parts.push(act('phone', 'Start a voice call', () => startCall(false)));
    else if (id === 'video') parts.push(act('video', 'Start a video call', () => startCall(true)));
    else if (id === 'search') parts.push(searchOpen ? searchField : act('search', 'Search', () => { searchOpen = true; renderTop(); searchField.focus(); }));
    else if (id === 'dmProfile' && where === 'dm') parts.push(act('user', prefs.dmPanel ? 'Hide User Profile' : 'Show User Profile', () => { prefs.dmPanel = !prefs.dmPanel; savePrefs(); renderAll(); }, prefs.dmPanel));
    else if (id === 'members' && where === 'channel') parts.push(act('users', showMembers ? 'Hide Member List' : 'Show Member List', () => { showMembers = !showMembers; renderAll(); }, showMembers));
  }
  top.replaceChildren(...parts);
}
// searching the conversation you're looking at (what's loaded of it)
const searchField = el('input', { className: 'top-search', type: 'search', placeholder: 'Search' });
searchField.setAttribute('aria-label', 'Search messages');
searchField.addEventListener('input', () => { searchQ = searchField.value.trim(); renderContent(); });
searchField.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchField.value = ''; searchQ = ''; searchOpen = false; searchField.blur(); renderTop(); renderContent(); } });
searchField.addEventListener('blur', () => { if (!searchField.value) { searchOpen = false; setTimeout(renderTop, 0); } });



// ---------- messages ----------
const fmt = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(.+?)\*(?=\W|$)/g, '$1<i>$2</i>').replace(/`(.+?)`/g, '<code>$1</code>');
function when(ts) {
  const d = new Date(ts);
  if (prefs.timestamps === '24') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (prefs.timestamps === 'rel') { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function messageList(msgs, start) {
  const wrap = el('div', { className: 'msgs' });
  if (start) wrap.append(start);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    msgs = msgs.filter((m) => (m.text || '').toLowerCase().includes(q) || String(m.user.name || '').toLowerCase().includes(q));
    wrap.append(el('div', { className: 'search-note' }, `${msgs.length} result${msgs.length === 1 ? '' : 's'} for “${searchQ}”`));
  }
  let last = null, lastDay = null;
  for (const m of msgs) {
    if (!lastDay || !sameDay(lastDay, m.ts)) { wrap.append(el('div', { className: 'day' }, new Date(m.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))); lastDay = m.ts; last = null; }
    const cont = prefs.group && last && last.user.name === m.user.name && !last.user.bot === !m.user.bot && last.user.via === m.user.via && (m.ts - last.ts) < 5 * 60000;
    const body = el('div', { className: 'body' });
    if (!cont) {
      const nm = el('span', { className: 'nm', onclick: (e) => showProfile(m.user, e.currentTarget) }, m.user.name);
      nm.style.setProperty('--who', nameColor(m.user));
      const meta = el('div', { className: 'meta' }, nm); if (m.user.bot) meta.append(el('span', { className: 'tag' }, 'bot'), m.user.via ? el('span', { className: 'when' }, 'for @' + m.user.via) : ''); meta.append(el('span', { className: 'when' }, when(m.ts)));
      body.append(meta);
    }
    if (m.sticker) {
      const st = typeof m.sticker === 'string' ? { kind: 'emoji', data: m.sticker } : m.sticker;
      if (st.kind === 'img') { const src = safeImg(st.data); if (src) body.append(el('div', { className: 'sticker' + (st.photo ? ' photo' : '') }, el('img', { src, alt: st.photo ? 'picture' : 'sticker', loading: 'lazy' }))); }
      else body.append(el('div', { className: 'sticker' }, String(st.data || '').slice(0, 24)));
    }
    if (m.text != null) { const t = el('div', { className: 'text' + (m.action ? ' action' : '') }); t.innerHTML = fmt(m.action ? `${m.user.name} ${m.text}` : m.text); body.append(t); }
    const av = avatarEl(m.user); av.onclick = (e) => showProfile(m.user, e.currentTarget);
    wrap.append(el('div', { className: 'msg' + (cont ? ' cont' : ''), oncontextmenu: (e) => { if (e.target.closest('a')) return; e.preventDefault(); messageCtx(m, e.clientX, e.clientY); } }, av, body));
    last = m;
  }
  return wrap;
}
// the top of a conversation, as on Discord: who it's with, or which channel this is
function startHeader() {
  if (prefs.startHeaders === 'off') return null;
  if (view === 'home') {
    const u = Store.dmUser(dmId); if (!u) return null;
    const friend = Store.friends().some((f) => f.id === u.id), mutual = Store.mutualServers(u.id);
    return el('div', { className: 'start' }, avatarEl(u, { size: 80 }), el('h2', {}, u.name), u.login ? el('div', { className: 'start-handle' }, u.login) : null,
      el('p', {}, 'This is the beginning of your direct message history with ', el('b', {}, u.name), '.'),
      u.bot ? null : el('div', { className: 'start-acts' }, mutual ? el('span', { className: 'muted' }, `${mutual} Mutual Server${mutual === 1 ? '' : 's'}`) : null,
        el('button', { className: 'btn small', onclick: () => (friend ? unfriend(u) : befriend(u)) }, friend ? 'Remove Friend' : 'Add Friend')));
  }
  const c = Store.channel(channelId); if (!c) return null;
  const name = (c.kind === 'voice' ? '' : '#') + c.name;
  return el('div', { className: 'start' }, el('div', { className: 'start-ic' }, icon(c.kind === 'voice' ? 'volume' : 'hash', 40)), el('h2', {}, `Welcome to ${name}!`), el('p', {}, `This is the start of the ${name} channel.`));
}

// ---------- the main content ----------
function renderContent() {
  const content = $('#content'), composer = $('#composer');
  if (view === 'discover') {
    const key = 'discover:' + discoverCat;
    if (content.dataset.key !== key) { content.replaceChildren(discoverPage()); content.dataset.key = key; }
    composer.hidden = true; return;
  }
  if (view === 'home' && !dmId) {
    const key = 'friends:' + friendsTab;
    if (!(friendsTab === 'add' && content.dataset.key === key)) content.replaceChildren(friendsPage());      // (keep what you're typing)
    content.dataset.key = key; composer.hidden = true; return;
  }
  const ch = view === 'home' ? null : Store.channel(channelId);
  if (view === 'server' && !ch) {
    content.replaceChildren(el('div', { className: 'empty-note' }, Store.syncState().loading ? 'Loading your servers…' : 'No channel here yet. Make one from the server menu.'));
    content.dataset.key = ''; composer.hidden = true; return;
  }
  Store.setActive(view === 'home' ? 'dm' : 'channel', view === 'home' ? dmId : channelId);   // (what to load and keep live)
  const msgs = view === 'home' ? Store.dm(dmId) : Store.messages(channelId);
  // stay where you were reading, unless you were at the bottom already or this is a different conversation
  const key = view + ':' + (view === 'home' ? dmId : channelId), same = content.dataset.key === key;
  if (key !== searchKey) { searchKey = key; if (searchQ || searchOpen) { searchQ = ''; searchOpen = false; searchField.value = ''; renderTop(); } }
  const atBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 80, was = content.scrollTop;
  const whole = Store.kind !== 'supabase' || msgs.length < 300;            // (the start banner only when the start is loaded)
  content.replaceChildren(messageList(msgs, whole && !searchQ ? startHeader() : null)); content.dataset.key = key;
  const name = view === 'home' ? (Store.dmUser(dmId) || {}).name : (ch.kind === 'voice' ? '' : '#') + ch.name;
  $('#input').placeholder = 'Message ' + name;
  composer.hidden = false;
  renderComposer();
  content.scrollTop = !same || atBottom ? content.scrollHeight : was;
}
// the message box, in the order (and with the buttons) chosen in Layout
const CB = {};
function composerBtn(id) {
  if (CB[id]) return CB[id];
  const make = (ic, title, onclick) => { const b = el('button', { className: 'tool', title, onclick }); b.append(icon(ic)); return b; };
  if (id === 'upload') CB[id] = make('plusCircle', 'Send a picture', () => pickFile(sendPicture));
  if (id === 'emoji') CB[id] = make('smile', 'Emoji', (e) => { e.stopPropagation(); togglePicker('emoji'); });
  if (id === 'sticker') CB[id] = $('#sticker-btn');
  if (id === 'send') CB[id] = $('#send-btn');
  CB[id].dataset.btn = id;
  return CB[id];
}
function renderComposer() {
  const box = $('#composer .box'), parts = [];
  for (const id of ordered('composer')) { if (id === 'input') parts.push($('#input')); else if (shown(id)) parts.push(composerBtn(id)); }
  const same = parts.length === box.children.length && parts.every((p, i) => box.children[i] === p);
  if (!same) box.replaceChildren(...parts);
}
async function sendPicture(file) {
  try { postMine({ sticker: { kind: 'img', data: await shrink(file, 1280, 1280, 380000), photo: true } }); }
  catch (e) { toast(String((e && e.message) || 'Couldn’t read that picture.')); }
}

// ---------- members ----------
function memberList() {
  if (Store.kind === 'supabase') return (serverId && Store.members(serverId)) || [];
  const real = Store.members && Store.members();
  return real && real.length ? real : [asMember(), ...Store.friends()];
}
function renderMembers() {
  const box = $('#members');
  if (view === 'home' && dmId && prefs.dmPanel) { const u = Store.dmUser(dmId); box.replaceChildren(u ? dmPanel(u) : ''); return; }
  if (view !== 'server' || !showMembers) { box.replaceChildren(); return; }
  const all = memberList(), isOn = (m) => m.status && m.status !== 'offline' && m.status !== 'invisible';
  const online = all.filter(isOn), offline = all.filter((m) => !isOn(m));
  const member = (m) => {
    const nm = el('div', { className: 'nm' }, m.name, m.role === 'owner' ? roleMark('crown', 'Server owner') : m.role === 'admin' ? roleMark('shield', 'Admin') : null);
    nm.style.setProperty('--who', safeColor(m.roleColor || m.color, 'var(--text)'));
    const who = el('div', { className: 'who' }, nm);
    if (prefs.memberStatusText) who.append(el('div', { className: 'mem-sub' }, m.about || (m.bot ? 'Bot' : (m.status || 'offline'))));
    const row = el('button', { className: 'mem' + (isOn(m) ? '' : ' off'), onclick: (e) => showProfile(m, e.currentTarget),
      oncontextmenu: (e) => { e.preventDefault(); memberCtx(m, e.clientX, e.clientY); } }, avatarEl(m), who);
    return plateOn(row, m.plate);
  };
  const grp = (title, list) => list.length ? [el('div', { className: 'mem-cat' }, `${title} — ${list.length}`), ...list.map(member)] : [];
  const out = [];
  let rest = online;
  if (Store.kind === 'supabase' && prefs.memberGroups !== 'off')         // people with a role that's shown separately get their own group
    for (const r of Store.roles(serverId).filter((x) => x.hoist)) { const ppl = rest.filter((m) => m.group && m.group.id === r.id); rest = rest.filter((m) => !ppl.includes(m)); out.push(...grp(r.name, ppl)); }
  out.push(...grp('Online', rest));
  if (prefs.memberOffline) out.push(...grp('Offline', offline));
  box.replaceChildren(...out);
}
// the profile panel beside a DM (Discord's right-hand side)
function dmPanel(u) {
  const banner = el('div', { className: 'dp-banner' }); setBanner(banner, u.banner, u.color);
  const box = el('div', { className: 'dm-panel' }, banner, el('div', { className: 'dp-av' }, avatarEl(u, { size: 80 })),
    el('div', { className: 'dp-name' }, u.name), u.login ? el('div', { className: 'dp-handle' }, u.login + (u.pronouns ? ' · ' + u.pronouns : '')) : null);
  if (u.about) box.append(el('div', { className: 'dp-sec' }, el('h4', {}, 'About Me'), el('div', { className: 'dp-about' }, u.about)));
  if (u.since) box.append(el('div', { className: 'dp-sec' }, el('h4', {}, 'Member Since'), el('div', {}, new Date(u.since).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }))));
  const mutual = Store.mutualServers(u.id);
  if (mutual) box.append(el('div', { className: 'dp-sec' }, el('div', { className: 'muted' }, `${mutual} Mutual Server${mutual === 1 ? '' : 's'}`)));
  if (!u.banner && u.id) Store.profileFull(u.id).then((p) => { if (p && p.banner) setBanner(banner, p.banner, u.color); }, () => {});
  return box;
}

const roleMark = (ic, title) => { const s = el('span', { className: 'role-mark', title }); s.append(icon(ic, 13)); return s; };
function renderAll() {
  ensureSelection(); renderRail(); renderSide(); renderMe(); renderTop(); renderContent(); renderMembers(); renderBanner();
  const dmPanelOn = view === 'home' && !!dmId && prefs.dmPanel && !!Store.dmUser(dmId);
  $('#app').classList.toggle('show-members', (showMembers && view === 'server') || dmPanelOn);
  $('#app').classList.toggle('dm-mode', dmPanelOn);
}
function renderBanner() {
  const b = $('#banner'), st = Store.syncState(), acc = Store.account();
  b.replaceChildren();
  if (Store.resuming) b.append('Signing you in…');
  else if (Store.kind === 'supabase') b.append(st.error ? `Trouble: ${st.error}` : `Live, signed in as @${acc.login}`);
  else if (acc) {
    const when = st.lastSync ? 'synced ' + new Date(st.lastSync).toLocaleTimeString() : 'syncing…';
    b.append(st.error ? `Sync trouble: ${st.error}` : `Synced with GitHub as ${acc.login} — ${when}`);
  } else b.append(Store.configured ? 'Saving in this browser only. Sign in with Discord, GitHub or email to chat with your team.' : 'Saving in this browser only. Sign in with GitHub to share with your team.');
  b.onclick = () => (acc || Store.resuming ? openUserSettings('sync') : signInDialog());
}

// ---------- friends page ----------
function friendsPage() {
  const wrap = el('div', { className: 'friends' });
  const tabs = el('div', { className: 'ftabs' }, ...[['online', 'Online'], ['all', 'All'], ['add', 'Add Friend']].map(([id, label]) =>
    el('button', { className: 'ftab' + (friendsTab === id ? ' on' : '') + (id === 'add' ? ' add' : ''), onclick: () => { friendsTab = id; renderContent(); } }, label)));
  wrap.append(tabs);
  const body = el('div', { className: 'fbody' });
  if (friendsTab === 'add' && Store.kind === 'supabase') {
    const inp = el('input', { placeholder: 'Their @handle, like @alex_robotics', autocapitalize: 'off', spellcheck: false });
    const go = el('button', { className: 'btn primary' }, 'Add Friend');
    const add = async () => {
      const u = inp.value.trim(); if (!u) return;
      go.disabled = true;
      const f = await attempt(() => Store.addFriendByHandle(u));
      go.disabled = false;
      if (!f) return;
      inp.value = ''; toast(`Added @${f.login}. They can message you now.`); friendsTab = 'all'; renderContent();
    };
    go.onclick = add;
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    const mine = (Store.account() || {}).login;
    body.append(el('h4', {}, 'Add Friend'),
      el('div', { style: 'color:var(--muted);margin-bottom:4px' }, 'Type their exact @handle (there’s no list of everyone to browse). Adding someone lets them message you.'),
      el('div', { className: 'add-form' }, inp, go),
      mine ? el('div', { style: 'color:var(--muted);margin-top:18px;font-size:.9rem' }, 'Your handle is ', el('b', { style: 'color:var(--bright)' }, '@' + mine), '. ',
        el('a', { href: '#', style: 'color:var(--accent)', onclick: (e) => { e.preventDefault(); copyText('@' + mine, 'Handle copied.'); } }, 'Copy it')) : null);
    setTimeout(() => inp.focus(), 0);
  } else if (friendsTab === 'add') {
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
        const msg = el('button', { title: 'Message', onclick: () => openDM(f) }, icon('message', 18));
        const rm = el('button', { title: 'Remove friend', onclick: () => unfriend(f) }, icon('x', 18));
        body.append(el('div', { className: 'frow', oncontextmenu: (e) => { e.preventDefault(); memberCtx(f, e.clientX, e.clientY); } }, avatarEl(f, { size: 40 }), el('div', {}, el('div', { className: 'nm' }, f.name), el('div', { className: 'st2' }, f.bot ? 'Bot' : (f.status === 'offline' ? 'Offline' : 'Online'))), el('div', { className: 'acts' }, msg, rm)));
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
  const mine = isMe(user), sv = view === 'server' ? serverId : null, live = Store.kind === 'supabase';
  const u = mine ? { ...asMember(), ...user, me: true, name: me.name, avatar: me.avatar, color: me.color, about: me.about, pronouns: me.pronouns, banner: me.banner, plate: me.plate } : user;
  const banner = el('div', { className: 'banner-c' }); setBanner(banner, u.banner, u.color);
  const inner = el('div', { className: 'inner' }, avatarEl(u, { size: 74 }),
    el('div', { className: 'pn' }, u.name, u.bot ? el('span', { className: 'tag' }, 'bot') : null),
    u.login && !u.bot ? el('div', { className: 'pr' }, u.login + (u.pronouns ? ' · ' + u.pronouns : '')) : u.pronouns ? el('div', { className: 'pr' }, u.pronouns) : null,
    u.bot && u.via ? el('div', { className: 'pr' }, 'Run by @' + u.via + ' (Flubot speaks for whoever types the command)') : null);
  const sec = (title, ...kids) => el('div', { className: 'psec' }, el('h4', {}, title), ...kids);
  if (u.about) inner.append(sec('About Me', el('div', { className: 'ab' }, u.about)));
  if (u.since) inner.append(sec('Member Since', el('div', {}, new Date(u.since).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }))));
  // their roles in this server (admins can hand them out from here)
  if (live && sv && u.id && !u.bot) {
    const all = Store.roles(sv), has = all.filter((r) => ((Store.members(sv) || []).find((m) => m.id === u.id) || {}).roles?.includes(r.id));
    if (has.length || Store.canManage(sv)) inner.append(sec('Roles', el('div', { className: 'role-chips' },
      ...has.map((r) => el('span', { className: 'rchip' }, el('i', { style: `background:${safeColor(r.color, '#99aab5')}` }), r.name)),
      Store.canManage(sv) && all.length ? el('button', { className: 'rchip add', title: 'Give a role', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu(roleItems(sv, u), r.left, r.bottom + 4); } }, icon('plus', 13)) : null)));
  }
  if (mine) inner.append(el('div', { className: 'card' }, el('button', { onclick: () => { closePop(); openUserSettings('profile'); } }, icon('edit'), 'Edit Profile')));
  else if (!u.bot) {
    const say = el('input', { type: 'text', placeholder: 'Message @' + (u.login || u.name), maxLength: 4000 });
    say.onkeydown = async (e) => {
      if (e.key !== 'Enter' || !say.value.trim()) return;
      const text = say.value.trim(); closePop();
      if (await openDM(normFriend(u))) postMine({ text });
    };
    const friend = Store.friends().some((f) => f.id === (u.id || 'u_' + String(u.name).toLowerCase()));
    inner.append(el('div', { className: 'pmsg' }, say), el('div', { className: 'pacts' },
      friend ? null : el('button', { className: 'btn small', onclick: () => { closePop(); befriend(u); } }, icon('personAdd', 15), 'Add Friend'),
      el('button', { className: 'btn small', title: 'More', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); closePop(); memberCtx(u, r.left, r.bottom + 4); } }, icon('more', 16))));
  }
  pop = el('div', { className: 'pop prof' }, banner, inner);
  document.body.append(pop); placePop(anchor);
  if (!u.banner && u.id && !mine) Store.profileFull(u.id).then((p) => { if (p && p.banner && banner.isConnected) setBanner(banner, p.banner, u.color); }, () => {});
}
const normFriend = (u) => ({ id: u.id || 'u_' + String(u.name).toLowerCase(), name: u.name, login: u.login, color: u.color, avatar: u.avatar, bot: u.bot, status: u.status || 'offline', plate: u.plate, about: u.about });

// your own account popout (click your avatar in the user panel)
function showAccount(anchor) {
  closePop();
  const row = (ic, label, extra, onclick) => el('button', { onclick }, icon(ic), el('span', {}, label), extra || null);
  const card = el('div', { className: 'card' },
    row('edit', 'Edit Profile', null, () => { closePop(); openUserSettings('profile'); }),
    el('hr'), row('dot', 'Set Status', el('span', { className: 'chev' }, icon('chevR', 16)), (e) => { e.stopPropagation(); statusMenu(); }),
    el('hr'), row('palette', 'Themes', el('span', { className: 'chev' }, icon('chevR', 16)), () => { closePop(); openThemes(); }),
    el('hr'), Store.kind === 'supabase'
      ? row('id', 'Copy My @handle', null, () => copyText('@' + (Store.account() || {}).login, 'Handle copied.'))
      : row('id', 'Copy User ID', null, () => copyText(me.id, 'User ID copied.')));
  const banner = el('div', { className: 'banner-c' }); setBanner(banner, me.banner, me.color);
  pop = el('div', { className: 'pop' }, banner,
    el('div', { className: 'inner' }, avatarEl(asMember(), { size: 74 }),
      el('div', { className: 'pn' }, me.name), el('div', { className: 'pr' }, me.pronouns || (STATUSES.find((s) => s[0] === me.status) || [, 'Online'])[1]),
      me.about ? el('div', { className: 'ab' }, me.about) : null, card));
  document.body.append(pop); placePop(anchor);
}
function statusMenu() {
  const inner = pop.querySelector('.inner'), card = inner.querySelector('.card');
  card.replaceChildren(...STATUSES.map(([id, label]) => el('button', { onclick: () => { me.status = id; saveMe(); pushProfile(); renderMe(); renderMembers(); closePop(); } }, el('span', { className: 'dot ' + id, style: 'position:static;border:none;width:12px;height:12px' }), el('span', {}, label), me.status === id ? el('span', { className: 'chev' }, icon('check', 16)) : null)));
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
    case 'nick': if (arg) { me.name = arg.slice(0, 24); saveMe(); pushProfile(); renderAll(); botSay(`You're now **${me.name}**.`); } return;
    case 'theme': { const all = [...BUILTIN, ...loadThemes().map((t) => [t.id, t.name])], t = all.find((x) => x[1].toLowerCase() === arg.toLowerCase() || x[0] === arg.toLowerCase()); if (t) { applyTheme(t[0]); botSay(`Theme set to **${t[1]}**.`); } else botSay('Themes: ' + all.map((x) => '`' + x[1] + '`').join(', ') + '. Make your own in Themes.'); return; }
    case 'clear':
      if (Store.kind === 'supabase') {
        if (!Store.canManage(serverId)) return toast('Only this server’s admins can clear a channel.');
      }
      confirmBox({ title: 'Clear Channel', text: `Delete every message in #${(Store.channel(channelId) || {}).name}${Store.kind === 'supabase' ? ' for everyone' : ''}? This can’t be undone.`, ok: 'Clear', danger: true })
        .then((yes) => { if (yes) Store.clear(channelId); });
      return;
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
function togglePicker(tab = 'stickers') {
  if (picker) { const was = picker.dataset.tab; closePicker(); if (was === tab) return; }
  const custom = Store.stickers();
  const mk = el('button', { className: 'mk', onclick: createSticker }, icon('plus'), 'Create');
  const tabs = el('div', { className: 'ptabs' }, ...[['emoji', 'Emoji'], ['stickers', 'Stickers']].map(([id, label]) =>
    el('button', { className: tab === id ? 'on' : '', onclick: (e) => { e.stopPropagation(); closePicker(); togglePicker(id); } }, label)));
  const stickers = [
    el('div', { className: 'hdr' }, el('h4', {}, 'Your stickers'), mk),
    custom.length ? el('div', { className: 'set big' }, ...custom.map((s) => {
      const b = el('button', { title: (s.name || 'sticker') + ' (right-click to delete)', onclick: () => { postMine({ sticker: { kind: s.kind, data: s.data } }); closePicker(); },
        oncontextmenu: async (e) => { e.preventDefault(); closePicker(); if (await confirmBox({ title: 'Delete this sticker?', ok: 'Delete', danger: true })) { Store.removeSticker(s.id); togglePicker('stickers'); } } });
      b.append(s.kind === 'img' ? el('img', { src: safeImg(s.data), alt: s.name || '' }) : document.createTextNode(s.data)); return b;
    })) : el('div', { className: 'empty' }, 'None yet. Tap Create (right-click one to delete it).'),
    el('div', { className: 'hdr' }, el('h4', {}, 'Stickers')), el('div', { className: 'set big' }, ...STICKERS.map((s) => el('button', { onclick: () => { postMine({ sticker: { kind: 'emoji', data: s } }); closePicker(); } }, s)))];
  const emoji = [el('div', { className: 'hdr' }, el('h4', {}, 'Emoji')), el('div', { className: 'set' }, ...EMOJI.map((e) => el('button', { onclick: () => { const i = $('#input'); i.value += e; i.focus(); } }, e)))];
  picker = el('div', { className: 'picker' }, tabs, ...(tab === 'emoji' ? emoji : stickers));
  picker.dataset.tab = tab;
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
  camOn = video; micOn = !(prefs.micMuted || prefs.deafened); stream.getAudioTracks().forEach((t) => { t.enabled = micOn; }); $('#call').classList.add('on');
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
      el('button', { className: 'btn primary', textContent: 'Save', onclick: () => { me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color, avatar, pronouns: pronouns.value.trim(), about: about.value.trim() }; saveMe(); pushProfile(); renderAll(); scrim.remove(); } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim); name.focus(); name.select();
}

// ---------- theme editor (your own CSS themes) ----------
function openThemes() {
  const list = el('div', {});
  const draw = () => {
    const cur = currentTheme();
    const line = (id, label, swatchBg, custom) => { const b = el('button', { className: 'ftab' + (cur === id ? ' on' : ''), style: 'flex:1;justify-content:flex-start', onclick: () => { applyTheme(id); renderAll(); draw(); } }, el('span', { className: 'swatch-dot', style: `background:${swatchBg}` }), label); const wrap = el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px' }, b); if (custom) { wrap.append(el('button', { className: 'btn', onclick: () => editTheme(id) }, 'Edit'), el('button', { className: 'btn danger', onclick: async () => { if (await confirmBox({ title: 'Delete this theme?', ok: 'Delete', danger: true })) { const left = loadThemes().filter((t) => t.id !== id); saveThemes(left); if (cur === id) applyTheme('dark'); renderAll(); draw(); } } }, 'Delete')); } return wrap; };
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
function go(where) { view = 'server'; serverId = where; channelId = firstChannel(where); renderAll(); }

function newChannelFlow(categoryId, sv = serverId, after) {
  let kind = 'text';
  const name = el('input', { type: 'text', placeholder: 'new-channel', maxLength: 60 });
  const prefix = el('span', { className: 'pfx' }, icon('hash', 18));
  const opt = (k, ic, label, sub) => {
    const b = el('button', { className: 'kind' + (k === kind ? ' on' : ''), onclick: () => {
      kind = k; for (const x of kinds.children) x.classList.toggle('on', x === b);
      prefix.replaceChildren(icon(k === 'voice' ? 'volume' : 'hash', 18)); name.placeholder = k === 'voice' ? 'New Voice Channel' : 'new-channel'; name.focus();
    } }, icon(ic, 22), el('div', {}, el('b', {}, label), el('small', {}, sub)), el('span', { className: 'radio' }));
    return b;
  };
  const kinds = el('div', { className: 'kinds' }, opt('text', 'hash', 'Text', 'Send messages, pictures, stickers and opinions'), opt('voice', 'volume', 'Voice', 'Hang out together with voice and video'));
  const cats = Store.categories(sv);
  const catSel = cats.length > 1 ? sel(categoryId || cats[0].id, cats.map((c) => [c.id, c.name]), () => {}) : null;
  const create = el('button', { className: 'btn primary', textContent: 'Create Channel' });
  create.onclick = async () => {
    const n = name.value.trim(); if (!n) return name.focus();
    create.disabled = true;
    const id = await attempt(() => Store.addChannel(sv, catSel ? catSel.value : categoryId || (cats[0] || {}).id, n, kind));
    if (!id) { create.disabled = false; return; }
    m.close(); if (sv === serverId) channelId = id; renderAll(); if (after) after();
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create.click(); });
  const inCat = (cats.find((c) => c.id === categoryId) || {}).name;
  const m = modal({ title: 'Create Channel', sub: inCat ? 'in ' + inCat : '',
    body: [el('div', { className: 'field' }, el('label', {}, 'Channel type'), kinds), el('div', { className: 'field' }, el('label', {}, 'Channel name'), el('div', { className: 'with-prefix' }, prefix, name)),
      catSel ? el('div', { className: 'field' }, el('label', {}, 'Category'), catSel) : null],
    actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close() }), create] });
  setTimeout(() => name.focus(), 0);
}
async function newCategory(sv) {
  const n = await ask({ title: 'Create Category', label: 'Category name', placeholder: 'New Category', ok: 'Create Category', max: 60 });
  if (!n) return;
  await attempt(() => Store.addCategory(sv, n)); renderAll();
}
async function renameChannel(c) {
  const n = await ask({ title: 'Edit Channel', label: 'Channel name', value: c.name, ok: 'Save', max: 60 });
  if (!n) return;
  Store.updateChannel(c.id, { name: c.kind === 'voice' ? n : n.replace(/\s+/g, '-').toLowerCase() }); renderAll();
}
async function deleteChannel(c) {
  if (!(await confirmBox({ title: 'Delete Channel', text: `Are you sure you want to delete ${c.kind === 'voice' ? '' : '#'}${c.name}? Its messages go with it, and this can’t be undone.`, ok: 'Delete Channel', danger: true }))) return;
  Store.removeChannel(c.id); if (channelId === c.id) channelId = firstChannel(serverId); renderAll();
}
// Discord's "Select Friends": start a DM with a friend (or, signed in, anyone you share a server with)
function newDMDialog() {
  const people = new Map();
  for (const f of Store.friends()) people.set(f.id, f);
  if (Store.kind === 'supabase') for (const s of Store.servers()) for (const p of Store.members(s.id) || []) if (!p.me) people.set(p.id, p);
  const list = el('div', { className: 'pick-list' });
  const q = el('input', { type: 'search', placeholder: 'Type the name of a friend', className: 'pick-q' });
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const hits = [...people.values()].filter((p) => !s || String(p.name || '').toLowerCase().includes(s) || String(p.login || '').toLowerCase().includes(s));
    list.replaceChildren(...(hits.length ? hits.map((p) => el('button', { className: 'pick', onclick: () => { m.close(); openDM(normFriend(p)); } },
      avatarEl(p, { size: 32 }), el('span', { className: 'nm3' }, p.name), p.login ? el('span', { className: 'muted' }, '@' + p.login) : null))
      : [el('div', { className: 'empty-note' }, people.size ? 'Nobody by that name.' : 'No friends yet. Add some from the Friends page.')]));
  };
  q.oninput = draw;
  const m = modal({ title: 'Select Friends', sub: 'Start a conversation.', body: [q, list], actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close() })] });
  draw(); setTimeout(() => q.focus(), 0);
}
async function openDM(user) {
  const id = await attempt(() => Store.ensureDM(user));
  if (!id) return null;
  if (closedDMs.delete(id)) saveClosed();
  view = 'home'; dmId = id; renderAll();
  return id;
}
async function befriend(u) {
  if (Store.kind === 'supabase' && u.login) { const f = await attempt(() => Store.addFriendByHandle(u.login)); if (f) toast(`Added ${u.name} as a friend.`); }
  else { Store.addFriend(normFriend(u)); toast(Store.kind === 'supabase' ? `Added ${u.name} as a friend.` : `Added ${u.name} locally.`); }
  renderAll();
}
async function unfriend(u) {
  if (!(await confirmBox({ title: `Remove ‘${u.name}’`, text: `Are you sure you want to remove ${u.name} from your friends?`, ok: 'Remove Friend', danger: true }))) return;
  Store.removeFriend(u.id); renderAll();
}
// an invite: a whole link (…/Fluentdat/#invite=abc123) or just the code
const inviteCode = (s) => { s = String(s || '').trim(); const m = s.match(/invite=([0-9a-z]+)/i); return (m ? m[1] : s.replace(/^.*[/#=]/, '')).toLowerCase().slice(0, 32); };
const PENDING_INVITE = 'fluentdat.invite';
async function joinServer(raw) {
  if (raw == null) return joinFlow();
  const code = inviteCode(raw); if (!code) return;
  if (Store.kind !== 'supabase') {
    if (!Store.configured) return toast('Invites need Fluentdat’s sign-in, which isn’t set up yet.');
    try { localStorage.setItem(PENDING_INVITE, code); } catch {}
    return signInDialog(null, 'Sign in to join the server');
  }
  const id = await attempt(() => Store.joinServer(code));
  if (!id) return;
  go(id); toast(`Welcome to ${(Store.server(id) || {}).name || 'the server'}!`);
}
// Discord's "Join a Server"
function joinFlow(prefill = '') {
  const input = el('input', { type: 'text', value: prefill, placeholder: location.origin + location.pathname + '#invite=a1b2c3d4e5' });
  const join = el('button', { className: 'btn primary', textContent: 'Join Server' });
  const msg = el('div', { className: 'sg-msg' });
  join.onclick = async () => {
    const code = inviteCode(input.value);
    if (!code) { msg.textContent = 'Paste an invite link or code first.'; return input.focus(); }
    if (Store.kind !== 'supabase') { m.close(); return joinServer(code); }      // (that asks you to sign in first)
    join.disabled = true; msg.textContent = '';
    try { const id = await Store.joinServer(code); m.close(); go(id); toast(`Welcome to ${(Store.server(id) || {}).name || 'the server'}!`); }
    catch (e) { msg.textContent = String(e.message || e); join.disabled = false; }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join.click(); });
  const m = modal({ title: 'Join a Server', sub: 'Enter an invite below to join an existing server.', cls: 'center-title',
    body: [el('div', { className: 'field' }, el('label', {}, 'Invite link'), input), msg,
      el('div', { className: 'note-box' }, 'Invites look like ', el('code', {}, 'a1b2c3d4e5'), ' or ', el('code', {}, '…/Fluentdat/#invite=a1b2c3d4e5')),
      el('button', { className: 'btn ghost wide', style: 'margin-top:12px', onclick: () => { m.close(); view = 'discover'; renderAll(); } }, icon('compass', 16), 'No invite? Browse public servers')],
    actions: [el('button', { className: 'btn ghost', textContent: 'Back', onclick: () => { m.close(); addServerFlow(); } }), el('span', { style: 'flex:1' }), join] });
  setTimeout(() => input.focus(), 0);
}
// Discord's "Create Your Server": start from scratch or from a template, then a name and an icon
const TEMPLATES = [
  ['own', 'Create My Own', 'plus', []],
  ['robotics', 'Robotics Team', 'bot', [['Information', [['announcements'], ['rules']]], ['Text Channels', [['build-log'], ['programming'], ['strategy'], ['media']]], ['Voice Channels', [['Meeting', 'voice'], ['Pit', 'voice']]]]],
  ['study', 'Study Group', 'book', [['Information', [['welcome'], ['resources']]], ['Text Channels', [['homework-help'], ['session-planning'], ['off-topic']]], ['Voice Channels', [['Study Room 1', 'voice'], ['Study Room 2', 'voice']]]]],
  ['club', 'School Club', 'school', [['Information', [['welcome-and-rules'], ['announcements'], ['resources']]], ['Text Channels', [['meeting-plans'], ['off-topic']]], ['Voice Channels', [['Meeting Room', 'voice']]]]],
  ['gaming', 'Gaming', 'game', [['Information', [['welcome-and-rules'], ['announcements']]], ['Text Channels', [['clips-and-highlights'], ['looking-for-group']]], ['Voice Channels', [['Lobby', 'voice'], ['Gaming', 'voice']]]]],
  ['friends', 'Friends', 'users', [['Text Channels', [['games'], ['music']]], ['Voice Channels', [['Lounge', 'voice'], ['Stream Room', 'voice']]]]],
];
function addServerFlow() {
  const m = modal({ cls: 'create' });
  const tplBtn = (t) => el('button', { className: 'tpl', onclick: () => customize(t) }, el('span', { className: 'tpl-ic' }, icon(t[2], 22)), el('span', { className: 'tpl-nm' }, t[1]), icon('chevR', 18));
  const choose = () => m.fill([
    el('h3', { className: 'center' }, 'Create Your Server'),
    el('p', { className: 'dlg-sub center' }, 'Your server is where you and your friends hang out. Make yours and start talking.'),
    el('div', { className: 'tpl-list' }, tplBtn(TEMPLATES[0]), el('div', { className: 'tpl-head' }, 'Start from a template'), ...TEMPLATES.slice(1).map(tplBtn)),
    el('div', { className: 'create-foot' }, el('h4', {}, 'Have an invite already?'),
      el('button', { className: 'btn wide', onclick: () => { m.close(); joinFlow(); } }, 'Join a Server'),
      el('button', { className: 'btn ghost wide', onclick: () => { m.close(); view = 'discover'; renderAll(); } }, icon('compass', 16), 'Browse public servers'))]);
  const customize = (t) => {
    let img = '';
    const up = el('button', { className: 'up-circle', title: 'Upload an icon', onclick: () => pickFile(async (f) => {
      try { img = await shrink(f, 256, 256, 150000); up.replaceChildren(el('img', { src: img, alt: '' })); } catch (e) { toast(String(e.message || e)); }
    }) }, icon('cam', 24), el('span', {}, 'Upload'));
    const name = el('input', { type: 'text', value: `${me.name}’s server`, maxLength: 60 });
    const create = el('button', { className: 'btn primary', textContent: 'Create' });
    create.onclick = async () => {
      const n = name.value.trim(); if (!n) return name.focus();
      create.disabled = true; create.textContent = 'Creating…';
      const id = await attempt(() => Store.addServer(n, t[0] === 'robotics' ? 'bot' : ''));
      if (!id) { create.disabled = false; create.textContent = 'Create'; return; }
      if (img) Store.updateServer(id, { img });
      if (t[3].length) await attempt(() => Store.applyTemplate(id, t[3].map(([nm, channels]) => ({ name: nm, channels }))));
      m.close(); go(id); toast(`${n} is ready.`);
    };
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create.click(); });
    m.fill([el('h3', { className: 'center' }, 'Customize Your Server'),
      el('p', { className: 'dlg-sub center' }, 'Give your new server a personality with a name and an icon. You can always change it later.'),
      el('div', { className: 'center-row' }, up),
      el('div', { className: 'field' }, el('label', {}, 'Server name'), name),
      el('div', { className: 'row' }, el('button', { className: 'btn ghost', textContent: 'Back', onclick: choose }), el('span', { style: 'flex:1' }), create)]);
    setTimeout(() => { name.focus(); name.select(); }, 0);
  };
  choose();
}
// someone opened an invite link before (or while) signing in: join once signed in
function joinPendingInvite() {
  let code = null; try { code = localStorage.getItem(PENDING_INVITE); } catch {}
  if (!code || Store.kind !== 'supabase') return;
  try { localStorage.removeItem(PENDING_INVITE); } catch {}
  joinServer(code);
}
async function leaveServer(id) {
  const sv = Store.server(id);
  if (!sv || !(await confirmBox({ title: `Leave ‘${sv.name}’`, text: `Are you sure you want to leave ${sv.name}? You won’t be able to rejoin unless you’re re-invited${sv.public ? ' or find it in Discover' : ''}.`, ok: 'Leave Server', danger: true }))) return;
  if ((await attempt(() => Store.leaveServer(id))) === null) return;
  serverId = null; channelId = null; renderAll(); toast(`You left ${sv.name}.`);
}

function serverMenu(anchor) {
  closePop();
  const r = anchor.getBoundingClientRect();
  serverItems(Store.server(serverId), r.left + 8, r.bottom + 6);
}
// the server's menu (from its name, or right-clicking its icon)
function serverItems(s, x, y) {
  if (!s) return;
  const can = Store.canManage(s.id), live = Store.kind === 'supabase', owner = Store.role(s.id) === 'owner';
  menu([
    (live ? can : true) && { label: 'Invite People', icon: 'personAdd', action: () => openServerSettings(s.id, 'invite') },
    '-',
    { label: 'Server Settings', icon: 'gear', action: () => openServerSettings(s.id) },
    can && { label: 'Create Channel', icon: 'plusCircle', action: () => { if (serverId !== s.id) go(s.id); newChannelFlow(Store.categories(s.id)[0]?.id); } },
    can && { label: 'Create Category', icon: 'plus', action: () => newCategory(s.id) },
    '-',
    { label: 'Copy Server ID', icon: 'id', action: () => copyText(s.id, 'Server ID copied.') },
    live && !owner && '-', live && !owner && { label: 'Leave Server', icon: 'logout', danger: true, action: () => leaveServer(s.id) },
  ], x, y);
}
const serverCtx = (s, x, y) => serverItems(s, x, y);
function channelCtx(c, x, y) {
  const can = Store.canManage(serverId), live = Store.kind === 'supabase';
  menu([
    (live ? can : true) && { label: 'Invite People', icon: 'personAdd', action: () => openServerSettings(serverId, 'invite') },
    can && '-', can && { label: 'Edit Channel', icon: 'edit', action: () => renameChannel(c) },
    can && Store.channels(serverId).length > 1 && { label: 'Delete Channel', icon: 'trash', danger: true, action: () => deleteChannel(c) },
    '-', { label: 'Copy Channel ID', icon: 'id', action: () => copyText(c.id, 'Channel ID copied.') },
  ], x, y);
}
// someone's menu (member list, a message's author, a friend): profile, message, friend, roles, and the admin things
function memberCtx(u, x, y) {
  const self = isMe(u), live = Store.kind === 'supabase', sv = view === 'server' ? serverId : null;
  const can = sv && Store.canManage(sv), owner = sv && Store.role(sv) === 'owner';
  const m = sv && live ? (Store.members(sv) || []).find((p) => p.id === u.id) : null;
  const friend = Store.friends().some((f) => f.id === u.id);
  const above = m && !self && m.role !== 'owner' && (owner || (can && m.role === 'member'));
  menu([
    { label: 'Profile', icon: 'user', action: () => profileAt(u, x, y) },
    !self && !u.bot && { label: 'Message', icon: 'message', action: () => openDM(normFriend(u)) },
    !self && !u.bot && (friend ? { label: 'Remove Friend', action: () => unfriend(u) } : { label: 'Add Friend', icon: 'personAdd', action: () => befriend(u) }),
    '-',
    m && can && Store.roles(sv).length && { label: 'Roles', sub: () => roleItems(sv, u) },
    m && owner && !self && m.role !== 'owner' && { label: m.role === 'admin' ? 'Remove Admin' : 'Make Admin', icon: 'shield', action: () => setAdmin(sv, m, m.role !== 'admin') },
    above && '-', above && { label: `Remove ${u.name}`, danger: true, action: () => kick(sv, m) },
    above && { label: `Ban ${u.name}`, icon: 'ban', danger: true, action: () => banFlow(sv, m) },
    '-', { label: 'Copy User ID', icon: 'id', action: () => copyText(String(u.id || u.login || u.name), 'User ID copied.') },
  ], x, y);
}
function dmCtx(d, x, y) {
  menu([
    { label: 'Profile', icon: 'user', action: () => profileAt(d.user, x, y) },
    { label: 'Close DM', icon: 'x', action: () => { closedDMs.add(d.id); saveClosed(); if (dmId === d.id) dmId = null; renderAll(); } },
    '-', { label: 'Copy User ID', icon: 'id', action: () => copyText(String(d.user.id || d.user.name), 'User ID copied.') },
  ], x, y);
}
function messageCtx(m, x, y) {
  const where = view === 'home' ? { dm: true, id: dmId } : { dm: false, id: channelId };
  const mine = isMe(m.user) || (m.user.bot && m.user.via && m.user.via === (Store.account() || {}).login) || (Store.kind === 'local');
  const canDel = typeof Store.deleteMessage === 'function' && (mine || (!where.dm && Store.canManage(serverId)));
  menu([
    m.text && { label: 'Copy Text', icon: 'copy', action: () => copyText(m.text, 'Copied.') },
    !m.user.bot && !isMe(m.user) && { label: 'Profile', icon: 'user', action: () => profileAt(m.user, x, y) },
    canDel && '-', canDel && { label: 'Delete Message', icon: 'trash', danger: true, action: async () => {
      if (await confirmBox({ title: 'Delete Message', text: 'Are you sure you want to delete this message?', ok: 'Delete', danger: true })) Store.deleteMessage(where, m.id);
    } },
    '-', { label: 'Copy Message ID', icon: 'id', action: () => copyText(String(m.id), 'Message ID copied.') },
  ], x, y);
}
// a profile card at a spot on the screen (from a menu)
function profileAt(u, x, y) { const spot = el('div', { style: `position:fixed;left:${x}px;top:${y}px;width:1px;height:1px` }); document.body.append(spot); showProfile(u, spot); spot.remove(); }
// tick boxes for each of the server's roles (admins)
function roleItems(sv, u) {
  const has = ((Store.members(sv) || []).find((p) => p.id === u.id) || {}).roles || [];
  return Store.roles(sv).map((r) => ({ label: r.name, color: safeColor(r.color, '#99aab5'), check: has.includes(r.id), action: async () => {
    const on = !has.includes(r.id);
    if ((await attempt(() => Store.giveRole(sv, u.id, r.id, on))) !== null) toast(on ? `${u.name} is now ${r.name}.` : `${u.name} is no longer ${r.name}.`);
  } }));
}
async function setAdmin(sv, m, on) {
  if ((await attempt(() => Store.setMemberRole(sv, m.id, on ? 'admin' : 'member'))) === null) return;
  toast(on ? `${m.name} is now an admin.` : `${m.name} is no longer an admin.`); renderAll();
}
async function kick(sv, m, after) {
  if (!(await confirmBox({ title: `Remove ‘${m.name}’ from ${(Store.server(sv) || {}).name}`, text: 'They can come back only with a new invite (or from Discover, if the server is public).', ok: 'Remove', danger: true }))) return;
  if ((await attempt(() => Store.removeMember(sv, m.id))) === null) return;
  toast(`${m.name} was removed.`); renderAll(); if (after) after();
}
function banFlow(sv, m, after) {
  const reason = el('textarea', { maxLength: 200, placeholder: 'Optional: why (only admins see this)' });
  const ban = el('button', { className: 'btn red', textContent: 'Ban' });
  ban.onclick = async () => {
    ban.disabled = true;
    if ((await attempt(() => Store.ban(sv, m.id, reason.value.trim()))) === null) { ban.disabled = false; return; }
    w.close(); toast(`${m.name} is banned.`); renderAll(); if (after) after();
  };
  const w = modal({ title: `Ban ‘${m.name}’`, sub: 'They’re removed now, and can’t come back by invite or from Discover until the ban is lifted (Server Settings → Bans).',
    body: [el('div', { className: 'field' }, el('label', {}, 'Reason'), reason)], actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), ban] });
}

// ---------- Discover: public servers ----------
const DISCOVER_CATS = [['', 'Home', 'compass'], ['Robotics', 'Robotics', 'bot'], ['Gaming', 'Gaming', 'game'], ['Music', 'Music', 'music'], ['Entertainment', 'Entertainment', 'film'],
  ['Science & Tech', 'Science & Tech', 'flask'], ['Education', 'Education', 'school'], ['Art', 'Art', 'brush'], ['Friends', 'Hangouts', 'users'], ['Other', 'Other', 'sparkle']];
let discoverSeq = 0;
function discoverPage() {
  const q = el('input', { type: 'search', placeholder: 'Explore public servers', value: discoverQ });
  const grid = el('div', { className: 'disc-grid' });
  const cat = DISCOVER_CATS.find((c) => c[0] === discoverCat) || DISCOVER_CATS[0];
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { discoverQ = q.value.trim(); load(); }, 250); });
  async function load() {
    const seq = ++discoverSeq;
    if (Store.kind !== 'supabase') {
      grid.replaceChildren(el('div', { className: 'empty-note' }, Store.configured ? 'Sign in to browse public servers and join them.' : 'Public servers come with Fluentdat’s sign-in, which isn’t set up yet.',
        Store.configured ? el('div', { style: 'margin-top:14px' }, el('button', { className: 'btn primary', onclick: () => signInDialog() }, 'Sign In')) : null));
      return;
    }
    grid.replaceChildren(el('div', { className: 'empty-note' }, 'Looking…'));
    let list;
    try { list = await Store.discover(discoverQ, discoverCat); } catch (e) { if (seq === discoverSeq) grid.replaceChildren(el('div', { className: 'empty-note' }, String(e.message || e))); return; }
    if (seq !== discoverSeq) return;
    grid.replaceChildren(...(list.length ? list.map(discoverCard) : [el('div', { className: 'empty-note' },
      discoverQ ? `No public servers match “${discoverQ}”.` : 'No public servers here yet. Owners can list theirs in Server Settings → Discovery.')]));
  }
  load();
  return el('div', { className: 'disc' },
    el('div', { className: 'disc-hero' }, el('h1', {}, discoverCat ? cat[1] : 'Find your community on Fluentdat'),
      el('p', {}, discoverCat ? `Public ${cat[1].toLowerCase()} servers anyone can join.` : 'From robotics to music to homework help, there’s a place for you.'),
      el('label', { className: 'disc-search' }, icon('search', 18), q)),
    el('h3', { className: 'disc-title' }, discoverQ ? 'Results' : discoverCat ? cat[1] : 'Featured servers'), grid);
}
function discoverCard(s) {
  const banner = el('div', { className: 'dc-banner' }); banner.style.background = paint(s.banner) || 'var(--input)';
  const ic = el('div', { className: 'dc-icon' }), img = safeImg(s.img);
  if (img) ic.append(el('img', { src: img, alt: '' })); else if (ICON[s.icon]) ic.append(icon(s.icon, 26)); else ic.textContent = initials(s.name);
  const btn = el('button', { className: 'btn small ' + (s.joined ? '' : 'primary') }, s.joined ? 'Open' : 'Join');
  btn.onclick = async () => {
    if (s.joined) return go(s.id);
    btn.disabled = true; const id = await attempt(() => Store.joinPublic(s.id)); btn.disabled = false;
    if (id) { go(id); toast(`Welcome to ${s.name}!`); }
  };
  return el('div', { className: 'dc' }, banner, ic, el('div', { className: 'dc-body' },
    el('div', { className: 'dc-name' }, s.name), el('div', { className: 'dc-desc' }, s.description || 'No description yet.'),
    el('div', { className: 'dc-foot' }, el('span', { className: 'dc-count' }, el('i', {}), `${s.members} Member${s.members === 1 ? '' : 's'}`), s.category ? el('span', { className: 'chip' }, s.category) : null, el('span', { style: 'flex:1' }), btn)));
}


// ---------- wiring ----------
$('#sticker-btn').append(icon('sticker')); $('#sticker-btn').title = 'Stickers'; $('#send-btn').append(icon('send'));
const input = $('#input');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(innerHeight * 0.4, input.scrollHeight) + 'px'; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && prefs.sendOnEnter) { e.preventDefault(); send(); } });
$('#send-btn').onclick = () => { send(); input.focus(); };
$('#sticker-btn').onclick = (e) => { e.stopPropagation(); togglePicker('stickers'); };
document.addEventListener('click', (e) => {
  if (picker && !picker.contains(e.target) && !e.target.closest('#composer .tool')) closePicker();
  if (pop && !pop.contains(e.target) && !e.target.closest('.msg .nm, .msg .avatar, #me-panel .avatar, #me-panel .who, .mem, .side-head, .ctx')) closePop();
});
$('#c-mic').onclick = () => { if (!stream) return; toggleMic(); };
$('#c-cam').onclick = () => { if (!stream) return; camOn = !camOn; stream.getVideoTracks().forEach((t) => { t.enabled = camOn; }); syncCallButtons(); };
$('#c-leave').onclick = closeCall;
addEventListener('resize', closePop);

let lastError = '';
Store.onChange(() => {
  if (Store.kind === 'supabase') adoptProfile();          // (your profile can change on another device)
  renderAll(); alertNew();
  const err = Store.syncState().error || '';
  if (err && err !== lastError && Store.kind === 'supabase') toast(err);
  lastError = err;
});

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
  if (prefs.sound && !prefs.deafened) blip();
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
function loadPrefs() {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('fluentdat.prefs')) || {}; } catch {}
  const p = { ...DEFAULT_PREFS, ...saved, hidden: { ...(saved.hidden || {}) }, order: { ...(saved.order || {}) } };
  // (from before every button could be changed: a few had their own switches)
  if (saved.callBtns === 'off') p.hidden.call = p.hidden.video = true;
  if (saved.composerSticker === 'off') p.hidden.sticker = true;
  if (saved.composerSend === 'off') p.hidden.send = true;
  delete p.callBtns; delete p.composerSticker; delete p.composerSend;
  return p;
}
// what a layout preset or reset leaves alone (they're not about layout)
const KEEP = ['notify', 'sound', 'sendOnEnter', 'dmFrom', 'micMuted', 'deafened', 'reduceMotion', 'highContrast'];
const keepOf = () => Object.fromEntries(KEEP.filter((k) => k in prefs).map((k) => [k, prefs[k]]));
function savePrefs() { try { localStorage.setItem('fluentdat.prefs', JSON.stringify(prefs)); } catch {} applyPrefs(); }
function applyPrefs() {
  const d = document.documentElement, S = (k, v) => d.setAttribute('data-' + k, v);
  S('density', prefs.density);
  S('motion', prefs.reduceMotion ? 'off' : 'on');
  S('contrast', prefs.highContrast ? 'high' : 'normal');
  for (const [attr, val] of [['rail', prefs.rail], ['railsize', prefs.railSize], ['iconshape', prefs.iconShape], ['sidew', prefs.sideW],
    ['chanicons', prefs.chanIcons], ['cats', prefs.cats], ['sidehead', prefs.sideHead], ['userpanel', prefs.userPanel],
    ['topbar', prefs.topbar], ['banner', prefs.banner], ['avatars', prefs.avatars],
    ['avatarshape', prefs.avatarShape], ['dividers', prefs.dividers], ['memberw', prefs.memberW], ['hover', prefs.hover],
    ['radius', prefs.radius], ['uifont', prefs.uiFont], ['btnsize', prefs.btnSize], ['btnlabels', prefs.btnLabels]]) S(attr, val);
  d.style.setProperty('--banner-h', { s: '96px', m: '136px', l: '180px' }[prefs.bannerH] || '136px');
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

// opened an invite link (…/Fluentdat/#invite=abc123)? keep it while you sign in (Discord takes you away and back)
{
  const m = location.hash.match(/invite=([0-9a-z]+)/i);
  if (m) { try { localStorage.setItem(PENDING_INVITE, m[1].toLowerCase()); } catch {} history.replaceState(null, '', location.pathname + location.search); }
}
ready.then((ok) => {
  if (ok) { adoptProfile(); renderAll(); joinPendingInvite(); return; }
  if (Store.resumeError) toast('Sign-in trouble: ' + Store.resumeError);
  let code = null; try { code = localStorage.getItem(PENDING_INVITE); } catch {}
  if (code && Store.configured) signInDialog(null, 'Sign in to join the server you were invited to');
  else if (code) { try { localStorage.removeItem(PENDING_INVITE); } catch {} toast('Invites need Fluentdat’s sign-in, which isn’t set up yet.'); }
});

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

// ===================== signing in =====================
// Discord, GitHub or an emailed link/code (Supabase), and the older paste-a-GitHub-token way for the data repository
function signInDialog(after, title) {
  const box = el('div', { className: 'dialog sg' });
  const scrim = el('div', { className: 'scrim' }, box);
  const msg = el('div', { className: 'sg-msg' });
  const say = (e) => { msg.textContent = e ? String(e.message || e) : ''; };
  const close = () => scrim.remove();
  const done = (who) => { close(); adoptProfile(); renderAll(); toast(`Signed in as @${who}.`); after && after(); joinPendingInvite(); };
  const cancel = el('button', { className: 'btn', textContent: 'Cancel', onclick: close });

  function home() {
    if (!Store.configured) return tokenForm(true);
    say();
    const email = el('input', { type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
    const send = el('button', { className: 'btn primary', textContent: 'Email me a link' });
    send.onclick = async () => {
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say('Type your email address first.'); email.focus(); return; }
      send.disabled = true; send.textContent = 'Sending…'; say();
      try { await Store.signInEmail(v); codeStep(v); }
      catch (e) { say(e); send.disabled = false; send.textContent = 'Email me a link'; }
    };
    email.onkeydown = (e) => { if (e.key === 'Enter') send.click(); };
    const provider = (id, label) => el('button', { className: 'sg-btn ' + id, onclick: async (e) => {
      const b = e.currentTarget; b.disabled = true; say();
      try { await Store.signInOAuth(id); b.lastChild.textContent = 'Opening ' + label + '…'; }   // (the page now goes to them and comes back)
      catch (err) { say(err); b.disabled = false; }
    } }, brand(id), el('span', {}, 'Continue with ' + label));
    box.replaceChildren(
      el('h3', {}, title || 'Sign in to Fluentdat'),
      el('p', { className: 'sg-sub' }, 'Chat with your team: servers, DMs and friends, live on every device.'),
      el('div', { className: 'sg-btns' }, provider('discord', 'Discord'), provider('github', 'GitHub')),
      el('div', { className: 'sg-or' }, el('span', {}, 'or with your email')),
      el('div', { className: 'sg-row' }, email, send),
      msg,
      el('div', { className: 'row' }, el('button', { className: 'btn ghost', onclick: () => tokenForm(false) }, icon('key', 16), ' GitHub token instead'), el('span', { style: 'flex:1' }), cancel));
  }

  function codeStep(address) {
    say();
    const code = el('input', { inputMode: 'numeric', autocomplete: 'one-time-code', placeholder: 'Code from the email', maxLength: 10 });
    const go = el('button', { className: 'btn primary', textContent: 'Sign in' });
    go.onclick = async () => {
      const v = code.value.replace(/\s+/g, '');
      if (!/^\d{6,10}$/.test(v)) { say('The code is the 6 to 10 digits in the email.'); code.focus(); return; }
      go.disabled = true; go.textContent = 'Checking…'; say();
      try { const acc = await Store.verifyEmailCode(address, v); done(acc ? acc.login : address); }
      catch (e) { say(e); go.disabled = false; go.textContent = 'Sign in'; }
    };
    code.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    box.replaceChildren(
      el('h3', {}, 'Check your email'),
      el('div', { className: 'sg-mail' }, icon('mail', 22), el('div', {}, 'We sent a sign-in link to ', el('b', {}, address), '. Open it in this browser and you’re in.')),
      el('div', { className: 'field', style: 'margin-top:18px' }, el('label', {}, 'Reading it on your phone? Type the code from the email here'), el('div', { className: 'sg-row' }, code, go)),
      msg,
      el('div', { className: 'row' }, el('button', { className: 'btn ghost', textContent: 'Use a different way', onclick: home }), el('span', { style: 'flex:1' }), el('button', { className: 'btn', textContent: 'Close', onclick: close })));
    code.focus();
  }

  function tokenForm(only) {
    say();
    const tok = el('input', { type: 'password', placeholder: 'github_pat_...', style: 'width:100%;background:var(--input);border:1px solid var(--line);border-radius:9px;padding:10px 12px;color:var(--text);font:inherit' });
    const go = el('button', { className: 'btn primary', textContent: 'Sign in' });
    go.onclick = async () => {
      const t = tok.value.trim(); if (!t) return;
      go.textContent = 'Checking…'; go.disabled = true; say();
      try { const r = await Store.signIn(t); close(); adoptProfile(); toast(`Signed in as ${r.login}. Your team’s data is syncing.`); renderAll(); after && after(); }
      catch (e) { say(e); go.textContent = 'Sign in'; go.disabled = false; }
    };
    tok.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    box.replaceChildren(
      el('h3', {}, only ? 'Sign in with GitHub' : 'Sign in with a GitHub token'),
      el('div', { className: 'note-box' },
        el('div', {}, 'This is the older way: Fluentdat keeps your team’s messages in the private ', el('b', {}, 'Fluentdat-Data'), ' repository, and needs a fine grained token to read and write there. The token stays in this browser only.'),
        el('ol', {},
          el('li', {}, 'On GitHub: Settings → Developer settings → Personal access tokens → ', el('b', {}, 'Fine-grained tokens'), ' → Generate new token'),
          el('li', {}, 'Repository access: ', el('b', {}, 'Only select repositories'), ' → Fluentdat-Data'),
          el('li', {}, 'Permissions → Repository permissions → ', el('b', {}, 'Contents: Read and write')),
          el('li', {}, 'Generate it, copy the token, and paste it below'))),
      el('div', { className: 'field', style: 'margin-top:16px' }, el('label', {}, 'Token'), tok), msg,
      el('div', { className: 'row' }, only ? null : el('button', { className: 'btn ghost', textContent: 'Back', onclick: home }), el('span', { style: 'flex:1' }), cancel));
    tok.focus();
  }

  scrim.onclick = (e) => { if (e.target === scrim) close(); };
  document.body.append(scrim);
  home();
}
// on signing in: take the profile that's already on GitHub, or put this browser's up there
function adoptProfile() {
  if (!Store.signedIn) return;
  const p = Store.myProfile();
  if (p && p.name) {
    const next = { ...me, name: p.name, color: p.color || me.color, avatar: p.avatar || '', pronouns: p.pronouns || '', about: p.about || '', status: p.status || me.status,
      banner: p.banner || '', plate: p.plate || '' };
    if (p.id) next.id = p.id;
    if (JSON.stringify(next) !== JSON.stringify(me)) { me = next; saveMe(); }
  }
  else pushProfile();
}
const pushProfile = () => { if (Store.signedIn) Store.setProfile({ name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status, banner: me.banner || '', plate: me.plate || '' }); };

// choose a banner or nameplate: nothing, one of the gradients, or your own picture (made small enough to keep)
function picturePicker(value, onPick, { w = 960, h = 540, label = 'Upload a picture' } = {}) {
  const grid = el('div', { className: 'grads' });
  const draw = (v) => grid.replaceChildren(
    el('button', { className: 'grad none' + (!v ? ' on' : ''), title: 'None', onclick: () => { draw(''); onPick(''); } }, icon('ban', 18)),
    ...GRADS.map((g, i) => { const b = el('button', { className: 'grad' + (v === 'g:' + i ? ' on' : ''), title: 'Gradient ' + (i + 1), onclick: () => { draw('g:' + i); onPick('g:' + i); } }); b.style.background = g; return b; }),
    el('button', { className: 'grad up' + (v && v.startsWith('data:') ? ' on' : ''), title: label, onclick: () => pickFile(async (f) => {
      try { const d = await shrink(f, w, h, w > 600 ? 380000 : 190000); draw(d); onPick(d); } catch (e) { toast(String(e.message || e)); }
    }) }, v && v.startsWith('data:') ? el('img', { src: safeImg(v), alt: '' }) : icon('image', 18)));
  draw(value || '');
  return grid;
}

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
    { id: 'signout', label: Store.signedIn ? 'Sign Out' : 'Reset Local Data', cls: 'danger', icon: 'logout', action: async (shut) => {
        if (Store.signedIn) { if (await confirmBox({ title: 'Log Out', text: Store.kind === 'supabase' ? 'Sign out of Fluentdat in this browser?' : 'Sign out? Your team data stays on GitHub; this browser goes back to local only.', ok: 'Log Out', danger: true })) { await Store.signOut(); shut(); toast('Signed out.'); } }
        else if (await confirmBox({ title: 'Reset Local Data', text: 'Clear everything stored in this browser (servers, messages, stickers)?', ok: 'Clear Everything', danger: true })) { Store.reset(); shut(); toast('Local data cleared.'); }
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
  const acc = Store.account(), live = Store.kind === 'supabase';
  const via = live ? { discord: 'Discord', github: 'GitHub', email: 'email' }[acc.provider] || acc.provider : '';
  const out = [el('h2', {}, 'My Account'), el('p', { className: 'sub' }, 'Who you are in Fluentdat, and where your data lives.')];
  out.push(el('div', { style: 'display:flex;align-items:center;gap:16px;padding:18px;background:var(--side);border-radius:12px;margin-bottom:12px' },
    avatarEl(asMember(), { size: 64 }),
    el('div', { style: 'flex:1;min-width:0' },
      el('div', { style: 'font-weight:700;color:var(--bright);font-size:1.15rem' }, me.name),
      el('div', { style: 'color:var(--muted);font-size:.86rem' }, live ? `@${acc.login} · signed in with ${via}` : acc ? '@' + acc.login + ' on GitHub' : 'Signed out — this browser only'),
      me.about ? el('div', { style: 'margin-top:6px;font-size:.88rem' }, me.about) : null),
    el('button', { className: 'btn', onclick: () => openUserSettings.ref.go('profile') }, 'Edit Profile')));
  out.push(el('h3', {}, 'Account'));
  const signOut = el('button', { className: 'btn', onclick: async () => { if (await confirmBox({ title: 'Log Out', text: live ? 'Sign out of Fluentdat in this browser?' : 'Sign out of GitHub?', ok: 'Log Out', danger: true })) { await Store.signOut(); redraw(); renderAll(); } } }, 'Sign Out');
  if (live) {
    out.push(row2('Signed in', `With ${via}. Your servers, DMs and friends follow you to any device you sign in on.`, signOut));
    out.push(row2('Your @handle', 'Friends add you with this. Share it with people you want to hear from.', el('button', { className: 'btn', onclick: () => copyText('@' + acc.login, 'Copied @' + acc.login) }, 'Copy @' + acc.login)));
    if (acc.email) out.push(row2('Email', 'Only you can see this.', el('span', { className: 'chip' }, acc.email)));
  } else {
    out.push(row2(acc ? 'GitHub account' : 'Sign in', acc ? 'Signed in with a token. Messages, profiles and DMs sync through the data repository.'
      : Store.configured ? 'With Discord, GitHub or email: chat live with your team, and pick up where you left off on any device.' : 'Sign in to share servers, messages and DMs with your team.',
      acc ? signOut : el('button', { className: 'btn primary', onclick: () => signInDialog(redraw) }, 'Sign In')));
    out.push(row2('User ID', 'Handy when someone needs to add you.', el('button', { className: 'btn', onclick: () => { const v = acc ? acc.login : me.id; copyText(v, 'Copied ' + v); } }, 'Copy')));
  }
  out.push(row2('Status', 'How you show up to everyone else.', sel(me.status, STATUSES, (v) => { me.status = v; saveMe(); pushProfile(); renderAll(); })));
  return out;
}

function profilePane(redraw) {
  const name = el('input', { type: 'text', value: me.name, maxLength: 24 });
  const pron = el('input', { type: 'text', value: me.pronouns || '', maxLength: 24, placeholder: 'she/her, they/them…' });
  const about = el('textarea', { value: me.about || '', maxLength: 300, placeholder: 'A little about you', className: 'area' });
  let color = me.color, avatar = me.avatar || '', banner = me.banner || '', plate = me.plate || '';
  // a live preview: your card, and your nameplate as it shows in member lists
  const pvBanner = el('div', { className: 'pv-banner' }), pvAv = el('div', { className: 'pv-av' }), pvName = el('div', { className: 'pv-name' }), pvAbout = el('div', { className: 'pv-desc' });
  const pvRow = el('div', { className: 'mem pv-row' });
  const draw = () => {
    const u = { name: name.value || 'You', color, avatar, status: me.status, me: true };
    setBanner(pvBanner, banner, color);
    pvAv.replaceChildren(avatarEl(u, { size: 64 })); pvName.textContent = u.name; pvAbout.textContent = about.value;
    const nm = el('div', { className: 'nm' }, u.name); nm.style.setProperty('--who', safeColor(color));
    pvRow.replaceChildren(avatarEl(u), el('div', { className: 'who' }, nm)); plateOn(pvRow, plate);
  };
  name.oninput = draw; about.oninput = draw;
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => { const b = el('button', { className: c === color ? 'on' : '' }); b.style.background = c; b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); draw(); }; return b; }));
  const save = () => {
    me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color, avatar, pronouns: pron.value.trim(), about: about.value.trim(), banner, plate };
    saveMe(); pushProfile(); renderAll(); toast('Profile saved.');
  };
  draw();
  return [el('h2', {}, 'Profile'), el('p', { className: 'sub' }, Store.signedIn ? 'This is what everyone else sees.' : 'Saved in this browser. Sign in to share it.'),
    el('div', { className: 'sv-prof' }, el('div', { className: 'sv-form' },
      el('h3', {}, 'Avatar'),
      el('div', { className: 'btn-row' },
        el('button', { className: 'btn primary', onclick: () => pickFile(async (f) => { try { avatar = await shrink(f, 256, 256, 150000); draw(); } catch (e) { toast(String(e.message || e)); } }) }, 'Change Avatar'),
        el('button', { className: 'btn ghost', onclick: () => { avatar = ''; draw(); } }, 'Use colour')),
      el('div', { style: 'margin-top:10px' }, swatches),
      el('h3', {}, 'Profile banner'), el('p', { className: 'hint' }, 'The top of your profile card.'),
      picturePicker(banner, (v) => { banner = v; draw(); }, { w: 680, h: 240, label: 'Upload a banner' }),
      el('h3', {}, 'Nameplate'), el('p', { className: 'hint' }, 'Behind your name in member lists, DMs and your panel.'),
      picturePicker(plate, (v) => { plate = v; draw(); }, { w: 480, h: 96, label: 'Upload a nameplate' }),
      el('h3', {}, 'Details'),
      row2('Display name', 'Shown on every message you send.', name),
      row2('Pronouns', 'Under your name on your profile card.', pron),
      el('div', { style: 'padding:14px 0' }, el('div', { style: 'font-weight:600;color:var(--bright);margin-bottom:6px' }, 'About me'), about),
      el('div', { className: 'row', style: 'justify-content:flex-start' }, el('button', { className: 'btn primary', onclick: save }, 'Save Profile'))),
    el('div', { className: 'pv-col' }, el('div', { className: 'pv-label' }, 'Preview'), el('div', { className: 'pv-card' }, pvBanner, el('div', { className: 'pv-body' }, pvAv, pvName, pvAbout)), el('div', { className: 'pv-label' }, 'Nameplate'), pvRow))];
}

function syncPane(redraw) {
  const st = Store.syncState(), acc = Store.account();
  const out = [el('h2', {}, 'Data & Sync'), el('p', { className: 'sub' }, 'Where Fluentdat keeps your servers, messages and profile.')];
  if (Store.kind === 'supabase') {
    out.push(row2('Storing in', 'Fluentdat’s database (Supabase), shared with the people in your servers', el('span', { className: 'chip good' }, 'Live')));
    out.push(row2('Last loaded', st.lastSync ? new Date(st.lastSync).toLocaleTimeString() : 'not yet', el('button', { className: 'btn', onclick: () => { Store.syncNow(); toast('Reloading…'); setTimeout(redraw, 900); } }, 'Reload')));
    if (st.error) out.push(el('div', { className: 'note-box', style: 'border:1px solid #e5534b;color:#e5534b;margin-top:10px' }, st.error));
    out.push(el('h3', {}, 'How it works'));
    out.push(el('div', { className: 'note-box' }, 'New messages arrive the moment they’re sent. The database itself decides who can read what, so it holds even if someone edits the app: only a server’s members can read its channels, only the two people in a DM can read it, and nobody can post as somebody else.'));
  } else if (acc) {
    out.push(row2('Storing in', st.repo + ' (private repository)', el('span', { className: 'chip good' }, 'GitHub')));
    out.push(row2('Last synced', st.lastSync ? new Date(st.lastSync).toLocaleTimeString() : 'not yet', el('button', { className: 'btn', onclick: () => { Store.syncNow(); toast('Syncing…'); setTimeout(redraw, 900); } }, 'Sync Now')));
    if (st.error) out.push(el('div', { className: 'note-box', style: 'border:1px solid #e5534b;color:#e5534b;margin-top:10px' }, st.error));
    out.push(el('h3', {}, 'How it works'));
    out.push(el('div', { className: 'note-box' }, 'Every message is a commit in the private repository, written with your own token. Fluentdat checks for new messages every few seconds, so things land a second or two apart rather than instantly. Anyone you want in the team needs to be a collaborator on that repository and sign in with their own token.'));
  } else {
    out.push(row2('Storing in', 'This browser only (nothing leaves your device)', el('span', { className: 'chip' }, 'Local')));
    out.push(el('div', { className: 'note-box', style: 'margin-top:10px' }, 'Right now everything is kept in this browser. Clearing site data would wipe it, and nobody else can see it. Sign in to share with your team and keep it safe.'));
    out.push(el('div', { className: 'row' }, el('button', { className: 'btn primary', onclick: () => signInDialog(redraw) }, 'Sign In')));
  }
  out.push(el('h3', {}, 'Your data'));
  out.push(row2('Export', 'Download everything this browser has as a JSON file.', el('button', { className: 'btn', onclick: () => {
    const blob = new Blob([Store.dump()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'fluentdat-data.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } }, 'Export JSON')));
  out.push(row2('Clear local data', 'Servers, messages and stickers stored in this browser.', el('button', { className: 'btn danger', onclick: async () => { if (await confirmBox({ title: 'Clear Local Data', text: 'Clear everything stored in this browser?', ok: 'Clear', danger: true })) { Store.reset(); toast('Local data cleared.'); renderAll(); } } }, 'Clear')));
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
    Store.kind === 'supabase'
      ? row2('Who can DM me', 'People you share a server with, and people you’ve added as a friend. Nobody else can start a conversation with you.', el('span', { className: 'chip good' }, 'Enforced'))
      : row2('Who can DM me', 'Applies to new conversations started from your profile.', sel(prefs.dmFrom, [['anyone', 'Anyone'], ['friends', 'Friends only'], ['none', 'No one']], (v) => { prefs.dmFrom = v; savePrefs(); })),
    el('h3', {}, 'What Fluentdat knows'),
    el('div', { className: 'note-box' },
      el('div', {}, 'There are no ads and no analytics. Nothing is tracked, and nothing is sent anywhere except:'),
      el('ol', {},
        el('li', {}, 'Signed out: everything stays in this browser.'),
        el('li', {}, 'Signed in with Discord, GitHub or email: your servers, messages and profile are kept in Fluentdat’s Supabase database. Fluentdat gets your email address and your Discord or GitHub name and picture, never your password.'),
        el('li', {}, 'Signed in with a GitHub token: messages go to the private data repository, written with your own token, which stays in this browser.'))),
    el('h3', {}, 'Be aware'),
    el('div', { className: 'note-box' }, Store.kind === 'github'
      ? 'Anyone who can read the data repository can read every message in it, and git keeps history, so a deleted message still exists in earlier commits. Treat it like a shared notebook, not a secure vault.'
      : 'Everyone in a server can read all of its channels, including messages from before they joined, and its admins can delete anyone’s messages there. A DM is between the two of you. Fluentdat isn’t end-to-end encrypted, so don’t share passwords or anything secret in it.')];
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
      el('div', {}, el('b', {}, 'Fluentdat'), ' — servers, channels, DMs, friends, stickers and themes. The app is a static site; your data is in this browser, in Fluentdat’s Supabase database when you sign in, or in a private GitHub repository the older way.'),
      el('ol', {}, el('li', {}, 'Built by TrixWotel'), el('li', {}, 'Map of the stack: static HTML, CSS and JavaScript modules — no framework, no build step'), el('li', {}, 'Data layer swaps between this browser, Supabase and GitHub without the UI knowing'))),
    el('h3', {}, 'Storage in use'),
    row2('Backend', Store.backend, el('span', { className: 'chip ' + (Store.signedIn ? 'good' : '') }, { supabase: 'Supabase', github: 'GitHub', local: 'Local' }[Store.kind]))];
}

// ===================== server settings =====================
function openServerSettings(svId, section = 'profile') {
  const sv = Store.server(svId); if (!sv) return;
  const can = Store.canManage(svId), owner = Store.role(svId) === 'owner', live = Store.kind === 'supabase';
  if (section === 'overview') section = 'profile';
  const state = {};                       // (which role is open in Roles, between redraws)
  const nav = [
    { head: () => (Store.server(svId) || sv).name },
    { id: 'profile', label: 'Server Profile', icon: 'gear' },
    live && can && { id: 'discovery', label: 'Discovery', icon: 'compass' },
    can && { id: 'channels', label: 'Channels', icon: 'hash' },
    can && { id: 'categories', label: 'Categories', icon: 'menu' },
    { head: 'People' },
    { id: 'members', label: 'Members', icon: 'users' },
    live && can && { id: 'roles', label: 'Roles', icon: 'tag' },
    can && { id: 'invite', label: 'Invites', icon: 'personAdd' },
    live && can && { id: 'bans', label: 'Bans', icon: 'ban' },
    { hr: true },
    owner ? { id: 'danger', label: 'Delete Server', cls: 'danger', icon: 'trash' }
      : live && { id: 'leave', label: 'Leave Server', cls: 'danger', icon: 'logout', action: (shut) => { shut(); leaveServer(svId); } },
  ].filter(Boolean);
  if (!nav.some((n) => n.id === section)) section = 'profile';
  overlay(nav, section, (sec, redraw, shut) => {
    const cur = Store.server(svId) || sv;
    if (sec === 'discovery') return svDiscovery(cur, redraw, shut);
    if (sec === 'channels') return svChannels(cur, redraw);
    if (sec === 'categories') return svCategories(cur, redraw);
    if (sec === 'members') return svMembers(cur, redraw);
    if (sec === 'roles') return svRoles(cur, redraw, state);
    if (sec === 'invite') return svInvite(cur);
    if (sec === 'bans') return svBans(cur);
    if (sec === 'danger') return svDanger(cur, shut);
    return svOverview(cur, redraw, can);
  });
}

function svOverview(sv, redraw, can) {
  if (can) return svProfile(sv, redraw);
  const icon0 = el('div', { className: 'srv', style: 'width:72px;height:72px;border-radius:22px' }), img = safeImg(sv.img);
  if (img) icon0.append(el('img', { src: img, alt: '' })); else if (ICON[sv.icon]) icon0.append(icon(sv.icon, 32)); else icon0.textContent = initials(sv.name);
  const owner = (Store.members(sv.id) || []).find((m) => m.role === 'owner');
  return [el('h2', {}, sv.name), el('p', { className: 'sub' }, 'Only this server’s admins can change its name, icon and channels.'),
    el('div', { className: 'avatar-edit', style: 'padding:12px 0' }, icon0),
    sv.description ? el('div', { className: 'note-box', style: 'margin-bottom:10px' }, sv.description) : null,
    row2('Your role', 'Admins can make channels and invites. The owner decides who’s an admin.', el('span', { className: 'chip role ' + (Store.role(sv.id) || 'member') }, { owner: 'Owner', admin: 'Admin' }[Store.role(sv.id)] || 'Member')),
    owner ? row2('Owner', '', el('span', { className: 'chip' }, owner.name)) : null,
    row2('Channels', String(Store.channels(sv.id).length), null),
    row2('Members', String((Store.members(sv.id) || []).length), null)];
}
// name, icon, banner and description, with a preview of how it looks to everyone
function svProfile(sv, redraw) {
  const name = el('input', { type: 'text', value: sv.name, maxLength: 60, className: 'wide-in' });
  const desc = el('textarea', { value: sv.description || '', maxLength: 300, placeholder: 'How did your server get started? Why should people join?', className: 'area' });
  let banner = sv.banner || '', img = sv.img || '', iconKey = sv.icon || '';
  const pvBanner = el('div', { className: 'pv-banner' }), pvIcon = el('div', { className: 'pv-icon' }), pvName = el('div', { className: 'pv-name' }), pvDesc = el('div', { className: 'pv-desc' });
  const people = Store.members(sv.id) || [], online = people.filter((m) => m.status && m.status !== 'offline' && m.status !== 'invisible').length;
  const draw = () => {
    pvBanner.style.background = paint(banner) || 'var(--input)';
    pvIcon.replaceChildren(); const im = safeImg(img);
    if (im) pvIcon.append(el('img', { src: im, alt: '' })); else if (ICON[iconKey]) pvIcon.append(icon(iconKey, 28)); else pvIcon.textContent = initials(name.value);
    pvName.textContent = name.value || 'Server'; pvDesc.textContent = desc.value;
  };
  name.oninput = draw; desc.oninput = draw; draw();
  const save = () => {
    const v = name.value.trim(); if (!v) return toast('Give the server a name.');
    Store.updateServer(sv.id, { name: v, description: desc.value.trim(), banner, img, icon: iconKey }); renderAll(); toast('Server profile saved.'); redraw();
  };
  return [el('h2', {}, 'Server Profile'), el('p', { className: 'sub' }, 'How your server looks in the server list, at the top of its channels, and in Discover.'),
    el('div', { className: 'sv-prof' }, el('div', { className: 'sv-form' },
      el('h3', {}, 'Name'), name,
      el('h3', {}, 'Icon'), el('p', { className: 'hint' }, 'A square picture works best.'),
      el('div', { className: 'btn-row' },
        el('button', { className: 'btn primary', onclick: () => pickFile(async (f) => { try { img = await shrink(f, 256, 256, 150000); iconKey = ''; draw(); } catch (e) { toast(String(e.message || e)); } }) }, 'Change Server Icon'),
        el('button', { className: 'btn ghost', onclick: () => { img = ''; iconKey = 'bot'; draw(); } }, 'Use the robot'),
        el('button', { className: 'btn ghost danger', onclick: () => { img = ''; iconKey = ''; draw(); } }, 'Remove Icon')),
      el('h3', {}, 'Banner'), el('p', { className: 'hint' }, 'The picture at the top of the channel list. (Anyone can hide banners for themselves in Layout.)'),
      picturePicker(banner, (v) => { banner = v; draw(); }, { w: 960, h: 540, label: 'Upload a banner' }),
      el('h3', {}, 'Description'), desc,
      el('div', { className: 'row', style: 'justify-content:flex-start;margin-top:18px' }, el('button', { className: 'btn primary', onclick: save }, 'Save Changes'))),
    el('div', { className: 'pv-col' }, el('div', { className: 'pv-card' }, pvBanner, el('div', { className: 'pv-body' }, pvIcon, pvName,
      Store.kind === 'supabase' ? el('div', { className: 'pv-stats' }, el('span', {}, el('i', { className: 'on' }), `${online} Online`), el('span', {}, el('i', {}), `${people.length} Member${people.length === 1 ? '' : 's'}`)) : null,
      sv.since ? el('div', { className: 'pv-est' }, 'Est. ' + new Date(sv.since).toLocaleDateString([], { month: 'short', year: 'numeric' })) : null, pvDesc))))];
}
// being found in Discover (the owner decides; admins can pick the category)
function svDiscovery(sv, redraw, shut) {
  const owner = Store.role(sv.id) === 'owner';
  const toggle = sw(!!sv.public, async (on) => {
    if (on && !(await confirmBox({ title: 'Make it public?', text: 'Anyone signed in to Fluentdat will be able to find it in Discover and join, and then read every channel, including older messages. You can ban people, and make it private again any time.', ok: 'Make Public' }))) { redraw(); return; }
    Store.updateServer(sv.id, { public: on }); toast(on ? `${sv.name} is now in Discover.` : `${sv.name} is private again.`); setTimeout(redraw, 400);
  });
  toggle.disabled = !owner;
  const cat = sel(sv.category || '', [['', 'Choose one…'], ...DISCOVER_CATS.slice(1).map(([id, label]) => [id, label])], (v) => { Store.updateServer(sv.id, { category: v }); toast('Category saved.'); });
  return [el('h2', {}, 'Discovery'), el('p', { className: 'sub' }, 'Let people find your server in Discover and join without an invite.'),
    row2('Public server', owner ? 'Listed in Discover, and anyone signed in can join.' : 'Only the owner can change this.', toggle),
    row2('Category', 'Where it shows up in Discover.', cat),
    el('div', { className: 'note-box', style: 'margin-top:14px' }, 'Discover shows your server’s icon, banner, name and description (from Server Profile) and how many people are in it. Channels and messages stay hidden until someone joins.'),
    sv.public ? el('div', { className: 'row', style: 'justify-content:flex-start' }, el('button', { className: 'btn', onclick: () => { shut(); view = 'discover'; discoverCat = ''; renderAll(); } }, icon('compass', 16), 'See it in Discover')) : null];
}
// roles: a name and a colour admins hand out; names take the top role's colour, and roles can get their own group in the member list
const ROLE_COLORS = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b',
  '#11806a', '#1f8b4c', '#206694', '#71368a', '#ad1457', '#c27c0e', '#a84300', '#992d22', '#979c9f', '#546e7a'];
function svRoles(sv, redraw, state) {
  const roles = Store.roles(sv.id), people = Store.members(sv.id) || [];
  const r = roles.find((x) => x.id === state.role) || roles[0];
  const count = (id) => people.filter((m) => (m.roles || []).includes(id)).length;
  const create = el('button', { className: 'btn primary', onclick: async () => {
    const id = await attempt(() => Store.addRole(sv.id, { name: 'new role' })); if (id) { state.role = id; redraw(); }
  } }, 'Create Role');
  const list = el('div', { className: 'role-list' }, ...roles.map((x) => el('button', { className: 'role-pill' + (r && x.id === r.id ? ' on' : ''), onclick: () => { state.role = x.id; redraw(); } },
    el('i', { style: `background:${safeColor(x.color, '#99aab5')}` }), el('span', {}, x.name), el('small', {}, String(count(x.id))))), create);
  const head = [el('h2', {}, 'Roles'), el('p', { className: 'sub' }, 'Use roles to group your server’s people and colour their names. (What people may do is set by owner, admin and member, in Members.)'), list];
  if (!r) return [...head, el('div', { className: 'note-box' }, 'No roles yet. Make one, like “Builders” or “Programmers”.')];
  const name = el('input', { type: 'text', value: r.name, maxLength: 40, className: 'wide-in' });
  name.onchange = () => { const v = name.value.trim(); if (v) { Store.updateRole(r.id, { name: v }); redraw(); } };
  const swatch = (c) => { const b = el('button', { className: 'rswatch' + ((r.color || '') === c ? ' on' : ''), title: c || 'Default', onclick: () => { Store.updateRole(r.id, { color: c }); redraw(); renderAll(); } }); b.style.background = c || '#99aab5'; if (!c) b.append(icon('ban', 14)); return b; };
  const custom = el('input', { type: 'color', value: r.color || '#99aab5', title: 'Any colour' }); custom.onchange = () => { Store.updateRole(r.id, { color: custom.value }); redraw(); renderAll(); };
  const i = roles.indexOf(r);
  const move = (d) => { const other = roles[i + d]; if (!other) return; Store.updateRole(r.id, { position: other.position }); Store.updateRole(other.id, { position: r.position }); setTimeout(redraw, 300); };
  const holders = people.filter((m) => (m.roles || []).includes(r.id)), others = people.filter((m) => !(m.roles || []).includes(r.id));
  const giveMenu = (e) => { const b = e.currentTarget.getBoundingClientRect(); menu(others.length ? others.map((m) => ({ label: m.name, hint: m.login ? '@' + m.login : '', action: async () => { await attempt(() => Store.giveRole(sv.id, m.id, r.id, true)); redraw(); } })) : [{ label: 'Everyone has it already', disabled: true }], b.left, b.bottom + 4); };
  const preview = el('div', { className: 'role-pv' }, avatarEl({ name: holders[0] ? holders[0].name : 'Fluentdat', color: holders[0] ? holders[0].color : '#5b7fd6', avatar: holders[0] ? holders[0].avatar : '' }),
    el('div', {}, el('div', { className: 'nm', style: `color:${safeColor(r.color, 'var(--bright)')}` }, holders[0] ? holders[0].name : 'Fluentdat'), el('div', {}, 'This is how names look with this role.')));
  return [...head,
    el('div', { className: 'role-edit' },
      el('div', { className: 'role-edit-head' }, el('h3', {}, 'Edit role: ' + r.name), el('span', { style: 'flex:1' }), iconBtn('up', 'Move up (higher roles win the name colour)', () => move(-1)), iconBtn('down', 'Move down', () => move(1))),
      el('h4', { className: 'sub-h' }, 'Role name'), name,
      el('h4', { className: 'sub-h' }, 'Role colour'), el('div', { className: 'rswatches' }, swatch(''), ...ROLE_COLORS.map(swatch), custom),
      row2('Display role members separately', 'People with this role get their own group in the member list.', sw(!!r.hoist, (on) => { Store.updateRole(r.id, { hoist: on }); renderAll(); })),
      preview,
      el('h4', { className: 'sub-h' }, `Members with this role — ${holders.length}`),
      el('div', { className: 'sx-list' }, ...(holders.length ? holders.map((m) => el('div', { className: 'it' }, avatarEl(m, { size: 28 }), el('span', { className: 'nm3' }, m.name),
        iconBtn('x', 'Take the role away', async () => { await attempt(() => Store.giveRole(sv.id, m.id, r.id, false)); redraw(); }, 'del'))) : [el('div', { className: 'it muted' }, 'Nobody has it yet.')])),
      el('div', { className: 'row', style: 'justify-content:space-between' },
        el('button', { className: 'btn', onclick: giveMenu }, icon('plus', 16), 'Add Members'),
        el('button', { className: 'btn danger', onclick: async () => { if (await confirmBox({ title: `Delete ‘${r.name}’`, text: 'Everyone loses this role. This can’t be undone.', ok: 'Delete Role', danger: true })) { Store.removeRole(r.id); state.role = null; setTimeout(redraw, 200); renderAll(); } } }, 'Delete Role')))];
}
// banned people, and lifting a ban
function svBans(sv) {
  const box = el('div', { className: 'sx-list' }, el('div', { className: 'it muted' }, 'Loading…'));
  const load = async () => {
    let list; try { list = await Store.bans(sv.id); } catch (e) { box.replaceChildren(el('div', { className: 'it' }, String(e.message || e))); return; }
    box.replaceChildren(...(list.length ? list.map((b) => el('div', { className: 'it' }, avatarEl(b, { size: 32 }),
      el('div', { className: 'who2' }, el('div', { className: 'n' }, b.name), el('div', { className: 'h' }, '@' + b.login + (b.reason ? ' · ' + b.reason : ''))),
      el('button', { className: 'btn', onclick: async () => { if ((await attempt(() => Store.unban(sv.id, b.id))) === null) return; toast(`${b.name} can join again.`); load(); } }, 'Revoke Ban')))
      : [el('div', { className: 'it muted' }, 'Nobody is banned.')]));
  };
  load();
  return [el('h2', {}, 'Bans'), el('p', { className: 'sub' }, 'People banned from this server can’t come back, by invite or from Discover, until you revoke the ban.'), box];
}

function svChannels(sv, redraw) {
  const cats = Store.categories(sv.id);
  const list = el('div', { className: 'sx-list' });
  for (const c of Store.channels(sv.id)) {
    list.append(el('div', { className: 'it' }, icon(c.kind === 'voice' ? 'volume' : 'hash', 17), el('span', { className: 'nm3' }, c.name),
      sel(c.category || '', cats.map((x) => [x.id, x.name]), (v) => { Store.updateChannel(c.id, { category: v }); renderAll(); }),
      sel(c.kind, [['text', 'Text'], ['voice', 'Voice']], (v) => { Store.updateChannel(c.id, { kind: v }); renderAll(); }),
      iconBtn('edit', 'Rename', async () => { await renameChannel(c); redraw(); }),
      iconBtn('trash', 'Delete channel', async () => { await deleteChannel(c); redraw(); }, 'del')));
  }
  return [el('h2', {}, 'Channels'), el('p', { className: 'sub' }, 'Rename channels, move them between categories, or switch text and voice.'),
    list,
    el('div', { className: 'row', style: 'justify-content:flex-start' }, el('button', { className: 'btn primary', onclick: () => newChannelFlow(cats[0] && cats[0].id, sv.id, redraw) }, 'Create Channel'))];
}

function svCategories(sv, redraw) {
  const list = el('div', { className: 'sx-list' });
  for (const c of Store.categories(sv.id)) {
    const n = Store.channels(sv.id).filter((x) => x.category === c.id).length;
    list.append(el('div', { className: 'it' }, icon('menu', 17), el('span', { className: 'nm3' }, c.name), el('span', { style: 'color:var(--muted);font-size:.85rem' }, `${n} channel${n === 1 ? '' : 's'}`),
      iconBtn('edit', 'Rename', async () => { const v = await ask({ title: 'Rename Category', label: 'Category name', value: c.name, max: 60 }); if (v) { Store.updateCategory(c.id, { name: v }); renderAll(); redraw(); } }),
      iconBtn('trash', 'Delete category and its channels', async () => {
        if (!(await confirmBox({ title: `Delete ‘${c.name}’`, text: `Its ${n} channel${n === 1 ? '' : 's'} and their messages go too. This can’t be undone.`, ok: 'Delete Category', danger: true }))) return;
        Store.removeCategory(c.id); channelId = firstChannel(sv.id); renderAll(); redraw();
      }, 'del')));
  }
  return [el('h2', {}, 'Categories'), el('p', { className: 'sub' }, 'Groups that channels sit under in the sidebar.'),
    list,
    el('div', { className: 'row', style: 'justify-content:flex-start' }, el('button', { className: 'btn primary', onclick: async () => { await newCategory(sv.id); redraw(); } }, 'Create Category'))];
}

function svMembers(sv, redraw) {
  if (Store.kind === 'supabase') return svPeople(sv, redraw);
  const list = el('div', { className: 'sx-list' });
  for (const m of memberList()) {
    list.append(el('div', { className: 'it' }, avatarEl(m, { size: 32 }),
      el('span', { className: 'nm3' }, m.name, m.me ? el('span', { className: 'chip', style: 'margin-left:8px' }, 'you') : null),
      el('span', { style: 'color:var(--muted);font-size:.84rem' }, m.bot ? 'Bot' : (m.status && m.status !== 'offline' && m.status !== 'invisible' ? 'Online' : 'Offline'))));
  }
  return [el('h2', {}, 'Members'), el('p', { className: 'sub' }, Store.signedIn ? 'Everyone with a profile in the shared data repository.' : 'You and your friends in this browser. Sign in to see your real team.'), list];
}

// the people in a shared server, with their roles: the owner makes and unmakes admins; admins can remove members
function svPeople(sv, redraw) {
  const myRole = Store.role(sv.id), owner = myRole === 'owner', can = Store.canManage(sv.id);
  const rank = { owner: 0, admin: 1, member: 2 };
  const people = (Store.members(sv.id) || []).slice().sort((a, b) => (rank[a.role] - rank[b.role]) || String(a.name).localeCompare(b.name));
  const list = el('div', { className: 'sx-list' });
  for (const m of people) {
    const acts = [];
    if (!m.me && m.role !== 'owner') {
      if (owner) acts.push(el('button', { className: 'btn', onclick: async () => {
        const to = m.role === 'admin' ? 'member' : 'admin';
        if ((await attempt(() => Store.setMemberRole(sv.id, m.id, to))) === null) return;
        toast(to === 'admin' ? `${m.name} is now an admin.` : `${m.name} is no longer an admin.`); redraw(); renderMembers();
      } }, m.role === 'admin' ? 'Remove admin' : 'Make admin'));
      if (owner || (can && m.role === 'member')) acts.push(iconBtn('x', 'Remove from the server', () => kick(sv.id, m, redraw), 'del'), iconBtn('ban', 'Ban', () => banFlow(sv.id, m, redraw), 'del'));
    }
    list.append(el('div', { className: 'it' }, avatarEl(m, { size: 32 }),
      el('div', { className: 'who2' },
        el('div', { className: 'n' }, m.name, m.me ? el('span', { className: 'chip', style: 'margin-left:8px' }, 'you') : null),
        el('div', { className: 'h' }, el('span', { className: 'chip role ' + m.role }, m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : 'Member'),
          ...Store.roles(sv.id).filter((r) => (m.roles || []).includes(r.id)).map((r) => el('span', { className: 'rchip' }, el('i', { style: `background:${safeColor(r.color, '#99aab5')}` }), r.name)), m.login ? '@' + m.login : '')),
      ...acts));
  }
  return [el('h2', {}, 'Members'), el('p', { className: 'sub' }, `${people.length} ${people.length === 1 ? 'person' : 'people'} in ${sv.name}. ` +
      (owner ? 'You own it: you choose the admins.' : can ? 'You’re an admin: you can remove members and make invites.' : 'Ask an admin if someone should be invited or removed.')), list,
    el('h3', {}, 'Roles'),
    el('div', { className: 'note-box' }, el('ol', {},
      el('li', {}, el('b', {}, 'Owner'), ': made the server. Picks admins, and is the only one who can delete it.'),
      el('li', {}, el('b', {}, 'Admins'), ': make and change channels, make invites, remove members, and delete anyone’s messages.'),
      el('li', {}, el('b', {}, 'Members'), ': read and post in every channel.')))];
}
function svInvite(sv) {
  if (Store.kind === 'supabase') return svInviteLink(sv);
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

// a real invite: a link (or code) someone opens to join, with an expiry and a limit on how many people can use it
function svInviteLink(sv) {
  const hours = sel('168', [['1', '1 hour'], ['24', '1 day'], ['168', '7 days'], ['0', 'Never']], () => {});
  const uses = sel('0', [['0', 'No limit'], ['1', '1 person'], ['5', '5 people'], ['10', '10 people'], ['25', '25 people']], () => {});
  const out = el('div', {});
  const make = el('button', { className: 'btn primary' }, 'Create Invite Link');
  make.onclick = async () => {
    make.disabled = true;
    const h = +hours.value || null, n = +uses.value || null;
    const code = await attempt(() => Store.createInvite(sv.id, n, h));
    make.disabled = false;
    if (!code) return;
    const link = location.origin + location.pathname + '#invite=' + code;
    const field = el('input', { type: 'text', value: link, readOnly: true, onclick: () => field.select() });
    out.replaceChildren(el('div', { className: 'invite-box' }, field, el('button', { className: 'btn primary', onclick: () => copyText(link, 'Invite link copied.') }, 'Copy')),
      el('div', { className: 'invite-note' }, `Code ${code} · ${h ? 'works for ' + hours.selectedOptions[0].textContent.replace(/^1 /, 'one ') : 'never expires'}${n ? ' · for ' + uses.selectedOptions[0].textContent : ''}. They can paste the code into “Join with an invite” too.`));
    field.select();
  };
  return [el('h2', {}, 'Invite People'), el('p', { className: 'sub' }, `Send someone a link. They sign in (Discord, GitHub or email) and land in ${sv.name}.`),
    row2('Expire after', 'After this the link stops working. People who already joined stay.', hours),
    row2('Max uses', 'How many people can join with this one link.', uses),
    el('div', { className: 'row', style: 'justify-content:flex-start' }, make), out,
    el('h3', {}, 'Who gets in'),
    el('div', { className: 'note-box' }, 'Anyone holding a working link can join, so send it straight to the people you mean and keep it out of public places. Joining shows them every channel, including older messages. You can remove someone any time in Members.')];
}
function svDanger(sv, shut) {
  return [el('h2', {}, 'Delete Server'), el('p', { className: 'sub' }, 'This removes the server, its categories, channels and messages.'),
    el('div', { className: 'note-box', style: 'border:1px solid #e5534b' }, Store.kind === 'supabase'
      ? 'There is no undo. It goes for everyone in it: the channels and every message are deleted from the database.'
      : 'There is no undo in the app. If you are signed in, the old contents stay in the git history of the data repository, but Fluentdat will not show them again.'),
    el('div', { className: 'row', style: 'justify-content:flex-start' },
      el('button', { className: 'btn red', onclick: async () => {
        if (Store.kind !== 'supabase' && Store.servers().length < 2) return toast('This is your only server. Make another one first.');
        if (!(await confirmBox({ title: `Delete ‘${sv.name}’`, text: 'Are you sure? This can’t be undone.', ok: 'Delete Server', danger: true, type: sv.name }))) return;
        Store.removeServer(sv.id); serverId = (Store.servers()[0] || {}).id || null; channelId = firstChannel(serverId); shut(); toast('Server deleted.');
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
      el('button', { className: 'btn', onclick: () => { prefs = { ...prefs, ...DEFAULT_PREFS, ...LAYOUT_PRESETS[name], ...keepOf() }; savePrefs(); showMembers = prefs.membersDefault !== false; renderAll(); redraw(); toast(name + ' layout applied.'); } }, name))),

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
    row2('Group by role', 'Roles shown separately get their own heading, as on Discord.', pick('memberGroups', onoff)),
    el('h3', {}, 'Pictures'),
    row2('Server banners', 'The picture at the top of a server’s channel list.', pick('serverBanner', onoff)),
    row2('Banner height', '', pick('bannerH', [['s', 'Short'], ['m', 'Medium'], ['l', 'Tall']])),
    row2('Nameplates', 'The pictures behind names in the member list, DMs and your panel.', pick('plates', onoff)),
    row2('Profile beside DMs', 'The other person’s profile on the right of a DM.', sw(prefs.dmPanel, (on) => setPref('dmPanel', on))),
    ...buttonsSection(redraw),

    row2('Conversation start', 'The “Welcome to #channel” and “beginning of your DMs” headers.', pick('startHeaders', onoff)),

    el('h3', {}, 'Shape & type'),
    row2('Corners', 'How rounded buttons, channels and messages are.', pick('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']])),
    row2('Interface font', 'The font used everywhere in the app.', pick('uiFont', [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospaced']])),
    row2('Text size', 'Scales the whole interface.', (() => { const r = el('input', { type: 'range', min: 12, max: 20, step: 1, value: prefs.fontSize }); r.oninput = () => { prefs.fontSize = +r.value; savePrefs(); }; return r; })()),

    el('h3', {}, 'Start over'),
    row2('Reset layout', 'Put every option on this page back to the default.', el('button', { className: 'btn danger', onclick: async () => { if (!(await confirmBox({ title: 'Reset Layout', text: 'Put every layout option, button and order back to the default?', ok: 'Reset', danger: true }))) return; prefs = { ...prefs, ...DEFAULT_PREFS, ...keepOf() }; savePrefs(); showMembers = true; renderAll(); redraw(); toast('Layout reset.'); } }, 'Reset')),
  ];
}

// Layout → Buttons: every button, in every bar, can be hidden or moved (the settings cog always stays)
function buttonsSection(redraw) {
  const pick = (key, options) => sel(prefs[key], options, (v) => { setPref(key, v); });
  const out = [el('h3', {}, 'Buttons'), el('p', { className: 'hint' }, 'Show, hide and move every button. The settings cog always stays, so you can always get back here.'),
    row2('Button size', 'Top bar, message box and user panel buttons.', pick('btnSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']])),
    row2('Labels', 'Words beside the top bar buttons.', pick('btnLabels', [['off', 'Icons only'], ['on', 'Icons and words']]))];
  for (const [group, [title, items]] of Object.entries(BUTTONS)) {
    const order = ordered(group), list = el('div', { className: 'sx-list btn-list' });
    order.forEach((id, i) => {
      const [, label, ic, fixed] = items.find((b) => b[0] === id);
      const move = (d) => {
        const o = ordered(group), j = i + d; if (j < 0 || j >= o.length) return;
        [o[i], o[j]] = [o[j], o[i]]; prefs.order = { ...(prefs.order || {}), [group]: o }; savePrefs(); renderAll(); redraw();
      };
      const toggle = fixed ? el('span', { className: 'chip', title: id === 'settings' ? 'Always shown, so you can always reach settings' : 'Always shown' }, icon('lock', 12), 'Always')
        : sw(shown(id), (on) => { const h = { ...(prefs.hidden || {}) }; if (on) delete h[id]; else h[id] = true; prefs.hidden = h; savePrefs(); renderAll(); });
      list.append(el('div', { className: 'it' }, icon(ic, 17), el('span', { className: 'nm3' }, label),
        iconBtn('up', 'Move ' + (group === 'rail' ? 'up' : 'earlier'), () => move(-1)), iconBtn('down', 'Move ' + (group === 'rail' ? 'down' : 'later'), () => move(1)), toggle));
    });
    out.push(el('h4', { className: 'sub-h' }, title), list);
  }
  out.push(el('div', { className: 'row', style: 'justify-content:flex-start' },
    el('button', { className: 'btn', onclick: () => { prefs.hidden = {}; prefs.order = {}; savePrefs(); renderAll(); redraw(); toast('Buttons are back to normal.'); } }, 'Reset Buttons')));
  return out;
}
