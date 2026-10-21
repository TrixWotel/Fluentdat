// Fluentdat's building blocks: elements, icons, pictures, little messages, windows and menus. Nothing here knows
// about servers or messages; app.js puts them together. (Windows replace the browser's prompt() and confirm():
// apps built on Electron, like the Fluent browser, don't have prompt(), so anything that used it did nothing there.)
import { animOn } from './anim.js';

export const $ = (s) => document.querySelector(s);
export const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k)); return n; };

// ---------- icons ----------
export const ICON = {
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
  forward: '<polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  unread: '<path d="M11.7 3H5a2 2 0 0 0-2 2v16l4-4h12a2 2 0 0 0 2-2v-2.7"/><circle cx="18" cy="6" r="3"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  userX: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
  smilePlus: '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  crown: '<path d="M3 18h18M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M16 7l3 3M18 5l2 2"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
  plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
  sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  headphonesOff: '<path d="M3 18v-6a9 9 0 0 1 14.4-7.2M20.4 8.6A9 9 0 0 1 21 12v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/><line x1="2" y1="2" x2="22" y2="22"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>',
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor" stroke="none"/>',
  reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  screenOff: '<path d="M18 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 1-1.73M8 3h12a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="2" y1="2" x2="22" y2="22"/>',
  bellOff: '<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
  bold: '<path d="M7 4h7a4 4 0 0 1 0 8H7z"/><path d="M7 12h8a4 4 0 0 1 0 8H7z"/>',
  italic: '<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>',
  underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/>',
  strike: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  quote: '<path d="M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4.5M20 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.5-1.5 4-4 4.5"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  usersPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
  phoneIn: '<polyline points="16 2 16 8 22 8"/><line x1="23" y1="1" x2="16" y2="8"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  phoneMissed: '<line x1="23" y1="1" x2="17" y2="7"/><line x1="17" y1="1" x2="23" y2="7"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  slash: '<path d="M15 5 9 19"/>',
  external: '<path d="M7 17 17 7M9 7h8v8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  thread: '<path d="M4 7h11M4 12h8M4 17h5"/><path d="M15 12h5v8l-2.5-2H15z"/>',
  verified: '<path d="M12.00 1.60 L14.23 3.69 L17.20 2.99 L18.08 5.92 L21.01 6.80 L20.31 9.77 L22.40 12.00 L20.31 14.23 L21.01 17.20 L18.08 18.08 L17.20 21.01 L14.23 20.31 L12.00 22.40 L9.77 20.31 L6.80 21.01 L5.92 18.08 L2.99 17.20 L3.69 14.23 L1.60 12.00 L3.69 9.77 L2.99 6.80 L5.92 5.92 L6.80 2.99 L9.77 3.69Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m8.4 12.3 2.5 2.5 4.8-5" stroke="#fff" stroke-width="2.2"/>',
  userCheck: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7 1.6 0 3 .4 4.2 1.2"/><path d="m15 17 2.2 2.2L22 14.4"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M8.6 10.2 6 3h4l2 4 2-4h4l-2.6 7.2"/><path d="M12 12.4l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor" stroke="none"/>',
  frame: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7 3.5c1.5 2 3.5 2 5 0 1.5 2 3.5 2 5 0M7 20.5c1.5-2 3.5-2 5 0 1.5-2 3.5-2 5 0"/>',
  collection: '<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M6 5.5h12"/><path d="M8.5 2.5h7"/><path d="M8 13l2.5 2.5L16 10"/>',
  rules: '<path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z"/><path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16"/><path d="M8.5 11.5l1.5 1.5 2.5-2.5M14 12h2M8.5 16.5l1.5 1.5 2.5-2.5M14 17h2"/>',
  servers: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01M12 7.5h4M12 16.5h4"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.2h2a3.8 3.8 0 0 1 0 7.6h-2z"/>',
  swap: '<path d="M7 3.5 3.5 7 7 10.5"/><path d="M3.5 7H17"/><path d="M17 13.5l3.5 3.5-3.5 3.5"/><path d="M20.5 17H7"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8"/><path d="M12 8v12"/><path d="M12 8c-1.5-4-5.5-3.5-4.6-1 .4 1 2.6 1 4.6 1zm0 0c1.5-4 5.5-3.5 4.6-1-.4 1-2.6 1-4.6 1z"/>',
  gem: '<path d="M12 2 20 7v10l-8 5-8-5V7z"/><path d="M12 7l4 2.5v5L12 17l-4-2.5v-5z"/>',
  apps: '<rect x="4" y="4" width="7" height="7" rx="2"/><circle cx="17.5" cy="7.5" r="3.5"/><path d="M7.5 13.5 11 20H4z"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  browse: '<path d="M4 6h11M4 12h6M4 18h6"/><circle cx="16.5" cy="15.5" r="3.5"/><path d="m19 18 2.5 2.5"/>',
  signpost: '<path d="M12 3v18M9 21h6"/><path d="M5 5h11l3 3-3 3H5zM19 13H8l-3 2.5L8 18h11z"/>',
  shop: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  quest: '<circle cx="12" cy="9" r="5"/><path d="m9 13.5-2 7.5 5-2.5 5 2.5-2-7.5"/><path d="m12 6.6.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  game: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="13" r="1" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>',
  film: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/>',
  brush: '<path d="M9.06 11.9 17.8 3.15a2.1 2.1 0 0 1 3 3l-8.76 8.75"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  bell2: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
  // Fluentdat's logo: the ring (open at the top right, round ends), the dot, and the spark
  logo: '<path d="M20.1 11.03A8.16 8.16 0 1 1 12.97 3.9" stroke-width="1.92"/><path d="M17.76 5.1v2.28M16.62 6.24h2.28" stroke-width="1.2"/><circle cx="12" cy="12" r="3.36" fill="currentColor" stroke="none"/>',
};
// the Discord and GitHub marks (solid shapes, so drawn with fill rather than the outline style above)
export const BRAND = {
  discord: '<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>',
  github: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
};
export const brand = (n, s = 20) => { const d = document.createElement('div'); d.innerHTML = `<svg class="brand" viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${BRAND[n]}</svg>`; return d.firstElementChild; };
export const svgHTML = (n, s) => `<svg class="ic" viewBox="0 0 24 24"${s ? ` width="${s}" height="${s}"` : ''}>${ICON[n] || ''}</svg>`;
export const icon = (n, s) => { const d = document.createElement('div'); d.innerHTML = svgHTML(n, s); return d.firstElementChild; };

// ---------- images ----------
export const readImage = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); });
export function scaled(img, max) { const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s); const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); c.getContext('2d').drawImage(img, 0, 0, w, h); return c.toDataURL('image/png'); }
export const pickFile = (cb) => { const i = el('input', { type: 'file', accept: 'image/*' }); i.onchange = () => { if (i.files[0]) cb(i.files[0]); }; i.click(); };
// any files, several at once (for attachments)
export const pickFiles = (cb) => { const i = el('input', { type: 'file', multiple: true }); i.onchange = () => { if (i.files.length) cb([...i.files]); }; i.click(); };

let toastT = 0;
export function toast(text) { let t = $('#toast'); if (!t) { t = el('div', { id: 'toast' }); Object.assign(t.style, { position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)', background: 'var(--rail)', color: 'var(--text)', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 10px 30px #0007', zIndex: 70, maxWidth: '90%', textAlign: 'center' }); document.body.append(t); } t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3400); }

// things that go to the server can fail (no permission, offline): say why instead of failing quietly. null = it failed
export async function attempt(fn) { try { return await fn(); } catch (e) { toast(String((e && e.message) || e)); return null; } }
export const copyText = (text, done) => navigator.clipboard?.writeText(text).then(() => toast(done || 'Copied.'), () => toast(text)) ?? toast(text);

// ---------- pictures, small enough to keep in the database ----------
// shrink a picked image to fit maxW × maxH, as WebP (or JPEG), lowering quality until it's under maxChars
export async function shrink(file, maxW, maxH, maxChars = 380000) {
  const img = await readImage(file);
  let scale = Math.min(1, maxW / img.width, maxH / img.height), q = 0.85, out = '';
  for (let tries = 0; tries < 8; tries++) {
    const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(img.width * scale)), height: Math.max(1, Math.round(img.height * scale)) });
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL('image/webp', q);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
    if (out.length <= maxChars) return out;
    if (q > 0.5) q -= 0.15; else scale *= 0.75;
  }
  throw new Error('That picture is too big, even made smaller.');
}

// ---------- banners and nameplates: one of these gradients (g:0 … g:9), or a picture ----------
export const GRADS = [
  'linear-gradient(135deg,#7a3b41,#c17278)', 'linear-gradient(135deg,#8c1d5c,#e05aa8)', 'linear-gradient(135deg,#7d1418,#e04a4a)',
  'linear-gradient(135deg,#8f420f,#ee8a35)', 'linear-gradient(135deg,#7c6a12,#e2c94a)', 'linear-gradient(135deg,#4b2370,#a663d8)',
  'linear-gradient(135deg,#124e8c,#36b1e0)', 'linear-gradient(135deg,#1b6b60,#59d3bb)', 'linear-gradient(135deg,#25501a,#5f9e37)',
  'linear-gradient(135deg,#141518,#4a4d55)',
];
const PICTURE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
// a value someone saved → a CSS background (anything that isn't one of ours is ignored)
export function paint(v) {
  if (!v || typeof v !== 'string') return '';
  if (/^g:\d$/.test(v)) return GRADS[+v.slice(2)];
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{6},#[0-9a-f]{6}$/i.test(v)) { const [a, b] = v.split(','); return `linear-gradient(135deg, ${a}, ${b})`; }
  if (PICTURE.test(v)) return `center / cover no-repeat url("${v}")`;
  return '';
}

// ---------- windows ----------
// a window in the middle of the screen. Esc, Cancel, or a click on the dimmed area closes it (calling onClose(null)).
export function modal({ title, sub, body = [], actions = [], wide = false, cls = '', onClose } = {}) {
  const box = el('div', { className: 'dialog' + (wide ? ' wide' : '') + (cls ? ' ' + cls : ''), role: 'dialog' });
  const scrim = el('div', { className: 'scrim' }, box);
  let closed = false, downOnScrim = false;
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
  function close(v) {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', key, true);
    if (animOn('dialogs')) { scrim.classList.add('closing'); setTimeout(() => scrim.remove(), 160); } else scrim.remove();      // (it shrinks away)
    if (onClose) onClose(v);
  }
  const fill = (parts) => box.replaceChildren(...parts.flat().filter(Boolean));
  document.addEventListener('keydown', key, true);
  scrim.addEventListener('mousedown', (e) => { downOnScrim = e.target === scrim; });
  scrim.addEventListener('click', (e) => { if (e.target === scrim && downOnScrim) close(null); });
  fill([title ? el('h3', {}, title) : null, sub ? el('p', { className: 'dlg-sub' }, sub) : null, ...body, actions.length ? el('div', { className: 'row' }, ...actions) : null]);
  document.body.append(scrim);
  return { box, scrim, close, fill };
}
// ask for a bit of text (resolves to the text, or null if cancelled)
export function ask({ title, sub = '', label = '', value = '', placeholder = '', ok = 'Save', max = 100, prefix = '' } = {}) {
  return new Promise((done) => {
    const input = el('input', { type: 'text', value, placeholder, maxLength: max, autocomplete: 'off' });
    const go = () => { const v = input.value.trim(); if (!v) { input.focus(); return; } m.close(v); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const m = modal({ title, sub, onClose: (v) => done(v == null ? null : v),
      body: [el('div', { className: 'field' }, label ? el('label', {}, label) : null, prefix ? el('div', { className: 'with-prefix' }, el('span', {}, prefix), input) : input)],
      actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close(null) }), el('button', { className: 'btn primary', textContent: ok, onclick: go })] });
    setTimeout(() => { input.focus(); input.select(); }, 0);
  });
}
// "are you sure?" — and for the drastic things, type the name to confirm (resolves to true or false)
export function confirmBox({ title, text = '', ok = 'OK', danger = false, type = '' } = {}) {
  return new Promise((done) => {
    const input = type ? el('input', { type: 'text', autocomplete: 'off' }) : null;
    const yes = el('button', { className: 'btn ' + (danger ? 'red' : 'primary'), textContent: ok });
    const check = () => { if (input) yes.disabled = input.value.trim() !== type; };
    yes.onclick = () => { if (input && input.value.trim() !== type) return; m.close(true); };
    if (input) { input.oninput = check; input.addEventListener('keydown', (e) => { if (e.key === 'Enter') yes.click(); }); }
    const m = modal({ title, onClose: (v) => done(v === true),
      body: [text ? el('p', { className: 'dlg-text' }, text) : null, input ? el('div', { className: 'field' }, el('label', {}, 'Type “' + type + '” to confirm'), input) : null],
      actions: [el('button', { className: 'btn', textContent: 'Cancel', onclick: () => m.close(false) }), yes] });
    check();
    setTimeout(() => (input || yes).focus(), 0);
  });
}

// ---------- right-click menus ----------
// items: { label, icon, hint, color, danger, disabled, check (true/false shows a tick box), action, sub: () => items } or '-'
// A sub-menu opens beside its item when you point at it (or tap it), as on Discord.
let openMenu = null, openSub = null;
function closeSub() { if (openSub) { openSub.remove(); openSub = null; } if (openMenu) for (const b of openMenu.querySelectorAll('.has-sub.open')) b.classList.remove('open'); }
export function closeMenu() { closeSub(); if (openMenu) { openMenu.remove(); openMenu = null; } }
const inMenu = (t) => (openMenu && openMenu.contains(t)) || (openSub && openSub.contains(t));
function menuBox(items, isSub) {
  const m = el('div', { className: 'ctx' + (isSub ? ' ctx-sub' : ''), role: 'menu' });
  const list = items.filter(Boolean);
  list.forEach((it, i) => {
    if (it === '-') { if (i > 0 && i < list.length - 1 && list[i - 1] !== '-') m.append(el('hr')); return; }
    const right = it.check != null ? el('span', { className: 'tick' + (it.check ? ' on' : '') }, it.check ? icon('check', 13) : null)
      : it.sub ? icon('chevR', 15) : it.icon ? icon(it.icon, 16) : null;
    const b = el('button', { className: (it.danger ? 'danger' : '') + (it.sub ? ' has-sub' : ''), role: 'menuitem', disabled: !!it.disabled },
      it.color ? el('span', { className: 'dotc', style: `background:${it.color}` }) : null,
      el('span', { className: 'lbl' }, it.label, it.hint ? el('small', {}, it.hint) : null), right);
    const openHere = () => {
      if (b.classList.contains('open')) return;
      closeSub();
      const s = menuBox(it.sub(), true); document.body.append(s);
      const r = b.getBoundingClientRect(), w = s.offsetWidth, h = s.offsetHeight;
      s.style.left = (r.right + 6 + w <= innerWidth - 8 ? r.right + 6 : Math.max(8, r.left - w - 6)) + 'px';
      s.style.top = Math.max(8, Math.min(r.top - 7, innerHeight - h - 8)) + 'px';
      openSub = s; b.classList.add('open');
    };
    if (!isSub) b.onmouseenter = () => { if (it.sub && !it.disabled) openHere(); else closeSub(); };
    b.onclick = (e) => {
      e.stopPropagation();
      if (it.sub) return openHere();
      if (!it.keep) closeMenu();
      if (it.action) it.action();
    };
    m.append(b);
  });
  return m;
}
export function menu(items, x, y) {
  closeMenu();
  const m = menuBox(items, false);
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  openMenu = m;
  return m;
}
document.addEventListener('mousedown', (e) => { if (openMenu && !inMenu(e.target)) closeMenu(); }, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && openMenu) { e.stopPropagation(); closeMenu(); } }, true);      // (before a dialog under it)
addEventListener('resize', closeMenu);
addEventListener('blur', closeMenu);
document.addEventListener('scroll', (e) => { if (openMenu && !inMenu(e.target)) closeMenu(); }, true);
