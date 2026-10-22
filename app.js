// Fluentdat — a Discord-style chat that runs in the browser (data in store.js). Servers hold categories of channels;
// there are direct messages, a friends list, a member list, status (online/idle/dnd/invisible), a profile you can
// customise, stickers you can make, and your own CSS themes you can edit. UI icons are inline SVG (not OS emoji).
// Signed out it all stays in this browser; sign in (Discord, GitHub or email, via Supabase) and it's shared and live.
import { Store, ready } from './backend.js';
import { $, el, ICON, BRAND, brand, svgHTML, icon, readImage, scaled, pickFile, pickFiles, shrink, cropPicture, toast, attempt, copyText, modal, ask, confirmBox, menu, closeMenu, paint, plateMove } from './ui.js';
import { render as richText, links as linksIn, plain as plainText, jumbo } from './format.js';
import { embed } from './embeds.js';
import { joinCall, mediaTrouble } from './calls.js';
import { record, voicePlayer, fileSize, isImage, isVideo, pictureSize, extFor, clock } from './media.js';
import { openPicker, closePicker as closeXp, isOpen as xpOpen, findEmoji, withEmoji, loadEmoji, noteUse, frequent } from './picker.js';
import { ANIMS, applyAnims, animOn } from './anim.js';
import { LOGOS, THEME_LOGO, logoEl, logoInfo, setFavicon } from './logo.js';
import { openColor, colorSwatch, closeColor } from './color.js';
import { FONTS, EFFECTS, NAME_COLORS, styleName, hasStyle, surprise, fontFamily, loadFont } from './namestyle.js';
import { BADGES, TAG_COLORS, tagChip, badgeSVG } from './tags.js';
import { DECORATIONS, EFFECTS as PROFILE_EFFECTS, QUESTS, FRAMES, decoEl, effectEl, frameEl, decoInfo, effectInfo, frameInfo, questInfo, questProgress } from './shop.js';
import { BADGE as PROFILE_BADGE, KINDS as BADGE_KINDS, SECRETS as SECRET_BADGES, COUNT as BADGE_COUNT, badgesOf, badgeState, badgeIcon, toNext, tierAt } from './badges.js';
import { TASKS, TASK, EVERY, PRICES, WELCOME, BUNDLES, bundleCost, bundlePct, activeHolidays, fmtBux, period, resetsIn } from './datbux.js';
import { NAMEPLATES, plateInfo } from './plates.js';
import { SERVICES, SERVICE, brandIcon, setTileLook, parseConnection, connectionLink, connectionLabel, gameTile, cleanGame, localGames, searchGames, gamesByLetter, LETTERS, sameGame, POPULAR, WIDGETS, playingNow } from './profilekit.js';
// (Customize, the site of its own: customize.html is this same page, marked; app.js shows Customize there instead of the chat)
const CUSTOMIZE = document.documentElement.dataset.customize === '1';
try { if (!window.name) window.name = CUSTOMIZE ? 'fluentdat-customize' : 'fluentdat'; } catch {}
// (the test page hands in pretend cameras and microphones, and keeps everything quiet)
const SILENT = !!globalThis.__fluentdatSilent, TEST_MEDIA = globalThis.__fluentdatMedia || null, TEST_SCREEN = globalThis.__fluentdatScreen || null;


const DEFAULT_PREFS = {
  density: 'cozy', fontSize: 15, reduceMotion: false, highContrast: false, notify: false, sendOnEnter: true, dmFrom: 'anyone',
  // layout — all of these really move something (Settings → Layout)
  rail: 'on', iconShape: 'squircle', chanIcons: 'on', cats: 'on', sideHead: 'on', userPanel: 'on',
  topbar: 'on', banner: 'on', liveBanner: 'off',
  avatars: 'on', avatarShape: 'round', timestamps: '12', group: true, dividers: 'on', msgWidth: 'full', hover: 'on',
  membersDefault: true, membersStyle: 'panel', memberOffline: true, memberStatusText: false, decorations: 'on', effects: 'on',
  // the window's frame: a title bar on top, rounded panels, your controls at the foot of the server rail, the server's banner
  // under its name, and category names that are dimmed while they're closed (Customize → Layout)
  titlebar: 'on', titleAlign: 'center', frame: 'panels', panelPos: 'rail', bannerStyle: 'under', catStyle: 'dim', layoutV: 4,
  // sizes in pixels (Settings → Layout: drag them in the mini screen, or set them exactly)
  railW: 72, sideW: 240, membersW: 232, topH: 51, composerH: 44, panelH: 54, bannerH: 88, statusH: 30, titleH: 32, panelR: 14, panelGap: 6,
  avatarPx: 40, memberAv: 32, chanH: 34, icTop: 20, icComposer: 20, icPanel: 20, topGap: 8, railGap: 12, reactH: 22,
  // where things sit: the columns left to right, the sidebar and main area top to bottom, and the status bar
  cols: ['rail', 'side', 'main', 'members'], sideOrder: ['head', 'body', 'panel'], mainOrder: ['top', 'content', 'composer'], statusPos: 'top',
  radius: 'soft', uiFont: 'system',
  // buttons and parts (Customize → Elements): which are hidden, the order of each bar, whether they're labelled, and your own names
  hidden: { findDM: true, tActivity: true }, order: {}, btnLabels: 'off', labels: {},
  // pictures and Discord-style extras
  serverBanner: 'on', plates: 'on', memberGroups: 'on', startHeaders: 'on', dmPanel: true,
  micMuted: false, deafened: false,
  // calls, link previews and the formatting bar
  sound: false, ring: true, embeds: 'on', formatBar: 'on',
  // animations you turned off (Settings → Animations), and the logo ('theme': whatever the theme brings)
  anim: {}, logo: 'theme',
  // a line under someone's name in the chat while the mouse is on it ('off': none), the sidebar hidden with its shortcut
  // (on this device), and the keys you chose for the shortcuts (User Settings → Keyboard Shortcuts)
  nameHover: 'off', sideOff: false, keys: {},
  // connection icons on profiles: the services' own logo pictures ('png'), tiles in the theme's colours, or white tiles
  connLook: 'png',
  // Shop nameplates move all the time, or only while the pointer is on them
  plateMove: 'always',
  // profile cards' buttons and text: in the profile's own colours ('theirs'), or in your theme's ('mine')
  cardTheme: 'theirs',
};
const LAYOUT_PRESETS = {
  Default: {},
  Compact: { density: 'compact', fontSize: 14, avatarPx: 28, memberAv: 26, railW: 60, sideW: 190, membersW: 180, topH: 44, panelH: 46, chanH: 28,
    composerH: 40, icTop: 18, icComposer: 18, icPanel: 18, topGap: 4, railGap: 6, dividers: 'off', radius: 'sharp' },
  Spacious: { density: 'cozy', fontSize: 16, avatarPx: 44, memberAv: 38, railW: 84, sideW: 300, membersW: 300, topH: 58, panelH: 62, chanH: 40,
    composerH: 56, icTop: 22, icComposer: 22, icPanel: 22, topGap: 12, railGap: 16, msgWidth: 'readable', radius: 'round' },
  Minimal: { rail: 'off', sideHead: 'off', userPanel: 'off', avatars: 'off', timestamps: 'off', dividers: 'off', banner: 'off', membersDefault: false, hover: 'off',
    serverBanner: 'off', plates: 'off', startHeaders: 'off', dmPanel: false, hidden: { call: true, video: true, search: true, emoji: true, sticker: true, upload: true, mic: true, deafen: true, chanInvite: true, findDM: true, voice: true, chanSettings: true, addPeople: true } },
};
// every size you can set in Layout: [what it is, smallest, largest] in pixels
const SIZES = {
  railW: ['Server rail width', 48, 120], railGap: ['Space between servers', 2, 28], reactH: ['Reactions', 16, 36], sideW: ['Sidebar width', 160, 420], membersW: ['Member list width', 160, 420],
  topH: ['Top bar height', 36, 90], composerH: ['Message box height', 40, 160], panelH: ['User panel height', 40, 100],
  bannerH: ['Server banner height', 60, 260], statusH: ['Status bar height', 20, 56], titleH: ['Title bar height', 22, 56], panelR: ['Panel corners', 0, 28], panelGap: ['Space between panels', 0, 16],
  avatarPx: ['Message avatars', 20, 64],
  memberAv: ['Member list avatars', 20, 56], chanH: ['Channel rows', 24, 48], icTop: ['Top bar icons', 14, 32], topGap: ['Space between top bar buttons', 0, 28],
  icComposer: ['Message box icons', 14, 32], icPanel: ['User panel icons', 14, 32], fontSize: ['Text size', 12, 20],
};
const COLS = ['rail', 'side', 'main', 'members'];
// ---------- keyboard shortcuts you can change (User Settings → Keyboard Shortcuts, and Customize → Layout) ----------
// [id, what it does, its key to start with ('' = none)]. A key is written like "Mod+Shift+KeyS": Mod is ⌘ on a Mac and Ctrl
// elsewhere, so one choice works on both, and the last part is the key's place on the keyboard (KeyboardEvent.code)
const KEYBINDS = [['toggleSide', 'Hide or show the sidebar (channels and DMs)', 'Mod+Shift+KeyS'], ['toggleMembers', 'Hide or show the member list', ''],
  ['toggleRail', 'Hide or show the server rail', '']];
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
const keyFor = (id) => { const own = (prefs.keys || {})[id]; return typeof own === 'string' ? own : (KEYBINDS.find((k) => k[0] === id) || [])[2] || ''; };
// what was pressed, written the same way ('' while it's only Shift, Ctrl, ⌥ or ⌘ so far)
function comboOf(e) {
  if (!e.code || ['Shift', 'Control', 'Alt', 'Meta', 'OS'].includes(e.key) || /^(Shift|Control|Alt|Meta|OS)(Left|Right)$/.test(e.code)) return '';
  const p = [];
  if (MAC ? e.metaKey : e.ctrlKey) p.push('Mod');
  if (MAC && e.ctrlKey) p.push('Ctrl');
  if (e.altKey) p.push('Alt');
  if (e.shiftKey) p.push('Shift');
  if (!MAC && e.metaKey) p.push('Meta');
  return [...p, e.code].join('+');
}
const KEY_NAMES = { Backslash: '\\', Slash: '/', BracketLeft: '[', BracketRight: ']', Backquote: '`', Minus: '-', Equal: '=', Semicolon: ';', Quote: "'", Comma: ',', Period: '.',
  Space: 'Space', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: '⌫', Delete: 'Del', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', PageUp: 'Page Up', PageDown: 'Page Down' };
// a key as people read it: ⇧⌘S on a Mac, Ctrl+Shift+S elsewhere
function keyLabel(combo) {
  if (!combo) return '';
  const parts = combo.split('+'), code = parts.pop();
  const k = /^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : /^Numpad/.test(code) ? 'Num ' + code.slice(6) : KEY_NAMES[code] || code;
  if (MAC) return ['Ctrl', 'Alt', 'Shift', 'Mod'].filter((m) => parts.includes(m)).map((m) => ({ Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' })[m]).join('') + k;
  return [...['Mod', 'Ctrl', 'Alt', 'Shift', 'Meta'].filter((m) => parts.includes(m)).map((m) => ({ Mod: 'Ctrl', Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Meta: 'Win' })[m]), k].join('+');
}
// keys a browser (or Fluent) keeps for itself, so a page may never see them
const KEPT = new Set(['KeyT', 'KeyW', 'KeyN', 'KeyQ', 'KeyR', 'KeyL', 'KeyK', 'KeyE', 'KeyJ', 'KeyB', 'KeyD', 'KeyF', 'KeyG', 'KeyP', 'KeyY', 'KeyS', 'KeyH', 'KeyM', 'Comma',
  'Backslash', 'BracketLeft', 'BracketRight', 'Equal', 'Minus', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].map((c) => 'Mod+' + c)
  .concat(['KeyT', 'KeyN', 'KeyO', 'KeyP', 'KeyB', 'KeyG', 'KeyR', 'KeyJ', 'KeyZ'].map((c) => 'Mod+Shift+' + c), ['KeyB', 'KeyC', 'KeyT', 'KeyN', 'KeyI', 'Equal', 'Minus', 'Digit0'].map((c) => 'Mod+Alt+' + c)));
const keyClash = (combo) => (KEPT.has(combo) ? 'Your browser (or Fluent) may keep this key for itself, so it might not reach Fluentdat.' : '');
// do what a shortcut is for
function runKey(id) {
  if (id === 'toggleSide') {
    if (innerWidth <= 720) return $('#app').classList.toggle('show-side');
    if (!prefs.sideOff && prefs.rail === 'off') return toast('The sidebar has your settings while the server rail is hidden, so it stays. Show the server rail first (Customize → Layout).');
    prefs.sideOff = !prefs.sideOff; savePrefs(); renderAll();
    const k = keyLabel(keyFor('toggleSide'));
    if (prefs.sideOff) toast(k ? `Sidebar hidden: ${k} brings it back.` : 'Sidebar hidden.');
  } else if (id === 'toggleMembers') { showMembers = !showMembers; renderAll(); }
  else if (id === 'toggleRail') {
    prefs.rail = prefs.rail === 'off' ? 'on' : 'off';
    if (prefs.rail === 'off' && prefs.sideOff) { prefs.sideOff = false; toast('The sidebar is back: it keeps your settings while the server rail is hidden.'); }
    savePrefs(); renderAll();
  }
}
// (the shortcuts themselves: not while a key is being chosen, and a plain key or Shift with one, while you type, is the text's)
let keyRecording = false;
addEventListener('keydown', (e) => {
  if (CUSTOMIZE || keyRecording || e.repeat || e.isComposing) return;
  const c = comboOf(e); if (!c) return;
  const b = KEYBINDS.find(([id]) => keyFor(id) === c); if (!b) return;
  const typing = e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || ''));
  if (typing && !/^(Mod|Ctrl|Alt|Meta)\+/.test(c) && !/^F\d+$/.test(e.code)) return;
  e.preventDefault(); e.stopPropagation(); runKey(b[0]);
}, true);
// choosing a shortcut's key: click it, then press the keys (Esc keeps the old one, Backspace leaves it with none)
function keyPicker(id, onChange) {
  const b = el('button', { className: 'kb-key', type: 'button' });
  const show = () => { const k = keyFor(id); b.textContent = k ? keyLabel(k) : 'None'; b.classList.toggle('none', !k); b.classList.remove('rec'); };
  b.onclick = () => {
    if (keyRecording) return;
    keyRecording = true; b.classList.add('rec'); b.textContent = 'Press keys…';
    const done = () => { keyRecording = false; removeEventListener('keydown', grab, true); removeEventListener('mousedown', away, true); show(); };
    const away = (e) => { if (e.target !== b) done(); };
    const plain = (e) => !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    const grab = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape' && plain(e)) return done();
      if ((e.key === 'Backspace' || e.key === 'Delete') && plain(e)) { setKey(id, ''); done(); if (onChange) onChange(); return; }
      const c = comboOf(e); if (!c) return;
      if (!/^(Mod|Ctrl|Alt|Meta)\+/.test(c) && !/^F\d+$/.test(e.code)) return toast(MAC ? 'Use it with ⌘, ⌃ or ⌥ (or pick an F key), so it doesn’t get in the way of typing.' : 'Use it with Ctrl or Alt (or pick an F key), so it doesn’t get in the way of typing.');
      setKey(id, c); done(); if (onChange) onChange();
    };
    addEventListener('keydown', grab, true); setTimeout(() => addEventListener('mousedown', away, true), 0);
  };
  show();
  return b;
}
function setKey(id, combo) {
  const keys = { ...(prefs.keys || {}) };
  // (one key does one thing: another shortcut that had it lets go of it)
  if (combo) for (const [other, what] of KEYBINDS) if (other !== id && keyFor(other) === combo) { keys[other] = ''; toast(`${keyLabel(combo)} was for “${what}”, which has no key now.`); }
  if (combo === ((KEYBINDS.find((k) => k[0] === id) || [])[2] || '')) delete keys[id]; else keys[id] = combo;
  prefs.keys = keys; savePrefs();
}
// the shortcuts, each with its key, a note when a browser may keep that key, and a way back to the key it came with
function keyRows(redraw) {
  return KEYBINDS.map(([id, what, def]) => {
    const k = keyFor(id), clash = keyClash(k);
    return el('div', { className: 'kb-row' }, el('div', { className: 'kb-what' }, el('b', {}, what), clash ? el('small', {}, clash) : null), keyPicker(id, redraw),
      k !== def ? el('button', { className: 'link-btn kb-reset', type: 'button', title: def ? `Back to ${keyLabel(def)}` : 'Back to none', onclick: () => { setKey(id, def); redraw(); } }, 'Reset') : el('span', { className: 'kb-reset' }));
  });
}
// an order someone saved, cleaned up: only known parts, each once, and any missing ones added at the end
const validOrder = (o, all) => { const mine = (Array.isArray(o) ? o : []).filter((x, i, arr) => all.includes(x) && arr.indexOf(x) === i); return [...mine, ...all.filter((x) => !mine.includes(x))]; };
const sizeOf = (k, v) => { const [, lo, hi] = SIZES[k]; const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : DEFAULT_PREFS[k]; };
let prefs = loadPrefs();



// ---------- you ----------
const COLORS = ['#5b7fd6', '#4bbf73', '#e8743b', '#d6554b', '#b05bd6', '#d6b23b', '#3bc6d6', '#e86ba8'];
const STATUSES = [['online', 'Online'], ['idle', 'Idle'], ['dnd', 'Do Not Disturb'], ['invisible', 'Invisible']];
function loadMe() { try { const m = JSON.parse(localStorage.getItem('fluency.me')); if (m && m.name) return { avatar: '', pronouns: '', about: '', status: 'online', id: 'local-' + Math.random().toString(36).slice(2, 10), ...m }; } catch {} return { id: 'local-' + Math.random().toString(36).slice(2, 10), name: 'You', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '', pronouns: '', about: '', status: 'online' }; }
let me = loadMe();
const saveMe = () => { try { localStorage.setItem('fluency.me', JSON.stringify(me)); } catch {} };
const initials = (name) => String(name || '?').trim().slice(0, 2).toUpperCase();
const stamp = () => { const u = { name: me.name, color: me.color }; if (me.avatar) u.avatar = me.avatar; if (me.pronouns) u.pronouns = me.pronouns; if (me.about) u.about = me.about; if (me.style) u.style = me.style; return u; };
const myTag = () => (Store.kind === 'supabase' && Store.myProfile ? Store.myProfile().tag || null : null);
const asMember = () => ({ id: 'me', name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status, plate: me.plate || '', banner: me.banner || '',
  theme: me.theme || null, style: me.style || null, tag: myTag(), playing: me.playing || null, decoration: me.decoration || '', effect: me.effect || '', frame: me.frame || '',
  bubble: myBubble(), me: true });
// a profile effect over a card (when they have one, and effects are on)
function withEffect(card, id) { if (id && prefs.effects !== 'off') { const fx = effectEl(id); if (fx) card.append(fx); } return card; }
// a profile frame around a card (when they have one, and effects are on)
function withFrame(card, id) { if (id && prefs.effects !== 'off') { const f = frameEl(id); if (f) { card.append(f); card.classList.add('framed'); } } return card; }

// ---------- the status bubble (Discord's): what you're up to, in a bubble beside your picture on your profile ----------
const BUBBLE_ASKS = ['What have you been reading?', 'What have you been listening to?', 'What are you up to?', 'What’s on your mind?', 'Just finished building…', 'Currently playing…'];
const myBubble = () => (me.bubble && !(me.bubbleUntil && me.bubbleUntil <= Date.now()) ? me.bubble : '');
// someone's bubble (yours, when you have none: a question to answer; click it to set one)
function bubbleEl(u, { mine = false } = {}) {
  const text = mine ? myBubble() : u.bubble || '';
  if (!text && !mine) return null;
  const b = el(mine ? 'button' : 'div', { className: 'p-bubble' + (text ? '' : ' ask') + (mine ? ' mine' : ''), title: mine ? (text ? 'Change your status' : 'Set a status') : '' },
    el('i', { className: 'pb-d1' }), el('i', { className: 'pb-d2' }),
    el('span', { className: 'pb-t' }, ...(text ? [text] : [icon('plusCircle', 15), BUBBLE_ASKS[Math.floor(Math.random() * BUBBLE_ASKS.length)]])));
  if (mine) b.onclick = (e) => { e.stopPropagation(); bubbleDialog(); };
  return b;
}
const CLEAR_AFTER = [['day', 'Today'], ['4h', '4 hours'], ['1h', '1 hour'], ['30m', '30 minutes'], ['never', 'Don’t clear']];
const clearAt = (k) => { const now = Date.now(); if (k === 'day') { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); } return { '4h': now + 4 * 36e5, '1h': now + 36e5, '30m': now + 18e5 }[k] || 0; };
// Set a Status: a line about what you're up to (an emoji too, if you like), and when it goes away
function bubbleDialog() {
  if (Store.kind === 'supabase' && !Store.canFrame()) return toast('Status bubbles need the newest supabase/setup.sql: run it again in Supabase.');
  closePop();
  const input = el('input', { type: 'text', maxLength: 128, value: myBubble(), placeholder: BUBBLE_ASKS[0] });
  const put = (t) => { const a = input.selectionStart ?? input.value.length; input.value = (input.value.slice(0, a) + t + input.value.slice(input.selectionEnd ?? a)).slice(0, 128); input.focus(); draw(); };
  const pick = el('button', { className: 'sb-emoji', type: 'button', title: 'Add an emoji', onclick: (e) => { e.stopPropagation(); openPicker({ tab: 'emoji', emojiOnly: true, anchor: pick, still: motionOff(),
    servers: [], emojiOf: () => [], stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {}, onEmoji: (t, keep, custom) => { if (!custom) put(t); }, onSticker: () => {} }); } }, icon('smile', 20));
  let after = me.bubble && me.bubbleUntil ? 'keep' : 'day';
  const until = sel(after, [...(after === 'keep' ? [['keep', 'As it is (' + when(me.bubbleUntil, true) + ')']] : []), ...CLEAR_AFTER], (v) => { after = v; });
  const pv = el('div', { className: 'sb-pv' });
  const draw = () => { const u = { ...asMember(), bubble: input.value.trim() }; pv.replaceChildren(el('div', { className: 'sb-av' }, avatarEl(u, { size: 64 }), u.bubble ? bubbleEl(u) : null)); };
  input.oninput = draw;
  const save = (text) => {
    me.bubble = text; me.bubbleUntil = text ? (after === 'keep' ? me.bubbleUntil : clearAt(after)) : 0;
    saveMe(); pushProfile(); renderAll(); m.close();
    toast(text ? 'Status set.' : 'Status cleared.');
  };
  const m = modal({ title: 'Set a Status', cls: 'sb-dlg', body: [pv, el('div', { className: 'field' }, el('label', {}, 'What are you up to?'), el('div', { className: 'sb-row' }, pick, input)),
    el('div', { className: 'field' }, el('label', {}, 'Clear After'), until), el('p', { className: 'hint' }, 'It shows in a bubble beside your picture on your profile, and under your name in member lists.')],
    actions: [myBubble() ? el('button', { className: 'btn ghost', onclick: () => save('') }, 'Clear Status') : null, el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), el('button', { className: 'btn primary', onclick: () => save(input.value.trim()) }, 'Save')] });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(input.value.trim()); });
  draw(); setTimeout(() => input.focus(), 0);
}

// ---------- badges (Discord's): earned by doing things; a row on profiles, and a window with the details ----------
const FIRST_RUN = (() => { try { let t = +localStorage.getItem('fluentdat.firstRun'); if (!t) { t = Date.now(); localStorage.setItem('fluentdat.firstRun', String(t)); } return t; } catch { return Date.now(); } })();
// (signed out: what's kept in this browser)
function localStats() {
  const x = Store.extrasNow('me') || {}, w = localWallet(), kinds = new Set();
  let messages = 0, files = 0, night = 0, reactions = 0, said42 = false, saidHello = false, selfReact = false;
  const scan = (place, list) => {
    const mine = new Set();
    for (const m of list || []) if (m.user && !m.user.bot && isMe(m.user)) {
      messages++; mine.add(m.id);
      if ((m.files || []).length) files++;
      if (new Date(m.ts).getUTCHours() < 4) night++;
      const t = String(m.text || '').trim();
      if (t === '42') said42 = true;
      if (/hello fluentdat/i.test(t)) saidHello = true;
    }
    for (const [mid, rs] of (Store.reactions ? Store.reactions(place) : new Map())) for (const r of rs) if (r.me) { reactions++; kinds.add(r.emoji); if (mine.has(mid)) selfReact = true; }
  };
  for (const sv of Store.servers()) for (const c of Store.channels(sv.id)) scan(c.id, Store.messages(c.id));
  for (const d of Store.dmList()) scan(d.id, Store.dm(d.id));
  const widgets = Array.isArray(x.widgets) ? x.widgets : [], count = (t) => widgets.filter((v) => v && v.t === t).reduce((n, v) => n + ((v.g || []).length), 0);
  // (your best run of daily check-ins)
  const days = Object.keys(w.claims || {}).filter((k) => k.startsWith('daily-checkin@')).map((k) => Date.parse(k.slice(14) + 'T00:00:00Z')).sort((a, b) => a - b);
  let streak = 0, run = 0, prev = 0;
  for (const t of days) { run = prev && t - prev === 864e5 ? run + 1 : 1; prev = t; streak = Math.max(streak, run); }
  return { since: new Date(FIRST_RUN).toISOString(), messages, reactions, threads: 0, friends: Store.friends().filter((f) => !f.bot).length, members: 0, boost_since: null,
    events: 0, quests: (x.quests || []).length, connections: (x.connections || []).length, games: count('likes'), want: count('want'), play_seconds: 0, staff: false,
    servers: Store.servers().length, files, calls: 0, night, said42, said_hello: saidHello, self_react: selfReact, emoji_kinds: kinds.size, bot_cmds: 0,
    looks: { avatar: !!me.avatar, banner: !!me.banner, bio: !!me.about, pronouns: !!me.pronouns, theme: !!(me.theme && (me.theme[0] || me.theme[1])), style: !!(me.style && (me.style.font || me.style.effect)),
      deco: !!me.decoration, effect: !!me.effect, frame: !!me.frame, plate: !!me.plate, bubble: !!myBubble(), tag: false },
    bux_earned: w.earned || 0, bux_spent: w.spent || 0, bux_sent: 0, sent_people: 0, trades: 0, owned: (w.owned || []).length, tasks: Object.keys(w.claims || {}).length, streak };
}
const statsId = (u) => (!u || u.bot ? null : Store.kind === 'supabase' ? (isMe(u) ? Store.myId() : u.id) : isMe(u) ? 'me' : null);
// what someone's badges are made of: the database counts (signed in), or this browser does (yours, signed out)
async function statsOf(u) { if (Store.kind !== 'supabase') return isMe(u) ? localStats() : null; const id = statsId(u); return id ? Store.badgeStats(id) : null; }
const statsNow = (u) => (Store.kind !== 'supabase' ? (isMe(u) ? localStats() : null) : statsId(u) ? Store.badgeStatsNow(statsId(u)) : null);
const badgePrefs = (u) => { const id = statsId(u), x = id ? Store.extrasNow(id) : null; return (x && x.badges) || { order: [], hidden: [] }; };
// (noted now and then, while Fluentdat is open: a new badge goes in your log, for your profile's Collection)
let badgesNoted = 0;
async function noteBadges() {
  if ((Store.kind === 'supabase' && !Store.canBadgeLog()) || Date.now() - badgesNoted < 60000) return;
  badgesNoted = Date.now();
  const you = asMember(), stats = await statsOf(you).catch(() => null), x = await Store.profileExtras(myXid()).catch(() => null);
  if (!stats || !x) return;
  const log = x.badgeLog || {}, add = {};
  for (const b of badgesOf(stats, { all: true }).have) if (b.id && !log[b.id]) add[b.id] = new Date(b.unlocked > 0 && b.unlocked < Date.now() ? b.unlocked : Date.now()).toISOString();
  if (Object.keys(add).length) await Store.setProfileExtras({ badgeLog: { ...log, ...add } }).catch(() => {});
}
setInterval(() => { if (Store.signedIn || Store.kind !== 'supabase') noteBadges(); }, 5 * 60000);
const badgeTitle = (b) => `${b.kind ? b.kind.name + ': ' : ''}${b.name} (${b.rarity[0]})`;
// a row of someone's badges (the ones they show, in their order), filled in when they're known; click one for its details
function badgeRow(u, { max = 6 } = {}) {
  const row = el('div', { className: 'p-badges' }); row.hidden = true;
  const fill = (stats) => {
    const list = stats ? badgesOf(stats, badgePrefs(u)).shown : [];
    row.replaceChildren(...list.slice(0, max).map((b) => el('button', { className: 'p-badge', title: badgeTitle(b), onclick: (e) => { e.stopPropagation(); badgesDialog(u, b.id); } }, badgeIcon(b.id, 22))),
      ...(list.length > max ? [el('button', { className: 'p-badge more', title: 'See all the badges', onclick: (e) => { e.stopPropagation(); badgesDialog(u); } }, '+' + (list.length - max))] : []));
    row.hidden = !list.length;
  };
  fill(statsNow(u));
  const id = statsId(u);
  Promise.all([statsOf(u), id && Store.kind === 'supabase' && !Store.extrasNow(id) ? Store.profileExtras(id).catch(() => null) : null]).then(([st]) => fill(st), () => {});
  return row;
}
// Your badges (Discord's): the 100, kind by kind, the secret ones you've found, and how many are still hidden; one at a
// time on the right, big, with how far along you are and the rest of its kind (someone else's: the ones they show)
async function badgesDialog(u, focus = null) {
  closePop();
  const mine = isMe(u), title = mine ? 'Your badges' : `${u.name}’s badges`;
  const left = el('div', { className: 'bg-left' }), right = el('div', { className: 'bg-right' });
  let stats = statsNow(u), cur = focus, filter = 'all';
  const draw = () => {
    if (!stats) { left.replaceChildren(el('h2', {}, title), el('p', { className: 'bg-sub' }, Store.kind === 'supabase' && !Store.canFrame() ? 'Badges need the newest supabase/setup.sql.' : 'Loading…')); right.replaceChildren(); return; }
    const bp = badgePrefs(u), res = badgesOf(stats, { ...bp, all: mine }), list = mine ? res.have : res.shown;
    const known = new Map([...res.have, ...(mine ? res.todo : [])].map((b) => [b.id, b])), open = (id) => (mine || list.some((b) => b.id === id));
    if (!cur || !known.has(cur) || !open(cur)) cur = (list[0] || res.todo[0] || {}).id || null;
    const tile = (b) => el('button', { className: 'bg-tile' + (b.id === cur ? ' on' : '') + (!b.have ? ' todo' : '') + (mine && res.hiddenOf(b) ? ' hid' : ''), title: badgeTitle(b) + (b.have ? '' : ': not yet'),
      onclick: () => { cur = b.id; draw(); } }, badgeIcon(b.id, 34, { locked: !b.have }), mine && res.hiddenOf(b) ? el('span', { className: 'cb-eye' }, icon('eyeOff', 13)) : null);
    let body;
    if (mine) {
      const want = (b) => filter === 'all' || (filter === 'have' ? b.have : !b.have);
      const kinds = BADGE_KINDS.map((k) => {
        const five = k.tiers.map((_, i) => known.get(`${k.id}-${i + 1}`)).filter(Boolean), shown = five.filter(want);
        return shown.length ? el('div', { className: 'bg-kindrow' }, el('h4', {}, k.name, el('small', {}, `${five.filter((b) => b.have).length}/5`)), el('div', { className: 'bg-grid' }, ...shown.map(tile))) : null;
      });
      const found = res.have.filter((b) => b.def.secret || b.def.special);
      const secret = filter === 'todo' ? null : el('div', { className: 'bg-kindrow' }, el('h4', {}, 'Secret', el('small', {}, `${SECRET_BADGES.length - res.secretsLeft}/${SECRET_BADGES.length}`)),
        el('div', { className: 'bg-grid' }, ...found.map(tile), ...Array.from({ length: res.secretsLeft }, () => el('span', { className: 'bg-tile secret', title: 'A secret badge: nobody sees it until it’s earned' }, '?'))));
      body = [el('div', { className: 'bg-filter' }, ...[['all', 'All'], ['have', 'Unlocked'], ['todo', 'To unlock']].map(([k, l]) => el('button', { className: 'chip' + (filter === k ? ' on' : ''), onclick: () => { filter = k; draw(); } }, l))),
        ...kinds, secret];
    } else body = [list.length ? el('div', { className: 'bg-grid' }, ...list.map(tile)) : null];
    left.replaceChildren(...[el('h2', {}, title),
      el('p', { className: 'bg-sub' }, mine ? `${res.count} of ${BADGE_COUNT} unlocked, and ${SECRET_BADGES.length - res.secretsLeft} of ${SECRET_BADGES.length} secret ones found.` : list.length ? `The badges ${u.name} shows on their profile.` : `${u.name} hasn’t shown any badges yet.`),
      ...body,
      mine ? el('div', { className: 'bg-foot' }, el('button', { className: 'btn', disabled: !res.have.length, onclick: () => customizeBadges(() => draw()) }, 'Customize Your Badges')) : null].filter(Boolean));
    const b = known.get(cur);
    if (!b) { right.replaceChildren(el('div', { className: 'bg-empty' }, el('div', { className: 'fp-empty-ic' }, icon('medal', 34)), mine ? 'Do things in Fluentdat to earn badges.' : 'Nothing to see here yet.')); return; }
    const d = b.def, k = b.kind;
    const bits = [k && (b.have || b.value > 0) ? k.line(b.value) : '', b.unlocked ? 'Unlocked ' + new Date(b.unlocked).toLocaleDateString() : '', d.secret ? 'Found' : ''].filter(Boolean);
    const five = k ? k.tiers.map((_, i) => known.get(`${k.id}-${i + 1}`) || badgeState(PROFILE_BADGE[`${k.id}-${i + 1}`], stats)).filter(Boolean) : [];
    right.replaceChildren(...[
      el('div', { className: 'bg-art' + (!b.have ? ' todo' : ''), style: `--rc:${b.rarity[1]}` }, badgeIcon(b.id, 132, { locked: !b.have })),
      el('div', { className: 'bg-kind' }, k ? k.name : d.secret ? 'Secret badge' : 'Fluentdat'),
      el('div', { className: 'bg-tier' }, b.name),
      el('div', { className: 'bg-line' }, ...bits.flatMap((t, i) => (i ? [' • ', t] : [t])), el('span', { className: 'bg-rar', style: `--rc:${b.rarity[1]}` }, b.rarity[0].toUpperCase())),
      mine && !b.have && k ? el('div', { className: 'bg-prog' }, el('h4', {}, 'Your progress'),
        el('div', { className: 'bg-bar' }, el('div', { className: 'bg-track' }, el('b', {}, toNext(b) || 'Not yet'), el('div', { className: 'bg-fill', style: `--rc:${b.rarity[1]}` }, el('i', { style: `width:${Math.round(b.progress * 100)}%` }))),
          el('small', {}, Math.round(b.progress * 100) + '%')), el('p', {}, k.how)) : el('p', { className: 'bg-how' }, k ? k.how : d.how),
      five.length ? el('div', { className: 'bg-tiers' }, ...five.map((t) => el(open(t.id) ? 'button' : 'div', { className: 'bg-t' + (t.id === b.id ? ' on' : '') + (!t.have ? ' later' : ''), ...(open(t.id) ? { onclick: () => { cur = t.id; draw(); } } : {}) },
        badgeIcon(t.id, 34, { locked: !t.have }), el('b', {}, t.name), el('small', {}, `${t.rarity[0]} · ${tierAt(t.def)}`)))) : null].filter(Boolean));
  };
  const m = modal({ cls: 'bg-dlg', body: [el('div', { className: 'bg' }, left, right)] });
  m.box.prepend(el('button', { className: 'fp-x', title: 'Close', onclick: () => m.close() }, icon('x', 20)));
  draw();
  const id = statsId(u);
  const [st] = await Promise.all([statsOf(u), id && Store.kind === 'supabase' ? Store.profileExtras(id).catch(() => null) : null]).catch(() => [null]);
  if (m.scrim.isConnected) { stats = st || stats; draw(); }
}
// Customize Your Badges: drag them into the order you want, and click the ones nobody else should see
async function customizeBadges(after) {
  if (Store.kind === 'supabase' && !Store.canFrame()) return toast('Badges need the newest supabase/setup.sql: run it again in Supabase.');
  const u = asMember(), stats = statsNow(u) || (await statsOf(u).catch(() => null));
  if (!stats) return toast('Your badges aren’t known yet. Try again in a moment.');
  const bp = badgePrefs(u), res = badgesOf(stats, { ...bp, all: true }), have = res.have;
  if (!have.length) return toast('You haven’t earned a badge yet. Open Badges to see how.');
  let order = have.map((b) => b.id), hidden = have.filter((b) => res.hiddenOf(b)).map((b) => b.id), dragId = null;
  const grid = el('div', { className: 'cb-grid' }), pv = el('div', { className: 'cb-pv' });
  const drawPv = () => { const shown = order.filter((id) => !hidden.includes(id)); pv.replaceChildren(...[el('span', {}, 'On your profile:'), ...shown.slice(0, 6).map((id) => badgeIcon(id, 22)),
    shown.length > 6 ? el('span', { className: 'p-badge more' }, '+' + (shown.length - 6)) : null, shown.length ? null : el('i', {}, 'none')].filter(Boolean)); };
  const draw = () => { grid.replaceChildren(...order.map((id) => {
    const b = have.find((x) => x.id === id), off = hidden.includes(id);
    const t = el('button', { className: 'cb-tile' + (off ? ' hid' : ''), draggable: true, title: `${badgeTitle(b)}. Click to ${off ? 'show' : 'hide'} it, drag to move it.`,
      onclick: () => { hidden = off ? hidden.filter((x) => x !== id) : [...hidden, id]; draw(); } }, badgeIcon(id, 34), off ? el('span', { className: 'cb-eye' }, icon('eyeOff', 14)) : null);
    t.dataset.id = id;
    t.addEventListener('dragstart', (e) => { dragId = id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch {} setTimeout(() => t.classList.add('drag'), 0); });
    t.addEventListener('dragend', () => { dragId = null; draw(); });
    t.addEventListener('dragover', (e) => {
      if (!dragId) return; e.preventDefault();
      if (dragId === id) return;
      const from = order.indexOf(dragId), to = order.indexOf(id); order.splice(from, 1); order.splice(to, 0, dragId);
      const moving = grid.querySelector(`[data-id="${dragId}"]`); if (moving) (from < to ? t.after(moving) : t.before(moving));
    });
    return t;
  })); drawPv(); };
  // (just the best of each kind: the rest hidden)
  const bestOnly = () => { const top = new Map(); for (const b of have) if (b.kind && (!top.has(b.kind.id) || b.tier > top.get(b.kind.id).tier)) top.set(b.kind.id, b); hidden = have.filter((b) => b.kind && top.get(b.kind.id) !== b).map((b) => b.id); draw(); };
  const save = async () => {
    const cap = Store.kind === 'supabase' && !Store.canBux() ? 40 : 120;            // (an older setup.sql keeps up to 40 of each)
    if ((await attempt(() => Store.setProfileExtras({ badges: { order: order.slice(0, cap), hidden: hidden.slice(0, cap) } }))) === null) return;
    m.close(); toast('Badges saved.'); if (after) after(); renderAll();
  };
  const m = modal({ title: 'Customize Your Badges', sub: 'Drag them into the order you want them shown in, and click the ones you don’t want others to see.', cls: 'cb-dlg', body: [grid, pv],
    actions: [el('button', { className: 'btn ghost', onclick: () => { order = badgesOf(stats, {}).have.map((b) => b.id); hidden = []; draw(); } }, 'Reset'),
      el('button', { className: 'btn ghost', title: 'Show only the best badge of each kind', onclick: bestOnly }, 'Best of Each'), el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), el('button', { className: 'btn primary', onclick: save }, 'Save')] });
  draw();
}

// other people's profiles are theirs to fill in, so only colours and pictures of the expected shape are drawn
// (a stray web address would let a stranger see who looked at their profile)
const safeColor = (c, fallback = '#5b7fd6') => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback);
const safeImg = (u) => (typeof u === 'string' && (/^data:image\/(png|jpeg|webp|gif);base64,/.test(u)
  || /^https:\/\/(cdn\.discordapp\.com|avatars\.githubusercontent\.com|[a-z0-9-]+\.supabase\.co)\//.test(u)) ? u : '');
// pick a picture, then move and scale it in its frame (ui.js cropPicture): the data URL, or null if you didn't
const pickPicture = (opts) => new Promise((done) => pickFile(async (f) => { try { done(await cropPicture(f, opts)); } catch (e) { toast(String((e && e.message) || e)); done(null); } }));
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
  plateMove(row, bg ? plate : '');
  return row;
}
const setBanner = (node, value, color) => { node.style.background = paint(value) || safeColor(color); };

// ---------- every part you can show, hide, move and rename (Customize → Elements) ----------
// [id, what it is, icon, fixed] — a fixed one can be moved but not hidden (you always need a way into settings)
const BUTTONS = {
  titlebar: ['Title bar', [['tbIcon', 'Server icon (or the logo)', 'logo'], ['tbName', 'Where you are', 'hash', 1]]],
  rail: ['Server rail', [['home', 'Direct Messages', 'logo'], ['servers', 'Your servers', 'bot', 1], ['add', 'Add a Server', 'plus'], ['discover', 'Discover', 'compass']]],
  railPanel: ['Your controls, in the server rail', [['deafen', 'Deafen', 'headphones'], ['mic', 'Mute', 'mic'], ['me', 'You (your picture)', 'user', 1], ['settings', 'User Settings', 'gear', 1]]],
  header: ['Server header', [['invite', 'Invite People', 'personAdd'], ['serverMenu', 'Server menu arrow', 'chevD']]],
  serverTop: ['Server sidebar', [['browse', 'Browse', 'browse'], ['guide', 'Guide', 'signpost'], ['events', 'Event', 'calendar'], ['boost', 'Boost', 'gem'], ['shop', 'Shop', 'shop'],
    ['rules', 'Rules', 'rules'], ['games', 'Servers', 'servers']]],
  channels: ['Channel list', [['newChannel', 'New channel (+)', 'plus'], ['chanInvite', 'Invite, on hover', 'personAdd'], ['chanSettings', 'Channel settings, on hover', 'gear'], ['delChannel', 'Delete channel (×)', 'x']]],
  dms: ['Direct messages header', [['findDM', 'Find or start a conversation', 'search'], ['newDM', 'New DM (+)', 'plus']]],
  dmNav: ['Direct messages sidebar', [['browseNav', 'Browse', 'search'], ['friendsNav', 'Friends', 'users'], ['datbuxNav', 'Bank', 'coin'], ['collectionNav', 'Collection', 'collection'],
    ['shopNav', 'Shop', 'shop'], ['questsNav', 'Quest', 'quest']]],
  top: ['Top bar', [['sideShow', 'Show the sidebar (while it’s hidden)', 'menu'], ['call', 'Start a voice call', 'phone'], ['video', 'Start a video call', 'video'], ['addPeople', 'Add friends to the DM', 'usersPlus'], ['threads', 'Threads', 'thread'],
    ['notify', 'Notification settings', 'bell'], ['pins', 'Pinned messages', 'pin'], ['dmProfile', 'User profile, in DMs', 'user'], ['members', 'Member list', 'users'], ['search', 'Search', 'search'], ['saved', 'Bookmarks', 'bookmark']]],
  msgActions: ['Message buttons (on hover)', [['quick', 'Quick reactions', 'smile'], ['react', 'Add Reaction', 'smilePlus'], ['reply', 'Reply', 'reply'], ['forward', 'Forward', 'forward'],
    ['thread', 'Create Thread', 'thread'], ['more', 'More', 'more', 1]]],
  composer: ['Message box', [['upload', 'Attach files and pictures', 'plusCircle'], ['input', 'The text box', 'edit', 1], ['emoji', 'Emoji', 'smile'], ['sticker', 'Stickers', 'sticker'], ['voice', 'Voice message', 'mic'], ['send', 'Send', 'send']]],
  panel: ['Your controls, under the sidebar', [['me', 'You (avatar and name)', 'user', 1], ['mic', 'Mute', 'mic'], ['deafen', 'Deafen', 'headphones'], ['settings', 'User Settings', 'gear', 1]]],
  profileCard: ['Profile cards (DM profile and full profile)', [['pBadges', 'Badges and server tag', 'medal'], ['pMutual', 'Mutual friends and servers', 'users'], ['pSince', 'Member since, boosting since, friends since', 'calendar'],
    ['pBio', 'About', 'edit'], ['pPlaying', 'Playing', 'game'], ['pGames', 'Game Collection', 'game'], ['pWish', 'Wishlist', 'star'], ['pConns', 'Connections', 'link'], ['pNote', 'Your note on them', 'edit']]],
  profileTabs: ['Full profile tabs', [['tWidget', 'Widget', 'apps'], ['tWish', 'Wishlist', 'star'], ['tCollection', 'Collection', 'collection'], ['tFriends', 'Mutual Friends', 'users'],
    ['tServers', 'Mutual Server', 'compass'], ['tActivity', 'Activity', 'clock']]],
};
// what an item is called: your own name for it (Customize → Elements), else its own
const labelOf = (group, id) => { const own = (prefs.labels || {})[id]; if (own) return own; const b = (BUTTONS[group] || [, []])[1].find((x) => x[0] === id); return b ? b[1] : id; };
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
  const deco = user.decoration && prefs.decorations !== 'off' ? decoEl(user.decoration) : null;
  if (deco) a.append(deco);
  const st = status || (user.me ? me.status : user.status);
  if (st) a.append(el('div', { className: 'dot ' + st }));
  return a;
}

// ---------- themes (built-in + your own) ----------
const BUILTIN = [['dark', 'Dark'], ['midnight', 'Midnight'], ['ember', 'Ember'], ['forest', 'Forest'], ['light', 'Light']];
// (their colours, for the swatches in Customize: the same as app.css)
const BUILTIN_SWATCH = { dark: { rail: '#1a1d23', side: '#20242c', main: '#282d36', accent: '#5b7fd6' }, midnight: { rail: '#05070d', side: '#0a0e18', main: '#0e1320', accent: '#6ea8ff' },
  ember: { rail: '#1b1310', side: '#231915', main: '#2c201a', accent: '#e8743b' }, forest: { rail: '#0f1713', side: '#15201a', main: '#1b2a21', accent: '#4bbf73' },
  light: { rail: '#e4e7ec', side: '#eef1f5', main: '#ffffff', accent: '#2f6fed' } };
const VARS = ['rail', 'side', 'main', 'input', 'hover', 'text', 'muted', 'bright', 'accent', 'accent-text', 'line'];
const loadThemes = () => { try { return JSON.parse(localStorage.getItem('fluency.themes')) || []; } catch { return []; } };
const saveThemes = (t) => { try { localStorage.setItem('fluency.themes', JSON.stringify(t)); } catch {} changedSettings(); };
// put a theme on (changed: you chose it, so it's kept with your account too)
function applyTheme(id, changed = true) {
  const cur = document.getElementById('fluency-custom-css'); if (cur) cur.remove();
  VARS.forEach((v) => document.documentElement.style.removeProperty('--' + v));
  const custom = loadThemes().find((t) => t.id === id);
  if (custom) {
    document.documentElement.dataset.theme = 'dark';
    VARS.forEach((v) => { if (custom.vars[v]) document.documentElement.style.setProperty('--' + v, custom.vars[v]); });
    if (custom.css) document.head.append(el('style', { id: 'fluency-custom-css', textContent: custom.css }));
  } else document.documentElement.dataset.theme = BUILTIN.some((b) => b[0] === id) ? id : 'dark';
  try { localStorage.setItem('fluency.theme', id); } catch {}
  setFavicon(appLogo());
  if (document.body.dataset.booted) renderRail();            // (the Home button wears the theme's logo)
  if (changed) changedSettings();
}
const currentTheme = () => { try { return localStorage.getItem('fluency.theme') || 'dark'; } catch { return 'dark'; } };
// the logo you see (Home button, tab icon, sign-in): the one you picked, else the one your theme brings
function appLogo() {
  if (typeof prefs !== 'undefined' && prefs.logo && prefs.logo !== 'theme' && LOGOS.some((l) => l[0] === prefs.logo)) return prefs.logo;
  const id = currentTheme(), custom = loadThemes().find((t) => t.id === id);
  return (custom && custom.logo) || THEME_LOGO[id] || 'accent';
}
// a grid of every look, to pick one (for Appearance and the theme editor)
function logoGrid(current, onPick, { withTheme = false } = {}) {
  const grid = el('div', { className: 'lg-grid' });
  const tile = (id, name, face) => {
    const b = el('button', { className: 'lg-tile' + (current === id ? ' on' : ''), title: name, onclick: () => { current = id; for (const x of grid.children) x.classList.toggle('on', x === b); onPick(id); } }, face, el('span', {}, name));
    return b;
  };
  if (withTheme) grid.append(tile('theme', 'Match Theme', el('div', { className: 'lg-match' }, icon('palette', 22))));
  for (const [id, name] of LOGOS) grid.append(tile(id, name, logoEl(id, { size: 48 })));
  return grid;
}
applyTheme(currentTheme(), false);

// ---------- your settings, following your account (Customize → Sync) ----------
// Signed in (with setup.sql 10), what Customize keeps (your theme, your themes and your preferences, except a few that are
// about this device) goes with your account: changed here, it's saved there a moment later; changed on another device,
// it comes here. Whichever was changed last wins.
const SYNC_AT = 'fluentdat.settingsAt', SYNC_SEEN = 'fluentdat.settingsSeen';
const DEVICE_ONLY = ['micMuted', 'deafened', 'notify', 'syncSettings', 'sideOff'];
const syncable = () => Store.kind === 'supabase' && !!Store.canSync && Store.canSync() && prefs.syncSettings !== false;
const settingsData = () => ({ v: 1, prefs: Object.fromEntries(Object.entries(prefs).filter(([k]) => !DEVICE_ONLY.includes(k))), theme: currentTheme(), themes: loadThemes() });
// (this browser's settings are just the ones Fluentdat comes with)
const pristine = () => JSON.stringify(settingsData()) === JSON.stringify({ v: 1, prefs: Object.fromEntries(Object.entries(loadPrefs({})).filter(([k]) => !DEVICE_ONLY.includes(k))), theme: 'dark', themes: [] });
const lsNum = (k) => { try { return +localStorage.getItem(k) || 0; } catch { return 0; } };
const lsPut = (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} };
let syncTimer = 0, adopting = false, syncNote = { state: 'idle', at: 0, err: '' }, lastLocal = JSON.stringify(settingsData());
// something Customize keeps changed here (a preference, a theme): note when, and save it with your account in a moment
function changedSettings() {
  if (adopting) return;
  const now = JSON.stringify(settingsData());
  if (now === lastLocal) return;                        // (only a preference about this device, or nothing at all)
  lastLocal = now; lsPut(SYNC_AT, Date.now());
  clearTimeout(syncTimer); syncTimer = setTimeout(pushSettings, 1200);
  if (syncable()) { syncNote = { ...syncNote, state: 'saving' }; czSync(); }
}
async function pushSettings() {
  syncTimer = 0;
  if (!syncable()) return;
  syncNote = { ...syncNote, state: 'saving' }; czSync();
  try { const at = await Store.saveSettings(settingsData()); lsPut(SYNC_SEEN, at); syncNote = { state: 'saved', at, err: '' }; }
  catch (e) { syncNote = { ...syncNote, state: 'error', err: String((e && e.message) || e) }; }
  czSync();
}
// the account's settings, when they're newer than this browser's: put them on
function adoptSettings() {
  if (!syncable() || syncTimer) return;
  const r = Store.settings(), seen = lsNum(SYNC_SEEN), mine = lsNum(SYNC_AT);
  // (nothing with your account yet: this browser's go there, if it has any of its own; a browser that never changed a
  // thing waits for one that did)
  if (!r) { if ((mine || !pristine()) && syncNote.state !== 'saving') pushSettings(); return; }
  if (r.at <= seen) { if (syncNote.state === 'idle') { syncNote = { state: 'saved', at: r.at, err: '' }; czSync(); } return; }
  if (mine > r.at) return pushSettings();                                               // (changed here since: this browser's win)
  const d = r.data || {};
  adopting = true;
  try {
    if (d.prefs && typeof d.prefs === 'object') {
      const keep = Object.fromEntries(DEVICE_ONLY.filter((k) => k in prefs).map((k) => [k, prefs[k]]));
      prefs = { ...loadPrefs(d.prefs), ...keep };
      try { localStorage.setItem('fluentdat.prefs', JSON.stringify(prefs)); } catch {}
    }
    if (Array.isArray(d.themes)) try { localStorage.setItem('fluency.themes', JSON.stringify(d.themes)); } catch {}
    if (typeof d.theme === 'string') applyTheme(d.theme, false);
    lsPut(SYNC_SEEN, r.at); lastLocal = JSON.stringify(settingsData());
    syncNote = { state: 'saved', at: r.at, err: '' };
    showMembers = prefs.membersDefault !== false;
    applyPrefs(); renderAll(); if (CUSTOMIZE) renderCustomize();
    toast('Your theme and layout came from your account.');
  } finally { adopting = false; }
}
// (the Customize site and the chat in another tab share this browser: a change in one shows in the other at once)
addEventListener('storage', (e) => {
  if (e.key === 'fluentdat.prefs') { prefs = loadPrefs(); lastLocal = JSON.stringify(settingsData()); showMembers = prefs.membersDefault !== false; applyPrefs(); renderAll(); if (CUSTOMIZE) renderCustomize(); }
  else if (e.key === 'fluency.theme' || e.key === 'fluency.themes') { applyTheme(currentTheme(), false); lastLocal = JSON.stringify(settingsData()); renderAll(); if (CUSTOMIZE) renderCustomize(); }
});
const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue('--' + v).trim() || '#000000';

// ---------- state ----------
let view = 'server', serverId = (Store.servers()[0] || {}).id || null, channelId = null, dmId = null, friendsTab = 'online', showMembers = true;
let discoverCat = '', discoverQ = '', searchOpen = false, searchQ = '', searchKey = '';
let homePage = null;                    // (the Direct Messages side shows Friends, or 'datbux', 'shop' or 'quests')
let serverPage = null;                  // (a server's own page instead of a channel: { sv, id: 'browse' | 'games' | 'guide' })
const pageNow = () => (view === 'server' && serverPage && serverPage.sv === serverId ? serverPage.id : null);
// a server's sidebar extras (Server Settings → Server Sidebar): Browse Channels and Events are on unless switched off
const FEATURES = { browse: true, guide: true, events: true, boost: true, shop: true, rules: true, games: true, member_events: false };
const featureOn = (sv, id) => !!(sv && { ...FEATURES, ...(sv.features || {}) }[id]);
// channels you've hidden from your list (Browse Channels), per server, in this browser
const HIDDEN_CHANS = 'fluentdat.hiddenChannels';
let hiddenChans = (() => { try { const v = JSON.parse(localStorage.getItem(HIDDEN_CHANS)); return v && typeof v === 'object' ? v : {}; } catch { return {}; } })();
const chanHidden = (sv, id) => (hiddenChans[sv] || []).includes(id);
function setChanHidden(sv, id, hide) {
  const l = new Set(hiddenChans[sv] || []); if (hide) l.add(id); else l.delete(id);
  hiddenChans = { ...hiddenChans, [sv]: [...l] };
  try { localStorage.setItem(HIDDEN_CHANS, JSON.stringify(hiddenChans)); } catch {}
}
// DMs you've closed (they come back when you message that person again)
const closedDMs = new Set((() => { try { return JSON.parse(localStorage.getItem('fluentdat.closedDMs')) || []; } catch { return []; } })());
const saveClosed = () => { try { localStorage.setItem('fluentdat.closedDMs', JSON.stringify([...closedDMs])); } catch {} };
// keep the chosen server/channel pointing at something real (data can arrive or vanish while you're looking)
function ensureSelection() {
  const svs = Store.servers();
  if (!serverId || !svs.some((s) => s.id === serverId)) serverId = svs[0] ? svs[0].id : null;
  if (!channelId || !openable(serverId, channelId)) channelId = firstChannel(serverId);
}
// (a place you can have open in a server: one of its channels, or a thread in one)
const openable = (sv, id) => { const c = id && Store.channel(id); return !!c && Store.channels(sv).some((x) => x.id === (c.kind === 'thread' ? c.parent : c.id)); };
const collapsed = new Set();
function firstChannel(sv) { if (!sv) return null; const c = Store.channels(sv).find((x) => x.kind === 'text') || Store.channels(sv)[0]; return c ? c.id : null; }
// the channel you last had open in each server (Discord takes you back there)
const lastChan = (() => { try { return JSON.parse(localStorage.getItem('fluentdat.lastChannel')) || {}; } catch { return {}; } })();
const lastChannel = (sv) => (lastChan[sv] && openable(sv, lastChan[sv]) && Store.channel(lastChan[sv]).kind !== 'voice' ? lastChan[sv] : firstChannel(sv));
const rememberChannel = (sv, c) => { lastChan[sv] = c; try { localStorage.setItem('fluentdat.lastChannel', JSON.stringify(lastChan)); } catch {} };
// what you're writing in each conversation: attachments waiting to go, and the message you're replying to
const drafts = new Map();
const draft = (place) => { if (!drafts.has(place)) drafts.set(place, { files: [], reply: null }); return drafts.get(place); };
const placeNow = () => (view === 'home' ? dmId : view === 'server' ? channelId : null);
let call = null, ringing = null, ringTimer = 0;   // the call you're in, and one ringing for you
let newLine = { place: null, at: 0 };              // where the red NEW line goes in the conversation you just opened
let keepUnread = null;                             // a place you just marked unread: it isn't marked read again until you come back to it

// ---------- kept in this browser only: people you ignore, saved messages, reminders, your notes on people ----------
const LS = { get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const isIgnored = (uid) => !!uid && LS.get('fluentdat.ignored', []).includes(uid);
function setIgnored(u, on) {
  const all = new Set(LS.get('fluentdat.ignored', [])); if (on) all.add(u.id); else all.delete(u.id);
  LS.set('fluentdat.ignored', [...all]); renderAll();
  toast(on ? `You’re ignoring ${u.name}: their messages are tucked away and they won’t notify you.` : `You’re not ignoring ${u.name} any more.`);
}
// someone whose messages you don't see (unless you choose to): blocked, or ignored
const hiddenAuthor = (u) => !!u && !!u.id && !u.bot && !isMe(u) && (Store.blocked(u.id) || isIgnored(u.id));
const revealed = new Set();          // (their messages you chose to see anyway, this time)
// your saved messages (Bookmark Message), newest first
const bookmarks = () => LS.get('fluentdat.bookmarks', []);
const bookmarked = (id) => bookmarks().some((b) => b.id === id);
function whereNow() { return view === 'home' ? { dm: true, place: dmId, server: null } : { dm: false, place: channelId, server: serverId }; }
function placeLabel(t) {
  if (t.dm) { const d = Store.dmInfo ? Store.dmInfo(t.place) : null; return d ? (d.kind === 'group' ? dmName(d) : '@' + dmName(d)) : 'a DM'; }
  const c = Store.channel(t.place), sv = c && Store.server(c.server); return c ? `#${c.name}${sv ? ' · ' + sv.name : ''}` : 'a channel';
}
const excerptOf = (m) => (m.text ? plainText(m.text, fmtCtx()) : (m.files || []).length ? `${m.files.length} attachment${m.files.length === 1 ? '' : 's'}` : m.sticker ? 'a sticker' : '').slice(0, 300);
function toggleBookmark(m) {
  const all = bookmarks();
  if (all.some((b) => b.id === m.id)) { LS.set('fluentdat.bookmarks', all.filter((b) => b.id !== m.id)); toast('Removed from your bookmarks.'); renderTop(); return renderContent(); }
  const w = whereNow();
  LS.set('fluentdat.bookmarks', [{ ...w, id: m.id, ts: m.ts, at: Date.now(), text: excerptOf(m), author: face(m.user), from: placeLabel(w) }, ...all].slice(0, 200));
  toast('Bookmarked. Find it under the bookmark at the top.'); renderTop(); renderContent();
}
// reminders: a message to come back to (they go off while Fluentdat is open)
function remindMe(m, minutes) {
  const w = whereNow(), due = minutes === 'tomorrow' ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return +d; })() : Date.now() + minutes * 60000;
  LS.set('fluentdat.reminders', [...LS.get('fluentdat.reminders', []), { ...w, id: m.id, due, text: excerptOf(m), author: m.user.name, from: placeLabel(w) }]);
  toast(`I’ll remind you ${minutes === 'tomorrow' ? 'tomorrow at 9 AM' : 'in ' + (minutes < 60 ? minutes + ' minutes' : minutes / 60 + (minutes === 60 ? ' hour' : ' hours'))} (while Fluentdat is open).`);
}
function checkReminders() {
  const all = LS.get('fluentdat.reminders', []), now = Date.now(), due = all.filter((r) => r.due <= now);
  if (!due.length) return;
  LS.set('fluentdat.reminders', all.filter((r) => r.due > now));
  for (const r of due) {
    notifyDesktop('Reminder', `${r.author}: ${r.text}`, () => goToMessage(r), 'reminder-' + r.id);
    notice(`Reminder: ${r.author} in ${r.from}: “${r.text.slice(0, 80)}”`, 'Go to Message', () => goToMessage(r));
  }
}
setInterval(checkReminders, 15000); setTimeout(checkReminders, 3000);
// a notice at the bottom with a button (a reminder, an undo)
function notice(text, label, action) {
  const n = el('div', { className: 'notice' }, el('span', {}, text), el('button', { className: 'btn small primary', onclick: () => { n.remove(); action(); } }, label), el('button', { className: 'notice-x', title: 'Dismiss', onclick: () => n.remove() }, icon('x', 16)));
  document.body.append(n); setTimeout(() => n.remove(), 20000);
}
// your own note on someone (only you see it)
const noteOn = (uid) => (LS.get('fluentdat.notes', {})[uid] || '');
function setNote(uid, text) { const all = LS.get('fluentdat.notes', {}); if (text) all[uid] = text.slice(0, 256); else delete all[uid]; LS.set('fluentdat.notes', all); }
// a message somewhere: go there, and to it (once it's loaded)
function goToMessage(t) {
  if (t.dm) { if (!Store.dmInfo(t.place)) return toast('That conversation isn’t here any more.'); view = 'home'; dmId = t.place; }
  else { const c = Store.channel(t.place); if (!c) return toast('That channel isn’t there any more.'); view = 'server'; serverId = c.server; channelId = c.id; }
  renderAll();
  const until = Date.now() + 8000;
  const look = () => { if ($('#content').querySelector(`.msg[data-id="${CSS.escape(t.id)}"]`)) return jumpTo(t.id); if (Date.now() < until) setTimeout(look, 250); else toast('That message isn’t loaded any more.'); };
  setTimeout(look, 60);
}

// ---------- unread, pings and muting ----------
// how much a place may tell you: its own setting, else its category's, else its server's, else everything ('all',
// 'mentions' or 'none')
const catOf = (place) => (Store.channel ? (Store.channel(place) || {}).category : null) || null;
const parentOf = (place) => (Store.channel ? (Store.channel(place) || {}).parent : null) || null;
function levelFor(place, sv) {
  for (const p of [place, parentOf(place), catOf(place), sv]) { const v = p ? Store.placeSettings(p).notify : 'default'; if (v && v !== 'default') return v; }
  return 'all';
}
const mutedHere = (place, sv) => Store.placeSettings(place).muted || (!!parentOf(place) && Store.placeSettings(parentOf(place)).muted)
  || (!!catOf(place) && Store.placeSettings(catOf(place)).muted) || (!!sv && Store.placeSettings(sv).muted);
// a server where you hide muted channels (right-click the channel list)
const HIDE_MUTED = 'fluentdat.hideMuted';
const hideMuted = new Set((() => { try { const v = JSON.parse(localStorage.getItem(HIDE_MUTED)); return Array.isArray(v) ? v : []; } catch { return []; } })());
function toggleHideMuted(sv) {
  if (hideMuted.has(sv)) hideMuted.delete(sv); else hideMuted.add(sv);
  try { localStorage.setItem(HIDE_MUTED, JSON.stringify([...hideMuted])); } catch {}
}
// someone's name where you are: their nickname in this server, if they set one
const nameIn = (u, sv = view === 'server' ? serverId : null) => (sv && u && u.id && Store.nickIn(sv, u.id)) || (u && u.name) || '';
// what you may do in a channel (a category's permissions; always yes outside servers and signed out)
const mayIn = (perm, place = view === 'server' ? channelId : null) => !place || view !== 'server' || Store.can(place, perm);
function serverUnread(sv) {
  let unread = 0, mentions = 0;
  if (Store.kind !== 'supabase') return { unread, mentions };
  for (const c of Store.channels(sv).flatMap((x) => [x, ...Store.threads(x.id)])) {
    const u = Store.unread(c.id);
    if (levelFor(c.id, sv) !== 'none') mentions += u.mentions;
    if (!mutedHere(c.id, sv)) unread += u.unread;
  }
  return { unread, mentions };
}
const dmUnread = (id) => (Store.placeSettings(id).muted ? 0 : Store.unread(id).unread);
const person = (uid) => (Store.person && Store.person(uid)) || { id: uid, name: 'Someone', color: '#8a8f98' };
const face = (u) => ({ id: u.id, name: u.name, color: u.color, avatar: u.avatar, bot: u.bot });       // (a picture without a status dot)
const dmName = (d) => (!d ? '' : d.kind === 'group' ? d.name || d.people.filter((p) => !isMe(p)).map((p) => p.name).join(', ') || 'Empty Group' : (d.user || {}).name || '');
function dmAvatar(d, size) {
  if (d.kind !== 'group') return avatarEl(d.user, size ? { size } : {});
  const a = el('div', { className: 'avatar group-av' }), fill = el('div', { className: 'fill' }), img = safeImg(d.icon);
  if (size) a.style.width = a.style.height = size + 'px';
  fill.style.background = safeColor(groupColor(d.id));
  if (img) fill.append(el('img', { src: img, alt: '' })); else fill.append(icon('users', size ? Math.round(size * 0.5) : 18));
  a.append(fill);
  return a;
}
// a server's picture (its image, its icon, or its initials) at any size
function serverFace(sv, size = 40) {
  const f = el('div', { className: 'sv-face' }), img = safeImg(sv.img);
  f.style.width = f.style.height = size + 'px'; f.style.fontSize = Math.round(size * 0.36) + 'px';
  if (img) f.append(el('img', { src: img, alt: '' })); else if (ICON[sv.icon]) f.append(icon(sv.icon, Math.round(size * 0.55))); else f.textContent = initials(sv.name);
  return f;
}
const groupColor = (id) => COLORS[[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

// ---------- the name tag beside the rail (and anything else that wants one) ----------
const tipEl = el('div', { className: 'tip', hidden: true });
document.body.append(tipEl);
function tipOn(node, content) {
  node.addEventListener('mouseenter', () => {
    const c = content(); if (!c) return;
    tipEl.replaceChildren(...[].concat(c)); tipEl.hidden = false; tipEl.classList.remove('show'); void tipEl.offsetWidth; tipEl.classList.add('show');
    const r = node.getBoundingClientRect();
    tipEl.style.left = r.right + 8 + 'px';
    tipEl.style.top = Math.max(8, Math.min(innerHeight - tipEl.offsetHeight - 8, r.top + r.height / 2 - tipEl.offsetHeight / 2)) + 'px';
  });
  node.addEventListener('mouseleave', () => { tipEl.hidden = true; });
  node.addEventListener('mousedown', () => { tipEl.hidden = true; });
}


// ---------- the server rail ----------
// Discord's: a pill on the left for where you are (a small one for unread), red counts for pings, a speaker when people
// are in a voice channel, your unread DMs waiting under Home, and a name tag when you point at anything. Its buttons stay
// the same elements from one draw to the next, so the pill grows into a tall bar (and slowly shrinks away) and the icons
// morph smoothly, even when you click from server to server faster than they can finish.
const railKept = new Map();
function railItem(key, build) {
  let w = railKept.get(key);
  if (!w) {
    w = build(); w.dataset.key = key; railKept.set(key, w);
    if (document.body.dataset.booted) { w.classList.add('enter'); setTimeout(() => w.classList.remove('enter'), 450); }
  }
  return w;
}
function railWrap(btn, open) {
  const w = el('div', { className: 'srv-wrap' }, el('span', { className: 'pill' }), btn);
  btn.addEventListener('click', () => w._open && w._open());
  tipOn(w, () => (w._tip ? w._tip() : null));
  return w;
}
function railState(w, { on, unread, ping, voice, tip, open }) {
  w._tip = tip; w._open = open;
  w.classList.toggle('on', !!on); w.classList.toggle('unread', !!unread);
  const btn = w.querySelector('.srv'); if (btn) btn.classList.toggle('on', !!on);
  const txt = ping ? (ping > 99 ? '99+' : String(ping)) : '';
  let b = w.querySelector('.badge');
  if (txt && !b) { b = el('span', { className: 'badge' }); w.append(b); }
  if (b) {
    if (!txt) b.remove();
    else if (b.textContent !== txt) { b.textContent = txt; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  const vb = w.querySelector('.vbadge');
  if (voice && !vb) w.append(el('span', { className: 'vbadge bump' }, icon('volume', 11)));
  if (!voice && vb) vb.remove();
  return w;
}
function renderRail() {
  if (!document.querySelector('.srv-wrap:hover')) { tipEl.hidden = true; tipEl.classList.remove('show'); }
  const parts = [], go = (fn) => () => { fn(); renderAll(); };
  const railBtn = (ic, label, cls) => { const b = el('button', { className: 'srv ' + cls }); b.setAttribute('aria-label', label); b.append(icon(ic, 24)); return b; };
  for (const id of ordered('rail')) {
    if (!shown(id)) continue;
    if (id === 'home') {
      const w = railItem('home', () => railWrap(el('button', { className: 'srv home', ariaLabel: 'Direct Messages' })));
      const lg = appLogo(), btn = w.querySelector('.srv');
      if (btn.dataset.logo !== lg) { btn.dataset.logo = lg; btn.replaceChildren(logoEl(lg, { square: true })); btn.classList.toggle('lg-plain', logoInfo(lg).tile === 'none'); }
      parts.push(railState(w, { on: view === 'home', ping: Store.friendRequests().incoming.length, tip: () => el('b', {}, 'Direct Messages'), open: go(() => { view = 'home'; }) }));
      // unread DMs wait under Home, as on Discord
      for (const d of Store.dmList().filter((x) => dmUnread(x.id) && !(view === 'home' && dmId === x.id)).slice(0, 6)) {
        const dw = railItem('dm:' + d.id, () => railWrap(el('button', { className: 'srv dmu' })));
        const b = dw.querySelector('.srv'), sig = dmName(d) + String((d.user || {}).avatar || d.icon || '').length;
        if (b.dataset.sig !== sig) { b.dataset.sig = sig; b.replaceChildren(dmAvatar(d)); b.setAttribute('aria-label', dmName(d)); }
        parts.push(railState(dw, { unread: true, ping: dmUnread(d.id), tip: () => el('b', {}, dmName(d)), open: go(() => { view = 'home'; dmId = d.id; }) }));
      }
    }
    else if (id === 'add') parts.push(railState(railItem('add', () => railWrap(railBtn('plus', 'Add a Server', 'add'))), { tip: () => el('b', {}, 'Add a Server'), open: () => addServerFlow() }));
    else if (id === 'discover') parts.push(railState(railItem('discover', () => railWrap(railBtn('compass', 'Discover', 'add discover'))), { on: view === 'discover', tip: () => el('b', {}, 'Discover'), open: go(() => { view = 'discover'; }) }));
    else if (id === 'servers') {
      if (parts.length) parts.push(railItem('hr', () => el('hr')));
      for (const s of Store.servers()) {
        const on = view === 'server' && s.id === serverId, st = serverUnread(s.id);
        const w = railItem('sv:' + s.id, () => {
          const b = el('button', { className: 'srv', oncontextmenu: (e) => { e.preventDefault(); serverCtx(w._s, e.clientX, e.clientY); } });
          const ww = railWrap(b); return ww;
        });
        w._s = s;
        const b = w.querySelector('.srv'), img = safeImg(s.img), sig = s.name + '|' + (img ? img.length : '') + '|' + s.icon;
        if (b.dataset.sig !== sig) {
          b.dataset.sig = sig; b.setAttribute('aria-label', s.name);
          if (img) b.replaceChildren(el('img', { src: img, alt: '' })); else if (ICON[s.icon]) b.replaceChildren(icon(s.icon, 24)); else b.replaceChildren(initials(s.name));
        }
        parts.push(railState(w, { on, unread: !on && st.unread > 0 && !Store.placeSettings(s.id).muted, ping: st.mentions,
          voice: Object.values(Store.voice(s.id)).some((l) => l.length), tip: () => serverTip(s),
          open: go(() => { view = 'server'; serverId = s.id; channelId = lastChannel(s.id); }) }));
      }
    }
  }
  const rail = $('#rail');
  let i = 0;
  for (const n of parts) { if (rail.children[i] !== n) rail.insertBefore(n, rail.children[i] || null); i++; }
  while (rail.children.length > parts.length) rail.lastElementChild.remove();
  for (const [k, n] of railKept) if (!parts.includes(n)) railKept.delete(k);
}
// a server's name tag: its name, and who's in which voice channel
function serverTip(s) {
  const out = [el('b', {}, s.name)];
  for (const [ch, ppl] of Object.entries(Store.voice(s.id))) {
    const c = Store.channel(ch); if (!c || !ppl.length) continue;
    out.push(el('div', { className: 'tip-voice' }, icon('volume', 14), el('span', {}, c.name)),
      el('div', { className: 'tip-people' }, ...ppl.slice(0, 10).map((p) => avatarEl(face(person(p.uid)), { size: 22 }))));
  }
  return out;
}

// ---------- the sidebar ----------
let unfolding = null;             // (a category just opened: its channels unfold)
let sideSwap = -1e9;              // (when you last switched servers: the header, then the channels, come in one after another)
const SIDE_SWAP_MS = 760;
// a row coming in after a switch, in its turn (one drawn again partway through carries on from where it was)
function swapIn(node, i) {
  const t = performance.now() - sideSwap;
  if (!node || t > SIDE_SWAP_MS) return node;
  node.classList.add('swap-in'); node.style.animationDelay = Math.round(Math.min(i, 16) * 24 - t) + 'ms';
  return node;
}
function renderSide() {
  const head = $('#side-head'), body = $('#side-body');
  const side = head.parentElement, wasServer = side.dataset.server;
  side.dataset.server = view === 'server' ? serverId || '' : '';
  const switched = side.dataset.server !== wasServer && wasServer !== undefined;
  if (switched) { sideSwap = performance.now(); head.classList.remove('swap-in'); void head.offsetWidth; }      // (its animation starts over)
  const swapping = performance.now() - sideSwap < SIDE_SWAP_MS;
  head.onclick = null; head.className = 'side-head' + (swapping ? ' swap-in' : ''); head.style.removeProperty('--banner');
  body.oncontextmenu = null;
  if (side.dataset.server !== wasServer) side.classList.remove('banner-tucked');
  side.classList.remove('banner-over');
  if (view === 'home') return dmSide(head, body);
  if (view === 'discover') {
    head.replaceChildren('Discover');
    body.replaceChildren(...DISCOVER_CATS.map(([id, label, ic], i) => swapIn(el('button', { className: 'nav-btn' + (discoverCat === id ? ' on' : ''),
      onclick: () => { discoverCat = id; renderSide(); renderContent(); $('#app').classList.remove('show-side'); } }, icon(ic), label), i)));
    return;
  }
  if (!serverId || !Store.server(serverId)) {
    head.replaceChildren(Store.syncState().loading ? 'Loading…' : 'No servers');
    body.replaceChildren(el('div', { style: 'color:var(--muted);padding:14px 10px;font-size:.9rem' },
      Store.syncState().loading ? 'Fetching your servers…' : 'Make one, join one with an invite, or find one in Discover: the buttons in the server rail.'));
    return;
  }
  const server = Store.server(serverId), can = Store.canManage(serverId), live = Store.kind === 'supabase';
  const canChans = (catId) => can || (!!catId && Store.can(catId, 'manage_channels'));
  const bg = prefs.serverBanner !== 'off' && paint(server.banner), under = prefs.bannerStyle !== 'behind';
  head.className = 'side-head btn-like' + (bg ? (under ? ' banner-under' : ' has-banner') : '') + (swapping ? ' swap-in' : '');
  if (bg) head.style.setProperty('--banner', bg);
  // (behind the name, the banner's bottom fades into the channels, which come up over it a little, when the header sits
  // right above them; under the name, it's a picture of its own)
  const order = validOrder(prefs.sideOrder, ['head', 'body', 'panel']);
  head.parentElement.classList.toggle('banner-over', !!bg && !under && prefs.sideHead !== 'off' && order.indexOf('body') === order.indexOf('head') + 1);
  const inviting = live ? Store.canAnywhere(serverId, 'invite') : true;      // (signed out, Invite explains how it works)
  const row = el('div', { className: 'sh-row' }, el('span', { className: 'sh-name' }, server.name), ...ordered('header').map((id) =>
    id === 'invite' ? (shown('invite') && inviting ? el('button', { className: 'sh-btn', title: 'Invite People', onclick: (e) => { e.stopPropagation(); inviteFriends(serverId); } }, icon('personAdd', 18)) : null)
      : shown('serverMenu') ? el('span', { className: 'drop' }, icon('chevD', 18)) : null));
  head.replaceChildren(row, ...(bg && under ? [el('div', { className: 'side-banner' })] : []));
  if (bg && under) { head.classList.remove('btn-like'); row.classList.add('btn-like'); row.onclick = () => serverMenu(row); }
  else head.onclick = () => serverMenu(row);
  body.replaceChildren();
  body.oncontextmenu = (e) => { if (e.target.closest('.chan, .cat, .vmem')) return; e.preventDefault(); sideCtx(e.clientX, e.clientY); };
  const cats = Store.categories(serverId), chans = Store.channels(serverId);
  const groups = cats.length ? cats : [{ id: null, name: 'Channels' }];
  const hiding = live && hideMuted.has(serverId);
  let k = 0;
  // (Browse, Guide, Event, Boost, Shop, Rules and Servers: as the server's admins switched them on, in the order, with the
  // ones and the names you chose in Customize)
  const extras = ordered('serverTop').filter((id) => shown(id) && featureOn(server, id) && ((id !== 'events' && id !== 'boost') || live));
  for (const id of extras) {
    const [, , ic] = BUTTONS.serverTop[1].find((b) => b[0] === id), n = id === 'events' ? Store.events(serverId).length : 0;
    body.append(swapIn(el('button', { className: 'chan side-x' + (pageNow() === id ? ' on' : ''), onclick: () => openServerPage(id) },
      icon(ic, 18), el('span', { className: 'nm' }, labelOf('serverTop', id)), n ? el('span', { className: 'mbadge soft', title: plural(n, 'upcoming event') }, String(n)) : null), k++));
  }
  if (extras.length) body.append(el('div', { className: 'side-sep' }));
  for (const cat of groups) {
    const mine = chans.filter((c) => (cat.id ? c.category === cat.id : true));
    const isCollapsed = collapsed.has(cat.id);
    const head = el('div', { className: 'cat' + (isCollapsed ? ' collapsed' : ''), title: isCollapsed ? 'Show its channels' : 'Hide its channels', onclick: () => { if (isCollapsed) { collapsed.delete(cat.id); unfolding = cat.id; } else collapsed.add(cat.id); renderSide(); unfolding = null; },
      oncontextmenu: (e) => { e.preventDefault(); categoryCtx(cat, e.clientX, e.clientY); } },
      el('span', { className: 'caret' }, icon('chevD')), el('span', { className: 'nm' }, el('span', { className: 'nm-t' }, cat.name)),
      canChans(cat.id) && shown('newChannel') ? el('span', { className: 'add', title: 'Create Channel', onclick: (e) => { e.stopPropagation(); newChannelFlow(cat.id); } }, icon('plus')) : null);
    head.setAttribute('role', 'button'); head.setAttribute('aria-expanded', String(!isCollapsed));
    body.append(swapIn(head, k++));
    // (a collapsed category still shows the channel you're in, and ones with something new, as on Discord; hiding
    // muted channels keeps the one you're in and ones that ping you)
    for (const c of mine) {
      const u = Store.unread(c.id), muted = mutedHere(c.id, serverId), isOn = c.id === channelId && view === 'server';
      const fresh = u.unread > 0 && !muted && !isOn, ping = !isOn && u.mentions > 0 && levelFor(c.id, serverId) !== 'none';
      const voiceHere = c.kind === 'voice' ? Store.voice(serverId)[c.id] || [] : [];
      if (isCollapsed && !isOn && !fresh && !ping && !voiceHere.length) continue;
      if (hiding && muted && !isOn && !ping) continue;
      if (chanHidden(serverId, c.id) && !isOn && !ping) continue;           // (hidden in Browse Channels)
      const editable = canChans(c.category);
      const rowc = el('button', { className: 'chan' + (isOn && !pageNow() ? ' on' : '') + (fresh || ping ? ' unread' : '') + (muted ? ' muted' : '') + (call && call.place === c.id ? ' joined' : ''),
        onclick: () => openChannel(c),
        oncontextmenu: (e) => { e.preventDefault(); channelCtx(c, e.clientX, e.clientY); } },
        icon(c.kind === 'voice' ? 'volume' : 'hash', 18), el('span', { className: 'nm' }, c.name));
      if (unfolding === cat.id) { rowc.classList.add('unfold'); rowc.style.animationDelay = (mine.indexOf(c) * 0.03) + 's'; }
      if (ping) rowc.append(el('span', { className: 'mbadge' }, u.mentions > 99 ? '99+' : String(u.mentions)));
      for (const id of ordered('channels')) {
        if (id === 'chanInvite' && shown(id) && inviting) rowc.append(el('span', { className: 'x ci', title: 'Create Invite', onclick: (e) => { e.stopPropagation(); inviteFriends(serverId); } }, icon('personAdd')));
        if (id === 'chanSettings' && shown(id) && editable) rowc.append(el('span', { className: 'x cs', title: 'Edit Channel', onclick: (e) => { e.stopPropagation(); editChannel(c); } }, icon('gear')));
        if (id === 'delChannel' && shown(id) && editable && chans.length > 1) rowc.append(el('span', { className: 'x', title: 'Delete Channel', onclick: (e) => { e.stopPropagation(); deleteChannel(c); } }, icon('x')));
      }
      body.append(swapIn(rowc, k++));
      for (const v of voiceHere) body.append(swapIn(voiceMember(v, c), k++));
      // (its threads: the ones going lately, ones with something new, and the one you're in; archived ones stay in Threads)
      if (c.kind === 'text') for (const t of Store.threads(c.id)) {
        const tu = Store.unread(t.id), on = t.id === channelId && !pageNow(), last = Math.max(tu.last || 0, (Store.threadInfo(t.id) || {}).last || 0);
        const tping = !on && tu.mentions > 0 && levelFor(t.id, serverId) !== 'none', tfresh = !on && tu.unread > 0 && !mutedHere(t.id, serverId);
        if (!on && !tfresh && !tping && (t.archived || isCollapsed || (last && Date.now() - last > 7 * 864e5))) continue;
        body.append(swapIn(el('button', { className: 'chan thread-row' + (on ? ' on' : '') + (tfresh || tping ? ' unread' : ''), onclick: () => openChannel(t),
          oncontextmenu: (e) => { e.preventDefault(); threadCtx(t, e.clientX, e.clientY); } }, el('span', { className: 'thread-branch' }), el('span', { className: 'nm' }, t.name),
          tping ? el('span', { className: 'mbadge' }, tu.mentions > 99 ? '99+' : String(tu.mentions)) : null), k++));
      }
    }
  }
}
// right-clicking the channel list's empty space (Discord's): hide muted channels, make a channel or a category, invite
function sideCtx(x, y) {
  const sv = serverId, can = Store.canManage(sv), live = Store.kind === 'supabase';
  const cats = Store.categories(sv).filter((c) => can || Store.can(c.id, 'manage_channels'));
  menu([
    live && { label: 'Hide Muted Channels', check: hideMuted.has(sv), action: () => { toggleHideMuted(sv); renderSide(); } },
    live && '-',
    (can || cats.length) && { label: 'Create Channel', action: () => newChannelFlow((cats[0] || {}).id) },
    can && { label: 'Create Category', action: () => newCategory(sv) },
    (live ? Store.canAnywhere(sv, 'invite') : true) && { label: 'Invite to Server', action: () => inviteFriends(sv) },
  ], x, y);
}
// someone in a voice channel, under it in the list: who, and whether they're muted, deafened, on camera or streaming
function voiceMember(v, c) {
  const p = person(v.uid), talking = speaking(v.uid, c.id);
  const row = el('button', { className: 'vmem' + (talking ? ' speaking' : ''), onclick: (e) => showProfile(p, e.currentTarget),
    oncontextmenu: (e) => { e.preventDefault(); memberCtx(p, e.clientX, e.clientY); } },
    avatarEl(face(p), { size: 22 }), el('span', { className: 'nm' }, p.name),
    v.screen ? el('span', { className: 'live' }, 'LIVE') : null, v.cam ? el('span', { className: 'vic' }, icon('video', 14)) : null,
    v.deaf ? el('span', { className: 'vic red' }, icon('headphonesOff', 14)) : !v.mic ? el('span', { className: 'vic red' }, icon('micOff', 14)) : null);
  return row;
}
// is this person talking right now? (only known for the call you're in)
function speaking(uid, place) {
  if (!call || call.place !== place) return false;
  if (uid === Store.myId()) return call.api.self.speaking;
  return call.api.people().some((p) => p.uid === uid && p.speaking);
}
// a channel: a text channel opens; a voice channel opens and joins its call (as on Discord)
function openChannel(c) {
  channelId = c.id; serverPage = null;
  if (c.kind !== 'voice') rememberChannel(serverId, c.id);
  renderAll(); $('#app').classList.remove('show-side');
  if (c.kind === 'voice' && !(call && call.place === c.id)) joinVoice(c);
}
// the Direct Messages side: find a conversation, Friends, and your DMs
function dmSide(head, body) {
  // (no header when Find or Start a Conversation is hidden: Browse, in the list, does the same)
  head.replaceChildren(shown('findDM') ? el('button', { className: 'find-dm', onclick: () => newDMDialog() }, labelOf('dms', 'findDM')) : 'Messages');
  head.classList.toggle('gone', !shown('findDM'));
  const parts = [];
  const req = Store.friendRequests().incoming.length;
  const nav = (id, ic, page, badge, onclick) => el('button', { className: 'nav-btn' + (!dmId && page !== undefined && homePage === page ? ' on' : ''),
    onclick: onclick || (() => { dmId = null; homePage = page; renderAll(); $('#app').classList.remove('show-side'); }) }, icon(ic), el('span', { className: 'grow' }, labelOf('dmNav', id)), badge || null);
  for (const id of ordered('dmNav')) {
    if (!shown(id)) continue;
    if (id === 'browseNav') parts.push(nav(id, 'search', 'browse'));
    if (id === 'friendsNav') parts.push(nav(id, 'users', null, req ? el('span', { className: 'mbadge' }, String(req)) : null));
    if (id === 'datbuxNav') { const n = buxLive() && Store.canBux() ? Store.trades().filter((t) => t.status === 'open' && t.to === Store.myId()).length : 0; parts.push(nav(id, 'coin', 'datbux', n ? el('span', { className: 'mbadge', title: 'Trades waiting for you' }, String(n)) : null)); }
    if (id === 'collectionNav') parts.push(nav(id, 'collection', 'collection'));
    if (id === 'shopNav') parts.push(nav(id, 'shop', 'shop'));
    if (id === 'questsNav') { const n = questsReady(); parts.push(nav(id, 'quest', 'quests', n ? el('span', { className: 'mbadge green', title: 'Rewards to claim' }, String(n)) : null)); }
  }
  parts.push(el('div', { className: 'cat dm-cat' }, el('span', { className: 'nm' }, 'Direct Messages'),
    shown('newDM') ? el('span', { className: 'add', title: 'Create DM', onclick: (e) => { e.stopPropagation(); newDMDialog(); } }, icon('plus')) : null));
  // (newest conversation first, as on Discord)
  const list = Store.dmList().map((d, i) => ({ d, i })).sort((a, b) => (b.d.last || 0) - (a.d.last || 0) || a.i - b.i).map((x) => x.d);
  for (const d of list) {
    if (closedDMs.has(d.id) && d.id !== dmId && !dmUnread(d.id)) continue;
    const n = dmUnread(d.id), group = d.kind === 'group', inCall = call && call.place === d.id;
    const sub = group ? `${d.people.length} Member${d.people.length === 1 ? '' : 's'}` : inCall ? 'In a call' : d.user.bubble || d.user.about;
    const row = el('button', { className: 'dm-row' + (dmId === d.id ? ' on' : '') + (n ? ' unread' : ''), onclick: () => { dmId = d.id; renderAll(); $('#app').classList.remove('show-side'); },
      oncontextmenu: (e) => { e.preventDefault(); dmCtx(d, e.clientX, e.clientY); } },
      dmAvatar(d, 32), el('div', { className: 'who' }, el('div', { className: 'nm2' }, el('span', { className: 'nm2-t' }, dmName(d)), group ? null : tagChipFor(d.user)), sub ? el('div', { className: 'sub2' + (inCall ? ' good' : '') }, sub) : null),
      n ? el('span', { className: 'mbadge' }, n > 99 ? '99+' : String(n)) : null,
      el('span', { className: 'close', title: 'Close DM', onclick: (e) => { e.stopPropagation(); closedDMs.add(d.id); saveClosed(); if (dmId === d.id) dmId = null; renderAll(); } }, icon('x', 16)));
    parts.push(group ? row : plateOn(row, d.user.plate));
  }
  body.replaceChildren(...parts.map((n, i) => swapIn(n, i)));
}

// ---------- Voice Connected (above your user panel while you're in a call) ----------
function renderVoicePanel() {
  const box = $('#vpanel'); if (!box) return;
  if (!call) { box.hidden = true; box.replaceChildren(); return; }
  const others = call.api.people(), live = others.some((p) => p.connected);
  const status = call.kind === 'dm' && !others.length ? 'Calling…' : call.kind === 'vc' || live ? 'Voice Connected' : 'Connecting…';
  const where = call.kind === 'vc' ? `${(Store.channel(call.place) || {}).name || 'Voice'} / ${(Store.server(call.server) || {}).name || ''}` : `Call with ${dmName(Store.dmInfo(call.place)) || 'someone'}`;
  const me2 = call.api.self;
  box.hidden = false;
  box.replaceChildren(...[
    el('div', { className: 'vp-top' },
      el('div', { className: 'vp-what' }, el('div', { className: 'vp-status' + (status === 'Voice Connected' ? ' good' : '') }, icon('volume', 15), status),
        el('button', { className: 'vp-where', title: 'Go to the call', onclick: () => goToCall() }, where)),
      el('button', { className: 'vp-btn hang', title: 'Disconnect', onclick: () => leaveCall() }, icon('hangup', 18))),
    me2.warning ? el('div', { className: 'vp-warn' }, me2.warning) : null,
    el('div', { className: 'vp-row' },
      el('button', { className: 'vp-btn wide' + (me2.cam ? ' on' : ''), title: me2.cam ? 'Turn Off Camera' : 'Turn On Camera', onclick: () => call && call.api.setCam(!call.api.self.cam) }, icon(me2.cam ? 'video' : 'camOff', 17), 'Video'),
      el('button', { className: 'vp-btn wide' + (me2.screen ? ' on' : ''), title: me2.screen ? 'Stop Streaming' : 'Share Your Screen', onclick: () => call && call.api.setScreen(!call.api.self.screen) }, icon('screen', 17), 'Screen'))].filter(Boolean));
}
function goToCall() {
  if (!call) return;
  if (call.kind === 'dm') { view = 'home'; dmId = call.place; } else { view = 'server'; serverId = call.server; channelId = call.place; }
  renderAll();
}

// ---------- the user panel ----------
// your controls sit at the foot of the server rail (when it's shown, on a wide screen), or under the sidebar
// (the sidebar hidden with its shortcut: only while the server rail is there to hold your controls)
const sideHidden = () => !!prefs.sideOff && prefs.rail !== 'off' && innerWidth > 720;
const panelInRail = () => (prefs.panelPos === 'rail' || sideHidden()) && prefs.rail !== 'off' && innerWidth > 720;
function renderMe() {
  const panel = $('#me-panel'), parts = [], inRail = panelInRail();
  const pbtn = (ic, title, onclick, on, cls = '') => { const b = el('button', { className: 'pbtn' + (on ? ' on' : '') + (cls ? ' ' + cls : ''), title, onclick }); b.append(icon(ic)); return b; };
  const quiet = prefs.micMuted || prefs.deafened;
  for (const id of ordered(inRail ? 'railPanel' : 'panel')) {
    if (id === 'me') {
      const av = avatarEl(asMember()); av.onclick = (e) => { e.stopPropagation(); showAccount(av); };
      const stName = (STATUSES.find((s) => s[0] === me.status) || [, 'Online'])[1];
      if (inRail) { av.title = `${me.name} (${stName})`; parts.push(av); }
      else parts.push(av, el('div', { className: 'who', onclick: (e) => { e.stopPropagation(); showAccount(av); } }, styledName(el('div', { className: 'nm' }, me.name), asMember()), el('div', { className: 'st' }, me.pronouns || stName)));
    } else if (id === 'settings') parts.push(pbtn('gear', labelOf('panel', 'settings'), () => openUserSettings('account'), false, 'gear'));
    else if (id === 'mic' && shown('mic')) parts.push(pbtn(quiet ? 'micOff' : 'mic', quiet ? 'Unmute' : 'Mute', toggleMic, quiet));
    else if (id === 'deafen' && shown('deafen')) parts.push(pbtn(prefs.deafened ? 'headphonesOff' : 'headphones', prefs.deafened ? 'Undeafen' : 'Deafen', toggleDeafen, prefs.deafened));
  }
  panel.replaceChildren(...parts);
  panel.classList.toggle('in-rail', inRail);
  if (inRail) { panel.classList.remove('plated'); panel.style.removeProperty('--plate'); } else plateOn(panel, me.plate);
}
// ---------- the title bar, across the top of the window: where you are ----------
function renderTitle() {
  const bar = $('#titlebar'); if (!bar) return;
  bar.hidden = prefs.titlebar === 'off'; if (bar.hidden) return;
  const sv = view === 'server' && serverId ? Store.server(serverId) : null;
  const name = sv ? sv.name : view === 'discover' ? 'Discover' : 'Direct Messages';
  const key = [name, sv ? String(sv.img || '').length + '|' + sv.icon : view, appLogo(), ordered('titlebar').filter(shown).join()].join('|');
  if (bar.dataset.key === key) return;
  bar.dataset.key = key;
  const face = sv ? serverFace(sv, 18) : view === 'discover' ? icon('compass', 16) : logoEl(appLogo(), { size: 18 });
  bar.replaceChildren(el('div', { className: 'tb-in', title: name }, ...ordered('titlebar').filter(shown).map((id) => (id === 'tbIcon' ? el('span', { className: 'tb-ic' }, face) : el('span', { className: 'tb-name' }, name)))));
}
// mute and deafen: they apply to calls, and deafen also silences Fluentdat's sounds (and mutes you, as on Discord)
function toggleMic() {
  if (prefs.deafened) { prefs.deafened = false; prefs.micMuted = false; } else prefs.micMuted = !prefs.micMuted;
  savePrefs(); applyMic(); renderMe(); toast(prefs.micMuted ? 'Muted.' : 'Unmuted.');
}
function toggleDeafen() { prefs.deafened = !prefs.deafened; savePrefs(); applyMic(); renderMe(); toast(prefs.deafened ? 'Deafened: sounds are off and your mic is muted.' : 'Undeafened.'); }
function applyMic() {
  if (!call) return;
  call.api.setDeaf(!!prefs.deafened);
  if (!prefs.deafened) call.api.setMic(!prefs.micMuted);
  if (call.kind === 'vc') Store.setVoice({ sv: call.server, ch: call.place, mic: !prefs.micMuted && !prefs.deafened, deaf: !!prefs.deafened, cam: call.api.self.cam, screen: call.api.self.screen });
}

// ---------- the top bar ----------
function renderTop() {
  const top = $('#top');
  if (document.activeElement === searchField && top.contains(searchField)) return;     // (don't pull the search box out from under you)
  const sideBtn = sideHidden() && shown('sideShow'), sk = keyLabel(keyFor('toggleSide'));
  const parts = [el('button', { className: 'menu' + (sideBtn ? ' side-show' : ''), title: sideBtn ? 'Show Sidebar' + (sk ? ` (${sk})` : '') : 'Menu',
    onclick: () => (sideHidden() ? runKey('toggleSide') : $('#app').classList.toggle('show-side')) }, icon('menu'))];
  const act = (ic, title, onclick, on) => el('button', { className: 'act' + (on ? ' on' : ''), title, onclick }, icon(ic), prefs.btnLabels === 'on' ? el('span', { className: 'lbl' }, title) : null);
  let where = null;
  if (view === 'discover') parts.push(el('span', { className: 'hash' }, icon('compass')), el('span', {}, 'Discover'));
  else if (view === 'home' && !dmId) { const nid = { shop: 'shopNav', quests: 'questsNav', datbux: 'datbuxNav', collection: 'collectionNav', browse: 'browseNav' }[homePage] || 'friendsNav';
    parts.push(el('span', { className: 'hash' }, icon(BUTTONS.dmNav[1].find((b) => b[0] === nid)[2])), el('span', {}, labelOf('dmNav', nid))); }
  else if (view === 'home') {
    const d = Store.dmInfo ? Store.dmInfo(dmId) : null;
    if (d && d.kind === 'group') { parts.push(dmAvatar(d, 24), el('button', { className: 'ttl ttl-edit', title: 'Rename the group', onclick: () => renameGroup(d) }, dmName(d))); where = 'group'; }
    else { const u = Store.dmUser(dmId) || { name: '?' }; parts.push(avatarEl(u, { size: 24 }), el('span', { className: 'ttl' }, u.name)); where = 'dm'; }
  }
  else if (pageNow()) { const [, , ic] = BUTTONS.serverTop[1].find((b) => b[0] === pageNow()); parts.push(el('span', { className: 'hash' }, icon(ic)), el('span', { className: 'ttl' }, labelOf('serverTop', pageNow()))); }
  else {
    const c = Store.channel(channelId);
    if (!c) parts.push(el('span', {}, Store.syncState().loading ? 'Loading…' : 'Fluentdat'));
    else if (c.kind === 'thread') {
      const up = Store.channel(c.parent);
      parts.push(el('button', { className: 'thr-up', title: up ? `Back to #${up.name}` : 'Back', onclick: () => { if (up) openChannel(up); } }, icon('hash', 18), el('span', {}, up ? up.name : '')),
        el('span', { className: 'thr-sep' }, icon('chevR', 14)), el('span', { className: 'hash' }, icon('thread')), el('span', { className: 'ttl' }, c.name),
        ...(c.archived ? [el('span', { className: 'chip' }, 'Archived')] : []));
      where = 'thread';
    }
    else {
      parts.push(el('span', { className: 'hash' }, icon(c.kind === 'voice' ? 'volume' : 'hash')), el('span', { className: 'ttl' }, c.name));
      if (c.topic) parts.push(el('span', { className: 'topic-sep' }), el('button', { className: 'topic', title: plainText(c.topic, fmtCtx()), onclick: () => showTopic(c) }, plainText(c.topic, fmtCtx())));
      where = c.kind === 'voice' ? 'voice' : 'channel';
    }
  }
  parts.push(el('span', { className: 'spacer' }));
  const atActs = parts.length;
  const talk = where === 'dm' || where === 'group', inThis = call && call.place === dmId, live = Store.kind === 'supabase', text = where && where !== 'voice';
  if (where) for (const id of ordered('top')) {
    if (!shown(id)) continue;
    if (id === 'call' && talk) { const b = act('phone', inThis ? 'In this call' : 'Start Voice Call', () => (inThis ? goToCall() : startDMCall(false)), inThis); b.classList.toggle('incall', !!inThis); parts.push(b); }
    else if (id === 'video' && talk) parts.push(act('video', 'Start Video Call', () => (inThis ? call.api.setCam(true) : startDMCall(true))));
    else if (id === 'addPeople' && talk && Store.kind === 'supabase') parts.push(act('usersPlus', 'Add Friends to DM', () => addPeopleFlow()));
    else if (id === 'threads' && live && (where === 'channel' || where === 'thread')) { const b = act('thread', 'Threads', (e) => { e.stopPropagation(); showThreads(b); }, pop && pop.classList.contains('thr')); parts.push(b); }
    else if (id === 'notify' && live && text) {
      const pl = placeNow(), muted = talk ? Store.placeSettings(pl).muted : mutedHere(pl, serverId);
      const b = act(muted ? 'bellOff' : 'bell', 'Notification Settings', (e) => { e.stopPropagation(); const r = b.getBoundingClientRect();
        menu([muteItem(pl, talk ? 'Conversation' : where === 'thread' ? 'Thread' : 'Channel'), talk ? null : notifyItem(pl, false, where === 'thread' ? 'Channel' : (Store.channel(pl) || {}).category ? 'Category' : 'Server')], r.right - 230, r.bottom + 6); }, muted);
      parts.push(b);
    }
    else if (id === 'pins' && live && text) { const b = act('pin', 'Pinned Messages', (e) => { e.stopPropagation(); showPins(b); }, pop && pop.classList.contains('pins')); parts.push(b); }
    else if (id === 'search' && text) {
      const sv = view === 'server' ? Store.server(serverId) : null;
      searchField.placeholder = sv ? `Search ${sv.name}` : 'Search';
      syncFind(); parts.push(findBox);
    }
    else if (id === 'dmProfile' && where === 'dm') parts.push(act('user', prefs.dmPanel ? 'Hide User Profile' : 'Show User Profile', () => { prefs.dmPanel = !prefs.dmPanel; savePrefs(); renderAll(); }, prefs.dmPanel));
    else if (id === 'members' && (where === 'channel' || where === 'voice' || where === 'group' || where === 'thread')) parts.push(act('users', showMembers ? 'Hide Member List' : 'Show Member List', () => { showMembers = !showMembers; renderAll(); }, showMembers));
    else if (id === 'saved') { const b = act('bookmark', 'Bookmarks', (e) => { e.stopPropagation(); showBookmarks(b); }, pop && pop.classList.contains('saved')); b.classList.toggle('has', bookmarks().length > 0); parts.push(b); }
  }
  // (the buttons, in a group with room between them: Customize → Layout → Space between top bar buttons)
  const acts = parts.splice(atActs);
  if (acts.length) parts.push(el('div', { className: 'top-acts' }, ...acts));
  top.replaceChildren(...parts);
}
// your bookmarks (Bookmark Message), newest first: click one to go to it
function showBookmarks(anchor) {
  if (pop && pop.classList.contains('saved')) { closePop(); return renderTop(); }
  closePop();
  const list = el('div', { className: 'bm-list' });
  const draw = () => {
    const all = bookmarks();
    list.replaceChildren(...(all.length ? all.map((b) => el('div', { className: 'bm-row', role: 'button', tabIndex: 0, onclick: () => { closePop(); goToMessage(b); }, onkeydown: (e) => { if (e.key === 'Enter') { closePop(); goToMessage(b); } } },
      avatarEl(b.author || { name: '?' }, { size: 32 }),
      el('div', { className: 'bm-body' }, el('div', { className: 'bm-head' }, el('b', {}, (b.author || {}).name || 'Someone'), el('span', {}, b.from), el('time', {}, when(b.ts, true))),
        el('div', { className: 'bm-text' }, b.text || '(an attachment or sticker)')),
      el('button', { className: 'bm-x', title: 'Remove Bookmark', onclick: (e) => { e.stopPropagation(); LS.set('fluentdat.bookmarks', bookmarks().filter((x) => x.id !== b.id)); draw(); renderTop(); renderContent(); } }, icon('x', 14))))
      : [el('div', { className: 'bm-empty' }, el('div', { className: 'bm-empty-ic' }, icon('bookmark', 30)), el('b', {}, 'No bookmarks yet'), el('span', {}, 'Right-click a message (or its ⋯) and pick Bookmark Message to keep it here.'))]));
  };
  draw();
  pop = el('div', { className: 'pop bm saved' }, el('div', { className: 'bm-title' }, icon('bookmark', 18), el('b', {}, 'Bookmarks'), el('small', {}, 'Kept in this browser')), list);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(12, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 12)) + 'px'; pop.style.top = r.bottom + 8 + 'px';
  renderTop();
}
// ---------- search (Search "<server>", like Discord's): Enter finds messages and files in everything you can read there,
// listed beside the conversation. from:name, in:#channel and has:link|file|image|video narrow it ----------
const searchField = el('input', { className: 'top-search', type: 'search', placeholder: 'Search', spellcheck: false });
searchField.setAttribute('aria-label', 'Search messages');
searchField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); if (searchField.value.trim()) runFinder(searchField.value); }
  if (e.key === 'Escape') { searchField.value = ''; searchField.blur(); closeFinder(); }
});
searchField.addEventListener('search', () => { if (!searchField.value) closeFinder(); });
searchField.addEventListener('blur', () => setTimeout(renderTop, 0));
// (the box keeps its place while you type: a magnifier, or a cross to clear the search while one's open)
const findBox = el('label', { className: 'top-find' }, searchField, icon('search', 15),
  el('button', { className: 'top-find-x', type: 'button', title: 'Clear Search', onmousedown: (e) => e.preventDefault(), onclick: (e) => { e.preventDefault(); searchField.value = ''; closeFinder(); } }, icon('x', 15)));
const syncFind = () => findBox.classList.toggle('on', finder.open);
const finder = { open: false, scope: null, raw: '', has: '', results: [], loading: false, error: '', more: false, seq: 0 };
const finderScope = () => (view === 'server' && serverId ? 's:' + serverId : view === 'home' && dmId ? 'd:' + dmId : null);
const finderOn = () => finder.open && finder.scope === finderScope();
function parseFind(raw) {
  const out = { q: [], from: null, in: null, has: '' };
  for (const w of String(raw).trim().split(/\s+/)) {
    const m = w.match(/^(from|in|has):(.+)$/i);
    if (!m) { out.q.push(w); continue; }
    const k = m[1].toLowerCase(), v = m[2].replace(/^[@#]/, '').toLowerCase();
    if (k === 'has') out.has = { links: 'link', link: 'link', file: 'file', files: 'file', image: 'image', images: 'image', picture: 'image', video: 'video', videos: 'video' }[v] || '';
    else if (k === 'in' && view === 'server') { const c = Store.channels(serverId).find((x) => x.name.toLowerCase() === v); if (c) out.in = c.id; else out.q.push(w); }
    else if (k === 'from') {
      const people = view === 'server' ? Store.members(serverId) || [] : ((Store.dmInfo && Store.dmInfo(dmId)) || {}).people || [];
      const p = people.find((x) => [x.name, x.login, x.nick].some((n) => String(n || '').toLowerCase() === v)) || people.find((x) => [x.name, x.login, x.nick].some((n) => String(n || '').toLowerCase().startsWith(v)));
      if (p) out.from = p.id; else out.q.push(w);
    }
  }
  return { ...out, q: out.q.join(' ') };
}
async function runFinder(raw, { more = false } = {}) {
  const scope = finderScope(); if (!scope) return;
  const p = parseFind(raw), seq = ++finder.seq;
  Object.assign(finder, { open: true, scope, raw, loading: true, error: '' });
  if (!more) { finder.results = []; finder.more = false; if (p.has) finder.has = p.has; }
  renderAll(); syncFind();
  try {
    const o = { q: p.q, from: p.from, in: p.in, has: finder.has || p.has, before: more && finder.results.length ? finder.results[finder.results.length - 1].ts : null };
    const got = view === 'server' ? await Store.searchServer(serverId, o) : await Store.searchDM(dmId, o);
    if (seq !== finder.seq) return;
    finder.results = more ? finder.results.concat(got) : got; finder.more = got.length >= 25;
  } catch (e) { if (seq === finder.seq) finder.error = String((e && e.message) || e); }
  if (seq === finder.seq) { finder.loading = false; finder.q = p.q; renderAll(); }
}
// ---------- Browse (Direct Messages → Browse): messages and files in all your DMs and group chats, newest first ----------
const dmBrowse = { q: '', has: '', from: '', results: [], loading: false, error: '', more: false, ran: false, seq: 0 };
let dmBrowseBox = null;
async function runDmBrowse({ more = false } = {}) {
  const seq = ++dmBrowse.seq;
  Object.assign(dmBrowse, { loading: true, error: '' });
  if (!more) { dmBrowse.results = []; dmBrowse.more = false; }
  drawDmBrowse();
  try {
    const got = await Store.searchAllDMs({ q: dmBrowse.q, has: dmBrowse.has, from: dmBrowse.from || null, before: more && dmBrowse.results.length ? dmBrowse.results[dmBrowse.results.length - 1].ts : null });
    if (seq !== dmBrowse.seq) return;
    dmBrowse.results = more ? dmBrowse.results.concat(got) : got; dmBrowse.more = got.length >= 25;
  } catch (e) { if (seq === dmBrowse.seq) dmBrowse.error = String((e && e.message) || e); }
  if (seq === dmBrowse.seq) { dmBrowse.loading = false; dmBrowse.ran = true; drawDmBrowse(); }
}
// (where a result is, when its sender doesn't already say: a group's name, or who you sent it to)
function dmBrowseWhere(m) {
  const d = Store.dmInfo ? Store.dmInfo(m.place) : null;
  if (d && d.kind === 'group') return el('span', { className: 'br-where' }, 'in ', dmAvatar(d, 16), dmName(d));
  const u = Store.dmUser(m.place);
  return u && isMe(m.user) ? el('span', { className: 'br-where' }, 'to ', avatarEl(u, { size: 16 }), u.name) : null;
}
function drawDmBrowse() {
  if (!dmBrowseBox || !dmBrowseBox.isConnected) return;
  const n = dmBrowse.results.length, rows = dmBrowse.results.map((m) => {
    const files = (m.files || []).filter((f) => f && f.name);
    return el('button', { className: 'fd-row br-row', onclick: () => goToMessage({ dm: true, place: m.place, id: m.id }) }, avatarEl(m.user, { size: 36 }),
      el('div', { className: 'fd-body' }, el('div', { className: 'fd-meta' }, el('b', {}, nameIn(m.user)), dmBrowseWhere(m), el('time', {}, when(m.ts, true))),
        m.text ? el('div', { className: 'fd-text' }, markText(plainText(m.text, fmtCtx()).slice(0, 400), dmBrowse.q)) : null,
        files.length ? el('div', { className: 'fd-files' }, ...files.map((f) => el('span', {}, icon(f.kind === 'image' ? 'image' : f.kind === 'video' ? 'video' : 'file', 13), markText(f.name, dmBrowse.q)))) : null));
  });
  dmBrowseBox.replaceChildren(...[
    dmBrowse.ran || dmBrowse.loading ? el('div', { className: 'br-count' }, dmBrowse.loading && !n ? 'Searching…' : dmBrowse.error ? '' : `${n}${dmBrowse.more ? '+' : ''} result${n === 1 ? '' : 's'}`) : null,
    ...(dmBrowse.error ? [el('div', { className: 'note-box' }, dmBrowse.error)] : rows.length ? rows : dmBrowse.ran && !dmBrowse.loading ? [el('div', { className: 'fd-empty' }, el('div', { className: 'fp-empty-ic' }, icon('search', 30)), 'Nothing found. Try other words, or another kind of thing.')]
      : dmBrowse.loading ? [] : [el('div', { className: 'fd-empty' }, el('div', { className: 'fp-empty-ic' }, icon('search', 30)), 'Type what you’re looking for and press Enter, or pick Files to see every file people sent you.')]),
    dmBrowse.more ? el('button', { className: 'btn small fd-more', disabled: dmBrowse.loading, onclick: () => runDmBrowse({ more: true }) }, dmBrowse.loading ? 'Loading…' : 'Load More') : null].filter(Boolean));
}
function dmBrowsePage() {
  const input = el('input', { type: 'search', className: 'br-q', placeholder: 'Search messages and files in your DMs', value: dmBrowse.q, spellcheck: false });
  const go = () => { dmBrowse.q = input.value.trim(); runDmBrowse(); };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  input.addEventListener('search', () => { if (!input.value && dmBrowse.q) { dmBrowse.q = ''; runDmBrowse(); } });
  // (from anyone, or from one of the people you have conversations with)
  const people = [...new Map(Store.dmList().flatMap((d) => (d.kind === 'group' ? d.people || [] : [d.user])).filter((p) => p && p.id && !p.bot).map((p) => [p.id, p])).values()]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const from = sel(dmBrowse.from, [['', 'From anyone'], ...people.map((p) => [p.id, 'From ' + p.name])], (v) => { dmBrowse.from = v; runDmBrowse(); });
  const chips = el('div', { className: 'fd-chips br-chips' });
  const drawChips = () => chips.replaceChildren(...[['', 'Messages'], ['file', 'Files'], ['image', 'Images'], ['video', 'Videos'], ['link', 'Links']].map(([v, l]) =>
    el('button', { className: 'fd-chip' + (dmBrowse.has === v ? ' on' : ''), onclick: () => { dmBrowse.has = v; drawChips(); runDmBrowse(); } }, l)));
  drawChips();
  dmBrowseBox = el('div', { className: 'br-list' });
  drawDmBrowse();
  setTimeout(() => { if (input.isConnected && !dmBrowse.q) input.focus(); }, 0);
  return el('div', { className: 'br-page' },
    el('div', { className: 'br-head' }, el('div', { className: 'grow' }, el('h1', {}, labelOf('dmNav', 'browseNav')), el('p', {}, 'Messages and files in all your DMs and group chats, newest first.')),
      el('button', { className: 'btn', onclick: () => newDMDialog() }, icon('personAdd', 16), 'Start a Conversation')),
    el('div', { className: 'br-bar' }, el('label', { className: 'br-search' }, icon('search', 18), input), from, el('button', { className: 'btn primary', onclick: go }, 'Search')),
    chips, dmBrowseBox);
}
function closeFinder() { if (!finder.open) return; finder.open = false; finder.results = []; finder.has = ''; finder.seq++; renderAll(); syncFind(); }
// a word, lit up wherever it is in a bit of text
function markText(text, q) {
  const out = el('span'), k = String(q || '').trim().toLowerCase();
  if (!k) { out.textContent = text; return out; }
  const low = text.toLowerCase(); let i = 0, j;
  while ((j = low.indexOf(k, i)) >= 0) { out.append(text.slice(i, j), el('mark', {}, text.slice(j, j + k.length))); i = j + k.length; }
  out.append(text.slice(i));
  return out;
}
function finderPanel() {
  const n = finder.results.length, head = el('div', { className: 'fd-head' }, el('b', {}, finder.loading && !n ? 'Searching…' : `${n}${finder.more ? '+' : ''} Result${n === 1 ? '' : 's'}`),
    el('span', { style: 'flex:1' }), el('button', { className: 'fd-x', title: 'Close (Esc)', onclick: () => { searchField.value = ''; closeFinder(); } }, icon('x', 16)));
  const chips = el('div', { className: 'fd-chips' }, ...[['', 'All'], ['link', 'Links'], ['file', 'Files'], ['image', 'Images'], ['video', 'Videos']].map(([v, l]) =>
    el('button', { className: 'fd-chip' + (finder.has === v ? ' on' : ''), onclick: () => { finder.has = v; runFinder(finder.raw); } }, l)));
  const rows = []; let last = null;
  for (const m of finder.results) {
    if (m.place !== last) { last = m.place; const c = Store.channel(m.place); if (c) rows.push(el('div', { className: 'fd-place' }, icon(c.kind === 'thread' ? 'thread' : c.kind === 'voice' ? 'volume' : 'hash', 14), el('span', {}, c.name))); }
    const files = (m.files || []).filter((f) => f && f.name);
    rows.push(el('button', { className: 'fd-row', onclick: () => goToMessage({ dm: view === 'home', place: m.place, id: m.id }) }, avatarEl(m.user, { size: 32 }),
      el('div', { className: 'fd-body' }, el('div', { className: 'fd-meta' }, el('b', {}, nameIn(m.user)), el('time', {}, when(m.ts, true))),
        m.text ? el('div', { className: 'fd-text' }, markText(plainText(m.text, fmtCtx()).slice(0, 400), finder.q)) : null,
        files.length ? el('div', { className: 'fd-files' }, ...files.map((f) => el('span', {}, icon(f.kind === 'image' ? 'image' : f.kind === 'video' ? 'video' : 'file', 13), markText(f.name, finder.q)))) : null)));
  }
  return el('div', { className: 'fd' }, head, chips, el('div', { className: 'fd-list' },
    ...(finder.error ? [el('div', { className: 'fd-empty' }, finder.error)] : rows.length ? rows : [el('div', { className: 'fd-empty' }, el('div', { className: 'fp-empty-ic' }, icon('search', 30)),
      finder.loading ? 'Searching…' : 'Nothing found. Try other words, or from:name, in:#channel, has:file.')]),
    finder.more ? el('button', { className: 'btn small fd-more', disabled: finder.loading, onclick: () => runFinder(finder.raw, { more: true }) }, finder.loading ? 'Loading…' : 'Load More') : null));
}



// ---------- messages ----------
let emojiIndex = new Map();               // a server emoji's id → it (to draw <:name:id> in messages)
const indexEmoji = () => { emojiIndex = new Map(Store.emojiAll().map((e) => [e.id, e])); };
const fmtCtx = () => ({ who: (id) => { const p = Store.person && Store.person(id); return p ? { name: p.name } : null; }, chan: (id) => Store.channel(id), emoji: (id) => emojiIndex.get(id) });
// a message's time: on its first line Discord's way (Today at 3:54 PM, Yesterday at…, or the date), else just the time
function when(ts, full) {
  const d = new Date(ts);
  if (full && prefs.timestamps !== 'rel') {
    const t = d.toLocaleTimeString([], prefs.timestamps === '24' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' });
    const days = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000);
    return days === 0 ? 'Today at ' + t : days === 1 ? 'Yesterday at ' + t : d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) + ', ' + t;
  }
  if (prefs.timestamps === '24') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (prefs.timestamps === 'rel') { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const lasted = (ms) => (ms < 60000 ? 'a few seconds' : ms < 120000 ? 'a minute' : ms < 3600000 ? `${Math.round(ms / 60000)} minutes` : ms < 7200000 ? 'an hour' : `${Math.round(ms / 3600000)} hours`);
// does this message ping you? your @name, @everyone/@here from someone who may (in a server), or a reply to you
function pingsMe(m, all) {
  if (Store.kind !== 'supabase' || m.mine) return false;
  const text = m.text || '', mine = Store.myId();
  if (mine && text.includes(`<@${mine}>`)) return true;
  if (view === 'server' && /(^|[^\w@])@(everyone|here)(?![\w])/.test(text) && m.user.id && Store.can(channelId, 'mention_everyone', m.user.id)) return true;
  if (m.reply) { const to = all.find((x) => x.id === m.reply); if (to && to.mine) return true; }
  return false;
}
// the conversation's messages, drawn into wrap. Each message keeps its own piece of the page while it doesn't change, so
// ---------- reactions: emoji under a message, counted, yours lit up; click one to add yours or take it back ----------
// (they're kept up to date in place, so a count bounces when it changes instead of the message being drawn again)
const reactKey = (k) => { if (!String(k).startsWith('c:')) return k; const e = emojiIndex.get(k.slice(2)); return e ? `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` : null; };
const CUSTOM_RE = /^<(a?):([A-Za-z0-9_]{2,32}):([0-9a-f-]{36})>$/;
function emojiFace(emoji, cls) {
  const c = String(emoji).match(CUSTOM_RE);
  if (c) { const e = emojiIndex.get(c[3]), src = e ? safeImg(e.url) : ''; return src ? el('img', { className: cls + ' custom', src, alt: ':' + c[2] + ':', draggable: false }) : el('span', { className: cls + ' gone' }, ':' + c[2] + ':'); }
  return el('span', { className: cls }, emoji);
}
const emojiLabel = (emoji) => { const c = String(emoji).match(CUSTOM_RE); return c ? ':' + c[2] + ':' : emoji; };
async function toggleReact(m, emoji, on) {
  const place = placeNow(); if (!place || !emoji || m.sending) return;
  if (on && !mayIn('react') && !(Store.reactions(place).get(m.id) || []).some((r) => r.emoji === emoji && r.count > (r.me ? 1 : 0))) return toast('You don’t have permission to add new reactions here.');
  if (on) { const c = String(emoji).match(CUSTOM_RE); noteUse(c ? 'c:' + c[3] : emoji); }
  if ((await attempt(() => Store.react(place, m.id, emoji, on))) !== null && on) { questTick('react'); if (!buxLive()) buxReacted(); }
}
// pick any emoji to react with
function reactPicker(m, anchor) {
  const live = Store.kind === 'supabase';
  openPicker({ tab: 'emoji', emojiOnly: true, anchor, still: motionOff(),
    servers: live ? Store.servers().map((sv) => ({ id: sv.id, name: sv.name, face: () => serverFace(sv, 24) })) : [],
    emojiOf: (sv) => Store.serverEmoji(sv), stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {},
    onEmoji: (text, keep, c) => toggleReact(m, c ? `<${c.animated ? 'a' : ''}:${c.name}:${c.id}>` : text, true), onSticker: () => {} });
}
// the emoji you react with most (for the toolbar and the menu)
const quickReacts = (n) => frequent().map(reactKey).filter(Boolean).concat(['👍', '❤️', '😂', '🔥', '👀', '🎉', '😮', '🙏']).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
function whoReacted(r) {
  const names = r.users.map((id) => (id === 'me' || id === Store.myId() ? 'You' : person(id).name));
  const list = names.length > 3 ? [...names.slice(0, 3), `${names.length - 3} other${names.length === 4 ? '' : 's'}`] : names;
  const shown = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];
  return `${shown} reacted with ${emojiLabel(r.emoji)}`;
}
function reactTip(b) {
  const r = b._r; if (!r) return;
  tipEl.replaceChildren(el('div', { className: 'rtip' }, emojiFace(r.emoji, 'rtip-e'), el('span', {}, whoReacted(r))));
  tipEl.hidden = false; tipEl.classList.remove('show'); void tipEl.offsetWidth; tipEl.classList.add('show', 'above');
  const rr = b.getBoundingClientRect();
  tipEl.style.left = Math.max(8, Math.min(innerWidth - tipEl.offsetWidth - 8, rr.left + rr.width / 2 - tipEl.offsetWidth / 2)) + 'px';
  tipEl.style.top = Math.max(8, rr.top - tipEl.offsetHeight - 8) + 'px';
}
const hideTip = () => { tipEl.hidden = true; tipEl.classList.remove('show', 'above'); };
function syncReacts(node, m, list, animate) {
  const body = node.querySelector(':scope > .body'); if (!body || m.call) return;
  let row = body.querySelector(':scope > .reacts');
  if (!list.length) { if (row) row.remove(); return; }
  if (!row) { row = el('div', { className: 'reacts' }); body.append(row); }
  const have = new Map([...row.querySelectorAll(':scope > .react')].map((b) => [b.dataset.e, b]));
  const out = [];
  for (const r of list) {
    let b = have.get(r.emoji);
    if (!b) {
      b = el('button', { className: 'react' + (animate ? ' new' : '') }, emojiFace(r.emoji, 're'), el('span', { className: 'rn' }));
      b.dataset.e = r.emoji;
      b.onclick = (e) => { e.stopPropagation(); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); toggleReact(m, r.emoji, !b._r.me); };
      b.onmouseenter = () => reactTip(b); b.onmouseleave = hideTip;
    }
    b._r = r;
    b.classList.toggle('mine', !!r.me);
    const now = String(r.count);
    if (b.dataset.n !== now) {
      const was = b.dataset.n; b.dataset.n = now; b.querySelector('.rn').textContent = now;
      if (was && animate) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    }
    out.push(b);
  }
  if (mayIn('react')) out.push(row.querySelector(':scope > .react-add') || el('button', { className: 'react-add', title: 'Add Reaction', onclick: (e) => { e.stopPropagation(); reactPicker(m, e.currentTarget); } }, icon('smilePlus', 18)));
  let i = 0;
  for (const n of out) { if (row.children[i] !== n) row.insertBefore(n, row.children[i] || null); i++; }
  while (row.children.length > out.length) row.lastElementChild.remove();
}

// ---------- Quests: what you've done (counted in this browser), and the ones you finished (kept on your profile) ----------
const QSTATS = 'fluentdat.questStats';
function questCounts() { try { const all = JSON.parse(localStorage.getItem(QSTATS)) || {}; return all[myXid() || 'me'] || {}; } catch { return {}; } }
function questStats() {
  const x = Store.extrasNow(myXid()) || {}, c = questCounts();
  return { ...c, about: me.about ? 1 : 0, connections: (x.connections || []).length, board: (x.widgets || []).reduce((n, w) => n + ((w && Array.isArray(w.g)) ? w.g.length : 0), 0) };
}
const questsDone = () => ((Store.extrasNow(myXid()) || {}).quests || []);
const questsReady = () => (Store.extrasNow(myXid()) ? QUESTS.filter((q) => !questsDone().includes(q.id) && questProgress(q, questStats()).done).length : 0);
const unlocked = (quest) => !quest || questsDone().includes(quest);
const questSaid = new Set();
// count something you did, and say so when it finishes a Quest
function questTick(key, by = 1) {
  try {
    const all = JSON.parse(localStorage.getItem(QSTATS)) || {}, k = myXid() || 'me', mine = all[k] || {};
    mine[key] = (Number(mine[key]) || 0) + by; all[k] = mine; localStorage.setItem(QSTATS, JSON.stringify(all));
  } catch {}
  questCheck();
}
function questCheck() {
  if (!Store.extrasNow(myXid())) return;                 // (not until it's known which you've finished)
  const st = questStats(), done = questsDone();
  for (const q of QUESTS) if (!done.includes(q.id) && !questSaid.has(q.id) && questProgress(q, st).done) {
    questSaid.add(q.id); toast(`Quest complete: ${q.title}! Claim your reward in Quests.`);
  }
}
async function claimQuest(q) {
  const x = await Store.profileExtras(myXid()).catch(() => null), list = [...new Set([...((x && x.quests) || questsDone()), q.id])];
  if ((await attempt(() => Store.setProfileExtras({ quests: list }))) === null) return;
  const [kind, id] = q.reward, info = kind === 'deco' ? decoInfo(id) : effectInfo(id);
  // (it's yours: the database gives it to you once the Quest is on your profile; signed out, this browser keeps it)
  if (Store.kind === 'supabase') { if (Store.canPaidBoosts() && (await attempt(() => Store.claimQuestReward(q.id))) === null) return; }
  else { const w = localWallet(), key = kind + ':' + id; if (!w.owned.includes(key)) { w.owned.push(key); (w.how = w.how || {})[key] = 'quest'; keepWallet(w); } }
  toast(`${info ? info[1] : 'Your reward'} is yours: put it on from your Collection or the Shop.`); renderAll();
}
// Quests (Discord's): things to do, how far along you are, and what each one unlocks. (What they count comes fresh from
// the database now and then, since you may have done things on another device)
let questsFetched = 0;
function questsPage() {
  if (Store.kind === 'supabase' && Date.now() - questsFetched > 30000) { questsFetched = Date.now(); Store.profileExtras(myXid()).then(() => { if (view === 'home' && homePage === 'quests') renderAll(); }, () => {}); }
  const st = questStats(), done = questsDone(), you = asMember();
  const cards = QUESTS.map((q) => {
    const pr = questProgress(q, st), claimed = done.includes(q.id), [kind, rid] = q.reward, info = kind === 'deco' ? decoInfo(rid) : effectInfo(rid);
    const art = kind === 'deco' ? el('div', { className: 'qs-prize' }, avatarEl({ ...you, decoration: rid }, { size: 46 })) : el('div', { className: 'qs-prize pfx-box' }, effectEl(rid));
    return el('section', { className: 'qs' + (claimed ? ' claimed' : pr.done ? ' ready' : '') },
      el('div', { className: 'qs-art', style: `--qh:${q.hue}` }, icon(q.icon, 34), el('span', { className: 'qs-kind' }, 'Quest')),
      el('div', { className: 'qs-body' }, el('h3', {}, q.title), el('p', {}, q.desc),
        ...pr.tasks.map((t) => el('div', { className: 'qs-task' + (t.have >= t.goal ? ' done' : '') },
          el('div', { className: 'qs-tl' }, el('span', {}, t.have >= t.goal ? icon('check', 14) : null, t.label), el('small', {}, `${t.have}/${t.goal}`)),
          el('div', { className: 'qs-bar' }, el('i', { style: `width:${Math.round((t.have / t.goal) * 100)}%` })))),
        el('div', { className: 'qs-foot' }, art, el('div', { className: 'qs-rw' }, el('small', {}, 'Reward'), el('b', {}, info ? info[1] : ''), el('span', {}, kind === 'deco' ? 'Avatar Decoration' : 'Profile Effect')),
          claimed ? el('span', { className: 'chip qs-claimed' }, icon('check', 13), 'Claimed') : el('button', { className: 'btn green', disabled: !pr.done, onclick: () => claimQuest(q) }, pr.done ? 'Claim Reward' : 'Not Yet'))));
  });
  const ready = QUESTS.filter((q) => !done.includes(q.id) && questProgress(q, st).done).length;
  return el('div', { className: 'qs-page' }, el('div', { className: 'qs-hero' }, el('div', { className: 'qs-hero-ic' }, icon('quest', 40)),
    el('div', {}, el('h1', {}, 'Quests'), el('p', {}, 'Do things in Fluentdat to earn decorations and effects for your profile (they’re in the Shop too). ' + (ready ? `${plural(ready, 'reward')} ready to claim.` : `${done.length} of ${QUESTS.length} done.`)))),
    el('div', { className: 'qs-list' }, ...cards));
}
// ---------- Datbux, Fluentdat's own money: earned with tasks, spent in the Shop, sent and traded to people you know ----------
// Signed in, the database keeps it all (and the Shop's prices); signed out, this browser keeps your wallet the same way.
const BUX_KEY = 'fluentdat.bux';
const buxLive = () => Store.kind === 'supabase';
// (signed in, Datbux needs the newest setup.sql; until then everything in the Shop stays free)
const buxReady = () => !buxLive() || Store.canBux();
function localWallet() {
  let w = LS.get(BUX_KEY, null);
  if (w && Array.isArray(w.owned) && (w.v || 1) < 2) {
    // (since everything in the Shop has a price: what you wore stays yours, and so do your Quests' rewards)
    const keepIt = (k, v, how) => { if (v && PRICES[k + ':' + v] > 0 && !w.owned.includes(k + ':' + v)) { w.owned.push(k + ':' + v); (w.how = w.how || {})[k + ':' + v] = how; } };
    keepIt('deco', me.decoration, 'grant'); keepIt('font', (me.style || {}).font, 'grant'); keepIt('effect', me.effect, 'grant'); keepIt('frame', me.frame, 'grant'); if (/^np:/.test(me.plate || '')) keepIt('plate', me.plate.slice(3), 'grant');
    for (const q of QUESTS) if (questsDone().includes(q.id)) keepIt(q.reward[0], q.reward[1], 'quest');
    w.v = 2; LS.set(BUX_KEY, w);
  }
  if (!w || typeof w !== 'object' || !Array.isArray(w.owned)) {
    w = { v: 2, balance: WELCOME, earned: WELCOME, spent: 0, sent: 0, received: 0, claims: {}, owned: [], reacts: [], log: [{ at: Date.now(), amount: WELCOME, kind: 'welcome', note: '' }] };
    // (what you wore before things had prices stays yours)
    for (const [k, v] of [['deco', me.decoration], ['font', (me.style || {}).font], ['effect', me.effect], ['frame', me.frame], ['plate', /^np:/.test(me.plate || '') ? me.plate.slice(3) : '']]) if (v && PRICES[k + ':' + v] > 0) w.owned.push(k + ':' + v);
    for (const q of QUESTS) if (questsDone().includes(q.id) && !w.owned.includes(q.reward.join(':'))) { w.owned.push(q.reward.join(':')); (w.how = w.how || {})[q.reward.join(':')] = 'quest'; }
    LS.set(BUX_KEY, w);
  }
  return w;
}
function keepWallet(w, entry) {
  if (entry) w.log = [{ at: Date.now(), ...entry }, ...(w.log || [])].slice(0, 60);
  const old = Date.now() - 400 * 864e5; for (const [k, t] of Object.entries(w.claims)) if (t < old) delete w.claims[k];
  LS.set(BUX_KEY, w);
}
// (signed out, reactions don't say when they were made: they're counted here as you make them)
function buxReacted() { const w = localWallet(); w.reacts = [...(w.reacts || []), Date.now()].filter((t) => t > Date.now() - 400 * 864e5).slice(-3000); keepWallet(w); }
// how much of a task you've done since a time (signed out: from what's in this browser)
function localCount(counts, since) {
  if (counts === 'none') return 1;
  if (counts === 'reactions') return (localWallet().reacts || []).filter((t) => t >= since).length;
  if (counts === 'threads') return 0;
  const times = [], take = (list) => { for (const m of list || []) if (m.user && !m.user.bot && isMe(m.user) && m.ts >= since) times.push(m.ts); };
  for (const sv of Store.servers()) for (const c of Store.channels(sv.id)) take(Store.messages(c.id));
  for (const d of Store.dmList()) take(Store.dm(d.id));
  return counts === 'days' ? new Set(times.map((t) => new Date(t).toISOString().slice(0, 10))).size : times.length;
}
// what something from the Shop is called
function itemName(kind, item) {
  const n = kind === 'deco' ? (decoInfo(item) || [])[1] : kind === 'font' ? (FONTS.find((f) => f[0] === item) || [])[1] : kind === 'effect' ? (effectInfo(item) || [])[1]
    : kind === 'frame' ? (frameInfo(item) || [])[1] : kind === 'plate' ? (plateInfo(item) || [])[1] : '';
  return n || item;
}
const KIND_NAME = { deco: 'Avatar Decoration', font: 'Name Font', effect: 'Profile Effect', frame: 'Profile Frame', plate: 'Nameplate' };
const Bux = {
  // your wallet (signed in, before your first claim or buy: the welcome Datbux waiting for you)
  wallet() {
    if (!buxLive()) return localWallet();
    return Store.wallet() || { balance: WELCOME, earned: 0, spent: 0, sent: 0, received: 0, waiting: true };
  },
  // what the Shop asks for something: Datbux (0: free), or null when it isn't sold (so it's free)
  price: (kind, item) => (!item || !buxReady() ? null : buxLive() ? Store.priceOf(kind, item) : PRICES[kind + ':' + item] ?? null),
  owns: (kind, item) => (buxLive() ? Store.owns(kind, item) : localWallet().owned.includes(kind + ':' + item)),
  // whether you may wear it: it's free, or it's yours
  mayWear: (kind, item) => !item || !(Bux.price(kind, item) > 0) || Bux.owns(kind, item),
  owned: () => { if (buxLive()) return Store.ownedList(); const w = localWallet(); return w.owned.map((k) => { const [kind, item] = k.split(':'); return { kind, item, how: (w.how || {})[k] || 'buy' }; }); },
  // the tasks: how far along each is, whether it's claimed this time, and when it comes back
  async tasks() {
    if (buxLive()) return (await Store.taskProgress()).map((r) => ({ ...(TASK[r.task] || { title: r.task, how: '' }), id: r.task, every: r.every, reward: r.reward, goal: r.goal, have: r.have, claimed: r.claimed, resets: r.resets }));
    const w = localWallet();
    return TASKS.map((t) => { const p = period(t.every); return { ...t, have: Math.min(t.goal, localCount(t.counts, p.start)), claimed: !!w.claims[t.id + '@' + p.key], resets: p.end, signIn: t.counts === 'threads' }; });
  },
  async claim(t) {
    if (buxLive()) return attempt(() => Store.claimTask(t.id));
    const w = localWallet(), p = period(t.every), have = localCount(t.counts, p.start);
    if (w.claims[t.id + '@' + p.key]) { toast('You’ve claimed that already.'); return null; }
    if (have < t.goal) { toast(`Not done yet: ${fmtBux(have)} of ${fmtBux(t.goal)}.`); return null; }
    w.claims[t.id + '@' + p.key] = Date.now(); w.balance += t.reward; w.earned += t.reward; keepWallet(w, { amount: t.reward, kind: 'task', note: t.id });
    return w.balance;
  },
  async buy(kind, item) {
    const cost = Bux.price(kind, item);
    if (!(cost > 0) || Bux.owns(kind, item)) return true;
    if (buxLive()) return (await attempt(() => Store.buyItem(kind, item))) !== null;
    const w = localWallet();
    if (w.balance < cost) { toast(`That costs ${fmtBux(cost)} Datbux, and you have ${fmtBux(w.balance)}.`); return false; }
    w.balance -= cost; w.spent += cost; w.owned.push(kind + ':' + item); keepWallet(w, { amount: -cost, kind: 'buy', note: kind + ':' + item });
    return true;
  },
  // the Shop's bundles (signed in, as the database has them), what one costs you (what you have already isn't paid for
  // again), and buying one
  bundles: () => (!buxReady() ? [] : buxLive() ? (Store.canBundles() ? Store.bundles() : []) : BUNDLES),
  // (the holidays on today: signed in, as the database counts them)
  sales: () => (buxLive() ? Store.sales() : activeHolidays()),
  bundlePct: (b) => bundlePct(b, Bux.sales()),
  // what's off a bundle now and why: { pct, name } (the bigger of its holiday's and a sale's), or null
  bundleOff: (b) => { const on = Bux.sales().filter((h) => h.kind === 'sale' || h.id === b.holiday).sort((x, y) => y.pct - x.pct)[0]; return on ? { pct: on.pct, name: on.name, ends: on.ends } : null; },
  bundlePrice: (b) => bundleCost(b, Bux.price, Bux.owns, Bux.bundlePct(b)),
  bundleFull: (b) => b.items.reduce((n, x) => n + (Bux.price(x.k, x.i) || 0), 0),
  async buyBundle(b) {
    const cost = Bux.bundlePrice(b);
    if (!(cost > 0)) return true;
    if (buxLive()) return (await attempt(() => Store.buyBundle(b.id))) !== null;
    const w = localWallet();
    if (w.balance < cost) { toast(`That costs ${fmtBux(cost)} Datbux, and you have ${fmtBux(w.balance)}.`); return false; }
    w.balance -= cost; w.spent += cost;
    for (const x of b.items) if (!w.owned.includes(x.k + ':' + x.i)) w.owned.push(x.k + ':' + x.i);
    keepWallet(w, { amount: -cost, kind: 'buy', note: 'bundle:' + b.id });
    return true;
  },
  // what's happened in your wallet, newest first: { at, amount, kind, note, other }
  async history() {
    if (!buxLive()) return localWallet().log || [];
    return (await Store.buxLog()).map((r) => ({ at: Date.parse(r.created_at) || 0, amount: Number(r.amount) || 0, kind: r.kind, note: r.note || '', other: r.other || null }));
  },
};
const buxTag = (n, cls = '') => el('span', { className: 'bux-tag' + (cls ? ' ' + cls : '') }, icon('coin', 14), fmtBux(n));
// buying something (asked first): true once it's yours
async function buyFlow(kind, item) {
  const cost = Bux.price(kind, item), name = itemName(kind, item);
  if (!(cost > 0) || Bux.owns(kind, item)) return true;
  const bal = Bux.wallet().balance;
  if (bal < cost) { toast(`${name} costs ${fmtBux(cost)} Datbux, and you have ${fmtBux(bal)}. Earn more with tasks (Direct Messages → Datbux).`); return false; }
  if (!(await confirmBox({ title: `Buy ${name}?`, text: `${KIND_NAME[kind] || 'It'}: ${fmtBux(cost)} Datbux. You have ${fmtBux(bal)}, so ${fmtBux(bal - cost)} would be left. It’s yours to keep, or to trade.`, ok: `Buy for ${fmtBux(cost)}` }))) return false;
  if (!(await Bux.buy(kind, item))) return false;
  toast(`${name} is yours.`); renderAll();
  return true;
}
// buying a bundle (asked first, with what's in it): true once it's all yours
async function buyBundleFlow(b) {
  const cost = Bux.bundlePrice(b), name = `${b.name} Bundle`;
  if (!(cost > 0)) return true;
  const bal = Bux.wallet().balance;
  if (bal < cost) { toast(`The ${name} costs ${fmtBux(cost)} Datbux, and you have ${fmtBux(bal)}. Earn more with tasks (Direct Messages → Bank).`); return false; }
  const list = b.items.map((x) => `${itemName(x.k, x.i)} (${KIND_NAME[x.k] || x.k}${Bux.owns(x.k, x.i) ? ', yours already' : ''})`).join(', '), off = Bux.bundleOff(b);
  const what = off ? `${off.pct}% off for ${off.name}` : `what ${b.items.some((x) => Bux.owns(x.k, x.i)) ? 'the rest of it costs' : 'its things cost'} one by one`;
  if (!(await confirmBox({ title: `Buy the ${name}?`, ok: `Buy for ${fmtBux(cost)}`,
    text: `${list}. ${fmtBux(cost)} Datbux: ${what}. You have ${fmtBux(bal)}, so ${fmtBux(bal - cost)} would be left. They’re yours to keep, or to trade.` }))) return false;
  if (!(await Bux.buyBundle(b))) return false;
  renderAll();
  return true;
}
// what wearing a whole bundle changes on your profile
function bundlePatch(b) {
  const patch = {};
  for (const x of b.items) {
    if (x.k === 'deco') patch.decoration = x.i; else if (x.k === 'effect') patch.effect = x.i; else if (x.k === 'frame') patch.frame = x.i;
    else if (x.k === 'plate') patch.plate = 'np:' + x.i; else if (x.k === 'font') patch.style = { ...(me.style || {}), font: x.i };
  }
  return patch;
}
// the people you could send Datbux to or trade with: friends, the people in your DMs and in your servers
function knownPeople() {
  const people = new Map(), add = (p) => { if (p && p.id && !p.bot && !p.me && !isMe(p) && !people.has(p.id)) people.set(p.id, p); };
  for (const f of Store.friends()) add(f);
  for (const d of Store.dmList()) { add(d.user); for (const p of d.people || []) add(p); }
  for (const sv of Store.servers()) for (const p of Store.members(sv.id) || []) add(p);
  return [...people.values()];
}
function pickPerson(title, sub) {
  return new Promise((done) => {
    const people = knownPeople(), list = el('div', { className: 'pick-list' }), q = el('input', { type: 'search', placeholder: 'Search by name', className: 'pick-q' });
    const draw = () => {
      const s = q.value.trim().toLowerCase(), hits = people.filter((p) => !s || String(p.name || '').toLowerCase().includes(s) || String(p.login || '').toLowerCase().includes(s));
      list.replaceChildren(...(hits.length ? hits.slice(0, 80).map((p) => el('button', { className: 'pick', onclick: () => m.close(p) }, avatarEl(p, { size: 32 }), el('span', { className: 'nm3' }, p.name), p.login ? el('span', { className: 'muted' }, p.login) : null))
        : [el('div', { className: 'empty-note' }, people.length ? 'Nobody by that name.' : 'Nobody to pick yet: make friends, or join a server.')]));
    };
    q.oninput = draw;
    const m = modal({ title, sub, body: [q, list], onClose: (v) => done(v || null), actions: [el('button', { className: 'btn', onclick: () => m.close(null) }, 'Cancel')] });
    draw(); setTimeout(() => q.focus(), 0);
  });
}
const buxSignedIn = () => {
  if (!buxLive()) { toast('Sign in to send Datbux and trade with people.'); return false; }
  if (!Store.canBux()) { toast('Datbux needs the newest supabase/setup.sql: run it again in Supabase.'); return false; }
  return true;
};
// Send Datbux to someone you know (with a note, if you like)
async function sendBuxDialog(to = null) {
  if (!buxSignedIn()) return;
  const who = to || (await pickPerson('Send Datbux', 'Who to?')); if (!who) return;
  const bal = Bux.wallet().balance;
  const amount = el('input', { type: 'number', min: 1, max: Math.max(1, Math.min(100000, bal)), step: 1, value: String(Math.min(50, Math.max(1, bal))) });
  const note = el('input', { type: 'text', maxLength: 160, placeholder: 'Say what it’s for (optional)' });
  const send = async () => {
    const n = Math.floor(Number(amount.value));
    if (!(n >= 1 && n <= 100000)) return toast('Send between 1 and 100,000 Datbux.');
    if (n > Bux.wallet().balance) return toast(`You have ${fmtBux(Bux.wallet().balance)} Datbux.`);
    go.disabled = true;
    if ((await attempt(() => Store.sendBux(who.id, n, note.value.trim()))) === null) { go.disabled = false; return; }
    m.close(); toast(`Sent ${fmtBux(n)} Datbux to ${who.name}.`); renderAll();
  };
  const go = el('button', { className: 'btn primary', onclick: send }, 'Send');
  amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  const m = modal({ title: 'Send Datbux', cls: 'dbx-dlg',
    body: [el('div', { className: 'dbx-to' }, avatarEl(who, { size: 40 }), el('div', { className: 'grow' }, el('b', {}, who.name), who.login ? el('small', {}, who.login) : null), el('span', { className: 'dbx-have' }, 'You have ', buxTag(bal))),
      el('div', { className: 'field' }, el('label', {}, 'How many'), el('div', { className: 'dbx-amt' }, icon('coin', 18), amount)),
      el('div', { className: 'dbx-quick' }, ...[10, 50, 100, 500].filter((n) => n <= bal).map((n) => el('button', { className: 'btn small', onclick: () => { amount.value = String(n); } }, fmtBux(n)))),
      el('div', { className: 'field' }, el('label', {}, 'Note'), note)],
    actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), go] });
  setTimeout(() => amount.select(), 0);
}
// something from the Shop, small: its picture and name
function itemChip(kind, item, { on = false, onclick = null } = {}) {
  const pv = kind === 'deco' ? avatarEl({ ...asMember(), decoration: item }, { size: 28 }) : kind === 'font' ? styleName(el('span', { className: 'dbx-fnt' }, 'Aa'), { font: item })
    : kind === 'plate' ? el('span', { className: 'dbx-plate', style: `background:${paint('np:' + item)}` }) : icon(kind === 'frame' ? 'frame' : 'sparkle', 18);
  return el(onclick ? 'button' : 'span', { className: 'dbx-item' + (on ? ' on' : ''), title: KIND_NAME[kind] || '', ...(onclick ? { onclick } : {}) }, el('span', { className: 'dbx-ipv' }, pv), el('span', {}, itemName(kind, item)), on ? icon('check', 13) : null);
}
// Trade (with someone you know): Datbux and things from the Shop each way; they say yes or no, and it all swaps at once
async function tradeDialog(to = null) {
  if (!buxSignedIn()) return;
  const who = to || (await pickPerson('Trade', 'Who with?')); if (!who) return;
  const theirs = await attempt(() => Store.ownedBy(who.id)); if (theirs === null) return;
  const mine = Bux.owned(), has = (list, k, i) => list.some((o) => o.kind === k && o.item === i);
  const canGive = mine.filter((o) => !has(theirs, o.kind, o.item)), canGet = theirs.filter((o) => !has(mine, o.kind, o.item));
  const give = new Set(), want = new Set(), key = (o) => o.kind + ':' + o.item;
  const giveBux = el('input', { type: 'number', min: 0, max: 100000, step: 1, value: '0' }), wantBux = el('input', { type: 'number', min: 0, max: 100000, step: 1, value: '0' });
  const note = el('input', { type: 'text', maxLength: 200, placeholder: 'A note for them (optional)' });
  const giveBox = el('div', { className: 'dbx-items' }), wantBox = el('div', { className: 'dbx-items' });
  const draw = () => {
    giveBox.replaceChildren(...(canGive.length ? canGive.map((o) => itemChip(o.kind, o.item, { on: give.has(key(o)), onclick: () => { if (give.has(key(o))) give.delete(key(o)); else if (give.size >= 10) return toast('Up to 10 things each way.'); else give.add(key(o)); draw(); } }))
      : [el('small', { className: 'muted' }, 'Nothing from the Shop to offer (that they don’t have).')]));
    wantBox.replaceChildren(...(canGet.length ? canGet.map((o) => itemChip(o.kind, o.item, { on: want.has(key(o)), onclick: () => { if (want.has(key(o))) want.delete(key(o)); else if (want.size >= 10) return toast('Up to 10 things each way.'); else want.add(key(o)); draw(); } }))
      : [el('small', { className: 'muted' }, `${who.name} has nothing from the Shop you don’t have.`)]));
  };
  const items = (set) => [...set].map((k) => { const [kind, item] = k.split(':'); return { k: kind, i: item }; });
  const offer = async () => {
    const gb = Math.floor(Number(giveBux.value) || 0), wb = Math.floor(Number(wantBux.value) || 0);
    if (gb < 0 || wb < 0 || gb > 100000 || wb > 100000) return toast('Up to 100,000 Datbux each way.');
    if (!gb && !wb && !give.size && !want.size) return toast('Put something in the trade.');
    if (gb > Bux.wallet().balance) return toast(`You have ${fmtBux(Bux.wallet().balance)} Datbux.`);
    go.disabled = true;
    if ((await attempt(() => Store.offerTrade(who.id, { bux: gb, items: items(give) }, { bux: wb, items: items(want) }, note.value.trim()))) === null) { go.disabled = false; return; }
    m.close(); toast(`Trade offered to ${who.name}. It waits for them to say yes.`); renderAll();
  };
  const go = el('button', { className: 'btn primary', onclick: offer }, 'Offer Trade');
  const side = (title, sub, bux, box) => el('div', { className: 'dbx-side' }, el('h4', {}, title), el('small', { className: 'muted' }, sub),
    el('div', { className: 'dbx-amt' }, icon('coin', 18), bux, el('span', {}, 'Datbux')), box);
  const m = modal({ title: `Trade with ${who.name}`, sub: 'They get a moment to look it over: nothing changes hands until they accept.', cls: 'dbx-dlg wide-trade',
    body: [el('div', { className: 'dbx-trade' }, side('You give', `You have ${fmtBux(Bux.wallet().balance)} Datbux.`, giveBux, giveBox), el('div', { className: 'dbx-swap' }, icon('swap', 22)),
      side('You get', `From ${who.name}.`, wantBux, wantBox)), el('div', { className: 'field' }, el('label', {}, 'Note'), note)],
    actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), go] });
  draw();
}
// one trade, as you see it: who with, what you'd give and get, and what you can do about it
function tradeCard(t) {
  const mineFrom = t.from === Store.myId(), other = person(mineFrom ? t.to : t.from);
  const give = mineFrom ? { bux: t.giveBux, items: t.giveItems } : { bux: t.wantBux, items: t.wantItems }, get = mineFrom ? { bux: t.wantBux, items: t.wantItems } : { bux: t.giveBux, items: t.giveItems };
  const list = (x) => el('div', { className: 'dbx-items' }, x.bux ? buxTag(x.bux) : null, ...(x.items || []).map((o) => itemChip(o.k, o.i)), !x.bux && !(x.items || []).length ? el('small', { className: 'muted' }, 'Nothing') : null);
  const act = async (fn, said) => { const r = await attempt(fn); if (r === null) return; toast(typeof said === 'function' ? said(r) : said); renderAll(); };
  const STATUS = { done: ['Done', 'good'], declined: ['Declined', 'bad'], cancelled: ['Cancelled', ''], failed: ['Didn’t go through', 'bad'] };
  const st = STATUS[t.status];
  return el('div', { className: 'dbx-tc' + (t.status === 'open' ? ' open' : '') },
    el('div', { className: 'dbx-tc-head' }, avatarEl(other, { size: 32 }), el('div', { className: 'grow' }, el('b', {}, t.status === 'open' ? (mineFrom ? `Your offer to ${other.name}` : `${other.name} offers you a trade`) : `Trade with ${other.name}`),
      el('small', {}, when(t.decided || t.at, true))), st ? el('span', { className: 'chip ' + st[1] }, st[0]) : null),
    t.note ? el('p', { className: 'dbx-note' }, '“' + t.note + '”') : null,
    el('div', { className: 'dbx-tc-body' }, el('div', {}, el('small', {}, 'You give'), list(give)), icon('swap', 18), el('div', {}, el('small', {}, 'You get'), list(get))),
    t.why ? el('p', { className: 'dbx-note bad' }, t.why) : null,
    t.status === 'open' ? el('div', { className: 'dbx-tc-acts' }, ...(mineFrom ? [el('button', { className: 'btn small', onclick: () => act(() => Store.cancelTrade(t.id), 'Trade cancelled.') }, 'Cancel Offer')]
      : [el('button', { className: 'btn small', onclick: () => act(() => Store.answerTrade(t.id, false), 'Trade declined.') }, 'Decline'),
        el('button', { className: 'btn small green', onclick: () => act(() => Store.answerTrade(t.id, true), (r) => (r === 'done' ? 'Trade done!' : 'The trade didn’t go through: see why under it.')) }, 'Accept')])) : null);
}
// a line of your wallet's history
function buxLine(h) {
  const who = h.other ? person(h.other).name : '', [kind, item] = String(h.note || '').split(':');
  const bundle = kind === 'bundle' ? (Bux.bundles().find((b) => b.id === item) || BUNDLES.find((b) => b.id === item) || { name: item }) : null;
  const what = { welcome: 'Welcome to Datbux', task: `Task: ${(TASK[h.note] || {}).title || h.note}`, buy: bundle ? `Bought the ${bundle.name} Bundle` : `Bought ${itemName(kind, item)}`, boost: `Boosted ${h.note || 'a server'}`, send: `Sent to ${who}`, receive: `From ${who}`, trade: `Trade with ${who}`, staff: 'A gift from Fluentdat' }[h.kind] || h.kind;
  const said = (h.kind === 'send' || h.kind === 'receive') && h.note ? h.note : '';
  return el('div', { className: 'dbx-log' }, el('span', { className: 'dbx-ld' }, icon(h.kind === 'buy' ? 'shop' : h.kind === 'task' ? 'check' : h.kind === 'trade' ? 'swap' : h.kind === 'welcome' || h.kind === 'staff' ? 'gift' : h.kind === 'boost' ? 'gem' : 'send', 16)),
    el('div', { className: 'grow' }, el('b', {}, what), said ? el('small', {}, '“' + said + '”') : null), el('time', {}, when(h.at, true)),
    el('span', { className: 'dbx-amt2 ' + (h.amount >= 0 ? 'up' : 'down') }, (h.amount >= 0 ? '+' : '−') + fmtBux(Math.abs(h.amount))));
}
// the Datbux page (Direct Messages → Datbux): your balance, the tasks, your trades and what's happened
function datbuxPage() {
  const live = buxLive();
  if (!buxReady()) return el('div', { className: 'dbx-page' }, el('div', { className: 'note-box' }, 'Datbux needs the newest supabase/setup.sql: run it again in Supabase.'));
  const w = Bux.wallet();
  const tasksBox = el('div', { className: 'dbx-tasks' }, el('div', { className: 'empty-note' }, 'Loading the tasks…'));
  const logBox = el('div', { className: 'dbx-logs' }, el('div', { className: 'empty-note' }, 'Loading…'));
  const card = (t) => {
    const done = t.have >= t.goal;
    const claim = async (b) => { b.disabled = true; const r = await Bux.claim(t); if (r === null) { b.disabled = false; return; } toast(`+${fmtBux(t.reward)} Datbux: ${t.title}.`); renderAll(); };
    return el('div', { className: 'dbx-task' + (t.claimed ? ' claimed' : done ? ' ready' : '') },
      el('div', { className: 'dbx-tt' }, el('b', {}, t.title), el('small', {}, t.how)),
      el('div', { className: 'dbx-tp' }, el('div', { className: 'qs-bar' }, el('i', { style: `width:${Math.round(Math.min(1, t.have / (t.goal || 1)) * 100)}%` })), el('small', {}, `${fmtBux(t.have)}/${fmtBux(t.goal)}`)),
      el('div', { className: 'dbx-tr' }, buxTag(t.reward, 'plus'),
        t.claimed ? el('span', { className: 'chip good' }, icon('check', 13), 'Claimed') : t.signIn ? el('span', { className: 'chip' }, 'Sign in for this one')
          : el('button', { className: 'btn small ' + (done ? 'green' : ''), disabled: !done, onclick: (e) => claim(e.currentTarget) }, done ? 'Claim' : 'Not Yet')),
      el('small', { className: 'dbx-reset' }, icon('clock', 12), (t.claimed ? 'Back ' : 'Resets ') + resetsIn(t.resets)));
  };
  Bux.tasks().then((list) => {
    const ready = list.filter((t) => !t.claimed && t.have >= t.goal && !t.signIn).length;
    tasksBox.replaceChildren(...Object.entries(EVERY).flatMap(([every, label]) => { const mine = list.filter((t) => t.every === every); return mine.length ? [el('h3', { className: 'dbx-h3' }, label), el('div', { className: 'dbx-grid' }, ...mine.map(card))] : []; }));
    if (ready) tasksBox.prepend(el('div', { className: 'note-box good' }, icon('gift', 16), ` ${plural(ready, 'task')} ready to claim.`));
  }, (e) => tasksBox.replaceChildren(el('div', { className: 'note-box' }, String((e && e.message) || e))));
  Bux.history().then((h) => logBox.replaceChildren(...(h.length ? h.slice(0, 30).map(buxLine) : [el('div', { className: 'empty-note' }, 'Nothing yet.')])), () => logBox.replaceChildren(el('div', { className: 'empty-note' }, 'Couldn’t load it.')));
  const trades = live ? Store.trades() : [], me2 = live ? Store.myId() : null;
  const waiting = trades.filter((t) => t.status === 'open' && t.to === me2), offered = trades.filter((t) => t.status === 'open' && t.from === me2), past = trades.filter((t) => t.status !== 'open').slice(0, 10);
  const stat = (label, n) => el('div', { className: 'dbx-stat' }, el('small', {}, label), el('b', {}, fmtBux(n)));
  const boosting = paidBoosts() ? Store.servers().map((sv) => [sv, Store.myBoost(sv.id)]).filter(([, b]) => b && b.on) : [];
  return el('div', { className: 'dbx-page' },
    el('div', { className: 'dbx-hero' }, el('div', { className: 'dbx-coin' }, icon('coin', 46)),
      el('div', { className: 'grow' }, el('h1', {}, labelOf('dmNav', 'datbuxNav')), el('p', {}, 'Your Datbux, Fluentdat’s own money. Earn them with daily, weekly, monthly and yearly tasks, spend them in the Shop and on Server Boosts, and send or trade them with people you know.'),
        el('div', { className: 'shp-hero-acts' }, el('button', { className: 'btn', onclick: () => { homePage = 'shop'; renderAll(); } }, icon('shop', 16), 'Shop'),
          el('button', { className: 'btn', onclick: () => sendBuxDialog() }, icon('send', 16), 'Send Datbux'), el('button', { className: 'btn', onclick: () => tradeDialog() }, icon('swap', 16), 'Trade'))),
      el('div', { className: 'dbx-bal' }, el('small', {}, 'Your Datbux'), el('b', {}, icon('coin', 28), fmtBux(w.balance)), w.waiting ? el('small', {}, 'Your welcome Datbux, here with your first claim or buy') : null)),
    el('div', { className: 'dbx-stats' }, stat('Earned', w.earned), stat('Spent', w.spent), stat('Sent', w.sent || 0), stat('Received', w.received || 0)),
    el('h2', { className: 'shp-h' }, 'Tasks'), el('p', { className: 'shp-sub' }, 'Do them and claim them: daily ones come back each day, weekly ones each Monday, then monthly and yearly (in UTC).' + (live ? '' : ' Signed out, they count what you do in this browser.')),
    tasksBox,
    ...(boosting.length ? [el('h2', { className: 'shp-h' }, 'Your Boosts'), el('p', { className: 'shp-sub' }, `${BOOST_DAY} Datbux a day each, paid ahead.`),
      el('div', { className: 'dbx-boosts' }, ...boosting.map(([sv, b]) => el('div', { className: 'dbx-boost' }, serverFace(sv, 36),
        el('div', { className: 'grow' }, el('b', {}, sv.name), el('small', {}, `Paid until ${whenLong(b.paidUntil)} · ${b.auto ? 'renews every day' : 'ends then'}`)),
        el('button', { className: 'btn small', onclick: () => boostDialog(sv.id) }, 'Manage'))))] : []),
    ...(live ? [el('h2', { className: 'shp-h' }, 'Trades'), el('p', { className: 'shp-sub' }, 'Offer Datbux and things from the Shop for theirs. Open someone’s profile (or Trade, up there) to start one.'),
      waiting.length || offered.length || past.length ? el('div', { className: 'dbx-tcs' }, ...waiting.map(tradeCard), ...offered.map(tradeCard), ...past.map(tradeCard)) : el('div', { className: 'empty-note' }, 'No trades yet.')] : []),
    el('h2', { className: 'shp-h' }, 'History'), logBox);
}
// the Shop (Discord's): everything in it costs Datbux (avatar decorations, name fonts, profile effects, frames and
// nameplates); a few things are also a Quest's reward, yours once you've done it
function shopPage() {
  const live = Store.kind === 'supabase', you = asMember(), canDeco = !live || (Store.canDecorate && Store.canDecorate()), w = buxReady() ? Bux.wallet() : null;
  const plates = !live || Store.canPlates();
  const use = (patch, said) => {
    if (('decoration' in patch || 'effect' in patch) && !canDeco) return toast('The Shop needs the newest supabase/setup.sql: run it again in Supabase.');
    if ('frame' in patch && live && !Store.canFrame()) return toast('Profile frames need the newest supabase/setup.sql: run it again in Supabase.');
    Object.assign(me, patch); saveMe(); pushProfile(); renderAll(); toast(said);
  };
  // (something with a price: bought first, then worn)
  const buyUse = async (kind, id, patch, said) => { if (kind === 'deco' && !canDeco) return use(patch, said); if (await buyFlow(kind, id)) use(patch, said); };
  const goHome = (page) => { view = 'home'; dmId = null; homePage = page; renderAll(); };
  const item = (preview, name, sub, action, on) => el('div', { className: 'shp-item' + (on ? ' on' : '') }, el('div', { className: 'shp-pv' }, preview), el('div', { className: 'shp-meta' }, el('b', {}, name), el('small', {}, sub)), action);
  // what it costs, or that it's yours (and, for a Quest's reward, which Quest gives it)
  const cost = (kind, id, quest) => {
    const p = Bux.price(kind, id), mine = Bux.owns(kind, id);
    const tag = p > 0 ? (mine ? el('span', { className: 'bux-own' }, icon('check', 13), 'Yours') : buxTag(p)) : mine ? el('span', { className: 'bux-own' }, icon('check', 13), 'Yours') : 'Free';
    return quest && !mine ? el('span', { className: 'shp-cost' }, tag, el('button', { className: 'link-btn shp-quest', title: 'Or finish this Quest for it', onclick: () => goHome('quests') }, icon('quest', 12), (questInfo(quest) || {}).title || 'Quest')) : tag;
  };
  // Use, Remove, or Buy
  const act = (kind, id, on, offPatch, onPatch, offSaid, onSaid) => (on ? el('button', { className: 'btn small', onclick: () => use(offPatch, offSaid) }, 'Remove')
    : Bux.mayWear(kind, id) ? el('button', { className: 'btn small primary', onclick: () => use(onPatch, onSaid) }, 'Use')
    : el('button', { className: 'btn small primary', onclick: () => buyUse(kind, id, onPatch, onSaid) }, icon('coin', 14), 'Buy · ' + fmtBux(Bux.price(kind, id))));
  const decos = DECORATIONS.map(([id, name, quest]) => item(avatarEl({ ...you, decoration: id }, { size: 76 }), name, cost('deco', id, quest),
    act('deco', id, me.decoration === id, { decoration: '' }, { decoration: id }, 'Decoration taken off.', `${name} is on your avatar.`), me.decoration === id));
  // (a name font shows on your name everywhere; its colours and effect are your Display Name Style)
  const st = me.style || {};
  const fonts = FONTS.filter(([id]) => id).map(([id, name]) => {
    const on = st.font === id, pv = styleName(el('span', { className: 'shp-font' }, me.name || 'Your Name'), { ...st, font: id }, { fallback: safeColor(me.color, '#ffffff') });
    return item(el('div', { className: 'shp-font-pv' }, pv), name, cost('font', id), act('font', id, on, { style: { ...st, font: '' } }, { style: { ...st, font: id } }, 'Name font taken off.', `Your name is in ${name} now.`), on);
  });
  const mini = (id) => { const c = el('div', { className: 'shp-mini' }, el('div', { className: 'shp-mini-b' }), el('div', { className: 'shp-mini-av' }, avatarEl(you, { size: 38 })), el('b', {}, me.name)); setBanner(c.firstChild, me.banner, me.color); themeCard(c, you.theme); const fx = effectEl(id); if (fx) c.append(fx); return c; };
  const effects = PROFILE_EFFECTS.map(([id, name, quest]) => item(mini(id), name, cost('effect', id, quest),
    act('effect', id, me.effect === id, { effect: '' }, { effect: id }, 'Profile effect taken off.', `${name} is on your profile.`), me.effect === id));
  // (a frame goes around a profile card: shown around an empty one, as on Discord)
  const frames = FRAMES.map(([id, name]) => {
    const on = me.frame === id, card = withFrame(el('div', { className: 'shp-skel' }, el('div', { className: 'shp-skel-b' }), el('div', { className: 'shp-skel-av' }), el('i', { className: 'l1' }), el('i', { className: 'l2' }), el('i', { className: 'l3' })), id);
    return el('div', { className: 'shp-fr' + (on ? ' on' : '') }, el('div', { className: 'shp-fr-pv' }, card), el('div', { className: 'shp-fr-meta' }, el('b', {}, name), el('small', {}, on ? 'Around your profile' : cost('frame', id))),
      act('frame', id, on, { frame: '' }, { frame: id }, 'Frame taken off.', `${name} is around your profile now.`));
  });
  // (a nameplate behind your name, as it is in a member list)
  const nameplates = plates ? NAMEPLATES.map(([id, name]) => {
    const v = 'np:' + id, on = me.plate === v, row = el('div', { className: 'mem shp-plate plated' }, avatarEl(you, { size: 30 }), el('div', { className: 'who' }, el('div', { className: 'nm' }, me.name)));
    row.style.setProperty('--plate', paint(v)); plateMove(row, v);
    return item(row, name, cost('plate', id), act('plate', id, on, { plate: '' }, { plate: v }, 'Nameplate taken off.', `${name} is behind your name now.`), on);
  }) : [];
  // (a bundle, as on Discord: its decoration on your avatar, its nameplate behind your name, and its effect and frame on a
  // card, tilted together; what it costs you, and how much less that is)
  const bundleCard = (b) => {
    const has = (k) => (b.items.find((x) => x.k === k) || {}).i || '', deco = has('deco'), fx = has('effect'), fr = has('frame'), pl = has('plate'), font = has('font');
    const st2 = font ? { ...(me.style || {}), font } : me.style || {};
    const nameOf = (cls) => styleName(el('span', { className: cls }, me.name || 'Your Name'), st2, { fallback: safeColor(me.color, '#ffffff') });
    const card = el('div', { className: 'bdl-card' }, el('div', { className: 'bdl-card-b' }), el('div', { className: 'bdl-card-av' }, avatarEl({ ...you, decoration: '' }, { size: 30 })),
      el('div', { className: 'bdl-card-n' }, nameOf('bdl-nm')), el('i', { className: 'l1' }), el('i', { className: 'l2' }));
    setBanner(card.firstChild, me.banner, me.color); themeCard(card, you.theme);
    if (fx) { const e = effectEl(fx); if (e) card.append(e); }
    if (fr) withFrame(card, fr);
    const strip = pl || font ? el('div', { className: 'bdl-plate mem' + (pl ? ' plated' : '') }, avatarEl(you, { size: 20 }), el('div', { className: 'who' }, el('div', { className: 'nm' }, nameOf('nmt')))) : null;
    if (strip && pl) { strip.style.setProperty('--plate', paint('np:' + pl)); plateMove(strip, 'np:' + pl); }
    const pv = el('div', { className: 'bdl-pv' }, card, strip, el('div', { className: 'bdl-av' }, avatarEl({ ...you, decoration: deco }, { size: 64 })));
    const price = Bux.bundlePrice(b), mine = !(price > 0), owned = b.items.filter((x) => Bux.owns(x.k, x.i)).length, off = Bux.bundleOff(b);
    const what = b.items.map((x) => `${itemName(x.k, x.i)} (${KIND_NAME[x.k] || x.k})`).join(', ');
    const buy = mine ? el('button', { className: 'btn small bdl-buy', onclick: () => use(bundlePatch(b), `The ${b.name} Bundle is on.`) }, 'Use All')
      : el('button', { className: 'btn small primary bdl-buy', onclick: async () => {
        if (!(await buyBundleFlow(b))) return;
        notice(`The ${b.name} Bundle is yours.`, 'Put It On', () => use(bundlePatch(b), `The ${b.name} Bundle is on.`));
      } }, icon('coin', 14), 'Buy for ' + fmtBux(price));
    return el('div', { className: 'shp-item bdl' + (mine ? ' on' : ''), title: 'Includes ' + what }, pv,
      el('div', { className: 'shp-meta' }, el('b', {}, `${b.items.length}pc ${b.name} Bundle`),
        el('small', { className: 'bdl-price' }, ...(mine ? [el('span', { className: 'bux-own' }, icon('check', 13), 'Yours')]
          : [buxTag(price), off ? el('span', { className: 'bdl-off' }, `(-${off.pct}%)`) : null, off ? el('span', { className: 'bdl-sale' }, off.name) : null,
            owned ? el('span', { className: 'bdl-have' }, `you have ${owned}`) : null]))),
      buy);
  };
  const bundles = Bux.bundles().map(bundleCard);
  // (what's on: a sale day takes something off every bundle, a holiday off the bundles made for it)
  const dayOf = (t) => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const onNow = Bux.sales(), sale = onNow.filter((h) => h.kind === 'sale').sort((x, y) => y.pct - x.pct)[0];
  const themed = onNow.filter((h) => h.kind === 'theme').map((h) => [h, Bux.bundles().filter((b) => b.holiday === h.id)]).filter(([, bs]) => bs.length);
  const bundleSub = sale ? `${sale.name}: every bundle is ${sale.pct}% off, until ${dayOf(sale.ends)}.`
    : themed.length ? themed.map(([h, bs]) => `${h.name}: ${bs.map((b) => 'the ' + b.name + ' Bundle').join(' and ')} ${bs.length === 1 ? 'is' : 'are'} ${h.pct}% off, until ${dayOf(h.ends)}.`).join(' ')
    : 'A few things that go together, for what they cost one by one: less on the holiday a bundle is made for, and on sale days like Black Friday.';
  const sec = (title, sub, list, cls = '') => (list.length ? [el('h2', { className: 'shp-h' }, title), el('p', { className: 'shp-sub' }, sub), el('div', { className: 'shp-grid ' + cls }, ...list)] : []);
  const page = el('div', { className: 'shp-page' },
    el('div', { className: 'shp-hero' }, el('div', {}, el('h1', {}, 'Shop'),
      el('p', {}, w ? 'Everything here costs Datbux: earn them with tasks in your Bank. Bundles cost less on their holidays and on sale days, and a few things are also a Quest’s reward, yours once you’ve done the Quest.' : 'Everything here is free. A few things unlock when you finish a Quest.'),
      el('div', { className: 'shp-hero-acts' }, w ? el('button', { className: 'btn shp-bal', title: 'Your Datbux', onclick: () => goHome('datbux') }, icon('coin', 16), fmtBux(w.balance)) : null,
        el('button', { className: 'btn', onclick: () => goHome('quests') }, icon('quest', 16), labelOf('dmNav', 'questsNav')),
        el('button', { className: 'btn', onclick: () => goHome('collection') }, icon('collection', 16), labelOf('dmNav', 'collectionNav')),
        el('button', { className: 'btn', onclick: () => nameStyleDialog(me.style, (s) => { me.style = s; saveMe(); pushProfile(); renderAll(); }, asMember) }, icon('brush', 16), 'Display Name Style'))),
      el('div', { className: 'shp-you' }, avatarEl(you, { size: 96 }))),
    ...sec('Bundles', `${bundleSub} What you have already isn’t paid for again.`, bundles, 'bundles'),
    ...sec('Avatar Decorations', `${DECORATIONS.length} of them, each about a week of tasks, around your avatar everywhere: in chats, the member list and your profile.`, decos),
    ...sec('Name Fonts', `${FONTS.length - 1} of them. Your name, in a font of its own: in chats, the member list and your profile. Its colours and effect are your Display Name Style.`, fonts, 'wide'),
    ...sec('Profile Effects', `${PROFILE_EFFECTS.length} of them, played over your profile card when someone opens it.`, effects, 'wide'),
    ...sec('Profile Frames', `${FRAMES.length} of them, drawn around your profile card wherever someone opens it.`, frames, 'frames'),
    ...sec('Nameplates', `${NAMEPLATES.length} of them, behind your name in the member list and your DMs (when people have nameplates on). Plain colours and your own pictures are free in Edit Profile.`, nameplates, 'wide'),
    prefs.decorations === 'off' || prefs.effects === 'off' ? el('div', { className: 'note-box' }, 'You’ve turned off decorations or effects for yourself (Customize → Profiles), so you won’t see them on other people.') : null);
  // (only what's on the screen moves: a Shop full of effects and frames is a lot to animate at once)
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((es) => { if (!page.isConnected) return io.disconnect(); for (const e of es) e.target.classList.toggle('still', !e.isIntersecting); }, { rootMargin: '150px 0px' });
    for (const c of page.querySelectorAll('.shp-item, .shp-fr')) { c.classList.add('still'); io.observe(c); }
  }
  return page;
}
// Collection (Direct Messages → Collection): your badges, and what's yours from the Shop (bought, traded, or kept from
// before things had prices) and from Quests, to put on or take off
function collectionPage() {
  const you = asMember(), owned = buxReady() ? Bux.owned() : [], st = me.style || {};
  const HOW = { buy: 'Bought', trade: 'Traded', grant: 'Yours from before', quest: 'Quest reward' };
  const use = (patch, said) => { Object.assign(me, patch); saveMe(); pushProfile(); renderAll(); toast(said); };
  const item = (preview, name, sub, on, act) => el('div', { className: 'shp-item' + (on ? ' on' : '') }, el('div', { className: 'shp-pv' }, preview),
    el('div', { className: 'shp-meta' }, el('b', {}, name), el('small', {}, sub)), act);
  const toggle = (on, off, put, said) => (on ? el('button', { className: 'btn small', onclick: () => use(off, 'Taken off.') }, 'Remove') : el('button', { className: 'btn small primary', onclick: () => use(put, said) }, 'Use'));
  const how = (kind, id, quest) => { const o = owned.find((x) => x.kind === kind && x.item === id); return o ? HOW[o.how] || 'Yours' : quest ? 'Quest reward' : 'Yours'; };
  const decoIds = [...new Set([...owned.filter((o) => o.kind === 'deco').map((o) => o.item), ...DECORATIONS.filter(([id, , q]) => q && unlocked(q) && !(Bux.price('deco', id) > 0)).map(([id]) => id)])];
  const decos = decoIds.map((id) => decoInfo(id)).filter(Boolean).map(([id, name, quest]) =>
    item(avatarEl({ ...you, decoration: id }, { size: 76 }), name, how('deco', id, quest), me.decoration === id, toggle(me.decoration === id, { decoration: '' }, { decoration: id }, `${name} is on your avatar.`)));
  const fonts = owned.filter((o) => o.kind === 'font').map((o) => FONTS.find((f) => f[0] === o.item)).filter(Boolean).map(([id, name]) =>
    item(el('div', { className: 'shp-font-pv' }, styleName(el('span', { className: 'shp-font' }, me.name || 'Your Name'), { ...st, font: id }, { fallback: safeColor(me.color, '#ffffff') })), name, how('font', id),
      st.font === id, toggle(st.font === id, { style: { ...st, font: '' } }, { style: { ...st, font: id } }, `Your name is in ${name} now.`)));
  const mini = (id) => { const c = el('div', { className: 'shp-mini' }, el('div', { className: 'shp-mini-b' }), el('div', { className: 'shp-mini-av' }, avatarEl(you, { size: 38 })), el('b', {}, me.name)); setBanner(c.firstChild, me.banner, me.color); themeCard(c, you.theme); const fx = effectEl(id); if (fx) c.append(fx); return c; };
  const effects = PROFILE_EFFECTS.filter(([id, , q]) => Bux.owns('effect', id) || (q && unlocked(q) && !(Bux.price('effect', id) > 0))).map(([id, name, quest]) =>
    item(mini(id), name, how('effect', id, quest), me.effect === id, toggle(me.effect === id, { effect: '' }, { effect: id }, `${name} is on your profile.`)));
  const frames = FRAMES.filter(([id]) => Bux.owns('frame', id)).map(([id, name]) => el('div', { className: 'shp-fr' + (me.frame === id ? ' on' : '') },
    el('div', { className: 'shp-fr-pv' }, withFrame(el('div', { className: 'shp-skel' }, el('div', { className: 'shp-skel-b' }), el('div', { className: 'shp-skel-av' }), el('i', { className: 'l1' }), el('i', { className: 'l2' }), el('i', { className: 'l3' })), id)),
    el('div', { className: 'shp-fr-meta' }, el('b', {}, name), el('small', {}, how('frame', id))), toggle(me.frame === id, { frame: '' }, { frame: id }, `${name} is around your profile now.`)));
  const plates = NAMEPLATES.filter(([id]) => Bux.owns('plate', id)).map(([id, name]) => {
    const v = 'np:' + id, row = el('div', { className: 'mem shp-plate plated' }, avatarEl(you, { size: 30 }), el('div', { className: 'who' }, el('div', { className: 'nm' }, me.name)));
    row.style.setProperty('--plate', paint(v)); plateMove(row, v);
    return item(row, name, how('plate', id), me.plate === v, toggle(me.plate === v, { plate: '' }, { plate: v }, `${name} is behind your name now.`));
  });
  const goHome = (page) => { view = 'home'; dmId = null; homePage = page; renderAll(); };
  const sec = (title, sub, list, cls = '') => (list.length ? [el('h2', { className: 'shp-h' }, title), el('p', { className: 'shp-sub' }, sub), el('div', { className: 'shp-grid ' + cls }, ...list)] : []);
  const n = decos.length + fonts.length + effects.length + frames.length + plates.length;
  // (your badges, newest first, with the day each came; click one for how you got it)
  const badgeSub = el('p', { className: 'shp-sub' }, 'Loading your badges…'), badgeGrid = el('div', { className: 'shp-grid col-badges' });
  const fillBadges = (stats) => {
    if (!stats) return;
    const log = (Store.extrasNow(myXid()) || {}).badgeLog || {};
    const rows = badgesOf(stats, { all: true }).have.map((b) => ({ b, at: Date.parse(log[b.id] || '') || 0 })).sort((x, y) => y.at - x.at);
    badgeSub.textContent = rows.length ? `${plural(rows.length, 'badge')} you’ve earned, newest first. Click one to see how you got it.` : 'No badges yet: they come as you chat, react, make friends and more.';
    badgeGrid.replaceChildren(...rows.map(({ b, at }) => el('button', { className: 'shp-item col-badge', title: badgeTitle(b), onclick: () => badgesDialog(you, b.id) },
      el('div', { className: 'col-badge-ic' }, badgeIcon(b.id, 44)), el('div', { className: 'shp-meta' }, el('b', {}, b.name), el('small', {}, [b.rarity ? b.rarity[0] : '', at ? dateLong(at) : ''].filter(Boolean).join(' · '))))));
  };
  fillBadges(statsNow(you));
  statsOf(you).then(fillBadges, () => {});
  noteBadges().then(() => fillBadges(statsNow(you)), () => {});
  return el('div', { className: 'shp-page col-page' },
    el('div', { className: 'shp-hero col-hero' }, el('div', {}, el('h1', {}, labelOf('dmNav', 'collectionNav')),
      el('p', {}, n ? `Your badges, and ${plural(n, 'thing')} of yours from the Shop and from Quests. Put one on, take it off, or trade it with someone you know.` : 'Your badges are here. What you buy in the Shop, and rewards from Quests, end up here too.'),
      el('div', { className: 'shp-hero-acts' }, el('button', { className: 'btn', onclick: () => goHome('shop') }, icon('shop', 16), labelOf('dmNav', 'shopNav')),
        el('button', { className: 'btn', onclick: () => goHome('datbux') }, icon('coin', 16), labelOf('dmNav', 'datbuxNav')),
        buxLive() && Store.canBux() ? el('button', { className: 'btn', onclick: () => tradeDialog() }, icon('swap', 16), 'Trade') : null)),
      el('div', { className: 'shp-you' }, avatarEl(you, { size: 96 }))),
    el('h2', { className: 'shp-h' }, 'Badges'), badgeSub, badgeGrid,
    ...sec('Avatar Decorations', 'Around your avatar everywhere.', decos),
    ...sec('Name Fonts', 'Your name, in its own font.', fonts, 'wide'),
    ...sec('Profile Effects', 'Over your profile card.', effects, 'wide'),
    ...sec('Profile Frames', 'Around your profile card.', frames, 'frames'),
    ...sec('Nameplates', 'Behind your name in member lists and DMs.', plates, 'wide'),
    n ? null : el('div', { className: 'note-box' }, 'Earn Datbux with the tasks in ', el('b', {}, labelOf('dmNav', 'datbuxNav')), ', then buy something in the ', el('b', {}, labelOf('dmNav', 'shopNav')), '.'));
}

// ---------- a server's own pages (Discord's): Browse Channels, Game Servers, Server Guide, and its Events ----------
const pageHead = (ic, title, sub, ...acts) => el('div', { className: 'sp-head' }, el('div', { className: 'sp-ic' }, icon(ic, 26)),
  el('div', { className: 'grow' }, el('h1', {}, title), el('p', {}, sub)), ...acts);
// Browse Channels: which of the server's channels show in your list (in this browser)
function browsePage(sv) {
  const cats = Store.categories(sv.id), chans = Store.channels(sv.id), groups = cats.length ? cats : [{ id: null, name: 'Channels' }];
  const all = chans.every((c) => !chanHidden(sv.id, c.id)), out = [];
  out.push(el('div', { className: 'sp-all' }, row2('Show All Channels', 'Every channel you can see, in your list.', sw(all, (on) => { for (const c of chans) setChanHidden(sv.id, c.id, !on); renderAll(); }))));
  for (const cat of groups) {
    const mine = chans.filter((c) => (cat.id ? c.category === cat.id : true)); if (!mine.length) continue;
    out.push(el('h3', { className: 'sp-cat' }, cat.name));
    for (const c of mine) out.push(el('div', { className: 'sp-chan' + (chanHidden(sv.id, c.id) ? ' off' : '') }, icon(c.kind === 'voice' ? 'volume' : 'hash', 20),
      el('div', { className: 'sp-ct' }, el('b', {}, c.name), c.topic ? el('small', {}, plainText(c.topic, fmtCtx())) : null),
      el('span', { className: 'sp-state' }, chanHidden(sv.id, c.id) ? 'Hidden' : 'Shown'), sw(!chanHidden(sv.id, c.id), (on) => { setChanHidden(sv.id, c.id, !on); renderAll(); })));
  }
  return el('div', { className: 'sp-page' }, pageHead('browse', 'Browse Channels', 'Pick the channels you see in your list. A hidden channel still shows up when someone pings you there.'), ...out);
}
// Game Servers: where the server's people play (the address to copy; a Minecraft server says whether it's up)
const mcAsked = new Map();
function mcStatus(addr) {
  const seen = mcAsked.get(addr);
  if (seen && Date.now() - seen.at < 60000) return seen.p;
  const p = fetch('https://api.mcsrvstat.us/3/' + encodeURIComponent(addr), { referrerPolicy: 'no-referrer', credentials: 'omit' }).then((r) => r.json())
    .then((j) => ({ online: !!j.online, players: j.players ? [j.players.online, j.players.max] : null, version: String(j.version || '').slice(0, 40) })).catch(() => null);
  mcAsked.set(addr, { at: Date.now(), p });
  return p;
}
function gameServersPage(sv) {
  const list = sv.gameServers || [], can = Store.canManage(sv.id);
  const cards = list.map((g) => {
    const status = el('div', { className: 'gs-status' });
    const card = el('div', { className: 'gs-card' }, g.g ? gameTile(g.g) : gameTile({ n: g.n }),
      el('div', { className: 'gs-body' }, el('b', {}, g.n), g.g ? el('small', {}, g.g.n) : null,
        el('div', { className: 'gs-addr' }, el('code', {}, g.a), el('button', { className: 'btn small', onclick: () => copyText(g.a, 'Address copied. Paste it into the game.') }, icon('copy', 14), 'Copy')),
        g.d ? el('p', {}, g.d) : null, status));
    if (/minecraft/i.test(((g.g && g.g.n) || '') + ' ' + g.n)) {
      status.textContent = 'Checking…';
      mcStatus(g.a).then((st) => {
        if (!st) { status.textContent = 'Couldn’t check whether it’s up.'; return; }
        status.replaceChildren(el('i', { className: 'gs-dot' + (st.online ? ' on' : '') }), st.online ? `Online${st.players ? ` · ${st.players[0]}/${st.players[1]} playing` : ''}${st.version ? ` · ${st.version}` : ''}` : 'Offline');
      });
    }
    return card;
  });
  return el('div', { className: 'sp-page' }, pageHead('game', 'Game Servers', 'Where this server’s people play together. Copy an address and paste it into the game.',
    can ? el('button', { className: 'btn small', onclick: () => openServerSettings(sv.id, 'gameservers') }, icon('edit', 14), 'Manage') : null),
    list.length ? el('div', { className: 'gs-grid' }, ...cards) : el('div', { className: 'empty-note' }, can ? 'No game servers yet. Add the ones you play on with Manage.' : 'No game servers here yet.'));
}
// the Server Guide: a welcome, things to do first (ticked off in this browser), and resource pages
const GUIDE_DONE = 'fluentdat.guideDone';
const guideDone = (sv) => { try { return (JSON.parse(localStorage.getItem(GUIDE_DONE)) || {})[sv] || []; } catch { return []; } };
function markGuideDone(sv, i) { try { const all = JSON.parse(localStorage.getItem(GUIDE_DONE)) || {}; all[sv] = [...new Set([...(all[sv] || []), i])]; localStorage.setItem(GUIDE_DONE, JSON.stringify(all)); } catch {} }
// Rules (a server's own, written by its admins in Server Settings → Server Guide): numbered, one a line
function rulesPage(sv) {
  const rules = ((sv.guide || {}).rules || []).filter((r) => typeof r === 'string' && r.trim()), can = Store.canManage(sv.id);
  const edit = can ? el('button', { className: 'btn', onclick: () => openServerSettings(sv.id, 'guide') }, icon('edit', 16), rules.length ? 'Edit Rules' : 'Write the Rules') : null;
  return el('div', { className: 'sp-page' }, pageHead('rules', labelOf('serverTop', 'rules'), `What everyone in ${sv.name} agrees to.`, edit),
    rules.length ? el('ol', { className: 'rules-list' }, ...rules.map((r, i) => el('li', {}, el('span', { className: 'rl-n' }, String(i + 1)), el('span', { className: 'rl-t' }, r))))
      : el('div', { className: 'note-box' }, can ? 'No rules yet. Write them in Server Settings → Server Guide (up to 25, one a line).' : 'This server hasn’t written its rules yet.'));
}
function guidePage(sv) {
  const g = sv.guide || {}, can = Store.canManage(sv.id), done = guideDone(sv.id);
  const hero = el('div', { className: 'sgd-hero' }); setBanner(hero, sv.banner, '#5865f2');
  hero.append(el('div', { className: 'sgd-hero-in' }, serverFace(sv, 64), el('h1', {}, `Welcome to ${sv.name}`),
    g.welcome ? el('p', {}, g.welcome) : el('p', { className: 'sgd-quiet' }, can ? 'Write a welcome for new people with Edit Server Guide.' : 'Glad you’re here.')));
  const todos = (g.todos || []).map((t, i) => {
    const ch = t.c ? Store.channel(t.c) : null, ticked = done.includes(i);
    return el('button', { className: 'sgd-todo' + (ticked ? ' done' : ''), onclick: () => { markGuideDone(sv.id, i); if (ch) openChannel(ch); else renderAll(); } },
      el('span', { className: 'sgd-check' }, ticked ? icon('check', 14) : null), el('span', { className: 'grow' }, t.t),
      ch ? el('span', { className: 'sgd-ch' }, icon(ch.kind === 'voice' ? 'volume' : 'hash', 14), ch.name) : null, icon('chevR', 16));
  });
  const res = (g.res || []).map((r) => el('button', { className: 'sgd-res', onclick: () => {
    const t = el('div', { className: 'text sgd-res-text' }); t.innerHTML = richText(r.b || '', fmtCtx());
    const m = modal({ title: r.t, cls: 'sgd-res-dlg', body: [t], actions: [el('button', { className: 'btn primary', onclick: () => m.close() }, 'Close')] });
  } }, icon('book', 22), el('b', {}, r.t), el('span', {}, plainText(r.b || '', fmtCtx()).slice(0, 110))));
  return el('div', { className: 'sp-page sgd-page' }, hero,
    can ? el('div', { className: 'sgd-edit' }, el('button', { className: 'btn small', onclick: () => openServerSettings(sv.id, 'guide') }, icon('edit', 14), 'Edit Server Guide')) : null,
    todos.length ? el('h2', {}, 'Get Started') : null, todos.length ? el('div', { className: 'sgd-todos' }, ...todos) : null,
    res.length ? el('h2', {}, 'Resources') : null, res.length ? el('div', { className: 'sgd-res-grid' }, ...res) : null,
    !todos.length && !res.length && can ? el('div', { className: 'empty-note' }, 'Add things to do first, and resource pages, with Edit Server Guide.') : null);
}
// Events (Discord's): what's coming up and happening now, who's interested, and making one
const pad2 = (n) => String(n).padStart(2, '0');
function eventWhen(ts) {
  const d = new Date(ts), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), day = Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  return day === 0 ? `Today at ${t}` : day === 1 ? `Tomorrow at ${t}` : day > 1 && day < 7 ? `${d.toLocaleDateString([], { weekday: 'long' })} at ${t}` : `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${t}`;
}
function eventsDialog(sv) {
  const can = Store.canMakeEvents(sv), list = el('div', { className: 'ev-list' }), count = el('span', { className: 'ev-count' });
  const draw = () => {
    const evs = Store.events(sv);
    count.textContent = evs.length ? plural(evs.length, 'Event') : '';
    list.replaceChildren(...(evs.length ? evs.map((e) => eventCard(e, () => m.close())) : [el('div', { className: 'ev-empty' }, el('div', { className: 'fp-empty-ic' }, icon('calendar', 34)),
      el('b', {}, 'No upcoming events'), el('span', {}, can ? 'Make one so people know when to show up.' : 'When there are some, they show up here.'))]));
  };
  const off = Store.onChange(() => { if (list.isConnected) draw(); });
  const m = modal({ title: 'Events', cls: 'ev-dlg', body: [el('div', { className: 'ev-top' }, count, el('span', { style: 'flex:1' }),
    can ? el('button', { className: 'btn primary small', onclick: () => eventEditor(sv, null) }, icon('plus', 14), 'Create Event') : null), list], actions: [], onClose: () => off() });
  draw();
}
function eventCard(e, closeList) {
  const now = Date.now(), live = e.start <= now && (e.end ? e.end > now : now - e.start < 3 * 3600e3), ch = e.channel ? Store.channel(e.channel) : null;
  const names = e.who.map((id) => (id === Store.myId() ? 'You' : person(id).name));
  const interested = el('button', { className: 'btn small' + (e.me ? ' green' : ''), title: e.me ? 'You’re interested (click to take it back)' : 'Say you’re interested',
    onclick: async () => { if ((await attempt(() => Store.setInterested(e.id, !e.me))) !== null && !e.me) questTick('event'); } }, icon(e.me ? 'check' : 'bell', 14), 'Interested');
  const more = e.mine || Store.canManage(e.server) ? el('button', { className: 'btn small ghost ev-more', title: 'More', onclick: (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    menu([{ label: 'Edit Event', icon: 'edit', action: () => eventEditor(e.server, e) },
      { label: 'Cancel Event', icon: 'trash', danger: true, action: async () => { if (await confirmBox({ title: 'Cancel Event', text: `Cancel “${e.title}”? Everyone who was interested will see it’s gone.`, ok: 'Cancel Event', danger: true })) attempt(() => Store.removeEvent(e.id)); } }],
      r.right - 190, r.bottom + 4);
  } }, icon('more', 16)) : null;
  return el('div', { className: 'ev-card' + (live ? ' live' : '') },
    el('div', { className: 'ev-when' }, icon('calendar', 14), live ? 'Happening now' : eventWhen(e.start), e.end ? el('span', { className: 'ev-till' }, ` – ${new Date(e.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`) : null),
    el('h3', {}, e.title), e.description ? el('p', {}, e.description) : null,
    ch || e.place ? el('div', { className: 'ev-where' }, icon(ch ? (ch.kind === 'voice' ? 'volume' : 'hash') : 'pin', 15), ch ? ch.name : e.place) : null,
    el('div', { className: 'ev-foot' }, el('span', { className: 'ev-n', title: names.join(', ') || 'Nobody yet' }, icon('users', 14), `${e.interested} ${e.interested === 1 ? 'person' : 'people'} interested`),
      el('span', { style: 'flex:1' }),
      live && ch && ch.kind === 'voice' ? el('button', { className: 'btn small primary', onclick: () => { closeList(); view = 'server'; serverId = e.server; openChannel(ch); } }, icon('volume', 14), 'Join') : null,
      interested, more));
}
function eventEditor(sv, e) {
  const voice = Store.channels(sv).filter((c) => c.kind === 'voice');
  const start = new Date(e ? e.start : Date.now() + 3600e3); if (!e) start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  const title = el('input', { type: 'text', maxLength: 100, value: e ? e.title : '', placeholder: 'What’s happening?' });
  const desc = el('textarea', { maxLength: 1000, rows: 3, value: e ? e.description : '', placeholder: 'Tell people a little more (optional)' });
  const date = el('input', { type: 'date', value: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}` });
  const time = el('input', { type: 'time', value: `${pad2(start.getHours())}:${pad2(start.getMinutes())}` });
  const hours = e && e.end ? String(Math.max(1, Math.round((e.end - e.start) / 3600e3))) : '2';
  const dur = sel(['1', '2', '3', '4', '6', '12', '24'].includes(hours) ? hours : '2', [['0', 'No end time'], ['1', '1 hour'], ['2', '2 hours'], ['3', '3 hours'], ['4', '4 hours'], ['6', '6 hours'], ['12', '12 hours'], ['24', 'A whole day']], () => {});
  let where = e ? (e.channel ? 'voice' : 'else') : voice.length ? 'voice' : 'else';
  const chSel = voice.length ? sel(e && e.channel ? e.channel : voice[0].id, voice.map((c) => [c.id, c.name]), () => {}) : null;
  const place = el('input', { type: 'text', maxLength: 100, value: e ? e.place : '', placeholder: 'Where? (a place, or a link)' });
  const opt = (v, label) => el('label', { className: 'ev-opt' }, (() => { const r = el('input', { type: 'radio', name: 'ev-where', checked: where === v }); r.onchange = () => { where = v; paint(); }; return r; })(), el('span', {}, label));
  const whereBox = el('div', {});
  const paint = () => whereBox.replaceChildren(el('div', { className: 'ev-opts' }, voice.length ? opt('voice', 'A voice channel') : null, opt('else', 'Somewhere else')), where === 'voice' && chSel ? chSel : place);
  paint();
  const err = el('div', { className: 'sg-msg' }), save = el('button', { className: 'btn primary' }, e ? 'Save Event' : 'Create Event');
  const m = modal({ title: e ? 'Edit Event' : 'Create Event', cls: 'ev-edit', body: [
    el('div', { className: 'field' }, el('label', {}, 'Event Topic'), title),
    el('div', { className: 'field ev-row' }, el('div', {}, el('label', {}, 'Start Date'), date), el('div', {}, el('label', {}, 'Start Time'), time), el('div', {}, el('label', {}, 'How Long'), dur)),
    el('div', { className: 'field' }, el('label', {}, 'Where'), whereBox),
    el('div', { className: 'field' }, el('label', {}, 'Description'), desc), err],
    actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), save] });
  save.onclick = async () => {
    const t = title.value.trim(); if (!t) { err.textContent = 'Give the event a topic.'; title.focus(); return; }
    const at = new Date(`${date.value}T${time.value || '00:00'}`).getTime();
    if (!Number.isFinite(at)) { err.textContent = 'Pick when it starts.'; return; }
    if (at < Date.now() - 864e5) { err.textContent = 'That’s in the past.'; return; }
    const h = Number(dur.value), ev = { title: t, description: desc.value.trim(), start: at, end: h ? at + h * 3600e3 : 0, channel: where === 'voice' && chSel ? chSel.value : null, place: where === 'voice' ? '' : place.value.trim() };
    save.disabled = true;
    const ok = await attempt(() => (e ? Store.updateEvent(e.id, ev) : Store.addEvent(sv, ev)));
    save.disabled = false;
    if (ok === null) return;
    m.close(); toast(e ? 'Event saved.' : 'Event created. People can say they’re interested.'); if (!e) questTick('event'); renderAll();
  };
  setTimeout(() => title.focus(), 0);
}
// Server Settings → Server Sidebar: which extras show above the channels, for everyone
function svSidebar(sv, redraw) {
  const f = { ...FEATURES, ...(sv.features || {}) }, live = Store.kind === 'supabase', newer = !live || Store.canSync();       // (Boost, Shop and Rules need setup.sql 10)
  const set = (k, v) => { Store.updateServer(sv.id, { features: { ...f, [k]: v } }); renderAll(); setTimeout(redraw, 150); };
  const item = (k, title, desc) => row2(title, desc, sw(!!f[k], (on) => set(k, on)));
  return [el('h2', {}, 'Server Sidebar'), el('p', { className: 'sub' }, 'What shows above the channels, for everyone in the server. Each person can still hide, move or rename these for themselves in Customize → Elements.'),
    item('browse', 'Browse Channels', 'People pick which channels show in their list.'),
    item('guide', 'Server Guide', 'A welcome, things to do first, and resource pages (write it in Server Guide).'),
    live ? item('events', 'Events', 'What’s coming up, and who’s interested.') : null,
    live ? item('member_events', 'Members can make events', 'Otherwise only admins can.') : null,
    ...(newer ? [live ? item('boost', 'Server Boost', 'Boosting the server (25 Datbux a day), and its levels.') : null,
      item('shop', 'Shop', 'Fluentdat’s Shop, without leaving the server.'),
      item('rules', 'Rules', 'The server’s rules, numbered (write them in Server Guide).')] : []),
    item('games', 'Game Servers', 'The game servers you play on, with addresses to copy (set them up in Game Servers).')];
}
// Server Settings → Server Guide: the welcome, up to 7 things to do first (each can point at a channel), up to 7 pages
function svGuide(sv, redraw, shut) {
  const g = sv.guide || {}, chans = Store.channels(sv.id), chanOpts = [['', 'No channel'], ...chans.map((c) => [c.id, (c.kind === 'voice' ? '🔊 ' : '# ') + c.name])];
  const welcome = el('textarea', { className: 'area', maxLength: 1000, rows: 4, value: g.welcome || '', placeholder: 'Say hello, and what this server is about.' });
  const todos = (g.todos || []).map((t) => ({ t: t.t, c: t.c && chans.some((c) => c.id === t.c) ? t.c : '' })), res = (g.res || []).map((r) => ({ t: r.t, b: r.b || '' }));
  const todoBox = el('div', { className: 'gd-list' }), resBox = el('div', { className: 'gd-list' }), rulesBox = el('div', { className: 'gd-list' });
  const rules = [...(g.rules || [])], canRules = Store.kind !== 'supabase' || Store.canSync();
  const input = (obj, key, attrs) => { const i = el(attrs.rows ? 'textarea' : 'input', { ...attrs, value: obj[key] || '' }); i.oninput = () => { obj[key] = i.value; }; return i; };
  const drawTodos = () => todoBox.replaceChildren(...todos.map((t, i) => el('div', { className: 'gd-row' }, input(t, 't', { type: 'text', className: 'wide-in', maxLength: 100, placeholder: 'Something to do first, like “Read the rules”' }),
    sel(t.c, chanOpts, (v) => { t.c = v; }), iconBtn('x', 'Remove', () => { todos.splice(i, 1); drawTodos(); }, 'del'))),
    todos.length < 7 ? el('button', { className: 'btn small', onclick: () => { todos.push({ t: '', c: '' }); drawTodos(); } }, icon('plus', 14), 'Add a To-Do') : null);
  const drawRes = () => resBox.replaceChildren(...res.map((r, i) => el('div', { className: 'gd-res' }, el('div', { className: 'gd-row' }, input(r, 't', { type: 'text', className: 'wide-in', maxLength: 60, placeholder: 'Page title' }),
    iconBtn('x', 'Remove', () => { res.splice(i, 1); drawRes(); }, 'del')), input(r, 'b', { className: 'area', maxLength: 1500, rows: 3, placeholder: 'What it says (Discord formatting works)' }))),
    res.length < 7 ? el('button', { className: 'btn small', onclick: () => { res.push({ t: '', b: '' }); drawRes(); } }, icon('plus', 14), 'Add a Resource Page') : null);
  // (the rules: up to 25 lines, in order)
  const drawRules = () => rulesBox.replaceChildren(...rules.map((r, i) => {
    const inp = el('input', { type: 'text', className: 'wide-in', maxLength: 300, value: r, placeholder: 'A rule, like “Be kind to each other”' });
    inp.oninput = () => { rules[i] = inp.value.replace(/[\r\n]+/g, ' '); };
    return el('div', { className: 'gd-row' }, el('span', { className: 'rl-n' }, String(i + 1)), inp,
      iconBtn('up', 'Move up', () => { if (i) { [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]]; drawRules(); } }),
      iconBtn('x', 'Remove', () => { rules.splice(i, 1); drawRules(); }, 'del'));
  }), rules.length < 25 ? el('button', { className: 'btn small', onclick: () => { rules.push(''); drawRules(); } }, icon('plus', 14), 'Add a Rule') : null);
  drawTodos(); drawRes(); drawRules();
  const save = () => {
    const guide = { welcome: welcome.value.trim().slice(0, 1000), todos: todos.filter((t) => t.t.trim()).map((t) => ({ t: t.t.trim().slice(0, 100), ...(t.c ? { c: t.c } : {}) })),
      res: res.filter((r) => r.t.trim()).map((r) => ({ t: r.t.trim().slice(0, 60), b: r.b.trim().slice(0, 1500) })),
      ...(canRules ? { rules: rules.map((r) => r.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 300)).filter(Boolean).slice(0, 25) } : {}) };
    const turnOn = !featureOn(sv, 'guide') && (guide.welcome || guide.todos.length || guide.res.length);
    Store.updateServer(sv.id, { guide, ...(turnOn ? { features: { ...FEATURES, ...(sv.features || {}), guide: true } } : {}) });
    renderAll(); toast(turnOn ? 'Server Guide saved, and switched on in the sidebar.' : 'Server Guide saved.'); setTimeout(redraw, 150);
  };
  return [el('h2', {}, 'Server Guide'), el('p', { className: 'sub' }, 'What new people see first: a welcome, things to do, and pages to read. It shows in the sidebar when Server Guide is on (Server Sidebar).'),
    el('h3', {}, 'Welcome Message'), welcome, el('h3', {}, 'New Member To-Dos'), todoBox, el('h3', {}, 'Resource Pages'), resBox,
    el('h3', {}, 'Rules'), canRules ? rulesBox : el('div', { className: 'note-box' }, 'Rules need the newest supabase/setup.sql: run it again in Supabase.'),
    el('div', { className: 'row', style: 'justify-content:flex-start;margin-top:18px' }, el('button', { className: 'btn primary', onclick: save }, 'Save Changes'),
      el('button', { className: 'btn', onclick: () => { if (shut) shut(); serverPage = { sv: sv.id, id: 'guide' }; view = 'server'; serverId = sv.id; renderAll(); } }, 'See It'))];
}
// Server Settings → Game Servers: up to 12 (a name, an address, the game, a note)
function svGameServers(sv, redraw) {
  const list = (sv.gameServers || []).map((g) => ({ ...g })), box = el('div', { className: 'gd-list' });
  const input = (obj, key, attrs) => { const i = el('input', { type: 'text', ...attrs, value: obj[key] || '' }); i.oninput = () => { obj[key] = i.value; }; return i; };
  const draw = () => box.replaceChildren(...list.map((g, i) => el('div', { className: 'gd-gs' },
    el('button', { className: 'gd-game', title: 'Pick the game', onclick: async () => { const [x] = await pickGames({ title: 'Which game?', max: 1 }); if (x) { g.g = { n: x.n, ...(x.s ? { s: x.s } : x.l ? { l: x.l } : {}) }; draw(); } } },
      g.g ? gameTile(g.g) : el('span', { className: 'gt gc-add-t' }, icon('game', 22)), el('small', {}, g.g ? g.g.n : 'Pick a game')),
    el('div', { className: 'gd-gs-f' }, input(g, 'n', { className: 'wide-in', maxLength: 60, placeholder: 'Name, like “Our Minecraft”' }),
      input(g, 'a', { className: 'wide-in', maxLength: 126, placeholder: 'Address, like mc.example.org:25565', spellcheck: false }),
      input(g, 'd', { className: 'wide-in', maxLength: 200, placeholder: 'A note (optional): whitelist, mods, when you play…' })),
    iconBtn('x', 'Remove', () => { list.splice(i, 1); draw(); }, 'del'))),
    list.length < 12 ? el('button', { className: 'btn small', onclick: () => { list.push({ n: '', a: '' }); draw(); } }, icon('plus', 14), 'Add a Game Server') : null);
  draw();
  const save = () => {
    const out = [];
    for (const g of list) {
      const n = String(g.n || '').trim(), a = String(g.a || '').trim().replace(/^[a-z]+:\/\//i, '');
      if (!n && !a) continue;
      if (!n) return toast('Give every game server a name.');
      if (!/^[A-Za-z0-9.-]{1,120}(:[0-9]{1,5})?$/.test(a)) return toast(`“${n}” needs an address like mc.example.org or 203.0.113.7:25565.`);
      out.push({ n: n.slice(0, 60), a, ...(g.g ? { g: g.g } : {}), ...(String(g.d || '').trim() ? { d: String(g.d).trim().slice(0, 200) } : {}) });
    }
    const turnOn = out.length && !featureOn(sv, 'games');
    Store.updateServer(sv.id, { gameServers: out, ...(turnOn ? { features: { ...FEATURES, ...(sv.features || {}), games: true } } : {}) });
    renderAll(); toast(turnOn ? 'Game servers saved, and switched on in the sidebar.' : 'Game servers saved.'); setTimeout(redraw, 150);
  };
  return [el('h2', {}, 'Game Servers'), el('p', { className: 'sub' }, 'The game servers your people play on. Everyone sees them under Game Servers in the sidebar, with the address to copy; Minecraft servers also say whether they’re up.'),
    box, el('div', { className: 'row', style: 'justify-content:flex-start;margin-top:18px' }, el('button', { className: 'btn primary', onclick: save }, 'Save Changes'))];
}

// ---------- threads (Discord's): a conversation of its own under a text channel, maybe started from one of its messages ----------
const canThread = () => Store.kind === 'supabase' && view === 'server' && (Store.channel(channelId) || {}).kind === 'text' && mayIn('send');
const threadOf = (id) => (view === 'server' ? Store.threads(channelId).find((t) => t.starter === id) : null) || null;
async function threadFlow(m) {
  const t = threadOf(m.id); if (t) return openChannel(t);
  const name = await ask({ title: 'Create Thread', label: 'Thread Name', value: plainText(m.text || '', fmtCtx()).replace(/\s+/g, ' ').slice(0, 40) || 'New Thread', ok: 'Create Thread', max: 60 });
  if (!name) return;
  const id = await attempt(() => Store.createThread(channelId, m.id, name)); if (!id) return;
  const nt = Store.channel(id); if (nt) openChannel(nt);
}
async function newThread(parent) {
  const name = await ask({ title: 'Create Thread', label: 'Thread Name', placeholder: 'What’s it about?', ok: 'Create Thread', max: 60 }); if (!name) return;
  const id = await attempt(() => Store.createThread(parent, null, name)); if (!id) return;
  const nt = Store.channel(id); if (nt) openChannel(nt);
}
const canEditThread = (t) => Store.canManage(t.server) || t.by === Store.myId() || Store.can(t.id, 'manage_channels');
function threadCtx(t, x, y) {
  const can = canEditThread(t);
  menu([markReadItem([t.id]), { label: 'Open Thread', icon: 'thread', action: () => openChannel(t) },
    '-', muteItem(t.id, 'Thread'), notifyItem(t.id, false, 'Channel'),
    can && '-', can && { label: 'Rename Thread', icon: 'edit', action: async () => { const n = await ask({ title: 'Rename Thread', label: 'Thread Name', value: t.name, max: 60 }); if (n) attempt(() => Store.editThread(t.id, { name: n })); } },
    can && { label: t.archived ? 'Unarchive Thread' : 'Archive Thread', icon: 'folder', action: () => attempt(() => Store.editThread(t.id, { archived: !t.archived })) },
    can && { label: 'Delete Thread', icon: 'trash', danger: true, action: async () => {
      if (!(await confirmBox({ title: 'Delete Thread', text: `Delete “${t.name}” and its messages? This can’t be undone.`, ok: 'Delete Thread', danger: true }))) return;
      const up = Store.channel(t.parent); Store.removeChannel(t.id); if (channelId === t.id && up) openChannel(up); else renderAll();
    } },
    '-', { label: 'Copy Link', icon: 'link', action: () => copyText(`${location.origin}${location.pathname}#channel=${t.id}`, 'Link copied.') },
    { label: 'Copy Thread ID', icon: 'id', action: () => copyText(t.id, 'Thread ID copied.') }], x, y);
}
// the Threads button: this channel's threads (active, then archived), and starting one
function showThreads(anchor) {
  if (pop && pop.classList.contains('thr')) { closePop(); return renderTop(); }
  closePop();
  const here = Store.channel(channelId), parent = here && here.kind === 'thread' ? Store.channel(here.parent) : here; if (!parent) return;
  const all = Store.threads(parent.id), last = (t) => Math.max((Store.threadInfo(t.id) || {}).last || 0, Store.unread(t.id).last || 0);
  const row = (t) => { const info = Store.threadInfo(t.id); return el('div', { className: 'bm-row', role: 'button', tabIndex: 0, onclick: () => { closePop(); openChannel(t); },
    oncontextmenu: (e) => { e.preventDefault(); threadCtx(t, e.clientX, e.clientY); } }, el('span', { className: 'thr-ic' }, icon('thread', 18)),
    el('div', { className: 'bm-body' }, el('div', { className: 'bm-head' }, el('b', {}, t.name)),
      el('div', { className: 'bm-text' }, [info ? plural(info.count, 'message') : '', last(t) ? 'last ' + when(last(t), true).toLowerCase() : '', t.by ? 'by ' + person(t.by).name : ''].filter(Boolean).join(' · ')))); };
  const active = all.filter((t) => !t.archived).sort((a, b) => last(b) - last(a)), old = all.filter((t) => t.archived);
  const list = el('div', { className: 'bm-list' }, ...(all.length ? [active.length ? el('div', { className: 'thr-h' }, 'Active Threads') : null, ...active.map(row),
    old.length ? el('div', { className: 'thr-h' }, 'Archived') : null, ...old.map(row)].filter(Boolean)
    : [el('div', { className: 'bm-empty' }, el('div', { className: 'bm-empty-ic' }, icon('thread', 30)), el('b', {}, 'No threads yet'), el('span', {}, 'Start one from a message (hover it, or right-click), or here.'))]));
  pop = el('div', { className: 'pop bm thr' }, el('div', { className: 'bm-title' }, icon('thread', 18), el('b', {}, 'Threads'), el('small', {}, '#' + parent.name),
    mayIn('send', parent.id) ? el('button', { className: 'btn small primary thr-new', onclick: () => { closePop(); newThread(parent.id); } }, 'Create') : null), list);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(12, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 12)) + 'px'; pop.style.top = r.bottom + 8 + 'px';
  Store.threadsInfo(parent.id); renderTop();
}
// the Pinned Messages button: the place's pins, newest first (click one to go to it)
async function showPins(anchor) {
  if (pop && pop.classList.contains('pins')) { closePop(); return renderTop(); }
  closePop();
  const place = placeNow(), dm = view === 'home', list = el('div', { className: 'bm-list' }, el('div', { className: 'bm-empty' }, 'Loading…'));
  const box = el('div', { className: 'pop bm pins' }, el('div', { className: 'bm-title' }, icon('pin', 18), el('b', {}, 'Pinned Messages')), list);
  pop = box; document.body.append(box);
  const r = anchor.getBoundingClientRect();
  box.style.left = Math.max(12, Math.min(r.right - box.offsetWidth, innerWidth - box.offsetWidth - 12)) + 'px'; box.style.top = r.bottom + 8 + 'px';
  renderTop();
  const draw = async () => {
    const msgs = await Store.pinnedMessages(place).catch(() => []), can = Store.canPin(place);
    if (!box.isConnected) return;
    list.replaceChildren(...(msgs.length ? msgs.map((m) => el('div', { className: 'bm-row', role: 'button', tabIndex: 0, onclick: () => { closePop(); goToMessage({ dm, place, id: m.id }); } },
      avatarEl(m.user, { size: 32 }),
      el('div', { className: 'bm-body' }, el('div', { className: 'bm-head' }, el('b', {}, nameIn(m.user)), el('time', {}, when(m.ts, true))),
        el('div', { className: 'bm-text' }, plainText(m.text || '', fmtCtx()) || ((m.files || []).length ? (m.files[0].name || 'An attachment') : '(a sticker)'))),
      can ? el('button', { className: 'bm-x', title: 'Unpin', onclick: async (e) => { e.stopPropagation(); if ((await attempt(() => Store.pin(place, m.id, false))) !== null) { draw(); renderContent(); } } }, icon('x', 14)) : null))
      : [el('div', { className: 'bm-empty' }, el('div', { className: 'bm-empty-ic' }, icon('pin', 30)), el('b', {}, 'No pinned messages yet'),
        el('span', {}, can ? 'Right-click a message (or its ⋯) and pick Pin Message to keep it here.' : 'When someone pins a message, it shows up here.'))]));
  };
  draw();
}

// ---------- server tags beside names ----------
function tagFor(u) { return u && u.tag && u.tag.text ? u.tag : null; }
// the card that opens from someone's tag: its server, and wearing the tag yourself
let tagCardEl = null;
function closeTagCard() { if (tagCardEl) { tagCardEl.remove(); tagCardEl = null; } }
async function showTagCard(tag, anchor) {
  closeTagCard();
  const box = el('div', { className: 'pop tagcard' }, el('div', { className: 'tc-load' }, 'Loading…'));
  tagCardEl = box; document.body.append(box);
  const place = () => { const r = anchor.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight; box.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px'; box.style.top = (r.bottom + 6 + h < innerHeight ? r.bottom + 6 : Math.max(12, r.top - h - 6)) + 'px'; };
  place();
  let info = null; try { info = await Store.tagInfo(tag.server); } catch {}
  if (tagCardEl !== box) return;
  const mine = (Store.myProfile && (Store.myProfile().tag || {}).server) === tag.server;
  const chip = tagChip(tag); chip.classList.add('big');
  box.replaceChildren(
    el('div', { className: 'tc-head' }, info ? serverFace(info, 44) : el('div', { className: 'sv-face', style: 'width:44px;height:44px' }, icon('tag', 22)),
      el('div', { className: 'tc-who' }, el('b', {}, info ? info.name : 'A server'), el('small', {}, info ? plural(info.members, 'Member') : 'This tag’s server is private'))),
    el('div', { className: 'tc-tag' }, chip),
    info && info.joined ? (mine ? el('button', { className: 'btn wide', onclick: async () => { if ((await attempt(() => Store.adoptTag(null))) !== null) { toast('Tag taken off.'); closeTagCard(); renderAll(); } } }, 'Take Off This Tag')
      : el('button', { className: 'btn primary wide', onclick: async () => { if ((await attempt(() => Store.adoptTag(tag.server))) !== null) { toast(`You’re wearing ${tag.text}.`); closeTagCard(); renderAll(); } } }, icon('tag', 16), 'Adopt Tag'))
      : info && info.public ? el('button', { className: 'btn primary wide', onclick: async () => { closeTagCard(); const ok = await attempt(() => Store.joinPublic(info.id)); if (ok !== null) go(info.id); } }, 'Join Server')
      : el('div', { className: 'tc-note' }, 'You need an invite to join this server.'));
  place();
}
document.addEventListener('mousedown', (e) => { if (tagCardEl && !tagCardEl.contains(e.target) && !(e.target.closest && e.target.closest('.stag'))) closeTagCard(); }, true);
const tagChipFor = (u) => { const t = tagFor(u); return t ? tagChip(t, (e) => showTagCard(t, e.currentTarget)) : null; };

// ---------- profile themes and display name styles ----------
const hexOk = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '');
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// a profile's own colours: its card fades from the first to the second, as on Discord
// (with a colour: a profile card, whose buttons take that colour when it has no theme of its own)
function themeCard(node, theme, color) {
  if (color !== undefined) { const c = safeColor(color, '#5865f2'); node.classList.add('pcard'); node.style.setProperty('--pc-accent', c); node.style.setProperty('--pc-ink', lum(c) > 0.6 ? '#111' : '#fff'); }
  const t1 = theme ? hexOk(theme[0]) : '', t2 = theme ? hexOk(theme[1]) : '';
  node.classList.toggle('themed', !!(t1 || t2));
  if (!(t1 || t2)) { node.style.removeProperty('--t1'); node.style.removeProperty('--t2'); node.classList.remove('themed-light'); return node; }
  const a = t1 || t2, b = t2 || t1;
  node.style.setProperty('--t1', a); node.style.setProperty('--t2', b);
  node.classList.toggle('themed-light', (lum(a) + lum(b)) / 2 > 0.6);
  return node;
}
// someone's name with their style (in a server, a role's colour wins over the style's colours, but the font stays)
function styledName(node, u, { roleColored = false } = {}) {
  return styleName(node, u && u.style, { colors: !roleColored, fallback: safeColor(u && u.color, '#ffffff') });
}

// a video or voice message keeps playing (and a link's card stays put) while new messages arrive around it.
function fillMessages(wrap, msgs, place, start) {
  const keep = wrap._nodes || new Map(), next = new Map(), order = [];
  const put = (key, make) => { let n = keep.get(key), made = false; if (!n) { n = make(); made = true; } next.set(key, n); order.push(n); return [n, made]; };
  const ctx = fmtCtx(), style = [prefs.timestamps, prefs.group, prefs.embeds, prefs.avatars, ordered('msgActions').filter(shown).join('.'), JSON.stringify(prefs.labels || {})].join();
  const first = !wrap._seen; if (first) wrap._seen = new Set();
  const reacts = Store.reactions ? Store.reactions(place) : new Map(), reactable = mayIn('react');
  if (start) put('start:' + start.key, start.make);
  if (!Store.loaded(place) && !msgs.length) put('loading', skeleton);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    msgs = msgs.filter((m) => !m.call && ((m.text || '').toLowerCase().includes(q) || String(m.user.name || '').toLowerCase().includes(q) || (m.files || []).some((f) => String(f.name || '').toLowerCase().includes(q))));
    put('search:' + searchQ + ':' + msgs.length, () => el('div', { className: 'search-note' }, `${msgs.length} result${msgs.length === 1 ? '' : 's'} for “${searchQ}”`));
  }
  const all = view === 'home' ? Store.dm(dmId) : Store.messages(channelId);
  let last = null, lastDay = null, newShown = false, tucked = [];
  // (messages from people you've blocked or ignore, one after another, fold into one line you can open)
  const fold = () => {
    if (!tucked.length) return;
    const run = tucked; tucked = [];
    const blocked = run.some((m) => Store.blocked(m.user.id)), n = run.length;
    put('hidden:' + run[0].id + ':' + n + ':' + blocked, () => el('div', { className: 'msg hidden-run' },
      el('span', { className: 'hr-ic' }, icon(blocked ? 'userX' : 'eyeOff', 16)),
      el('div', { className: 'body' }, el('span', {}, `${n} ${blocked ? 'blocked' : 'ignored'} message${n === 1 ? '' : 's'} — `),
        el('button', { className: 'link-btn', onclick: () => { for (const m of run) revealed.add(m.id); renderContent(); } }, `Show message${n === 1 ? '' : 's'}`))));
    last = null;
  };
  for (const m of msgs) {
    if (!lastDay || !sameDay(lastDay, m.ts)) { fold(); const day = new Date(m.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); put('day:' + day, () => el('div', { className: 'day' }, el('span', {}, day))); lastDay = m.ts; last = null; }
    if (!newShown && newLine.place === place && newLine.at && m.ts > newLine.at && !m.mine && !m.call) { fold(); newShown = true; put('new:' + m.id, () => el('div', { className: 'newline' }, el('span', {}, 'NEW'))); last = null; }
    if (m.call) { fold(); put('call:' + m.id + ':' + (m.call.ended || 0) + ':' + !!(call && call.callId === m.call.id), () => callNode(m)); last = null; continue; }
    if (hiddenAuthor(m.user) && !revealed.has(m.id)) { tucked.push(m); continue; }
    fold();
    const cont = prefs.group && last && !last.call && !m.reply && last.user.name === m.user.name && !last.user.bot === !m.user.bot && last.user.via === m.user.via && (m.ts - last.ts) < 7 * 60000;
    const to = m.reply ? all.find((x) => x.id === m.reply) : null;
    const key = 'm:' + m.id + ':' + JSON.stringify([m.text, m.sticker && String(m.sticker.data || m.sticker.path || m.sticker).length, (m.files || []).map((f) => f.path || f.name), !!m.sending, cont, style,
      m.user.name, m.user.color, String(m.user.avatar || '').length, nameColor(m.user), to ? [to.user.name, to.text, !!to.files] : m.reply, m.forwarded, emojiIndex.size, bookmarked(m.id),
      m.user.style, m.user.tag, reactable, Store.pinned(place, m.id), view === 'server' && m.user.id ? Store.nickIn(serverId, m.user.id) : '',
      view === 'server' ? (threadOf(m.id) || {}).name : '', view === 'server' ? (Store.threadInfo((threadOf(m.id) || {}).id) || {}).count : 0,
      view === 'server' && m.user.id ? (Store.memberIcon(serverId, m.user.id) || {}).icon : '']);
    const [node, made] = put(key, () => messageNode(m, cont, to, all, ctx));
    if (made && !first && !wrap._seen.has(m.id)) node.classList.add('arrive');
    wrap._seen.add(m.id);
    syncReacts(node, m, reacts.get(m.id) || [], !made);
    last = m;
  }
  fold();
  let i = 0;
  for (const n of order) { if (wrap.childNodes[i] !== n) wrap.insertBefore(n, wrap.childNodes[i] || null); i++; }
  while (wrap.childNodes.length > order.length) wrap.lastChild.remove();
  wrap._nodes = next;
}
const STICKER_PATH = /^[0-9a-f-]{36}\/sticker\/[0-9a-f-]{36}\.(png|gif|webp|jpg)$/;
function messageNode(m, cont, to, all, ctx) {
  const body = el('div', { className: 'body' }), full = new Date(m.ts).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  if (!cont) {
    const nm = el('span', { className: 'nm', onclick: (e) => showProfile(m.user, e.currentTarget) }, nameIn(m.user));
    nm.style.setProperty('--who', nameColor(m.user));
    styledName(nm, m.user, { roleColored: view === 'server' && !!(serverId && m.user.id && Store.memberColor(serverId, m.user.id)) });
    const ri = view === 'server' && serverId && m.user.id && !m.user.bot ? Store.memberIcon(serverId, m.user.id) : null;
    const meta = el('div', { className: 'meta' }, nm, roleIconEl(ri, 18)); if (m.user.bot) meta.append(el('span', { className: 'tag' }, 'bot'), m.user.via ? el('span', { className: 'when' }, 'for @' + m.user.via) : '');
    const tg = tagChipFor(m.user); if (tg) meta.append(tg);
    meta.append(el('span', { className: 'when', title: full }, when(m.ts, true)));
    if (Store.pinned(placeNow(), m.id)) meta.append(el('span', { className: 'pin-mark', title: 'Pinned' }, icon('pin', 12)));
    body.append(meta);
  }
  // (a forwarded message's own content sits in a box that says where it came from, as on Discord)
  const inner = m.forwarded ? el('div', { className: 'fwd-body' }) : body;
  if (m.text != null && m.text !== '') {
    const t = el('div', { className: 'text' + (m.action ? ' action' : '') + (!m.action && jumbo(m.text) ? ' jumbo' : '') });
    t.innerHTML = richText(m.action ? `${m.user.name} ${m.text}` : m.text, ctx);
    inner.append(t);
  }
  if (m.sticker) {
    const st = typeof m.sticker === 'string' ? { kind: 'emoji', data: m.sticker } : m.sticker;
    if (st.kind === 'img') { const src = safeImg(st.data); if (src) inner.append(el('div', { className: 'sticker' + (st.photo ? ' photo' : '') }, el('img', { src, alt: st.photo ? 'picture' : 'sticker', loading: 'lazy', onclick: st.photo ? () => lightbox({ name: 'picture' }, src) : null }))); }
    else if (st.kind === 'server') {
      const src = STICKER_PATH.test(st.path || '') ? safeImg(Store.expressionUrl(st.path)) : '';
      inner.append(src ? el('div', { className: 'sticker server', title: String(st.name || 'sticker').slice(0, 30) }, el('img', { src, alt: String(st.name || 'sticker').slice(0, 30), loading: 'lazy', draggable: false }))
        : el('div', { className: 'sticker gone' }, icon('sticker', 18), String(st.name || 'A sticker').slice(0, 30)));
    }
    else inner.append(el('div', { className: 'sticker' }, String(st.data || '').slice(0, 24)));
  }
  const files = attachmentsNode(m); if (files) inner.append(files);
  const links = embedsNode(m); if (links) inner.append(links);
  if (m.forwarded) {
    const f = m.forwarded, at = Number(f.at) || 0;
    body.append(el('div', { className: 'fwd' }, el('div', { className: 'fwd-head' }, icon('forward', 14), 'Forwarded'), inner,
      el('div', { className: 'fwd-foot' }, [String(f.from || '').slice(0, 100), at ? when(at, true) : ''].filter(Boolean).join(' · '))));
  }
  const av = avatarEl(m.user); av.onclick = (e) => showProfile(m.user, e.currentTarget);
  const reacting = !m.sending && mayIn('react');
  // (the buttons over a message you point at: the ones, in the order and with the names you chose in Customize)
  const toolOf = {
    quick: () => (reacting ? quickReacts(3).map((q) => el('button', { className: 'qr', title: 'React with ' + emojiLabel(q), onclick: (e) => { e.stopPropagation(); toggleReact(m, q, true); } }, emojiFace(q, 'qre'))) : []),
    react: () => (reacting ? [el('button', { title: labelOf('msgActions', 'react'), onclick: (e) => { e.stopPropagation(); reactPicker(m, e.currentTarget); } }, icon('smilePlus', 18))] : []),
    reply: () => (!m.sending && mayIn('send') ? [el('button', { title: labelOf('msgActions', 'reply'), onclick: (e) => { e.stopPropagation(); startReply(m); } }, icon('reply', 18))] : []),
    forward: () => (!m.sending && Store.kind === 'supabase' ? [el('button', { title: labelOf('msgActions', 'forward'), onclick: (e) => { e.stopPropagation(); forwardFlow(m); } }, icon('forward', 18))] : []),
    thread: () => (!m.sending && canThread() ? [el('button', { title: threadOf(m.id) ? 'Open Thread' : labelOf('msgActions', 'thread'), onclick: (e) => { e.stopPropagation(); threadFlow(m); } }, icon('thread', 18))] : []),
    more: () => [el('button', { title: labelOf('msgActions', 'more'), onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); messageCtx(m, r.left - 200, r.bottom + 4); } }, icon('more', 18))],
  };
  const tools = el('div', { className: 'msg-tools' }, ...ordered('msgActions').filter((id) => id === 'more' || shown(id)).flatMap((id) => toolOf[id]()));
  const node = el('div', { className: 'msg' + (cont ? ' cont' : '') + (pingsMe(m, all) ? ' pinged' : '') + (m.sending ? ' sending' : '') + (bookmarked(m.id) ? ' saved' : ''),
    oncontextmenu: (e) => { if (e.target.closest('a')) return; e.preventDefault(); messageCtx(m, e.clientX, e.clientY); } });
  node.dataset.id = m.id;
  if (m.reply) node.append(replyLine(m, to, ctx));
  node.append(cont ? el('span', { className: 'gut', title: full }, when(m.ts)) : av, body, tools);
  const t = view === 'server' ? threadOf(m.id) : null;          // (a thread started from it: its name and how many messages)
  if (t) { const info = Store.threadInfo(t.id); body.append(el('button', { className: 'thread-chip', onclick: (e) => { e.stopPropagation(); openChannel(t); } }, icon('thread', 16), el('b', {}, t.name),
    el('span', {}, info ? plural(info.count, 'Message') : 'See Thread'), icon('chevR', 14))); }
  return node;
}
// the line above a reply: who it answers, and the start of what they said (click to jump there)
function replyLine(m, to, ctx) {
  const line = el('div', { className: 'reply-line' }, el('span', { className: 'rl-curve' }));
  if (!to) line.append(el('span', { className: 'rl-gone' }, 'Original message was deleted'));
  else {
    const nm = el('span', { className: 'rl-name' }, '@' + to.user.name); nm.style.setProperty('--who', nameColor(to.user));
    line.append(avatarEl(face(to.user), { size: 16 }), nm, el('span', { className: 'rl-text' }, to.text ? plainText(to.text, ctx) : to.files ? 'Click to see attachment' : 'Click to see message'));
    line.onclick = () => jumpTo(to.id);
  }
  return line;
}
function jumpTo(id) {
  const n = $('#content').querySelector(`.msg[data-id="${CSS.escape(id)}"]`);
  if (!n) return toast('That message isn’t loaded any more.');
  n.scrollIntoView({ block: 'center', behavior: prefs.reduceMotion ? 'auto' : 'smooth' });
  n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
}
// a call in a DM's history: who started it and how long it went on (with Join while it's still going)
function callNode(m) {
  const c = m.call, going = !c.ended && Date.now() - c.ts < 6 * 3600000, mineNow = call && call.callId === c.id;
  const who = c.mine ? 'You' : c.by.name;
  return el('div', { className: 'msg system' },
    el('span', { className: 'sys-ic' + (going ? ' live' : '') }, icon(going ? 'phone' : c.mine ? 'phone' : 'phoneIn', 18)),
    el('div', { className: 'body' }, el('span', { className: 'sys-text' }, el('b', {}, who), c.ended ? ` started a call that lasted ${lasted(c.ended - c.ts)}.` : ' started a call.'),
      el('span', { className: 'when' }, when(c.ts)),
      going && !mineNow ? el('button', { className: 'btn small green', onclick: () => joinDMCall(c) }, 'Join Call') : null));
}
// grey stand-ins while a conversation loads, like Discord's
function skeleton() {
  const row = (w) => el('div', { className: 'sk-row' }, el('span', { className: 'sk-av' }), el('div', { className: 'sk-lines' }, el('i', { style: `width:${w[0]}%` }), el('i', { style: `width:${w[1]}%` })));
  return el('div', { className: 'skeleton' }, ...[[18, 62], [24, 44], [14, 70], [20, 36], [28, 58]].map(row));
}
// ---------- attachments in a message ----------
function attachmentsNode(m) {
  const files = (m.files || []).filter((f) => f && (f.path || f.data));
  if (!files.length) return null;
  const box = el('div', { className: 'atts' });
  const pics = files.filter((f) => f.kind === 'image');
  if (pics.length) box.append(el('div', { className: 'pics n' + Math.min(pics.length, 4) }, ...pics.map(pictureNode)));
  for (const f of files) {
    if (f.kind === 'voice') box.append(voicePlayer(f, (p) => Store.fileUrl(p)));
    else if (f.kind === 'video') box.append(videoNode(f));
    else if (f.kind !== 'image') box.append(fileCard(f));
  }
  return box;
}
function pictureNode(f) {
  const img = el('img', { alt: f.name || 'picture', loading: 'lazy' });
  if (f.w && f.h) img.style.aspectRatio = `${f.w} / ${f.h}`;
  const a = el('button', { className: 'pic', title: f.name || '', onclick: () => lightbox(f, img.src) }, img);
  if (f.data) img.src = safeImg(f.data);
  else Store.fileUrl(f.path).then((u) => { img.src = u; }, () => a.classList.add('broken'));
  return a;
}
function videoNode(f) {
  const v = el('video', { controls: true, preload: 'metadata', playsInline: true });
  Store.fileUrl(f.path).then((u) => { v.src = u; }, () => {});
  return el('div', { className: 'vid' }, v);
}
// a text or code file (Discord's): its first lines, which open out; wrap, the whole file, copy and download
const TEXT_FILE = /\.(txt|md|markdown|py|js|mjs|cjs|ts|tsx|jsx|json|csv|tsv|log|html?|css|scss|c|h|cpp|hpp|cc|java|kts?|rs|go|rb|php|sh|bash|zsh|bat|ps1|ya?ml|toml|ini|cfg|conf|xml|sql|lua|cs|swift|r|ino|gcode|vue|dart|gradle)$/i;
const isTextFile = (f) => TEXT_FILE.test(f.name || '') && (f.size || 0) <= 1048576 && (f.path || f.data);
function textPreview(f) {
  const code = el('pre', { className: 'tp-code' }, 'Loading…'), card = el('div', { className: 'tp' });
  let text = null, open = false, wrap = false;
  const toggle = el('button', { className: 'tp-btn tp-toggle', title: 'Show More', onclick: () => { open = !open; draw(); } }, icon('chevD', 18));
  function draw() {
    if (text == null) return;
    const all = text.split('\n'), shown = open ? all.slice(0, 600) : all.slice(0, 6);
    code.textContent = shown.join('\n') + ((open ? all.length > 600 : all.length > 6) ? '\n…' : '');
    toggle.classList.toggle('open', open); toggle.title = open ? 'Show Less' : 'Show More'; toggle.hidden = all.length <= 6;
    code.classList.toggle('wrap', wrap);
  }
  const get = async () => { const u = await attempt(() => Store.downloadUrl(f.path, f.name || 'file')); if (u) { const a = el('a', { href: u, download: f.name || '', rel: 'noopener' }); document.body.append(a); a.click(); a.remove(); } };
  const whole = () => {
    const pre = el('pre', { className: 'tp-full' + (wrap ? ' wrap' : '') }); pre.textContent = text || '';
    const m = modal({ title: f.name || 'file', sub: fileSize(f.size || 0), cls: 'tp-dlg', body: [pre], actions: [el('button', { className: 'btn', onclick: () => copyText(text || '', 'Copied.') }, icon('copy', 15), 'Copy'),
      f.path ? el('button', { className: 'btn', onclick: get }, icon('download', 15), 'Download') : null, el('span', { style: 'flex:1' }), el('button', { className: 'btn primary', onclick: () => m.close() }, 'Close')] });
  };
  card.append(code, el('div', { className: 'tp-foot' }, toggle, el('div', { className: 'tp-what' }, el('b', {}, f.name || 'file'), el('small', {}, fileSize(f.size || 0))),
    el('button', { className: 'tp-btn', title: 'Wrap Long Lines', onclick: () => { wrap = !wrap; draw(); } }, icon('code', 18)),
    el('button', { className: 'tp-btn', title: 'View Whole File', onclick: whole }, icon('expand', 18)),
    el('button', { className: 'tp-btn', title: 'More', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu([f.path ? { label: 'Download', icon: 'download', action: get } : null,
      { label: 'Copy Text', icon: 'copy', action: () => copyText(text || '', 'Copied.') }, { label: 'View Whole File', icon: 'expand', action: whole }], r.right - 190, r.bottom + 4); } }, icon('more', 18))));
  (f.data ? fetch(f.data) : Store.fileUrl(f.path).then((u) => fetch(u, { credentials: 'omit' }))).then((r) => r.text())
    .then((t) => { text = t.slice(0, 400000); draw(); }, () => { code.textContent = 'Couldn’t load a preview. Download it instead.'; });
  return card;
}
function fileCard(f) {
  if (isTextFile(f)) return textPreview(f);
  const get = async () => { const u = await attempt(() => Store.downloadUrl(f.path, f.name || 'file')); if (u) { const a = el('a', { href: u, download: f.name || '', rel: 'noopener' }); document.body.append(a); a.click(); a.remove(); } };
  return el('div', { className: 'filecard' }, el('span', { className: 'fc-ic' }, icon('file', 30)),
    el('div', { className: 'fc-what' }, el('button', { className: 'fc-name', onclick: get, title: 'Download' }, f.name || 'file'), el('div', { className: 'fc-size' }, fileSize(f.size || 0))),
    el('button', { className: 'fc-dl', title: 'Download', onclick: get }, icon('download', 20)));
}
function lightbox(f, src) {
  if (!src) return;
  const shut = () => { box.remove(); removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') shut(); };
  const box = el('div', { className: 'lightbox', onclick: (e) => { if (e.target === box) shut(); } },
    el('img', { src, alt: f.name || '' }),
    el('div', { className: 'lb-bar' }, el('a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Browser'), el('button', { onclick: shut }, 'Close')));
  document.body.append(box); addEventListener('keydown', esc);
}
// link previews (Fluentdat invites, GitHub, YouTube), up to three a message
const embedOpts = {
  inviteInfo: (code) => (Store.kind === 'supabase' ? Store.inviteInfo(code) : null),
  join: async (code) => { await joinServer(code); return Store.kind === 'supabase'; },
  open: (id) => go(id), paint, safeImg, iconFor: (n) => (ICON[n] ? icon(n, 30) : null),
  get signedIn() { return Store.kind === 'supabase'; },
};
function embedsNode(m) {
  if (prefs.embeds === 'off' || !m.text || m.sending) return null;
  const nodes = linksIn(m.text).slice(0, 3).map((u) => embed(u, embedOpts)).filter(Boolean);
  return nodes.length ? el('div', { className: 'embeds' }, ...nodes) : null;
}
// a server emoji or sticker whose picture is gone (deleted, or it won't load) shows its name instead
$('#content').addEventListener('error', (e) => {
  const img = e.target; if (img.tagName !== 'IMG') return;
  if (img.classList.contains('emoji')) img.replaceWith(el('span', { className: 'emoji-gone', title: img.alt }, img.alt || ':emoji:'));
  else if (img.parentElement && img.parentElement.classList.contains('server')) img.parentElement.replaceWith(el('div', { className: 'sticker gone' }, icon('sticker', 18), img.alt || 'A sticker'));
}, true);
// spoilers show when clicked; @mentions open the person's profile
$('#content').addEventListener('click', (e) => {
  const sp = e.target.closest('.spoiler'); if (sp) { sp.classList.add('shown'); return; }
  const a = e.target.closest('a[href]'), here = location.origin + location.pathname + '#';
  if (a && a.href.startsWith(here) && /^(msg|user|channel|invite|join)=/.test(a.href.slice(here.length))) { e.preventDefault(); location.hash = a.href.slice(here.length); return; }
  const mn = e.target.closest('.mention[data-uid]'); if (mn) { const p = Store.person && Store.person(mn.dataset.uid); if (p) showProfile(p, mn); }
  const ch = e.target.closest('.mention[data-cid]'); if (ch) { const c = Store.channel(ch.dataset.cid); if (c) { view = 'server'; serverId = c.server; openChannel(c); } }
});
// the top of a conversation, as on Discord: who it's with, or which channel this is
function startHeader() {
  if (prefs.startHeaders === 'off') return null;
  if (view === 'home') {
    const d = Store.dmInfo ? Store.dmInfo(dmId) : null;
    if (d && d.kind === 'group') return { key: 'g:' + dmName(d) + d.icon.length, make: () => el('div', { className: 'start' }, dmAvatar(d, 80), el('h2', {}, dmName(d)),
      el('p', {}, 'Welcome to the beginning of the ', el('b', {}, dmName(d)), ' group.'),
      el('div', { className: 'start-acts' }, el('button', { className: 'btn small', onclick: () => addPeopleFlow() }, icon('usersPlus', 15), 'Add Friends'), el('button', { className: 'btn small', onclick: () => renameGroup(d) }, icon('edit', 15), 'Rename'))) };
    const u = Store.dmUser(dmId); if (!u) return null;
    const st = friendState(u), ms = Store.mutualServerList(u.id), live = Store.kind === 'supabase', blocked = live && Store.blocked(u.id);
    // (as TrixWotel drew it: their picture, big, with their name beside it and what they say about themselves under it)
    return { key: ['dm', u.id, u.name, String(u.avatar || '').length, st, ms.length, blocked, u.about, u.status, u.login].join(':'), make: () => el('div', { className: 'start dm-start' },
      el('div', { className: 'ds-row' }, el('button', { className: 'start-av', title: 'View Full Profile', onclick: () => fullProfile(u) }, avatarEl(u, { size: 112 })),
        el('div', { className: 'ds-text' }, el('h2', {}, el('button', { className: 'start-name', onclick: () => fullProfile(u) }, styledName(el('span', {}, u.name), u))),
          u.login ? el('div', { className: 'start-handle' }, u.login) : null, u.about ? el('div', { className: 'ds-about' }, u.about) : null)),
      el('p', {}, 'This is the beginning of your direct message history with ', el('b', {}, u.name), '.'),
      u.bot ? null : el('div', { className: 'start-acts' },
        ms.length ? el('button', { className: 'start-mutual', onclick: () => fullProfile(u, 'servers') }, el('span', { className: 'start-faces' }, ...ms.slice(0, 3).map((sv) => serverFace(sv, 24))), plural(ms.length, 'Mutual Server'))
          : live ? el('span', { className: 'muted' }, 'No servers in common') : null,
        live ? el('span', { className: 'start-dot' }) : null,
        friendButton(u),
        live ? el('button', { className: 'btn small', onclick: () => (blocked ? unblockUser(u) : blockUser(u)) }, blocked ? 'Unblock' : 'Block') : null)) };
  }
  const c = Store.channel(channelId); if (!c) return null;
  if (c.kind === 'thread') {                    // (a thread: its name, who started it, and the message it started from)
    const up = Store.channel(c.parent), st = c.starter ? (Store.messages(c.parent) || []).find((x) => x.id === c.starter) : null, by = c.by ? person(c.by) : null;
    return { key: ['t', c.id, c.name, !!st, by && by.name].join(':'), make: () => el('div', { className: 'start thr-start' }, el('div', { className: 'start-ic' }, icon('thread', 40)), el('h2', {}, c.name),
      el('p', {}, by ? ['Started by ', el('b', {}, by.name)] : 'A thread', up ? [' in ', el('button', { className: 'link-btn', onclick: () => openChannel(up) }, '#' + up.name)] : null, '.'),
      st ? el('div', { className: 'thr-quote' }, avatarEl(st.user, { size: 24 }), el('b', {}, nameIn(st.user)), el('span', {}, plainText(st.text || '', fmtCtx()).slice(0, 300) || '(an attachment or sticker)')) : null) };
  }
  const name = (c.kind === 'voice' ? '' : '#') + c.name;
  return { key: 'c:' + c.id + name, make: () => el('div', { className: 'start' }, el('div', { className: 'start-ic' }, icon(c.kind === 'voice' ? 'volume' : 'hash', 40)), el('h2', {}, `Welcome to ${name}!`), el('p', {}, `This is the start of the ${name} channel.`)) };
}

// ---------- the main content ----------
function renderContent() {
  const content = $('#content'), composer = $('#composer');
  renderCall();
  if (view === 'discover') {
    const key = 'discover:' + discoverCat;
    if (content.dataset.key !== key) { content.replaceChildren(discoverPage()); content.dataset.key = key; }
    composer.hidden = true; return;
  }
  if (view === 'home' && !dmId && homePage) {
    const bux = buxReady() ? [Bux.wallet().balance, Bux.owned().length] : null;
    const key = homePage + ':' + JSON.stringify(homePage === 'browse' ? 'browse' : homePage === 'shop' ? [me.decoration, me.effect, me.plate, me.frame, me.style, me.name, me.avatar, me.color, questsDone(), bux]
      : homePage === 'datbux' ? [bux, buxLive() && Store.canBux() ? Store.trades().map((t) => t.id + t.status) : null, buxReady()]
      : homePage === 'collection' ? [bux, me.decoration, me.effect, me.frame, me.style, questsDone()] : [questStats(), questsDone(), me.decoration]);
    if (content.dataset.key !== key) { content.replaceChildren(homePage === 'browse' ? dmBrowsePage() : homePage === 'shop' ? shopPage() : homePage === 'datbux' ? datbuxPage() : homePage === 'collection' ? collectionPage() : questsPage()); content.dataset.key = key; }
    composer.hidden = true; return;
  }
  if (view === 'home' && !dmId) {
    const key = 'friends:' + friendsTab;
    if (!(friendsTab === 'add' && content.dataset.key === key)) content.replaceChildren(friendsPage());      // (keep what you're typing)
    content.dataset.key = key; composer.hidden = true; return;
  }
  const pg = pageNow(), psv = pg && Store.server(serverId);
  if (pg && psv) {
    const key = 'page:' + serverId + ':' + pg + ':' + JSON.stringify(pg === 'browse' ? [Store.channels(serverId).map((c) => [c.id, c.name, c.topic, c.category]), hiddenChans[serverId]]
      : pg === 'games' ? psv.gameServers : pg === 'shop' ? [me.decoration, me.effect, me.plate, me.frame, me.style, me.name, me.avatar, me.color, questsDone(), buxReady() ? [Bux.wallet().balance, Bux.owned().length] : null]
      : [psv.guide, psv.name, psv.banner, guideDone(serverId), Store.canManage(serverId)]);
    if (content.dataset.key !== key) {
      content.replaceChildren(pg === 'browse' ? browsePage(psv) : pg === 'games' ? gameServersPage(psv) : pg === 'shop' ? shopPage() : pg === 'rules' ? rulesPage(psv) : guidePage(psv));
      content.dataset.key = key;
    }
    composer.hidden = true; return;
  }
  const ch = view === 'home' ? null : Store.channel(channelId);
  if (view === 'server' && !ch) {
    content.replaceChildren(el('div', { className: 'empty-note' }, Store.syncState().loading ? 'Loading your servers…' : 'No channel here yet. Make one from the server menu.'));
    content.dataset.key = ''; composer.hidden = true; return;
  }
  const place = view === 'home' ? dmId : channelId;
  Store.setActive(view === 'home' ? 'dm' : 'channel', place);   // (what to load and keep live)
  const msgs = view === 'home' ? Store.dm(dmId) : Store.messages(channelId);
  // stay where you were reading, unless you were at the bottom already or this is a different conversation
  const key = view + ':' + place, same = content.dataset.key === key;
  if (key !== searchKey) { searchKey = key; if (searchQ || searchOpen) { searchQ = ''; searchOpen = false; renderTop(); } }
  if (finder.open && finder.scope !== finderScope()) { finder.open = false; searchField.value = ''; }
  if (!same) newLine = { place, at: Store.kind === 'supabase' && Store.unread(place).unread ? Store.readAt(place) : 0 };      // (the red NEW line: where you'd read up to)
  if (!same && keepUnread && keepUnread !== place) keepUnread = null;
  const atBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 80, was = content.scrollTop;
  const whole = Store.kind !== 'supabase' || msgs.length < 300;            // (the start banner only when the start is loaded)
  let wrap = same ? content.querySelector(':scope > .msgs') : null;
  if (!wrap) { wrap = el('div', { className: 'msgs swap' }); content.replaceChildren(wrap); setTimeout(() => wrap.classList.remove('swap'), 400); }
  fillMessages(wrap, msgs, place, whole && !searchQ ? startHeader() : null);
  content.dataset.key = key;
  if (Store.kind === 'supabase' && document.visibilityState === 'visible' && document.hasFocus() && keepUnread !== place && Store.unread(place).unread) Store.markRead(place);
  const d = Store.dmInfo ? Store.dmInfo(dmId) : null;
  const name = view === 'home' ? (d ? (d.kind === 'group' ? dmName(d) : '@' + d.user.name) : '') : (ch.kind === 'voice' || ch.kind === 'thread' ? '' : '#') + ch.name;
  // (how many messages its threads have: fetched when you come to the channel, or it gets a new thread; kept up live after)
  const tkey = view === 'server' && ch && ch.kind === 'text' ? ch.id + ':' + Store.threads(ch.id).map((t) => t.id).join() : '';
  if (content.dataset.thr !== tkey) { content.dataset.thr = tkey; if (tkey) Store.threadsInfo(ch.id); }
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
  if (id === 'upload') CB[id] = make('plusCircle', 'Upload a File', () => pickFiles(addFiles));
  if (id === 'emoji') CB[id] = make('smile', 'Emoji', (e) => { e.stopPropagation(); togglePicker('emoji', CB.emoji); });
  if (id === 'voice') CB[id] = make('mic', 'Record a Voice Message', () => startVoice());
  if (id === 'sticker') CB[id] = $('#sticker-btn');
  if (id === 'send') CB[id] = $('#send-btn');
  CB[id].dataset.btn = id;
  return CB[id];
}
let heldText = '';                // (what you'd typed, kept aside while you're in a channel where you may not send)
function renderComposer() {
  const box = $('#composer .box'), parts = [], locked = !mayIn('send'), files = mayIn('attach');
  $('#composer').classList.toggle('locked', locked);
  const inp = $('#input');
  if (locked && !inp.disabled) { heldText = inp.value; inp.value = ''; }
  if (!locked && inp.disabled) { inp.value = heldText; heldText = ''; }
  inp.disabled = locked;
  if (locked) inp.placeholder = 'You do not have permission to send messages in this channel.';
  for (const id of ordered('composer')) {
    if (id === 'input') parts.push(inp);
    else if (shown(id) && !locked && (files || (id !== 'upload' && id !== 'voice'))) parts.push(composerBtn(id));
  }
  const same = parts.length === box.children.length && parts.every((p, i) => box.children[i] === p);
  if (!same) box.replaceChildren(...parts);
  renderComposerExtras();
}
// above the message box: who you're replying to, and the attachments waiting to go
function renderComposerExtras() {
  const place = placeNow(), d = place ? draft(place) : { files: [], reply: null };
  const rb = $('#reply-bar');
  if (d.reply) {
    const nm = el('b', {}, d.reply.name); nm.style.color = d.reply.color || '';
    rb.replaceChildren(el('span', { className: 'grow' }, 'Replying to ', nm), el('button', { title: 'Stop replying', onclick: () => { d.reply = null; renderComposerExtras(); } }, icon('x', 16)));
    rb.hidden = false;
  } else { rb.hidden = true; rb.replaceChildren(); }
  const tray = $('#attach-tray');
  if (d.files.length) { tray.replaceChildren(...d.files.map(pendingCard)); tray.hidden = false; } else { tray.hidden = true; tray.replaceChildren(); }
  $('#composer').classList.toggle('has-top', !rb.hidden || !tray.hidden);
}
function pendingCard(f) {
  const card = el('div', { className: 'pend' + (f.progress != null ? ' up' : '') },
    f.kind === 'image' ? el('div', { className: 'pend-pic' }, el('img', { src: f.url, alt: '' })) : el('div', { className: 'pend-pic ic' }, icon(f.kind === 'video' ? 'video' : 'file', 38)),
    el('div', { className: 'pend-name', title: f.name }, f.name),
    el('div', { className: 'pend-size' }, fileSize(f.size || 0)),
    f.progress != null ? el('div', { className: 'pend-prog' }, el('i', { style: `width:${Math.round(f.progress * 100)}%` })) : null,
    f.progress == null ? el('button', { className: 'pend-x', title: 'Remove Attachment', onclick: () => removeFile(f) }, icon('trash', 16)) : null);
  card.dataset.id = f.id;
  return card;
}
function removeFile(f) { const d = draft(placeNow()); d.files = d.files.filter((x) => x !== f); if (f.url) URL.revokeObjectURL(f.url); renderComposerExtras(); }
// files dropped, pasted or picked: they wait in the message box until you send (nothing goes by itself)
function addFiles(list) {
  const place = placeNow(); if (!place || $('#composer').hidden || $('#composer').classList.contains('locked')) return;
  if (!mayIn('attach')) return toast('You don’t have permission to attach files in this channel.');
  const d = draft(place), live = Store.kind === 'supabase';
  for (const file of list) {
    if (d.files.length >= 10) { toast('You can attach up to 10 files at a time.'); break; }
    const kind = isImage(file.type) ? 'image' : isVideo(file.type) ? 'video' : 'file';
    if (live && file.size > 10 * 1048576) { toast(`${file.name || 'That file'} is bigger than 10 MB.`); continue; }
    if (!live && kind !== 'image') { toast('Sign in to send files. (Signed out, you can still send pictures.)'); continue; }
    d.files.push({ id: crypto.randomUUID(), file, kind, name: file.name || (kind === 'image' ? 'image.png' : 'file'), size: file.size || 0, url: kind === 'image' ? URL.createObjectURL(file) : '' });
  }
  renderComposerExtras(); $('#input').focus();
}

// ---------- members ----------
function memberList() {
  if (Store.kind === 'supabase') return (serverId && Store.members(serverId)) || [];
  const real = Store.members && Store.members();
  return real && real.length ? real : [asMember(), ...Store.friends()];
}
function renderMembers() {
  const box = $('#members');
  box.classList.toggle('finding', finderOn());
  if (finderOn()) { box.dataset.dmp = ''; box.replaceChildren(finderPanel()); return; }
  const g = view === 'home' && dmId && Store.dmInfo ? Store.dmInfo(dmId) : null;
  if (g && g.kind === 'group') {
    if (!showMembers) return box.replaceChildren();
    const row = (m) => { const nmText = styledName(el('span', { className: 'nmt' }, m.name), m); const nm = el('div', { className: 'nm' }, nmText, tagChipFor(m), m.id === g.owner ? roleMark('crown', 'Group owner') : null);
      return plateOn(el('button', { className: 'mem' + (m.status && m.status !== 'offline' ? '' : ' off'), onclick: (e) => showProfile(m, e.currentTarget), oncontextmenu: (e) => { e.preventDefault(); memberCtx(m, e.clientX, e.clientY); } }, avatarEl(m), el('div', { className: 'who' }, nm)), m.plate); };
    box.replaceChildren(el('div', { className: 'mem-cat' }, `Members — ${g.people.length}`), ...g.people.map(row),
      el('button', { className: 'btn small wide', style: 'margin-top:12px', onclick: () => addPeopleFlow() }, icon('usersPlus', 15), 'Add Friends'));
    return;
  }
  if (view === 'home' && dmId && prefs.dmPanel) {
    const u = Store.dmUser(dmId), key = u ? JSON.stringify([u.id, u.name, u.login, u.pronouns, u.about, u.since, String(u.avatar || '').length, u.color, u.theme, u.style, u.tag, u.status,
      friendState(u), Store.kind === 'supabase' && Store.blocked(u.id), Store.mutualServerList(u.id).map((x) => x.id), noteOn(u.id), playingNow(u.playing) && u.playing, u.decoration, u.effect]) : '';
    if (box.dataset.dmp !== key) { box.dataset.dmp = key; box.replaceChildren(u ? dmPanel(u) : ''); }
    return;
  }
  box.dataset.dmp = '';
  if (view !== 'server' || !showMembers) { box.replaceChildren(); return; }
  const all = memberList(), isOn = (m) => m.status && m.status !== 'offline' && m.status !== 'invisible';
  const online = all.filter(isOn), offline = all.filter((m) => !isOn(m));
  const member = (m) => {
    const nmText = el('span', { className: 'nmt' }, m.nick || m.name);
    const nm = el('div', { className: 'nm' }, nmText, tagChipFor(m), m.role === 'owner' ? roleMark('crown', 'Server owner') : m.role === 'admin' ? roleMark('shield', 'Admin') : null,
      m.booster ? el('span', { className: 'boost-gem', title: 'Server Booster' }, icon('gem', 13)) : null);
    nm.style.setProperty('--who', safeColor(m.roleColor || m.color, 'var(--text)'));
    styledName(nmText, m, { roleColored: !!m.roleColor });
    const who = el('div', { className: 'who' }, nm), pl = playingNow(m.playing) ? m.playing : null;
    const bub = isMe(m) ? myBubble() : m.bubble;            // (their status bubble, as Discord shows a custom status)
    if (pl) who.append(el('div', { className: 'mem-sub mem-play' }, 'Playing ', el('b', {}, pl.n)));
    else if (bub) who.append(el('div', { className: 'mem-sub' }, bub));
    else if (prefs.memberStatusText) who.append(el('div', { className: 'mem-sub' }, m.about || (m.bot ? 'Bot' : (m.status || 'offline'))));
    const open = pop && pop.dataset.src === 'members' && pop.dataset.uid === String(m.id || m.name);
    const row = el('button', { className: 'mem' + (isOn(m) ? '' : ' off') + (open ? ' open' : ''), onclick: (e) => showProfile(m, e.currentTarget),
      oncontextmenu: (e) => { e.preventDefault(); memberCtx(m, e.clientX, e.clientY); } }, avatarEl(m), who);
    return plateOn(row, m.plate);
  };
  // (admins: right-click a heading to choose which roles get their own group, as on Discord)
  const groupMenu = (e) => {
    if (!Store.canManage(serverId) || Store.kind !== 'supabase') return; e.preventDefault();
    const roles = Store.roles(serverId);
    menu([{ label: 'Display Role Members Separately', disabled: true }, ...(roles.length ? roles.map((r) => ({ label: r.name, color: safeColor(r.color, '#99aab5'), check: !!r.hoist,
      action: () => { Store.updateRole(r.id, { hoist: !r.hoist }); renderAll(); } })) : [{ label: 'No roles yet', disabled: true }]),
      '-', { label: 'Edit Roles', icon: 'gear', action: () => openServerSettings(serverId, 'roles') }], e.clientX, e.clientY);
  };
  const grp = (title, list, role = null) => list.length ? [el('div', { className: 'mem-cat', oncontextmenu: groupMenu }, roleIconEl(role, 16), `${title} — ${list.length}`), ...list.map(member)] : [];
  const out = [];
  let rest = online;
  if (Store.kind === 'supabase' && prefs.memberGroups !== 'off')         // people with a role that's shown separately get their own group
    for (const r of Store.roles(serverId).filter((x) => x.hoist)) { const ppl = rest.filter((m) => m.group && m.group.id === r.id); rest = rest.filter((m) => !ppl.includes(m)); out.push(...grp(r.name, ppl, r)); }
  out.push(...grp('Online', rest));
  if (prefs.memberOffline) out.push(...grp('Offline', offline));
  box.replaceChildren(...out);
}
const roleMark = (ic, title) => { const s = el('span', { className: 'role-mark', title }); s.append(icon(ic, 13)); return s; };
// a role's icon (the server's leaders choose it): an emoji, or a small picture
function roleIconEl(r, size = 16) {
  if (!r || !r.icon) return null;
  const pic = /^data:image\//.test(r.icon) ? safeImg(r.icon) : '';
  if (/^data:/.test(r.icon) && !pic) return null;
  const s = el('span', { className: 'role-ic', title: r.name }, pic ? el('img', { src: pic, alt: '' }) : r.icon);
  s.style.setProperty('--ri', size + 'px');
  return s;
}
function renderAll() {
  if (renderBanned()) return;
  indexEmoji(); ensureSelection(); renderTitle(); renderRail(); renderSide(); renderMe(); renderTop(); renderContent(); renderMembers(); renderBanner();
  const g = view === 'home' && dmId && Store.dmInfo ? Store.dmInfo(dmId) : null, groupOn = !!g && g.kind === 'group' && showMembers;
  const dmPanelOn = view === 'home' && !!dmId && prefs.dmPanel && !!Store.dmUser(dmId);
  $('#app').classList.toggle('show-members', (showMembers && view === 'server') || dmPanelOn || groupOn || finderOn());
  $('#app').classList.toggle('dm-mode', dmPanelOn && !finderOn());
  $('#app').classList.toggle('finding', finderOn());
  applyLayout();
  // the tab's title counts what's waiting for you: pings, unread DMs and friend requests
  let n = Store.friendRequests().incoming.length;
  for (const d of Store.dmList()) n += dmUnread(d.id);
  for (const sv of Store.servers()) n += serverUnread(sv.id).mentions;
  document.title = (n ? `(${n > 99 ? '99+' : n}) ` : '') + (CUSTOMIZE ? 'Fluentdat Customize' : 'Fluentdat');
}
// banned from Fluentdat (TrixWotel's /ban): only why, since when, and a way to sign out (the database shows them nothing else)
function renderBanned() {
  const ban = Store.kind === 'supabase' && Store.banned ? Store.banned() : null;
  let box = $('#banned');
  if (!ban) { if (box) box.remove(); return false; }
  if (!box) { box = el('div', { id: 'banned', className: 'banned' }); document.body.append(box); }
  box.replaceChildren(el('div', { className: 'banned-card' }, el('div', { className: 'banned-ic' }, icon('ban', 34)), el('h1', {}, 'You’re banned from Fluentdat'),
    el('p', {}, ...(ban.reason ? ['Why: ', el('b', {}, ban.reason)] : ['The people who run Fluentdat banned this account.'])),
    ban.at ? el('p', { className: 'banned-when' }, 'Since ' + dateLong(ban.at)) : null,
    el('button', { className: 'btn', onclick: async () => { await Store.signOut(); renderAll(); signInDialog(() => renderAll(), 'Sign in to Fluentdat'); } }, 'Sign Out')));
  return true;
}
function renderBanner() {
  const b = $('#banner'), st = Store.syncState(), acc = Store.account();
  b.replaceChildren();
  // (all's well: "Live, signed in as @you" only shows when you've asked for it in Settings; trouble always shows)
  b.classList.toggle('calm', !Store.resuming && !st.error && !!acc && !(Store.kind === 'supabase' && Store.needsSetup()));
  if (Store.resuming) b.append('Signing you in…');
  else if (Store.kind === 'supabase' && Store.needsSetup() && !st.error) { b.append('Run the newest supabase/setup.sql in Supabase to turn on reactions, server tags, profile themes and name styles (and emoji, stickers, blocking and one-time links if they’re off). '); b.append(el('a', { href: '#' }, 'How')); b.onclick = (e) => { e.preventDefault(); setupHelp(); }; return; }
  else if (Store.kind === 'supabase') b.append(st.error ? `Trouble: ${st.error}` : `Live, signed in as @${acc.login}`);
  else if (acc) {
    const when = st.lastSync ? 'synced ' + new Date(st.lastSync).toLocaleTimeString() : 'syncing…';
    b.append(st.error ? `Sync trouble: ${st.error}` : `Synced with GitHub as ${acc.login} — ${when}`);
  } else b.append(Store.configured ? 'Saving in this browser only. Sign in to chat with your team.' : 'Saving in this browser only. Sign in with GitHub to share with your team.');
  b.onclick = () => (acc || Store.resuming ? openUserSettings('sync') : signInDialog());
}

// what to do in Supabase to turn the new things on
function setupHelp() {
  const m = modal({ title: 'One step in Supabase', sub: 'Fluentdat’s database needs its newest rules: reactions, server tags, profile themes and display name styles, and everything before them (emoji and stickers, blocking, reports, one-time links, calls, attachments, group DMs, friend requests, unread counts).',
    body: [el('div', { className: 'note-box' }, el('ol', {},
      el('li', {}, 'Open your project at ', el('a', { href: 'https://supabase.com/dashboard', target: '_blank', rel: 'noopener noreferrer' }, 'supabase.com/dashboard'), '.'),
      el('li', {}, 'SQL Editor → New query.'),
      el('li', {}, 'Paste all of ', el('a', { href: 'https://github.com/TrixWotel/Fluentdat/blob/main/supabase/setup.sql', target: '_blank', rel: 'noopener noreferrer' }, 'supabase/setup.sql'), ' and click Run (it should say “Success. No rows returned”).'),
      el('li', {}, 'Come back here and reload.')),
      el('div', { style: 'margin-top:8px' }, 'It’s safe to run again: it keeps everything that’s already there.'))],
    actions: [el('button', { className: 'btn', textContent: 'Copy the link to setup.sql', onclick: () => copyText('https://github.com/TrixWotel/Fluentdat/blob/main/supabase/setup.sql', 'Link copied.') }),
      el('button', { className: 'btn primary', textContent: 'Got it', onclick: () => m.close() })] });
}

// ---------- friends page ----------
let friendSearch = '';
function friendsPage() {
  const live = Store.kind === 'supabase', req = Store.friendRequests();
  const tab = (id, label, n) => el('button', { className: 'ftab' + (friendsTab === id ? ' on' : '') + (id === 'add' ? ' add' : ''), onclick: () => { friendsTab = id; if (live) Store.refreshFriends(); renderContent(); } },
    label, n ? el('span', { className: 'mbadge' }, String(n)) : null);
  const body = el('div', { className: 'fbody' });
  if (friendsTab === 'pending' && !live) friendsTab = 'online';
  if (friendsTab === 'add') body.append(...addFriendPane());
  else if (friendsTab === 'pending') body.append(...pendingPane(req));
  else body.append(...friendListPane());
  return el('div', { className: 'friends' },
    el('div', { className: 'ftabs' }, el('span', { className: 'ft-title' }, icon('users', 20), 'Friends'), el('span', { className: 'ft-sep' }),
      tab('online', 'Online'), tab('all', 'All'), live ? tab('pending', 'Pending', req.incoming.length) : null, tab('add', 'Add Friend')),
    body);
}
function friendListPane() {
  let list = Store.friends();
  if (friendsTab === 'online') list = list.filter((f) => f.status && f.status !== 'offline' && f.status !== 'invisible');
  const rows = el('div', {});
  const q = el('input', { type: 'search', className: 'f-search', placeholder: 'Search', value: friendSearch });
  const draw = () => {
    const s = friendSearch.toLowerCase(), hits = list.filter((f) => !s || String(f.name || '').toLowerCase().includes(s) || String(f.login || '').toLowerCase().includes(s));
    if (!list.length) return rows.replaceChildren(el('div', { className: 'empty-note' }, friendsTab === 'online' ? 'No one’s around to play with right now.' : 'No friends yet. Add someone from the Add Friend tab.'));
    rows.replaceChildren(el('h4', {}, `${friendsTab === 'online' ? 'Online' : 'All Friends'} — ${hits.length}`), ...hits.map((f) => {
      const more = (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu([
        Store.kind === 'supabase' && { label: 'Start Video Call', icon: 'video', action: async () => { if (await openDM(f)) startDMCall(true); } },
        Store.kind === 'supabase' && { label: 'Start Voice Call', icon: 'phone', action: async () => { if (await openDM(f)) startDMCall(false); } },
        { label: 'Remove Friend', danger: true, action: () => unfriend(f) }], r.left - 150, r.bottom + 4); };
      return el('div', { className: 'frow', onclick: () => openDM(f), oncontextmenu: (e) => { e.preventDefault(); memberCtx(f, e.clientX, e.clientY); } },
        avatarEl(f, { size: 40 }), el('div', { className: 'grow' }, el('div', { className: 'nm' }, f.name, f.login ? el('span', { className: 'handle' }, ' ' + f.login) : null),
          el('div', { className: 'st2' }, f.bot ? 'Bot' : ({ online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb' }[f.status] || 'Offline'))),
        el('div', { className: 'acts' }, el('button', { title: 'Message', onclick: (e) => { e.stopPropagation(); openDM(f); } }, icon('message', 18)), el('button', { title: 'More', onclick: more }, icon('more', 18))));
    }));
  };
  q.oninput = () => { friendSearch = q.value.trim(); draw(); };
  draw();
  return list.length ? [q, rows] : [rows];
}
function pendingPane(req) {
  if (!req.incoming.length && !req.outgoing.length) return [el('div', { className: 'empty-note' }, 'There are no pending friend requests. Here’s a friend you could add: someone you sit next to.')];
  const row = (u, incoming) => el('div', { className: 'frow', oncontextmenu: (e) => { e.preventDefault(); memberCtx(u, e.clientX, e.clientY); } },
    avatarEl(u, { size: 40 }), el('div', { className: 'grow' }, el('div', { className: 'nm' }, u.name, u.login ? el('span', { className: 'handle show' }, ' ' + u.login) : null),
      el('div', { className: 'st2' }, incoming ? 'Incoming Friend Request' : 'Outgoing Friend Request')),
    el('div', { className: 'acts' },
      incoming ? el('button', { className: 'ok', title: 'Accept', onclick: async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); renderAll(); } }, icon('check', 18)) : null,
      el('button', { className: 'no', title: incoming ? 'Ignore' : 'Cancel', onclick: async () => { await attempt(() => (incoming ? Store.ignoreFriend(u.id) : Store.cancelFriend(u.id))); renderAll(); } }, icon('x', 18))));
  return [el('h4', {}, `Pending — ${req.incoming.length + req.outgoing.length}`), ...req.incoming.map((u) => row(u, true)), ...req.outgoing.map((u) => row(u, false))];
}
function addFriendPane() {
  if (Store.kind !== 'supabase') {
    const inp = el('input', { placeholder: 'Enter a username to add' });
    const add = () => { const u = inp.value.trim(); if (!u) return; Store.addFriend({ id: 'u_' + u.toLowerCase(), name: u, color: COLORS[Math.floor(Math.random() * COLORS.length)], status: 'offline' }); inp.value = ''; toast(`Added ${u} in this browser. Sign in to send real friend requests.`); friendsTab = 'all'; renderContent(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
    return [el('h4', {}, 'Add Friend'), el('div', { className: 'f-hint' }, 'Signed out, friends are kept in this browser. Sign in to send people real friend requests.'),
      el('div', { className: 'add-form' }, inp, el('button', { className: 'btn primary', onclick: add }, 'Add'))];
  }
  const inp = el('input', { placeholder: 'You can add friends with their @handle.', autocapitalize: 'off', spellcheck: false });
  const go = el('button', { className: 'btn primary', disabled: true }, 'Send Friend Request');
  const note = el('div', { className: 'f-note' }), form = el('div', { className: 'add-form big' }, inp, go);
  inp.oninput = () => { go.disabled = !inp.value.trim(); form.classList.remove('good', 'bad'); note.textContent = ''; };
  const add = async () => {
    const h = inp.value.trim(); if (!h) return;
    go.disabled = true;
    try {
      const f = await Store.addFriendByHandle(h);
      form.classList.add('good'); note.className = 'f-note good';
      note.textContent = f.state === 'accepted' ? `You and ${f.name} are now friends!` : `Success! Your friend request to ${f.name} was sent.`;
      inp.value = '';
    } catch (e) { form.classList.add('bad'); note.className = 'f-note bad'; note.textContent = String((e && e.message) || e); }
    go.disabled = !inp.value.trim();
  };
  go.onclick = add;
  inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
  const mine = (Store.account() || {}).login;
  setTimeout(() => inp.focus(), 0);
  return [el('h4', { className: 'f-big' }, 'Add Friend'), el('div', { className: 'f-hint' }, 'You can add friends with their Fluentdat @handle. (There’s no list of everyone to browse.)'), form, note,
    mine ? el('div', { className: 'f-hint', style: 'margin-top:18px' }, 'Your handle is ', el('b', { style: 'color:var(--bright)' }, '@' + mine), '. ',
      el('a', { href: '#', style: 'color:var(--accent)', onclick: (e) => { e.preventDefault(); copyText('@' + mine, 'Handle copied.'); } }, 'Copy it')) : null];
}
// where you stand with someone: 'friend', 'incoming' (they asked you), 'outgoing' (you asked them) or 'none'
const friendState = (u) => (!u || isMe(u) || u.bot ? 'self' : Store.kind === 'supabase' ? Store.friendState(u.id) : Store.friends().some((f) => f.id === (u.id || 'u_' + String(u.name).toLowerCase())) ? 'friend' : 'none');
function friendButton(u, small = true) {
  const st = friendState(u), cls = 'btn' + (small ? ' small' : '');
  if (st === 'self') return null;
  if (st === 'friend') return el('button', { className: cls, onclick: () => unfriend(u) }, 'Remove Friend');
  if (st === 'outgoing') return el('button', { className: cls, title: 'Click to cancel the request', onclick: async () => { await attempt(() => Store.cancelFriend(u.id)); renderAll(); } }, 'Friend Request Sent');
  if (st === 'incoming') return el('button', { className: cls + ' green', onclick: async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); renderAll(); } }, 'Accept Friend Request');
  return el('button', { className: cls + ' primary', onclick: () => befriend(u) }, icon('personAdd', 15), 'Add Friend');
}
function friendItem(u) {
  const st = friendState(u);
  if (st === 'self') return null;
  if (st === 'friend') return { label: 'Remove Friend', action: () => unfriend(u) };
  if (st === 'outgoing') return { label: 'Cancel Friend Request', action: async () => { await attempt(() => Store.cancelFriend(u.id)); renderAll(); } };
  if (st === 'incoming') return { label: 'Accept Friend Request', icon: 'check', action: async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); renderAll(); } };
  return { label: 'Add Friend', icon: 'personAdd', action: () => befriend(u) };
}

// ---------- popouts ----------
let pop = null;
function closePop() {
  if (!pop) return;
  const p = pop; pop = null;
  for (const m of document.querySelectorAll('.mem.open')) m.classList.remove('open');
  if (!animOn('popouts') || p.classList.contains('bm')) return p.remove();
  p.classList.add('out'); setTimeout(() => p.remove(), 170);
}
function placePop(anchor, h) {
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth || 300, ph = h || pop.offsetHeight, p = pop;
  let above = false;
  const beside = (x) => { p.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + 'px'; p.style.top = Math.max(12, Math.min(r.top, innerHeight - ph - 12)) + 'px'; };
  const list = anchor.closest && anchor.closest('#members');
  if (list && innerWidth > 720) { p.classList.add('from-right'); beside(list.getBoundingClientRect().left - w - 8); }     // (a member: to the left of the list)
  else if (anchor.closest && anchor.closest('#content .msg') && r.right + 8 + w <= innerWidth - 12) { p.classList.add('from-left'); beside(r.right + 8); }    // (a name in the chat: to its right)
  else {
    above = r.bottom + ph + 8 > innerHeight;
    p.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
    p.style.top = (above ? Math.max(12, r.top - ph - 8) : r.bottom + 8) + 'px';
  }
  // (what's in a card can arrive after it opens, its badges and games: it stays on the screen as it grows, upward
  // when it opened above what you clicked)
  if (!window.ResizeObserver) return;
  const ro = new ResizeObserver(() => {
    if (!p.isConnected) return ro.disconnect();
    const hh = p.offsetHeight, t = above ? r.top - hh - 8 : parseFloat(p.style.top) || 12;
    p.style.top = Math.max(12, Math.min(t, innerHeight - hh - 12)) + 'px';
  });
  ro.observe(p);
}
function showProfile(user, anchor) {
  // (clicking the same person again closes their card)
  const src = anchor.closest ? (anchor.closest('#members') ? 'members' : anchor.closest('#content') ? 'chat' : 'other') : 'other';
  const again = pop && pop.classList.contains('prof') && pop.dataset.uid === String(user.id || user.name) && pop.dataset.src === src && src !== 'other';
  closePop();
  if (again) return;
  const mine = isMe(user), sv = view === 'server' ? serverId : null, live = Store.kind === 'supabase';
  const u = mine ? { ...asMember(), ...user, me: true, name: me.name, avatar: me.avatar, color: me.color, about: me.about, pronouns: me.pronouns, banner: me.banner, plate: me.plate,
    decoration: me.decoration || '', effect: me.effect || '', frame: me.frame || '', bubble: myBubble() } : user;
  const banner = el('div', { className: 'banner-c' }); setBanner(banner, u.banner, u.color);
  const toFull = (tab) => { closePop(); fullProfile(user, tab || undefined); };
  // (on the banner, as on Discord: befriending them, and the ⋯)
  if (!mine && !u.bot) {
    const st = friendState(u), tool = (ic, title, fn) => el('button', { className: 'p-tool', title, onclick: (e) => { e.stopPropagation(); fn(e); } }, icon(ic, 18));
    banner.append(el('div', { className: 'p-tools' },
      live && st === 'none' && !Store.blocked(u.id) ? tool('personAdd', 'Add Friend', () => befriend(u).then(() => closePop())) : null,
      st === 'outgoing' ? tool('clock', 'Friend Request Sent (click to cancel)', async () => { await attempt(() => Store.cancelFriend(u.id)); closePop(); renderAll(); }) : null,
      st === 'incoming' ? tool('check', 'Accept Friend Request', async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); closePop(); renderAll(); }) : null,
      st === 'friend' ? tool('userCheck', 'Friends', (e) => { const r = e.currentTarget.getBoundingClientRect(); menu([{ label: 'Remove Friend', danger: true, action: () => unfriend(u) }], r.left, r.bottom + 4); }) : null,
      tool('more', 'More', (e) => openBeside(e.currentTarget, (r) => profileMenu(u, r.left, r.bottom + 4)))));
  }
  const nick = sv && u.id ? Store.nickIn(sv, u.id) : '';
  const inner = el('div', { className: 'inner pc-inner' }, profileHead(u, { onOpen: () => toFull(), self: mine, name: nameIn(u, sv),
    note: nick ? u.name + ' · nickname in this server' : u.bot && u.via ? 'Run by @' + u.via + ' (Flubot speaks for whoever types the command)' : null }),
    ...profileParts(u, { onTab: (tab) => toFull(tab), closeFirst: () => closePop() }));
  const bio = inner.querySelector('.dmp-about');
  // their roles in this server (admins can hand them out, or take them back, from here)
  if (live && sv && u.id && !u.bot) {
    const all = Store.roles(sv), can = Store.canManage(sv), has = all.filter((r) => ((Store.members(sv) || []).find((m) => m.id === u.id) || {}).roles?.includes(r.id));
    if (has.length || (can && all.length)) inner.append(el('div', { className: 'role-chips' },
      ...has.map((r) => el('span', { className: 'rchip' }, el('i', { style: `background:${safeColor(r.color, '#99aab5')}` }), roleIconEl(r, 14), r.name,
        can ? el('button', { className: 'rchip-x', title: `Take ${r.name} away`, onclick: async (e) => { e.stopPropagation(); if ((await attempt(() => Store.giveRole(sv, u.id, r.id, false))) !== null) { toast(`${u.name} is no longer ${r.name}.`); closePop(); } } }, icon('x', 11)) : null)),
      can && all.length ? el('button', { className: 'rchip add', title: 'Give a role', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu(roleItems(sv, u), r.left, r.bottom + 4); } }, icon('plus', 13)) : null));
  }
  if (mine) inner.append(el('div', { className: 'card' }, el('button', { onclick: () => { closePop(); openProfileEditor(); } }, icon('edit'), 'Edit Profile')));
  else if (!u.bot) {
    const say = el('input', { type: 'text', placeholder: 'Message @' + (u.login || u.name), maxLength: 4000 });
    say.onkeydown = async (e) => {
      if (e.key !== 'Enter' || !say.value.trim()) return;
      const text = say.value.trim(); closePop();
      if (await openDM(normFriend(u))) postMine({ text });
    };
    const emo = el('button', { className: 'pmsg-emo', type: 'button', title: 'Add an emoji', onclick: (e) => { e.stopPropagation(); openPicker({ tab: 'emoji', emojiOnly: true, anchor: emo, still: motionOff(),
      servers: [], emojiOf: () => [], stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {}, onEmoji: (t, keep, custom) => { if (!custom) { say.value += t; say.focus(); } }, onSticker: () => {} }); } }, icon('smile', 18));
    inner.append(el('div', { className: 'pmsg' }, say, emo));
  }
  pop = el('div', { className: 'pop prof' }, banner, inner);
  pop.dataset.uid = String(user.id || user.name); pop.dataset.src = src;
  themeCard(pop, u.theme, u.color); withEffect(pop, u.effect); withFrame(pop, u.frame);
  document.body.append(pop); placePop(anchor);
  if (bio && bio.scrollHeight > bio.clientHeight + 2) bio.after(el('button', { className: 'link-btn p-fullbio', onclick: () => toFull() }, 'View Full Bio'));
  if (anchor.classList && anchor.classList.contains('mem')) anchor.classList.add('open');
  if (!u.banner && u.id && !mine) Store.profileFull(u.id).then((p) => { if (p && p.banner && banner.isConnected) setBanner(banner, p.banner, u.color); }, () => {});
}
const normFriend = (u) => ({ id: u.id || 'u_' + String(u.name).toLowerCase(), name: u.name, login: u.login, color: u.color, avatar: u.avatar, bot: u.bot, status: u.status || 'offline', plate: u.plate, about: u.about });

// ---------- profiles: the ⋯ menu, the panel beside a DM, and the full profile ----------
const dateLong = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const profileLink = (u) => `${location.origin}${location.pathname}#user=${encodeURIComponent(u.login || u.id)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// the ⋯ on someone's profile, as on Discord: share it, invite them, ignore, block or report them, copy who they are
function profileMenu(u, x, y, { full = false } = {}) {
  const live = Store.kind === 'supabase', self = isMe(u), blocked = live && !self && Store.blocked(u.id), ignored = isIgnored(u.id), st = friendState(u);
  const invitable = live && !self && !u.bot ? Store.servers().filter((sv) => Store.canManage(sv.id) && !(Store.members(sv.id) || []).some((m) => m.id === u.id)) : [];
  menu([
    !full && { label: 'View Full Profile', icon: 'user', action: () => fullProfile(u) },
    live && u.login && !u.bot && { label: 'Share Profile', icon: 'share', action: () => copyText(profileLink(u), 'Profile link copied.') },
    !self && !u.bot && live && st === 'none' && !blocked && { label: 'Add Friend', icon: 'personAdd', action: () => befriend(u) },
    !self && !u.bot && st === 'incoming' && { label: 'Accept Friend Request', icon: 'check', action: async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); renderAll(); } },
    !self && !u.bot && st === 'outgoing' && { label: 'Cancel Friend Request', icon: 'x', action: async () => { await attempt(() => Store.cancelFriend(u.id)); renderAll(); } },
    invitable.length && { label: 'Invite to Server', sub: () => invitable.map((sv) => ({ label: sv.name, action: () => inviteTo(u, sv) })) },
    live && !self && !u.bot && u.id && Store.canBux() && { label: 'Send Datbux', icon: 'coin', action: () => sendBuxDialog(u) },
    live && !self && !u.bot && u.id && Store.canBux() && { label: 'Trade', icon: 'swap', action: () => tradeDialog(u) },
    st === 'friend' && { label: 'Remove Friend', action: () => unfriend(u) },
    !self && !u.bot && '-',
    !self && !u.bot && { label: ignored ? 'Unignore' : 'Ignore', icon: 'eyeOff', hint: ignored ? null : 'Tuck away their messages, no pings', action: () => setIgnored(u, !ignored) },
    live && !self && !u.bot && { label: blocked ? 'Unblock' : 'Block', icon: 'ban', danger: !blocked, action: () => (blocked ? unblockUser(u) : blockUser(u)) },
    live && !self && !u.bot && { label: 'Report User Profile', icon: 'flag', danger: true, action: () => reportFlow({ user: u }) },
    staffOn() && !self && !u.bot && u.id && { label: 'Ban from Fluentdat', icon: 'shield', danger: true, action: () => appBanFlow(u) },
    '-',
    { label: 'Copy User Info', sub: () => [u.login && { label: 'Copy Username', action: () => copyText(u.login, 'Username copied.') },
      { label: 'Copy User ID', action: () => copyText(String(u.id || u.login || u.name), 'User ID copied.') }, u.login && live && !u.bot && { label: 'Copy Profile Link', action: () => copyText(profileLink(u), 'Profile link copied.') }].filter(Boolean) },
  ], x, y);
}
// Invite to Server: a one-person invite, sent to them in your DM (it shows as an invite card)
async function inviteTo(u, sv) {
  const code = await attempt(() => Store.createInvite(sv.id, 1, 168)); if (!code) return;
  if (!(await openDM(normFriend(u)))) return;
  postMine({ text: location.origin + location.pathname + '#invite=' + code });
  toast(`Invite to ${sv.name} sent to ${u.name}.`);
}
async function blockUser(u) {
  if (!(await confirmBox({ title: `Block ${u.name}?`, text: 'They won’t be able to message you, call you or send you a friend request, and you won’t be friends any more. Their messages in servers are tucked away for you. They aren’t told.', ok: 'Block', danger: true }))) return;
  if ((await attempt(() => Store.block(u.id))) !== null) { toast(`${u.name} is blocked.`); closePop(); renderAll(); }
}
async function unblockUser(u) { if ((await attempt(() => Store.unblock(u.id))) !== null) { toast(`${u.name} is unblocked.`); renderAll(); } }

// ---------- profile cards (the DM profile beside a chat, and the full profile's card): each part, in the order and with the
// parts you chose (Customize → Elements → Profile cards) ----------
// badges and tag; mutual friends and servers; member, boosting and friends since; about them; what they're playing;
// their Game Collection and Wishlist; their connections; your note on them. onTab(tab) opens the full profile there.
function profileParts(u, { full = false, only = null, onTab = () => {}, closeFirst = () => {} } = {}) {
  const live = Store.kind === 'supabase', self = isMe(u), xid = u.bot ? null : self ? myXid() : live && u.id ? u.id : null;
  const sec = (cls, ...kids) => el('section', { className: 'pc-sec ' + cls }, ...kids);
  const line = (ic, label, value) => el('div', { className: 'pc-line' }, icon(ic, 15), el('span', { className: 'pc-l' }, label), el('b', {}, value));
  const out = [], later = [];          // (parts filled in once their profile's extras are known)
  for (const id of ordered('profileCard')) {
    if (!shown(id) || (only && !only.includes(id))) continue;
    if (id === 'pBadges' && !u.bot) out.push(sec('pc-badges', badgeRow(u, { max: full ? 9 : 6 }), tagFor(u) ? el('span', { className: 'pc-tag' }, tagChipFor(u)) : null));
    else if (id === 'pMutual' && live && !self && !u.bot && u.id) {
      const ms = Store.mutualServerList(u.id), box = sec('pc-mutual');
      const row = (label, faces, n, tab) => el('button', { className: 'pc-row', onclick: () => onTab(tab) }, el('span', { className: 'pc-l' }, label),
        el('span', { className: 'dmp-faces' }, ...faces), n > faces.length ? el('span', { className: 'pc-more' }, '+' + (n - faces.length)) : null);
      const friendsRow = el('div', { className: 'pc-slot' });
      box.append(friendsRow);
      if (ms.length) box.append(row('Mutual Servers', ms.slice(0, 3).map((sv) => serverFace(sv, 20)), ms.length, 'servers'));
      Store.mutualFriends(u.id).then((fr) => { if (fr.length && friendsRow.isConnected) friendsRow.replaceWith(row('Mutual Friends', fr.slice(0, 3).map((f) => avatarEl(face(f), { size: 20 })), fr.length, 'friends')); }, () => {});
      out.push(box);
    }
    else if (id === 'pSince' && !u.bot) {
      const box = sec('pc-since');
      if (u.since) box.append(line('logo', 'Member Since', dateLong(u.since)));
      const boost = el('div', { className: 'pc-slot' }); box.append(boost);
      // (boosting since: when they first boosted a server you can both see, from what their badges are made of)
      const showBoost = (st) => { if (st && st.boost_since && boost.isConnected) boost.replaceWith(line('gem', 'Boosting Since', dateLong(Date.parse(st.boost_since)))); };
      showBoost(statsNow(u)); statsOf(u).then(showBoost, () => {});
      const fs = full && live && !self && u.id ? Store.friendSince(u.id) : 0;
      if (fs) box.append(line('users', 'Friends Since', dateLong(fs)));
      out.push(box);
    }
    else if (id === 'pBio' && u.about) out.push(sec('pc-bio', el('h4', {}, 'About'), el('div', { className: 'dmp-about' }, u.about)));
    else if (id === 'pPlaying' && playingNow(u.playing)) out.push(sec('pc-play', el('h4', {}, 'Playing'), playingRow(u.playing)));
    else if ((id === 'pGames' || id === 'pWish' || id === 'pConns') && xid) {
      const box = sec('pc-' + id.slice(1).toLowerCase());
      later.push([id, box]); out.push(box);
    }
    else if (id === 'pNote' && !self && !u.bot && u.id) {
      if (full) {
        const note = el('textarea', { className: 'fp-note', placeholder: 'Click to add a note', maxLength: 256, rows: 1, value: noteOn(u.id) });
        const fit = () => { note.style.height = 'auto'; note.style.height = note.scrollHeight + 'px'; };
        note.oninput = fit; note.onblur = () => { setNote(u.id, note.value.trim()); if (view === 'home') renderMembers(); };
        note.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); note.blur(); } };
        out.push(sec('pc-note', el('h4', {}, 'Note (only you see it)'), note)); setTimeout(fit, 0);
      } else if (noteOn(u.id)) out.push(sec('pc-note', el('h4', {}, 'Note'), el('div', { className: 'dmp-about' }, noteOn(u.id))));
    }
  }
  // (their Game Collection, Wishlist and connections: from their profile's extras, fetched now)
  if (later.length) {
    const fill = (x) => {
      for (const [id, box] of later) {
        if (id === 'pConns') {
          const list = (x && x.connections) || [];
          box.replaceChildren(...(list.length || (self && full) ? [el('h4', {}, 'Connections'), ...list.map(connectionRow),
            ...(self && full ? [el('button', { className: 'fp-addconn', onclick: () => { closeFirst(); openUserSettings('connections'); } }, icon('plus', 15), 'Add Connection')] : [])] : []));
        } else {
          const t = id === 'pGames' ? 'likes' : 'want', w = widgetsOf(x).find((v) => v && v.t === t && Array.isArray(v.g) && v.g.length);
          box.replaceChildren(...(w ? [el('button', { className: 'pc-row pc-games', title: id === 'pGames' ? 'See the Board' : 'See the Wishlist', onclick: () => onTab(id === 'pGames' ? 'board' : 'wishlist') },
            el('span', { className: 'pc-l' }, id === 'pGames' ? 'Game Collection' : 'Wishlist'), el('span', { className: 'p-gc-ic' }, ...w.g.slice(0, 3).map((g) => gameTile(g)),
              w.g.length > 3 ? el('span', { className: 'p-gc-n' }, '+' + (w.g.length - 3)) : null))] : []));
        }
      }
    };
    fill(Store.extrasNow(xid));
    Store.profileExtras(xid).then((x) => { if (later[0][1].isConnected) fill(x); }, () => {});
  }
  return out;
}
// the top of a profile card, as the DM profile has it: their picture (with their status) under the banner, and beside it
// their name, username and pronouns, and their bubble
function profileHead(u, { size = 72, onOpen = null, self = isMe(u), name = null, note = null } = {}) {
  const av = el(onOpen ? 'button' : 'div', { className: 'pc-av', title: onOpen ? 'View Full Profile' : '', ...(onOpen ? { onclick: onOpen } : {}) }, avatarEl(u, { size }));
  const nm = el(onOpen ? 'button' : 'div', { className: 'pc-name', ...(onOpen ? { onclick: onOpen, title: 'View Full Profile' } : {}) }, styledName(el('span', {}, name || u.name), u), u.bot ? el('span', { className: 'tag' }, 'bot') : null);
  return el('div', { className: 'pc-id' }, av, el('div', { className: 'pc-names' }, nm, note ? el('div', { className: 'pc-pro' }, note) : null, u.login && !u.bot ? el('div', { className: 'pc-login' }, u.login) : null,
    u.pronouns ? el('div', { className: 'pc-pro' }, u.pronouns) : null, bubbleEl(u, { mine: self })));
}
// the profile beside a DM (as TrixWotel drew it): their banner, picture, name, username and pronouns, then the parts of
// their profile, and View Full Profile and More (two buttons) at the bottom
function dmPanel(u) {
  const live = Store.kind === 'supabase';
  const banner = el('div', { className: 'dmp-banner' }); setBanner(banner, u.banner, u.color);
  const body = [];
  if (live && Store.blocked(u.id)) body.push(el('section', { className: 'pc-sec pc-blocked' }, icon('ban', 16), el('span', {}, 'You blocked them. ', el('button', { className: 'link-btn', onclick: () => unblockUser(u) }, 'Unblock'))));
  body.push(...profileParts(u, { onTab: (tab) => fullProfile(u, tab) }));
  if (!u.banner && u.id) Store.profileFull(u.id).then((p) => { if (p && p.banner && banner.isConnected) setBanner(banner, p.banner, u.color); }, () => {});
  const more = el('button', { className: 'dmp-more', title: 'More', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); profileMenu(u, r.right - 220, r.top - 8); } }, icon('more', 18));
  return withFrame(withEffect(themeCard(el('div', { className: 'dmp' }, el('div', { className: 'dmp-scroll' }, banner, profileHead(u, { onOpen: () => fullProfile(u) }), ...body),
    el('div', { className: 'dmp-foot' }, el('button', { className: 'dmp-full', onclick: () => fullProfile(u) }, 'View Full Profile'), more)), u.theme, u.color), u.effect), u.frame);
}

// the whole profile, floating over Fluentdat (as TrixWotel drew it): their card on the left (message them, befriend them,
// and the parts of their profile), and tabs on the right: Widget, Wishlist, Collection, Mutual Friends and Mutual Server
// (in the order and with the ones you chose in Customize)
let fullOpen = null;
const TAB_OF = { tWidget: 'board', tWish: 'wishlist', tCollection: 'collection', tFriends: 'friends', tServers: 'servers', tActivity: 'activity' };
function fullProfile(user, tab = null) {
  closePop(); if (fullOpen) fullOpen.close();
  const self = isMe(user), live = Store.kind === 'supabase';
  const u = self ? { ...asMember(), ...user, me: true, name: me.name, avatar: me.avatar, color: me.color, about: me.about, pronouns: me.pronouns, banner: me.banner, playing: me.playing || null,
    decoration: me.decoration || '', effect: me.effect || '', frame: me.frame || '', bubble: myBubble(), login: (Store.account() || {}).login || user.login } : user;
  const banner = el('div', { className: 'fp-banner' }); setBanner(banner, u.banner, u.color);
  const acts = el('div', { className: 'fp-acts' });
  const drawActs = () => {
    const s = friendState(u);
    acts.replaceChildren(...(self ? [el('button', { className: 'btn primary', onclick: () => { w.close(); openProfileEditor(); } }, icon('edit', 16), 'Edit Profile')] : [
      !u.bot ? el('button', { className: 'btn primary fp-msg', onclick: async () => { w.close(); await openDM(normFriend(u)); } }, icon('message', 16), 'Message') : null,
      !u.bot && s === 'none' && !(live && Store.blocked(u.id)) ? el('button', { className: 'btn fp-icon', title: 'Add Friend', onclick: async () => { await befriend(u); drawActs(); } }, icon('personAdd', 18)) : null,
      !u.bot && s === 'friend' ? el('button', { className: 'btn fp-icon', title: 'Friends', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu([{ label: 'Remove Friend', danger: true, action: async () => { await unfriend(u); drawActs(); } }], r.left, r.bottom + 6); } }, icon('userCheck', 18)) : null,
      !u.bot && s === 'outgoing' ? el('button', { className: 'btn fp-icon', title: 'Friend Request Sent (click to cancel)', onclick: async () => { await attempt(() => Store.cancelFriend(u.id)); renderAll(); drawActs(); } }, icon('clock', 18)) : null,
      !u.bot && s === 'incoming' ? el('button', { className: 'btn green', onclick: async () => { if ((await attempt(() => Store.acceptFriend(u.id))) !== null) toast(`You and ${u.name} are now friends!`); renderAll(); drawActs(); } }, 'Accept') : null,
      el('button', { className: 'btn fp-icon', title: 'More', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); profileMenu(u, r.left, r.bottom + 6, { full: true }); } }, icon('more', 18))]).filter(Boolean));
  };
  drawActs();
  const xid = u.bot ? null : self ? myXid() : live ? u.id : null;
  let extras = (xid && Store.extrasNow(xid)) || null, fetched = !xid;
  const parts = profileParts(u, { full: true, onTab: (t) => { if (tabs().some(([id]) => id === t) && tab !== t) { tab = t; draw(); } }, closeFirst: () => w.close() });
  const card = el('div', { className: 'fp-card2' }, banner, profileHead(u, { size: 96, self }), acts, ...parts);
  themeCard(card, u.theme, u.color); withEffect(card, u.effect);
  const leftBox = withFrame(el('div', { className: 'fp-lwrap' }, card), u.frame);          // (the frame stays put while the card scrolls)
  // the right side: tabs
  const right = el('div', { className: 'fp-right' });
  const ms = live && !self ? Store.mutualServerList(u.id) : [];
  let friends = null, theirs = null;
  const tabs = () => ordered('profileTabs').filter(shown).map((id) => [TAB_OF[id], labelOf('profileTabs', id)]).filter(([id]) =>
    (id === 'board' || id === 'activity' || id === 'wishlist') ? !!xid : id === 'collection' ? !u.bot && (self || live) : !self && live && !u.bot)
    .map(([id, label]) => [id, label, id === 'friends' ? (friends ? friends.length : null) : id === 'servers' ? ms.length : null]);
  if (!tabs().some(([id]) => id === tab)) tab = (tabs()[0] || [])[0] || null;
  const tabsEl = el('nav', { className: 'fp-tabs', role: 'tablist' }), list = el('div', { className: 'fp-list' });
  // (your own: changes show at once, then as the database kept them)
  const save = async (patch) => {
    extras = { ...(extras || { connections: [], widgets: [], activity: [] }), ...patch }; draw(false);
    const r = await attempt(() => Store.setProfileExtras(patch));
    extras = r || Store.extrasNow(xid) || extras; if (fullOpen === w) draw(false);
  };
  // their Collection: a log of what they got and when, newest first: things from the Shop (bought, traded, a Quest's
  // reward, kept from before the Shop) and their badges (the ones they show)
  let colShow = 'all';
  const collectionView = () => {
    if (!self && theirs === null) return [el('div', { className: 'fp-empty' }, 'Loading…')];
    // (things: yours signed out have the times your wallet wrote down)
    let things = self ? Bux.owned() : theirs || [];
    if (self && Store.kind !== 'supabase') {
      const at = {}, log = localWallet().log || [];
      for (const h of log) if (h.kind === 'buy') { const [k, i] = String(h.note || '').split(':'); if (k === 'bundle') { const bd = BUNDLES.find((x) => x.id === i); for (const x of (bd ? bd.items : [])) at[x.k + ':' + x.i] = at[x.k + ':' + x.i] || h.at; } else at[k + ':' + i] = at[k + ':' + i] || h.at; }
      things = things.map((o) => ({ ...o, at: o.at || at[o.kind + ':' + o.item] || 0 }));
    }
    const stats = statsNow(u), log = (extras && extras.badgeLog) || {};
    const badges = stats ? (self ? badgesOf(stats, { all: true }).have : badgesOf(stats, badgePrefs(u)).shown) : [];
    const rows = [...(colShow === 'badges' ? [] : things.map((o) => ({ at: o.at || 0, o }))), ...(colShow === 'shop' ? [] : badges.map((b) => ({ at: Date.parse(log[b.id] || '') || 0, b })))]
      .sort((x, y) => (y.at || 0) - (x.at || 0));
    const chips = el('div', { className: 'fd-chips fp-log-chips' }, ...[['all', 'Everything'], ['shop', 'From the Shop'], ['badges', 'Badges']].map(([v, l]) =>
      el('button', { className: 'fd-chip' + (colShow === v ? ' on' : ''), onclick: () => { colShow = v; draw(false); } }, l)));
    if (!rows.length) return [chips, el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('collection', 34)),
      colShow === 'badges' ? (stats ? 'No badges yet.' : 'Loading…') : self ? 'Nothing yet: the Shop has decorations, fonts, effects, frames and nameplates.' : `${u.name} hasn’t got anything from the Shop yet.`)];
    const HOWS = { buy: 'Bought', trade: 'Traded for', grant: 'Kept from before the Shop', quest: 'A Quest’s reward' };
    const face = (kind, item) => kind === 'deco' ? avatarEl({ ...u, decoration: item, status: '' }, { size: 34 }) : kind === 'font' ? styleName(el('span', { className: 'fp-log-font' }, 'Aa'), { font: item })
      : kind === 'plate' ? plateMove(el('span', { className: 'fp-log-plate', style: `background:${paint('np:' + item)}` }), 'np:' + item, true) : el('span', { className: 'fp-log-ic' }, icon(kind === 'frame' ? 'frame' : 'sparkle', 18));
    const dayOf = (t) => { if (!t) return 'Before the log began'; const d = new Date(t), n = new Date(), y = new Date(Date.now() - 864e5);
      return d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };
    const out = [chips]; let day = null;
    for (const r of rows) {
      const d = dayOf(r.at); if (d !== day) { day = d; out.push(el('div', { className: 'fp-log-day' }, d)); }
      const time = r.at ? el('time', {}, new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) : null;
      out.push(r.o ? el('div', { className: 'fp-log', title: KIND_NAME[r.o.kind] || '' }, el('div', { className: 'fp-log-pv' }, face(r.o.kind, r.o.item)),
          el('div', { className: 'fp-log-t' }, el('b', {}, itemName(r.o.kind, r.o.item)), el('small', {}, `${HOWS[r.o.how] || 'Got'} · ${KIND_NAME[r.o.kind] || ''}`)), time)
        : el('button', { className: 'fp-log', title: badgeTitle(r.b), onclick: () => badgesDialog(u, r.b.id) }, el('div', { className: 'fp-log-pv' }, badgeIcon(r.b.id, 28)),
          el('div', { className: 'fp-log-t' }, el('b', {}, r.b.name), el('small', {}, `Badge · ${r.b.kind ? r.b.kind.name : 'Secret'} · ${r.b.rarity ? r.b.rarity[0] : ''}`)), time));
    }
    return out;
  };
  const draw = (anim = true) => {
    tabsEl.replaceChildren(...tabs().map(([id, label, n]) =>
      el('button', { className: id === tab ? 'on' : '', role: 'tab', ariaSelected: String(id === tab), onclick: () => { if (tab !== id) { tab = id; draw(); } } }, label, n != null ? el('span', { className: 'fp-n' }, String(n)) : null)));
    let rows;
    if (tab === 'board' || tab === 'activity' || tab === 'wishlist') {
      if (!fetched && !extras) rows = [el('div', { className: 'fp-empty' }, 'Loading…')];
      else rows = tab === 'board' ? boardView(extras, self, save) : tab === 'activity' ? activityView(u, extras, self, () => { u.playing = me.playing || null; draw(false); }) : wishlistView(extras, self, save);
    } else if (tab === 'collection') rows = collectionView();
    else if (tab === 'servers') rows = ms.length ? ms.map((sv) => el('button', { className: 'fp-row', onclick: () => { w.close(); go(sv.id); } }, serverFace(sv, 40),
      el('div', { className: 'fp-who' }, el('b', {}, sv.name), el('small', {}, plural(((Store.members(sv.id) || []).length), 'Member'))), icon('chevR', 18)))
      : [el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('compass', 34)), 'No servers in common.')];
    else if (!friends) rows = [el('div', { className: 'fp-empty' }, 'Loading…')];
    else rows = friends.length ? friends.map((f) => el('button', { className: 'fp-row', onclick: () => fullProfile(f) }, avatarEl(f, { size: 40 }),
      el('div', { className: 'fp-who' }, el('b', {}, f.name), el('small', {}, f.login || '')), icon('chevR', 18)))
      : [el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('users', 34)), 'No friends in common.')];
    list.replaceChildren(...rows);
    if (anim) { list.classList.remove('swap'); void list.offsetWidth; list.classList.add('swap'); }
  };
  if (tab) {
    right.append(tabsEl, list); draw();
    if (!self && live && !u.bot) Store.mutualFriends(u.id).then((f) => { friends = f; if (fullOpen === w) draw(false); }, () => { friends = []; if (fullOpen === w) draw(false); });
    if (!self && live && !u.bot && u.id && Store.canBux()) Store.ownedBy(u.id).then((o) => { theirs = o; if (fullOpen === w) draw(false); }, () => { theirs = []; if (fullOpen === w) draw(false); });
    // (their badges, for the Collection's log; yours go in it first)
    if (!u.bot) (self ? noteBadges().catch(() => {}).then(() => Store.profileExtras(myXid())).then((x) => { if (x) extras = x; }) : statsOf(u)).then(() => { if (fullOpen === w && tab === 'collection') draw(false); }, () => {});
    else theirs = [];
  } else right.append(el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('users', 34)), u.bot ? 'Nothing to show here.' : 'Sign in to see what you have in common.'));
  const w = modal({ cls: 'fp-dlg', body: [el('div', { className: 'fp' }, leftBox, right)], onClose: () => { if (fullOpen === w) fullOpen = null; } });
  fullOpen = w;
  w.box.prepend(el('button', { className: 'fp-x', title: 'Close', onclick: () => w.close() }, icon('x', 20)));
  if (!u.banner && u.id && !self) Store.profileFull(u.id).then((p) => { if (p && p.banner && banner.isConnected) setBanner(banner, p.banner, u.color); }, () => {});
  if (xid) Store.profileExtras(xid).then((x) => { extras = x; fetched = true; if (fullOpen === w) draw(false); }, () => { fetched = true; if (fullOpen === w) draw(false); });
  return w;
}
// what someone added to their profile, for a card: their connections (as icons) and the first games on their Board.
// sec(title, ...kids) makes a section the way that card does
const myXid = () => (Store.kind === 'supabase' ? Store.myId() : 'me');
function extrasBits(x, sec, onBoard) {
  const out = [], conns = (x && x.connections) || [];
  if (conns.length) out.push(sec('Connections', el('div', { className: 'p-conns' }, ...conns.map((c) => {
    const href = connectionLink(c), s = SERVICE[c.s] || { name: c.s }, title = `${s.name}: ${connectionLabel(c)}${c.v ? ' (verified)' : ''}`;
    const kids = [brandIcon(c.s, 18, { tile: true }), c.v ? el('span', { className: 'p-cv' }, icon('check', 9)) : null];
    return href ? el('a', { className: 'p-conn', href, target: '_blank', rel: 'noopener noreferrer', title }, ...kids) : el('span', { className: 'p-conn', title }, ...kids);
  }))));
  const w = widgetsOf(x).find((v) => v && Array.isArray(v.g) && v.g.length);
  if (w) out.push(sec((WIDGET[w.t] || { title: 'Games' }).title, el('button', { className: 'p-board', title: 'See their Board', onclick: onBoard },
    ...w.g.slice(0, 4).map((g) => gameTile(g)), w.g.length > 4 ? el('span', { className: 'p-more-n' }, '+' + (w.g.length - 4)) : null)));
  return out;
}
// one of someone's connections, on their profile (it opens their page there, when the service has one)
function connectionRow(c) {
  const href = connectionLink(c), s = SERVICE[c.s] || { name: '' };
  const kids = [brandIcon(c.s, 22, { tile: true }), el('span', { className: 'fp-conn-n' }, connectionLabel(c)),
    c.v ? el('span', { className: 'cx-v', title: `Verified: they sign in with this ${s.name} account` }, icon('verified', 16)) : null, href ? icon('external', 14) : null];
  return href ? el('a', { className: 'fp-conn', href, target: '_blank', rel: 'noopener noreferrer', title: `${s.name}: ${connectionLabel(c)}` }, ...kids)
    : el('div', { className: 'fp-conn', title: s.name }, ...kids);
}
// "Playing" with the game's cover and for how long
const playingRow = (p) => el('div', { className: 'p-play' }, gameTile(p), el('div', { className: 'p-play-t' }, el('b', {}, p.n),
  p.at && Date.parse(p.at) ? el('small', {}, 'for ' + lasted(Math.max(0, Date.now() - Date.parse(p.at)))) : null));

// ---------- a profile's Board (widgets), Activity and Wishlist, as on Discord ----------
const widgetsOf = (x) => (x && Array.isArray(x.widgets) ? x.widgets : []);
const WIDGET = Object.fromEntries(WIDGETS.map(([t, title, max]) => [t, { t, title, max }]));
// a game as a tile you can point at (and on your own profile, take away)
function gameCell(g, onRemove) {
  const c = el('div', { className: 'gc', title: g.n }, gameTile(g), el('span', { className: 'gc-n' }, g.n));
  if (onRemove) c.append(el('button', { className: 'gc-x', title: 'Remove', onclick: (e) => { e.stopPropagation(); onRemove(); } }, icon('x', 14)));
  return c;
}
function boardView(x, self, save) {
  const ws = widgetsOf(x), out = [];
  if (self) out.push(el('div', { className: 'bd-head' }, el('h3', {}, 'Your Widgets'), el('button', { className: 'btn bd-add', onclick: (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    menu(WIDGETS.map(([t, title]) => { const on = ws.some((w) => w.t === t); return { label: title, disabled: on, hint: on ? 'On your Board' : null, action: () => save({ widgets: [...ws, { t, g: [] }] }) }; }), r.left, r.bottom + 6);
  } }, icon('plus', 16), 'Add Widget')));
  if (!ws.length) out.push(el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('game', 34)), self ? 'Show off the games you love: add a widget.' : 'No widgets here yet.'));
  ws.forEach((w, i) => out.push(widgetCard(w, i, ws, self, save)));
  return out;
}
function widgetCard(w, i, ws, self, save) {
  const k = WIDGET[w.t] || { title: 'Games', max: 20 }, games = Array.isArray(w.g) ? w.g : [];
  const put = (g) => save({ widgets: ws.map((x, j) => (j === i ? { ...x, g } : x)) });
  const addGames = async () => { const picked = await pickGames({ title: k.max === 1 ? 'Your Favorite Game' : `Add to ${k.title}`, max: k.max - games.length, have: games }); if (picked.length) put([...games, ...picked].slice(0, k.max)); };
  const head = el('div', { className: 'wg-head' }, el('div', { className: 'wg-t' }, el('b', {}, k.title),
    el('small', {}, self ? (k.max === 1 ? 'Pick one game' : `Add up to ${k.max} games`) : plural(games.length, 'game'))));
  if (self) {
    if (games.length < k.max) head.append(el('button', { className: 'wg-btn', title: 'Add Games', onclick: addGames }, icon('plus', 18)));
    head.append(el('button', { className: 'wg-btn', title: 'More', onclick: (e) => {
      const r = e.currentTarget.getBoundingClientRect(), swap = (a, b) => { const l = ws.slice(); [l[a], l[b]] = [l[b], l[a]]; save({ widgets: l }); };
      menu([{ label: 'Move Up', disabled: i === 0, action: () => swap(i - 1, i) }, { label: 'Move Down', disabled: i === ws.length - 1, action: () => swap(i, i + 1) },
        '-', { label: 'Remove Widget', danger: true, action: () => save({ widgets: ws.filter((_, j) => j !== i) }) }], r.right - 190, r.bottom + 4);
    } }, icon('more', 18)));
  }
  const grid = el('div', { className: 'wg-games' + (w.t === 'fav' ? ' fav' : '') }, ...games.map((g, j) => gameCell(g, self ? () => put(games.filter((_, x) => x !== j)) : null)));
  if (self && !games.length) grid.append(el('button', { className: 'gc gc-add', onclick: addGames }, el('span', { className: 'gt' }, icon('plus', 26)), el('span', { className: 'gc-n' }, 'Add Games')));
  if (!self && !games.length) grid.append(el('div', { className: 'wg-none' }, 'Nothing here yet.'));
  return el('section', { className: 'wg' }, head, grid);
}
// the Wishlist: the Want to Play widget's games (adding to it puts that widget on the Board if it isn't yet)
function wishlistView(x, self, save) {
  const ws = widgetsOf(x), i = ws.findIndex((w) => w.t === 'want'), games = i >= 0 && Array.isArray(ws[i].g) ? ws[i].g : [];
  const put = (g) => save({ widgets: i >= 0 ? ws.map((w, j) => (j === i ? { ...w, g } : w)) : [...ws, { t: 'want', g }] });
  const add = async () => { const picked = await pickGames({ title: 'Add to your Wishlist', max: 20 - games.length, have: games }); if (picked.length) put([...games, ...picked].slice(0, 20)); };
  const out = [];
  if (self) out.push(el('div', { className: 'bd-head' }, el('h3', {}, 'Want to Play'), games.length < 20 ? el('button', { className: 'btn bd-add', onclick: add }, icon('plus', 16), 'Add Games') : null));
  if (!games.length) out.push(el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('bookmark', 34)), self ? 'Games you’d like to play go here, and on your Board.' : 'Nothing on the wishlist yet.'));
  else out.push(el('div', { className: 'wg-games' }, ...games.map((g, j) => gameCell(g, self ? () => put(games.filter((_, k) => k !== j)) : null))));
  return out;
}
// Activity: what they're playing now and lately (you add your own: a web page can't see your games)
const PLATFORMS = ['steam', 'playstation', 'xbox', 'twitch', 'battlenet', 'leagueoflegends', 'epicgames', 'riot', 'roblox', 'spotify', 'youtube', 'crunchyroll'];
function activityView(u, x, self, after) {
  const p = self ? me.playing : u.playing, now = playingNow(p) ? p : null;
  const recent = ((x && x.activity) || []).filter((g) => g && g.n && !(now && sameGame(g, now))).slice(0, 8);
  const pick = async () => { const [g] = await pickGames({ title: 'What are you playing?', max: 1 }); if (g) { setPlaying(g); after(); } };
  const out = [];
  if (now) out.push(el('div', { className: 'ac-now' }, gameTile(now, { big: true }), el('div', { className: 'ac-what' }, el('small', {}, 'Playing'), el('b', {}, now.n),
    now.at && Date.parse(now.at) ? el('span', {}, 'for ' + lasted(Math.max(0, Date.now() - Date.parse(now.at)))) : null,
    self ? el('div', { className: 'ac-acts' }, el('button', { className: 'btn small', onclick: () => { setPlaying(null); after(); } }, 'Stop Playing'), el('button', { className: 'btn small ghost', onclick: pick }, 'Something Else')) : null)));
  else if (self && recent.length) out.push(el('div', { className: 'ac-acts' }, el('button', { className: 'btn small', onclick: pick }, icon('game', 15), 'Add Game')));
  if (recent.length) out.push(el('h4', { className: 'ac-h' }, 'Recently Played'), ...recent.map((g) => el('div', { className: 'ac-row' }, gameTile(g),
    el('div', { className: 'ac-what' }, el('b', {}, g.n), g.at && Date.parse(g.at) ? el('small', {}, when(Date.parse(g.at), true)) : null),
    self ? el('button', { className: 'btn small ghost', onclick: () => { setPlaying(g); after(); } }, 'Play') : null)));
  if (!out.length) out.push(self ? el('div', { className: 'ac-empty' }, el('h3', {}, 'You don’t have any activity here'),
    el('p', {}, 'Say what you’re playing and it shows under your name, like on Discord. (A web page can’t see your games, so you add them yourself.)'),
    el('div', { className: 'ac-brands' }, ...PLATFORMS.map((id) => brandIcon(id, 30))),
    el('div', { className: 'ac-acts' }, el('button', { className: 'btn', onclick: () => { if (fullOpen) fullOpen.close(); openUserSettings('connections'); } }, 'Connect Accounts'), el('button', { className: 'btn', onclick: pick }, 'Add Game')))
    : el('div', { className: 'fp-empty' }, el('div', { className: 'fp-empty-ic' }, icon('game', 34)), 'Nothing to show here yet.'));
  return out;
}
// pick games: Fluentdat's popular ones, any game Wikidata knows, or one you add yourself (a name, and a picture if you
// like). Resolves to the games picked (none if you cancel)
function pickGames({ title = 'Add Games', max = 20, have = [] } = {}) {
  return new Promise((done) => {
    if (max < 1) { toast('That’s full: take a game away first.'); done([]); return; }
    const chosen = [], had = (g) => have.some((h) => sameGame(h, g));
    const q = el('input', { type: 'search', className: 'gp-q', placeholder: 'Search for a game', autocomplete: 'off', spellcheck: false });
    const say = el('div', { className: 'gp-say' }), grid = el('div', { className: 'gp-grid' });
    const count = el('span', { className: 'gp-count' }), add = el('button', { className: 'btn primary', disabled: true }, 'Add');
    // (or browse Wikipedia's lists of PC games, a letter at a time)
    const letters = el('div', { className: 'gp-letters', title: 'Wikipedia’s lists of PC games' }, el('span', {}, 'Browse'), ...LETTERS.map((L) => el('button', { className: 'gp-letter', onclick: () => browse(L) }, L)));
    let shown = [], seq = 0, timer = 0;
    const tally = () => { count.textContent = chosen.length ? `${chosen.length} picked` : max === 1 ? 'Pick one' : `Up to ${max}`; add.disabled = !chosen.length; };
    // (a game's cell: picking it changes just that cell, so the pictures don't load again)
    const cell = (g) => {
      const was = had(g);
      const b = el('button', { className: 'gp-cell' + (chosen.some((h) => sameGame(h, g)) ? ' on' : ''), disabled: was, title: was ? 'Already there' : g.d ? `${g.n} — ${g.d}` : g.n },
        gameTile(g), el('span', { className: 'gp-n' }, g.n), el('span', { className: 'gp-tick' }, icon('check', 14)));
      b.onclick = () => {
        const i = chosen.findIndex((h) => sameGame(h, g));
        if (i >= 0) chosen.splice(i, 1);
        else if (max === 1) { chosen.splice(0, chosen.length, g); for (const o of grid.querySelectorAll('.gp-cell.on')) o.classList.remove('on'); }
        else if (chosen.length >= max) return toast(`You can add ${max} more.`);
        else chosen.push(g);
        b.classList.toggle('on', chosen.some((h) => sameGame(h, g))); tally();
      };
      return b;
    };
    const paint = () => { grid.replaceChildren(...shown.map(cell)); grid.scrollTop = 0; tally(); };
    const lit = (L) => { for (const b of letters.querySelectorAll('.gp-letter')) b.classList.toggle('on', b.textContent === L); };
    function browse(L) {
      q.value = ''; lit(L); const mine = ++seq;
      shown = []; say.textContent = `Loading Wikipedia’s list of PC games (${L})…`; paint();
      gamesByLetter(L).then((list) => { if (mine !== seq) return; shown = list; say.textContent = `${list.length} games from Wikipedia’s “List of PC games (${L})”`; paint(); },
        () => { if (mine === seq) say.textContent = 'Couldn’t load that list just now. Try again in a moment.'; });
    }
    const run = () => {
      const text = q.value.trim(), mine = ++seq, local = text ? localGames(text) : POPULAR.slice(0, 36);
      lit('');
      shown = local; say.textContent = !text ? 'Popular games' : text.length < 2 ? '' : 'Searching every game on Wikipedia…'; paint();
      clearTimeout(timer);
      if (text.length < 2) return;
      timer = setTimeout(() => searchGames(text).then((found) => {
        if (mine !== seq) return;
        shown = [...local, ...found.filter((g) => !local.some((h) => sameGame(h, g)))];
        say.textContent = shown.length ? '' : 'No game by that name on Wikipedia. Add it yourself below.'; paint();
      }, () => { if (mine === seq) say.textContent = 'Couldn’t search Wikipedia just now. The popular ones still work, or add it yourself below.'; }), 320);
    };
    q.oninput = run;
    let pic = '';
    const ownName = el('input', { type: 'text', maxLength: 80, placeholder: 'The game’s name' });
    const picBtn = el('button', { className: 'btn small', type: 'button' }, icon('image', 15), el('span', {}, 'Add a Picture'));
    picBtn.onclick = () => pickFile(async (f) => { try { pic = await shrink(f, 200, 268, 36000); picBtn.lastChild.textContent = 'Picture Added'; } catch (e) { toast(String((e && e.message) || e)); } });
    const ownAdd = el('button', { className: 'btn small primary', type: 'button' }, 'Add');
    ownAdd.onclick = () => {
      const g = cleanGame({ n: ownName.value, i: pic }); if (!g) return ownName.focus();
      if (had(g)) return toast('That one’s there already.');
      shown = [g, ...shown.filter((h) => !sameGame(h, g))];
      if (max === 1) chosen.splice(0, chosen.length, g); else if (chosen.length < max && !chosen.some((h) => sameGame(h, g))) chosen.push(g);
      ownName.value = ''; pic = ''; picBtn.lastChild.textContent = 'Add a Picture'; paint();
    };
    ownName.addEventListener('keydown', (e) => { if (e.key === 'Enter') ownAdd.click(); });
    const own = el('details', { className: 'gp-own' }, el('summary', {}, 'Can’t find it? Add it yourself'), el('div', { className: 'gp-own-row' }, ownName, picBtn, ownAdd));
    const m = modal({ title, cls: 'gp-dlg', body: [q, letters, say, grid, own], actions: [count, el('span', { style: 'flex:1' }), el('button', { className: 'btn', onclick: () => m.close(null) }, 'Cancel'), add],
      onClose: (v) => done(Array.isArray(v) ? v : []) });
    add.onclick = () => m.close(chosen.map(cleanGame).filter(Boolean));
    run(); setTimeout(() => q.focus(), 0);
  });
}

// your own account popout (click your avatar in the user panel), as on Discord: your card (laid out as every profile card
// is: your picture, name, status bubble, badges, About and games), then Edit Profile, your status, Badges and Quests, then
// Switch Accounts and Copy User ID
function showAccount(anchor) {
  closePop();
  const u = asMember(), live = Store.kind === 'supabase', st = me.status || 'online', ready = questsReady();
  const row = (ic, label, extra, onclick) => el('button', { onclick }, typeof ic === 'string' ? icon(ic) : ic, el('span', { className: 'grow' }, label), extra || null);
  const chev = () => el('span', { className: 'chev' }, icon('chevR', 16));
  const toFull = () => { closePop(); fullProfile(u, 'board'); };
  const card1 = el('div', { className: 'card' },
    row('edit', 'Edit Profile', null, () => { closePop(); openProfileEditor(); }),
    row(el('span', { className: 'sdot ' + st }), (STATUSES.find((x) => x[0] === st) || [, 'Online'])[1],
      el('span', { className: 'acct-st' }, me.statusUntil && st !== 'online' ? el('small', {}, 'until ' + when(me.statusUntil, true)) : null, st === 'dnd' ? icon('bellOff', 15) : null, chev()), (e) => { e.stopPropagation(); statusMenu(e.currentTarget); }),
    row('medal', 'Badges', null, () => { closePop(); badgesDialog(u); }),
    row('quest', 'Quests', el('span', { className: 'acct-st' }, ready ? el('span', { className: 'mbadge' }, String(ready)) : null, chev()), () => { closePop(); view = 'home'; dmId = null; homePage = 'quests'; renderAll(); }),
    buxReady() ? row('coin', labelOf('dmNav', 'datbuxNav'), el('span', { className: 'acct-st' }, buxTag(Bux.wallet().balance), chev()), () => { closePop(); view = 'home'; dmId = null; homePage = 'datbux'; renderAll(); }) : null);
  const card2 = el('div', { className: 'card' },
    row('palette', 'Customize', null, () => { closePop(); openCustomize(); }),
    row('users', 'Switch Accounts', chev(), (e) => { e.stopPropagation(); switchMenu(e.currentTarget); }),
    row('id', 'Copy User ID', null, () => { closePop(); copyText(String(live ? Store.myId() : me.id), 'User ID copied.'); }));
  const banner = el('div', { className: 'banner-c' }); setBanner(banner, me.banner, me.color);
  const you = { ...u, login: live ? (Store.account() || {}).login || '' : '' };
  pop = el('div', { className: 'pop acct' }, banner,
    el('div', { className: 'inner pc-inner' }, profileHead(you, { onOpen: toFull, self: true }),
      ...profileParts(you, { only: ['pBadges', 'pBio', 'pPlaying', 'pGames', 'pWish'], onTab: (tab) => { closePop(); fullProfile(u, tab); }, closeFirst: () => closePop() }), card1, card2));
  themeCard(pop, me.theme, me.color); withEffect(pop, me.effect); withFrame(pop, me.frame);
  document.body.append(pop); placePop(anchor);
}
// your status (Discord's): online, idle, Do Not Disturb or invisible, for a while or until you change it; and your bubble
const STATUS_COLOR = { online: '#3ba55d', idle: '#faa81a', dnd: '#ed4245', invisible: '#747f8d' };
const STATUS_FOR = [['For 15 Minutes', 9e5], ['For 1 Hour', 36e5], ['For 8 Hours', 288e5], ['For 24 Hours', 864e5], ['For 3 Days', 2592e5], ['Forever', 0]];
function setStatus(id, ms = 0) { me.status = id; me.statusUntil = ms ? Date.now() + ms : 0; saveMe(); pushProfile(); closePop(); renderMe(); renderMembers(); }
function statusMenu(anchor) {
  const r = anchor.getBoundingClientRect();
  menu([...STATUSES.map(([id, label]) => ({ label, color: STATUS_COLOR[id], hint: id === 'dnd' ? 'You won’t get desktop notifications' : id === 'invisible' ? 'You’ll look offline, but can use Fluentdat as usual' : null,
      ...(id === 'online' ? { action: () => setStatus('online') } : { sub: () => STATUS_FOR.map(([l, ms]) => ({ label: l, action: () => setStatus(id, ms) })) }) })),
    '-', { label: myBubble() ? 'Edit Custom Status' : 'Set Custom Status', icon: 'smile', action: () => bubbleDialog() },
    myBubble() && { label: 'Clear Custom Status', icon: 'x', action: () => { me.bubble = ''; me.bubbleUntil = 0; saveMe(); pushProfile(); closePop(); renderAll(); } }], r.right + 8, r.top - 6);
}
// Switch Accounts: who you're signed in as, and signing in as someone else
function switchMenu(anchor) {
  const r = anchor.getBoundingClientRect(), live = Store.kind === 'supabase', acc = live ? Store.account() || {} : null;
  menu([{ label: live ? '@' + (acc.login || 'you') : me.name, hint: live ? 'Signed in here' : 'Kept in this browser (not signed in)', check: true, action: () => {} },
    '-', live ? { label: 'Log In to Another Account', icon: 'personAdd', action: async () => {
      if (!(await confirmBox({ title: 'Log In to Another Account', text: 'You’ll be signed out here first. Sign back in as yourself any time.', ok: 'Sign Out and Continue' }))) return;
      closePop(); await Store.signOut(); renderAll(); signInDialog(() => renderAll(), 'Sign in to Fluentdat');
    } } : { label: 'Sign In', icon: 'personAdd', action: () => { closePop(); signInDialog(() => renderAll(), 'Sign in to Fluentdat'); } }], r.right + 8, r.top - 6);
}
// (a status or a bubble you set for a while goes back on its own)
setInterval(() => {
  const now = Date.now();
  if (me.statusUntil && now >= me.statusUntil) { me.status = 'online'; me.statusUntil = 0; saveMe(); pushProfile(); renderMe(); renderMembers(); }
  if (me.bubble && me.bubbleUntil && now >= me.bubbleUntil) { me.bubble = ''; me.bubbleUntil = 0; saveMe(); pushProfile(); renderMembers(); }
}, 30000);

// ---------- sending, commands, bot ----------
function target() { return view === 'home' ? { send: (m) => Store.sendDM(dmId, m), bot: (Store.dmUser(dmId) || {}).bot } : { send: (m) => Store.send(channelId, m), bot: false }; }
const postMine = (extra) => target().send({ user: stamp(), ...extra });
let uploading = false;
async function send() {
  const inp = $('#input'), raw = inp.value.trim(), place = placeNow();
  if (!place) return;
  const d = draft(place), files = d.files.slice();
  if (!raw && !files.length) return;
  if (uploading) return toast('Still sending your files…');
  if (raw.startsWith('/') && view === 'server' && !files.length) { inp.value = ''; inp.style.height = 'auto'; return runCommand(raw.slice(1)); }
  const where = { dm: view === 'home', id: place }, reply = d.reply ? d.reply.id : null;
  const post = (msg) => (where.dm ? Store.sendDM(where.id, { user: stamp(), ...msg }) : Store.send(where.id, { user: stamp(), ...msg }));
  inp.value = ''; inp.style.height = 'auto'; d.reply = null; closeMentions();
  questTick('send');
  const text = withMentions(await withEmoji(raw, customEmoji).catch(() => raw));
  if (newLine.place === place) newLine = { place: null, at: 0 };
  if (!files.length) { post({ text, reply }); renderComposerExtras(); if (view === 'server') botReplies(raw); else if (target().bot) dmBot(raw); return; }
  // signed out: pictures go along as photo stickers in this browser
  if (Store.kind !== 'supabase') {
    d.files = []; renderComposerExtras();
    for (const f of files) { try { post({ sticker: { kind: 'img', data: await shrink(f.file, 1280, 1280, 380000), photo: true } }); } catch (e) { toast(String((e && e.message) || 'Couldn’t read that picture.')); } finally { if (f.url) URL.revokeObjectURL(f.url); } }
    if (text) post({ text, reply });
    return;
  }
  uploading = true;
  const out = [];
  try {
    for (const f of files) {
      f.progress = 0; renderComposerExtras();
      const extra = f.kind === 'image' ? { kind: 'image', ...(await pictureSize(f.file)) } : { kind: f.kind };
      out.push(await Store.uploadFile(where, f.file, (x) => { f.progress = x; const bar = document.querySelector(`#attach-tray .pend[data-id="${f.id}"] .pend-prog i`); if (bar) bar.style.width = Math.round(x * 100) + '%'; }, extra));
    }
  } catch (e) {
    uploading = false;
    for (const f of files) f.progress = null;
    if (!inp.value) inp.value = raw;
    toast(String((e && e.message) || e)); renderComposerExtras();
    return;
  }
  uploading = false;
  d.files = d.files.filter((f) => !files.includes(f));
  for (const f of files) if (f.url) URL.revokeObjectURL(f.url);
  post({ text: text || null, reply, files: out });
  renderComposerExtras();
}
// @handle → <@their id>, for the people who can see this conversation (what Discord does when you pick someone)
function withMentions(raw) {
  if (Store.kind !== 'supabase' || !raw.includes('@')) return raw;
  const ids = new Map(mentionPeople().filter((p) => p.login).map((p) => [p.login.toLowerCase(), p.id]));
  return raw.replace(/(^|[^\w@<`])@([a-z0-9_]{1,24})\b/gi, (all, pre, h) => { const id = ids.get(h.toLowerCase()); return id ? `${pre}<@${id}>` : all; });
}
function mentionPeople() {
  if (view === 'server') return (Store.members(serverId) || []).filter((m) => !m.bot);
  const d = Store.dmInfo ? Store.dmInfo(dmId) : null;
  return d ? d.people : [];
}
// ---------- replying ----------
function startReply(m) {
  const place = placeNow(); if (!place || m.call) return;
  draft(place).reply = { id: m.id, name: m.user.name, color: nameColor(m.user) };
  renderComposerExtras(); $('#input').focus();
}
// ---------- @mentions: a list of people as you type @ ----------
let mentionHits = [], mentionSel = 0, hitKind = 'people', emojiAsk = 0;
function mentionQuery() {
  const i = $('#input'), upto = i.value.slice(0, i.selectionStart), m = upto.match(/(^|\s)@([\w.]{0,32})$/);
  return m ? { q: m[2].toLowerCase(), start: i.selectionStart - m[2].length - 1 } : null;
}
// :sm (two letters or more) suggests emoji, this server's own first, as Discord does
function emojiQuery() {
  const i = $('#input'), upto = i.value.slice(0, i.selectionStart), m = upto.match(/(^|[\s(]):([A-Za-z0-9_+-]{2,32})$/);
  return m ? { q: m[2].toLowerCase(), start: i.selectionStart - m[2].length - 1 } : null;
}
function closeMentions() { mentionHits = []; emojiAsk++; $('#mention-pop').hidden = true; }
const markHit = () => [...$('#mention-pop').querySelectorAll('.mp-row')].forEach((b, i) => b.classList.toggle('on', i === mentionSel));
async function updateEmojiHits() {
  const eq = emojiQuery(); if (!eq) return closeMentions();
  const ask = ++emojiAsk, here = view === 'server' ? serverId : null;
  const mine = Store.kind === 'supabase' ? Store.emojiAll().filter((e) => e.name.toLowerCase().includes(eq.q))
    .sort((a, b) => (b.server === here) - (a.server === here) || b.name.toLowerCase().startsWith(eq.q) - a.name.toLowerCase().startsWith(eq.q) || a.name.length - b.name.length).slice(0, 4) : [];
  let std = []; try { std = await findEmoji(eq.q, 10 - mine.length); } catch {}
  if (ask !== emojiAsk) return;
  mentionHits = [...mine.map((c) => ({ custom: c, name: c.name })), ...std.map((x) => ({ emoji: x.emoji, name: x.name }))];
  if (!mentionHits.length) return closeMentions();
  hitKind = 'emoji'; mentionSel = Math.min(mentionSel, mentionHits.length - 1);
  const pop = $('#mention-pop');
  pop.replaceChildren(el('div', { className: 'mp-head' }, 'Emoji matching ', el('b', {}, ':' + eq.q)), ...mentionHits.map((h, i) => el('button', { className: 'mp-row' + (i === mentionSel ? ' on' : ''),
    onmousedown: (e) => { e.preventDefault(); pickMention(i); }, onmousemove: () => { if (mentionSel !== i) { mentionSel = i; markHit(); } } },
    h.custom ? el('img', { className: 'mp-emoji', src: safeImg(h.custom.url), alt: '' }) : el('span', { className: 'mp-emoji' }, h.emoji),
    el('span', { className: 'mp-name' }, ':' + h.name + ':'), el('span', { className: 'mp-sub' }, h.custom ? (Store.server(h.custom.server) || {}).name || '' : ''))));
  pop.hidden = false;
}
// / at the start of a message in a server: (for the people who run Fluentdat) TrixWotel's commands, then Flubot's
function commandQuery() {
  const i = $('#input'), m = view === 'server' ? i.value.slice(0, i.selectionStart).match(/^\/([a-z]{0,12})$/i) : null;
  return m ? m[1].toLowerCase() : null;
}
function updateCommandHits(q) {
  hitKind = 'cmd'; emojiAsk++;
  mentionHits = [...(staffOn() ? STAFF_CMDS.map(([c, sub]) => ({ cmd: c, sub, staff: true })) : []), ...FLUBOT_CMDS.map(([c, sub]) => ({ cmd: c, sub }))].filter((h) => h.cmd.slice(1).startsWith(q));
  if (!mentionHits.length) return closeMentions();
  mentionSel = Math.min(mentionSel, mentionHits.length - 1);
  const firstStaff = mentionHits.findIndex((h) => h.staff), firstBot = mentionHits.findIndex((h) => !h.staff);
  $('#mention-pop').replaceChildren(...mentionHits.flatMap((h, i) => [
    ...(i === firstStaff ? [el('div', { className: 'mp-head' }, 'TrixWotel Commands · only you have these')] : []), ...(i === firstBot ? [el('div', { className: 'mp-head' }, 'Flubot')] : []),
    el('button', { className: 'mp-row' + (i === mentionSel ? ' on' : ''), onmousedown: (e) => { e.preventDefault(); pickMention(i); }, onmousemove: () => { if (mentionSel !== i) { mentionSel = i; markHit(); } } },
      el('span', { className: 'mp-at' }, icon(h.staff ? 'shield' : 'bot', 16)), el('span', { className: 'mp-name' }, h.cmd), el('span', { className: 'mp-sub' }, h.sub))]));
  $('#mention-pop').hidden = false;
}
function updateMentions() {
  const cq = commandQuery(); if (cq !== null) return updateCommandHits(cq);
  const pop = $('#mention-pop'), mq = Store.kind === 'supabase' ? mentionQuery() : null;
  if (!mq) return updateEmojiHits();
  hitKind = 'people'; emojiAsk++;
  const can = view === 'server' && Store.can(channelId, 'mention_everyone');
  const people = mentionPeople().filter((p) => !mq.q || String(p.name || '').toLowerCase().includes(mq.q) || String(p.login || '').toLowerCase().startsWith(mq.q)).slice(0, 8);
  const specials = can ? [['everyone', 'Notify everyone who can see this channel.'], ['here', 'Notify everyone online who can see this channel.']].filter(([n]) => n.startsWith(mq.q)).map(([n, sub]) => ({ special: n, name: n, sub })) : [];
  mentionHits = [...people, ...specials];
  if (!mentionHits.length) return closeMentions();
  mentionSel = Math.min(mentionSel, mentionHits.length - 1);
  pop.replaceChildren(el('div', { className: 'mp-head' }, 'Members'), ...mentionHits.map((p, i) => el('button', { className: 'mp-row' + (i === mentionSel ? ' on' : ''),
    onmousedown: (e) => { e.preventDefault(); pickMention(i); }, onmousemove: () => { if (mentionSel !== i) { mentionSel = i; markHit(); } } },
    p.special ? el('span', { className: 'mp-at' }, '@') : avatarEl(face(p), { size: 24 }), el('span', { className: 'mp-name' }, p.special ? '@' + p.name : p.name),
    el('span', { className: 'mp-sub' }, p.special ? p.sub : p.login || ''))));
  pop.hidden = false;
}
function pickMention(i) {
  const p = mentionHits[i], inp = $('#input'); if (!p) return;
  if (hitKind === 'cmd') { inp.value = p.cmd.split(' ')[0] + ' '; inp.setSelectionRange(inp.value.length, inp.value.length); }
  else if (hitKind === 'emoji') {
    const eq = emojiQuery(); if (!eq) return closeMentions();
    if (p.custom) pickedEmoji.set(p.custom.name, p.custom);
    noteUse(p.custom ? 'c:' + p.custom.id : p.emoji);
    inp.setRangeText((p.custom ? `:${p.custom.name}:` : p.emoji) + ' ', eq.start, inp.selectionStart, 'end');
  } else {
    const mq = mentionQuery(); if (!mq) return;
    inp.setRangeText('@' + (p.special || p.login || p.name) + ' ', mq.start, inp.selectionStart, 'end');
  }
  closeMentions(); inp.focus(); inp.dispatchEvent(new Event('input'));
}
// ---------- formatting: ⌘B / Ctrl+B and friends, and Discord's little bar when you select text ----------
const MARKS = { b: '**', i: '*', u: '__' };
function wrapSel(mark) {
  const i = $('#input'), a = i.selectionStart, b = i.selectionEnd, v = i.value;
  if (mark === '>') {                     // a quote: each selected line starts with "> "
    const s0 = v.lastIndexOf('\n', a - 1) + 1;
    i.setRangeText(v.slice(s0, b).split('\n').map((l) => (l.startsWith('> ') ? l.slice(2) : '> ' + l)).join('\n'), s0, b, 'select');
  } else if (v.slice(a - mark.length, a) === mark && v.slice(b, b + mark.length) === mark) {
    i.setRangeText(v.slice(a, b), a - mark.length, b + mark.length, 'select');          // (already wrapped: unwrap it)
  } else {
    i.setRangeText(mark + v.slice(a, b) + mark, a, b, 'select');
    i.setSelectionRange(a + mark.length, b + mark.length);
  }
  i.focus(); i.dispatchEvent(new Event('input')); updateFormatBar();
}
const FORMATS = [['bold', '**', 'Bold'], ['italic', '*', 'Italics'], ['underline', '__', 'Underline'], ['strike', '~~', 'Strikethrough'], ['code', '`', 'Code'], ['eyeOff', '||', 'Spoiler'], ['quote', '>', 'Quote']];
function updateFormatBar() {
  const i = $('#input'), bar = $('#format-bar');
  const on = prefs.formatBar !== 'off' && document.activeElement === i && i.selectionStart !== i.selectionEnd;
  if (on && !bar.childElementCount) bar.append(...FORMATS.map(([ic, mk, t]) => el('button', { title: t, onmousedown: (e) => { e.preventDefault(); wrapSel(mk); } }, icon(ic, 18))));
  bar.hidden = !on;
}
// ---------- voice messages ----------
let rec = null;
async function startVoice() {
  if (Store.kind !== 'supabase') return toast('Sign in to send voice messages, so they’re kept for the others.');
  if (rec) return;
  const place = placeNow(); if (!place) return;
  const where = { dm: view === 'home', id: place };
  const bar = $('#rec-bar'), time = el('span', { className: 'rec-time' }, '0:00'), lvl = el('div', { className: 'rec-wave' });
  let r;
  try { r = await record({ getMedia: TEST_MEDIA, onTick: ({ secs, level }) => { time.textContent = clock(secs); if (lvl.childElementCount > 60) lvl.firstChild.remove(); lvl.append(el('i', { style: `height:${Math.max(8, Math.round(level * 100))}%` })); } }); }
  catch (e) { return toast(e && e.name ? mediaTrouble(e) : String((e && e.message) || e)); }
  rec = { r, where, reply: draft(place).reply ? draft(place).reply.id : null };
  bar.replaceChildren(el('button', { className: 'rec-x', title: 'Delete', onclick: () => stopVoice(false) }, icon('trash', 18)), el('span', { className: 'rec-dot' }), time, lvl,
    el('button', { className: 'rec-send', title: 'Send', onclick: () => stopVoice(true) }, icon('send', 18)));
  $('#composer').classList.add('recording'); bar.hidden = false;
}
async function stopVoice(sendIt) {
  const cur = rec; if (!cur) return;
  rec = null; $('#composer').classList.remove('recording'); $('#rec-bar').hidden = true; $('#rec-bar').replaceChildren();
  if (!sendIt) return cur.r.cancel();
  const v = await cur.r.stop();
  if (!v || v.secs < 0.5) return toast('That was too short to send.');
  try {
    const f = await Store.uploadFile(cur.where, new File([v.blob], `voice-message.${extFor(v.type)}`, { type: v.type }), null, { kind: 'voice', secs: v.secs, wave: v.wave });
    const msg = { user: stamp(), files: [f], reply: cur.reply };
    if (cur.where.dm) Store.sendDM(cur.where.id, msg); else Store.send(cur.where.id, msg);
    if (cur.reply) { draft(cur.where.id).reply = null; renderComposerExtras(); }
  } catch (e) { toast(String((e && e.message) || e)); }
}
const botSay = (text) => view === 'home' ? Store.sendDM(dmId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text }) : Store.send(channelId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text });
function runCommand(line) {
  const [cmd, ...rest] = line.split(' '); const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case 'help': if (staffOn()) toast('Your TrixWotel Commands (only you see them): type / for the list.'); return botSay('Commands: `/me <action>`, `/shrug`, `/roll [n]`, `/flip`, `/nick <name>`, `/theme <name>`, `/clear`. Try `!ping` too.');
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
    case 'ban': case 'unban': case 'bans': case 'kick': case 'givebux': if (staffOn()) return staffCommand(cmd.toLowerCase(), rest.filter(Boolean));
    // falls through (they're TrixWotel's: nobody else has them)
    default: return botSay(`I don't know \`/${cmd}\`. Try \`/help\`.`);
  }
}
// TrixWotel's commands (for the people who run Fluentdat; the database checks): ban someone from all of Fluentdat, let them
// back in, see who's banned, take someone out of this server, and Datbux for you or anyone. What they say is only for you
// (a note, or a window), never a message in the channel
const FLUBOT_CMDS = [['/me <action>', 'Say what you’re doing, in italics'], ['/shrug', 'Adds ¯\\_(ツ)_/¯'], ['/roll [n]', 'Rolls a die (6 sides, or n)'], ['/flip', 'Flips a coin'],
  ['/nick <name>', 'Changes your display name'], ['/theme <name>', 'Switches your theme'], ['/clear', 'Clears this channel (admins)'], ['/help', 'Lists Flubot’s commands']];
const STAFF_CMDS = [['/ban @user [why]', 'Ban them from all of Fluentdat'], ['/unban @user', 'Let them back into Fluentdat'], ['/bans', 'Who’s banned from Fluentdat'],
  ['/kick @user', 'Take them out of this server'], ['/givebux <amount> [@user]', 'Datbux for you, or for them']];
const staffOn = () => Store.kind === 'supabase' && Store.isAppAdmin() && !!Store.canStaff && Store.canStaff();
async function staffCommand(cmd, words) {
  if (cmd === 'bans') return appBansDialog();
  if (cmd === 'givebux') {
    const n = Number(String(words[0] || '').replace(/[,_]/g, ''));
    if (!Number.isInteger(n) || n < 1 || n > 1e6) return toast('Say how many: /givebux 500 for you, or /givebux 500 @someone (1 to 1,000,000).');
    const u = words[1] ? await whoIs(words[1]) : { id: Store.myId(), name: me.name };
    if (!u) return toast(`There’s nobody called ${words[1]} on Fluentdat.`);
    const bal = await attempt(() => Store.staffGiveBux(u.id, n));
    if (bal !== null) { toast(u.id === Store.myId() ? `${fmtBux(n)} Datbux for you: you have ${fmtBux(bal)} now.` : `${u.name} got ${fmtBux(n)} Datbux.`); renderAll(); }
    return;
  }
  if (!words[0]) return toast(`Say who: /${cmd} @someone`);
  const u = await whoIs(words[0]);
  if (!u) return toast(`There’s nobody called ${words[0]} on Fluentdat.`);
  if (cmd === 'ban') return appBanFlow(u, words.slice(1).join(' '));
  if (cmd === 'unban') {
    const was = await attempt(() => Store.appUnban(u.id));
    if (was !== null) toast(was ? `${u.name} can use Fluentdat again.` : `${u.name} wasn’t banned.`);
    return;
  }
  const sv = Store.server(serverId), where = sv ? sv.name : 'this server';
  if (!(await confirmBox({ title: `Take ${u.name} out of ${where}?`, text: 'They can come back only with a new invite (or from Discover, if the server is public).', ok: 'Take Out', danger: true }))) return;
  const gone = await attempt(() => Store.staffKick(serverId, u.id));
  if (gone !== null) { toast(gone ? `${u.name} is out of ${where}.` : `${u.name} isn’t in ${where}.`); renderAll(); }
}
// someone by @handle (or <@id>, or their name): the people here first, then anyone on Fluentdat
async function whoIs(word) {
  const w = String(word || '').trim(), id = (w.match(/^<@([0-9a-f-]{36})>$/) || [])[1];
  if (id) return { ...person(id), id };
  const h = w.replace(/^@/, '').toLowerCase(); if (!h) return null;
  const here = mentionPeople();
  const found = here.find((x) => String(x.login || '').toLowerCase() === h) || here.find((x) => String(x.name || '').toLowerCase() === h);
  if (found) return found;
  try { return await Store.findUser(h); } catch { return null; }
}
// Ban from Fluentdat (/ban, or a profile's ⋯): why, if you like, then they can't do anything on Fluentdat until /unban
function appBanFlow(u, why = '') {
  const reason = el('textarea', { maxLength: 200, placeholder: 'Optional: why (they see this)', value: why.slice(0, 200) });
  const ban = el('button', { className: 'btn red', textContent: 'Ban' });
  ban.onclick = async () => {
    ban.disabled = true;
    if ((await attempt(() => Store.appBan(u.id, reason.value.trim()))) === null) { ban.disabled = false; return; }
    w.close(); toast(`${u.name} is banned from Fluentdat.`);
  };
  const w = modal({ title: `Ban ${u.name} from Fluentdat`, sub: `@${u.login || u.name} won’t be able to post, react, message, call, join or change anything, anywhere on Fluentdat, and sees only that they’re banned (and why), until you /unban them.`,
    body: [el('div', { className: 'field' }, el('label', {}, 'Reason'), reason)], actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), ban] });
}
// who's banned from Fluentdat (/bans, and Invites & Reports), each with Unban
function appBansDialog() {
  const list = el('div', { className: 'sx-list' });
  const m = modal({ title: 'Banned from Fluentdat', sub: 'Only the people who run Fluentdat see this.', body: [list], actions: [el('button', { className: 'btn primary', onclick: () => m.close() }, 'Done')] });
  fillAppBans(list);
}
async function fillAppBans(list) {
  list.replaceChildren(el('div', { className: 'it muted' }, 'Loading…'));
  let bans; try { bans = await Store.appBans(); } catch (e) { return list.replaceChildren(el('div', { className: 'it' }, String((e && e.message) || e))); }
  list.replaceChildren(...(bans.length ? bans.map((b) => el('div', { className: 'it' }, avatarEl(face(b), { size: 32 }),
    el('div', { className: 'who2' }, el('div', { className: 'n' }, `${b.name} (@${b.login})`), el('div', { className: 'h' }, `${b.reason ? '“' + b.reason + '” · ' : ''}banned ${dateLong(b.ts)}${b.by ? ' by @' + b.by : ''}`)),
    el('button', { className: 'btn small', onclick: async () => { if ((await attempt(() => Store.appUnban(b.id))) !== null) { toast(`${b.name} can use Fluentdat again.`); fillAppBans(list); } } }, 'Unban')))
    : [el('div', { className: 'it muted' }, 'Nobody is banned.')]));
}
function botReplies(text) { const t = text.toLowerCase(); if (t === '!ping') return setTimeout(() => botSay('pong 🏓'), 250); if (t === '!help') return setTimeout(() => botSay('I auto-reply to `!ping`. Slash commands like `/roll` work too.'), 250); if (/\b(hi|hello|hey)\b/.test(t) && Math.random() < 0.34) return setTimeout(() => botSay(`👋 Hey ${me.name}!`), 400); }
function dmBot(text) { const id = dmId; setTimeout(() => { if (dmId === id || true) Store.sendDM(id, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text: /\?$/.test(text) ? 'Good question — once accounts are in, you can ask real teammates here too.' : 'Got it 👍' }); }, 500); }

// ---------- emoji and stickers ----------
// The picker (picker.js): Stickers and Emoji tabs, each of your servers' own, your favorites and the ones you use most.
const STICKERS = ['🤖', '🎉', '🔥', '👍', '😂', '❤️', '🚀', '💯', '🙏', '👀', '✅', '⚡'];
const pickedEmoji = new Map();          // (a server emoji you picked, by name: which one it was, if two servers use the name)
// a server emoji by its :name: (the one you picked, else this server's, else any of yours): what :name: becomes when you send
function customEmoji(name) {
  if (Store.kind !== 'supabase') return null;
  const all = Store.emojiAll(), p = pickedEmoji.get(name);
  if (p && all.some((e) => e.id === p.id)) return p;
  const here = view === 'server' ? all.filter((e) => e.server === serverId) : [];
  return here.find((e) => e.name === name) || all.find((e) => e.name === name) || all.find((e) => e.name.toLowerCase() === name.toLowerCase()) || null;
}
const motionOff = () => !!prefs.reduceMotion;
function togglePicker(tab = 'stickers', anchor) {
  const open = document.querySelector('.xp:not(.out)');
  if (xpOpen()) { const was = open && open.dataset.tab; closeXp(); if (was === tab) return; }
  const live = Store.kind === 'supabase';
  openPicker({
    tab, anchor: anchor || (tab === 'emoji' ? composerBtn('emoji') : $('#sticker-btn')), still: motionOff(),
    servers: live ? Store.servers().map((sv) => ({ id: sv.id, name: sv.name, face: () => serverFace(sv, 24) })) : [],
    emojiOf: (sv) => Store.serverEmoji(sv), stickersOf: (sv) => Store.serverStickers(sv),
    own: Store.stickers(), builtin: STICKERS, safeImg,
    canManage: (sv) => Store.canManage(sv), manage: (sv, kind) => openServerSettings(sv, kind),
    onEmoji: (text, keep, c) => { if (c) pickedEmoji.set(c.name, c); const i = $('#input'); i.focus(); i.setRangeText(text, i.selectionStart, i.selectionEnd, 'end'); i.dispatchEvent(new Event('input')); if (keep) setTimeout(() => document.querySelector('.xp-q')?.focus(), 0); },
    onSticker: (s, sv) => postMine({ sticker: sv ? { kind: 'server', id: s.id, server: sv.id, name: s.name, path: s.path, animated: !!s.animated } : { kind: s.kind, data: s.data } }),
    onCreateOwn: createSticker,
    onRemoveOwn: async (s) => { if (await confirmBox({ title: 'Delete this sticker?', text: 'It’s one of your own; nobody else has it.', ok: 'Delete', danger: true })) { Store.removeSticker(s.id); togglePicker('stickers'); } },
  });
}
function createSticker() {
  closeXp(true);
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
      el('button', { className: 'btn primary', textContent: 'Save sticker', onclick: () => { if (imgData) Store.addSticker({ kind: 'img', data: imgData, name: name.value.trim() }); else if (emoji.value.trim()) Store.addSticker({ kind: 'emoji', data: emoji.value.trim(), name: name.value.trim() }); else return toast('Add an image or some text first.'); scrim.remove(); setTimeout(() => togglePicker('stickers'), 0); } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim);
}

// ---------- calls ----------
// A DM or group call rings the others (Supabase tells them, calls.js connects everyone); a voice channel you just join.
async function startDMCall(video) {
  if (Store.kind !== 'supabase') return toast('Calls need you signed in (Discord, GitHub or email), so the other person can pick up.');
  const place = dmId;
  if (!place) return;
  if (call && call.place === place) return goToCall();
  if (call) leaveCall();
  const id = await attempt(() => Store.startCall(place, video)); if (!id) return;
  await enterCall({ kind: 'dm', place, callId: id, video, outgoing: true });
}
async function joinDMCall(c) {
  if (call && call.callId === c.id) return goToCall();
  if (call) leaveCall();
  view = 'home'; dmId = c.dm;
  await enterCall({ kind: 'dm', place: c.dm, callId: c.id, video: false });
}
async function joinVoice(c) {
  if (Store.kind !== 'supabase') return toast('Voice channels need you signed in (Discord, GitHub or email), so others can hear you.');
  if (!Store.can(c.id, 'connect')) return toast('You don’t have permission to join this voice channel.');
  if (call && call.place === c.id) return;
  if (call) leaveCall();
  await enterCall({ kind: 'vc', place: c.id, server: c.server, video: false });
  if (call && call.place === c.id) questTick('voice');
}
let joining = false;
async function enterCall({ kind, place, server, callId, video, outgoing }) {
  if (joining) return;
  joining = true; renderVoicePanel();
  let api = null;
  try {
    api = await joinCall({ store: Store, topic: kind === 'dm' ? 'call:' + callId : 'vc:' + place, me: { id: Store.myId() }, video,
      mic: !prefs.micMuted && !prefs.deafened, deaf: !!prefs.deafened, silent: SILENT, getMedia: TEST_MEDIA, getScreen: TEST_SCREEN, onUpdate: () => callUpdate() });
  } catch (e) {
    toast(String((e && e.message) || e));
    if (kind === 'dm' && outgoing) Store.endCall(callId);
  }
  joining = false;
  if (!api) return renderAll();
  call = { api, kind, place, server, callId, outgoing, met: false, who: '', voiceKey: '' };
  if (api.self.warning) toast(api.self.warning);
  if (kind === 'dm' && outgoing) {
    startTone('calling');
    call.noAnswer = setTimeout(() => { if (call && call.callId === callId && !call.met) { toast('No answer.'); leaveCall(); } }, 45000);
  }
  callUpdate();
  renderAll();
}
// something in the call changed: someone came or went, talked, turned a camera on…
function callUpdate() {
  if (!call) return;
  const ppl = call.api.people(), me2 = call.api.self;
  if (!call.met && ppl.some((p) => p.connected)) { call.met = true; clearTimeout(call.noAnswer); stopTone(); }
  if (call.kind === 'dm' && call.met && !ppl.length) { toast('The call ended.'); return leaveCall(); }     // (everyone else has gone)
  if (call.kind === 'vc') {          // (what the others see under the voice channel)
    const v = { sv: call.server, ch: call.place, mic: me2.mic && !me2.deaf, deaf: me2.deaf, cam: me2.cam, screen: me2.screen }, key = JSON.stringify(v);
    if (key !== call.voiceKey) { call.voiceKey = key; Store.setVoice(v); }
  }
  const who = ppl.map((p) => p.uid + (p.connected ? '+' : '')).sort().join();
  if (who !== call.who) { call.who = who; renderSide(); renderTop(); renderRail(); }
  else if (view === 'server') renderSide();
  renderCall();
}
function leaveCall() {
  if (!call) return;
  const c = call; call = null;
  clearTimeout(c.noAnswer); stopTone();
  const alone = !c.api.people().length;
  c.api.leave();
  if (c.kind === 'dm' && alone) Store.endCall(c.callId);       // (the last one out ends it)
  if (c.kind === 'vc') Store.setVoice(null);
  callTiles.clear();
  renderAll();
}
addEventListener('pagehide', () => { if (call) leaveCall(); });

// someone's calling you (or a call you were rung for ended)
// (a trade offered to you, as it arrives)
if (Store.onTrade) Store.onTrade((t) => { toast(`${person(t.from).name} offered you a trade: see it in Datbux.`); renderAll(); });
Store.onCall(({ call: c, started }) => {
  if (CUSTOMIZE) return;
  if (c.mine) {
    if (c.ended && call && call.callId === c.id && !call.met) { toast('They didn’t pick up.'); leaveCall(); }
  } else if (started && !c.ended && Date.now() - c.ts < 60000 && !(call && call.callId === c.id)) ring(c);
  else if (c.ended && ringing && ringing.id === c.id) { stopRing(); toast(`Missed call from ${c.by.name}.`); }
  if (view === 'home' && dmId === c.dm) renderContent();
});
function ring(c) {
  if (ringing && ringing.id === c.id) return;
  ringing = c;
  const d = Store.dmInfo(c.dm), title = d && d.kind === 'group' ? dmName(d) : c.by.name;
  const box = $('#ring');
  box.replaceChildren(el('div', { className: 'ring-card' },
    el('div', { className: 'ring-av' }, d && d.kind === 'group' ? dmAvatar(d, 80) : avatarEl(face(c.by), { size: 80 })),
    el('div', { className: 'ring-name' }, title),
    el('div', { className: 'ring-sub' }, d && d.kind === 'group' ? `${c.by.name} is calling…` : c.video ? 'Incoming Video Call…' : 'Incoming Call…'),
    el('div', { className: 'ring-acts' },
      el('button', { className: 'ring-btn no', title: 'Decline', onclick: () => declineCall(c) }, icon('hangup', 22)),
      el('button', { className: 'ring-btn yes', title: 'Join with Video', onclick: () => acceptCall(c, true) }, icon('video', 22)),
      el('button', { className: 'ring-btn yes', title: 'Join Call', onclick: () => acceptCall(c, false) }, icon('phone', 22)))));
  box.hidden = false;
  startTone('ring');
  clearTimeout(ringTimer);
  ringTimer = setTimeout(() => { if (ringing && ringing.id === c.id) { stopRing(); toast(`Missed call from ${c.by.name}.`); } }, 45000);
  notifyDesktop(title, c.video ? 'Incoming video call' : 'Incoming call', () => { view = 'home'; dmId = c.dm; renderAll(); }, 'call-' + c.id);
}
function stopRing() { ringing = null; clearTimeout(ringTimer); stopTone(); const b = $('#ring'); b.hidden = true; b.replaceChildren(); }
async function acceptCall(c, video) {
  stopRing();
  if (call) leaveCall();
  view = 'home'; dmId = c.dm; renderAll();
  await enterCall({ kind: 'dm', place: c.dm, callId: c.id, video });
  if (video && call && !call.api.self.cam) call.api.setCam(true);
}
function declineCall(c) {
  stopRing();
  const d = Store.dmInfo(c.dm);
  if (d && d.kind === 'dm') Store.endCall(c.id);          // (just the two of you: the call's over, and the caller hears so)
}
// a ring (someone calling you) or a ringback (you calling), made on the spot: no sound files
let tone = null;
function startTone(kind) {
  stopTone();
  if (SILENT || prefs.deafened || prefs.ring === false) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (f, at, len) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.05, at + 0.02); g.gain.linearRampToValueAtTime(0, at + len); o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + len + 0.05); };
    const once = () => { const t = ctx.currentTime + 0.05; if (kind === 'ring') { beep(784, t, 0.16); beep(988, t + 0.2, 0.16); beep(784, t + 0.5, 0.16); beep(988, t + 0.7, 0.16); } else beep(440, t, 0.9); };
    once();
    tone = { ctx, timer: setInterval(once, kind === 'ring' ? 2600 : 3200) };
  } catch {}
}
function stopTone() { if (tone) { clearInterval(tone.timer); tone.ctx.close().catch(() => {}); tone = null; } }

// the call, above the conversation: everyone's tile (their camera, or their picture with a green ring while they talk),
// screens being shared, and the buttons. Tiles stay put between updates, so videos don't restart.
const callTiles = new Map();
let myCamView = null;
function renderCall() {
  renderVoicePanel();
  const box = $('#call'); if (!box) return;
  const vc = view === 'server' ? Store.channel(channelId) : null;
  const here = call && ((call.kind === 'dm' && view === 'home' && dmId === call.place) || (call.kind === 'vc' && vc && vc.id === call.place));
  if (!here) {
    callTiles.clear();
    if (vc && vc.kind === 'voice' && Store.kind === 'supabase') return voicePrompt(box, vc);
    box.className = 'call'; box.replaceChildren(); return;
  }
  box.className = 'call on' + (call.kind === 'vc' ? ' big' : '');
  let grid = box.querySelector(':scope > .call-grid'), ctrls = box.querySelector(':scope > .call-ctrls');
  if (!grid || !ctrls) { grid = el('div', { className: 'call-grid' }); ctrls = el('div', { className: 'call-ctrls' }); box.replaceChildren(grid, ctrls); }
  const api = call.api, ppl = api.people(), seen = new Set(), order = [];
  const tile = (key, who, { stream, talking, mic = true, deaf = false, label, waiting, screen, mirror }) => {
    seen.add(key);
    let t = callTiles.get(key);
    if (!t) { const video = el('video', { autoplay: true, playsInline: true, muted: true }); t = { video, look: '', node: el('div', { className: 'tile' }, video, el('div', { className: 'tile-av' }), el('div', { className: 'tile-name' })) }; callTiles.set(key, t); }
    const n = t.node;
    n.classList.toggle('speaking', !!talking); n.classList.toggle('waiting', !!waiting); n.classList.toggle('screen', !!screen); n.classList.toggle('mirror', !!mirror); n.classList.toggle('has-video', !!stream);
    if (t.video.srcObject !== (stream || null)) { t.video.srcObject = stream || null; if (stream) t.video.play().catch(() => {}); }
    const look = [who.name, who.color, String(who.avatar || '').length].join();
    if (t.look !== look) { t.look = look; n.querySelector('.tile-av').replaceChildren(avatarEl(face(who), { size: 80 })); }
    n.querySelector('.tile-name').replaceChildren(deaf ? icon('headphonesOff', 14) : !mic ? icon('micOff', 14) : '', label || who.name);
    order.push(n);
  };
  const meU = person(Store.myId()), cam = api.local().getVideoTracks()[0];
  if (cam && (!myCamView || myCamView.getVideoTracks()[0] !== cam)) myCamView = new MediaStream([cam]);
  tile('me', meU, { stream: api.self.cam && cam ? myCamView : null, talking: api.self.speaking, mic: api.self.mic, deaf: api.self.deaf, mirror: true });
  if (api.self.screen && api.screenStream()) tile('me:screen', meU, { stream: api.screenStream(), screen: true, label: 'Your screen' });
  for (const p of ppl) {
    const u = person(p.uid);
    tile(p.pid, u, { stream: p.cam, talking: p.speaking, mic: p.mic, deaf: p.deaf, label: u.name + (p.connected ? '' : ' · connecting…') });
    if (p.screen) tile(p.pid + ':screen', u, { stream: p.screen, screen: true, label: u.name + '’s screen' });
  }
  if (call.kind === 'dm' && !ppl.length) {           // (nobody's picked up yet: the people being rung)
    const d = Store.dmInfo(call.place);
    for (const u of (d ? d.people : []).filter((x) => !isMe(x))) tile('wait:' + u.id, u, { waiting: true, label: call.outgoing ? 'Calling…' : u.name });
  }
  for (const k of [...callTiles.keys()]) if (!seen.has(k)) callTiles.delete(k);
  grid.dataset.n = String(Math.min(order.length, 9));
  let i = 0;
  for (const n of order) { if (grid.childNodes[i] !== n) grid.insertBefore(n, grid.childNodes[i] || null); i++; }
  while (grid.childNodes.length > order.length) grid.lastChild.remove();
  const btn = (ic, title, cls, fn) => el('button', { className: 'cbtn' + (cls ? ' ' + cls : ''), title, onclick: fn }, icon(ic, 22));
  const muted = !api.self.mic || api.self.deaf;
  ctrls.replaceChildren(
    btn(api.self.cam ? 'video' : 'camOff', api.self.cam ? 'Turn Off Camera' : 'Turn On Camera', api.self.cam ? 'on' : '', () => api.setCam(!api.self.cam)),
    btn(api.self.screen ? 'screenOff' : 'screen', api.self.screen ? 'Stop Streaming' : 'Share Your Screen', api.self.screen ? 'on' : '', () => api.setScreen(!api.self.screen)),
    btn(muted ? 'micOff' : 'mic', muted ? 'Unmute' : 'Mute', muted ? 'off' : '', () => toggleMic()),
    btn(api.self.deaf ? 'headphonesOff' : 'headphones', api.self.deaf ? 'Undeafen' : 'Deafen', api.self.deaf ? 'off' : '', () => toggleDeafen()),
    btn('hangup', 'Disconnect', 'leave', () => leaveCall()));
}
// a voice channel you haven't joined: who's there, and Join Voice
function voicePrompt(box, c) {
  const ppl = Store.voice(c.server)[c.id] || [];
  box.className = 'call on prompt';
  box.replaceChildren(el('div', { className: 'vc-prompt' }, el('div', { className: 'vc-ic' }, icon('volume', 34)), el('h3', {}, c.name),
    el('p', {}, ppl.length ? `${ppl.length} ${ppl.length === 1 ? 'person is' : 'people are'} in here.` : 'No one’s here yet.'),
    ppl.length ? el('div', { className: 'vc-ppl' }, ...ppl.map((v) => avatarEl(face(person(v.uid)), { size: 40 }))) : null,
    el('button', { className: 'btn primary', disabled: joining, onclick: () => joinVoice(c) }, joining ? 'Joining…' : 'Join Voice')));
}

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
    el('div', { className: 'field' }, el('label', {}, 'About'), about),
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
  const grid = el('div', { className: 'vars-grid' }, ...VARS.map((v) => { const c = colorSwatch(toHex(base[v]), () => live(), { title: v }); inputs[v] = c; return el('div', { className: 'var-row' }, c, el('label', {}, v)); }));
  let logo = (existing && existing.logo) || 'accent';
  const logos = logoGrid(logo, (id) => { logo = id; });
  const css = el('textarea', { className: 'code', placeholder: '/* optional extra CSS, e.g. .msg .text { font-style: italic } */', value: existing ? existing.css || '' : '' }); css.oninput = live;
  function vals() { const vars = {}; VARS.forEach((v) => vars[v] = inputs[v].value); return vars; }
  function live() { const tmp = { id: '__preview', vars: vals(), css: css.value }; VARS.forEach((v) => document.documentElement.style.setProperty('--' + v, tmp.vars[v])); const s = document.getElementById('fluency-custom-css'); if (s) s.remove(); if (css.value) document.head.append(el('style', { id: 'fluency-custom-css', textContent: css.value })); }
  live();
  const scrim = el('div', { className: 'scrim' }, el('div', { className: 'dialog wide' },
    el('h3', {}, existing ? 'Edit theme' : 'New theme'),
    el('div', { className: 'field' }, el('label', {}, 'Name'), name),
    el('div', { className: 'field' }, el('label', {}, 'Colours'), grid),
    el('div', { className: 'field' }, el('label', {}, 'Logo (the Home button and tab icon, when App Icon is Match Theme)'), logos),
    el('div', { className: 'field' }, el('label', {}, 'Advanced CSS (optional)'), css),
    el('div', { className: 'row' },
      el('button', { className: 'btn', textContent: 'Cancel', onclick: () => { applyTheme(currentTheme()); scrim.remove(); } }),
      el('button', { className: 'btn primary', textContent: 'Save & apply', onclick: () => {
        const themes = loadThemes(); const tid = id || 'custom_' + Math.random().toString(36).slice(2, 8);
        const t = { id: tid, name: name.value.trim() || 'My Theme', vars: vals(), css: css.value, logo };
        const i = themes.findIndex((x) => x.id === tid); if (i >= 0) themes[i] = t; else themes.push(t);
        saveThemes(themes); applyTheme(tid); renderAll(); scrim.remove();
      } }))));
  scrim.onclick = (e) => { if (e.target === scrim) { applyTheme(currentTheme()); scrim.remove(); } };
  document.body.append(scrim); name.focus();
}
function toHex(c) { c = String(c).trim(); if (/^#[0-9a-f]{6}$/i.test(c)) return c; if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join(''); const m = c.match(/\d+/g); if (m && m.length >= 3) return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join(''); return '#222222'; }

// ---------- create server / channel ----------
function go(where) { view = 'server'; serverId = where; channelId = firstChannel(where); serverPage = null; renderAll(); }
// one of a server's own pages (Browse Channels, Game Servers, Server Guide), or its Events
function openServerPage(id) {
  if (id === 'events') return eventsDialog(serverId);
  if (id === 'boost') return boostDialog(serverId);
  serverPage = { sv: serverId, id }; renderAll(); $('#app').classList.remove('show-side');
}

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
  const cats = Store.categories(sv).filter((c) => Store.canManage(sv) || Store.can(c.id, 'manage_channels'));
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
// Discord's "Select Friends": one person starts a DM, two or more a group DM (up to 10 people, your friends).
// addTo: a group to add people to instead; with: people already in the conversation (they come along into the new group)
function newDMDialog(addTo = null, withPeople = []) {
  const live = Store.kind === 'supabase', group = addTo ? Store.dmInfo(addTo) : null;
  const already = new Set([...(group ? group.people.map((p) => p.id) : []), ...withPeople.map((p) => p.id)]);
  const people = new Map();
  for (const f of Store.friends()) if (!already.has(f.id)) people.set(f.id, f);
  if (live && !addTo && !withPeople.length) for (const sv of Store.servers()) for (const p of Store.members(sv.id) || []) if (!p.me && !people.has(p.id)) people.set(p.id, { ...p, notFriend: friendState(p) !== 'friend' });
  const room = 10 - Math.max(1, already.size + (group ? 0 : 1)) ;
  const picked = new Map();
  const list = el('div', { className: 'pick-list' });
  const q = el('input', { type: 'search', placeholder: 'Type the username of a friend', className: 'pick-q' });
  const left = el('p', { className: 'dlg-sub' });
  const go = el('button', { className: 'btn primary' });
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const hits = [...people.values()].filter((p) => !s || String(p.name || '').toLowerCase().includes(s) || String(p.login || '').toLowerCase().includes(s));
    list.replaceChildren(...(hits.length ? hits.map((p) => el('button', { className: 'pick' + (picked.has(p.id) ? ' on' : ''), onclick: () => {
      if (picked.has(p.id)) picked.delete(p.id); else if (picked.size >= room) return toast(`A group DM holds up to 10 people.`); else picked.set(p.id, p);
      draw();
    } }, avatarEl(p, { size: 32 }), el('span', { className: 'nm3' }, p.name), p.login ? el('span', { className: 'muted' }, p.login) : null, el('span', { className: 'tick' + (picked.has(p.id) ? ' on' : '') }, picked.has(p.id) ? icon('check', 13) : null)))
      : [el('div', { className: 'empty-note' }, people.size ? 'Nobody by that name.' : addTo ? 'All your friends are already here.' : 'No friends yet. Add some from the Friends page.')]));
    const n = picked.size + withPeople.length;
    left.textContent = live ? (room - picked.size > 0 ? `You can add ${room - picked.size} more friend${room - picked.size === 1 ? '' : 's'}.` : 'This group is full.') : 'Start a conversation.';
    go.textContent = addTo ? 'Add to Group' : n <= 1 ? 'Create DM' : 'Create Group DM';
    go.disabled = !picked.size;
  };
  go.onclick = async () => {
    const chosen = [...picked.values()];
    if (!chosen.length) return;
    if (!addTo && chosen.length + withPeople.length === 1) { m.close(); return openDM(normFriend(chosen[0])); }
    if (!live) return toast('Group DMs need you signed in.');
    if (chosen.some((p) => p.notFriend)) return toast('Only friends can be in a group DM. Send them a friend request first.');
    go.disabled = true;
    if (addTo) { if ((await attempt(() => Store.addToGroup(addTo, chosen.map((p) => p.id)))) !== null) { m.close(); toast('Added to the group.'); renderAll(); } else go.disabled = false; return; }
    const id = await attempt(() => Store.createGroup([...withPeople, ...chosen].map((p) => p.id)));
    if (!id) { go.disabled = false; return; }
    m.close(); view = 'home'; dmId = id; renderAll();
  };
  q.oninput = draw;
  const m = modal({ title: addTo ? 'Add Friends to Group' : 'Select Friends', body: [left, q, list], actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close() }), go] });
  draw(); setTimeout(() => q.focus(), 0);
}
// "Add Friends to DM": from a group, add to it; from a DM, start a group with that person and more
function addPeopleFlow() {
  const d = Store.dmInfo ? Store.dmInfo(dmId) : null; if (!d) return;
  if (d.kind === 'group') newDMDialog(d.id); else newDMDialog(null, [d.user]);
}
async function renameGroup(d) {
  const n = await ask({ title: 'Rename Group', label: 'Group name', value: d.name || dmName(d), ok: 'Save', max: 100 });
  if (n) { Store.updateGroup(d.id, { name: n }); renderAll(); }
}
function changeGroupIcon(d) {
  pickPicture({ w: 256, h: 256, round: true, title: 'Group Icon', ok: 'Use It', maxChars: 150000 }).then((icon) => { if (icon) { Store.updateGroup(d.id, { icon }); renderAll(); } });
}
async function leaveGroup(d) {
  if (!(await confirmBox({ title: `Leave ‘${dmName(d)}’`, text: 'Are you sure you want to leave this group? You won’t be able to rejoin unless you are re-invited.', ok: 'Leave Group', danger: true }))) return;
  if (call && call.place === d.id) leaveCall();
  if ((await attempt(() => Store.leaveGroup(d.id))) === null) return;
  if (dmId === d.id) dmId = null;
  renderAll();
}
async function openDM(user) {
  const id = await attempt(() => Store.ensureDM(user));
  if (!id) return null;
  if (closedDMs.delete(id)) saveClosed();
  view = 'home'; dmId = id; renderAll();
  return id;
}
async function befriend(u) {
  if (Store.kind === 'supabase' && u.login) { const f = await attempt(() => Store.addFriendByHandle(u.login)); if (f) toast(f.state === 'accepted' ? `You and ${u.name} are now friends!` : `Friend request sent to ${u.name}.`); }
  else if (Store.kind === 'supabase') toast(`${u.name} can’t be added as a friend.`);
  else { Store.addFriend(normFriend(u)); toast(`Added ${u.name} in this browser.`); }
  renderAll();
}
async function unfriend(u) {
  if (!(await confirmBox({ title: `Remove ‘${u.name}’`, text: `Are you sure you want to remove ${u.name} from your friends?`, ok: 'Remove Friend', danger: true }))) return;
  Store.removeFriend(u.id); renderAll();
}
// an invite: a whole link (…/Fluentdat/#invite=abc123) or just the code
const inviteCode = (s) => { s = String(s || '').trim(); const m = s.match(/invite=([0-9a-z]+)/i); return (m ? m[1] : s.replace(/^.*[/#=]/, '')).toLowerCase().slice(0, 32); };
const PENDING_INVITE = 'fluentdat.invite', JOIN_KEY = 'fluentdat.join';      // (a server invite, and a one-time link to make an account)
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
    const up = el('button', { className: 'up-circle', title: 'Upload an icon', onclick: () => pickPicture({ w: 256, h: 256, round: true, title: 'Server Icon', ok: 'Use It', maxChars: 150000 }).then((d) => {
      if (d) { img = d; up.replaceChildren(el('img', { src: img, alt: '' })); }
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

// Discord's invite window: your friends with an Invite button each (it sends them the link in a DM), and the link to copy
async function inviteFriends(sv) {
  const server = Store.server(sv); if (!server) return;
  if (Store.kind !== 'supabase') return openServerSettings(sv, 'invite');
  if (!Store.canAnywhere(sv, 'invite')) return toast('You don’t have permission to invite people to this server.');
  const code = await attempt(() => Store.createInvite(sv)); if (!code) return;
  const link = location.origin + location.pathname + '#invite=' + code;
  const inside = new Set((Store.members(sv) || []).map((p) => p.id));
  const friends = Store.friends().filter((f) => !inside.has(f.id));
  const list = el('div', { className: 'pick-list invite-list' }), q = el('input', { type: 'search', className: 'pick-q', placeholder: 'Search for friends' });
  const sent = new Set();
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const hits = friends.filter((f) => !s || String(f.name || '').toLowerCase().includes(s) || String(f.login || '').toLowerCase().includes(s));
    list.replaceChildren(...(hits.length ? hits.map((f) => {
      const b = el('button', { className: 'btn small' + (sent.has(f.id) ? '' : ' green-outline'), disabled: sent.has(f.id) }, sent.has(f.id) ? 'Sent' : 'Invite');
      b.onclick = async () => {
        b.disabled = true; b.textContent = 'Sending…';
        const id = await attempt(() => Store.ensureDM(f));
        if (!id) { b.disabled = false; b.textContent = 'Invite'; return; }
        Store.sendDM(id, { user: stamp(), text: link }); sent.add(f.id); draw();
      };
      return el('div', { className: 'pick static' }, avatarEl(f, { size: 32 }), el('span', { className: 'nm3' }, f.name), f.login ? el('span', { className: 'muted' }, f.login) : null, b);
    }) : [el('div', { className: 'empty-note small' }, friends.length ? 'Nobody by that name.' : Store.friends().length ? 'All your friends are already here.' : 'No friends to invite yet.')]));
  };
  q.oninput = draw; draw();
  const field = el('input', { type: 'text', value: link, readOnly: true, onclick: () => field.select() });
  const m = modal({ title: `Invite friends to ${server.name}`, cls: 'invite-dlg', body: [q, list,
    el('div', { className: 'field', style: 'margin-top:16px' }, el('label', {}, 'Or, send a server invite link to a friend'),
      el('div', { className: 'invite-box' }, field, el('button', { className: 'btn primary', onclick: () => copyText(link, 'Invite link copied.') }, 'Copy'))),
    el('div', { className: 'invite-note' }, 'Your invite link expires in 7 days. ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); m.close(); openServerSettings(sv, 'invite'); } }, 'Edit invite link.'))],
    actions: [] });
  setTimeout(() => q.focus(), 0);
}
// muting a place, for a while or until you turn it back on
function muteItem(place, what) {
  if (Store.kind !== 'supabase') return null;
  const st = Store.placeSettings(place);
  if (st.muted) return { label: `Unmute ${what}`, icon: 'bell', hint: st.mutedUntil && isFinite(st.mutedUntil) && st.mutedUntil < 8.64e15 ? 'Muted until ' + new Date(st.mutedUntil).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '', action: () => { Store.setPlaceSettings(place, { mutedUntil: null }); renderAll(); } };
  return { label: `Mute ${what}`, sub: () => [['For 15 Minutes', 15], ['For 1 Hour', 60], ['For 3 Hours', 180], ['For 8 Hours', 480], ['For 24 Hours', 1440], ['Until I turn it back on', Infinity]]
    .map(([label, min]) => ({ label, action: () => { Store.setPlaceSettings(place, { mutedUntil: min === Infinity ? Infinity : Date.now() + min * 60000 }); renderAll(); } })) };
}
// above: what a channel or category follows by default ('Server', or 'Category' for a channel in one)
function notifyItem(place, server, above = 'Server') {
  if (Store.kind !== 'supabase') return null;
  const cur = Store.placeSettings(place).notify;
  const opts = server ? [['all', 'All Messages'], ['mentions', 'Only @mentions'], ['none', 'Nothing']] : [['default', `Use ${above} Default`], ['all', 'All Messages'], ['mentions', 'Only @mentions'], ['none', 'Nothing']];
  const on = (v) => cur === v || (server && cur === 'default' && v === 'all');
  return { label: 'Notification Settings', hint: (opts.find(([v]) => on(v)) || opts[0])[1], sub: () => opts.map(([v, l]) => ({ label: l, check: on(v), action: () => { Store.setPlaceSettings(place, { notify: v }); renderAll(); } })) };
}
const markReadItem = (places) => Store.kind === 'supabase' && places.some((p) => Store.unread(p).unread) && { label: 'Mark As Read', icon: 'check', action: () => { for (const p of places) Store.markRead(p); renderAll(); } };
// a category's menu (Discord's): read, fold, mute, notifications, move, edit, delete
function categoryCtx(cat, x, y) {
  const can = Store.canManage(serverId), live = Store.kind === 'supabase', chans = Store.channels(serverId).filter((c) => c.category === cat.id);
  const cats = Store.categories(serverId), i = cats.findIndex((c) => c.id === cat.id);
  const editable = !!cat.id && (can || (live && (Store.can(cat.id, 'manage_channels') || Store.can(cat.id, 'manage_perms'))));
  const moveTo = (j) => { const ids = cats.map((c) => c.id); ids.splice(i, 1); ids.splice(j, 0, cat.id); Store.moveCategories(serverId, ids); renderSide(); };
  menu([
    markReadItem(chans.map((c) => c.id)),
    { label: 'Collapse Category', check: collapsed.has(cat.id), action: () => { if (collapsed.has(cat.id)) { collapsed.delete(cat.id); unfolding = cat.id; } else collapsed.add(cat.id); renderSide(); unfolding = null; } },
    { label: 'Collapse All Categories', action: () => { for (const c of cats) collapsed.add(c.id); renderSide(); } },
    live && cat.id && '-',
    cat.id && muteItem(cat.id, 'Category'), cat.id && notifyItem(cat.id, false),
    (editable || (can && cats.length > 1)) && '-',
    can && cat.id && cats.length > 1 && { label: 'Move to…', sub: () => [
      { label: 'Top', disabled: i <= 0, action: () => moveTo(0) },
      { label: 'Up', disabled: i <= 0, action: () => moveTo(i - 1) },
      { label: 'Down', disabled: i >= cats.length - 1, action: () => moveTo(i + 1) },
      { label: 'Bottom', disabled: i >= cats.length - 1, action: () => moveTo(cats.length - 1) }] },
    editable && { label: 'Edit Category', action: () => openCategorySettings(cat.id) },
    can && cat.id && { label: 'Delete Category', danger: true, action: () => deleteCategory(cat) },
    '-', cat.id && { label: 'Copy Category ID', icon: 'id', action: () => copyText(cat.id, 'Category ID copied.') },
  ], x, y);
}
async function deleteCategory(cat) {
  const n = Store.channels(serverId).filter((c) => c.category === cat.id).length;
  if (!(await confirmBox({ title: 'Delete Category', text: `Are you sure you want to delete ${cat.name}? ${n ? `Its ${n} channel${n === 1 ? '' : 's'} and their messages go with it. ` : ''}This can’t be undone.`, ok: 'Delete Category', danger: true }))) return false;
  const inIt = (Store.channel(channelId) || {}).category === cat.id;
  Store.removeCategory(cat.id); if (inIt) channelId = firstChannel(serverId); renderAll();
  return true;
}
// a channel's settings (admins): its name and topic
function editChannel(c) {
  const name = el('input', { type: 'text', value: c.name, maxLength: 60 });
  const topic = el('textarea', { maxLength: 1024, placeholder: 'Let everyone know how to use this channel!', value: c.topic || '' });
  const save = el('button', { className: 'btn primary', textContent: 'Save Changes' });
  save.onclick = () => {
    const n = name.value.trim(); if (!n) return name.focus();
    Store.updateChannel(c.id, { name: c.kind === 'voice' ? n : n.replace(/\s+/g, '-').toLowerCase(), topic: topic.value.trim() });
    m.close(); renderAll();
  };
  const m = modal({ title: 'Edit Channel', sub: (c.kind === 'voice' ? '' : '#') + c.name,
    body: [el('div', { className: 'field' }, el('label', {}, 'Channel name'), name), c.kind === 'voice' ? null : el('div', { className: 'field' }, el('label', {}, 'Channel topic'), topic)],
    actions: [Store.channels(serverId).length > 1 && (Store.canManage(serverId) || Store.can(c.id, 'manage_channels')) ? el('button', { className: 'btn ghost danger', onclick: () => { m.close(); deleteChannel(c); } }, 'Delete Channel') : null, el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close() }), save] });
  setTimeout(() => name.focus(), 0);
}
function showTopic(c) {
  const t = el('div', { className: 'text topic-full' }); t.innerHTML = richText(c.topic, fmtCtx());
  const m = modal({ title: (c.kind === 'voice' ? '' : '#') + c.name, body: [t], actions: [el('button', { className: 'btn primary', textContent: 'Close', onclick: () => m.close() })] });
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
  const chanCats = Store.categories(s.id).filter((c) => can || Store.can(c.id, 'manage_channels'));
  const inviting = live ? Store.canAnywhere(s.id, 'invite') : true;
  // (Discord's server menu, in its order)
  menu([
    live && { label: 'Server Boost', icon: 'gem', action: () => boostDialog(s.id) },
    live && '-',
    inviting && { label: 'Invite to Server', icon: 'personAdd', action: () => inviteFriends(s.id) },
    { label: 'Server Settings', icon: 'gear', action: () => openServerSettings(s.id) },
    (can || chanCats.length) && { label: 'Create Channel', icon: 'plusCircle', action: () => { if (serverId !== s.id) go(s.id); newChannelFlow(chanCats[0]?.id, s.id); } },
    can && { label: 'Create Category', icon: 'folder', action: () => newCategory(s.id) },
    live && featureOn(s, 'events') && Store.canMakeEvents(s.id) && { label: 'Create Event', icon: 'calendar', action: () => eventEditor(s.id, null) },
    { label: 'App Directory', icon: 'apps', action: () => appDirectory(s.id) },
    '-',
    markReadItem(cachedPlaces(s.id)),
    muteItem(s.id, 'Server'), notifyItem(s.id, true),
    live && { label: 'Privacy Settings', icon: 'shield', action: () => privacyDialog(s.id) },
    live && '-',
    live && { label: 'Edit Per-server Profile', icon: 'edit', action: () => serverProfileDialog(s.id) },
    live && { label: 'Hide Muted Channels', check: hideMuted.has(s.id), action: () => { toggleHideMuted(s.id); renderSide(); } },
    '-',
    { label: 'Copy Server Info', sub: () => [
      { label: 'Copy Server Name', action: () => copyText(s.name, 'Server name copied.') },
      { label: 'Copy Server ID', icon: 'id', action: () => copyText(s.id, 'Server ID copied.') },
      live && inviting && { label: 'Copy Invite Link', icon: 'link', action: async () => { const code = await attempt(() => Store.createInvite(s.id)); if (code) copyText(location.origin + location.pathname + '#invite=' + code, 'Invite link copied (it lasts 7 days).'); } }] },
    live && !owner && '-', live && !owner && { label: 'Leave Server', icon: 'logout', danger: true, action: () => leaveServer(s.id) },
  ], x, y);
}
// every place in a server that can have something new: its channels, and their threads
const cachedPlaces = (sv) => Store.channels(sv).flatMap((c) => [c.id, ...Store.threads(c.id).map((t) => t.id)]);
// Server Boost: 25 Datbux a day, paid ahead (free on an older setup.sql). How many boosts, the level they make, what each
// level holds, and yours: paying for more days, renewing by itself each day, or stopping
const BOOST_STEPS = [2, 7, 14], EMOJI_SLOTS = [50, 100, 150, 250], STICKER_SLOTS = [30, 45, 60, 90], BOOST_DAY = 25, BOOST_DAYS = [1, 7, 30];
const emojiMax = (sv) => EMOJI_SLOTS[Store.boostLevel(sv)] || 50, stickerMax = (sv) => STICKER_SLOTS[Store.boostLevel(sv)] || 30;
const paidBoosts = () => Store.kind === 'supabase' && Store.canPaidBoosts();
// (when something paid for runs out: "in 3 days", "in 5 hours")
const untilWhen = (t) => { const ms = t - Date.now(); return ms <= 0 ? 'now' : ms < 36e5 ? 'in ' + plural(Math.max(1, Math.round(ms / 6e4)), 'minute') : ms < 864e5 ? 'in ' + plural(Math.round(ms / 36e5), 'hour') : 'in ' + plural(Math.round(ms / 864e5), 'day'); };
const whenLong = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
// paying for days of boosting a server (asked first): true once it's paid
async function payBoost(sv, days) {
  const cost = BOOST_DAY * days, bal = Bux.wallet().balance, mine = Store.myBoost(sv.id), on = !!(mine && mine.on);
  if (bal < cost) { toast(`${plural(days, 'day')} of boosting costs ${fmtBux(cost)} Datbux, and you have ${fmtBux(bal)}. Earn more with tasks (Direct Messages → Datbux).`); return false; }
  if (Math.max(on ? mine.paidUntil : 0, Date.now()) + days * 864e5 > Date.now() + 90 * 864e5) { toast('You can pay up to 90 days ahead.'); return false; }
  if (!(await confirmBox({ title: on ? `Add ${plural(days, 'day')}?` : `Boost ${sv.name}?`, ok: `Pay ${fmtBux(cost)}`,
    text: `${fmtBux(cost)} Datbux for ${plural(days, 'day')} of boosting. You have ${fmtBux(bal)}, so ${fmtBux(bal - cost)} would be left. After that it renews by itself, ${BOOST_DAY} Datbux a day while your Datbux last: turn that off in Server Boost any time.` }))) return false;
  if ((await attempt(() => Store.boostFor(sv.id, days))) === null) return false;
  toast(on ? `${plural(days, 'more day')} of boosting ${sv.name}.` : `You boosted ${sv.name}!`); renderAll();
  return true;
}
function boostDialog(svId) {
  const sv = Store.server(svId); if (!sv) return;
  const body = el('div', { className: 'bst' }), act = el('button', { className: 'btn primary' });
  const draw = () => {
    const paid = paidBoosts(), who = Store.boosts(svId), n = who.length, lvl = Store.boostLevel(svId), on = who.includes(Store.myId()), mine = Store.myBoost(svId), next = BOOST_STEPS[lvl];
    const pct = Math.min(100, (n / 14) * 100);
    // (yours: what it's paid until, renewing each day or not, and more days)
    const pay = (d) => el('button', { className: 'btn ' + (on ? '' : 'primary boost-btn'), onclick: async (e) => { e.currentTarget.disabled = true; await payBoost(sv, d); draw(); } }, icon('gem', 14), `${on ? 'Add ' : ''}${plural(d, 'day')} · ${fmtBux(BOOST_DAY * d)}`);
    const yours = !paid ? null : el('div', { className: 'bst-you' + (on ? ' on' : '') },
      el('h4', {}, on ? 'Your boost' : 'Boost this server'),
      el('p', {}, on ? `Boosting since ${dateLong(mine.since)}. Paid until ${whenLong(mine.paidUntil)} (${untilWhen(mine.paidUntil)}).`
        : (mine && mine.paidUntil ? `Your boost ran out on ${dateLong(mine.paidUntil)}. ` : '') + `${BOOST_DAY} Datbux a day, paid ahead. It renews by itself each day while your Datbux last, and you can stop any time.`),
      on ? row2('Renew every day', `${BOOST_DAY} Datbux a day from your wallet while they last. Off: your boost ends when the paid days run out.`,
        sw(mine.auto, async (v) => { if ((await attempt(() => Store.setBoostAuto(svId, v))) !== null) { toast(v ? 'Your boost renews every day now.' : `Your boost ends ${untilWhen(mine.paidUntil)}.`); draw(); } })) : null,
      el('div', { className: 'bst-pay' }, ...BOOST_DAYS.map(pay)),
      el('small', { className: 'bst-bal' }, icon('coin', 13), `You have ${fmtBux(Bux.wallet().balance)} Datbux`));
    body.replaceChildren(
      el('div', { className: 'bst-hero' }, serverFace(sv, 56), el('div', {}, el('h3', {}, sv.name), el('p', {}, `${plural(n, 'Boost')} · Level ${lvl}`))),
      el('div', { className: 'bst-track' }, el('i', { style: `width:${pct}%` }), ...BOOST_STEPS.map((b, i) => el('span', { className: 'bst-mark' + (n >= b ? ' on' : ''), style: `left:${(b / 14) * 100}%` }, el('b', {}, 'Level ' + (i + 1)), el('small', {}, plural(b, 'Boost'))))),
      el('p', { className: 'bst-next' }, next ? `${plural(next - n, 'more boost')} to reach Level ${lvl + 1}.` : 'Level 3: the highest. Thank you, boosters!'),
      el('div', { className: 'bst-perks' }, ...[['Emoji', EMOJI_SLOTS], ['Stickers', STICKER_SLOTS]].map(([what, slots]) => el('div', { className: 'bst-perk' }, el('b', {}, what),
        el('div', { className: 'bst-lv' }, ...slots.map((v, i) => el('span', { className: i === lvl ? 'on' : i < lvl ? 'had' : '' }, el('small', {}, i ? 'Level ' + i : 'Now'), String(v))))))),
      yours,
      who.length ? el('div', { className: 'bst-who' }, el('h4', {}, 'Boosting this server'), el('div', { className: 'bst-faces' }, ...who.map((id) => { const p = person(id); const a = avatarEl(p, { size: 30 }); a.title = nameIn(p, svId); return a; }))) : null,
      el('p', { className: 'hint' }, paid ? `A boost costs ${BOOST_DAY} Datbux a day: it shows you love a server, and every level holds more emoji and stickers. Earn Datbux with tasks (Direct Messages → Datbux).`
        : 'Boosting is free until this Fluentdat’s database has the newest supabase/setup.sql: then it costs 25 Datbux a day. It shows you love a server, and every level holds more emoji and stickers.'));
    // (stopping: on paid boosts, at once and without the paid days back; to let it run out instead, Renew every day goes off)
    act.style.display = paid && !on ? 'none' : '';
    act.textContent = on ? 'Stop Boosting' : 'Boost This Server'; act.className = 'btn ' + (on ? paid ? 'red' : '' : 'primary boost-btn');
    act.onclick = async () => {
      if (on && paid && !(await confirmBox({ title: 'Stop boosting now?', danger: true, ok: 'Stop Boosting',
        text: `Your boost of ${sv.name} ends now, and the days you paid for aren’t given back. To keep it until ${whenLong(mine.paidUntil)} instead, turn off Renew every day.` }))) return;
      act.disabled = true; const ok = await attempt(() => (on ? Store.stopBoost(svId) : Store.boostFor(svId, 1))); act.disabled = false;
      if (ok !== null) { toast(on ? 'You stopped boosting.' : `You boosted ${sv.name}!`); renderAll(); draw(); }
    };
  };
  draw();
  const m = modal({ title: 'Server Boost', cls: 'bst-dlg', body: [body], actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Close'), act] });
}
// (your boosts that renew by themselves get another day when less than one is left, while your Datbux last; this asks
// while Fluentdat is open, and the database does it each hour when it can, with pg_cron. You're told once when one is
// about to run out for want of Datbux)
const boostWarned = new Set();
async function renewMyBoosts() {
  if (!paidBoosts()) return;
  if (await Store.renewBoosts().catch(() => 0)) renderAll();
  const bal = Bux.wallet().balance;
  for (const sv of Store.servers()) {
    const b = Store.myBoost(sv.id);
    if (!b || !b.on || !b.auto || b.paidUntil - Date.now() > 864e5 || bal >= BOOST_DAY || boostWarned.has(sv.id)) continue;
    boostWarned.add(sv.id);
    notice(`Your boost of ${sv.name} runs out ${untilWhen(b.paidUntil)}: another day needs ${BOOST_DAY} Datbux, and you have ${fmtBux(bal)}.`, 'Earn Datbux', () => { view = 'home'; dmId = null; homePage = 'datbux'; renderAll(); });
  }
}
setInterval(renewMyBoosts, 20 * 60000); setTimeout(renewMyBoosts, 9000);
// App Directory: what's built into every Fluentdat server (Flubot and its commands)
function appDirectory(svId) {
  const cmds = [['/me <action>', 'Say what you’re doing, in italics'], ['/shrug', 'Adds ¯\\_(ツ)_/¯'], ['/roll [n]', 'Rolls a die (6 sides, or n)'], ['/flip', 'Flips a coin'],
    ['/nick <name>', 'Changes your display name'], ['/theme <name>', 'Switches your theme'], ['/clear', 'Clears this channel (admins)'], ['!ping', 'Flubot answers pong']];
  const m = modal({ title: 'App Directory', cls: 'apps-dlg', body: [el('p', { className: 'dlg-sub' }, 'Apps that come with every Fluentdat server.'),
    el('div', { className: 'app-card' }, el('div', { className: 'app-ic' }, icon('bot', 28)), el('div', { className: 'grow' }, el('b', {}, 'Flubot'), el('span', { className: 'chip' }, 'Built in'),
      el('p', {}, 'Fluentdat’s own helper. Type / in any channel to see its commands; Flubot posts for whoever runs one, and says so.'),
      el('div', { className: 'app-cmds' }, ...cmds.map(([c, d]) => el('button', { className: 'app-cmd', title: 'Put it in the message box', onclick: () => { m.close(); const i = $('#input'); i.value = c.split(' ')[0] + ' '; i.focus(); } }, el('code', {}, c), el('span', {}, d)))))),
    el('p', { className: 'hint' }, 'More apps can come later. Want one? Ask whoever runs Fluentdat.')], actions: [el('button', { className: 'btn primary', onclick: () => m.close() }, 'Done')] });
}
// Privacy Settings for a server: whether its people can start DMs with you
function privacyDialog(svId) {
  const sv = Store.server(svId); if (!sv) return;
  const m = modal({ title: 'Privacy Settings', sub: sv.name, cls: 'priv-dlg', body: [
    row2('Direct Messages', 'Let people in this server start a direct message with you. Friends can always message you, and conversations you already have stay.',
      sw(Store.serverDMs(svId), async (on) => { if ((await attempt(() => Store.setServerDMs(svId, on))) !== null) toast(on ? 'People here can message you.' : 'People here can’t start new DMs with you now.'); }))],
    actions: [el('button', { className: 'btn primary', onclick: () => m.close() }, 'Done')] });
}
// Edit Per-server Profile (yours) or Change Nickname (an admin, for someone else): a name only in this server, which
// everyone here sees instead of the person's own (empty: their own name)
function serverProfileDialog(svId, who = null) {
  const sv = Store.server(svId); if (!sv) return;
  const mine = !who, person0 = mine ? asMember() : who, uid = mine ? Store.myId() : who.id, own = mine ? me.name : who.name;
  const input = el('input', { type: 'text', maxLength: 32, value: Store.nickIn(svId, uid), placeholder: own });
  const pv = el('div', { className: 'mem nick-pv' });
  const draw = () => { pv.replaceChildren(avatarEl(person0), el('div', { className: 'who' }, el('div', { className: 'nm' }, styledName(el('span', { className: 'nmt' }, input.value.trim() || own), person0)))); };
  input.oninput = draw; draw();
  const save = el('button', { className: 'btn primary' }, 'Save');
  save.onclick = async () => {
    const n = input.value.trim(); save.disabled = true;
    const ok = await attempt(() => Store.setNick(svId, uid, n)); save.disabled = false;
    if (ok === null) return;
    m.close(); renderAll();
    toast(n ? (mine ? `You’re ${n} in ${sv.name}.` : `${own} is ${n} here now.`) : 'Nickname cleared.');
  };
  const m = modal({ title: mine ? 'Edit Per-server Profile' : 'Change Nickname', sub: mine ? sv.name : `${own} in ${sv.name}`, cls: 'nick-dlg', body: [
    el('div', { className: 'field' }, el('label', {}, 'Server Nickname'), input),
    el('p', { className: 'hint' }, 'Only in this server: everyone here sees it instead of ' + (mine ? 'your name' : 'their name') + '. Leave it empty to use ' + (mine ? 'yours' : 'theirs') + '.'),
    el('div', { className: 'pe-label' }, 'In the member list'), pv],
    actions: [el('button', { className: 'btn ghost', onclick: () => { input.value = ''; draw(); input.focus(); } }, 'Reset'), el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), save] });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save.click(); });
  setTimeout(() => input.focus(), 0);
}
const nickDialog = (svId, who) => serverProfileDialog(svId, who);
const serverCtx = (s, x, y) => serverItems(s, x, y);
function channelCtx(c, x, y) {
  const can = Store.canManage(serverId) || Store.can(c.id, 'manage_channels'), live = Store.kind === 'supabase';
  menu([
    markReadItem([c.id]),
    (live ? Store.canAnywhere(serverId, 'invite') : true) && { label: 'Invite to Channel', icon: 'personAdd', action: () => inviteFriends(serverId) },
    { label: 'Copy Link', icon: 'link', action: () => copyText(`${location.origin}${location.pathname}#channel=${c.id}`, 'Link copied.') },
    c.kind === 'voice' && live && (call && call.place === c.id ? { label: 'Disconnect', icon: 'hangup', danger: true, action: () => leaveCall() } : Store.can(c.id, 'connect') && { label: 'Join Voice', icon: 'volume', action: () => joinVoice(c) }),
    live && '-', muteItem(c.id, 'Channel'), notifyItem(c.id, false, c.category ? 'Category' : 'Server'),
    can && '-', can && { label: 'Edit Channel', icon: 'gear', action: () => editChannel(c) },
    can && Store.channels(serverId).length > 1 && { label: 'Delete Channel', icon: 'trash', danger: true, action: () => deleteChannel(c) },
    '-', { label: 'Copy Channel ID', icon: 'id', action: () => copyText(c.id, 'Channel ID copied.') },
  ], x, y);
}
// someone's menu (member list, a message's author, a friend): profile, message, friend, roles, and the admin things
function memberCtx(u, x, y) {
  const self = isMe(u), live = Store.kind === 'supabase', sv = view === 'server' ? serverId : null;
  const can = sv && Store.canManage(sv), owner = sv && Store.role(sv) === 'owner';
  const m = sv && live ? (Store.members(sv) || []).find((p) => p.id === u.id) : null;
  const above = m && !self && m.role !== 'owner' && (owner || (can && m.role === 'member'));
  const g = view === 'home' && dmId && Store.dmInfo ? Store.dmInfo(dmId) : null, groupOwner = g && g.kind === 'group' && g.owner === Store.myId() && g.people.some((p) => p.id === u.id);
  menu([
    { label: 'Profile', icon: 'user', action: () => profileAt(u, x, y) },
    !self && !u.bot && { label: 'Message', icon: 'message', action: () => openDM(normFriend(u)) },
    !self && !u.bot && live && friendState(u) === 'friend' && { label: 'Call', icon: 'phone', action: async () => { if (await openDM(normFriend(u))) startDMCall(false); } },
    !self && !u.bot && live && u.id && Store.canBux() && { label: 'Send Datbux', icon: 'coin', action: () => sendBuxDialog(u) },
    !self && !u.bot && live && u.id && Store.canBux() && { label: 'Trade', icon: 'swap', action: () => tradeDialog(u) },
    !self && !u.bot && friendItem(u),
    !self && !u.bot && { label: isIgnored(u.id) ? 'Unignore' : 'Ignore', icon: 'eyeOff', action: () => setIgnored(u, !isIgnored(u.id)) },
    live && !self && !u.bot && { label: Store.blocked(u.id) ? 'Unblock' : 'Block', icon: 'ban', action: () => (Store.blocked(u.id) ? unblockUser(u) : blockUser(u)) },
    groupOwner && !self && '-', groupOwner && !self && { label: 'Remove From Group', danger: true, action: async () => { if ((await attempt(() => Store.removeFromGroup(g.id, u.id))) !== null) renderAll(); } },
    '-',
    m && can && Store.roles(sv).length && { label: 'Roles', sub: () => roleItems(sv, u) },
    m && (self || owner || (can && m.role === 'member')) && { label: self ? 'Edit Per-server Profile' : 'Change Nickname', icon: 'edit', action: () => (self ? serverProfileDialog(sv) : nickDialog(sv, m)) },
    m && owner && !self && m.role !== 'owner' && { label: m.role === 'admin' ? 'Remove Admin' : 'Make Admin', icon: 'shield', action: () => setAdmin(sv, m, m.role !== 'admin') },
    above && '-', above && { label: `Remove ${u.name}`, danger: true, action: () => kick(sv, m) },
    above && { label: `Ban ${u.name}`, icon: 'ban', danger: true, action: () => banFlow(sv, m) },
    '-', { label: 'Copy User ID', icon: 'id', action: () => copyText(String(u.id || u.login || u.name), 'User ID copied.') },
  ], x, y);
}
function dmCtx(d, x, y) {
  const group = d.kind === 'group', live = Store.kind === 'supabase';
  menu([
    markReadItem([d.id]),
    !group && { label: 'Profile', icon: 'user', action: () => profileAt(d.user, x, y) },
    live && { label: 'Call', icon: 'phone', action: () => { view = 'home'; dmId = d.id; renderAll(); startDMCall(false); } },
    !group && friendItem(d.user),
    !group && live && d.user && d.user.id && !d.user.bot && Store.canBux() && { label: 'Send Datbux', icon: 'coin', action: () => sendBuxDialog(d.user) },
    !group && live && d.user && d.user.id && !d.user.bot && Store.canBux() && { label: 'Trade', icon: 'swap', action: () => tradeDialog(d.user) },
    live && '-', muteItem(d.id, 'Conversation'),
    group && '-', group && { label: 'Change Icon', icon: 'image', action: () => changeGroupIcon(d) }, group && { label: 'Rename', icon: 'edit', action: () => renameGroup(d) },
    '-',
    group ? { label: 'Leave Group', icon: 'logout', danger: true, action: () => leaveGroup(d) }
      : { label: 'Close DM', icon: 'x', action: () => { closedDMs.add(d.id); saveClosed(); if (dmId === d.id) dmId = null; renderAll(); } },
    '-', group ? { label: 'Copy Group ID', icon: 'id', action: () => copyText(d.id, 'Group ID copied.') } : { label: 'Copy User ID', icon: 'id', action: () => copyText(String(d.user.id || d.user.name), 'User ID copied.') },
  ], x, y);
}
function messageCtx(m, x, y) {
  const where = view === 'home' ? { dm: true, id: dmId } : { dm: false, id: channelId }, live = Store.kind === 'supabase';
  const mine = isMe(m.user) || (m.user.bot && m.user.via && m.user.via === (Store.account() || {}).login) || (Store.kind === 'local');
  const canDel = typeof Store.deleteMessage === 'function' && (mine || (!where.dm && (Store.canManage(serverId) || Store.can(channelId, 'manage_messages'))));
  const link = `${location.origin}${location.pathname}#msg=${where.dm ? 'd' : 'c'}:${where.id}:${m.id}`;
  const saved = bookmarked(m.id), speakable = typeof speechSynthesis !== 'undefined' && !!(m.text || '').trim();
  if (m.call) return menu([{ label: 'Copy Message ID', icon: 'id', action: () => copyText(String(m.call.id), 'Copied.') }], x, y);
  menu([
    !m.sending && mayIn('react') && { label: 'Add Reaction', sub: () => [...quickReacts(8).map((q) => ({ label: emojiLabel(q), hint: null, action: () => toggleReact(m, q, true) })), '-',
      { label: 'View More', icon: 'smilePlus', action: () => { const anchor = document.querySelector(`.msg[data-id="${CSS.escape(m.id)}"] .msg-tools`) || $('#composer'); reactPicker(m, anchor); } }] },
    !m.sending && mayIn('send') && { label: 'Reply', icon: 'reply', action: () => startReply(m) },
    !m.sending && canThread() && { label: threadOf(m.id) ? 'Open Thread' : 'Create Thread', icon: 'thread', action: () => threadFlow(m) },
    live && !m.sending && Store.canPin(where.id) && { label: Store.pinned(where.id, m.id) ? 'Unpin Message' : 'Pin Message', icon: 'pin',
      action: () => attempt(() => Store.pin(where.id, m.id, !Store.pinned(where.id, m.id))).then(() => renderAll()) },
    live && !m.sending && { label: 'Forward', icon: 'forward', action: () => forwardFlow(m) },
    m.text && { label: 'Copy Text', icon: 'copy', action: () => copyText(plainText(m.text, fmtCtx()), 'Copied.') },
    '-',
    !m.sending && { label: saved ? 'Remove Bookmark' : 'Bookmark Message', icon: 'bookmark', action: () => toggleBookmark(m) },
    !m.sending && { label: 'Create Reminder', sub: () => [['In 15 Minutes', 15], ['In 1 Hour', 60], ['In 3 Hours', 180], ['Tomorrow (9 AM)', 'tomorrow']].map(([label, v]) => ({ label, action: () => remindMe(m, v) })) },
    live && !m.mine && !m.sending && { label: 'Mark Unread', icon: 'unread', action: () => { Store.markUnread(where.id, m.ts); keepUnread = where.id; newLine = { place: where.id, at: m.ts - 1 }; renderAll(); } },
    live && !m.sending && { label: 'Copy Message Link', icon: 'link', action: () => copyText(link, 'Message link copied.') },
    speakable && { label: 'Speak Message', icon: 'volume', action: () => speak(m) },
    '-',
    (m.files || []).length === 1 && m.files[0].kind !== 'voice' && { label: 'Save File', icon: 'download', action: async () => { const f = m.files[0]; const u = await attempt(() => Store.downloadUrl(f.path, f.name || 'file')); if (u) { const a = el('a', { href: u, download: f.name || '' }); document.body.append(a); a.click(); a.remove(); } } },
    !m.user.bot && !isMe(m.user) && { label: 'Profile', icon: 'user', action: () => profileAt(m.user, x, y) },
    canDel && { label: 'Delete Message', icon: 'trash', danger: true, action: async () => {
      if (await confirmBox({ title: 'Delete Message', text: 'Are you sure you want to delete this message?', ok: 'Delete', danger: true })) Store.deleteMessage(where, m.id);
    } },
    live && !mine && !m.user.bot && { label: 'Report Message', icon: 'flag', danger: true, action: () => reportFlow({ user: m.user, message: m, place: where.id }) },
    '-', { label: 'Copy Message ID', icon: 'id', action: () => copyText(String(m.id), 'Message ID copied.') },
  ], x, y);
}
// Speak Message: read it out (the browser's own voice)
function speak(m) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${m.user.name} said ${plainText(m.text, fmtCtx())}`);
    speechSynthesis.speak(u);
  } catch { toast('This browser can’t read messages out loud.'); }
}
// Forward: to up to five DMs or channels (with a note if you like), each getting it marked "Forwarded" with where it came from.
// Its attachments are copied to where it goes (a file only opens for the people where it was sent).
function forwardFlow(m) {
  const from = placeLabel(whereNow());
  const dests = [
    ...Store.dmList().map((d) => ({ dm: true, id: d.id, name: dmName(d), sub: d.kind === 'group' ? `${d.people.length} Members` : 'Direct Message', face: () => dmAvatar(d, 30) })),
    ...Store.servers().flatMap((sv) => Store.channels(sv.id).filter((c) => c.kind !== 'voice' && Store.can(c.id, 'send')).map((c) => ({ dm: false, id: c.id, name: '#' + c.name, sub: sv.name, face: () => serverFace(sv, 30) }))),
  ];
  const picked = new Set();
  const q = el('input', { type: 'search', placeholder: 'Search', autocomplete: 'off' });
  const note = el('input', { type: 'text', placeholder: 'Add an optional message…', maxLength: 2000 });
  const list = el('div', { className: 'fw-list' });
  const go = el('button', { className: 'btn primary', disabled: true }, 'Send');
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const hits = dests.filter((d) => !s || d.name.toLowerCase().includes(s) || d.sub.toLowerCase().includes(s)).slice(0, 60);
    list.replaceChildren(...(hits.length ? hits.map((d) => {
      const key = (d.dm ? 'd:' : 'c:') + d.id, on = picked.has(key);
      return el('button', { className: 'fw-row' + (on ? ' on' : ''), onclick: () => { if (on) picked.delete(key); else if (picked.size < 5) picked.add(key); else toast('You can forward to up to 5 places at once.'); go.disabled = !picked.size; go.textContent = picked.size > 1 ? `Send (${picked.size})` : 'Send'; draw(); } },
        d.face(), el('div', { className: 'fw-who' }, el('b', {}, d.name), el('small', {}, d.sub)), el('span', { className: 'fw-tick' + (on ? ' on' : '') }, on ? icon('check', 14) : null));
    }) : [el('div', { className: 'empty-note' }, 'Nothing matches that.')]));
  };
  q.oninput = draw;
  const preview = el('div', { className: 'fw-preview' }, avatarEl(face(m.user), { size: 20 }), el('b', {}, m.user.name), el('span', {}, excerptOf(m) || 'a message'));
  const w = modal({ title: 'Forward To', sub: 'Pick up to 5 places.', cls: 'fw', body: [q, list, preview, note], actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), go] });
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Sending…';
    const text = note.value.trim();
    for (const key of picked) {
      const d = dests.find((x) => (x.dm ? 'd:' : 'c:') + x.id === key);
      if (d && (await attempt(() => forwardTo(m, d, from, text))) === null) { go.disabled = false; go.textContent = 'Send'; return; }
    }
    w.close(); toast(picked.size === 1 ? 'Forwarded.' : `Forwarded to ${picked.size} places.`);
  };
  draw(); setTimeout(() => q.focus(), 0);
}
async function forwardTo(m, d, from, note) {
  const where = { dm: d.dm, id: d.id }, files = [];
  for (const f of m.files || []) {
    const blob = await (await fetch(await Store.fileUrl(f.path))).blob();
    const { path, name, size, type, ...extra } = f;
    files.push(await Store.uploadFile(where, new File([blob], f.name || 'file', { type: f.type || blob.type }), null, extra));
  }
  const msg = { user: stamp(), text: m.text || null, files: files.length ? files : null, sticker: m.sticker || null, forwarded: { from: String(from).slice(0, 100), by: String(m.user.name || '').slice(0, 40), at: m.ts } };
  if (d.dm) Store.sendDM(d.id, msg); else Store.send(d.id, msg);
  if (note) { const t = await withEmoji(note, customEmoji); if (d.dm) Store.sendDM(d.id, { user: stamp(), text: t }); else Store.send(d.id, { user: stamp(), text: t }); }
}
// Report: a message or a profile, to the people who run Fluentdat
function reportFlow({ user, message = null, place = null }) {
  const reasons = ['Spam', 'Harassment or bullying', 'Hateful or violent', 'Inappropriate content', 'Pretending to be someone else', 'Something else'];
  let pick = '';
  const opts = el('div', { className: 'rp-opts' }, ...reasons.map((r) => { const b = el('button', { className: 'rp-opt', onclick: () => { pick = r; for (const x of opts.children) x.classList.toggle('on', x === b); send.disabled = false; } }, r); return b; }));
  const more = el('textarea', { className: 'area', placeholder: 'Anything else they should know? (optional)', maxLength: 400 });
  const send = el('button', { className: 'btn red', disabled: true }, 'Send Report');
  const w = modal({ title: message ? 'Report Message' : `Report ${user.name}`, sub: 'It goes to the people who run Fluentdat. They see what you report and who sent the report, never anything else.',
    body: [message ? el('div', { className: 'fw-preview' }, avatarEl(face(user), { size: 20 }), el('b', {}, user.name), el('span', {}, excerptOf(message))) : null, opts, more],
    actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), send] });
  send.onclick = async () => {
    send.disabled = true;
    const ok = await attempt(() => Store.report({ target: user.id, place, message: message ? message.id : null, excerpt: message ? excerptOf(message) : '', reason: pick + (more.value.trim() ? ': ' + more.value.trim() : '') }));
    if (ok === null) { send.disabled = false; return; }
    w.close(); toast('Thanks. Your report was sent.');
  };
}
// a menu from a button inside a card: the card stays open under it, and the button looks pressed while the menu is up
function openBeside(btn, open) {
  const r = btn.getBoundingClientRect();
  open(r);
  btn.classList.add('on');
  const off = (e) => { if (e.type === 'keydown' && e.key !== 'Escape') return; btn.classList.remove('on'); removeEventListener('mousedown', off, true); removeEventListener('keydown', off, true); };
  setTimeout(() => { addEventListener('mousedown', off, true); addEventListener('keydown', off, true); }, 0);
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
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(innerHeight * 0.4, input.scrollHeight) + 'px'; updateMentions(); updateFormatBar(); });
input.addEventListener('keydown', (e) => {
  if (mentionHits.length && !$('#mention-pop').hidden) {         // (picking someone from the @ list, or an emoji from the : one)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mentionSel = (mentionSel + (e.key === 'ArrowDown' ? 1 : -1) + mentionHits.length) % mentionHits.length; return markHit(); }
    // (a whole command that takes nothing more, like /bans or /flip: Enter runs it)
    const h = mentionHits[mentionSel], whole = e.key === 'Enter' && hitKind === 'cmd' && h && !h.cmd.includes(' ') && input.value.trim().toLowerCase() === h.cmd;
    if ((e.key === 'Enter' || e.key === 'Tab') && !whole) { e.preventDefault(); return pickMention(mentionSel); }
    if (whole) closeMentions();
    else if (e.key === 'Escape') { e.preventDefault(); return closeMentions(); }
  }
  if ((e.metaKey || e.ctrlKey) && !e.altKey) {
    const k = e.key.toLowerCase();
    if (!e.shiftKey && MARKS[k]) { e.preventDefault(); return wrapSel(MARKS[k]); }
    if (e.shiftKey && k === 'x') { e.preventDefault(); return wrapSel('~~'); }
  }
  if (e.key === 'Escape') { const d = placeNow() && draft(placeNow()); if (d && d.reply) { d.reply = null; renderComposerExtras(); return; } }
  if (e.key === 'ArrowUp' && !input.value && placeNow()) {                    // (Up in an empty box: reply to the last message, like Discord's quick reply)
    const list = view === 'home' ? Store.dm(dmId) : Store.messages(channelId), m = [...list].reverse().find((x) => !x.call && !x.mine);
    if (m && e.altKey) { e.preventDefault(); return startReply(m); }
  }
  if (e.key === 'Enter' && !e.shiftKey && prefs.sendOnEnter) { e.preventDefault(); send(); }
});
for (const ev of ['select', 'keyup', 'mouseup', 'focus']) input.addEventListener(ev, updateFormatBar);
input.addEventListener('blur', () => setTimeout(() => { updateFormatBar(); if (document.activeElement !== input) closeMentions(); }, 120));
input.addEventListener('paste', (e) => { const files = [...((e.clipboardData && e.clipboardData.files) || [])]; if (files.length) { e.preventDefault(); addFiles(files); } });
// files dragged onto the conversation wait in the message box (and nothing else happens if they miss it)
const hasFiles = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
let dragDepth = 0;
const dropZone = $('.main');
dropZone.addEventListener('dragenter', (e) => { if (!hasFiles(e) || $('#composer').hidden) return; e.preventDefault(); if (++dragDepth === 1) showDrop(true); });
dropZone.addEventListener('dragover', (e) => { if (!hasFiles(e) || $('#composer').hidden) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
dropZone.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; showDrop(false); } });
dropZone.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; showDrop(false); if (!$('#composer').hidden) addFiles([...e.dataTransfer.files]); });
addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('drop', (e) => { if (hasFiles(e)) e.preventDefault(); });
function showDrop(on) {
  const box = $('#drop');
  if (!on) { box.hidden = true; return; }
  const where = view === 'home' ? dmName(Store.dmInfo ? Store.dmInfo(dmId) : null) || 'this conversation' : '#' + ((Store.channel(channelId) || {}).name || 'channel');
  box.replaceChildren(el('div', { className: 'drop-card' }, el('div', { className: 'drop-ic' }, icon('file', 40)), el('h3', {}, 'Upload to ' + where), el('p', {}, 'Your files wait in the message box until you send.')));
  box.hidden = false;
}
$('#send-btn').onclick = () => { send(); input.focus(); };
// a server's banner tucks away as you scroll down its channels, and comes back at the top (as on Discord)
$('#side-body').addEventListener('scroll', () => {
  const b = $('#side-body'), side = b.parentElement;
  if (!side.classList.contains('banner-over')) return;
  const tucked = side.classList.contains('banner-tucked');
  if (!tucked && b.scrollTop > 24 && b.scrollHeight - b.clientHeight > prefs.bannerH - prefs.topH + 48) side.classList.add('banner-tucked');
  else if (tucked && b.scrollTop <= 2) side.classList.remove('banner-tucked');
}, { passive: true });
$('#sticker-btn').onclick = (e) => { e.stopPropagation(); togglePicker('stickers'); };
document.addEventListener('click', (e) => {
  if (pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest('.msg .nm, .msg .avatar, #me-panel .avatar, #me-panel .who, .mem, .side-head, .ctx'))) closePop();
});
addEventListener('resize', closePop);

let lastError = '';
Store.onChange(() => {
  if (Store.kind === 'supabase') { adoptProfile(); adoptSettings(); }          // (your profile, and your settings, can change on another device)
  if (CUSTOMIZE) czSync();
  questCheck();
  renderAll(); alertNew();
  const err = Store.syncState().error || '';
  if (err && err !== lastError && Store.kind === 'supabase') toast(err);
  lastError = err;
});

// a desktop notification (when allowed, and Fluentdat isn't what you're looking at); clicking it takes you there
function notifyDesktop(title, body, go, tag) {
  if (!prefs.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body: String(body || '').slice(0, 160), icon: 'icons/icon-192.png', tag: tag || undefined });
    n.onclick = () => { try { window.focus(); } catch {} if (go) go(); n.close(); };
  } catch {}
}
// something new somewhere (signed in): a sound and a notification, if that place may tell you about it
Store.onMessage(({ place, dm, ping, message: m, server }) => {
  if (CUSTOMIZE) return;                                  // (the chat, in its own tab, tells you)
  const looking = (dm ? view === 'home' && dmId === place : view === 'server' && channelId === place) && document.visibilityState === 'visible' && document.hasFocus();
  if (!dm) renderRail();
  if (looking || hiddenAuthor(m.user)) return;
  const tell = dm ? !Store.placeSettings(place).muted : ping ? levelFor(place, server) !== 'none' : !mutedHere(place, server) && levelFor(place, server) === 'all';
  if (!tell) return;
  if (prefs.sound && !prefs.deafened && !SILENT) blip();
  const d = dm ? Store.dmInfo(place) : null, c = dm ? null : Store.channel(place), sv = server ? Store.server(server) : null;
  const what = m.text ? plainText(m.text, fmtCtx()) : (m.files || []).some((f) => f.kind === 'voice') ? 'sent a voice message' : (m.files || []).length ? `sent ${m.files.length === 1 ? 'an attachment' : m.files.length + ' attachments'}` : m.sticker ? 'sent a sticker' : '';
  const title = dm ? (d && d.kind === 'group' ? `${m.user.name} (${dmName(d)})` : m.user.name) : `${m.user.name} (#${c ? c.name : 'channel'}${sv ? ', ' + sv.name : ''})`;
  notifyDesktop(title, what, () => { if (dm) { view = 'home'; dmId = place; } else { view = 'server'; serverId = server; channelId = place; } renderAll(); }, place);
});
// seen again: what's in front of you counts as read
addEventListener('focus', () => { if (Store.kind === 'supabase' && placeNow() && keepUnread !== placeNow()) { Store.markRead(placeNow()); renderAll(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Store.kind === 'supabase' && placeNow() && keepUnread !== placeNow()) { Store.markRead(placeNow()); renderAll(); } });

// a nudge when something new lands while you're looking elsewhere (in this browser only: signed in, the above does it)
let lastSeen = 0;
function alertNew() {
  if (Store.kind === 'supabase') return;
  const msgs = view === 'home' && dmId ? Store.dm(dmId) : (view === 'server' && channelId ? Store.messages(channelId) : []);
  const latest = msgs.length ? msgs[msgs.length - 1] : null;
  if (!latest || latest.ts <= lastSeen) { if (latest) lastSeen = Math.max(lastSeen, latest.ts); return; }
  const mine = latest.user && (latest.user.login ? latest.user.login === (Store.account() || {}).login : latest.user.name === me.name);
  lastSeen = latest.ts;
  if (mine || !document.hidden) return;
  if (prefs.notify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(latest.user.name + ' in Fluentdat', { body: (latest.text || 'sent a sticker').slice(0, 120) }); } catch {}
  }
  if (prefs.sound && !prefs.deafened && !SILENT) blip();
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
document.body.dataset.booted = '1';
// a link to a channel opens it once your servers have loaded
function followLink(tries = 0) {
  const h = location.hash, clear = () => history.replaceState(null, '', location.pathname + location.search);
  const later = () => { if (Store.syncState().loading && tries < 25) { setTimeout(() => followLink(tries + 1), 400); return true; } return false; };
  const msg = h.match(/msg=([cd]):([0-9a-f-]{36}):([0-9a-f-]{36})/i);
  if (msg) {
    const t = { dm: msg[1].toLowerCase() === 'd', place: msg[2].toLowerCase(), id: msg[3].toLowerCase() };
    if (!(t.dm ? Store.dmInfo && Store.dmInfo(t.place) : Store.channel(t.place)) && later()) return;
    clear(); return goToMessage(t);
  }
  const usr = h.match(/user=([^&]+)/);
  if (usr) { clear(); return openUserLink(decodeURIComponent(usr[1])); }
  const inv = h.match(/invite=([0-9a-z]+)/i);
  if (inv && tries === 'click') { clear(); return joinServer(inv[1]); }
  const jn = h.match(/join=([0-9a-f]{40})/i);
  if (jn && tries === 'click') { clear(); return appJoin(jn[1].toLowerCase()); }
  const m = h.match(/channel=([0-9a-f-]{36})/i); if (!m) return;
  const c = Store.channel(m[1].toLowerCase()); if (!c) { later(); return; }
  clear();
  view = 'server'; serverId = c.server; openChannel(c);
}
async function openUserLink(who) {
  if (Store.kind !== 'supabase') return toast('Sign in to see people’s profiles.');
  let u = /^[0-9a-f-]{36}$/i.test(who) ? Store.person(who) : null;
  if (!u) { try { u = await Store.findUser(who); } catch (e) { return toast(String((e && e.message) || e)); } }
  if (u) fullProfile(u); else toast(`There’s nobody called @${who.replace(/^@/, '')}.`);
}
ready.then(() => setTimeout(followLink, 0));
addEventListener('hashchange', () => followLink('click'));

// ===================== preferences =====================
function loadPrefs(from = null) {
  let saved = from || {}; if (!from) try { saved = JSON.parse(localStorage.getItem('fluentdat.prefs')) || {}; } catch {}
  const p = { ...DEFAULT_PREFS, ...saved, hidden: { ...DEFAULT_PREFS.hidden, ...(saved.hidden || {}) }, order: { ...(saved.order || {}) }, labels: { ...(saved.labels || {}) } };
  // (Fluentdat's own layout, from TrixWotel's drawings: a title bar, rounded panels, your controls in the server rail, the
  // banner under the server's name, Browse in Direct Messages, and the member list flush beside the chat; once, for everyone)
  if ((saved.layoutV || 1) < 2) Object.assign(p, { titlebar: 'on', frame: 'panels', panelPos: 'rail', bannerStyle: 'under', catStyle: 'line', membersStyle: 'panel', layoutV: 2 });
  // (from before every button could be changed: a few had their own switches)
  if (saved.callBtns === 'off') p.hidden.call = p.hidden.video = true;
  if (saved.composerSticker === 'off') p.hidden.sticker = true;
  if (saved.composerSend === 'off') p.hidden.send = true;
  const was = (v, map, fallback) => (typeof v === 'number' ? v : map[v] || fallback);
  if (typeof saved.railW !== 'number') p.railW = { s: 60, m: 72, l: 86 }[saved.railSize] || 72;
  p.sideW = was(saved.sideW, { narrow: 190, medium: 240, wide: 300 }, 240);
  if (typeof saved.membersW !== 'number') p.membersW = { narrow: 180, medium: 232, wide: 300 }[saved.memberW] || 232;
  if (typeof saved.avatarPx !== 'number') p.avatarPx = { s: 28, m: 36, l: 44 }[saved.avatarSize] || 36;
  p.bannerH = was(saved.bannerH, { s: 96, m: 136, l: 180 }, DEFAULT_PREFS.bannerH);
  // (the banner under a server's name got shorter, from 136 to 88: unless you'd made it another height yourself)
  if ((saved.layoutV || 1) < 3) { if (p.bannerH === 136) p.bannerH = DEFAULT_PREFS.bannerH; p.layoutV = 3; }
  // (category names lost their line and arrow: open ones are bright and closed ones dimmed, unless you'd picked capitals)
  if ((saved.layoutV || 1) < 4) { if (p.catStyle === 'line') p.catStyle = 'dim'; p.layoutV = 4; }
  p.keys = Object.fromEntries(Object.entries(p.keys && typeof p.keys === 'object' ? p.keys : {}).filter(([k, v]) => KEYBINDS.some((b) => b[0] === k) && typeof v === 'string' && v.length < 60));
  p.sideOff = p.sideOff === true;
  if (typeof saved.icTop !== 'number' && saved.btnSize) p.icTop = p.icComposer = p.icPanel = { s: 16, m: 20, l: 25 }[saved.btnSize] || 20;
  for (const k of ['callBtns', 'composerSticker', 'composerSend', 'railSize', 'memberW', 'avatarSize', 'btnSize']) delete p[k];
  // (channels got Discord's settings cog on hover; the old × to delete one is now in it, and in the right-click menu)
  if (!p.chanGear) { p.chanGear = true; if (!(saved.hidden && 'delChannel' in saved.hidden)) p.hidden.delChannel = true; }
  for (const k of Object.keys(SIZES)) p[k] = sizeOf(k, p[k]);
  return p;
}
// what a layout preset or reset leaves alone (they're not about layout)
const KEEP = ['notify', 'sound', 'sendOnEnter', 'dmFrom', 'micMuted', 'deafened', 'reduceMotion', 'highContrast', 'ring', 'embeds', 'formatBar', 'anim', 'logo', 'decorations', 'effects', 'liveBanner',
  'labels', 'layoutV', 'syncSettings', 'keys'];
const keepOf = () => Object.fromEntries(KEEP.filter((k) => k in prefs).map((k) => [k, prefs[k]]));
function savePrefs() { try { localStorage.setItem('fluentdat.prefs', JSON.stringify(prefs)); } catch {} applyPrefs(); changedSettings(); }
function applyPrefs() {
  const d = document.documentElement, S = (k, v) => d.setAttribute('data-' + k, v), V = (k, v) => d.style.setProperty(k, v + 'px');
  S('density', prefs.density);
  S('motion', prefs.reduceMotion ? 'off' : 'on');
  applyAnims(prefs.anim || {});
  setFavicon(appLogo());
  S('contrast', prefs.highContrast ? 'high' : 'normal');
  for (const [attr, val] of [['rail', prefs.rail], ['iconshape', prefs.iconShape],
    ['chanicons', prefs.chanIcons], ['cats', prefs.cats], ['sidehead', prefs.sideHead], ['userpanel', prefs.userPanel],
    ['topbar', prefs.topbar], ['banner', prefs.banner], ['livebanner', prefs.liveBanner], ['avatars', prefs.avatars],
    ['avatarshape', prefs.avatarShape], ['dividers', prefs.dividers], ['hover', prefs.hover],
    ['radius', prefs.radius], ['uifont', prefs.uiFont], ['btnlabels', prefs.btnLabels], ['titlebar', prefs.titlebar], ['titlealign', prefs.titleAlign],
    ['frame', prefs.frame], ['catstyle', prefs.catStyle], ['memstyle', prefs.membersStyle], ['bannerstyle', prefs.bannerStyle]]) S(attr, val);
  S('timestamps', prefs.timestamps === 'off' ? 'off' : 'on');
  S('namehover', prefs.nameHover === 'underline' ? 'underline' : 'off');
  setTileLook(prefs.connLook);
  V('--top-gap', prefs.topGap); V('--rail-gap', prefs.railGap); V('--react-h', prefs.reactH);
  S('platemove', prefs.plateMove === 'hover' ? 'hover' : 'always');
  S('cardtheme', prefs.cardTheme === 'mine' ? 'mine' : 'theirs');
  V('--rail-w', prefs.railW); V('--side-w', prefs.sideW); V('--members-w', prefs.membersW); V('--top-h', prefs.topH);
  V('--composer-h', prefs.composerH); V('--panel-h', prefs.panelH); V('--banner-h', prefs.bannerH); V('--status-h', prefs.statusH);
  V('--title-h', prefs.titleH); V('--panel-r', prefs.panelR); V('--panel-gap', prefs.panelGap);
  V('--avatar', prefs.avatarPx); V('--mem-av', prefs.memberAv); V('--chan-h', prefs.chanH);
  V('--ic-top', prefs.icTop); V('--ic-composer', prefs.icComposer); V('--ic-panel', prefs.icPanel);
  V('--srv', Math.max(28, Math.min(80, prefs.railW - 26)));
  d.style.setProperty('--msg-max', prefs.msgWidth === 'readable' ? '860px' : 'none');
  document.body.style.fontSize = sizeOf('fontSize', prefs.fontSize) + 'px';
  applyLayout();
}
// where each part sits. Columns are placed explicitly (so a hidden one keeps its empty, zero-width spot), the
// sidebar's and main area's parts by flex order, and the status bar above or below everything
function applyLayout() {
  const app = $('#app'); if (!app) return;
  const cols = validOrder(prefs.cols, COLS);
  const membersOn = app.classList.contains('show-members') && innerWidth > 820, sideGone = sideHidden();
  app.classList.toggle('side-off', sideGone);
  const width = { rail: prefs.rail === 'off' ? 0 : prefs.railW, side: sideGone ? 0 : prefs.sideW, members: membersOn ? (app.classList.contains('finding') ? Math.max(prefs.membersW, innerWidth >= 1300 ? 440 : 340)
    : app.classList.contains('dm-mode') ? Math.max(prefs.membersW, innerWidth >= 1200 ? 340 : 280) : prefs.membersW) : 0 };
  // (the member list beside the chat is a card in it, under the top bar, like Discord's: when it's next to the chat and the
  // top bar is on top; otherwise it's a column of its own)
  const mi = cols.indexOf('main'), ci = cols.indexOf('members');
  const joined = prefs.membersStyle !== 'column' && Math.abs(mi - ci) === 1 && validOrder(prefs.mainOrder, ['top', 'content', 'composer'])[0] === 'top' && innerWidth > 820;
  app.classList.toggle('joined', joined); app.classList.toggle('mem-left', joined && ci < mi);
  app.style.setProperty('--mem-w', width.members + 'px');
  app.style.setProperty('--cols', cols.map((c) => (c === 'main' ? 'minmax(0, 1fr)' : c === 'members' && joined ? '0px' : width[c] + 'px')).join(' '));
  const node = { rail: $('#rail-col'), side: $('.side'), main: $('.main'), members: $('#members') };
  // (your controls: at the foot of the server rail, or under the sidebar)
  const panel = $('#me-panel'), inRail = panelInRail();
  if (inRail ? panel.parentNode !== node.rail : panel.parentNode !== node.side) { (inRail ? node.rail : node.side).append(panel); renderMe(); }
  const col = $('#main-col');
  if (joined) { if (ci > mi ? node.members.previousElementSibling !== col : node.members.nextElementSibling !== col) (ci > mi ? col.after(node.members) : col.before(node.members)); }
  else if (node.members.parentNode !== app) app.append(node.members);
  cols.forEach((c, i) => { node[c].style.gridColumn = String(i + 1); node[c].style.gridRow = '1'; });
  node.members.classList.toggle('collapsed', !membersOn);
  validOrder(prefs.sideOrder, ['head', 'body', 'panel']).forEach((p, i) => { ({ head: $('#side-head'), body: $('#side-body'), panel: $('#me-panel') })[p].style.order = i; });
  const mo = validOrder(prefs.mainOrder, ['top', 'content', 'composer']);
  mo.forEach((p, i) => { ({ top: $('#top'), content: $('#content'), composer: $('#composer') })[p].style.order = i * 2; });
  $('#call').style.order = mo.indexOf('content') * 2 - 1;
  $('#banner').style.order = prefs.statusPos === 'bottom' ? 2 : 0;
  $('#titlebar').style.order = -1;
  app.style.order = 1;
}
addEventListener('resize', () => applyLayout());
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
let joinCode = null;
{
  const m = location.hash.match(/join=([0-9a-f]{40})/i);
  if (m) { joinCode = m[1].toLowerCase(); history.replaceState(null, '', location.pathname + location.search); }
  else try { joinCode = sessionStorage.getItem(JOIN_KEY); } catch {}
}
ready.then((ok) => {
  if (CUSTOMIZE) { lastLocal = JSON.stringify(settingsData()); if (ok) adoptSettings(); renderCustomize(); return; }
  lastLocal = JSON.stringify(settingsData());
  if (joinCode) { if (ok) { adoptProfile(); renderAll(); } return appJoin(joinCode); }
  if (ok) { adoptProfile(); adoptSettings(); renderAll(); joinPendingInvite(); finishLinking(); Store.profileExtras(Store.myId()).then(() => { questCheck(); renderSide(); setTimeout(noteBadges, 4000); }, () => {}); return; }
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

// guard: () => true when there are unsaved changes (then closing or switching pages doesn't happen; the page says so)
function overlay(navItems, firstSection, render, { guard } = {}) {
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
  let gone = false;
  function shut(force) {
    if (gone || (force !== true && guard && guard())) return;
    gone = true;
    document.removeEventListener('keydown', esc); closeColor();
    if (animOn('settings')) { box.classList.add('closing'); setTimeout(() => box.remove(), 180); } else box.remove();
    renderAll();
  }
  const esc = (e) => { if (e.key === 'Escape') shut(); };
  document.addEventListener('keydown', esc);
  // (the list is made once: clicking an item doesn't replace it under the pointer, so its slide doesn't start over)
  const navBtns = new Map(), heads = [];
  let meBox = null;
  for (const item of navItems) {
    if (item.head) { const h = el('h4', {}, typeof item.head === 'function' ? item.head() : item.head); if (typeof item.head === 'function') heads.push([h, item.head]); nav.append(h); continue; }
    if (item.hr) { nav.append(el('hr')); continue; }
    if (item.profile) { meBox = el('div', { className: 'sx-me' }); nav.append(meBox); continue; }
    if (item.search) {
      const q = el('input', { type: 'text', placeholder: 'Search settings', value: navQuery,
        style: 'width:100%;background:var(--input);border:1px solid var(--line);border-radius:8px;padding:7px 10px;color:var(--text);font:inherit;margin-bottom:6px' });
      q.oninput = () => { navQuery = q.value.toLowerCase(); for (const b of nav.querySelectorAll('button')) b.hidden = !!navQuery && !b.textContent.toLowerCase().includes(navQuery); };
      nav.append(q); continue;
    }
    const b = el('button', { className: item.cls || '', onclick: () => { if (item.action) return item.action(shut); if (section === item.id || (guard && guard())) return; section = item.id; draw(); } });
    if (item.icon) b.append(icon(item.icon, 17));
    b.append(el('span', {}, item.label));
    navBtns.set(item.id, b); nav.append(b);
  }
  function draw() {
    for (const [id, b] of navBtns) b.classList.toggle('on', id === section);
    for (const [h, f] of heads) h.replaceChildren(f());
    if (meBox) {
      const edit = el('span', { className: 'sx-edit', onclick: () => { shut(); openProfileEditor(); } }, 'Edit Profile', icon('edit', 13));
      meBox.replaceChildren(avatarEl(asMember(), { size: 42 }), el('div', { className: 'who' }, styledName(el('b', {}, me.name), asMember()), edit));
    }
    const inner = el('div', { className: 'sx-inner' + (section !== shownSection ? ' enter' : '') }, ...[render(section, draw, shut)].flat().filter(Boolean));
    shownSection = section; body.replaceChildren(inner);
  }
  let shownSection = null;
  draw();
  document.body.append(box);
  return { shut, go: (s) => { section = s; draw(); } };
}

// the logo at the top of the sign-in windows (in the look you picked)
const sgLogo = () => el('div', { className: 'sg-logo lgwrap' }, logoEl(appLogo()));
// ===================== signing in =====================
// Discord, GitHub or an emailed link/code (Supabase), and the older paste-a-GitHub-token way for the data repository
function signInDialog(after, title, startWith) {
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
    const btns = el('div', { className: 'sg-btns' }, provider('discord', 'Discord'), provider('github', 'GitHub'));
    const or = el('div', { className: 'sg-or' }, el('span', {}, 'or with your email')), byEmail = el('div', { className: 'sg-row' }, email, send);
    // only offer what the project has switched on (a button for one that's off would lead to an error page)
    (Store.providers ? Store.providers() : Promise.resolve({ discord: true, github: true, email: true })).then((on) => {
      for (const b of [...btns.children]) if (!on[b.classList.contains('discord') ? 'discord' : 'github']) b.remove();
      if (!btns.children.length) { btns.remove(); or.remove(); }
      if (!on.email) { or.remove(); byEmail.remove(); }
    });
    box.replaceChildren(
      sgLogo(),
      el('h3', {}, title || 'Sign in to Fluentdat'),
      el('p', { className: 'sg-sub' }, 'Chat with your team: servers, DMs and friends, live on every device.'),
      btns, or, byEmail,
      msg,
      el('button', { className: 'sg-alt', onclick: usernameForm }, icon('user', 16), el('span', {}, 'Log in with a username and password')),
      el('div', { className: 'row' }, el('button', { className: 'btn ghost', onclick: () => tokenForm(false) }, icon('key', 16), ' GitHub token instead'), el('span', { style: 'flex:1' }), cancel));
  }

  // accounts made from a one-time link have a username and a password, and no email
  function usernameForm() {
    say();
    const user = el('input', { type: 'text', autocomplete: 'username', autocapitalize: 'off', spellcheck: false, maxLength: 25 });
    const pw = el('input', { type: 'password', autocomplete: 'current-password', maxLength: 72 });
    const go = el('button', { className: 'btn primary wide' }, 'Log In');
    go.onclick = async () => {
      const h = user.value.trim().replace(/^@/, ''), p = pw.value;
      if (!h) { say('Type your username.'); return user.focus(); }
      if (!p) { say('Type your password.'); return pw.focus(); }
      go.disabled = true; go.textContent = 'Logging in…'; say();
      try { const acc = await Store.signInUsername(h, p); done(acc ? acc.login : h); }
      catch (e) { say(e); go.disabled = false; go.textContent = 'Log In'; pw.select(); }
    };
    for (const i of [user, pw]) i.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    box.replaceChildren(sgLogo(),
      el('h3', {}, 'Welcome back!'), el('p', { className: 'sg-sub' }, 'Log in with the username and password you made from your invite link.'),
      el('div', { className: 'field jf' }, el('label', {}, 'Username', el('span', { className: 'req' }, ' *')), user),
      el('div', { className: 'field jf' }, el('label', {}, 'Password', el('span', { className: 'req' }, ' *')), pw),
      msg, go,
      el('div', { className: 'row' }, Store.configured ? el('button', { className: 'btn ghost', textContent: 'Other ways to sign in', onclick: home }) : null, el('span', { style: 'flex:1' }), cancel));
    setTimeout(() => user.focus(), 0);
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
  if (startWith === 'username' && Store.configured) usernameForm(); else home();
}
// ---------- accounts from a one-time link (…/Fluentdat/#join=…): a username and a password, no email ----------
// Only the people who run Fluentdat can make the links (User Settings → Invites & Reports). Each makes one account.
const keepJoin = (code) => { try { if (code) sessionStorage.setItem(JOIN_KEY, code); else sessionStorage.removeItem(JOIN_KEY); } catch {} };
async function appJoin(code) {
  keepJoin(code);
  if (!Store.configured) { keepJoin(null); return toast('Making an account needs Fluentdat’s sign-in, which isn’t set up here.'); }
  const w = modal({ cls: 'sg join', body: [sgLogo(), el('h3', {}, 'Checking your invite…')] });
  const shut = () => { keepJoin(null); w.close(); };
  if (Store.kind === 'supabase') {
    const acc = Store.account() || {};
    return w.fill([sgLogo(), el('h3', {}, 'You’re already signed in'),
      el('p', { className: 'sg-sub' }, `You’re signed in as @${acc.login}. This link makes a new account: keep it for whoever it’s for, or sign out here to make one.`),
      el('div', { className: 'row' }, el('button', { className: 'btn', onclick: shut }, 'Stay Signed In'),
        el('button', { className: 'btn primary', onclick: async () => { w.close(); await Store.signOut(); renderAll(); appJoin(code); } }, 'Sign Out'))]);
  }
  let info = null;
  try { info = await Store.appInviteCheck(code); } catch (e) { info = { error: String((e && e.message) || e) }; }
  if (!info || !info.ok) {
    return w.fill([el('div', { className: 'join-bad' }, icon('link', 30)), el('h3', { className: 'center' }, 'Invite Invalid'),
      el('p', { className: 'sg-sub center' }, info && info.error ? info.error : 'This invite link has expired or was already used. Ask for a new one.'),
      el('button', { className: 'btn primary wide', onclick: shut }, 'Continue to Fluentdat')]);
  }
  const msg = el('div', { className: 'sg-msg' });
  const say = (e) => { msg.textContent = e ? String(e.message || e) : ''; };
  const field = (label, input, hint, required) => {
    const f = el('div', { className: 'field jf' }, el('label', {}, label, required ? el('span', { className: 'req' }, ' *') : null), input, hint ? el('div', { className: 'jf-hint' }, hint) : null);
    return f;
  };
  const name = el('input', { type: 'text', maxLength: 40, autocomplete: 'nickname' });
  const user = el('input', { type: 'text', maxLength: 24, autocomplete: 'username', autocapitalize: 'off', spellcheck: false });
  const pw = el('input', { type: 'password', maxLength: 72, autocomplete: 'new-password' });
  const pw2 = el('input', { type: 'password', maxLength: 72, autocomplete: 'new-password' });
  const userHint = el('span', {}, 'Letters, numbers and underscores. It’s how people add you, and how you log in.');
  const go = el('button', { className: 'btn primary wide' }, 'Continue');
  user.oninput = () => {
    const v = user.value;
    if (/[A-Z]/.test(v)) { const at = user.selectionStart; user.value = v.toLowerCase(); user.setSelectionRange(at, at); }
    const bad = user.value && !/^[a-z0-9_]*$/.test(user.value);
    userHint.textContent = bad ? 'Only letters, numbers and underscores.' : 'Letters, numbers and underscores. It’s how people add you, and how you log in.';
    userHint.parentElement.classList.toggle('bad', !!bad);
  };
  go.onclick = async () => {
    const h = user.value.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{2,24}$/.test(h)) { say('A username is 2 to 24 letters, numbers or underscores.'); return user.focus(); }
    if (pw.value.length < 8) { say('Your password needs at least 8 characters.'); return pw.focus(); }
    if (pw.value !== pw2.value) { say('The two passwords aren’t the same.'); return pw2.focus(); }
    go.disabled = true; go.textContent = 'Making your account…'; say();
    try { await Store.redeemAppInvite(code, h, pw.value, name.value.trim() || h); }
    catch (e) { say(e); go.disabled = false; go.textContent = 'Continue'; return; }
    keepJoin(null); w.close(); adoptProfile(); renderAll(); welcomeSetup();
  };
  for (const i of [name, user, pw, pw2]) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
  w.fill([sgLogo(),
    el('div', { className: 'join-by' }, el('b', {}, info.by), ' invited you to Fluentdat'),
    el('h3', { className: 'center' }, 'Create an account'),
    field('Display Name', name, 'What others see. Emoji and spaces are fine; you can change it any time.'),
    field('Username', user, userHint, true),
    field('Password', pw, 'At least 8 characters. There’s no email to reset it with, so keep it somewhere safe.', true),
    field('Confirm Password', pw2, null, true),
    msg, go,
    el('div', { className: 'join-foot' }, info.expires ? `This link works once, until ${new Date(info.expires).toLocaleDateString([], { month: 'short', day: 'numeric' })}. ` : 'This link works once. ',
      el('button', { className: 'link-btn', onclick: () => { w.close(); signInDialog(null, null, 'username'); } }, 'Already have an account?'))]);
  setTimeout(() => name.focus(), 0);
}
// just made an account: make it yours (or skip it; it's all in the profile editor later)
function welcomeSetup() {
  let avatar = me.avatar || '', color = me.color;
  const pv = el('div', { className: 'ws-av' });
  const draw = () => pv.replaceChildren(avatarEl({ name: me.name, color, avatar, me: true }, { size: 96 }));
  const up = el('button', { className: 'btn', onclick: () => pickPicture({ w: 256, h: 256, round: true, title: 'Your Picture', ok: 'Use It', maxChars: 150000 }).then((d) => { if (d) { avatar = d; draw(); } }) }, icon('image', 16), 'Upload a Picture');
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => { const b = el('button', { className: c === color ? 'on' : '', title: c }); b.style.background = c; b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.toggle('on', x === b)); draw(); }; return b; }));
  const pron = el('input', { type: 'text', maxLength: 24, placeholder: 'she/her, they/them…', value: me.pronouns || '' });
  const about = el('textarea', { maxLength: 300, placeholder: 'A little about you', className: 'area', value: me.about || '' });
  const w = modal({ cls: 'sg ws', body: [
    el('h3', { className: 'center' }, `Welcome, ${me.name}!`), el('p', { className: 'sg-sub center' }, 'Make your profile yours. You can skip this and do it later: click your name at the bottom left, then Edit Profile.'),
    el('div', { className: 'ws-top' }, pv, el('div', { className: 'ws-pick' }, up, swatches)),
    el('div', { className: 'field' }, el('label', {}, 'Pronouns'), pron), el('div', { className: 'field' }, el('label', {}, 'About'), about)],
    actions: [el('button', { className: 'btn ghost', onclick: () => { w.close(); toast(`You’re in, @${(Store.account() || {}).login}!`); } }, 'Skip'), el('span', { style: 'flex:1' }),
      el('button', { className: 'btn primary', onclick: () => {
        me = { ...me, avatar, color, pronouns: pron.value.trim(), about: about.value.trim() };
        saveMe(); pushProfile(); renderAll(); w.close(); toast('You’re all set. Welcome to Fluentdat!');
      } }, 'Done')] });
  draw();
}
// on signing in: take the profile that's already on GitHub, or put this browser's up there
function adoptProfile() {
  if (!Store.signedIn) return;
  const p = Store.myProfile();
  if (p && p.name) {
    const next = { ...me, name: p.name, color: p.color || me.color, avatar: p.avatar || '', pronouns: p.pronouns || '', about: p.about || '', status: p.status || me.status,
      statusUntil: p.status && p.status !== me.status ? 0 : me.statusUntil || 0,       // (a status changed elsewhere has no time limit here)
      banner: p.banner || '', plate: p.plate || '', ...(Store.styled && Store.styled() ? { theme: p.theme || null, style: p.style || null } : {}),
      ...(Store.canPlay && Store.canPlay() ? { playing: p.playing || null } : {}),
      ...(Store.canDecorate && Store.canDecorate() ? { decoration: p.decoration || '', effect: p.effect || '' } : {}),
      ...(Store.canFrame && Store.canFrame() ? { frame: p.frame || '', bubble: p.bubble || '', bubbleUntil: p.bubble ? p.bubbleUntil || 0 : 0 } : {}) };
    if (p.id) next.id = p.id;
    if (JSON.stringify(next) !== JSON.stringify(me)) { me = next; saveMe(); }
  }
  else pushProfile();
}
// what you're playing: you say so (a web page can't see your games), and it shows under your name for up to 12 hours
function setPlaying(g) {
  if (Store.kind === 'supabase' && !Store.canPlay()) return toast('Showing what you play needs the newest supabase/setup.sql: run it again in Supabase.');
  const game = g ? cleanGame(g) : null; if (game) delete game.i;
  me.playing = game ? { ...game, at: new Date().toISOString() } : null; saveMe();
  Store.setPlaying(game);
  renderMembers();
  if (game) questTick('play');
}
const pushProfile = () => {
  if (!Store.signedIn) return;
  const t = me.theme || [], st = me.style || {};
  Store.setProfile({ name: me.name, color: me.color, avatar: me.avatar, pronouns: me.pronouns, about: me.about, status: me.status, banner: me.banner || '', plate: me.plate || '',
    theme1: t[0] || '', theme2: t[1] || '', name_font: st.font || '', name_effect: st.effect || '', name_color1: st.c1 || '', name_color2: st.c2 || '',
    decoration: me.decoration || '', effect: me.effect || '', frame: me.frame || '', bubble: myBubble(), bubble_until: myBubble() && me.bubbleUntil ? new Date(me.bubbleUntil).toISOString() : null });
};

// choose a banner or nameplate: nothing, one of the gradients, or your own picture (made small enough to keep)
// plain colours to start a banner or nameplate from (flat, like the colour buttons elsewhere)
const FLAT = [['#5865f2', 'Blurple'], ['#eb459e', 'Fuchsia'], ['#ed4245', 'Red'], ['#f57731', 'Orange'], ['#f0b232', 'Yellow'],
  ['#23a55a', 'Green'], ['#1abc9c', 'Teal'], ['#00a8fc', 'Sky'], ['#9b59b6', 'Purple'], ['#2b2d31', 'Charcoal']];
function picturePicker(value, onPick, { w = 960, h = 540, label = 'Upload a picture' } = {}) {
  const grid = el('div', { className: 'grads' });
  const isColor = (v) => /^#[0-9a-f]{6}(,#[0-9a-f]{6})?$/i.test(v || '');
  // any colour: the tile picks it; then "Fade to" (a second colour) appears beside the tiles
  const colorTile = (v) => {
    const [a, b] = isColor(v) ? v.split(',') : ['', ''];
    const custom = isColor(v) && (!!b || !FLAT.some(([c]) => c === a.toLowerCase()));        // (a preset lights up its own tile instead)
    const t = el('button', { className: 'grad color' + (custom ? ' on' : ''), title: 'Any colour' });
    if (custom) t.style.background = b ? `linear-gradient(135deg, ${a}, ${b})` : a; else t.append(icon('brush', 18));
    t.onclick = (e) => { e.stopPropagation(); openColor({ anchor: t, value: a || '#5865f2', title: 'Colour',
      onInput: (c) => { const nv = b ? `${c},${b}` : c; t.style.background = b ? `linear-gradient(135deg, ${c}, ${b})` : c; onPick(nv); },
      onDone: (c) => { const nv = b ? `${c},${b}` : c; draw(nv); onPick(nv); } }); };
    return t;
  };
  const fadeRow = (v) => {
    if (!isColor(v)) return null;
    const [a, b] = v.split(',');
    const sw2 = colorSwatch(b || '', (c, done) => { const nv = `${a},${c}`; if (done) draw(nv); onPick(nv); }, { title: 'Fade to' });
    return el('div', { className: 'grad-fade' }, el('span', {}, 'Fade to'), sw2, b ? el('button', { className: 'link-btn', onclick: () => { draw(a); onPick(a); } }, 'No fade') : null);
  };
  const draw = (v) => { grid.replaceChildren(colorTile(v),
    el('button', { className: 'grad none' + (!v ? ' on' : ''), title: 'None', onclick: () => { draw(''); onPick(''); } }, icon('ban', 18)),
    ...FLAT.map(([c, name]) => { const b = el('button', { className: 'grad flat' + (String(v).toLowerCase() === c ? ' on' : ''), title: name, onclick: () => { draw(c); onPick(c); } }); b.style.background = c; return b; }),
    el('button', { className: 'grad up' + (v && v.startsWith('data:') ? ' on' : ''), title: label, onclick: () => pickPicture({ w, h, title: label.replace(/^Upload an? /, (m) => '').replace(/^./, (c) => c.toUpperCase()), ok: 'Use It', maxChars: w > 600 ? 380000 : 190000 }).then((d) => {
      if (d) { draw(d); onPick(d); }
    }) }, v && v.startsWith('data:') ? el('img', { src: safeImg(v), alt: '' }) : icon('image', 18))); const f = fadeRow(v); if (f) grid.append(f); };
  draw(value || '');
  return grid;
}

// ===================== the profile editor =====================
// Its own window, like Discord's: what you can change down the left, and your profile as everyone sees it in the middle,
// changing as you go. Nothing is saved until Save Changes; the bar that says so slides up, and shakes if you try to leave.
// your profile editor, like Discord's: on the left, tiles that open their own windows (nameplate, avatar and decoration,
// name style, theme and banner, effect and frame); in the middle, your profile as others see it, where you change your
// words in place (name, pronouns, server tag, bio, connections); on the right, your Board, Activity and Wishlist.
// What you change waits in the bar at the bottom until you save it (connections and the Board save as you go)
function openProfileEditor() {
  closePop(); closeTagCard();
  if (document.querySelector('.pe-dlg')) return;
  const live = Store.kind === 'supabase';
  const fromMe = () => ({ name: me.name, pronouns: me.pronouns || '', about: me.about || '', color: me.color, avatar: me.avatar || '', banner: me.banner || '', plate: me.plate || '',
    theme: me.theme ? [me.theme[0] || '', me.theme[1] || ''] : ['', ''], style: { font: '', effect: '', c1: '', c2: '', ...(me.style || {}) }, tag: (myTag() || {}).server || '',
    decoration: me.decoration || '', effect: me.effect || '', frame: me.frame || '' });
  let base = fromMe(), d = JSON.parse(JSON.stringify(base));
  const dirty = () => JSON.stringify(d) !== JSON.stringify(base);
  const asUser = () => ({ name: d.name || 'You', color: d.color, avatar: d.avatar, status: me.status, me: true, style: hasStyle(d.style) ? d.style : null, decoration: d.decoration,
    effect: d.effect, frame: d.frame, plate: d.plate, banner: d.banner, about: d.about, bubble: myBubble(), login: (Store.account() || {}).login || '', pronouns: d.pronouns,
    theme: d.theme[0] || d.theme[1] ? d.theme : null,
    tag: live && d.tag ? (() => { const sv = Store.server(d.tag); return sv && sv.tag ? { text: sv.tag, badge: sv.tagBadge, color: sv.tagColor, server: sv.id } : null; })() : null });
  const later = (what) => toast(`${what} needs the newest supabase/setup.sql: run it again in Supabase.`);
  // ---- the left: what you can change, each in a window of its own ----
  const sec = (title, ...tiles) => el('section', { className: 'pe-sec' }, el('h4', {}, title), el('div', { className: 'pe-tiles' }, ...tiles));
  const tile = (cls, title, onclick) => el('button', { className: 'pe-tile ' + cls, title, onclick });
  const plateT = tile('wide', 'Change Nameplate', () => surfaceDialog('plate', d.plate, (v) => { d.plate = v; update(); }, asUser));
  const avT = tile('sq', 'Change Avatar', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    menu([{ label: 'Upload a Picture', icon: 'image', action: () => pickPicture({ w: 256, h: 256, round: true, title: 'Your Picture', ok: 'Use It', maxChars: 150000 }).then((p) => { if (p) { d.avatar = p; update(); } }) },
      d.avatar && { label: 'Remove Picture', icon: 'trash', action: () => { d.avatar = ''; update(); } },
      { label: 'Colour Behind Your Initials', icon: 'palette', action: () => openColor({ anchor: avT, value: d.color, title: 'Avatar colour', onInput: (c) => { d.color = c; update(); }, onDone: (c) => { d.color = c; update(); } }) }], r.left, r.bottom + 6);
  });
  const decoT = tile('sq', 'Change Avatar Decoration', () => (live && !Store.canDecorate() ? later('The Shop') : lookDialog('deco', d.decoration, (v) => { d.decoration = v; update(); }, asUser)));
  const styleT = tile('wide', 'Change Display Name Style', () => nameStyleDialog(d.style, (st) => { d.style = st; update(); }, asUser));
  const themeT = tile('sq', 'Change Profile Theme', () => themeDialog(d.theme, (t) => { d.theme = t; update(); }, asUser));
  const bannerT = tile('sq', 'Change Banner', () => surfaceDialog('banner', d.banner, (v) => { d.banner = v; update(); }, asUser));
  const fxT = tile('sq', 'Change Profile Effect', () => (live && !Store.canDecorate() ? later('The Shop') : lookDialog('effect', d.effect, (v) => { d.effect = v; update(); }, asUser)));
  const frameT = tile('sq', 'Change Profile Frame', () => (live && !Store.canFrame() ? later('Profile frames') : lookDialog('frame', d.frame, (v) => { d.frame = v; update(); }, asUser)));
  const which = el('button', { className: 'pe-which', title: 'Which profile', onclick: (e) => {
    const r = e.currentTarget.getBoundingClientRect(), mine = live ? Store.servers() : [];
    menu([{ label: 'Main Profile', check: true, action: () => {} }, mine.length && '-', ...mine.map((sv) => ({ label: sv.name, hint: Store.nickIn(sv.id, Store.myId()) ? 'Nickname: ' + Store.nickIn(sv.id, Store.myId()) : 'A nickname just for this server',
      action: () => serverProfileDialog(sv.id) }))], r.left, r.bottom + 6);
  } }, el('b', {}, 'Main Profile'), icon('chevD', 16));
  const side = el('div', { className: 'pe-side' }, which,
    sec('Nameplate', plateT), sec('Avatar & Decoration', avT, decoT), sec('Display Name Style', styleT), sec('Theme & Banner', themeT, bannerT), sec('Profile Effect & Frame', fxT, frameT));
  // ---- the middle: your profile, where your words change in place ----
  const nameIn = el('input', { type: 'text', className: 'pe-name-in', maxLength: 32, placeholder: 'Your display name', value: d.name, hidden: true });
  const nameView = el('button', { className: 'pe-name', title: 'Change your display name', onclick: () => { nameView.hidden = true; nameIn.hidden = false; nameIn.focus(); nameIn.select(); } });
  nameIn.oninput = () => { d.name = nameIn.value; update(); };
  nameIn.onblur = () => { nameIn.hidden = true; nameView.hidden = false; };
  nameIn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.stopPropagation(); nameIn.blur(); } };
  const pronIn = el('input', { type: 'text', className: 'pe-pron-in', maxLength: 40, placeholder: 'Add pronouns', value: d.pronouns });
  pronIn.oninput = () => { d.pronouns = pronIn.value; update(); };
  const tagSel = live ? (() => {
    const tagged = Store.servers().filter((x) => x.tag);
    return tagged.length ? sel(d.tag, [['', 'Server Tag'], ...tagged.map((x) => [x.id, `${x.tag} · ${x.name}`])], (v) => { d.tag = v; update(); }) : null;
  })() : null;
  if (tagSel) tagSel.classList.add('pe-tag-sel');
  const bioIn = el('textarea', { className: 'pe-bio-in', maxLength: 300, rows: 2, placeholder: 'Tell people a little about you', value: d.about });
  const count = el('span', { className: 'pe-count' });
  const fit = () => { bioIn.style.height = 'auto'; bioIn.style.height = bioIn.scrollHeight + 'px'; };
  bioIn.oninput = () => { d.about = bioIn.value; fit(); update(); };
  const xid = myXid(), now = () => Store.extrasNow(xid) || { connections: [], widgets: [], activity: [] };
  const saveX = async (patch) => { await attempt(() => Store.setProfileExtras(patch)); drawExtras(); };
  const head = el('div', { className: 'pe-head' }), avBox = el('div', { className: 'pe-cav' }), bubbleBox = el('div', { className: 'pe-bub' });
  const badgesBox = el('div', { className: 'pe-badges', title: 'Customize your badges', onclick: () => customizeBadges(() => drawBadges()) });
  const connBox = el('div', { className: 'pe-conns' });
  // (as every profile card is: your picture under the banner, with your name, username, pronouns and bubble beside it)
  const card = el('div', { className: 'pe-card' }, head,
    el('div', { className: 'pe-id' }, avBox, el('div', { className: 'pe-names' }, nameView, nameIn,
      el('div', { className: 'pe-handle' }, el('span', {}, (Store.account() || {}).login || (live ? '' : 'you')), el('span', { className: 'pe-dot' }, '•'), pronIn, tagSel), bubbleBox)),
    el('div', { className: 'pe-cbody' }, badgesBox,
      el('div', { className: 'pe-acts' }, el('span', { className: 'btn pe-fake' }, icon('message', 16), 'Message'),
        el('button', { className: 'btn fp-icon', title: 'Shop', onclick: () => toShop() }, icon('shop', 18)), el('span', { className: 'btn fp-icon pe-fake' }, icon('more', 18))),
      el('section', { className: 'pe-csec' }, el('h4', {}, 'Bio'), bioIn, count),
      el('section', { className: 'pe-csec' }, el('h4', {}, 'Member Since'), el('div', { className: 'fp-since' }, icon('logo', 16), el('span', {}, dateLong((Store.myProfile && Store.myProfile().since) || FIRST_RUN)))),
      el('section', { className: 'pe-csec' }, el('h4', {}, 'Connections'), connBox)));
  const drawBadges = () => badgesBox.replaceChildren(badgeRow(asMember(), { max: 8 }), el('span', { className: 'pe-badges-hint' }, icon('edit', 13), 'Customize'));
  // ---- the right: your Board, Activity and Wishlist ----
  let tab = 'board';
  const tabsEl = el('nav', { className: 'fp-tabs pe-tabs', role: 'tablist' }), list = el('div', { className: 'fp-list pe-list' });
  function drawExtras() {
    const x = now(), conns = x.connections || [];
    connBox.replaceChildren(...conns.map((c) => el('div', { className: 'pe-conn' }, connectionRow(c),
      el('button', { className: 'cx-btn del', title: 'Remove', onclick: () => saveX({ connections: conns.filter((y) => y !== c) }) }, icon('x', 14)))),
      el('button', { className: 'fp-addconn', onclick: () => pickService(drawExtras) }, icon('plus', 15), 'Add Connection'));
    tabsEl.replaceChildren(...[['board', 'Board'], ['activity', 'Activity'], ['wishlist', 'Wishlist']].map(([id, label]) =>
      el('button', { className: id === tab ? 'on' : '', role: 'tab', onclick: () => { tab = id; drawExtras(); } }, label)));
    list.replaceChildren(...(tab === 'board' ? boardView(x, true, saveX) : tab === 'activity' ? activityView(asMember(), x, true, () => drawExtras()) : wishlistView(x, true, saveX)));
  }
  const right = el('div', { className: 'pe-right' }, tabsEl, list);
  const bar = el('div', { className: 'pe-bar' }, el('span', {}, 'Careful — you have unsaved changes!'),
    el('button', { className: 'btn ghost', onclick: () => { d = JSON.parse(JSON.stringify(base)); refill(); update(); } }, 'Reset'),
    el('button', { className: 'btn primary', onclick: save }, 'Save Changes'));
  function refill() { nameIn.value = d.name; pronIn.value = d.pronouns; bioIn.value = d.about; fit(); if (tagSel) tagSel.value = d.tag; }
  function update() {
    const u = asUser();
    // (the tiles: what each looks like now)
    const row = el('div', { className: 'mem pe-plate-row' }, avatarEl(u, { size: 26 }), el('div', { className: 'who' }, el('div', { className: 'nm' }, styledName(el('span', { className: 'nmt' }, u.name), u))));
    plateT.replaceChildren(plateOn(row, d.plate));
    avT.replaceChildren(avatarEl({ ...u, decoration: '', me: false, status: '' }, { size: 64 }), el('span', { className: 'pe-tile-ic' }, icon('image', 14)));
    decoT.replaceChildren(d.decoration ? avatarEl({ ...u, me: false, avatar: '', color: '#3f4248', name: ' ', status: '' }, { size: 54 }) : el('span', { className: 'pe-plus' }, icon('plusCircle', 30)));
    styleT.replaceChildren(styledName(el('span', { className: 'pe-sname' }, u.name), u));
    themeT.replaceChildren(el('span', { className: 'pe-th', style: `background:${d.theme[0] || '#4e5058'}` }), el('span', { className: 'pe-th', style: `background:${d.theme[1] || '#2b2d31'}` }));
    bannerT.replaceChildren(d.banner ? el('span', { className: 'pe-bn', style: `background:${paint(d.banner)}` }) : el('span', { className: 'pe-plus' }, icon('plusCircle', 30)));
    fxT.replaceChildren(d.effect ? el('span', { className: 'pe-mini' }, effectEl(d.effect)) : el('span', { className: 'pe-plus' }, icon('plusCircle', 30)));
    frameT.replaceChildren(d.frame ? el('span', { className: 'pe-mini' }, frameEl(d.frame)) : el('span', { className: 'pe-plus' }, icon('plusCircle', 30)));
    // (the card)
    const banner = el('div', { className: 'pe-banner' }); setBanner(banner, d.banner, d.color);
    head.replaceChildren(banner);
    avBox.replaceChildren(avatarEl(u, { size: 92 })); bubbleBox.replaceChildren(...[bubbleEl(u, { mine: true })].filter(Boolean));
    nameView.replaceChildren(styledName(el('span', {}, d.name || 'You'), u), el('span', { className: 'pe-pen' }, icon('edit', 14)));
    count.textContent = `${d.about.length}/300`;
    for (const n of [...card.querySelectorAll(':scope > .pfx, :scope > .pframe')]) n.remove();
    card.classList.remove('framed');
    themeCard(card, u.theme, d.color || u.color); withEffect(card, d.effect); withFrame(card, d.frame);
    bar.classList.toggle('on', dirty());
  }
  async function save() {
    const st = d.style, theme = d.theme[0] || d.theme[1] ? [d.theme[0], d.theme[1]] : null;
    me = { ...me, name: d.name.trim().slice(0, 32) || 'You', pronouns: d.pronouns.trim(), about: d.about.trim(), color: d.color, avatar: d.avatar, banner: d.banner, plate: d.plate,
      theme, style: hasStyle(st) ? { font: st.font, effect: st.effect, c1: st.c1, c2: st.c2 } : null, decoration: d.decoration, effect: d.effect, frame: d.frame };
    saveMe(); pushProfile();
    if (live && d.tag !== base.tag && (await attempt(() => Store.adoptTag(d.tag || null))) === null) return;
    base = fromMe(); d = JSON.parse(JSON.stringify(base)); refill(); update(); renderAll();
    toast('Profile saved.');
  }
  const leave = () => {
    if (!dirty()) return w.close();
    bar.classList.remove('shake'); void bar.offsetWidth; bar.classList.add('shake');
  };
  const toShop = () => { if (dirty()) return leave(); w.close(); view = 'home'; dmId = null; homePage = 'shop'; renderAll(); };
  const w = modal({ cls: 'pe-dlg', body: [el('div', { className: 'pe' }, side, el('div', { className: 'pe-main' }, card), right), bar], onClose: () => closeColor() });
  // (Escape and the backdrop only close it when nothing is unsaved; otherwise the bar shakes)
  const guard = (e) => { if (e.key === 'Escape' && document.querySelector('.pe-dlg') && dirty() && !document.querySelector('.cp, .ns-dlg, .lk-dlg, .ctx, .sf-dlg, .th-dlg')) { e.stopImmediatePropagation(); leave(); } };
  addEventListener('keydown', guard, true);
  const off = new MutationObserver(() => { if (!w.scrim.isConnected) { removeEventListener('keydown', guard, true); off.disconnect(); } });
  off.observe(document.body, { childList: true });
  w.scrim.addEventListener('mousedown', (e) => { if (e.target === w.scrim && dirty()) { e.stopImmediatePropagation(); leave(); } }, true);
  w.scrim.addEventListener('click', (e) => { if (e.target === w.scrim && dirty()) e.stopImmediatePropagation(); }, true);
  w.box.prepend(el('button', { className: 'fp-x', title: 'Close', onclick: leave }, icon('x', 20)));
  update(); drawExtras(); drawBadges(); setTimeout(fit, 0);
  Store.profileExtras(xid).then(() => { if (w.scrim.isConnected) { drawExtras(); drawBadges(); } }, () => {});
}
// a small profile card to try a look on (Discord's previews), laid out as every profile card is: banner, picture with the
// name beside it, a few words and a button
function mockCard(u, { effect = u.effect, frame = u.frame } = {}) {
  const c = el('div', { className: 'mock-card' }, el('div', { className: 'mock-b' }),
    el('div', { className: 'mock-id' }, el('div', { className: 'mock-av' }, avatarEl(u, { size: 64 })), el('div', { className: 'mock-names' }, el('b', { className: 'mock-n' }, styledName(el('span', {}, u.name), u)), el('small', {}, u.login || 'you'))),
    el('div', { className: 'mock-body' }, el('p', {}, u.about || 'A few words about you go here.'), el('span', { className: 'mock-btn' }, 'Example Button')));
  setBanner(c.firstChild, u.banner, u.color); themeCard(c, u.theme); withEffect(c, effect); withFrame(c, frame);
  return c;
}
// Discord's "Change Avatar Decoration", "Change Profile Effect" and "Change Profile Frame": None, the Shop, and every
// one there is (a few unlock with a Quest), beside a preview of how it looks on you; Apply puts it on (save to keep it)
function lookDialog(kind, current, onApply, who) {
  const LISTS = { deco: [DECORATIONS, 'Change Avatar Decoration', 'Decorations'], effect: [PROFILE_EFFECTS, 'Change Profile Effect', 'Effects'], frame: [FRAMES, 'Change Profile Frame', 'Frames'] };
  const [items, title, word] = LISTS[kind];
  let cur = current || '';
  const grid = el('div', { className: 'lk-grid lk-' + kind }), pv = el('div', { className: 'lk-pv' }), info = el('div', { className: 'lk-info' });
  // (something with a price that isn't yours yet is bought first)
  const apply = el('button', { className: 'btn primary', onclick: async () => { if (!(await buyFlow(kind, cur))) return; onApply(cur); m.close(); } }, 'Apply');
  const toBuy = (id) => { const p = Bux.price(kind, id); return p > 0 && !Bux.owns(kind, id) ? p : 0; };
  const face = (id) => {
    const u = who();
    if (kind === 'deco') return avatarEl({ ...u, decoration: id, me: false, status: '' }, { size: 52 });
    const box = el('span', { className: 'lk-mini' }, el('span', { className: 'lk-mini-b' }), el('span', { className: 'lk-mini-av' }));
    setBanner(box.firstChild, u.banner, u.color); themeCard(box, u.theme);
    return kind === 'effect' ? withEffect(box, id) : withFrame(box, id);
  };
  const draw = () => {
    grid.replaceChildren(
      el('button', { className: 'lk-tile lk-none' + (!cur ? ' on' : ''), title: 'None', onclick: () => { cur = ''; draw(); } }, icon('ban', 26), el('span', {}, 'None')),
      el('button', { className: 'lk-tile lk-shop', title: 'Open the Shop', onclick: () => { m.close(); const ed = document.querySelector('.pe-dlg .fp-x'); toast('Pick one here, or have a look in the Shop after you save.'); if (!ed) { view = 'home'; dmId = null; homePage = 'shop'; renderAll(); } } }, icon('shop', 26), el('span', {}, 'Shop')),
      ...items.map(([id, name, quest]) => {
        const locked = quest && !unlocked(quest) && !(Bux.price(kind, id) > 0);
        const p = toBuy(id);
        return el('button', { className: 'lk-tile' + (cur === id ? ' on' : '') + (locked ? ' locked' : ''), title: name + (p ? ` (${fmtBux(p)} Datbux)` : ''), onclick: () => { cur = id; draw(); } }, face(id),
          locked ? el('span', { className: 'lk-lock' }, icon('lock', 12)) : p ? el('span', { className: 'lk-price' }, icon('coin', 11), fmtBux(p)) : null);
      }));
    const u = { ...who() };
    if (kind === 'deco') {
      const d2 = { ...u, decoration: cur };
      pv.replaceChildren(el('div', { className: 'lk-deco-big' }, avatarEl({ ...d2, me: false, status: '' }, { size: 128 })),
        el('div', { className: 'lk-deco-sizes' }, ...[['online', 64], ['idle', 44], ['dnd', 34], ['offline', 26]].map(([st, sz]) => avatarEl({ ...d2, status: st }, { size: sz, status: st }))));
    } else pv.replaceChildren(mockCard(u, kind === 'effect' ? { effect: cur, frame: u.frame } : { effect: u.effect, frame: cur }));
    const it = items.find((x) => x[0] === cur);
    const price = it ? Bux.price(kind, it[0]) : null, buy = it ? toBuy(it[0]) : 0, locked = !!(it && it[2] && !unlocked(it[2]) && !(price > 0)), qt = it && it[2] ? (questInfo(it[2]) || {}).title || '' : '';
    info.replaceChildren(...(it ? [el('b', {}, it[1]), el('small', {}, locked ? `Unlocks with the Quest “${qt}”` : price > 0 ? (buy ? (qt ? el('span', {}, buxTag(price), ` or finish the Quest “${qt}”`) : buxTag(price)) : 'Yours') : it[2] ? 'A Quest reward · yours' : 'Free')]
      : [el('b', {}, 'None'), el('small', {}, `No ${word.toLowerCase().replace(/s$/, '')}`)]));
    apply.disabled = locked; apply.textContent = buy ? `Buy and Apply · ${fmtBux(buy)}` : 'Apply';
  };
  const m = modal({ cls: 'lk-dlg', body: [el('div', { className: 'lk' }, el('div', { className: 'lk-left' }, el('h3', {}, title), el('h5', {}, 'Your ' + word), grid), el('div', { className: 'lk-right' }, pv, info))],
    actions: [el('span', { style: 'flex:1' }), el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), apply] });
  m.box.prepend(el('button', { className: 'fp-x', title: 'Close', onclick: () => m.close() }, icon('x', 20)));
  draw();
}
// Change Nameplate and Change Banner: a gradient, a colour (or two) or your own picture, with a preview
function surfaceDialog(kind, current, onApply, who) {
  let cur = current || '';
  const pv = el('div', { className: 'sf-pv' });
  // (nameplates from the Shop: yours to use, the rest to buy as you apply one)
  const shopBox = kind === 'plate' && (Store.kind !== 'supabase' || Store.canPlates()) ? el('div', { className: 'sf-shop' }) : null;
  const apply = el('button', { className: 'btn primary', onclick: async () => { if (/^np:/.test(cur) && !(await buyFlow('plate', cur.slice(3)))) return; onApply(cur); m.close(); } }, 'Apply');
  const drawShop = () => {
    if (!shopBox) return;
    shopBox.replaceChildren(el('h5', {}, 'From the Shop'), el('div', { className: 'sf-plates' }, ...NAMEPLATES.map(([id, name]) => {
      const v = 'np:' + id, p = Bux.price('plate', id), buy = p > 0 && !Bux.owns('plate', id);
      const b = el('button', { className: 'sf-np' + (cur === v ? ' on' : ''), title: name + (buy ? ` (${fmtBux(p)} Datbux)` : ''), onclick: () => { cur = v; draw(); } }, buy ? el('span', { className: 'lk-price' }, icon('coin', 10), fmtBux(p)) : null);
      b.style.background = paint(v); plateMove(b, v, true);
      return b;
    })));
    const p = /^np:/.test(cur) ? Bux.price('plate', cur.slice(3)) : 0, buy = p > 0 && !Bux.owns('plate', cur.slice(3));
    apply.textContent = buy ? `Buy and Apply · ${fmtBux(p)}` : 'Apply';
  };
  const draw = () => {
    drawShop();
    const u = { ...who(), [kind]: cur };
    if (kind === 'plate') {
      const rows = [0, 1, 2, 3, 4].map((i) => i === 2 ? plateOn(el('div', { className: 'mem sf-row mine' }, avatarEl(u, { size: 32 }), el('div', { className: 'who' }, el('div', { className: 'nm' }, styledName(el('span', { className: 'nmt' }, u.name), u)))), cur)
        : el('div', { className: 'sf-row ghost' }, el('i', { className: 'sf-dot' }), el('i', { className: 'sf-line' })));
      pv.replaceChildren(el('div', { className: 'sf-list' }, ...rows));
    } else pv.replaceChildren(mockCard(u));
  };
  const m = modal({ cls: 'sf-dlg', title: kind === 'plate' ? 'Change Nameplate' : 'Change Banner', sub: kind === 'plate' ? 'Behind your name in member lists and DMs.' : 'Across the top of your profile.',
    body: [el('div', { className: 'sf' }, el('div', { className: 'sf-left' }, shopBox, shopBox ? el('h5', {}, 'Plain, or your own picture (free)') : null,
      picturePicker(/^np:/.test(cur) ? '' : cur, (v) => { cur = v; draw(); }, kind === 'plate' ? { w: 480, h: 96, label: 'Upload a nameplate' } : { w: 680, h: 240, label: 'Upload a banner' })), pv)],
    actions: [el('span', { style: 'flex:1' }), el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), apply] });
  draw();
}
// Change Profile Theme: two colours (the top of your profile and its bottom), with ready-made pairs and a preview
const THEME_PAIRS = [['#5865f2', '#eb459e'], ['#0f2027', '#2c5364'], ['#232526', '#414345'], ['#ff7e5f', '#feb47b'], ['#134e5e', '#71b280'], ['#41295a', '#2f0743'],
  ['#c94b4b', '#4b134f'], ['#1e3c72', '#2a5298'], ['#fbd3e9', '#bb377d'], ['#000000', '#434343']];
function themeDialog(current, onApply, who) {
  let t = [current[0] || '', current[1] || ''];
  const pv = el('div', { className: 'th-pv' }), pairs = el('div', { className: 'th-pairs' });
  const s1 = colorSwatch(t[0], (c) => { t[0] = c; draw(); }, { title: 'Primary (the top of your profile)' }), s2 = colorSwatch(t[1], (c) => { t[1] = c; draw(); }, { title: 'Accent (the bottom)' });
  const draw = () => {
    pv.replaceChildren(mockCard({ ...who(), theme: t[0] || t[1] ? t : null }));
    pairs.replaceChildren(...THEME_PAIRS.map(([a, b]) => el('button', { className: 'th-pair' + (t[0] === a && t[1] === b ? ' on' : ''), title: `${a} → ${b}`, style: `background:linear-gradient(${a}, ${b})`,
      onclick: () => { t = [a, b]; s1.set(a); s2.set(b); draw(); } })));
  };
  const m = modal({ cls: 'th-dlg', title: 'Change Profile Theme', sub: 'Two colours: your profile fades from one to the other.',
    body: [el('div', { className: 'th' }, el('div', { className: 'th-left' }, el('div', { className: 'th-sw' }, el('label', {}, s1, el('span', {}, 'Primary')), el('label', {}, s2, el('span', {}, 'Accent'))),
      el('h5', {}, 'Ready-made'), pairs), pv)],
    actions: [el('button', { className: 'btn ghost', onclick: () => { t = ['', '']; s1.set(''); s2.set(''); draw(); } }, 'Reset'), el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), el('button', { className: 'btn primary', onclick: () => { onApply([t[0], t[1]]); m.close(); } }, 'Apply')], onClose: () => closeColor() });
  draw();
}
// pick a service to add (from inside a window, where Settings would open underneath)
function pickService(after) {
  const m = modal({ title: 'Add a Connection', cls: 'cx-pickdlg', body: [el('p', { className: 'dlg-sub' }, 'Which of your accounts should your profile show?'),
    el('div', { className: 'cx-grid' }, ...SERVICES.map((s) => el('button', { className: 'cx-pick', title: s.name, onclick: () => { m.close(); addConnection(s.id, after); } }, brandIcon(s.id, 26))))],
    actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel')] });
}

// Discord's "Change Display Name Style": a font, an effect and colours, with a preview, Surprise Me and Apply
function nameStyleDialog(start, onApply, who) {
  let st = { font: '', effect: '', c1: '', c2: '', ...(start || {}) };
  if (!st.effect) st.effect = 'solid';
  const fonts = el('div', { className: 'ns-grid' }), effects = el('div', { className: 'ns-grid fx' }), colors = el('div', { className: 'ns-colors' }), colors2 = el('div', { className: 'ns-colors' });
  const pv = el('div', { className: 'ns-pv' });
  const two = () => ['gradient', 'pop', 'gummy', 'toon', 'glow'].includes(st.effect);
  const c2row = el('div', { className: 'ns-c2' }, el('h5', {}, 'Second Colour'), colors2);
  // (a font with a price that isn't yours yet is bought first)
  const applyBtn = el('button', { className: 'btn primary', onclick: async () => { if (!(await buyFlow('font', st.font))) return; if (!st.c1 && st.effect !== 'prism') st.c1 = '#ffffff'; onApply({ ...st }); w.close(); } }, 'Apply');
  function draw() {
    fonts.replaceChildren(...FONTS.map(([id, label]) => {
      if (id) loadFont(id);
      const p = Bux.price('font', id), buy = p > 0 && !Bux.owns('font', id);
      return el('button', { className: 'ns-tile' + (st.font === id ? ' on' : ''), title: label + (buy ? ` (${fmtBux(p)} Datbux)` : ''), onclick: () => { st.font = id; draw(); } },
        el('span', { style: id ? `font-family:${fontFamily(id)}` : '' }, 'Gg'), el('small', {}, label), buy ? el('span', { className: 'lk-price' }, icon('coin', 10), fmtBux(p)) : null);
    }));
    const p = Bux.price('font', st.font), buy = p > 0 && !Bux.owns('font', st.font);
    applyBtn.textContent = buy ? `Buy and Apply · ${fmtBux(p)}` : 'Apply';
    effects.replaceChildren(...EFFECTS.map(([id, label]) => { const t = el('span', {}, label); styleName(t, { font: '', effect: id, c1: st.c1 || '#ffffff', c2: st.c2 || st.c1 || '#ffffff' }); return el('button', { className: 'ns-tile fx' + (st.effect === id ? ' on' : ''), onclick: () => { st.effect = id; draw(); } }, t); }));
    const swatches = (key, box) => {
      const custom = colorSwatch(st[key], (c) => { st[key] = c; drawPreview(); markColors(); }, { title: 'Any colour' });
      custom.classList.add('ns-custom'); custom.append(icon('brush', 14));
      box.replaceChildren(custom, ...NAME_COLORS.map((c) => el('button', { className: 'ns-sw' + (st[key] === c ? ' on' : ''), style: `background:${c}`, title: c, onclick: () => { st[key] = c; draw(); } })));
    };
    swatches('c1', colors); swatches('c2', colors2);
    c2row.hidden = !two();
    drawPreview();
  }
  const markColors = () => { for (const [key, box] of [['c1', colors], ['c2', colors2]]) for (const b of box.querySelectorAll('.ns-sw')) b.classList.toggle('on', b.title === st[key]); };
  function drawPreview() {
    const u = { ...who(), style: { ...st, c1: st.c1 || '#ffffff' } };
    const nm = styledName(el('span', { className: 'nm' }, u.name), u);
    pv.replaceChildren(
      el('div', { className: 'ns-pcard' }, avatarEl(u, { size: 56 }), el('div', {}, el('div', { className: 'ns-pname' }, styledName(el('span', {}, u.name), u)), el('div', { className: 'ns-phandle' }, u.login || 'you'))),
      el('div', { className: 'msg ns-pmsg' }, avatarEl(u), el('div', { className: 'body' }, el('div', { className: 'meta' }, nm, el('span', { className: 'when' }, 'Today at 11:15 PM')), el('div', { className: 'text' }, 'does anyone read this?'))),
      el('div', { className: 'mem ns-pmem' }, avatarEl(u), el('div', { className: 'who' }, el('div', { className: 'nm' }, styledName(el('span', { className: 'nmt' }, u.name), u)))));
  }
  const w = modal({ cls: 'ns-dlg', body: [el('div', { className: 'ns-wrap' },
    el('div', { className: 'ns-left' }, el('h3', {}, 'Change Display Name Style'),
      el('h5', {}, 'Choose Font'), fonts, el('h5', {}, 'Choose Effect'), effects, el('h5', {}, 'Choose Colour'), colors, c2row),
    el('div', { className: 'ns-right' }, pv, el('p', { className: 'hint' }, 'In a server, a role’s colour shows instead of these colours (your font stays).')))],
    actions: [el('button', { className: 'btn ghost', onclick: () => { onApply({ font: '', effect: '', c1: '', c2: '' }); w.close(); } }, 'Remove Style'), el('span', { style: 'flex:1' }),
      el('button', { className: 'btn', onclick: () => {
        st = surprise();
        if (!Bux.mayWear('font', st.font)) { const ok = FONTS.filter(([id]) => id && Bux.mayWear('font', id)); st.font = ok.length ? ok[Math.floor(Math.random() * ok.length)][0] : ''; }
        draw();
      } }, icon('sparkle', 16), 'Surprise Me'),
      applyBtn], onClose: () => closeColor() });
  draw();
}

// ===================== a server's tag (Server Settings → Server Tag) =====================
function svTag(sv, redraw) {
  let text = sv.tag || '', badge = sv.tagBadge || 'star', color = sv.tagColor || TAG_COLORS[0];
  const input = el('input', { type: 'text', value: text, maxLength: 4, placeholder: 'ROBO', className: 'tag-in', spellcheck: false });
  const pv = el('div', { className: 'tag-pv' }), badges = el('div', { className: 'tag-badges' }), colors = el('div', { className: 'ns-colors' });
  const draw = () => {
    const chip = tagChip({ text: text || 'TAG', badge, color }); chip.classList.add('big');
    const nm = el('span', { className: 'nm' }, me.name); nm.style.setProperty('--who', safeColor(me.color));
    pv.replaceChildren(el('div', { className: 'tag-big' }, chip),
      el('div', { className: 'msg' }, avatarEl(asMember()), el('div', { className: 'body' }, el('div', { className: 'meta' }, nm, tagChip({ text: text || 'TAG', badge, color }), el('span', { className: 'when' }, 'Today at 4:20 PM')), el('div', { className: 'text' }, 'This is how members wearing the tag look.'))));
    badges.replaceChildren(...BADGES.map(([id, label]) => { const b = el('button', { className: 'tag-badge' + (id === badge ? ' on' : ''), title: label, onclick: () => { badge = id; draw(); } }); b.innerHTML = badgeSVG(id, 20); b.style.setProperty('--tc', color); return b; }));
    const custom = colorSwatch(color, (c) => { color = c; draw(); }, { title: 'Any colour' }); custom.classList.add('ns-custom'); custom.append(icon('brush', 14));
    colors.replaceChildren(custom, ...TAG_COLORS.map((c) => el('button', { className: 'ns-sw' + (c === color ? ' on' : ''), style: `background:${c}`, title: c, onclick: () => { color = c; draw(); } })));
  };
  input.oninput = () => { const v = input.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4); if (v !== input.value) input.value = v; text = v.toUpperCase() === v ? v : v; draw(); };
  const save = el('button', { className: 'btn primary', onclick: async () => {
    if (text.length < 2) return toast('A tag is 2 to 4 letters or numbers.');
    if ((await attempt(() => Promise.resolve(Store.updateServer(sv.id, { tag: text, tagBadge: badge, tagColor: color })))) === null) return;
    toast(`${sv.name}’s tag is ${text}. Members can wear it from their profile.`); redraw();
  } }, 'Save Tag');
  const drop = sv.tag ? el('button', { className: 'btn danger', onclick: async () => {
    if (!(await confirmBox({ title: 'Remove the server tag?', text: 'It comes off everyone wearing it.', ok: 'Remove Tag', danger: true }))) return;
    Store.updateServer(sv.id, { tag: '', tagBadge: '', tagColor: '' }); toast('Server tag removed.'); redraw();
  } }, 'Remove Tag') : null;
  draw();
  return [el('h2', {}, 'Server Tag'),
    el('p', { className: 'sub' }, 'Give your server a tag: up to four letters and a badge. Members can wear it beside their name everywhere in Fluentdat, and anyone can click it to see where it’s from.'),
    pv,
    el('h3', {}, 'Tag'), row2('Letters', '2 to 4 letters or numbers.', input),
    el('h3', {}, 'Badge'), badges,
    el('h3', {}, 'Colour'), colors,
    el('div', { className: 'row', style: 'justify-content:flex-start;gap:8px;margin-top:14px' }, save, drop),
    Store.kind === 'supabase' && !(Store.styled && Store.styled()) ? el('div', { className: 'note-box', style: 'margin-top:12px' }, 'Server tags need the newest supabase/setup.sql.') : null];
}

// ===================== user settings =====================
function openUserSettings(section = 'account') {
  const nav = [
    { profile: true },
    { search: true },
    { head: 'User Settings' },
    { id: 'account', label: 'My Account', icon: 'user' },
    { id: 'profile', label: 'Profile', icon: 'edit', action: (shut) => { shut(); openProfileEditor(); } },
    { id: 'connections', label: 'Connections', icon: 'link' },
    { id: 'sync', label: 'Data & Sync', icon: 'cloud' },
    Store.kind === 'supabase' && Store.isAppAdmin() && { id: 'admin', label: 'Invites & Reports', icon: 'key' },
    { hr: true }, { head: 'App Settings' },
    { id: 'customize', label: 'Customize', icon: 'palette' },
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
  ].filter(Boolean);
  openUserSettings.ref = overlay(nav, section, (sec, redraw, shut) => {
    if (sec === 'account') return accountPane(redraw);
    if (sec === 'sync') return syncPane(redraw);
    if (sec === 'connections') return connectionsPane(redraw);
    if (sec === 'customize' || sec === 'appearance' || sec === 'layout' || sec === 'animations') return customizeEntry();
    if (sec === 'notifications') return notificationsPane(redraw);
    if (sec === 'privacy') return privacyPane(redraw);
    if (sec === 'admin') return adminPane();
    if (sec === 'accessibility') return accessibilityPane(redraw);
    if (sec === 'keys') return keysPane();
    return aboutPane();
  });
}

// ---------- Connections (Settings → Connections, as on Discord): your accounts elsewhere, on your profile ----------
const LINKING = 'fluentdat.linking';            // (a sign-in being linked: finished when the page comes back)
const identityFor = (s) => (Store.kind === 'supabase' && s.verify ? Store.identities().find((i) => i.name && (i.provider === s.verify || (s.verify === 'twitter' && i.provider === 'x'))) : null);
function connectionsPane(redraw) {
  const live = Store.kind === 'supabase', xid = live ? Store.myId() : 'me';
  if (!connectionsPane.at || Date.now() - connectionsPane.at > 20000) { connectionsPane.at = Date.now(); Store.profileExtras(xid).then(() => redraw(), () => {}); }
  const list = ((Store.extrasNow(xid) || {}).connections) || [];
  const out = [el('h2', {}, 'Connections'), el('p', { className: 'sub' }, 'Add your accounts elsewhere to your profile, so people can find you there. They show on your full profile.')];
  // the accounts you sign in with go on in one click, verified
  for (const s of SERVICES) {
    const i = identityFor(s);
    if (!i || list.some((c) => c.s === s.id && c.n.toLowerCase() === i.name.toLowerCase())) continue;
    out.push(el('div', { className: 'cx-suggest' }, brandIcon(s.id, 24, { tile: true }), el('div', { className: 'cx-who' }, el('b', {}, `${s.name}: ${i.name}`), el('small', {}, 'You sign in with this account, so it shows as verified.')),
      el('button', { className: 'btn small primary', onclick: async () => { if ((await attempt(() => Store.setProfileExtras({ connections: [...list, { s: s.id, n: i.name }] }))) !== null) { toast(`${s.name} added to your profile.`); redraw(); } } }, 'Add')));
  }
  out.push(el('div', { className: 'cx-add' }, el('b', {}, 'Add accounts to your profile'),
    el('div', { className: 'cx-grid' }, ...SERVICES.map((s) => el('button', { className: 'cx-pick', title: s.name, onclick: () => addConnection(s.id, redraw) }, brandIcon(s.id, 26))))));
  if (list.length) out.push(el('h3', {}, 'Your Connections'), el('div', { className: 'cx-list' }, ...list.map((c) => {
    const href = connectionLink(c), s = SERVICE[c.s] || { name: c.s };
    return el('div', { className: 'cx-row' }, brandIcon(c.s, 24, { tile: true }),
      el('div', { className: 'cx-who' }, el('b', {}, connectionLabel(c), c.v ? el('span', { className: 'cx-v', title: 'Verified: you sign in with this account' }, icon('verified', 16)) : null), el('small', {}, s.name)),
      href ? el('a', { className: 'cx-btn', href, target: '_blank', rel: 'noopener noreferrer', title: 'Open' }, icon('external', 16)) : null,
      el('button', { className: 'cx-btn del', title: 'Remove', onclick: async () => { if ((await attempt(() => Store.setProfileExtras({ connections: list.filter((y) => y !== c) }))) !== null) redraw(); } }, icon('x', 16)));
  })));
  out.push(el('div', { className: 'note-box' }, live
    ? 'A ✓ means Fluentdat checked it: you sign in with that account. Everything else is what you typed. To check GitHub, Twitch, Spotify or X accounts too, whoever runs Fluentdat switches them on in Supabase (Authentication → Sign In / Providers) and allows linking accounts; then their Add window offers Verify.'
    : 'Signed out, connections stay in this browser. Sign in to put them on your profile for others to see.'));
  return out;
}
// add one: a name there (or a pasted link to it); a service you can sign in to can be verified by signing in once
function addConnection(id, after) {
  const s = SERVICE[id], live = Store.kind === 'supabase', xid = live ? Store.myId() : 'me', mine = identityFor(s);
  const input = el('input', { type: 'text', maxLength: 100, placeholder: s.hint, value: mine ? mine.name : '', autocomplete: 'off', spellcheck: false });
  const err = el('div', { className: 'sg-msg' }), verify = el('div', { className: 'cx-verify' });
  if (live && s.verify && !mine) Store.providers().then((on) => {
    if (!on[s.verify] || !verify.isConnected) return;
    verify.replaceChildren(el('button', { className: 'btn', onclick: async () => {
      try { localStorage.setItem(LINKING, s.verify); } catch {}
      try { await Store.linkAccount(s.verify); }
      catch (e) {
        try { localStorage.removeItem(LINKING); } catch {}
        err.textContent = /manual linking|linking is disabled/i.test(String(e.message)) ? 'Linking accounts is switched off for this Fluentdat. Whoever runs it can allow it in Supabase (Authentication → Sign In / Providers → Allow manual linking).' : String((e && e.message) || e);
      }
    } }, brandIcon(s.id, 16), `Verify with ${s.name}`), el('p', { className: 'hint' }, `Sign in to ${s.name} once to prove it’s yours, and it shows as verified.`));
  });
  const save = el('button', { className: 'btn primary' }, 'Add');
  const m = modal({ title: `Add ${s.name}`, cls: 'cx-dlg', body: [el('div', { className: 'cx-dlg-top' }, brandIcon(s.id, 40, { tile: true })),
    el('div', { className: 'field' }, el('label', {}, id === 'website' ? 'Address' : 'Name'), input),
    mine ? el('p', { className: 'hint cx-mine' }, icon('check', 13), el('span', {}, `You sign in with this ${s.name} account, so it shows as verified.`)) : null, err, verify],
    actions: [el('button', { className: 'btn', onclick: () => m.close() }, 'Cancel'), save] });
  save.onclick = async () => {
    const r = parseConnection(id, input.value); if (r.error) { err.textContent = r.error; input.focus(); return; }
    save.disabled = true;
    const cur = ((await Store.profileExtras(xid).catch(() => null)) || Store.extrasNow(xid) || { connections: [] }).connections, same = (c) => c.s === id && c.n.toLowerCase() === r.n.toLowerCase();
    if (cur.length >= 20 && !cur.some(same)) { err.textContent = 'Up to 20 connections: take one away first.'; save.disabled = false; return; }
    const ok = await attempt(() => Store.setProfileExtras({ connections: [...cur.filter((c) => !same(c)), { s: id, n: r.n }] }));
    save.disabled = false;
    if (ok === null) return;
    m.close(); toast(`${s.name} added to your profile.`); if (after) after();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save.click(); });
  setTimeout(() => input.focus(), 0);
}
// back from linking a sign-in (Add → Verify): it goes on your profile, verified
async function finishLinking() {
  let p = null; try { p = localStorage.getItem(LINKING); localStorage.removeItem(LINKING); } catch {}
  if (!p || Store.kind !== 'supabase') return;
  const s = SERVICES.find((x) => x.verify === p), i = s && identityFor(s);
  if (!i) return toast('That account wasn’t linked, so it isn’t verified.');
  const x = await Store.profileExtras(Store.myId()).catch(() => null);
  if (!x) return;
  if ((await attempt(() => Store.setProfileExtras({ connections: [...x.connections.filter((c) => c.s !== s.id), { s: s.id, n: i.name }] }))) !== null) toast(`${s.name} connected and verified.`);
}

// ---------- for the people who run Fluentdat: one-time links to make an account, and what people reported ----------
function adminPane() {
  const days = sel('7', [['1', '1 day'], ['7', '7 days'], ['30', '30 days'], ['0', 'Never']], () => {});
  const note = el('input', { type: 'text', maxLength: 100, placeholder: 'Who it’s for' });
  const out = el('div', {});
  const make = el('button', { className: 'btn primary' }, 'Create Link');
  const joinLink = (code) => location.origin + location.pathname + '#join=' + code;
  make.onclick = async () => {
    make.disabled = true;
    const code = await attempt(() => Store.createAppInvite(note.value.trim(), +days.value));
    make.disabled = false;
    if (!code) return;
    const link = joinLink(code);
    const field = el('input', { type: 'text', value: link, readOnly: true, onclick: () => field.select() });
    out.replaceChildren(el('div', { className: 'invite-box' }, field, el('button', { className: 'btn primary', onclick: () => copyText(link, 'Link copied. It works once.') }, 'Copy')),
      el('div', { className: 'invite-note' }, 'Send it to one person. It makes one account, then stops working.'));
    field.select(); note.value = ''; loadLinks();
  };
  const links = el('div', { className: 'sx-list' }, el('div', { className: 'it muted' }, 'Loading…'));
  async function loadLinks() {
    let list; try { list = await Store.appInvites(); } catch (e) { links.replaceChildren(el('div', { className: 'it' }, String(e.message || e))); return; }
    const now = Date.now();
    links.replaceChildren(...(list.length ? list.map((i) => {
      const gone = !i.used && i.expires && i.expires < now;
      const state = i.used ? `Used by @${i.usedBy ? i.usedBy.login : '?'} on ${dateLong(i.used)}` : gone ? 'Expired' : i.expires ? `Not used yet · expires ${dateLong(i.expires)}` : 'Not used yet · never expires';
      return el('div', { className: 'it' + (i.used || gone ? ' faded' : '') }, icon(i.used ? 'check' : 'link', 17),
        el('div', { className: 'who2' }, el('div', { className: 'n' }, i.note || 'Link ' + i.code.slice(0, 6) + '…'), el('div', { className: 'h' }, `${state} · made ${dateLong(i.ts)}`)),
        !i.used && !gone ? iconBtn('copy', 'Copy link', () => copyText(joinLink(i.code), 'Link copied.')) : null,
        !i.used ? iconBtn('trash', gone ? 'Remove' : 'Take back', async () => { if ((await attempt(() => Store.revokeAppInvite(i.code))) !== null) { toast(gone ? 'Removed.' : 'That link doesn’t work any more.'); loadLinks(); } }, 'del') : null);
    }) : [el('div', { className: 'it muted' }, 'No links yet.')]));
  }
  const reports = el('div', { className: 'sx-list' }, el('div', { className: 'it muted' }, 'Loading…'));
  async function loadReports() {
    let list; try { list = await Store.appReports(); } catch (e) { reports.replaceChildren(el('div', { className: 'it' }, String(e.message || e))); return; }
    reports.replaceChildren(...(list.length ? list.map((r) => el('div', { className: 'it rp-it' + (r.resolved ? ' faded' : '') }, icon('flag', 17),
      el('div', { className: 'who2' }, el('div', { className: 'n' }, r.target ? `${r.target.name} (@${r.target.login})` : 'Someone', el('span', { className: 'rp-reason' }, ' · ' + r.reason)),
        r.excerpt ? el('div', { className: 'rp-ex' }, '“' + r.excerpt + '”') : null,
        el('div', { className: 'h' }, `${r.message ? 'A message, reported' : 'Their profile, reported'} by @${r.reporter.login} · ${dateLong(r.ts)}`)),
      el('button', { className: 'btn small', onclick: async () => { if ((await attempt(() => Store.resolveReport(r.id, !r.resolved))) !== null) loadReports(); } }, r.resolved ? 'Reopen' : 'Resolve')))
      : [el('div', { className: 'it muted' }, 'Nothing has been reported.')]));
  }
  loadLinks(); loadReports();
  const bans = el('div', { className: 'sx-list' });
  if (Store.canStaff()) fillAppBans(bans);
  return [el('h2', {}, 'Invites & Reports'), el('p', { className: 'sub' }, 'Only the people who run Fluentdat see this page. A one-time link makes one account (a username and a password, no email), then stops working.'),
    el('h3', {}, 'Make a one-time link'),
    row2('For', 'A note for you, so you know whose link it is.', note),
    row2('Expires after', 'If nobody uses it by then, it stops working.', days),
    el('div', { className: 'row', style: 'justify-content:flex-start' }, make), out,
    el('h3', {}, 'Links you’ve made'), links,
    el('h3', {}, 'Reports'), el('p', { className: 'hint' }, 'What people reported, and who reported it.'), reports,
    ...(Store.canStaff() ? [el('h3', {}, 'Banned from Fluentdat'), el('p', { className: 'hint' }, 'Type / in any server for your TrixWotel Commands: /ban @someone, /unban, /bans, /kick and /givebux.'), bans] : [])];
}
// the people you've blocked (they can't reach you) and ignored (tucked away, in this browser), with a way back
function peopleYouHid(redraw) {
  const live = Store.kind === 'supabase', out = [];
  const row = (id, button) => {
    const p = person(id), n = el('div', { className: 'n' }, p.name), h = el('div', { className: 'h' }, p.login ? '@' + p.login : ''), av = el('span', {}, avatarEl(face(p), { size: 32 }));
    if (!p.login && live) Store.profileFull(id).then((f) => { if (!f) return; n.textContent = f.name; h.textContent = f.login ? '@' + f.login : ''; av.replaceChildren(avatarEl(face(f), { size: 32 })); }, () => {});
    return el('div', { className: 'it' }, av, el('div', { className: 'who2' }, n, h), button({ ...p, id }));
  };
  if (live) {
    const ids = Store.blockedIds();
    out.push(el('h3', {}, 'Blocked Users'), el('p', { className: 'hint' }, 'They can’t message you, call you or send you a friend request, and their messages in servers are tucked away.'),
      el('div', { className: 'sx-list' }, ...(ids.length ? ids.map((id) => row(id, (u) => el('button', { className: 'btn', onclick: async () => { await unblockUser(u); redraw(); } }, 'Unblock')))
        : [el('div', { className: 'it muted' }, 'You haven’t blocked anyone.')])));
  }
  const ign = LS.get('fluentdat.ignored', []);
  out.push(el('h3', {}, 'Ignored Users'), el('p', { className: 'hint' }, 'Their messages are tucked away and they don’t notify you. They can still message you. (Kept in this browser.)'),
    el('div', { className: 'sx-list' }, ...(ign.length ? ign.map((id) => row(id, (u) => el('button', { className: 'btn', onclick: () => { setIgnored(u, false); redraw(); } }, 'Unignore')))
      : [el('div', { className: 'it muted' }, 'You aren’t ignoring anyone.')])));
  return out;
}
// a new password (accounts made from a one-time link)
function changePassword() {
  const pw = el('input', { type: 'password', maxLength: 72, autocomplete: 'new-password' }), pw2 = el('input', { type: 'password', maxLength: 72, autocomplete: 'new-password' });
  const msg = el('div', { className: 'sg-msg' }), ok = el('button', { className: 'btn primary' }, 'Done');
  const w = modal({ title: 'Change Your Password', sub: 'At least 8 characters. There’s no email to reset it with, so keep it somewhere safe.',
    body: [el('div', { className: 'field jf' }, el('label', {}, 'New Password'), pw), el('div', { className: 'field jf' }, el('label', {}, 'Confirm New Password'), pw2), msg],
    actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), ok] });
  ok.onclick = async () => {
    if (pw.value.length < 8) { msg.textContent = 'Your password needs at least 8 characters.'; return pw.focus(); }
    if (pw.value !== pw2.value) { msg.textContent = 'The two passwords aren’t the same.'; return pw2.focus(); }
    ok.disabled = true; msg.textContent = '';
    try { await Store.changePassword(pw.value); w.close(); toast('Your password was changed.'); }
    catch (e) { msg.textContent = String((e && e.message) || e); ok.disabled = false; }
  };
  for (const i of [pw, pw2]) i.onkeydown = (e) => { if (e.key === 'Enter') ok.click(); };
  setTimeout(() => pw.focus(), 0);
}

function accountPane(redraw) {
  const acc = Store.account(), live = Store.kind === 'supabase';
  const via = live ? (acc.password ? 'a username and password' : { discord: 'Discord', github: 'GitHub', email: 'email' }[acc.provider] || acc.provider) : '';
  const out = [el('h2', {}, 'My Account'), el('p', { className: 'sub' }, 'Who you are in Fluentdat, and where your data lives.')];
  out.push(el('div', { style: 'display:flex;align-items:center;gap:16px;padding:18px;background:var(--side);border-radius:12px;margin-bottom:12px' },
    avatarEl(asMember(), { size: 64 }),
    el('div', { style: 'flex:1;min-width:0' },
      el('div', { style: 'font-weight:700;color:var(--bright);font-size:1.15rem' }, me.name),
      el('div', { style: 'color:var(--muted);font-size:.86rem' }, live ? `@${acc.login} · signed in with ${via}` : acc ? '@' + acc.login + ' on GitHub' : 'Signed out — this browser only'),
      me.about ? el('div', { style: 'margin-top:6px;font-size:.88rem' }, me.about) : null),
    el('button', { className: 'btn', onclick: () => { openUserSettings.ref.shut(); openProfileEditor(); } }, 'Edit Profile')));
  out.push(el('h3', {}, 'Account'));
  const signOut = el('button', { className: 'btn', onclick: async () => { if (await confirmBox({ title: 'Log Out', text: live ? 'Sign out of Fluentdat in this browser?' : 'Sign out of GitHub?', ok: 'Log Out', danger: true })) { await Store.signOut(); redraw(); renderAll(); } } }, 'Sign Out');
  if (live) {
    out.push(row2('Signed in', `With ${via}. Your servers, DMs and friends follow you to any device you sign in on.`, signOut));
    out.push(row2('Your @handle', 'Friends add you with this. Share it with people you want to hear from.', el('button', { className: 'btn', onclick: () => copyText('@' + acc.login, 'Copied @' + acc.login) }, 'Copy @' + acc.login)));
    if (acc.password) out.push(row2('Password', 'You log in with your username and this.', el('button', { className: 'btn', onclick: changePassword }, 'Change Password')));
    else if (acc.email) out.push(row2('Email', 'Only you can see this.', el('span', { className: 'chip' }, acc.email)));
  } else {
    out.push(row2(acc ? 'GitHub account' : 'Sign in', acc ? 'Signed in with a token. Messages, profiles and DMs sync through the data repository.'
      : Store.configured ? 'With Discord, GitHub or email: chat live with your team, and pick up where you left off on any device.' : 'Sign in to share servers, messages and DMs with your team.',
      acc ? signOut : el('button', { className: 'btn primary', onclick: () => signInDialog(redraw) }, 'Sign In')));
    out.push(row2('User ID', 'Handy when someone needs to add you.', el('button', { className: 'btn', onclick: () => { const v = acc ? acc.login : me.id; copyText(v, 'Copied ' + v); } }, 'Copy')));
  }
  out.push(row2('Status', 'How you show up to everyone else.', sel(me.status, STATUSES, (v) => { me.status = v; saveMe(); pushProfile(); renderAll(); })));
  return out;
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
    el('h3', {}, 'App Icon'),
    el('p', { className: 'hint' }, 'Fluentdat’s logo on the Home button and the browser tab. Match Theme uses the one your theme brings.'),
    logoGrid(prefs.logo || 'theme', (id) => { prefs.logo = id; savePrefs(); renderRail(); }, { withTheme: true }),
    el('h3', {}, 'Messages'),
    row2('Display', 'Cozy gives each message room. Compact fits more on screen.', sel(prefs.density, [['cozy', 'Cozy'], ['compact', 'Compact']], (v) => { prefs.density = v; savePrefs(); })),
    row2('Text size', 'Everything in the app scales with this.', (() => { const r = el('input', { type: 'range', min: 12, max: 20, step: 1, value: prefs.fontSize }); r.oninput = () => { prefs.fontSize = +r.value; savePrefs(); }; return r; })()),
    row2('Link previews', 'Cards for Fluentdat invites, GitHub repositories and YouTube videos under the messages that link to them.', sw(prefs.embeds !== 'off', (on) => { prefs.embeds = on ? 'on' : 'off'; savePrefs(); renderAll(); })),
    row2('“Live, signed in as @you”', 'The bar across the top when all is well. Off, it only shows when something needs you (trouble, or a newer setup.sql to run).', sw(prefs.liveBanner === 'on', (on) => { prefs.liveBanner = on ? 'on' : 'off'; savePrefs(); applyPrefs(); })),
    el('h3', {}, 'Decorations & Effects'),
    row2('Avatar decorations', 'Frames and things around people’s avatars, from the Shop.', sw(prefs.decorations !== 'off', (on) => { prefs.decorations = on ? 'on' : 'off'; savePrefs(); renderAll(); })),
    row2('Profile effects and frames', 'Snow, sparkles, frames and more on people’s profile cards, from the Shop.', sw(prefs.effects !== 'off', (on) => { prefs.effects = on ? 'on' : 'off'; savePrefs(); renderAll(); })),
    row2('Formatting bar', 'Bold, italics, code and more above the message box when you select some of what you wrote.', sw(prefs.formatBar !== 'off', (on) => { prefs.formatBar = on ? 'on' : 'off'; savePrefs(); }))];
}

// every animation, each with its own switch (and all of them at once)
function animationsPane(redraw) {
  const off = prefs.anim || (prefs.anim = {});
  const set = (id, on) => { if (on) delete off[id]; else off[id] = true; savePrefs(); };
  const groups = [...new Set(ANIMS.map((a) => a[1]))];
  const allOn = !prefs.reduceMotion;
  const out = [el('h2', {}, 'Animations'), el('p', { className: 'sub' }, 'Fluentdat moves a lot. Turn off anything you’d rather stayed still, one by one, or all at once.'),
    row2('Animations', 'Everything below. (Reduce Motion in Accessibility is the same switch.)', sw(allOn, (on) => { prefs.reduceMotion = !on; savePrefs(); redraw(); })),
    el('div', { className: 'row', style: 'justify-content:flex-start;gap:8px;margin:4px 0 6px' },
      el('button', { className: 'btn small', onclick: () => { prefs.anim = {}; prefs.reduceMotion = false; savePrefs(); redraw(); } }, 'Turn All On'),
      el('button', { className: 'btn small', onclick: () => { prefs.anim = Object.fromEntries(ANIMS.map((a) => [a[0], true])); savePrefs(); redraw(); } }, 'Turn All Off'))];
  for (const g of groups) {
    out.push(el('h3', {}, g));
    for (const [id, , name, desc] of ANIMS.filter((a) => a[1] === g)) {
      const row = row2(name, desc, sw(!off[id], (on) => set(id, on)));
      if (!allOn) row.classList.add('faded');
      out.push(row);
    }
  }
  return out;
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
    row2('Message sound', 'A short blip for new messages. (Off by default so nothing surprises you.)', sw(!!prefs.sound, (on) => { prefs.sound = on; savePrefs(); })),
    row2('Ring for calls', 'A ringtone when someone calls you, and a ringback while you call them. Deafened, it stays quiet.', sw(prefs.ring !== false, (on) => { prefs.ring = on; savePrefs(); })),
    Store.kind === 'supabase' ? el('div', { className: 'note-box', style: 'margin-top:14px' }, 'Each server, channel and DM can be muted, or set to tell you about everything, only @mentions, or nothing: right-click it.') : null];
}

function privacyPane(redraw) {
  return [el('h2', {}, 'Privacy & Safety'), el('p', { className: 'sub' }, 'What Fluentdat stores, and who can reach you.'),
    ...peopleYouHid(redraw),
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
  const keys = [['Enter', 'Send the message'], ['Shift + Enter', 'New line'], ['⌘B / Ctrl+B', 'Bold (also ⌘I / Ctrl+I italics, ⌘U / Ctrl+U underline, ⌘⇧X strikethrough). In the Fluent browser ⌘B shows and hides its sidebar, so use Ctrl+B or the bar that appears when you select text.'],
    ['@', 'Mention someone (pick from the list with ↑ ↓ and Enter)'], ['Esc', 'Stop replying'], ['Alt + ↑', 'Reply to the last message (in an empty box)'], ['Esc', 'Close settings or a dialog'], ['/help', 'List the chat commands'], ['/roll, /flip', 'Dice and coin'], ['/me <action>', 'Write an action'], ['/nick <name>', 'Change your display name'], ['/theme <name>', 'Switch theme'], ['/clear', 'Empty the channel'], ['!ping', 'Flubot replies']];
  const list = el('div', { className: 'kb-list' }), draw = () => list.replaceChildren(...keyRows(draw));
  draw();
  return [el('h2', {}, 'Keyboard Shortcuts'), el('p', { className: 'sub' }, 'Click a key to change it, then press the keys you want (with ' + (MAC ? '⌘, ⌃ or ⌥' : 'Ctrl or Alt') + '). Backspace leaves it with none, and Esc keeps it.'),
    list, el('h3', {}, 'Built in'), el('p', { className: 'sub' }, 'And the commands you can type into any channel.'),
    el('div', { className: 'sx-list' }, ...keys.map(([k, what]) => el('div', { className: 'it' }, el('code', { style: 'background:var(--input);padding:3px 8px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:.85rem' }, k), el('span', { className: 'nm3', style: 'color:var(--muted)' }, what))))];
}

function aboutPane() {
  return [el('div', { className: 'about-head' }, logoEl(appLogo(), { size: 64 }), el('div', {}, el('h2', {}, 'About Fluentdat'), el('p', { className: 'sub' }, 'A chat app built from scratch, running entirely in your browser.'))),
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
    live && can && { id: 'tag', label: 'Server Tag', icon: 'tag' },
    can && { id: 'sidebar', label: 'Server Sidebar', icon: 'browse' },
    can && { id: 'guide', label: 'Server Guide', icon: 'signpost' },
    can && { id: 'gameservers', label: 'Game Servers', icon: 'game' },
    live && can && { id: 'emoji', label: 'Emoji', icon: 'smile' },
    live && can && { id: 'stickers', label: 'Stickers', icon: 'sticker' },
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
    if (sec === 'emoji') return svEmoji(cur, redraw);
    if (sec === 'tag') return svTag(cur, redraw);
    if (sec === 'sidebar') return svSidebar(cur, redraw);
    if (sec === 'guide') return svGuide(cur, redraw, shut);
    if (sec === 'gameservers') return svGameServers(cur, redraw);
    if (sec === 'stickers') return svStickers(cur, redraw);
    if (sec === 'members') return svMembers(cur, redraw);
    if (sec === 'roles') return svRoles(cur, redraw, state);
    if (sec === 'invite') return svInvite(cur);
    if (sec === 'bans') return svBans(cur);
    if (sec === 'danger') return svDanger(cur, shut);
    return svOverview(cur, redraw, can);
  });
}

// ===================== a category's settings (Discord's): its name, and who may see and do what in its channels =====================
// (for admins, and whoever the category lets manage its channels or its permissions)
const CAT_PERMS = [
  ['General Category Permissions', [
    ['view', 'View Channels', 'Allows members to see this category’s channels. Taking it away from @everyone makes the category private.'],
    ['manage_channels', 'Manage Channels', 'Allows members to make, edit and delete this category’s channels, and to rename the category.'],
    ['manage_perms', 'Manage Permissions', 'Allows members to change this category’s permissions (only the ones they have themselves).']]],
  ['Membership Permissions', [
    ['invite', 'Create Invite', 'Allows members to invite new people to this server.']]],
  ['Text Channel Permissions', [
    ['send', 'Send Messages', 'Allows members to send messages in this category’s text channels.'],
    ['attach', 'Attach Files', 'Allows members to upload files and pictures.'],
    ['react', 'Add Reactions', 'Allows members to add new emoji reactions to messages. Without it, they can still join in with reactions already there.'],
    ['mention_everyone', 'Mention @everyone and @here', 'Allows members to notify everyone who can see the channel.'],
    ['manage_messages', 'Manage Messages', 'Allows members to delete other people’s messages.']]],
  ['Voice Channel Permissions', [
    ['connect', 'Connect', 'Allows members to join this category’s voice channels.']]],
];
// a category's permissions as they're saved: target → { allow, deny } (sets), and a way to tell two apart
const storedPerms = (catId) => new Map(Store.categoryPerms(catId).map((r) => [r.target, { allow: new Set(r.allow), deny: new Set(r.deny) }]));
const permsKey = (P) => JSON.stringify([...P].filter(([t, v]) => t !== 'everyone' || v.allow.size || v.deny.size).sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([t, v]) => [t, [...v.allow].sort(), [...v.deny].sort()]));
function openCategorySettings(catId, section) {
  const sv = serverId, cat0 = Store.categories(sv).find((c) => c.id === catId); if (!cat0) return;
  const admin = Store.canManage(sv), live = Store.kind === 'supabase';
  const mayEdit = admin || Store.can(catId, 'manage_channels'), mayPerms = live && (admin || Store.can(catId, 'manage_perms'));
  if (!mayEdit && !mayPerms) return toast('You don’t have permission to change this category.');
  const cur = () => Store.categories(sv).find((c) => c.id === catId) || cat0;
  // (what you're changing, until you save: the name, the permissions, and which role or member is open)
  const st = { name: null, perms: null, target: 'everyone', advanced: true, bar: null };
  st.unsaved = () => (st.name != null && st.name.trim() !== cur().name) || (!!st.perms && permsKey(st.perms) !== permsKey(storedPerms(catId)));
  const nav = [
    { head: () => el('span', { className: 'cs-head' }, icon('folder', 14), el('span', {}, cur().name)) },
    mayEdit && { id: 'overview', label: 'Overview' },
    mayPerms && { id: 'perms', label: 'Permissions' },
    admin && { hr: true },
    admin && { id: 'delete', label: 'Delete Category', cls: 'danger trail', icon: 'trash', action: async (shut) => { if (await deleteCategory(cur())) shut(true); } },
  ].filter(Boolean);
  const first = nav.some((n) => n.id === section) ? section : mayEdit ? 'overview' : 'perms';
  overlay(nav, first, (sec, redraw) => (sec === 'perms' ? catPerms(catId, st, redraw) : catOverview(catId, st, redraw)), {
    guard: () => { if (!st.unsaved()) return false; if (st.bar) { st.bar.classList.remove('shake'); void st.bar.offsetWidth; st.bar.classList.add('shake'); } return true; },
  });
}
// "Careful — you have unsaved changes!", at the bottom of the page while there are some
function catBar(st, onReset, onSave) {
  const save = el('button', { className: 'btn green' }, 'Save Changes');
  save.onclick = async () => { save.disabled = true; try { await onSave(); } finally { save.disabled = false; } };
  const bar = el('div', { className: 'pe-bar cs-bar' }, el('span', {}, 'Careful — you have unsaved changes!'), el('button', { className: 'btn ghost', onclick: onReset }, 'Reset'), save);
  st.bar = bar; requestAnimationFrame(() => catBarNow(st));
  return bar;
}
const catBarNow = (st) => { if (st.bar) st.bar.classList.toggle('on', st.unsaved()); };
// Overview: the category's name (an emoji in it too, if you like)
function catOverview(catId, st, redraw) {
  const c = Store.categories(serverId).find((x) => x.id === catId) || { name: '' };
  const name = el('input', { type: 'text', value: st.name != null ? st.name : c.name, maxLength: 60, className: 'wide-in', placeholder: 'New Category' });
  name.oninput = () => { st.name = name.value; catBarNow(st); };
  const put = (t) => {
    const a = name.selectionStart != null ? name.selectionStart : name.value.length, b = name.selectionEnd != null ? name.selectionEnd : a;
    name.value = (name.value.slice(0, a) + t + name.value.slice(b)).slice(0, 60); name.focus(); name.setSelectionRange(a + t.length, a + t.length); name.oninput();
  };
  const pick = el('button', { className: 'cs-emoji', type: 'button', title: 'Add an emoji', onclick: (e) => { e.stopPropagation(); openPicker({ tab: 'emoji', emojiOnly: true, anchor: pick, still: motionOff(),
    servers: [], emojiOf: () => [], stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {}, onEmoji: (t, keep, custom) => { if (!custom) put(t); }, onSticker: () => {} }); } }, icon('smile', 20));
  const bar = catBar(st, () => { st.name = null; redraw(); }, () => {
    const v = name.value.trim(); if (!v) { name.focus(); return toast('Give the category a name.'); }
    Store.updateCategory(catId, { name: v }); st.name = null; renderAll(); redraw(); toast('Category saved.');
  });
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') bar.lastElementChild.click(); });
  const art = el('div', { className: 'cs-art' }); art.innerHTML = CATEGORY_ART;
  setTimeout(() => name.focus(), 0);
  return [el('h2', {}, 'Overview'),
    el('div', { className: 'cs-over' }, el('div', { className: 'cs-form' }, el('h3', {}, 'Category Name'), el('div', { className: 'cs-name' }, name, pick)), art), bar];
}
// a folder full of channels, in the theme's colours (the picture beside a category's name)
const CATEGORY_ART = `<svg viewBox="0 0 220 170" aria-hidden="true">
  <path class="cf-back" d="M22 42a12 12 0 0 1 12-12h42l12 12h98a12 12 0 0 1 12 12v84a12 12 0 0 1-12 12H34a12 12 0 0 1-12-12z"/>
  <rect class="cf-page" x="42" y="40" width="136" height="64" rx="8" transform="rotate(-5 110 72)"/>
  <rect class="cf-page2" x="50" y="46" width="126" height="58" rx="8" transform="rotate(4 113 75)"/>
  <path class="cf-front" d="M16 70a12 12 0 0 1 12-12h164a12 12 0 0 1 12 12l-7 70a12 12 0 0 1-12 11H35a12 12 0 0 1-12-11z"/>
  <g class="cf-rows"><path d="M44 86h9M43 92h9M47 82l-2 14M51 82l-2 14M44 108h9M43 114h9M47 104l-2 14M51 104l-2 14M44 130h9M43 136h9M47 126l-2 14M51 126l-2 14"/></g>
  <rect class="cf-bar" x="60" y="84" width="92" height="9" rx="4.5"/><rect class="cf-bar" x="60" y="106" width="70" height="9" rx="4.5"/><rect class="cf-bar" x="60" y="128" width="104" height="9" rx="4.5"/>
  <path class="cf-spark" d="M190 14l3.2 7.8 7.8 3.2-7.8 3.2-3.2 7.8-3.2-7.8-7.8-3.2 7.8-3.2z"/><path class="cf-spark small" d="M24 140l2 4.8 4.8 2-4.8 2-2 4.8-2-4.8-4.8-2 4.8-2z"/>
</svg>`;
// Permissions: private or not, then each role's and member's say (allow ✓, deny ✕ or leave it to the usual rule /)
function catPerms(catId, st, redraw) {
  const sv = serverId, admin = Store.canManage(sv), mine = (k) => admin || Store.can(catId, k);
  if (!st.perms) st.perms = storedPerms(catId);
  const P = st.perms;
  if (!P.has('everyone')) P.set('everyone', { allow: new Set(), deny: new Set() });
  if (!P.has(st.target)) st.target = 'everyone';
  const bar = catBar(st, () => { st.perms = null; redraw(); }, async () => {
    const before = storedPerms(catId);
    try {
      for (const [t, v] of P) {
        const o = before.get(t), empty = !v.allow.size && !v.deny.size;
        if (t === 'everyone' && empty) { if (o) await Store.removeCategoryPerm(catId, t); continue; }
        if (!o || permsKey(new Map([[t, o]])) !== permsKey(new Map([[t, v]]))) await Store.setCategoryPerm(catId, t, [...v.allow], [...v.deny]);
      }
      for (const t of before.keys()) if (!P.has(t)) await Store.removeCategoryPerm(catId, t);
      toast('Permissions saved.');
    } catch (e) { toast(String((e && e.message) || e)); }
    st.perms = null; redraw(); renderAll();
  });
  const priv = () => P.get('everyone').deny.has('view');
  const privSw = sw(priv(), (on) => { const e = P.get('everyone'); e.allow.delete('view'); if (on) e.deny.add('view'); else e.deny.delete('view'); drawRight(); catBarNow(st); });
  privSw.disabled = !mine('view');
  const card = el('div', { className: 'pm-private' }, el('span', { className: 'pm-lock' }, icon('lock', 20)),
    el('div', { className: 'lbl' }, el('b', {}, 'Private Category'),
      el('p', {}, 'By making a category private, only the members and roles you choose below will be able to view it. Its channels follow this setting.')), privSw);
  const roleOf = (id) => Store.roles(sv).find((r) => r.id === id);
  const who = (id) => (Store.members(sv) || []).find((m) => m.id === id) || person(id);
  const faceOf = (t) => {
    if (t === 'everyone') return [el('span', { className: 'pm-at' }, icon('users', 12)), el('span', { className: 'nm3' }, '@everyone')];
    const [kind, id] = t.split(':');
    if (kind === 'role') { const r = roleOf(id); return [el('i', { className: 'dotc', style: `background:${safeColor(r && r.color, '#99aab5')}` }), el('span', { className: 'nm3' }, r ? r.name : 'Deleted Role')]; }
    const m = who(id); return [avatarEl(face(m), { size: 20 }), el('span', { className: 'nm3' }, m.name)];
  };
  const left = el('div', { className: 'pm-targets' }), right = el('div', { className: 'pm-perms' });
  const open = (t) => { st.target = t; drawLeft(); drawRight(); };
  function addMenu(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const roles = Store.roles(sv).filter((x) => !P.has('role:' + x.id));
    const people = (Store.members(sv) || []).filter((m) => !P.has('member:' + m.id) && !m.bot && m.role !== 'owner' && m.role !== 'admin');
    const add = (t) => { P.set(t, { allow: new Set(), deny: new Set() }); open(t); catBarNow(st); };
    const items = [...roles.map((x) => ({ label: x.name, color: safeColor(x.color, '#99aab5'), hint: 'Role', action: () => add('role:' + x.id) })),
      roles.length && people.length && '-',
      ...people.slice(0, 60).map((m) => ({ label: m.name, hint: m.login ? '@' + m.login : 'Member', action: () => add('member:' + m.id) }))].filter(Boolean);
    menu(items.length ? items : [{ label: 'No more roles or members to add', disabled: true }], r.left, r.bottom + 4);
  }
  function drawLeft() {
    const keys = [...P.keys()], roleIds = Store.roles(sv).map((r) => 'role:' + r.id);
    const list = ['everyone', ...roleIds.filter((t) => P.has(t)), ...keys.filter((t) => t.startsWith('role:') && !roleIds.includes(t)), ...keys.filter((t) => t.startsWith('member:'))];
    left.replaceChildren(el('div', { className: 'pm-thead' }, el('span', {}, 'Roles/Members'), el('button', { className: 'pm-add', title: 'Add a role or member', onclick: addMenu }, icon('plusCircle', 18))),
      ...list.map((t) => {
        const b = el('button', { className: 'pm-tgt' + (t === st.target ? ' on' : ''), onclick: () => open(t) }, ...faceOf(t)), v = P.get(t);
        // (someone who isn't an admin can only take away a row holding what they may do themselves)
        if (t !== 'everyone' && [...v.allow, ...v.deny].every(mine)) b.append(el('span', { className: 'rm', title: 'Remove', role: 'button', onclick: (e) => {
          e.stopPropagation(); P.delete(t); if (st.target === t) st.target = 'everyone'; drawLeft(); drawRight(); catBarNow(st);
        } }, icon('x', 14)));
        return b;
      }));
  }
  function drawRight() {
    const t = st.target, v = P.get(t);
    const tri = (k) => {
      const box = el('div', { className: 'tri', role: 'radiogroup', ariaLabel: k }), ok = mine(k);
      const now = v.deny.has(k) ? 'deny' : v.allow.has(k) ? 'allow' : 'mid';
      for (const [s, ic, title] of [['deny', 'x', 'Deny'], ['mid', 'slash', 'Default (the server’s usual rule)'], ['allow', 'check', 'Allow']]) {
        const b = el('button', { className: s + (now === s ? ' on' : ''), title: ok ? title : 'You can only change permissions you have yourself.', disabled: !ok, role: 'radio' }, icon(ic, 15));
        b.onclick = () => {
          v.allow.delete(k); v.deny.delete(k); if (s === 'allow') v.allow.add(k); if (s === 'deny') v.deny.add(k);
          for (const x of box.children) x.classList.toggle('on', x === b);
          if (t === 'everyone' && k === 'view') privSw.classList.toggle('on', priv());
          catBarNow(st);
        };
        box.append(b);
      }
      return box;
    };
    right.replaceChildren(el('div', { className: 'pm-for' }, 'Permissions for ', el('b', {}, ...faceOf(t).slice(-1))),
      ...CAT_PERMS.flatMap(([group, rows]) => [el('h4', { className: 'pm-group' }, group),
        ...rows.map(([k, label, desc]) => el('div', { className: 'pm-row' }, el('div', { className: 'lbl' }, el('b', {}, label), el('span', {}, desc)), tri(k)))]));
  }
  const adv = el('div', { className: 'pm-adv' }, left, right); adv.hidden = !st.advanced;
  const advH = el('button', { className: 'pm-advh' + (st.advanced ? ' open' : ''), onclick: () => { st.advanced = !st.advanced; advH.classList.toggle('open', st.advanced); adv.hidden = !st.advanced; } },
    el('span', {}, 'Advanced permissions'), icon('chevD', 16));
  drawLeft(); drawRight();
  return [el('h2', {}, 'Permissions'), el('p', { className: 'sub' }, 'Choose who can see this category’s channels and what they can do there. The owner and admins can always do everything.'),
    card, advH, adv, bar];
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
        el('button', { className: 'btn primary', onclick: () => pickPicture({ w: 256, h: 256, round: true, title: 'Server Icon', ok: 'Use It', maxChars: 150000 }).then((d) => { if (d) { img = d; iconKey = ''; draw(); } }) }, 'Change Server Icon'),
        el('button', { className: 'btn ghost', onclick: () => { img = ''; iconKey = 'bot'; draw(); } }, 'Use the robot'),
        el('button', { className: 'btn ghost danger', onclick: () => { img = ''; iconKey = ''; draw(); } }, 'Remove Icon')),
      el('h3', {}, 'Banner'), el('p', { className: 'hint' }, 'The picture at the top of the channel list. (Anyone can hide banners for themselves in Layout.)'),
      picturePicker(banner, (v) => { banner = v; draw(); }, { w: 960, h: 360, label: 'Upload a banner' }),
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
    el('i', { style: `background:${safeColor(x.color, '#99aab5')}` }), roleIconEl(x, 16), el('span', {}, x.name), el('small', {}, String(count(x.id))))), create);
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
    el('div', {}, el('div', { className: 'nm', style: `color:${safeColor(r.color, 'var(--bright)')}` }, holders[0] ? holders[0].name : 'Fluentdat', roleIconEl(r, 18)), el('div', {}, 'This is how names look with this role.')));
  // (the role's icon: an emoji, or a picture made small; it shows beside their names in chat, and on the role's group)
  const setIcon = (v) => { Store.updateRole(r.id, { icon: v }); redraw(); renderAll(); };
  const iconOk = Store.kind === 'supabase' && Store.canBux();
  const pickEmoji = (e) => { e.stopPropagation(); openPicker({ tab: 'emoji', emojiOnly: true, anchor: e.currentTarget, still: motionOff(),
    servers: [], emojiOf: () => [], stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {}, onEmoji: (t, keep, custom) => { if (!custom) setIcon(t); }, onSticker: () => {} }); };
  const upload = () => pickPicture({ w: 64, h: 64, title: 'Role Icon', ok: 'Use It', maxChars: 38000 }).then((url) => { if (url) setIcon(url); });
  const iconRow = el('div', { className: 'role-icon-row' }, el('div', { className: 'role-icon-pv' }, roleIconEl(r, 34) || icon('image', 22)),
    el('div', { className: 'grow' }, el('b', {}, r.icon ? 'Role icon' : 'No icon yet'), el('small', {}, 'Shown beside the names of people with this role in chat, and on the role’s group in the member list.')),
    el('button', { className: 'btn', onclick: pickEmoji }, icon('smile', 16), 'Emoji'), el('button', { className: 'btn', onclick: upload }, icon('image', 16), 'Upload'),
    r.icon ? el('button', { className: 'btn ghost', onclick: () => setIcon('') }, 'Remove') : null);
  return [...head,
    el('div', { className: 'role-edit' },
      el('div', { className: 'role-edit-head' }, el('h3', {}, 'Edit role: ' + r.name), el('span', { style: 'flex:1' }), iconBtn('up', 'Move up (higher roles win the name colour)', () => move(-1)), iconBtn('down', 'Move down', () => move(1))),
      el('h4', { className: 'sub-h' }, 'Role name'), name,
      el('h4', { className: 'sub-h' }, 'Role colour'), el('div', { className: 'rswatches' }, swatch(''), ...ROLE_COLORS.map(swatch), custom),
      el('h4', { className: 'sub-h' }, 'Role icon'), iconOk ? iconRow : el('div', { className: 'note-box' }, 'Role icons need the newest supabase/setup.sql: run it again in Supabase.'),
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
// ---------- a server's own emoji and stickers (Server Settings → Emoji, Stickers) ----------
// (how many a server holds: more as it's boosted)
const emojiName = (s) => String(s || '').replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
function dataBlob(url) {
  const [head, b64] = url.split(','), type = (head.match(/^data:([^;]+)/) || [])[1] || 'image/png', bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Blob([out], { type });
}
// the picture for an emoji (128px) or a sticker (320px): a GIF (or a sticker's PNG, which may be animated) goes as it is
// if it's small enough, since making it smaller would stop it moving; anything else is made small for you
async function expressionFile(file, { px, max, kind }) {
  const type = String(file.type || '').toLowerCase();
  if (!/^image\/(png|apng|gif|webp|jpeg)$/.test(type)) throw new Error(`${kind === 'emoji' ? 'Emoji' : 'Stickers'} can be PNG, GIF, WebP or JPEG pictures.`);
  if (type === 'image/gif') {
    if (file.size > max) throw new Error(`A GIF ${kind} can be up to ${Math.round(max / 1024)} KB (this one is ${fileSize(file.size)}).`);
    return file;
  }
  if (kind === 'sticker' && /png/.test(type) && file.size <= max) return file;
  const blob = dataBlob(await shrink(file, px, px, Math.floor(max * 1.3)));
  if (blob.size > max) throw new Error('That picture is too detailed to fit: try a smaller one.');
  return new File([blob], kind + '.webp', { type: blob.type });
}
const reqBox = (...lines) => el('div', { className: 'ex-req' }, el('h5', {}, 'Upload Requirements'), el('ul', {}, ...lines.map((t) => el('li', {}, t))));
function svEmoji(sv, redraw) {
  const list = Store.serverEmoji(sv.id).sort((a, b) => a.name.localeCompare(b.name)), left = Math.max(0, emojiMax(sv.id) - list.length);
  const up = el('button', { className: 'btn primary', disabled: !left }, 'Upload Emoji');
  up.onclick = () => pickFile(async (f) => {
    up.disabled = true; up.textContent = 'Uploading…';
    try {
      const file = await expressionFile(f, { px: 128, max: 256 * 1024, kind: 'emoji' });
      let name = emojiName(f.name); if (name.length < 2) name = 'emoji';
      const taken = new Set(Store.serverEmoji(sv.id).map((e) => e.name.toLowerCase()));
      for (let n = 1, base = name.slice(0, 29); taken.has(name.toLowerCase()); n++) name = `${base}_${n}`;
      await Store.addEmoji(sv.id, file, name);
      toast(`:${name}: is ready. Click its name to rename it.`);
    } catch (e) { toast(String((e && e.message) || e)); }
    redraw();
  });
  const row = (e) => {
    const nm = el('input', { type: 'text', value: e.name, maxLength: 32, className: 'ex-name', spellcheck: false, ariaLabel: 'Emoji name' });
    nm.onkeydown = (ev) => { if (ev.key === 'Enter') nm.blur(); if (ev.key === 'Escape') { ev.stopPropagation(); nm.value = e.name; nm.blur(); } };
    nm.onblur = async () => {
      const v = nm.value.trim().replace(/^:+|:+$/g, '');
      if (v === e.name) return;
      if (!/^[A-Za-z0-9_]{2,32}$/.test(v)) { toast('Emoji names are 2 to 32 letters, numbers or underscores.'); nm.value = e.name; return; }
      if ((await attempt(() => Store.renameEmoji(e.id, v))) === null) nm.value = e.name; else toast(`Renamed to :${v}:.`);
    };
    const by = e.by ? person(e.by) : null;
    return el('div', { className: 'ex-row' }, el('div', { className: 'ex-pic' }, el('img', { src: safeImg(e.url), alt: ':' + e.name + ':', loading: 'lazy', onerror: (ev) => ev.target.replaceWith(el('span', { className: 'xp-gone' }, e.name.slice(0, 1).toUpperCase())) })),
      el('label', { className: 'ex-nm' }, el('span', {}, ':'), nm, el('span', {}, ':')),
      el('div', { className: 'ex-by' }, by ? avatarEl(face(by), { size: 24 }) : null, el('span', {}, by ? by.name : 'Someone')),
      el('button', { className: 'ex-x', title: 'Delete', onclick: async () => { if ((await attempt(() => Store.removeEmoji(e.id))) !== null) { toast(`:${e.name}: was deleted.`); redraw(); } } }, icon('x', 16)));
  };
  return [el('h2', {}, 'Emoji'),
    el('p', { className: 'sub' }, `Add up to ${emojiMax(sv.id)} custom emoji that anyone can use in Fluentdat, animated GIFs too. Type :name: in a message, or pick them in the emoji picker.`),
    reqBox('File type: PNG, GIF, WebP or JPEG', 'Max file size: 256 KB for a GIF (other pictures are made small for you)', 'Recommended dimensions: 128×128',
      'Naming: emoji names must be at least 2 characters long and can only contain letters, numbers and underscores'),
    el('div', { className: 'ex-up' }, up),
    el('h5', { className: 'ex-head' }, `Emoji — ${left} slot${left === 1 ? '' : 's'} available`),
    list.length ? el('div', { className: 'ex-table' }, el('div', { className: 'ex-row hd' }, el('span', {}, 'Image'), el('span', {}, 'Name'), el('span', {}, 'Uploaded By'), el('span')), ...list.map(row))
      : el('div', { className: 'ex-empty' }, el('div', { className: 'ex-empty-ic' }, icon('smilePlus', 40)), el('b', {}, 'No emoji'), el('span', {}, 'Get the party started by uploading an emoji.'))];
}
function svStickers(sv, redraw) {
  const list = Store.serverStickers(sv.id), left = Math.max(0, stickerMax(sv.id) - list.length);
  const card = (s) => el('div', { className: 'stk-card' },
    el('div', { className: 'stk-pic' }, el('img', { src: safeImg(s.url), alt: s.name, loading: 'lazy', onerror: (ev) => ev.target.replaceWith(icon('sticker', 40)) })),
    el('b', {}, s.name), el('small', {}, [s.emoji, s.description].filter(Boolean).join(' ') || '\u00a0'),
    el('div', { className: 'stk-acts' }, iconBtn('edit', 'Edit', () => stickerDialog(sv, s, redraw)), iconBtn('trash', 'Delete', async () => {
      if (!(await confirmBox({ title: 'Delete Sticker', text: `Delete “${s.name}”? Where it was sent, it’ll show as a deleted sticker.`, ok: 'Delete', danger: true }))) return;
      if ((await attempt(() => Store.removeServerSticker(s.id))) !== null) redraw();
    }, 'del')));
  const add = el('button', { className: 'stk-card add', onclick: () => stickerDialog(sv, null, redraw) }, el('div', { className: 'stk-pic' }, icon('plus', 28)), el('b', {}, 'Upload Sticker'), el('small', {}, '\u00a0'));
  return [el('h2', {}, 'Stickers'),
    el('p', { className: 'sub' }, 'Upload custom stickers that anyone can use in Fluentdat. GIFs and animated PNGs move.'),
    reqBox('File type: PNG, APNG, GIF, WebP or JPEG', 'Max file size: 512 KB', 'Dimensions: 320×320 (bigger pictures are made smaller, except moving ones)'),
    el('h5', { className: 'ex-head' }, `Stickers — ${left} slot${left === 1 ? '' : 's'} available`),
    el('div', { className: 'stk-grid' }, ...list.map(card), left ? add : null)];
}
function stickerDialog(sv, s, redraw) {
  let file = null, url = s ? safeImg(s.url) : '';
  const pic = el('div', { className: 'stk-preview' });
  const draw = () => pic.replaceChildren(url ? el('img', { src: url, alt: '' }) : el('span', {}, icon('sticker', 34), 'Preview'));
  const name = el('input', { type: 'text', value: s ? s.name : '', maxLength: 30, placeholder: 'Name your sticker' });
  const emoji = el('input', { type: 'text', value: s ? s.emoji : '', maxLength: 32, placeholder: 'An emoji it goes with, e.g. 😄' });
  const desc = el('input', { type: 'text', value: s ? s.description : '', maxLength: 100, placeholder: 'What it shows (helps people find it)' });
  const fname = el('span', { className: 'stk-file' }, s ? 'The picture stays (upload a new sticker to change it).' : 'No file chosen');
  const ok = el('button', { className: 'btn primary' }, s ? 'Save' : 'Upload');
  const check = () => { ok.disabled = !(name.value.trim().length >= 2 && (s || file)); };
  name.oninput = check;
  const browse = s ? null : el('button', { className: 'btn small', onclick: () => pickFile(async (f) => {
    try { file = await expressionFile(f, { px: 320, max: 512 * 1024, kind: 'sticker' }); }
    catch (e) { file = null; check(); return toast(String((e && e.message) || e)); }
    fname.textContent = `${f.name} · ${fileSize(file.size)}`;
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    url = URL.createObjectURL(file); draw();
    if (!name.value.trim()) name.value = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 30);
    check();
  }) }, 'Browse');
  const pickBtn = el('button', { className: 'tool', title: 'Pick an emoji', onclick: (e) => { e.stopPropagation(); openPicker({ tab: 'emoji', emojiOnly: true, anchor: pickBtn, still: motionOff(),
    servers: [], emojiOf: () => [], stickersOf: () => [], own: [], builtin: [], safeImg, canManage: () => false, manage: () => {}, onEmoji: (t) => { emoji.value = t; }, onSticker: () => {} }); } }, icon('smile', 18));
  const field = (label, ...kids) => el('div', { className: 'field' }, el('label', {}, label), ...kids);
  const w = modal({ title: s ? 'Edit Sticker' : 'Upload a Sticker', cls: 'stk-dlg', onClose: () => { closeXp(true); if (url.startsWith('blob:')) URL.revokeObjectURL(url); },
    body: [el('div', { className: 'stk-dlg-body' }, pic, el('div', { className: 'stk-fields' },
      field('Sticker Name', name), field('Related Emoji', el('div', { className: 'stk-emoji' }, emoji, pickBtn)), field('Description', desc),
      field('File', el('div', { className: 'stk-browse' }, fname, browse))))],
    actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => w.close() }), ok] });
  ok.onclick = async () => {
    const n = name.value.trim();
    if (n.length < 2) return toast('Sticker names are 2 to 30 characters.');
    ok.disabled = true; ok.textContent = s ? 'Saving…' : 'Uploading…';
    const patch = { name: n, emoji: emoji.value.trim().slice(0, 32), description: desc.value.trim().slice(0, 100) };
    if ((await attempt(() => (s ? Store.updateServerSticker(s.id, patch) : Store.addServerSticker(sv.id, file, patch)))) === null) { ok.textContent = s ? 'Save' : 'Upload'; return check(); }
    w.close(); redraw(); toast(s ? 'Sticker saved.' : `“${n}” is ready: find it in the sticker picker.`);
  };
  draw(); check(); setTimeout(() => name.focus(), 0);
}

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
          ...Store.roles(sv.id).filter((r) => (m.roles || []).includes(r.id)).map((r) => el('span', { className: 'rchip' }, el('i', { style: `background:${safeColor(r.color, '#99aab5')}` }), roleIconEl(r, 14), r.name)), m.login ? '@' + m.login : '')),
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
  const pick = (key, options) => sel(prefs[key], options, (v) => { setPref(key, v); });
  return [
    el('h2', {}, 'Layout'),
    el('p', { className: 'sub' }, 'A small copy of Fluentdat’s screen. Drag any edge to resize it, drag parts and buttons to move them, drop a button in the tray to hide it, and click anything to see all of its settings.'),
    layoutStudio(redraw),
    el('h3', {}, 'Shape & type'),
    row2('Corners', 'How rounded buttons, channels and messages are.', pick('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']])),
    row2('Interface font', 'The font used everywhere in the app.', pick('uiFont', [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospaced']])),
    ...buttonsSection(redraw),
    el('h3', {}, 'Start over'),
    row2('Reset layout', 'Put every size, position, button and option on this page back to the default.', el('button', { className: 'btn danger', onclick: async () => {
      if (!(await confirmBox({ title: 'Reset Layout', text: 'Put every layout option, size, position and button back to the default?', ok: 'Reset', danger: true }))) return;
      prefs = { ...prefs, ...DEFAULT_PREFS, ...keepOf() }; savePrefs(); showMembers = true; renderAll(); redraw(); toast('Layout reset.');
    } }, 'Reset')),
  ];
}

// Layout → Buttons: every button, in every bar, can be hidden or moved (the settings cog always stays)
function buttonsSection(redraw) {
  const pick = (key, options) => sel(prefs[key], options, (v) => { setPref(key, v); });
  const out = [el('h3', {}, 'All buttons'), el('p', { className: 'hint' }, 'The same as dragging in the mini screen, as a list. The settings cog always stays, so you can always get back here.'),
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
        : sw(shown(id), (on) => { prefs.hidden = { ...(prefs.hidden || {}), [id]: !on }; savePrefs(); renderAll(); });
      list.append(el('div', { className: 'it' }, icon(ic, 17), el('span', { className: 'nm3' }, label),
        iconBtn('up', 'Move ' + (group === 'rail' ? 'up' : 'earlier'), () => move(-1)), iconBtn('down', 'Move ' + (group === 'rail' ? 'down' : 'later'), () => move(1)), toggle));
    });
    out.push(el('h4', { className: 'sub-h' }, title), list);
  }
  out.push(el('div', { className: 'row', style: 'justify-content:flex-start' },
    el('button', { className: 'btn', onclick: () => { prefs.hidden = { ...DEFAULT_PREFS.hidden }; prefs.order = {}; prefs.labels = {}; savePrefs(); renderAll(); redraw(); toast('Buttons are back to normal.'); } }, 'Reset Buttons')));
  return out;
}

// ===================== the layout studio: a mini screen of the whole app =====================
// Drag an edge to resize a part, drag a part to move it (columns left and right, the rest up and down), drag a button
// along its bar to reorder it or into the tray to hide it, and click anything for all of its settings underneath.
const PARTS = { title: 'Title bar', status: 'Status bar', rail: 'Server rail', side: 'Sidebar', head: 'Server header', body: 'Channel list', panel: 'Your controls',
  main: 'Main area', top: 'Top bar', content: 'Messages', composer: 'Message box', members: 'Member list' };
const PART_OF_BAR = { rail: 'rail', header: 'head', channels: 'body', dms: 'side', top: 'top', composer: 'composer', panel: 'panel', railPanel: 'panel', titlebar: 'title',
  serverTop: 'body', dmNav: 'body', msgActions: 'content' };
const SIDE_PARTS = ['head', 'body', 'panel'], MAIN_PARTS = ['top', 'content', 'composer'];
const WIDE_CHIPS = new Set(['servers', 'input', 'me', 'findDM']);
const LAYOUT_KEYS = Object.keys(DEFAULT_PREFS).filter((k) => !KEEP.includes(k));
const studio = { sel: 'content', view: 'server', history: [] };
let studioDrag = null;

function layoutStudio(redraw) {
  const mini = el('div', { className: 'mini' }), wrap = el('div', { className: 'mini-wrap' }, mini);
  const tray = el('div', { className: 'tray' }), insp = el('div', { className: 'insp' });
  const HINT = 'Drag edges to resize · drag parts and buttons to move them · click anything for its settings';
  const hint = el('div', { className: 'studio-hint' }, HINT);
  let scale = 0.5, ghost = null, marker = null, lastW = 0;
  const S = (v) => Math.max(1, Math.round(v * scale));
  const remember = () => { studio.history.push(JSON.stringify(Object.fromEntries(LAYOUT_KEYS.map((k) => [k, prefs[k]])))); if (studio.history.length > 80) studio.history.shift(); };
  const commit = () => { savePrefs(); renderAll(); draw(); };
  const select = (id) => { studio.sel = id; draw(); };
  const undo = () => { const s = studio.history.pop(); if (!s) return toast('Nothing to undo.'); Object.assign(prefs, JSON.parse(s)); showMembers = prefs.membersDefault !== false; commit(); };
  const views = el('div', { className: 'seg' });
  const tools = el('div', { className: 'studio-tools' }, views, el('span', { style: 'flex:1' }),
    el('button', { className: 'btn small', onclick: undo, title: 'Undo the last change' }, 'Undo'),
    ...Object.keys(LAYOUT_PRESETS).map((name) => el('button', { className: 'btn small', title: `The ${name} layout`, onclick: () => {
      remember(); prefs = { ...prefs, ...DEFAULT_PREFS, ...LAYOUT_PRESETS[name], ...keepOf() }; showMembers = prefs.membersDefault !== false; commit(); toast(name + ' layout applied.');
    } }, name)));

  function draw() {
    views.replaceChildren(...[['server', 'Server view'], ['dm', 'Direct messages']].map(([v, label]) =>
      el('button', { className: studio.view === v ? 'on' : '', onclick: () => { studio.view = v; draw(); } }, label)));
    drawMini(); drawTray(); drawInspector();
  }

  // ---------- the mini screen ----------
  function drawMini() {
    const avail = wrap.clientWidth || 640, realW = Math.max(700, innerWidth), realH = Math.max(460, innerHeight);
    scale = Math.min(avail / realW, 430 / realH);
    const W = S(realW), H = S(realH);
    mini.style.width = W + 'px'; mini.style.height = H + 'px';
    const statusOn = prefs.banner !== 'off', stH = statusOn ? S(prefs.statusH) : 5, bottom = prefs.statusPos === 'bottom';
    const titleOn = prefs.titlebar !== 'off', tH = titleOn ? Math.max(6, S(prefs.titleH)) : 5;
    const appTop = tH + (bottom ? 0 : stH), appH = H - stH - tH, dm = studio.view === 'dm';
    const membersOn = dm ? prefs.dmPanel !== false : prefs.membersDefault !== false;
    const kids = [place(chipSize(part('title', titleOn ? [bar('titlebar', 'title-bar' + (prefs.titleAlign === 'left' ? ' left' : ''))] : [], !titleOn), Math.max(10, prefs.titleH - 12)), 0, 0, W, tH),
      place(part('status', statusOn ? [el('span', { className: 'm-tag' }, 'Live, signed in')] : [], !statusOn), 0, bottom ? tH + appH : tH, W, stH)];
    const w = { rail: prefs.rail === 'off' ? 5 : S(prefs.railW), side: S(prefs.sideW), members: membersOn ? S(dm ? Math.max(prefs.membersW, 280) : prefs.membersW) : 5 };
    w.main = Math.max(30, W - w.rail - w.side - w.members);
    let x = 0;
    for (const c of validOrder(prefs.cols, COLS)) {
      kids.push(place(c === 'rail' ? railPart() : c === 'side' ? sidePart() : c === 'main' ? mainPart() : membersPart(membersOn), x, appTop, w[c], appH));
      x += w[c];
    }
    mini.replaceChildren(...kids);
    addHandles(membersOn);
  }
  const place = (node, left, top, width, height) => { Object.assign(node.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }); return node; };
  function part(id, kids = [], off = false, cls = '') {
    const p = el('div', { className: `mp m-${id}${cls ? ' ' + cls : ''}${studio.sel === id ? ' sel' : ''}${off ? ' off' : ''}`, title: PARTS[id] + (off ? ' (hidden: click it, then switch it back on)' : '') }, ...kids);
    p.dataset.part = id;
    p.addEventListener('pointerdown', (e) => partDown(e, id, p));
    return p;
  }
  const chipSize = (node, px) => { node.style.setProperty('--chip', Math.max(7, S(px)) + 'px'); return node; };
  function chipEl(group, id) {
    const [, label, ic, fixed] = BUTTONS[group][1].find((b) => b[0] === id);
    const na = (studio.view === 'dm' && id === 'members') || (studio.view === 'server' && id === 'dmProfile');
    const c = el('span', { className: 'mchip' + (WIDE_CHIPS.has(id) ? ' wide' : '') + (na ? ' na' : ''), title: label + (na ? ' (only shows in ' + (id === 'members' ? 'servers' : 'DMs') + ')' : '') + (fixed ? '' : '. Drag along the bar to move it, or into the tray to hide it.') });
    if (id === 'servers') c.append(el('i'), el('i'), el('i'));
    else if (id === 'me' && group === 'railPanel') { c.classList.remove('wide'); c.append(el('i')); }
    else if (id === 'tbName') c.append(el('em', {}, studio.view === 'dm' ? 'Direct Messages' : (Store.server(serverId) || { name: 'Robotics' }).name));
    else if (id === 'input') c.append(el('em', {}, studio.view === 'dm' ? 'Message @Bee' : 'Message #general'));
    else if (id === 'me') c.append(el('i'), el('em', {}, me.name));
    else if (id === 'findDM') c.append(el('em', {}, 'Find a conversation'));
    else c.append(icon(ic));
    c.dataset.chip = id;
    c.addEventListener('pointerdown', (e) => chipDown(e, group, id, c, false));
    return c;
  }
  function bar(group, cls = '') {
    const b = el('div', { className: 'm-bar' + (cls ? ' ' + cls : '') });
    b.dataset.bar = group;
    for (const id of ordered(group)) if (shown(id)) b.append(chipEl(group, id));
    return b;
  }
  function railPart() {
    const off = prefs.rail === 'off', kids = off ? [] : [bar('rail', 'vertical')];
    // (your controls at its foot, when they live there)
    if (!off && prefs.panelPos === 'rail') { const on = prefs.userPanel !== 'off'; kids.push(chipSize(part('panel', on ? [bar('railPanel', 'vertical')] : [], !on, 'sub in-rail'), prefs.icPanel)); }
    return chipSize(part('rail', kids, off), Math.max(28, Math.min(80, prefs.railW - 26)));
  }
  function sidePart() {
    const sv = Store.server(serverId) || { name: 'Server' };
    // (the banner shows as it really would: only for a server that has one)
    const dm = studio.view === 'dm', headOn = prefs.sideHead !== 'off', panelOn = prefs.userPanel !== 'off', banner = !dm && prefs.serverBanner !== 'off' && !!paint(sv.banner);
    const head = part('head', headOn ? (dm ? [bar('dms', 'find')] : [el('span', { className: 'm-name' }, sv.name), bar('header')]) : [], !headOn, 'sub' + (headOn && banner ? ' bannered' : ''));
    head.style.height = (headOn ? S(banner ? prefs.bannerH : prefs.topH) : 5) + 'px';
    if (headOn && banner) head.style.background = paint(sv.banner);
    const body = part('body', dm ? dmLines() : channelLines(), false, 'sub');
    const panel = chipSize(part('panel', panelOn ? [bar('panel')] : [], !panelOn, 'sub'), prefs.icPanel);
    panel.style.height = (panelOn ? S(prefs.panelH) : 5) + 'px';
    if (panelOn) plateOn(panel, me.plate);
    const col = part('side');
    col.append(...validOrder(prefs.sideOrder, SIDE_PARTS).filter((p) => p !== 'panel' || prefs.panelPos !== 'rail' || prefs.rail === 'off').map((p) => ({ head, body, panel })[p]));
    return col;
  }
  function channelLines() {
    const H = Math.max(5, S(prefs.chanH)), out = [bar('serverTop', 'inline')];
    out.push(el('div', { className: 'm-cat' }, el('span', {}, prefs.cats !== 'off' ? 'TEXT CHANNELS' : ''), bar('channels', 'inline')));
    ['general', 'build-log', 'programming', 'random'].forEach((n, i) => {
      const row = el('div', { className: 'm-chan' + (i === 0 ? ' on first' : '') }, prefs.chanIcons === 'off' ? '' : el('b', {}, '#'), el('span', {}, n));
      row.style.height = H + 'px';
      out.push(row);
    });
    return out;
  }
  function dmLines() {
    const H = Math.max(5, S(prefs.chanH));
    const line = (txt, av) => { const r = el('div', { className: 'm-chan' }, av ? el('i', { className: 'm-dot' }) : null, el('span', {}, txt)); r.style.height = H + 'px'; return r; };
    return [bar('dmNav', 'inline'), el('div', { className: 'm-cat' }, 'DIRECT MESSAGES'), line('Bee', true), line('Cam', true)];
  }
  function mainPart() {
    const dm = studio.view === 'dm', topOn = prefs.topbar !== 'off';
    const top = chipSize(part('top', topOn ? [el('span', { className: 'm-title' }, dm ? '@ Bee' : '# general'), el('span', { style: 'flex:1' }), bar('top')] : [], !topOn, 'sub'), prefs.icTop);
    top.style.height = (topOn ? S(prefs.topH) : 5) + 'px';
    const content = part('content', sampleMessages(), false, 'sub');
    const composer = chipSize(part('composer', [el('div', { className: 'm-box' }, bar('composer', 'inbox'))], false, 'sub'), prefs.icComposer);
    composer.style.height = S(prefs.composerH + 24) + 'px';
    const col = part('main');
    col.append(...validOrder(prefs.mainOrder, MAIN_PARTS).map((p) => ({ top, content, composer })[p]));
    return col;
  }
  function sampleMessages() {
    const A = S(prefs.avatarPx), L = Math.max(3, S(prefs.fontSize * 0.85));
    const msg = (w1, w2, first) => el('div', { className: 'm-msg' }, prefs.avatars === 'off' ? null : (() => { const i = el('i', { className: 'm-av' + (first ? ' first' : '') }); i.style.width = i.style.height = A + 'px'; return i; })(),
      el('div', { className: 'm-lines' }, (() => { const b = el('b'); b.style.width = w1 + '%'; b.style.height = L + 'px'; return b; })(), (() => { const s = el('span'); s.style.width = w2 + '%'; s.style.height = L + 'px'; return s; })()));
    return [msg(30, 82, true), msg(22, 56), msg(36, 70)];
  }
  function membersPart(on) {
    if (!on) return part('members', [], true);
    if (studio.view === 'dm') return part('members', [el('div', { className: 'm-dp' }, el('div', { className: 'm-dp-banner' }), el('i', { className: 'm-dp-av' }), el('b'), el('span'))]);
    const M = S(prefs.memberAv);
    const row = (first) => { const r = el('div', { className: 'm-mem' }, (() => { const i = el('i', { className: 'm-av' + (first ? ' first' : '') }); i.style.width = i.style.height = M + 'px'; return i; })(), el('b')); return first ? plateOn(r, me.plate) : r; };
    return part('members', [el('div', { className: 'm-cat' }, 'ONLINE — 3'), row(true), row(), row()]);
  }

  // ---------- handles: the edges you drag to resize ----------
  function addHandles(membersOn) {
    const r0 = mini.getBoundingClientRect();
    const rect = (q) => { const n = mini.querySelector(q); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height, n }; };
    const cols = validOrder(prefs.cols, COLS), mi = cols.indexOf('main'), hs = [];
    for (const [c, key] of [['rail', 'railW'], ['side', 'sideW'], ['members', 'membersW']]) {
      if ((c === 'rail' && prefs.rail === 'off') || (c === 'members' && !membersOn)) continue;
      const r = rect('.m-' + c), right = cols.indexOf(c) < mi;
      hs.push(handle('v', right ? r.x + r.w : r.x, r.y, r.h, key, right ? 1 : -1));
    }
    const edge = (id, key, stretch, order, all) => {
      const r = rect('.m-' + id); if (!r || r.n.classList.contains('off')) return;
      const o = validOrder(order, all), before = o.indexOf(id) < o.indexOf(stretch);
      hs.push(handle('h', r.x, before ? r.y + r.h : r.y, r.w, key, before ? 1 : -1));
    };
    edge('top', 'topH', 'content', prefs.mainOrder, MAIN_PARTS);
    edge('composer', 'composerH', 'content', prefs.mainOrder, MAIN_PARTS);
    if (prefs.panelPos !== 'rail' || prefs.rail === 'off') edge('panel', 'panelH', 'body', prefs.sideOrder, SIDE_PARTS);
    if (prefs.titlebar !== 'off') { const r = rect('.m-title'); if (r) hs.push(handle('h', r.x, r.y + r.h, r.w, 'titleH', 1)); }
    edge('head', mini.querySelector('.m-head.bannered') ? 'bannerH' : 'topH', 'body', prefs.sideOrder, SIDE_PARTS);
    if (prefs.banner !== 'off') { const r = rect('.m-status'), top = prefs.statusPos !== 'bottom'; hs.push(handle('h', r.x, top ? r.y + r.h : r.y, r.w, 'statusH', top ? 1 : -1)); }
    const av = rect('.m-content .m-av.first'); if (av) hs.push(grip(av.x + av.w, av.y + av.h, 'avatarPx'));
    const mav = rect('.m-members .m-av.first'); if (mav) hs.push(grip(mav.x + mav.w, mav.y + mav.h, 'memberAv'));
    const ch = rect('.m-chan.first'); if (ch) hs.push(handle('h', ch.x, ch.y + ch.h, ch.w, 'chanH', 1, 'thin'));
    mini.append(...hs);
  }
  function handle(axis, x, y, len, key, dir, cls = '') {
    const h = el('div', { className: `m-handle ${axis}${cls ? ' ' + cls : ''}`, title: `${SIZES[key][0]}: ${prefs[key]}px (drag to change)` });
    Object.assign(h.style, axis === 'v' ? { left: x + 'px', top: y + 'px', height: len + 'px' } : { left: x + 'px', top: y + 'px', width: len + 'px' });
    h.addEventListener('pointerdown', (e) => resizeDown(e, axis, key, dir));
    return h;
  }
  function grip(x, y, key) {
    const g = el('div', { className: 'm-grip', title: `${SIZES[key][0]}: ${prefs[key]}px (drag to change)` });
    Object.assign(g.style, { left: x + 'px', top: y + 'px' });
    g.addEventListener('pointerdown', (e) => resizeDown(e, 'both', key, 1));
    return g;
  }

  // ---------- dragging ----------
  function begin(e, d) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    studioDrag = { ...d, x0: e.clientX, y0: e.clientY, moved: false };
    addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  }
  function onMove(e) {
    const d = studioDrag; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) { if (Math.hypot(dx, dy) < 5) return; d.moved = true; if (d.start) d.start(e); }
    d.move(e, dx, dy);
  }
  function onUp(e) {
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    const d = studioDrag; studioDrag = null; if (!d) return;
    if (!d.moved) { if (d.click) d.click(e); return; }
    if (d.end) d.end(e);
  }
  function resizeDown(e, axis, key, dir) {
    const v0 = prefs[key];
    begin(e, {
      click: () => select(partForSize(key)),
      start: () => { remember(); document.documentElement.classList.add('resizing'); },
      move: (ev, dx, dy) => {
        const d = axis === 'v' ? dx : axis === 'h' ? dy : (dx + dy) / 2;
        prefs[key] = sizeOf(key, v0 + (d * dir) / scale);
        applyPrefs(); drawMini();
        hint.textContent = `${SIZES[key][0]}: ${prefs[key]}px`;
      },
      end: () => { document.documentElement.classList.remove('resizing'); hint.textContent = HINT; savePrefs(); studio.sel = partForSize(key); draw(); },
    });
  }
  const partForSize = (key) => ({ railW: 'rail', railGap: 'rail', sideW: 'side', membersW: 'members', topH: 'top', composerH: 'composer', panelH: 'panel', bannerH: 'head',
    statusH: 'status', avatarPx: 'content', reactH: 'content', memberAv: 'members', chanH: 'body', icTop: 'top', topGap: 'top', icComposer: 'composer', icPanel: 'panel', fontSize: 'content' })[key] || studio.sel;
  function makeGhost(node, ev) {
    const r = node.getBoundingClientRect(), g = node.cloneNode(true);
    g.classList.add('m-ghost');
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    g.dataset.dx = ev.clientX - r.left; g.dataset.dy = ev.clientY - r.top;
    document.body.append(g);
    return g;
  }
  const moveGhost = (ev) => { if (ghost) { ghost.style.left = ev.clientX - ghost.dataset.dx + 'px'; ghost.style.top = ev.clientY - ghost.dataset.dy + 'px'; } };
  const dropGhost = () => { if (ghost) ghost.remove(); ghost = null; showMarker(null); };
  function showMarker(m) {
    if (!marker) marker = el('div', { className: 'm-drop' });
    if (!m) { marker.remove(); return; }
    Object.assign(marker.style, { left: m.x + 'px', top: m.y + 'px', width: m.w + 'px', height: m.h + 'px' });
    mini.append(marker);
  }
  // moving a part: columns go left or right; the sidebar's and main area's parts go up or down; the status bar top or bottom
  function partDown(e, id, node) {
    const group = COLS.includes(id) ? 'cols' : SIDE_PARTS.includes(id) ? 'side' : MAIN_PARTS.includes(id) ? 'main' : 'status';
    let target = null;
    begin(e, {
      click: () => select(id),
      start: (ev) => { remember(); ghost = makeGhost(node, ev); node.classList.add('lifting'); },
      move: (ev) => { moveGhost(ev); target = dropFor(group, id, ev); showMarker(target && target.marker); },
      end: () => {
        dropGhost(); node.classList.remove('lifting');
        if (!target) return draw();
        if (group === 'cols') prefs.cols = target.order; else if (group === 'side') prefs.sideOrder = target.order;
        else if (group === 'main') prefs.mainOrder = target.order; else prefs.statusPos = target.pos;
        studio.sel = id; commit();
      },
    });
  }
  function dropFor(group, id, ev) {
    const r0 = mini.getBoundingClientRect();
    if (group === 'status') { const low = ev.clientY > r0.top + r0.height / 2; return { pos: low ? 'bottom' : 'top', marker: { x: 0, y: low ? r0.height - 4 : 0, w: r0.width, h: 4 } }; }
    const all = group === 'cols' ? validOrder(prefs.cols, COLS) : group === 'side' ? validOrder(prefs.sideOrder, SIDE_PARTS) : validOrder(prefs.mainOrder, MAIN_PARTS);
    const others = all.filter((x) => x !== id), across = group === 'cols';
    const rects = others.map((x) => mini.querySelector('.m-' + x).getBoundingClientRect());
    const p = across ? ev.clientX : ev.clientY;
    const i = rects.filter((r) => (across ? r.left + r.width / 2 : r.top + r.height / 2) < p).length;
    const box = across ? r0 : mini.querySelector(group === 'side' ? '.m-side' : '.m-main').getBoundingClientRect();
    const ref = rects[i] || rects[i - 1], end = !rects[i];
    const marker = across ? { x: (end ? ref.right : ref.left) - r0.left - 2, y: box.top - r0.top, w: 4, h: box.height }
      : { x: box.left - r0.left, y: (end ? ref.bottom : ref.top) - r0.top - 2, w: box.width, h: 4 };
    return { order: [...others.slice(0, i), id, ...others.slice(i)], marker };
  }
  // moving a button: along its own bar, or into the tray (hide it) and back out
  function chipDown(e, group, id, node, fromTray) {
    const fixed = !!(BUTTONS[group][1].find((b) => b[0] === id) || [])[3];
    let target = null;
    begin(e, {
      click: () => { if (fromTray) { remember(); prefs.hidden = { ...(prefs.hidden || {}), [id]: false }; commit(); } else select(PART_OF_BAR[group]); },
      start: (ev) => { remember(); ghost = makeGhost(node, ev); node.classList.add('lifting'); },
      move: (ev) => {
        moveGhost(ev);
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const overTray = !!under && under.closest('.tray') === tray;
        tray.classList.toggle('over', overTray && !fixed);
        target = null;
        if (overTray) { target = { hide: true }; showMarker(null); return; }
        const barEl = under && under.closest('[data-bar]');
        if (!barEl || barEl.dataset.bar !== group || !mini.contains(barEl)) { showMarker(null); return; }
        const down = barEl.classList.contains('vertical'), chips = [...barEl.querySelectorAll('.mchip')].filter((c) => c !== node);
        const p = down ? ev.clientY : ev.clientX;
        const i = chips.filter((c) => { const r = c.getBoundingClientRect(); return (down ? r.top + r.height / 2 : r.left + r.width / 2) < p; }).length;
        target = { before: chips[i] ? chips[i].dataset.chip : null };
        const r0 = mini.getBoundingClientRect(), br = barEl.getBoundingClientRect(), ref = chips[i] || chips[i - 1];
        if (!ref) return showMarker({ x: br.left - r0.left, y: br.top - r0.top, w: down ? br.width : 3, h: down ? 3 : br.height });
        const r = ref.getBoundingClientRect(), end = !chips[i];
        showMarker(down ? { x: br.left - r0.left, y: (end ? r.bottom : r.top) - r0.top - 1, w: br.width, h: 3 } : { x: (end ? r.right : r.left) - r0.left - 1, y: br.top - r0.top, w: 3, h: br.height });
      },
      end: () => {
        dropGhost(); node.classList.remove('lifting'); tray.classList.remove('over');
        if (!target) return draw();
        if (target.hide) {
          if (fixed) { toast(id === 'settings' ? 'The settings cog always stays, so you can always get back here.' : 'That one can be moved, but not hidden.'); return draw(); }
          prefs.hidden = { ...(prefs.hidden || {}), [id]: true };
        } else {
          prefs.hidden = { ...(prefs.hidden || {}), [id]: false };
          const o = ordered(group).filter((x) => x !== id), at = target.before ? o.indexOf(target.before) : -1;
          o.splice(at < 0 ? o.length : at, 0, id);
          prefs.order = { ...(prefs.order || {}), [group]: o };
        }
        commit();
      },
    });
  }

  // ---------- the tray: hidden buttons (drag or tap one to bring it back) and hidden parts ----------
  function drawTray() {
    const items = [];
    const parts = [['title', prefs.titlebar === 'off', () => { prefs.titlebar = 'on'; }], ['status', prefs.banner === 'off', () => { prefs.banner = 'on'; }], ['rail', prefs.rail === 'off', () => { prefs.rail = 'on'; }],
      ['head', prefs.sideHead === 'off', () => { prefs.sideHead = 'on'; }], ['panel', prefs.userPanel === 'off', () => { prefs.userPanel = 'on'; }],
      ['top', prefs.topbar === 'off', () => { prefs.topbar = 'on'; }], ['members', prefs.membersDefault === false, () => { prefs.membersDefault = true; showMembers = true; }]];
    for (const [id, off, on] of parts) if (off) items.push(el('button', { className: 'mchip tchip part', title: 'Show the ' + PARTS[id].toLowerCase() + ' again', onclick: () => { remember(); on(); studio.sel = id; commit(); } }, icon('eye'), el('span', {}, PARTS[id])));
    const listed = new Set();
    for (const [group, [title, list]] of Object.entries(BUTTONS)) for (const [id, label, ic] of list) {
      if (shown(id) || listed.has(id)) continue;
      listed.add(id);
      const c = el('span', { className: 'mchip tchip', title: `${label}, in the ${title.toLowerCase()}. Drag it back onto its bar, or tap it, to show it.` }, icon(ic), el('span', {}, label));
      c.dataset.chip = id;
      c.addEventListener('pointerdown', (e) => chipDown(e, group, id, c, true));
      items.push(c);
    }
    tray.replaceChildren(el('span', { className: 'tray-lbl' }, items.length ? 'Hidden:' : 'Drop a button here to hide it.'), ...items);
  }

  // ---------- the settings for whatever is selected ----------
  function drawInspector() {
    const id = studio.sel, out = [];
    const flag = (key, label, desc, after) => row2(label, desc, sw(prefs[key] === true || prefs[key] === 'on', (on) => {
      remember(); prefs[key] = typeof DEFAULT_PREFS[key] === 'boolean' ? on : on ? 'on' : 'off'; if (after) after(on); commit();
    }));
    const pickRow = (key, label, options, desc = '') => row2(label, desc, sel(prefs[key], options, (v) => { remember(); prefs[key] = v; commit(); }));
    const size = (key, desc = '') => {
      const [label, lo, hi] = SIZES[key], val = el('span', { className: 'val' }, prefs[key] + 'px');
      const r = el('input', { type: 'range', min: lo, max: hi, step: 1, value: prefs[key] });
      let first = true;
      r.oninput = () => { if (first) { remember(); first = false; } prefs[key] = +r.value; val.textContent = r.value + 'px'; applyPrefs(); drawMini(); };
      r.onchange = () => { first = true; savePrefs(); };
      return row2(label, desc, el('div', { className: 'slide' }, r, val));
    };
    const move = (key, all, labels) => {
      const o = validOrder(prefs[key], all), i = o.indexOf(id);
      const go = (d) => { const j = i + d; if (j < 0 || j >= o.length) return; remember(); [o[i], o[j]] = [o[j], o[i]]; prefs[key] = o; commit(); };
      return row2('Position', `${i + 1} of ${o.length}, ${key === 'cols' ? 'left to right' : 'top to bottom'}. You can also drag it in the mini screen.`,
        el('div', { className: 'btn-row' }, el('button', { className: 'btn small', disabled: i === 0, onclick: () => go(-1) }, labels[0]), el('button', { className: 'btn small', disabled: i === o.length - 1, onclick: () => go(1) }, labels[1])));
    };
    const sideways = (key, all) => move(key, all, ['◀ Left', 'Right ▶']), updown = (key, all) => move(key, all, ['▲ Up', 'Down ▼']);
    const onoff = [['on', 'Shown'], ['off', 'Hidden']];
    if (id === 'title') out.push(flag('titlebar', 'Show the title bar', 'Across the top of the window: the server you’re in, or Direct Messages.'), size('titleH'),
      pickRow('titleAlign', 'Title', [['center', 'In the middle'], ['left', 'On the left']]), ...buttonRows('titlebar'));
    if (id === 'status') out.push(flag('banner', 'Show the status bar', 'The line saying whether you’re signed in and live.'),
      flag('liveBanner', 'Say when all is well', '“Live, signed in as @you.” Off, the bar only shows when something needs you.'), size('statusH'),
      row2('Position', 'Across the top or the bottom of the window.', el('div', { className: 'btn-row' }, ...[['top', 'Top'], ['bottom', 'Bottom']].map(([v, l]) =>
        el('button', { className: 'btn small' + (prefs.statusPos === v || (v === 'top' && prefs.statusPos !== 'bottom') ? ' primary' : ''), onclick: () => { remember(); prefs.statusPos = v; commit(); } }, l)))));
    if (id === 'rail') out.push(flag('rail', 'Show the server rail', 'The strip of server icons.'), size('railW', 'Server icons grow with it.'), size('railGap'), sideways('cols', COLS),
      pickRow('iconShape', 'Icon shape', [['squircle', 'Circle, squircle when open (Discord)'], ['round', 'Always a circle'], ['square', 'Always a rounded square']]), ...buttonRows('rail'));
    if (id === 'side') out.push(size('sideW'), sideways('cols', COLS), size('chanH'), flag('cats', 'Category headings', 'TEXT CHANNELS, VOICE CHANNELS…'), flag('chanIcons', 'Channel icons', 'The # and speaker marks.'), ...buttonRows('dms'));
    if (id === 'head') out.push(flag('sideHead', 'Show the server header', 'The server’s name and menu.'), flag('serverBanner', 'Server banners', 'A server’s picture at the top of its channels.'),
      pickRow('bannerStyle', 'Banner', [['under', 'Under the server’s name'], ['behind', 'Behind the server’s name']]), size('bannerH', 'When a server has a banner.'), updown('sideOrder', SIDE_PARTS), ...buttonRows('header'));
    if (id === 'body') out.push(size('chanH'), flag('cats', 'Category headings', ''), pickRow('catStyle', 'Category names', [['dim', 'Bright when open, dimmed when closed'], ['line', 'With a line under them, and an arrow'], ['caps', 'SMALL CAPITALS, with an arrow']]),
      flag('chanIcons', 'Channel icons', ''), updown('sideOrder', SIDE_PARTS), ...buttonRows(studio.view === 'dm' ? 'dmNav' : 'serverTop'), ...buttonRows('channels'));
    if (id === 'panel') out.push(flag('userPanel', 'Show your controls', 'Your picture, mute, deafen and the settings cog.'),
      pickRow('panelPos', 'Where', [['rail', 'At the foot of the server rail'], ['side', 'Under the sidebar']]), ...(prefs.panelPos === 'rail' && prefs.rail !== 'off' ? [] : [size('panelH'), updown('sideOrder', SIDE_PARTS)]), size('icPanel'),
      flag('plates', 'Nameplates', 'Pictures behind names here, in member lists and DMs.'), ...buttonRows(prefs.panelPos === 'rail' && prefs.rail !== 'off' ? 'railPanel' : 'panel'));
    if (id === 'main') out.push(sideways('cols', COLS), pickRow('frame', 'Panels', [['panels', 'Rounded, with room between them'], ['flat', 'Flat, side by side']]), size('panelR'), size('panelGap'),
      pickRow('msgWidth', 'Reading width', [['full', 'Use the full width'], ['readable', 'Readable column']], 'Long lines can stop at a comfortable width.'));
    if (id === 'top') out.push(flag('topbar', 'Show the top bar', 'The channel name and its buttons.'), size('topH'), size('icTop'), size('topGap'),
      pickRow('btnLabels', 'Labels', [['off', 'Icons only'], ['on', 'Icons and words']]), updown('mainOrder', MAIN_PARTS), ...buttonRows('top'));
    if (id === 'content') out.push(flag('avatars', 'Avatars', 'Pictures beside messages.'), size('avatarPx'), size('reactH'), pickRow('avatarShape', 'Avatar shape', [['round', 'Circle'], ['squircle', 'Squircle'], ['square', 'Rounded square']]),
      size('fontSize', 'Everything in the app scales with it.'), pickRow('density', 'Spacing', [['cozy', 'Cozy'], ['compact', 'Compact']]),
      pickRow('timestamps', 'Timestamps', [['12', '1:30 PM'], ['24', '13:30'], ['rel', '5m ago'], ['off', 'Hidden']]), flag('group', 'Group messages', 'One heading for several messages in a row.'),
      pickRow('dividers', 'Date dividers', onoff), pickRow('hover', 'Highlight on hover', onoff), pickRow('nameHover', 'Names on hover', [['off', 'No line'], ['underline', 'A line under them']]), pickRow('startHeaders', 'Conversation start', onoff, '“Welcome to #channel”.'),
      pickRow('msgWidth', 'Reading width', [['full', 'Use the full width'], ['readable', 'Readable column']]), updown('mainOrder', MAIN_PARTS), ...buttonRows('msgActions'));
    if (id === 'composer') out.push(size('composerH'), size('icComposer'), updown('mainOrder', MAIN_PARTS), ...buttonRows('composer'));
    if (id === 'members') out.push(flag('membersDefault', 'Open by default', 'You can always open it from the top bar.', (on) => { showMembers = on; }), size('membersW', 'The DM profile panel uses it too.'),
      sideways('cols', COLS), size('memberAv'), flag('memberOffline', 'Include offline', ''), flag('memberStatusText', 'Second line', 'Each person’s about text.'),
      pickRow('memberGroups', 'Group by role', onoff), flag('plates', 'Nameplates', ''), flag('dmPanel', 'Profile beside DMs', 'Shown in this column in DMs.'),
      pickRow('membersStyle', 'Look', [['panel', 'Under the top bar, beside the chat'], ['card', 'A card in the chat'], ['column', 'A column of its own']], 'Beside the chat, the top bar and its search run across it.'));
    insp.replaceChildren(el('div', { className: 'insp-head' }, el('h3', {}, PARTS[id] || 'Layout'), el('span', { className: 'muted' }, 'Selected')), ...out);
  }
  function buttonRows(group) {
    const [title, items] = BUTTONS[group], order = ordered(group), list = el('div', { className: 'sx-list btn-list' });
    order.forEach((bid, i) => {
      const [, label, ic, fixed] = items.find((b) => b[0] === bid);
      const go = (d) => { const o = ordered(group), j = i + d; if (j < 0 || j >= o.length) return; remember(); [o[i], o[j]] = [o[j], o[i]]; prefs.order = { ...(prefs.order || {}), [group]: o }; commit(); };
      list.append(el('div', { className: 'it' }, icon(ic, 17), el('span', { className: 'nm3' }, label), iconBtn('up', 'Move earlier', () => go(-1)), iconBtn('down', 'Move later', () => go(1)),
        fixed ? el('span', { className: 'chip', title: 'Always shown' }, icon('lock', 12), 'Always')
          : sw(shown(bid), (on) => { remember(); prefs.hidden = { ...(prefs.hidden || {}), [bid]: !on }; commit(); })));
    });
    return [el('h4', { className: 'sub-h' }, title + ' buttons'), list];
  }

  // redraw when there's room for a different size (first showing, or the window resizing)
  new ResizeObserver(() => { if (wrap.clientWidth && wrap.clientWidth !== lastW) { lastW = wrap.clientWidth; drawMini(); } }).observe(wrap);
  draw();
  return el('div', { className: 'studio' }, tools, hint, wrap, tray, insp);
}

// ===================== Customize: a site of its own (customize.html) =====================
// Fluentdat's look and every part of it, in one place: Theme, Layout (the mini screen), Elements (every part: shown or
// hidden, where it goes and what it's called), Messages, Profiles, Animations, and Sync (your account). Changes show in
// this browser's Fluentdat at once (the chat, open in another tab, follows them), and on your other devices when you're
// signed in.
const CZ = [['theme', 'Theme', 'palette'], ['layout', 'Layout', 'layout'], ['elements', 'Elements', 'apps'], ['messages', 'Messages', 'message'],
  ['profiles', 'Profiles', 'user'], ['animations', 'Animations', 'sparkle'], ['sync', 'Sync', 'cloud']];
let czAt = (location.hash.match(/^#([a-z]+)/) || [])[1] || 'theme';
const openCustomize = (section = '') => { if (!window.open('customize.html' + (section ? '#' + section : ''), 'fluentdat-customize')) toast('Your browser kept the new tab from opening: allow pop-ups, or open customize.html.'); };
// (Settings → Customize: where it went)
function customizeEntry() {
  return [el('h2', {}, 'Customize'), el('p', { className: 'sub' }, 'Your theme, your layout and every part of Fluentdat have a site of their own now. What you change there shows here at once, and when you’re signed in it follows your account to every device you use.'),
    el('a', { className: 'btn primary cz-open', href: 'customize.html', target: 'fluentdat-customize' }, icon('palette', 18), 'Open Customize'),
    el('div', { className: 'cz-sync-slot cz-entry-sync' }, syncLine())];
}
// how your settings and your account are getting on
function syncLine() {
  const live = Store.kind === 'supabase', acc = Store.account(), who = acc && acc.login ? '@' + acc.login : 'your account';
  const say = (cls, text) => el('span', { className: 'cz-sync ' + cls }, icon('cloud', 15), el('span', {}, text));
  if (!live) return say('off', 'Kept in this browser. Sign in to Fluentdat to have them on every device.');
  if (!Store.canSync()) return say('off', 'They follow your account once supabase/setup.sql is run again.');
  if (prefs.syncSettings === false) return say('off', 'Kept in this browser only (Sync is off).');
  if (syncNote.state === 'saving') return say('busy', `Saving to ${who}…`);
  if (syncNote.state === 'error') return say('bad', 'Couldn’t save to your account: ' + syncNote.err);
  return say('good', `Following ${who}` + (syncNote.at ? ` · saved ${when(syncNote.at, true)}` : ''));
}
function czSync() { for (const n of document.querySelectorAll('.cz-sync-slot')) n.replaceChildren(syncLine()); }
function renderCustomize() {
  if (!CUSTOMIZE) return;
  let root = $('#customize');
  if (!root) { root = el('div', { id: 'customize', className: 'cz' }); document.body.append(root); }
  if (!CZ.some(([id]) => id === czAt)) czAt = 'theme';
  const was = root.querySelector('.cz-body'), keep = was ? was.scrollTop : 0;
  const nav = el('nav', { className: 'cz-nav' }, ...CZ.map(([id, label, ic]) => el('button', { className: czAt === id ? 'on' : '', onclick: () => {
    czAt = id; history.replaceState(null, '', '#' + id); renderCustomize(); const b = $('.cz-body'); if (b) b.scrollTop = 0; } }, icon(ic, 18), el('span', {}, label))));
  const body = el('main', { className: 'cz-body' }, el('div', { className: 'cz-page' }, ...czPane(czAt, () => renderCustomize())));
  root.replaceChildren(el('header', { className: 'cz-head' }, el('span', { className: 'cz-logo' }, logoEl(appLogo(), { size: 34 })),
    el('div', { className: 'cz-title' }, el('h1', {}, 'Customize'), el('div', { className: 'cz-sync-slot' }, syncLine())),
    el('a', { className: 'btn primary cz-back', href: './', target: 'fluentdat' }, icon('logo', 16), 'Open Fluentdat')), el('div', { className: 'cz-main' }, nav, body));
  body.scrollTop = keep;
}
// each page of Customize
function czPane(id, redraw) {
  const set = (key, v) => { prefs[key] = v; savePrefs(); renderAll(); redraw(); };
  const pick = (key, options) => sel(prefs[key], options, (v) => set(key, v));
  const flag = (key, label, desc) => row2(label, desc, sw(prefs[key] === true || prefs[key] === 'on', (on) => set(key, typeof DEFAULT_PREFS[key] === 'boolean' ? on : on ? 'on' : 'off')));
  const size = (key, desc = '') => {
    const [label, lo, hi] = SIZES[key], val = el('span', { className: 'val' }, prefs[key] + 'px'), r = el('input', { type: 'range', min: lo, max: hi, step: 1, value: prefs[key] });
    r.oninput = () => { prefs[key] = +r.value; val.textContent = r.value + 'px'; applyPrefs(); };
    r.onchange = () => { savePrefs(); renderAll(); };
    return row2(label, desc, el('div', { className: 'slide' }, r, val));
  };
  const head = (title, sub) => [el('h2', {}, title), el('p', { className: 'sub' }, sub)];
  const reset = (label, keys, done) => el('button', { className: 'btn', onclick: async () => {
    if (!(await confirmBox({ title: label, text: 'Put these back the way Fluentdat comes?', ok: 'Reset', danger: true }))) return;
    for (const k of keys) prefs[k] = JSON.parse(JSON.stringify(DEFAULT_PREFS[k])); savePrefs(); renderAll(); redraw(); toast(done);
  } }, label);
  if (id === 'theme') {
    const cur = currentTheme();
    const tile = (tid, label, vars) => el('button', { className: 'cz-theme' + (cur === tid ? ' on' : ''), onclick: () => { applyTheme(tid); renderAll(); redraw(); } },
      el('span', { className: 'cz-swatch' }, ...['rail', 'side', 'main', 'accent'].map((v) => el('i', { style: `background:${vars ? vars[v] || 'transparent' : `var(--${v})`}` }))), el('b', {}, label));
    const builtin = BUILTIN.map(([tid, label]) => tile(tid, label, BUILTIN_SWATCH[tid]));
    return [...head('Theme', 'Colours for everything, and the logo. Make your own theme from scratch, or start from one of these.'),
      el('div', { className: 'cz-themes' }, ...builtin, ...loadThemes().map((t) => tile(t.id, t.name, t.vars))),
      el('div', { className: 'row', style: 'justify-content:flex-start;gap:8px' }, el('button', { className: 'btn primary', onclick: () => editTheme(null) }, icon('plus', 16), 'Make a Theme'),
        el('button', { className: 'btn', onclick: () => openThemes() }, 'Manage Themes…')),
      el('h3', {}, 'Shape'),
      row2('Panels', 'Rounded panels with a little room between them (as Fluentdat comes), or flat ones side by side (as Discord’s).', pick('frame', [['panels', 'Rounded panels'], ['flat', 'Flat']])),
      size('panelR'), size('panelGap'),
      row2('Corners', 'How rounded buttons, channels and messages are.', pick('radius', [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']])),
      row2('Interface font', 'The font used everywhere in the app.', pick('uiFont', [['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Monospaced']])),
      el('h3', {}, 'App Icon'), el('p', { className: 'hint' }, 'Fluentdat’s logo on the Home button, in the title bar and on the browser tab. Match Theme uses the one your theme brings.'),
      logoGrid(prefs.logo || 'theme', (lid) => { prefs.logo = lid; savePrefs(); renderAll(); redraw(); }, { withTheme: true })];
  }
  if (id === 'layout') return [...head('Layout', 'A small copy of Fluentdat’s screen. Drag any edge to resize it, drag parts and buttons to move them, drop a button in the tray to hide it, and click anything to see all of its settings.'),
    layoutStudio(redraw),
    el('h3', {}, 'The frame'),
    flag('titlebar', 'Title bar', 'Across the top of the window: the server you’re in (or Direct Messages).'), size('titleH'),
    row2('Title', 'Where the name sits in the title bar.', pick('titleAlign', [['center', 'In the middle'], ['left', 'On the left']])),
    row2('Your controls', 'Your picture, mute, deafen and the settings cog.', pick('panelPos', [['rail', 'At the foot of the server rail'], ['side', 'Under the sidebar']])),
    row2('Server banner', 'A server’s picture, at the top of its channels.', pick('bannerStyle', [['under', 'Under the server’s name'], ['behind', 'Behind the server’s name']])),
    row2('Category names', '“Example Group” above its channels.', pick('catStyle', [['dim', 'Bright when open, dimmed when closed'], ['line', 'With a line under them, and an arrow'], ['caps', 'SMALL CAPITALS, with an arrow']])),
    row2('Member list and DM profile', 'Beside the chat.', pick('membersStyle', [['panel', 'Under the top bar, beside the chat'], ['card', 'A card in the chat'], ['column', 'A column of its own']])),
    el('h3', {}, 'Shortcuts'), el('p', { className: 'sub' }, 'Click a key to change it, then press the keys you want. Backspace leaves it with none, and Esc keeps it. User Settings → Keyboard Shortcuts has them too.'),
    el('div', { className: 'kb-list' }, ...keyRows(redraw)),
    el('h3', {}, 'Start over'), row2('Reset layout', 'Every size, position, part and button on this page, the way Fluentdat comes.', el('button', { className: 'btn danger', onclick: async () => {
      if (!(await confirmBox({ title: 'Reset Layout', text: 'Put every layout option, size, position and button back the way Fluentdat comes?', ok: 'Reset', danger: true }))) return;
      prefs = { ...prefs, ...DEFAULT_PREFS, ...keepOf() }; savePrefs(); showMembers = true; renderAll(); redraw(); toast('Layout reset.');
    } }, 'Reset'))];
  if (id === 'elements') return [...head('Elements', 'Every part of Fluentdat: show it or hide it, put it where you want it, and call it what you like. (The settings cog always stays, so you can always get back here.)'),
    row2('Button labels', 'Words beside the top bar’s buttons.', pick('btnLabels', [['off', 'Icons only'], ['on', 'Icons and words']])),
    ...elementGroups(redraw),
    el('div', { className: 'row', style: 'justify-content:flex-start' }, el('button', { className: 'btn', onclick: () => { prefs.hidden = { ...DEFAULT_PREFS.hidden }; prefs.order = {}; prefs.labels = {}; savePrefs(); renderAll(); redraw(); toast('Every part is back the way Fluentdat comes.'); } }, 'Reset Elements'))];
  if (id === 'messages') return [...head('Messages', 'How the chat looks.'),
    row2('Spacing', 'Cozy gives each message room. Compact fits more on screen.', pick('density', [['cozy', 'Cozy'], ['compact', 'Compact']])),
    size('fontSize', 'Everything in the app scales with it.'),
    flag('avatars', 'Avatars', 'Pictures beside messages.'), size('avatarPx'), size('reactH'), row2('Avatar shape', '', pick('avatarShape', [['round', 'Circle'], ['squircle', 'Squircle'], ['square', 'Rounded square']])),
    row2('Timestamps', '', pick('timestamps', [['12', '1:30 PM'], ['24', '13:30'], ['rel', '5m ago'], ['off', 'Hidden']])),
    flag('group', 'Group messages', 'One heading for several messages in a row from the same person.'),
    row2('Date dividers', 'A line with the date between days.', pick('dividers', [['on', 'Shown'], ['off', 'Hidden']])),
    row2('Highlight on hover', '', pick('hover', [['on', 'Shown'], ['off', 'Hidden']])),
    row2('Names on hover', 'A line under someone’s name in the chat while the mouse is on it.', pick('nameHover', [['off', 'No line'], ['underline', 'A line under them']])),
    row2('Conversation start', '“Welcome to #channel”, and a DM’s big picture and name.', pick('startHeaders', [['on', 'Shown'], ['off', 'Hidden']])),
    row2('Reading width', 'Long lines can stop at a comfortable width.', pick('msgWidth', [['full', 'Use the full width'], ['readable', 'Readable column']])),
    row2('Link previews', 'Cards for Fluentdat invites, GitHub repositories and YouTube videos.', sw(prefs.embeds !== 'off', (on) => set('embeds', on ? 'on' : 'off'))),
    row2('Formatting bar', 'Bold, italics, code and more when you select some of what you wrote.', sw(prefs.formatBar !== 'off', (on) => set('formatBar', on ? 'on' : 'off'))),
    row2('“Live, signed in as @you”', 'The bar across the top when all is well. Off, it only shows when something needs you.', sw(prefs.liveBanner === 'on', (on) => set('liveBanner', on ? 'on' : 'off'))),
    el('h3', {}, 'The buttons over a message'), ...elementGroups(redraw, ['msgActions'])];
  if (id === 'profiles') return [...head('Profiles', 'Profile cards, and what you see of other people’s looks.'),
    row2('Avatar decorations', 'Frames and things around people’s avatars, from the Shop.', sw(prefs.decorations !== 'off', (on) => set('decorations', on ? 'on' : 'off'))),
    row2('Profile effects and frames', 'Snow, sparkles, frames and more on profile cards.', sw(prefs.effects !== 'off', (on) => set('effects', on ? 'on' : 'off'))),
    flag('plates', 'Nameplates', 'Pictures behind names in member lists and DMs.'),
    row2('Profile cards’ buttons and text', 'In the colours of the profile you’re looking at (its theme, or its colour), or in your own theme’s.', pick('cardTheme', [['theirs', 'The profile’s colours'], ['mine', 'Your theme']])),
    row2('Moving nameplates', 'Nameplates from the Shop drift, glow and shimmer behind names.', pick('plateMove', [['always', 'All the time'], ['hover', 'When you point at them']])),
    row2('Connection icons', 'How the accounts people added look on their profiles.', pick('connLook', [['png', 'The services’ own logos'], ['theme', 'Tiles in your theme’s colours'], ['white', 'White tiles']])),
    flag('dmPanel', 'Profile beside DMs', 'Their card, beside your conversation with them.'),
    flag('memberOffline', 'Offline people in member lists', ''), flag('memberStatusText', 'A second line in member lists', 'Each person’s about text.'),
    row2('Group members by role', 'People with a role shown separately get their own heading.', pick('memberGroups', [['on', 'Grouped'], ['off', 'One list']])),
    el('h3', {}, 'Profile cards'), ...elementGroups(redraw, ['profileCard', 'profileTabs'])];
  if (id === 'animations') return animationsPane(redraw);
  // Sync
  const live = Store.kind === 'supabase';
  return [...head('Sync', 'Your theme, your themes and every setting here can follow your account, so each device you sign in on looks the same. Whichever device changed last wins.'),
    el('div', { className: 'cz-sync-slot' }, syncLine()),
    row2('Follow my account', 'Off, this browser keeps its own and leaves your account’s alone.', sw(prefs.syncSettings !== false, (on) => { prefs.syncSettings = on; savePrefs(); if (on) { lsPut(SYNC_SEEN, 0); adoptSettings(); } redraw(); czSync(); })),
    live && Store.canSync() ? el('div', { className: 'row', style: 'justify-content:flex-start;gap:8px' },
      el('button', { className: 'btn', onclick: async () => { lsPut(SYNC_AT, Date.now()); await pushSettings(); toast('This browser’s settings are your account’s now.'); } }, icon('up', 16), 'Use This Browser’s Everywhere'),
      el('button', { className: 'btn', onclick: () => { lsPut(SYNC_SEEN, 0); lsPut(SYNC_AT, 0); adoptSettings(); } }, icon('down', 16), 'Take My Account’s')) : null,
    el('p', { className: 'hint' }, 'A few things stay with each device: mute and deafen, desktop notifications, and this switch.'),
    live ? null : el('a', { className: 'btn primary', href: './', target: 'fluentdat' }, 'Sign In on Fluentdat')].filter(Boolean);
}
// Customize → Elements: every part, group by group (the ones given), each with its switch, its place and its name
const RENAMABLE = new Set(['serverTop', 'dmNav', 'msgActions', 'profileTabs', 'dms']);
function elementGroups(redraw, groups = Object.keys(BUTTONS)) {
  const out = [];
  for (const group of groups) {
    const [title, items] = BUTTONS[group], order = ordered(group), list = el('div', { className: 'sx-list btn-list cz-els' });
    order.forEach((id, i) => {
      const [, label, ic, fixed] = items.find((b) => b[0] === id);
      const move = (d) => { const o = ordered(group), j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; prefs.order = { ...(prefs.order || {}), [group]: o }; savePrefs(); renderAll(); redraw(); };
      let name = el('span', { className: 'nm3' }, label);
      if (RENAMABLE.has(group)) {
        name = el('input', { type: 'text', className: 'cz-rename', maxLength: 32, value: (prefs.labels || {})[id] || '', placeholder: label, title: 'Call it something else (empty: its own name)' });
        name.onchange = () => { const v = name.value.trim(); const l = { ...(prefs.labels || {}) }; if (v && v !== label) l[id] = v; else delete l[id]; prefs.labels = l; savePrefs(); renderAll(); };
      }
      const toggle = fixed ? el('span', { className: 'chip', title: id === 'settings' ? 'Always shown, so you can always reach settings' : 'Always shown' }, icon('lock', 12), 'Always')
        : sw(shown(id), (on) => { prefs.hidden = { ...(prefs.hidden || {}), [id]: !on }; savePrefs(); renderAll(); });
      list.append(el('div', { className: 'it' + (shown(id) || fixed ? '' : ' off') }, icon(ic, 17), name, iconBtn('up', 'Move earlier', () => move(-1)), iconBtn('down', 'Move later', () => move(1)), toggle));
    });
    out.push(el('h4', { className: 'sub-h' }, title), list);
  }
  return out;
}
if (CUSTOMIZE) renderCustomize();
