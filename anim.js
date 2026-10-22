// Fluentdat's animations, each one something you can turn off by itself (Settings → Animations), and all of them at once
// with Reduce Motion. A turned-off one has its parts listed in a <style> made from this table, with their animations and
// transitions switched off; the animations themselves are in index.html.
// [id, group, name, what it does, the CSS selectors it covers]
export const ANIMS = [
  ['menus', 'Windows & menus', 'Menus', 'Right-click and ⋯ menus pop open, and sub-menus slide out beside them.', ['.ctx', '.ctx button', '.ctx-sub']],
  ['popouts', 'Windows & menus', 'Profile cards', 'A profile card slides out beside whoever you clicked, and slips away when you click again.', ['.pop', '.pop.out', '.pop .p-av .avatar .fill', '.cp']],
  ['dialogs', 'Windows & menus', 'Windows', 'Windows zoom in over a fading backdrop, and shrink away when they close.', ['.scrim', '.scrim > .dialog', '.scrim.closing', '.scrim.closing > .dialog']],
  ['settings', 'Windows & menus', 'Settings', 'Settings rises into place, each page slides in as you switch to it, and the unsaved-changes bar slides up.', ['.sx-backdrop', '.sx', '.sx-body > *', '.sx-backdrop.closing', '.sx-backdrop.closing .sx', '.sx-nav button', '.cs-bar', '.cs-bar.shake', '.pm-advh svg.ic', '.tri button']],
  ['fullProfile', 'Windows & menus', 'Full profiles', 'The whole profile pops up, its tab underline slides, its lists ripple in, and game covers lift when you point at them.', ['.dialog.fp-dlg', '.fp-tabs button::after', '.fp-list > *', '.fp-row', '.fp-row > svg.ic', '.fp-x', '.gc .gt', '.gc-x', '.gp-tick', '.cx-pick']],
  ['picker', 'Windows & menus', 'Emoji picker', 'The emoji and sticker picker springs up from its button.', ['.xp', '.xp.out', '.xp-pv', '.xp-r', '.xp-tabs button']],
  ['tooltips', 'Windows & menus', 'Name tags', 'The name tags beside the server rail slide in.', ['.tip', '.tip.show']],
  ['toasts', 'Windows & menus', 'Toasts and notices', 'Little messages at the bottom rise up, and reminders bounce in.', ['#toast', '.notice']],
  ['newMessages', 'Chat', 'New messages', 'New messages slide up into the conversation.', ['.msg.arrive']],
  ['msgHover', 'Chat', 'Message hover', 'A message lights up under the pointer, and its toolbar fades in.', ['.msg', '.msg-tools', '.msg-tools button']],
  ['reactions', 'Chat', 'Reactions', 'Reactions pop in, their counts bounce, and the emoji jumps when you click it.', ['.react', '.react .re', '.react.bump', '.react.bump .re', '.react-add', '.react .rn']],
  ['emojiHover', 'Chat', 'Emoji wiggle', 'Emoji grow and wiggle when you point at them in the picker (stickers just grow).', ['.xp-cell .xp-e', '.xp-cell img', '.xp-st img', '.xp-st-e']],
  ['conversation', 'Chat', 'Switching conversations', 'A channel or DM fades in when you open it.', ['.msgs.swap', '.content.swap']],
  ['composer', 'Chat', 'Message box', 'The reply bar and waiting attachments slide in; suggestions pop up.', ['#reply-bar', '.pend', '.mention-pop', '.mp-row', '.box', '#send-btn svg.ic']],
  ['newLine', 'Chat', 'New line', 'The red NEW line draws itself across.', ['.newline', '.newline span']],
  ['serverSwitch', 'Servers & sidebar', 'Switching servers', 'A server\'s name, banner and channels come in one after another when you open it.', ['.side-head.swap-in', '.side-body .swap-in']],
  ['railPill', 'Servers & sidebar', 'Server pill', 'The white pill beside a server grows into a tall bar when you open it, and slowly shrinks away when you leave.', ['.srv-wrap .pill']],
  ['railIcons', 'Servers & sidebar', 'Server icons', 'Server icons morph from circles into rounded squares, and press in when clicked.', ['.srv', '.srv img', '.srv > svg.ic', '.srv-wrap.enter .srv']],
  ['railBadges', 'Servers & sidebar', 'Badges', 'Ping counts and voice badges pop in.', ['.srv-wrap .badge', '.srv-wrap .vbadge', '.badge.bump']],
  ['homeLogo', 'Servers & sidebar', 'Logo', 'The Fluentdat logo spins its spark when you point at it (and shimmers if it\'s a moving one).', ['.srv.home .lg', '.srv.home .lg *', '.lg.shimmer']],
  ['channels', 'Servers & sidebar', 'Channels', 'Channels light up under the pointer, and categories fold and unfold.', ['.chan', '.chan .x', '.cat .caret', '.cat .caret svg.ic', '.chan.unfold']],
  ['banner', 'Servers & sidebar', 'Server banner', 'A server\'s banner fades into its channels and tucks away as you scroll.', ['.side-head.has-banner', '.side-head.has-banner::after', '.side-head.has-banner::before', '.side.banner-over .side-body']],
  ['members', 'Servers & sidebar', 'Member list', 'Members light up under the pointer, and the one whose card is open stays lit.', ['.mem', '.mem .avatar']],
  ['dmPanel', 'Profiles', 'DM profile panel', 'The profile beside a DM slides in and its cards rise one after another.', ['.dmp', '.dmp-card', '.dmp-tool', '.dmp-row > svg.ic', '.dmp-av .avatar .fill', '.dmp-full']],
  ['decorations', 'Profiles', 'Avatar decorations', 'Decorations from the Shop sparkle, spin and flicker around avatars.', ['.deco *']],
  ['profileEffects', 'Profiles', 'Profile effects', 'Effects from the Shop (snow, confetti…) play over profile cards.', ['.pfx > i', '.pfx-shoot']],
  ['nameplates', 'Profiles', 'Moving nameplates', 'Nameplates from the Shop drift, glow and shimmer behind names.', ['.plated::before', '.npm-self']],
  ['profileFrames', 'Profiles', 'Profile frames', 'Frames from the Shop twinkle, blink and flicker around profile cards.', ['.pframe *']],
  ['nameEffects', 'Profiles', 'Moving names', 'Display name effects that move (Prism, Gummy, Glow) keep moving.', ['.ns', '.ns-prism', '.ns-gummy', '.ns-glow', '.ns-neon']],
  ['profileEditor', 'Profiles', 'Profile editor', 'The profile editor\'s preview follows every change, and the save bar slides up when you have unsaved changes.', ['.pe', '.pe-bar', '.pe-card', '.pe-card *', '.pe-sec', '.pe-tile']],
  ['buttons', 'Little things', 'Buttons', 'Buttons brighten when you point at them and press in when clicked.', ['.btn', '.sg-btn', '.sg-alt', '.dmp-full', '.top .act']],
  ['switches', 'Little things', 'Switches', 'Switches slide their knob across.', ['.sw', '.sw::after', '.sw::before']],
  ['loading', 'Little things', 'Loading', 'Loading placeholders shimmer.', ['.sk-lines i', '.sk-av']],
  ['calls', 'Little things', 'Calls', 'Call tiles glow when someone talks, and the call icon pulses.', ['.tile', '.tile.speaking', '.sys-ic.live svg.ic', '.incall']],
  ['bookmarks', 'Little things', 'Bookmarks', 'Bookmarked messages show their ribbon, and the list slides in.', ['.bm-row', '.msg.saved::after']],
  ['colorPicker', 'Little things', 'Colour picker', 'The colour picker opens with a bounce and its knobs glide.', ['.cp', '.cp-knob', '.cp-hue i']],
];
const KEY = 'data-noanim';
let styleEl = null;
// once: the rules that switch each animation off when its id is in <html data-noanim="…">
function ensureStyle() {
  if (styleEl) return;
  const out = [];
  for (const [id, , , , sel] of ANIMS) {
    const list = sel.map((s) => `:root[${KEY}~="${id}"] ${s}`).join(',\n');
    out.push(`${list} { animation: none !important; transition: none !important; }`);
  }
  styleEl = document.createElement('style');
  styleEl.id = 'fluentdat-anim-switches';
  styleEl.textContent = out.join('\n');
  document.head.append(styleEl);
}
// off: { id: true } for each one turned off
export function applyAnims(off = {}) {
  ensureStyle();
  const ids = ANIMS.map((a) => a[0]).filter((id) => off[id]);
  if (ids.length) document.documentElement.setAttribute(KEY, ids.join(' ')); else document.documentElement.removeAttribute(KEY);
}
// is this animation playing right now? (for the few that JavaScript times: a closing window waits for its animation)
export const animOn = (id) => {
  const r = document.documentElement;
  return r.dataset.motion !== 'off' && !(r.getAttribute(KEY) || '').split(' ').includes(id);
};
