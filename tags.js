// Server tags, like Discord's: up to four letters and a little badge in the server's colour, worn beside a name.
import { el, ICON } from './ui.js';

// [id, name, the badge's drawing (24 × 24, lines)]
export const BADGES = [
  ['leaf', 'Leaf', '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 13 11"/>'],
  ['flame', 'Flame', '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-5 0-9z"/>'],
  ['star', 'Star', ICON.star],
  ['heart', 'Heart', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'],
  ['crown', 'Crown', ICON.crown],
  ['shield', 'Shield', ICON.shield],
  ['bolt', 'Bolt', '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
  ['moon', 'Moon', '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'],
  ['sun', 'Sun', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
  ['gem', 'Gem', '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6z"/>'],
  ['sword', 'Sword', '<path d="M14.5 3H21v6.5L10 20.5 3.5 14z"/><path d="M6 12l6 6M3 21l3-3"/>'],
  ['rocket', 'Rocket', '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15l-3-3c1-4 4-8 10-9 1 6-3 9-7 12z"/><circle cx="14.5" cy="9.5" r="1.5"/>'],
  ['music', 'Music', ICON.music],
  ['game', 'Controller', ICON.game],
  ['ghost', 'Ghost', '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.3 2-2.4-2-2.4 2-2.3-2z"/><path d="M9.5 10h.01M14.5 10h.01"/>'],
  ['flower', 'Flower', '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5a3 3 0 1 1 0-6 3 3 0 1 1 0 6zM12 14.5a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM9.5 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0zM14.5 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z"/>'],
  ['snow', 'Snowflake', '<path d="M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M9 4l3 2 3-2M9 20l3-2 3 2"/>'],
  ['wave', 'Wave', '<path d="M2 12c2.5-3 4.5-3 7 0s4.5 3 7 0 4.5-3 6 0M2 17c2.5-3 4.5-3 7 0s4.5 3 7 0 4.5-3 6 0"/>'],
  ['paw', 'Paw', '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 2.5-4 2.5S8 19 8 17z"/>'],
  ['skull', 'Skull', '<path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 20v-2M14 20v-2"/>'],
  ['frog', 'Frog', '<path d="M4 15c0-4 3.6-6 8-6s8 2 8 6c0 3-3.6 5-8 5s-8-2-8-5z"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M9 15c1.5 1 4.5 1 6 0"/>'],
  ['cat', 'Cat', '<path d="M5 20v-9l-1-7 4 3h8l4-3-1 7v9z"/><path d="M9 13h.01M15 13h.01M10.5 16.5 12 17.5l1.5-1"/>'],
  ['robot', 'Robot', ICON.bot],
  ['sparkle', 'Sparkle', ICON.sparkle],
  ['potion', 'Potion', '<path d="M9 3h6M10 3v5.5L5.5 17a3 3 0 0 0 2.7 4h7.6a3 3 0 0 0 2.7-4L14 8.5V3"/><path d="M7.5 14h9"/>'],
  ['anchor', 'Anchor', '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 10h8"/>'],
  ['trophy', 'Trophy', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'],
  ['code', 'Code', ICON.code],
  ['book', 'Book', ICON.book],
  ['pizza', 'Pizza', '<path d="M12 21 3 6a15 15 0 0 1 18 0z"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="13" r="1"/>'],
  ['globe', 'Globe', ICON.globe],
  ['flask', 'Flask', ICON.flask],
];
export const TAG_COLORS = ['#f0b232', '#57f287', '#5865f2', '#eb459e', '#ed4245', '#00a8fc', '#9b59b6', '#ffffff'];
const badge = (id) => (BADGES.find((b) => b[0] === id) || BADGES[2])[2];
export const badgeSVG = (id, size = 14) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}">${badge(id)}</svg>`;
const safe = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#f0b232');
// the tag as it sits beside a name: { text, badge, color }. Clickable when onclick is given
export function tagChip(tag, onclick) {
  // (a span even when it can be clicked: it often sits inside a row that is itself a button)
  const chip = el('span', { className: 'stag' + (onclick ? ' click' : ''), title: onclick ? 'Server tag: click for its server' : 'Server tag' });
  if (onclick) { chip.setAttribute('role', 'button'); chip.tabIndex = 0; chip.onkeydown = (e) => { if (e.key === 'Enter') { e.stopPropagation(); onclick(e); } }; }
  chip.style.setProperty('--tc', safe(tag.color));
  chip.innerHTML = badgeSVG(tag.badge);
  chip.append(el('b', {}, String(tag.text || '').slice(0, 4)));
  if (onclick) chip.onclick = (e) => { e.stopPropagation(); onclick(e); };
  return chip;
}
