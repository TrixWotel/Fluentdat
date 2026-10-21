// Link previews in messages, like Discord's: a Fluentdat invite becomes the server's card (with Join), a GitHub
// repository its card and picture, a YouTube video a thumbnail that plays right there. Only places that answer a web
// page directly are asked (GitHub's API and YouTube's own oEmbed), and pictures only come from GitHub and YouTube,
// so nobody can post a link just to see who looked at it. Answers are kept for a while (GitHub allows 60 asks an hour).
import { el, icon } from './ui.js';

const RESERVED = new Set(['about', 'apps', 'collections', 'contact', 'customer-stories', 'enterprise', 'events', 'explore', 'features', 'issues',
  'login', 'join', 'marketplace', 'new', 'notifications', 'orgs', 'organizations', 'pricing', 'pulls', 'search', 'security', 'settings', 'site',
  'sponsors', 'team', 'topics', 'trending', 'codespaces', 'copilot', 'readme', 'stars', 'watching']);
// what kind of link this is: { kind: 'invite', code } | { kind: 'github', owner, repo } | { kind: 'youtube', id } | null
export function kindOf(url) {
  let u; try { u = new URL(url); } catch { return null; }
  const inv = (u.hash || '').match(/invite=([0-9a-z]{4,32})/i);
  if (inv) return { kind: 'invite', code: inv[1].toLowerCase() };
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'github.com') {
    const [owner, repo] = u.pathname.split('/').filter(Boolean);
    if (owner && repo && !RESERVED.has(owner.toLowerCase()) && /^[\w.-]+$/.test(owner) && /^[\w.-]+$/.test(repo)) return { kind: 'github', owner, repo: repo.replace(/\.git$/, '') };
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') {
    const id = host === 'youtu.be' ? u.pathname.slice(1, 12) : u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/) || [])[1];
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', id };
  }
  return null;
}

const mem = new Map();
const KEEP_MS = 6 * 3600 * 1000;
function remembered(key, fetcher) {
  if (mem.has(key)) return mem.get(key);
  let saved = null; try { saved = JSON.parse(localStorage.getItem('fluentdat.embed.' + key)); } catch {}
  const p = saved && saved.until > Date.now() ? Promise.resolve(saved.v) : fetcher().then((v) => {
    try { if (v) localStorage.setItem('fluentdat.embed.' + key, JSON.stringify({ v, until: Date.now() + KEEP_MS })); } catch {}
    return v;
  }, () => null);
  mem.set(key, p);
  return p;
}
const getJSON = async (url) => { const r = await fetch(url, { headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(r.status); return r.json(); };
const github = (owner, repo) => remembered(`gh:${owner}/${repo}`.toLowerCase(), async () => {
  const j = await getJSON(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  return { full: j.full_name, description: j.description || '', url: j.html_url, stars: j.stargazers_count, forks: j.forks_count, language: j.language || '' };
});
const youtube = (id) => remembered('yt:' + id, async () => {
  const j = await getJSON(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`);
  return { title: j.title || 'YouTube', author: j.author_name || '', authorUrl: /^https:\/\/www\.youtube\.com\//.test(j.author_url || '') ? j.author_url : '' };
});
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const ext = (href, text, cls = '') => el('a', { className: cls, href, target: '_blank', rel: 'noopener noreferrer nofollow' }, text);

// a preview for a link (fills in when the answer comes; nothing at all if there isn't one).
// opts: inviteInfo(code) → server info; join(code) → joins; open(serverId) → shows a server you're in;
// paint(value, color) → a banner's background; safeImg(value) → a picture you may show
export function embed(url, opts = {}) {
  const k = kindOf(url); if (!k) return null;
  const box = el('div', { className: 'embed-slot' });
  const fill = (node) => { if (node) box.replaceChildren(node); else box.remove(); };
  if (k.kind === 'github') github(k.owner, k.repo).then((g) => fill(g && el('div', { className: 'embed gh' },
    el('div', { className: 'em-provider' }, 'GitHub'),
    ext(g.url, cut(`GitHub - ${g.full}${g.description ? ': ' + g.description : ''}`, 90), 'em-title'),
    g.description ? el('div', { className: 'em-desc' }, cut(`${g.description} - ${g.full}`, 300)) : null,
    el('a', { className: 'em-img', href: g.url, target: '_blank', rel: 'noopener noreferrer nofollow' },
      el('img', { src: `https://opengraph.githubassets.com/1/${encodeURIComponent(k.owner)}/${encodeURIComponent(k.repo)}`, alt: g.full, loading: 'lazy', referrerPolicy: 'no-referrer' })))));
  else if (k.kind === 'youtube') youtube(k.id).then((y) => {
    const watch = 'https://www.youtube.com/watch?v=' + k.id;
    const thumb = el('button', { className: 'em-video', title: 'Play' }, el('img', { src: `https://i.ytimg.com/vi/${k.id}/hqdefault.jpg`, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' }),
      el('span', { className: 'em-playbtn' }, icon('play', 26)));
    thumb.onclick = () => thumb.replaceWith(el('iframe', { className: 'em-frame', src: `https://www.youtube-nocookie.com/embed/${k.id}?autoplay=1&rel=0`,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowFullscreen: true, referrerPolicy: 'strict-origin-when-cross-origin', title: (y && y.title) || 'YouTube video' }));
    fill(el('div', { className: 'embed yt' }, el('div', { className: 'em-provider' }, 'YouTube'),
      y && y.author ? (y.authorUrl ? ext(y.authorUrl, y.author, 'em-author') : el('div', { className: 'em-author' }, y.author)) : null,
      ext(watch, (y && y.title) || 'YouTube video', 'em-title'), thumb));
  });
  else if (k.kind === 'invite') {
    box.append(el('div', { className: 'embed invite loading' }, el('div', { className: 'inv-h' }, 'Loading invite…')));
    Promise.resolve(opts.inviteInfo ? opts.inviteInfo(k.code) : null).then((s) => fill(inviteCard(k.code, s, opts)), () => fill(inviteCard(k.code, null, opts)));
  }
  return box;
}
// Discord's invite card: the banner, the server's picture, its name, who's online and how many members, when it began,
// what it's about, and Join (or Joined)
function inviteCard(code, s, opts) {
  if (!s) return el('div', { className: 'embed invite bad' }, el('div', { className: 'inv-h' }, 'You received an invite, but…'),
    el('div', { className: 'inv-none' }, el('div', { className: 'inv-icon empty' }, icon('ban', 26)), el('div', {}, el('b', {}, 'Invalid Invite'), el('div', { className: 'muted' }, opts.signedIn === false ? 'Sign in to see this invite.' : 'Try sending a new invite!'))),
    opts.signedIn === false ? el('button', { className: 'btn inv-join', onclick: () => opts.join && opts.join(code) }, 'Sign In to Join') : null);
  const banner = el('div', { className: 'inv-banner' });
  banner.style.background = (opts.paint && opts.paint(s.banner)) || 'var(--input)';
  const pic = el('div', { className: 'inv-icon' }), img = opts.safeImg ? opts.safeImg(s.img) : '';
  if (img) pic.append(el('img', { src: img, alt: '' })); else if (s.icon && opts.iconFor && opts.iconFor(s.icon)) pic.append(opts.iconFor(s.icon)); else pic.textContent = String(s.name || '?').trim().slice(0, 2).toUpperCase();
  const join = el('button', { className: 'btn inv-join' + (s.joined ? ' joined' : '') }, s.joined ? 'Joined' : s.usable ? 'Join' : 'Expired');
  join.disabled = !s.joined && !s.usable;
  join.onclick = async () => { if (s.joined) return opts.open && opts.open(s.id); join.disabled = true; join.textContent = 'Joining…'; const ok = opts.join && (await opts.join(code)); if (!ok) { join.disabled = false; join.textContent = 'Join'; } };
  const since = s.since ? new Date(s.since).toLocaleDateString([], { month: 'short', year: 'numeric' }) : '';
  return el('div', { className: 'embed invite' }, banner, pic,
    el('div', { className: 'inv-body' },
      el('div', { className: 'inv-name' }, s.name),
      el('div', { className: 'inv-counts' }, el('span', {}, el('i', { className: 'on' }), `${(s.online || 0).toLocaleString()} Online`), el('span', {}, el('i', {}), `${(s.members || 0).toLocaleString()} Member${s.members === 1 ? '' : 's'}`)),
      since ? el('div', { className: 'inv-est' }, 'Est. ' + since) : null,
      s.description ? el('div', { className: 'inv-desc' }, s.description) : null,
      join));
}
