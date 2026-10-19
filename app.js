// Fluentdat — a Discord-style chat that runs entirely in the browser (data lives in store.js). This file is the app:
// the servers/channels/messages UI, the composer with slash commands and a little bot (Flubot), a sticker and emoji
// picker, switchable CSS themes, your profile, and a local camera/mic preview for calls. Nothing here talks to a server;
// swapping store.js for a GitHub-backed one (a private repo, one message per commit) is what makes it multi-person.
import { Store } from './store.js';

const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};

// ---------- you ----------
const COLORS = ['#5b7fd6', '#4bbf73', '#e8743b', '#d6554b', '#b05bd6', '#d6b23b', '#3bc6d6', '#e86ba8'];
function loadMe() {
  try { const m = JSON.parse(localStorage.getItem('fluency.me')); if (m && m.name) return m; } catch {}
  return { name: 'You', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
}
let me = loadMe();
const saveMe = () => { try { localStorage.setItem('fluency.me', JSON.stringify(me)); } catch {} };
const initials = (name) => name.trim().slice(0, 2).toUpperCase();

// ---------- theme ----------
const THEMES = [['dark', 'Dark'], ['midnight', 'Midnight'], ['ember', 'Ember'], ['forest', 'Forest'], ['light', 'Light']];
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('fluency.theme', t); } catch {}
}
setTheme((() => { try { return localStorage.getItem('fluency.theme') || 'dark'; } catch { return 'dark'; } })());

// ---------- state ----------
let serverId = Store.servers()[0].id;
let channelId = Store.channels(serverId)[0].id;
$('#backend-name').textContent = Store.backend;

// ---------- render ----------
function renderRail() {
  const rail = $('#rail');
  rail.replaceChildren(
    ...Store.servers().map((s) => el('button', {
      className: 'srv' + (s.id === serverId ? ' on' : ''), title: s.name, textContent: s.icon,
      onclick: () => { serverId = s.id; channelId = Store.channels(serverId)[0].id; renderAll(); },
    })),
    el('button', { className: 'srv add', title: 'More servers come with the GitHub backend', textContent: '+',
      onclick: () => toast('Adding your own servers comes with the GitHub backend (next step).') }),
  );
}

function renderChannels() {
  const server = Store.servers().find((s) => s.id === serverId);
  $('#server-name').textContent = server.name;
  const list = $('#chan-list');
  list.replaceChildren(el('div', { className: 'cat' },
    el('span', {}, 'Channels'),
    el('button', { title: 'New channel', textContent: '+', onclick: newChannel })));
  for (const c of Store.channels(serverId)) {
    const row = el('button', { className: 'chan' + (c.id === channelId ? ' on' : ''),
      onclick: () => { channelId = c.id; closeCall(); renderAll(); $('#app').classList.remove('show-side'); } },
      el('span', {}, c.kind === 'voice' ? '🔊' : '#'), el('span', {}, c.name));
    if (Store.channels(serverId).length > 1) row.append(el('span', { className: 'x', title: 'Delete channel', textContent: '✕',
      onclick: (e) => { e.stopPropagation(); if (confirm(`Delete #${c.name}?`)) { Store.removeChannel(c.id); if (channelId === c.id) channelId = Store.channels(serverId)[0].id; renderAll(); } } }));
    list.append(row);
  }
}

function renderMe() {
  $('#me-panel').replaceChildren(
    el('div', { className: 'avatar', style: `background:${me.color}` }, initials(me.name)),
    el('div', { className: 'name' }, me.name),
    el('button', { className: 'gear', title: 'Settings', textContent: '⚙️', onclick: openSettings }),
  );
}

const fmt = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(.+?)\*(?=\W|$)/g, '$1<i>$2</i>')
  .replace(/`(.+?)`/g, '<code>$1</code>');
const when = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function renderMessages() {
  const c = Store.channel(channelId);
  $('#top-hash').textContent = c.kind === 'voice' ? '🔊' : '#';
  $('#top-name').textContent = c.name;
  $('#input').placeholder = `Message ${c.kind === 'voice' ? '' : '#'}${c.name}   ·   /help for commands`;
  const box = $('#msgs'), msgs = Store.messages(channelId);
  box.replaceChildren();
  let last = null, lastDay = null;
  for (const m of msgs) {
    if (!lastDay || !sameDay(lastDay, m.ts)) { box.append(el('div', { className: 'day' }, new Date(m.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))); lastDay = m.ts; last = null; }
    const cont = last && last.user.name === m.user.name && !last.user.bot === !m.user.bot && (m.ts - last.ts) < 5 * 60000;
    const body = el('div', { className: 'body' });
    if (!cont) body.append(el('div', { className: 'meta' },
      (() => { const w = el('span', { className: 'who' }, m.user.name); if (m.user.bot) w.append(el('span', { className: 'tag' }, 'bot')); return w; })(),
      el('span', { className: 'when' }, when(m.ts))));
    if (m.sticker) body.append(el('div', { className: 'sticker' }, m.sticker));
    if (m.text != null) { const t = el('div', { className: 'text' + (m.action ? ' action' : '') }); t.innerHTML = fmt(m.action ? `${m.user.name} ${m.text}` : m.text); body.append(t); }
    box.append(el('div', { className: 'msg' + (cont ? ' cont' : '') },
      el('div', { className: 'avatar', style: `background:${m.user.color}` }, initials(m.user.name)), body));
    last = m;
  }
  box.scrollTop = box.scrollHeight;
}

function renderAll() { renderRail(); renderChannels(); renderMe(); renderMessages(); }

// ---------- sending, slash commands, the bot ----------
function postMine(extra) { Store.send(channelId, { user: { ...me }, ...extra }); }

function send() {
  const inp = $('#input'), raw = inp.value.trim();
  if (!raw) return;
  inp.value = ''; inp.style.height = 'auto';
  if (raw.startsWith('/')) { runCommand(raw.slice(1)); return; }
  postMine({ text: raw });
  botReplies(raw);
}

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
const botSay = (text) => Store.send(channelId, { user: { name: 'Flubot', color: '#5b7fd6', bot: true }, text });
// a tiny taste of automation: Flubot answers a couple of things on its own
function botReplies(text) {
  const t = text.toLowerCase();
  if (t === '!ping') return setTimeout(() => botSay('pong 🏓'), 250);
  if (t === '!help') return setTimeout(() => botSay('I auto-reply to `!ping`. Slash commands like `/roll` work too. Real custom bots come with the backend.'), 250);
  if (/\b(hi|hello|hey)\b/.test(t) && Math.random() < 0.34) return setTimeout(() => botSay(`👋 Hey ${me.name}!`), 400);
}

// ---------- stickers & emoji ----------
const STICKERS = ['🤖', '🎉', '🔥', '👍', '😂', '❤️', '🚀', '💯', '🙏', '👀', '✅', '⚡'];
const EMOJI = '😀 😁 😂 🤣 😊 😍 😎 🤔 😴 😭 😤 🥳 🤝 👏 🙌 💪 🧠 👀 ✅ ❌ ⭐ 🔥 💡 ⚙️ 🔧 🔩 🛠️ 🤖 🚀 🎯 📸 🎮'.split(' ');
let picker = null;
function togglePicker() {
  if (picker) { picker.remove(); picker = null; return; }
  picker = el('div', { className: 'picker' },
    el('h4', {}, 'Stickers'),
    el('div', { className: 'set big' }, ...STICKERS.map((s) => el('button', { textContent: s, onclick: () => { postMine({ sticker: s }); togglePicker(); } }))),
    el('h4', {}, 'Emoji'),
    el('div', { className: 'set' }, ...EMOJI.map((e) => el('button', { textContent: e, onclick: () => { const i = $('#input'); i.value += e; i.focus(); } }))));
  document.body.append(picker);
}

// ---------- calls: your own camera & mic (real teammates come with the backend) ----------
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
  $('#c-mic').textContent = micOn ? '🎙️' : '🔇'; $('#c-mic').classList.toggle('off', !micOn);
  $('#c-cam').textContent = camOn ? '📷' : '🚫'; $('#c-cam').classList.toggle('off', !camOn);
}
function closeCall() {
  if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  $('#call').classList.remove('on'); $('#call-videos').replaceChildren();
}

// ---------- settings dialog ----------
function openSettings() {
  const name = el('input', { value: me.name, maxLength: 24 });
  let color = me.color, theme = document.documentElement.dataset.theme;
  const swatches = el('div', { className: 'swatches' }, ...COLORS.map((c) => {
    const b = el('button', { className: c === color ? 'on' : '', style: `background:${c}` });
    b.onclick = () => { color = c; [...swatches.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); };
    return b;
  }));
  const themes = el('div', { className: 'themes' }, ...THEMES.map(([id, label]) => {
    const b = el('button', { className: id === theme ? 'on' : '', textContent: label });
    b.onclick = () => { theme = id; setTheme(id); [...themes.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); };
    return b;
  }));
  const scrim = el('div', { className: 'scrim' },
    el('div', { className: 'dialog' },
      el('h3', {}, 'Your profile & theme'),
      el('div', { className: 'field' }, el('label', {}, 'Display name'), name),
      el('div', { className: 'field' }, el('label', {}, 'Avatar colour'), swatches),
      el('div', { className: 'field' }, el('label', {}, 'Theme'), themes),
      el('div', { className: 'row' },
        el('button', { className: 'btn', textContent: 'Close', onclick: () => scrim.remove() }),
        el('button', { className: 'btn primary', textContent: 'Save', onclick: () => {
          me = { ...me, name: name.value.trim().slice(0, 24) || 'You', color }; saveMe(); renderAll(); scrim.remove();
        } }))));
  scrim.onclick = (e) => { if (e.target === scrim) { setTheme(me && document.documentElement.dataset.theme); scrim.remove(); } };
  document.body.append(scrim); name.focus(); name.select();
}

function newChannel() {
  const n = prompt('New channel name'); if (!n) return;
  channelId = Store.addChannel(serverId, n); renderAll();
}

let toastT = 0;
function toast(text) {
  let t = $('#toast'); if (!t) { t = el('div', { id: 'toast' }); Object.assign(t.style, { position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: 'var(--rail)', color: 'var(--text)', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 10px 30px #0007', zIndex: 30, maxWidth: '90%', textAlign: 'center' }); document.body.append(t); }
  t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

// ---------- wire up ----------
const input = $('#input');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(180, input.scrollHeight) + 'px'; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('#sticker-btn').onclick = togglePicker;
document.addEventListener('click', (e) => { if (picker && !picker.contains(e.target) && e.target !== $('#sticker-btn')) togglePicker(); });
$('#call-voice').onclick = () => startCall(false);
$('#call-video').onclick = () => startCall(true);
$('#c-mic').onclick = () => { if (!stream) return; micOn = !micOn; stream.getAudioTracks().forEach((t) => { t.enabled = micOn; }); syncCallButtons(); };
$('#c-cam').onclick = () => { if (!stream) return; camOn = !camOn; stream.getVideoTracks().forEach((t) => { t.enabled = camOn; }); syncCallButtons(); };
$('#c-leave').onclick = closeCall;
$('#menu').onclick = () => $('#app').classList.toggle('show-side');

Store.onChange(renderMessages);
Store.init();
renderAll();
