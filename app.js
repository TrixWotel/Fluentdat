// Fluentdat — a Discord-style chat that runs entirely in the browser (data in store.js). The UI chrome uses inline SVG
// icons (not the OS emoji), so logos look the same on every device. You get servers/channels/messages, a profile you
// can customise (avatar, pronouns, about), slash commands and a little bot (Flubot), stickers you can make yourself, and
// a local camera/mic preview for calls. Swapping store.js for a GitHub-backed one (sign in, save to Fluentdat-Data) is
// what makes it multi-person — the UI here won't need to change.
import { Store } from './store.js';

const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};

// ---------- icons (inline SVG, same on every device) ----------
const ICON = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
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
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  bot: '<rect x="4" y="9" width="16" height="11" rx="2.5"/><path d="M12 9V6"/><circle cx="12" cy="4.5" r="1.5"/><circle cx="9" cy="14" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.1" fill="currentColor" stroke="none"/><path d="M9.5 17.5h5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
};
const svgHTML = (name, size) => `<svg class="ic" viewBox="0 0 24 24"${size ? ` width="${size}" height="${size}"` : ''}>${ICON[name] || ''}</svg>`;
const icon = (name, size) => { const d = document.createElement('div'); d.innerHTML = svgHTML(name, size); return d.firstElementChild; };

// ---------- images (avatars and stickers are downscaled, kept as data URLs) ----------
const readImage = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });
function scaled(img, max) {
  const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}
function pickFile(cb) { const i = el('input', { type: 'file', accept: 'image/*' }); i.onchange = () => { if (i.files[0]) cb(i.files[0]); }; i.click(); }

// ---------- you ----------
const COLORS = ['#5b7fd6', '#4bbf73', '#e8743b', '#d6554b', '#b05bd6', '#d6b23b', '#3bc6d6', '#e86ba8'];
function loadMe() {
  try { const m = JSON.parse(localStorage.getItem('fluency.me')); if (m && m.name) return { avatar: '', pronouns: '', about: '', ...m }; } catch {}
  return { name: 'You', color: COLORS[Math.floor(Math.random() * COLORS.length)], avatar: '', pronouns: '', about: '' };
}
let me = loadMe();
const saveMe = () => { try { localStorage.setItem('fluency.me', JSON.stringify(me)); } catch {} };
const initials = (name) => String(name || '?').trim().slice(0, 2).toUpperCase();
const stamp = () => { const u = { name: me.name, color: me.color }; if (me.avatar) u.avatar = me.avatar; if (me.pronouns) u.pronouns = me.pronouns; if (me.about) u.about = me.about; return u; };

function avatarEl(user, extra = '') {
  const a = el('div', { className: 'avatar' + (extra ? ' ' + extra : ''), style: `background:${user.color || '#5b7fd6'}` });
  if (user.avatar) a.append(el('img', { src: user.avatar, alt: '' })); else a.textContent = user.bot ? '' : initials(user.name);
  if (user.bot && !user.avatar) { a.append(icon('bot', 20)); a.style.color = '#fff'; }
  return a;
}

// ---------- theme ----------
const THEMES = [['dark', 'Dark'], ['midnight', 'Midnight'], ['ember', 'Ember'], ['forest', 'Forest'], ['light', 'Light']];
const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('fluency.theme', t); } catch {} };
setTheme((() => { try { return localStorage.getItem('fluency.theme') || 'dark'; } catch { return 'dark'; } })());

// ---------- state ----------
let serverId = Store.servers()[0].id;
let channelId = Store.channels(serverId)[0].id;
$('#backend-name').textContent = Store.backend;

// ---------- render ----------
function renderRail() {
  $('#rail').replaceChildren(
    ...Store.servers().map((s) => {
      const b = el('button', { className: 'srv' + (s.id === serverId ? ' on' : ''), title: s.name,
        onclick: () => { serverId = s.id; channelId = Store.channels(serverId)[0].id; renderAll(); } });
      if (s.img) b.append(el('img', { src: s.img, alt: '' })); else if (ICON[s.icon]) b.append(icon(s.icon, 24)); else b.textContent = initials(s.name);
      return b;
    }),
    (() => { const b = el('button', { className: 'srv add', title: 'More servers come with the GitHub backend', onclick: () => toast('Your own servers come with the GitHub backend (next step).') }); b.append(icon('plus', 24)); return b; })(),
  );
}

function renderChannels() {
  const server = Store.servers().find((s) => s.id === serverId);
  $('#server-name').textContent = server.name;
  const list = $('#chan-list');
  const addBtn = el('button', { title: 'New channel', onclick: newChannel }); addBtn.append(icon('plus'));
  list.replaceChildren(el('div', { className: 'cat' }, el('span', {}, 'Channels'), addBtn));
  const chans = Store.channels(serverId);
  for (const c of chans) {
    const row = el('button', { className: 'chan' + (c.id === channelId ? ' on' : ''),
      onclick: () => { channelId = c.id; closeCall(); renderAll(); $('#app').classList.remove('show-side'); } },
      icon(c.kind === 'voice' ? 'volume' : 'hash', 18), el('span', { className: 'nm' }, c.name));
    if (chans.length > 1) {
      const x = el('span', { className: 'x', title: 'Delete channel', onclick: (e) => { e.stopPropagation(); if (confirm(`Delete #${c.name}?`)) { Store.removeChannel(c.id); if (channelId === c.id) channelId = Store.channels(serverId)[0].id; renderAll(); } } });
      x.append(icon('x')); row.append(x);
    }
    list.append(row);
  }
}

function renderMe() {
  const gear = el('button', { className: 'gear', title: 'Settings', onclick: openSettings }); gear.append(icon('gear'));
  $('#me-panel').replaceChildren(
    avatarEl(me),
    el('div', { className: 'who' }, el('div', { className: 'nm' }, me.name), el('div', { className: 'st' }, me.pronouns || me.about || 'Set up your profile')),
    gear);
}

const fmt = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(.+?)\*(?=\W|$)/g, '$1<i>$2</i>')
  .replace(/`(.+?)`/g, '<code>$1</code>');
const when = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function renderMessages() {
  const c = Store.channel(channelId);
  $('#top-hash').replaceChildren(icon(c.kind === 'voice' ? 'volume' : 'hash'));
  $('#top-name').textContent = c.name;
  $('#input').placeholder = `Message ${c.kind === 'voice' ? '' : '#'}${c.name}   ·   /help for commands`;
  const box = $('#msgs'), msgs = Store.messages(channelId);
  box.replaceChildren();
  let last = null, lastDay = null;
  for (const m of msgs) {
    if (!lastDay || !sameDay(lastDay, m.ts)) { box.append(el('div', { className: 'day' }, new Date(m.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))); lastDay = m.ts; last = null; }
    const cont = last && last.user.name === m.user.name && !last.user.bot === !m.user.bot && (m.ts - last.ts) < 5 * 60000;
    const body = el('div', { className: 'body' });
    if (!cont) {
      const nm = el('span', { className: 'nm', style: `--who:${m.user.color || 'var(--bright)'}`, onclick: (e) => showProfile(m.user, e.currentTarget) }, m.user.name);
      const meta = el('div', { className: 'meta' }, nm);
      if (m.user.bot) meta.append(el('span', { className: 'tag' }, 'bot'));
      meta.append(el('span', { className: 'when' }, when(m.ts)));
      body.append(meta);
    }
    if (m.sticker) {
      const st = typeof m.sticker === 'string' ? { kind: 'emoji', data: m.sticker } : m.sticker;
      body.append(st.kind === 'img' ? el('div', { className: 'sticker' }, el('img', { src: st.data, alt: 'sticker' })) : el('div', { className: 'sticker' }, st.data));
    }
    if (m.text != null) { const t = el('div', { className: 'text' + (m.action ? ' action' : '') }); t.innerHTML = fmt(m.action ? `${m.user.name} ${m.text}` : m.text); body.append(t); }
    const av = avatarEl(m.user); av.onclick = (e) => showProfile(m.user, e.currentTarget);
    box.append(el('div', { className: 'msg' + (cont ? ' cont' : '') }, av, body));
    last = m;
  }
  box.scrollTop = box.scrollHeight;
}

function renderAll() { renderRail(); renderChannels(); renderMe(); renderMessages(); }

// ---------- profile card ----------
let pop = null;
function closePop() { if (pop) { pop.remove(); pop = null; } }
function showProfile(user, anchor) {
  closePop();
  pop = el('div', { className: 'pop' },
    el('div', { className: 'banner-c', style: `background:${user.color || '#5b7fd6'}` }),
    el('div', { className: 'inner' },
      avatarEl(user),
      el('div', { className: 'pn' }, user.name, user.bot ? el('span', { className: 'tag', style: 'margin-left:6px' }, 'bot') : null),
      user.pronouns ? el('div', { className: 'pr' }, user.pronouns) : null,
      user.about ? el('div', { className: 'ab' }, user.about) : null));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), w = 260, h = pop.offsetHeight;
  pop.style.left = Math.min(r.left, innerWidth - w - 12) + 'px';
  pop.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(12, r.top - h - 8) : r.bottom + 8) + 'px';
}

// ---------- sending, slash commands, the bot ----------
const postMine = (extra) => Store.send(channelId, { user: stamp(), ...extra });
function send() {
  const inp = $('#input'), raw = inp.value.trim();
  if (!raw) return;
  inp.value = ''; inp.style.height = 'auto';
  if (raw.startsWith('/')) { runCommand(raw.slice(1)); return; }
  postMine({ text: raw });
  botReplies(raw);
}
const botSay = (text) => Store.send(channelId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text });
function runCommand(line) {
  const [cmd, ...rest] = line.split(' '); const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case 'help': return botSay('Commands: `/me <action>`, `/shrug`, `/roll [n]`, `/flip`, `/nick <name>`, `/theme <name>`, `/clear`. Try `!ping` too.');
    case 'me': return arg ? postMine({ text: arg, action: true }) : null;
    case 'shrug': return postMine({ text: (arg ? arg + ' ' : '') + '¯\\\\\\_(ツ)\\_/¯' });
    case 'roll': { const n = Math.max(2, parseInt(arg, 10) || 6); return botSay(`🎲 **${me.name}** rolled a **${1 + Math.floor(Math.random() * n)}** (1–${n}).`); }
    case 'flip': return botSay(`🪙 **${me.name}** got **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**.`);
    case 'nick': if (arg) { me.name = arg.slice(0, 24); saveMe(); renderMe(); botSay(`You're now **${me.name}**.`); } return;
    case 'theme': { const t = THEMES.find((x) => x[0] === arg.toLowerCase()); if (t) { setTheme(t[0]); botSay(`Theme set to **${t[1]}**.`); } else botSay('Themes: ' + THEMES.map((x) => '`' + x[0] + '`').join(', ')); return; }
    case 'clear': return Store.clear(channelId);
    default: return botSay(`I don't know \`/${cmd}\`. Try \`/help\`.`);
  }
}
function botReplies(text) {
  const t = text.toLowerCase();
  if (t === '!ping') return setTimeout(() => botSay('pong 🏓'), 250);
  if (t === '!help') return setTimeout(() => botSay('I auto-reply to `!ping`. Slash commands like `/roll` work too. Custom bots come with the backend.'), 250);
  if (/\b(hi|hello|hey)\b/.test(t) && Math.random() < 0.34) return setTimeout(() => botSay(`👋 Hey ${me.name}!`), 400);
}

// ---------- stickers & emoji ----------
const STICKERS = ['🤖', '🎉', '🔥', '👍', '😂', '❤️', '🚀', '💯', '🙏', '👀', '✅', '⚡'];
const EMOJI = '😀 😁 😂 🤣 😊 😍 😎 🤔 😴 😭 😤 🥳 🤝 👏 🙌 💪 🧠 👀 ✅ ❌ ⭐ 🔥 💡 ⚙️ 🔧 🔩 🛠️ 🤖 🚀 🎯 📸 🎮'.split(' ');
let picker = null;
function closePicker() { if (picker) { picker.remove(); picker = null; } }
function togglePicker() {
  if (picker) return closePicker();
  const custom = Store.stickers();
  const mk = el('button', { className: 'mk', onclick: createSticker }, icon('plus'), 'Create');
  picker = el('div', { className: 'picker' },
    el('div', { className: 'hdr' }, el('h4', {}, 'Your stickers'), mk),
    custom.length
      ? el('div', { className: 'set big' }, ...custom.map((s) => {
          const b = el('button', { title: s.name || 'sticker', oncontextmenu: (e) => { e.preventDefault(); if (confirm('Delete this sticker?')) { Store.removeSticker(s.id); closePicker(); setTimeout(togglePicker, 0); } }, onclick: () => { postMine({ sticker: { kind: s.kind, data: s.data } }); closePicker(); } });
          b.append(s.kind === 'img' ? el('img', { src: s.data, alt: s.name || '' }) : document.createTextNode(s.data));
          return b;
        }))
      : el('div', { className: 'empty' }, 'None yet — tap Create to make one (right-click one to delete).'),
    el('div', { className: 'hdr' }, el('h4', {}, 'Stickers')),
    el('div', { className: 'set big' }, ...STICKERS.map((s) => el('button', { onclick: () => { postMine({ sticker: { kind: 'emoji', data: s } }); closePicker(); } }, s))),
    el('div', { className: 'hdr' }, el('h4', {}, 'Emoji')),
    el('div', { className: 'set' }, ...EMOJI.map((e) => el('button', { onclick: () => { const i = $('#input'); i.value += e; i.focus(); } }, e))));
  document.body.append(picker);
}
function createSticker() {
  closePicker();
  const emoji = el('input', { placeholder: 'An emoji or short text, e.g. 🤖 or GG', maxLength: 12 });
  const name = el('input', { placeholder: 'Name (optional)', maxLength: 24 });
  let imgData = '';
  const preview = el('div', { className: 'avatar', style: 'width:72px;height:72px;border-radius:14px;background:var(--input);font-size:2rem' }, '🙂');
  const up = el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { imgData = scaled(await readImage(f), 160); preview.replaceChildren(el('img', { src: imgData, alt: '', style: 'width:100%;height:100%;object-fit:contain' })); emoji.value = ''; } catch { toast('Couldn’t read that image.'); } }) }, 'Upload image…');
  const scrim = el('div', { className: 'scrim' },
    el('div', { className: 'dialog' },
      el('h3', {}, 'Create a sticker'),
      el('div', { className: 'avatar-edit' }, preview, el('div', {}, up, el('div', { style: 'color:var(--muted);font-size:.8rem;margin-top:8px' }, 'or type an emoji / short text below'))),
      el('div', { className: 'field', style: 'margin-top:16px' }, el('label', {}, 'Emoji or text'), emoji),
      el('div', { className: 'field' }, el('label', {}, 'Name'), name),
      el('div', { className: 'row' },
        el('button', { className: 'btn', textContent: 'Cancel', onclick: () => scrim.remove() }),
        el('button', { className: 'btn primary', textContent: 'Save sticker', onclick: () => {
          if (imgData) Store.addSticker({ kind: 'img', data: imgData, name: name.value.trim() });
          else if (emoji.value.trim()) Store.addSticker({ kind: 'emoji', data: emoji.value.trim(), name: name.value.trim() });
          else return toast('Add an image or some text first.');
          scrim.remove(); setTimeout(togglePicker, 0);   // (defer so this click finishes before the picker reopens)
        } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim);
}

// ---------- calls: your own camera & mic ----------
let stream = null, micOn = true, camOn = true;
async function startCall(video) {
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video }); }
  catch { toast('Couldn’t reach your camera or mic. Check the browser’s permission for this site.'); return; }
  camOn = video; micOn = true;
  $('#call').classList.add('on');
  const v = el('video', { autoplay: true, muted: true, playsInline: true }); v.srcObject = stream;
  $('#call-videos').replaceChildren(el('div', { className: 'tile' }, v, el('span', {}, me.name + ' (you)')));
  $('#c-cam').hidden = !video;
  syncCallButtons();
}
function syncCallButtons() {
  $('#c-mic').replaceChildren(icon(micOn ? 'mic' : 'micOff')); $('#c-mic').classList.toggle('off', !micOn);
  $('#c-cam').replaceChildren(icon(camOn ? 'cam' : 'camOff')); $('#c-cam').classList.toggle('off', !camOn);
  $('#c-leave').replaceChildren(icon('hangup'));
}
function closeCall() {
  if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  $('#call').classList.remove('on'); $('#call-videos').replaceChildren();
}

// ---------- settings / profile editor ----------
function openSettings() {
  const name = el('input', { value: me.name, maxLength: 24 });
  const pronouns = el('input', { value: me.pronouns || '', maxLength: 24, placeholder: 'e.g. she/her, they/them' });
  const about = el('textarea', { value: me.about || '', maxLength: 300, placeholder: 'A little about you' });
  let color = me.color, avatar = me.avatar || '', theme = document.documentElement.dataset.theme;
  const preview = avatarEl({ name: me.name, color, avatar }, '');
  const setAvatar = (data) => { avatar = data; preview.style.background = color; preview.replaceChildren(data ? el('img', { src: data, alt: '' }) : document.createTextNode(initials(name.value))); };
  const upload = el('button', { className: 'btn', onclick: () => pickFile(async (f) => { try { setAvatar(scaled(await readImage(f), 128)); } catch { toast('Couldn’t read that image.'); } }) }, 'Upload…');
  const clearImg = el('button', { className: 'btn ghost', onclick: () => setAvatar('') }, 'Use colour');
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => {
    const b = el('button', { className: c === color ? 'on' : '', style: `background:${c}` });
    b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); if (!avatar) setAvatar(''); preview.style.background = c; };
    return b;
  }));
  name.oninput = () => { if (!avatar) preview.textContent = initials(name.value); };
  const themes = el('div', { className: 'themes' }, ...THEMES.map(([id, label]) => {
    const b = el('button', { className: id === theme ? 'on' : '', textContent: label });
    b.onclick = () => { theme = id; setTheme(id); [...themes.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); };
    return b;
  }));
  const scrim = el('div', { className: 'scrim' },
    el('div', { className: 'dialog' },
      el('h3', {}, 'Your profile & theme'),
      el('div', { className: 'field' }, el('label', {}, 'Avatar'), el('div', { className: 'avatar-edit' }, preview, el('div', {}, upload, ' ', clearImg, el('div', { style: 'margin-top:10px' }, swatches)))),
      el('div', { className: 'field' }, el('label', {}, 'Display name'), name),
      el('div', { className: 'field' }, el('label', {}, 'Pronouns'), pronouns),
      el('div', { className: 'field' }, el('label', {}, 'About me'), about),
      el('div', { className: 'field' }, el('label', {}, 'Theme'), themes),
      el('div', { className: 'row' },
        el('button', { className: 'btn', textContent: 'Close', onclick: () => { setTheme(me ? document.documentElement.dataset.theme : 'dark'); scrim.remove(); } }),
        el('button', { className: 'btn primary', textContent: 'Save', onclick: () => {
          me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color, avatar, pronouns: pronouns.value.trim(), about: about.value.trim() };
          saveMe(); renderAll(); scrim.remove();
        } }))));
  scrim.onclick = (e) => { if (e.target === scrim) scrim.remove(); };
  document.body.append(scrim); name.focus(); name.select();
}

function newChannel() { const n = prompt('New channel name'); if (!n) return; channelId = Store.addChannel(serverId, n); renderAll(); }

let toastT = 0;
function toast(text) {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast' }); Object.assign(t.style, { position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)', background: 'var(--rail)', color: 'var(--text)', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 10px 30px #0007', zIndex: 40, maxWidth: '90%', textAlign: 'center' }); document.body.append(t); }
  t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

// ---------- icons into the static buttons, and wiring ----------
$('#menu').append(icon('menu')); $('#call-voice').append(icon('phone')); $('#call-video').append(icon('video'));
$('#sticker-btn').append(icon('smile')); $('#send-btn').append(icon('send'));

const input = $('#input');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(window.innerHeight * 0.4, input.scrollHeight) + 'px'; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('#send-btn').onclick = () => { send(); input.focus(); };
$('#sticker-btn').onclick = (e) => { e.stopPropagation(); togglePicker(); };
document.addEventListener('click', (e) => {
  if (picker && !picker.contains(e.target) && !$('#sticker-btn').contains(e.target)) closePicker();
  if (pop && !pop.contains(e.target) && !e.target.closest('.msg .nm, .msg .avatar')) closePop();
});
$('#call-voice').onclick = () => startCall(false);
$('#call-video').onclick = () => startCall(true);
$('#c-mic').onclick = () => { if (!stream) return; micOn = !micOn; stream.getAudioTracks().forEach((t) => { t.enabled = micOn; }); syncCallButtons(); };
$('#c-cam').onclick = () => { if (!stream) return; camOn = !camOn; stream.getVideoTracks().forEach((t) => { t.enabled = camOn; }); syncCallButtons(); };
$('#c-leave').onclick = closeCall;
$('#menu').onclick = () => $('#app').classList.toggle('show-side');
addEventListener('resize', () => closePop());

Store.onChange(() => { renderMessages(); if (picker) { closePicker(); } });
Store.init();
renderAll();
