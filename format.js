// Fluentdat's message text, Discord's way: **bold**, *italics*, __underline__, ~~strikethrough~~, ||spoilers||,
// `code` and ```code blocks```, > quotes, # headings, -# small text, lists, links you can click ([text](link) too),
// and @mentions (stored as <@their id>, shown with their name). Everything typed is escaped first, so a message can
// only ever produce the tags made here.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MENTION = new RegExp(`<@(${UUID})>`, 'gi');
const CHANNEL = new RegExp(`<#(${UUID})>`, 'gi');
const EVERYONE = /(^|[^\w@])@(everyone|here)(?![\w])/g;
// a web address in text: up to the first space, without the full stop or bracket that ends the sentence around it
const BARE = /\bhttps?:\/\/[^\s<>"`]+/gi;
const MASKED = /\[([^\[\]\n]{1,200})\]\((https?:\/\/[^\s()<>"`]+)\)/gi;
function trimUrl(u) {
  let out = u.replace(/[.,:;!?'"]+$/, '');
  // a closing bracket belongs to the link only if the link opened one (wikipedia.org/wiki/X_(Y))
  while (out.endsWith(')') && (out.match(/\(/g) || []).length < (out.match(/\)/g) || []).length) out = out.slice(0, -1).replace(/[.,:;!?'"]+$/, '');
  return out;
}
export function links(text) {
  const out = [];
  for (const m of String(text || '').matchAll(MASKED)) out.push(m[2]);
  for (const m of String(text || '').replace(MASKED, ' ').matchAll(BARE)) out.push(trimUrl(m[0]));
  return [...new Set(out)];
}
export const mentionIds = (text) => [...String(text || '').matchAll(MENTION)].map((m) => m[1].toLowerCase());
export const mentionsEveryone = (text) => { EVERYONE.lastIndex = 0; return EVERYONE.test(String(text || '')); };
// a message that's just a few emoji shows them big
const ONLY_EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

// text → HTML. ctx.who(id) → { name } (or nothing for someone unknown); ctx.chan(id) → { name } for <#channel> links
export function render(text, ctx = {}) {
  const src = String(text || '').replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
  const keep = [];                                   // finished pieces of HTML, held out of reach of the formatting below
  const hold = (html) => `\u0000${keep.push(html) - 1}\u0000`;
  // ```code blocks``` first: nothing inside them is formatted
  let s = src.replace(/```(?:([a-z0-9+#-]{1,20})\n)?([\s\S]*?)```/gi, (_, lang, code) =>
    hold(`<pre class="codeblock"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(code.replace(/^\n+|\n+$/g, ''))}</code></pre>`));
  // the lines: quotes, headings, small text and lists are blocks; everything else is ordinary text
  const out = [];
  let para = [], quote = null, list = null;
  const endPara = () => { if (para.length) { out.push(`<span class="para">${para.map(inline).join('\n')}</span>`); para = []; } };
  const endQuote = () => { if (quote) { out.push(`<blockquote>${quote.map(inline).join('\n')}</blockquote>`); quote = null; } };
  const endList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`); list = null; } };
  const end = () => { endPara(); endQuote(); endList(); };
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    let m;
    if (/^>>> ?/.test(ln)) { end(); quote = [ln.replace(/^>>> ?/, ''), ...lines.slice(i + 1)]; break; }
    if ((m = ln.match(/^> ?(.*)$/))) { endPara(); endList(); (quote = quote || []).push(m[1]); continue; }
    endQuote();
    if ((m = ln.match(/^(#{1,3}) +(\S.*)$/))) { end(); out.push(`<span class="h${m[1].length}">${inline(m[2])}</span>`); continue; }
    if ((m = ln.match(/^-# +(\S.*)$/))) { end(); out.push(`<span class="subtext">${inline(m[1])}</span>`); continue; }
    if ((m = ln.match(/^ {0,3}[-*] +(\S.*)$/)) || (m = ln.match(/^ {0,3}(\d{1,3})\. +(\S.*)$/))) {
      const tag = m.length === 3 ? 'ol' : 'ul', item = m.length === 3 ? m[2] : m[1];
      endPara();
      if (!list || list.tag !== tag) { endList(); list = { tag, items: [] }; }
      list.items.push(item); continue;
    }
    endList();
    para.push(ln);
  }
  end();
  let html = out.join('');
  // (put the held pieces back, twice over, since a held link can sit inside a held quote)
  for (let k = 0; k < 2; k++) html = html.replace(/\u0000(\d+)\u0000/g, (_, n) => keep[+n]);
  return html;

  // one line's worth: links and mentions are held first (so a _ or * in a link stays a link), then bold and the rest
  function inline(t) {
    t = t.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${esc(code)}</code>`));
    t = t.replace(MASKED, (_, label, url) => hold(`<a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" title="${esc(url)}">${esc(label)}</a>`));
    t = t.replace(BARE, (raw) => { const url = trimUrl(raw); return hold(`<a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(url)}</a>`) + raw.slice(url.length); });
    t = t.replace(MENTION, (_, id) => { const who = ctx.who && ctx.who(id.toLowerCase()); return hold(`<span class="mention" data-uid="${esc(id.toLowerCase())}">@${esc(who ? who.name : 'unknown-user')}</span>`); });
    t = t.replace(CHANNEL, (_, id) => { const c = ctx.chan && ctx.chan(id.toLowerCase()); return hold(`<span class="mention chan" data-cid="${esc(id.toLowerCase())}">#${esc(c ? c.name : 'unknown')}</span>`); });
    t = t.replace(EVERYONE, (_, pre, who) => pre + hold(`<span class="mention all">@${who}</span>`));
    t = esc(t);
    return t
      .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" title="Spoiler: click to see">$1</span>')
      .replace(/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<b>$1</b>')
      .replace(/__(?=\S)(.+?)(?<=\S)__/g, '<u>$1</u>')
      .replace(/(^|[^*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\w])/g, '$1<i>$2</i>')
      .replace(/(^|[^_\w])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![_\w])/g, '$1<i>$2</i>')
      .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '<s>$1</s>');
  }
}
export const jumbo = (text) => { const t = String(text || '').trim(); return !!t && t.length <= 60 && ONLY_EMOJI.test(t) && /\p{Extended_Pictographic}/u.test(t); };
// a message as a line of plain text (notifications, reply previews): the formatting marks and mentions made readable
export function plain(text, ctx = {}) {
  return String(text || '')
    .replace(MENTION, (_, id) => '@' + ((ctx.who && ctx.who(id.toLowerCase())) || { name: 'unknown-user' }).name)
    .replace(CHANNEL, (_, id) => '#' + ((ctx.chan && ctx.chan(id.toLowerCase())) || { name: 'unknown' }).name)
    .replace(MASKED, '$1')
    .replace(/```(?:[a-z0-9+#-]{1,20}\n)?([\s\S]*?)```/gi, '$1').replace(/`([^`]+)`/g, '$1')
    .replace(/\|\|(.+?)\|\|/g, '▒▒▒').replace(/(\*\*\*|\*\*|__|~~|\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/^(>>> ?|> ?|#{1,3} +|-# +)/gm, '').replace(/\s+/g, ' ').trim();
}
