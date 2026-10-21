// Connections and games on profiles, like Discord's.
// Connections are links to your accounts elsewhere: each service knows how to tidy what you type (a pasted link becomes
// the name in it), what a name there looks like, and how to link to it. The database marks one verified when it's an
// account you sign in with.
// Games go on the Board's widgets, the Wishlist and Activity. A cover comes from Steam's own picture server by the game's
// Steam number, a big game that isn't on Steam shows its logo from Wikimedia Commons, and anything else gets a tile made
// from its name (or a picture you add). Pictures load without telling those sites which page asked. Searching for games
// asks Wikidata, which answers any web page.
// Brand icons: Simple Icons 16.35.0 (CC0 1.0). Xbox isn't in it any more, so it gets a controller.
import { el, icon } from './ui.js';

const enc = encodeURIComponent;
// { id, name, color, path (a 24 × 24 brand drawing) or icon (one of Fluentdat's), hint, re (a name there), from (finds the
// name in a pasted link), link(connection) → its address or null, verify (the sign-in it can be checked against) }
export const SERVICES = [
  { id: 'discord', name: "Discord", color: '#5865f2', path: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z', hint: "Your Discord username", re: /^[a-z0-9_.]{2,32}$/i, link: (c) => (c.u && /^\d{5,25}$/.test(c.u) ? `https://discord.com/users/${c.u}` : null), verify: 'discord' },
  { id: 'github', name: "GitHub", color: '#181717', path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12', hint: "Your GitHub username, or a link to your profile", re: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, from: /github\.com\/([A-Za-z0-9-]{1,39})/i, link: (c) => `https://github.com/${enc(c.n)}`, verify: 'github' },
  { id: 'steam', name: "Steam", color: '#000000', path: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z', hint: "Your Steam custom URL name or 17-digit ID, or a link to your profile", re: /^[A-Za-z0-9_-]{2,32}$/, from: /steamcommunity\.com\/(?:id|profiles)\/([^/?#\s]+)/i, link: (c) => (/^\d{17}$/.test(c.n) ? `https://steamcommunity.com/profiles/${c.n}` : `https://steamcommunity.com/id/${enc(c.n)}`) },
  { id: 'tiktok', name: "TikTok", color: '#000000', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z', hint: "Your TikTok username", re: /^[A-Za-z0-9_.]{2,24}$/, from: /tiktok\.com\/@([^/?#\s]+)/i, link: (c) => `https://www.tiktok.com/@${enc(c.n)}` },
  { id: 'youtube', name: "YouTube", color: '#ff0000', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', hint: "Your YouTube handle (the @name)", re: /^[A-Za-z0-9_.-]{3,30}$/, from: /youtube\.com\/@([^/?#\s]+)/i, link: (c) => `https://www.youtube.com/@${enc(c.n)}` },
  { id: 'twitch', name: "Twitch", color: '#9146ff', path: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z', hint: "Your Twitch username", re: /^[A-Za-z0-9_]{3,25}$/, from: /twitch\.tv\/([^/?#\s]+)/i, link: (c) => `https://www.twitch.tv/${enc(c.n)}`, verify: 'twitch' },
  { id: 'spotify', name: "Spotify", color: '#1ed760', path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z', hint: "Your Spotify username, or a link to your profile", re: /^[A-Za-z0-9._-]{1,64}$/, from: /open\.spotify\.com\/user\/([^/?#\s]+)/i, link: (c) => `https://open.spotify.com/user/${enc(c.u || c.n)}`, verify: 'spotify' },
  { id: 'x', name: "X", color: '#000000', path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z', hint: "Your X username", re: /^[A-Za-z0-9_]{1,15}$/, from: /(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i, link: (c) => `https://x.com/${enc(c.n)}`, verify: 'twitter' },
  { id: 'instagram', name: "Instagram", color: '#ff0069', path: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077', hint: "Your Instagram username", re: /^[A-Za-z0-9_.]{1,30}$/, from: /instagram\.com\/([^/?#\s]+)/i, link: (c) => `https://www.instagram.com/${enc(c.n)}` },
  { id: 'reddit', name: "Reddit", color: '#ff4500', path: 'M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z', hint: "Your Reddit username (without u/)", re: /^[A-Za-z0-9_-]{3,20}$/, from: /reddit\.com\/(?:u|user)\/([^/?#\s]+)/i, link: (c) => `https://www.reddit.com/user/${enc(c.n)}` },
  { id: 'roblox', name: "Roblox", color: '#000000', path: 'M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z', hint: "Your Roblox username, or a link to your profile", re: /^(?:[A-Za-z0-9_]{3,20}|\d{1,15})$/, from: /roblox\.com\/users\/(\d+)/i, link: (c) => (/^\d+$/.test(c.n) ? `https://www.roblox.com/users/${c.n}/profile` : `https://www.roblox.com/user.aspx?username=${enc(c.n)}`) },
  { id: 'bluesky', name: "Bluesky", color: '#1185fe', path: 'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026', hint: "Your Bluesky handle, like name.bsky.social", re: /^[A-Za-z0-9.-]{3,253}$/, from: /bsky\.app\/profile\/([^/?#\s]+)/i, link: (c) => `https://bsky.app/profile/${enc(c.n)}` },
  { id: 'xbox', name: "Xbox", color: '#107c10', icon: 'game', hint: "Your Xbox gamertag", re: /^[A-Za-z0-9 ]{1,16}(#\d{1,4})?$/, link: null },
  { id: 'playstation', name: "PlayStation Network", color: '#0070d1', path: 'M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z', hint: "Your PSN online ID", re: /^[A-Za-z][A-Za-z0-9_-]{2,15}$/, link: null },
  { id: 'epicgames', name: "Epic Games", color: '#313131', path: 'M3.537 0C2.165 0 1.66.506 1.66 1.879V18.44a4.262 4.262 0 00.02.433c.031.3.037.59.316.92.027.033.311.245.311.245.153.075.258.13.43.2l8.335 3.491c.433.199.614.276.928.27h.002c.314.006.495-.071.928-.27l8.335-3.492c.172-.07.277-.124.43-.2 0 0 .284-.211.311-.243.28-.33.285-.621.316-.92a4.261 4.261 0 00.02-.434V1.879c0-1.373-.506-1.88-1.878-1.88zm13.366 3.11h.68c1.138 0 1.688.553 1.688 1.696v1.88h-1.374v-1.8c0-.369-.17-.54-.523-.54h-.235c-.367 0-.537.17-.537.539v5.81c0 .369.17.54.537.54h.262c.353 0 .523-.171.523-.54V8.619h1.373v2.143c0 1.144-.562 1.71-1.7 1.71h-.694c-1.138 0-1.7-.566-1.7-1.71V4.82c0-1.144.562-1.709 1.7-1.709zm-12.186.08h3.114v1.274H6.117v2.603h1.648v1.275H6.117v2.774h1.74v1.275h-3.14zm3.816 0h2.198c1.138 0 1.7.564 1.7 1.708v2.445c0 1.144-.562 1.71-1.7 1.71h-.799v3.338h-1.4zm4.53 0h1.4v9.201h-1.4zm-3.13 1.235v3.392h.575c.354 0 .523-.171.523-.54V4.965c0-.368-.17-.54-.523-.54zm-3.74 10.147a1.708 1.708 0 01.591.108 1.745 1.745 0 01.49.299l-.452.546a1.247 1.247 0 00-.308-.195.91.91 0 00-.363-.068.658.658 0 00-.28.06.703.703 0 00-.224.163.783.783 0 00-.151.243.799.799 0 00-.056.299v.008a.852.852 0 00.056.31.7.7 0 00.157.245.736.736 0 00.238.16.774.774 0 00.303.058.79.79 0 00.445-.116v-.339h-.548v-.565H7.37v1.255a2.019 2.019 0 01-.524.307 1.789 1.789 0 01-.683.123 1.642 1.642 0 01-.602-.107 1.46 1.46 0 01-.478-.3 1.371 1.371 0 01-.318-.455 1.438 1.438 0 01-.115-.58v-.008a1.426 1.426 0 01.113-.57 1.449 1.449 0 01.312-.46 1.418 1.418 0 01.474-.309 1.58 1.58 0 01.598-.111 1.708 1.708 0 01.045 0zm11.963.008a2.006 2.006 0 01.612.094 1.61 1.61 0 01.507.277l-.386.546a1.562 1.562 0 00-.39-.205 1.178 1.178 0 00-.388-.07.347.347 0 00-.208.052.154.154 0 00-.07.127v.008a.158.158 0 00.022.084.198.198 0 00.076.066.831.831 0 00.147.06c.062.02.14.04.236.061a3.389 3.389 0 01.43.122 1.292 1.292 0 01.328.17.678.678 0 01.207.24.739.739 0 01.071.337v.008a.865.865 0 01-.081.382.82.82 0 01-.229.285 1.032 1.032 0 01-.353.18 1.606 1.606 0 01-.46.061 2.16 2.16 0 01-.71-.116 1.718 1.718 0 01-.593-.346l.43-.514c.277.223.578.335.9.335a.457.457 0 00.236-.05.157.157 0 00.082-.142v-.008a.15.15 0 00-.02-.077.204.204 0 00-.073-.066.753.753 0 00-.143-.062 2.45 2.45 0 00-.233-.062 5.036 5.036 0 01-.413-.113 1.26 1.26 0 01-.331-.16.72.72 0 01-.222-.243.73.73 0 01-.082-.36v-.008a.863.863 0 01.074-.359.794.794 0 01.214-.283 1.007 1.007 0 01.34-.185 1.423 1.423 0 01.448-.066 2.006 2.006 0 01.025 0zm-9.358.025h.742l1.183 2.81h-.825l-.203-.499H8.623l-.198.498h-.81zm2.197.02h.814l.663 1.08.663-1.08h.814v2.79h-.766v-1.602l-.711 1.091h-.016l-.707-1.083v1.593h-.754zm3.469 0h2.235v.658h-1.473v.422h1.334v.61h-1.334v.442h1.493v.658h-2.255zm-5.3.897l-.315.793h.624zm-1.145 5.19h8.014l-4.09 1.348z', hint: "Your Epic Games display name", re: /^.{3,32}$/, link: null },
  { id: 'battlenet', name: "Battle.net", color: '#4381c3', path: 'M18.94 8.296C15.9 6.892 11.534 6 7.426 6.332c.206-1.36.714-2.308 1.548-2.508 1.148-.275 2.4.48 3.594 1.854.782.102 1.71.28 2.355.429C12.747 2.013 9.828-.282 7.607.565c-1.688.644-2.553 2.97-2.448 6.094-2.2.468-3.915 1.3-5.013 2.495-.056.065-.181.227-.137.305.034.058.146-.008.194-.04 1.274-.89 2.904-1.373 5.027-1.676.303 3.333 1.713 7.56 4.055 10.952-1.28.502-2.356.536-2.946-.087-.812-.856-.784-2.318-.19-4.04a26.764 26.764 0 0 1-.807-2.254c-2.459 3.934-2.986 7.61-1.143 9.11 1.402 1.14 3.847.725 6.502-.926 1.505 1.672 3.083 2.74 4.667 3.094.084.015.287.043.332-.034.034-.06-.08-.124-.131-.149-1.408-.657-2.64-1.828-3.964-3.515 2.735-1.929 5.691-5.263 7.457-8.988 1.076.86 1.64 1.773 1.398 2.595-.336 1.131-1.615 1.84-3.403 2.185a27.697 27.697 0 0 1-1.548 1.826c4.634.16 8.08-1.22 8.458-3.565.286-1.786-1.295-3.696-4.053-5.17.696-2.139.832-4.04.346-5.588-.029-.08-.106-.27-.196-.27-.068 0-.067.13-.063.187.135 1.547-.263 3.2-1.062 5.19zm-8.533 9.869c-1.96-3.145-3.09-6.849-3.082-10.594 3.702-.124 7.474.748 10.714 2.627-1.743 3.269-4.385 6.1-7.633 7.966h.001z', hint: "Your BattleTag, like Name#1234", re: /^[^#\s]{2,16}#\d{3,6}$/, link: null },
  { id: 'riot', name: "Riot Games", color: '#eb0029', path: 'M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z', hint: "Your Riot ID, like Name#TAG", re: /^[^#]{3,16}#[A-Za-z0-9]{2,5}$/, link: null },
  { id: 'leagueoflegends', name: "League of Legends", color: '#c28f2c', path: 'm1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74a9.738 9.738 0 0 1 2.648-.368c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.273.954-.602 2.112c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Zm0 2.673c-.924 0-1.814.148-2.648.414v13.713h8.817a8.246 8.246 0 0 0 2.36-5.768c0-4.617-3.818-8.359-8.529-8.359zM2.104 7.312A10.858 10.858 0 0 0 .75 12.576c0 1.906.492 3.7 1.355 5.266z', hint: "Your Riot ID, like Name#TAG", re: /^[^#]{3,16}#[A-Za-z0-9]{2,5}$/, link: null },
  { id: 'crunchyroll', name: "Crunchyroll", color: '#ff5e00', path: 'M2.909 13.436C2.914 7.61 7.642 2.893 13.468 2.898c5.576.005 10.137 4.339 10.51 9.819q.021-.351.022-.706C24.007 5.385 18.64.006 12.012 0S.007 5.36 0 11.988 5.36 23.994 11.988 24q.412 0 .815-.027c-5.526-.338-9.9-4.928-9.894-10.538Zm16.284.155a4.1 4.1 0 0 1-4.095-4.103 4.1 4.1 0 0 1 2.712-3.855 8.95 8.95 0 0 0-4.187-1.037 9.007 9.007 0 1 0 8.997 9.016q-.001-.847-.15-1.651a4.1 4.1 0 0 1-3.278 1.63Z', hint: "Your Crunchyroll username", re: /^.{2,40}$/, link: null },
  { id: 'website', name: "Website", color: '#5865f2', icon: 'globe', hint: "Your website’s address (https://…)", re: /^https:\/\/[^\s<>\"]+\.[^\s<>\"]+$/, link: (c) => c.n },
];
export const SERVICE = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// a service's icon: its colour (a dark one shows in the page's text colour), or in a white tile as on Discord's profiles
export function brandIcon(id, size = 20, { tile = false } = {}) {
  const s = SERVICE[id] || SERVICE.website;
  const b = el('span', { className: 'bi' + (tile ? ' bi-tile' : '') + (lum(s.color) < 0.25 ? ' dark' : ''), title: s.name });
  b.style.setProperty('--bc', s.color);
  if (s.path) b.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${s.path}"/></svg>`;
  else b.append(icon(s.icon, size));
  return b;
}
// what you typed, tidied into a name there: { n } or { error }
export function parseConnection(id, raw) {
  const s = SERVICE[id]; let v = String(raw || '').trim();
  if (!s) return { error: 'Fluentdat doesn’t know that service.' };
  if (s.from) { const m = v.match(s.from); if (m) v = decodeURIComponent(m[1]); }
  if (id !== 'website') v = v.replace(/^@/, '').replace(/^u\//i, '');
  if (!v) return { error: s.hint + '.' };
  if (v.length > 100 || !s.re.test(v)) return { error: id === 'website' ? 'That doesn’t look like a website address (it needs https://).' : `That doesn’t look like a name on ${s.name}. ${s.hint}.` };
  return { n: v };
}
export const connectionLink = (c) => { const s = SERVICE[c && c.s]; try { return s && s.link ? s.link(c) : null; } catch { return null; } };
// how a connection reads on a profile (a website by its address without https://)
export const connectionLabel = (c) => (c.s === 'website' ? String(c.n).replace(/^https:\/\//, '').replace(/\/$/, '') : c.n);

// ---------- games ----------
const STEAM_ID = /^\d{1,10}$/, LOGO = /^[^/\\?#<>|"{}\u0000-\u001f]{1,180}\.(svg|png|jpe?g|gif|webp)$/i, PIC = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const steamCover = (id, file = 'library_600x900.jpg') => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/${file}`;
export const commonsFile = (name, w = 320) => `https://commons.wikimedia.org/wiki/Special:FilePath/${enc(name)}?width=${w}`;
// a game as a profile keeps it: { n: name, s: Steam number, l: logo on Commons, i: a picture of its own } (only what's sound)
export function cleanGame(g) {
  if (!g) return null;
  const n = String(g.n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80); if (!n) return null;
  const out = { n };
  if (STEAM_ID.test(g.s || '')) out.s = g.s; else if (LOGO.test(g.l || '')) out.l = g.l;
  if (!out.s && !out.l && PIC.test(g.i || '') && g.i.length <= 40000) out.i = g.i;
  return out;
}
const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 17);
const letters = (s) => String(s).replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
// a game's tile: its cover, else its logo, else one made from its name
export function gameTile(g, { big = false } = {}) {
  const t = el('div', { className: 'gt' + (big ? ' big' : ''), title: g.n });
  const made = () => { t.className = 'gt gen' + (big ? ' big' : ''); t.style.setProperty('--gh', hue(g.n)); t.replaceChildren(el('b', {}, letters(g.n)), el('span', {}, g.n)); };
  const pic = (src) => { const im = el('img', { src, alt: g.n, loading: 'lazy', draggable: false }); im.referrerPolicy = 'no-referrer'; return im; };
  if (STEAM_ID.test(g.s || '')) {
    const im = pic(steamCover(g.s));
    im.onerror = () => { im.onerror = made; t.classList.add('wide'); im.src = steamCover(g.s, 'header.jpg'); };      // (no tall cover: the wide one)
    t.append(im);
  } else if (LOGO.test(g.l || '')) { const im = pic(commonsFile(g.l)); im.onerror = made; t.classList.add('logo'); t.append(im, el('span', {}, g.n)); }
  else if (PIC.test(g.i || '')) { const im = pic(g.i); im.onerror = made; t.append(im); }
  else made();
  return t;
}
// is this "playing" still going? (Fluentdat can't see games end, so after 12 hours it stops showing)
export const playingNow = (p) => !!(p && p.n && (!p.at || Date.now() - Date.parse(p.at) < 12 * 3600e3));
// the Board's widgets: [kind, title, how many games]
export const WIDGETS = [['likes', 'Games I Like', 20], ['want', 'Want to Play', 20], ['fav', 'Favorite Game', 1]];

// games to pick from straight away (Steam's numbers checked against Steam; logos for big games that aren't on Steam)
export const POPULAR = [
  ["Counter-Strike 2", '730'],
  ["Minecraft", '', "Minecraft Logo-en.svg"],
  ["Fortnite", '', "FortniteLogo.svg"],
  ["Valorant", '', "Valorant logo.svg"],
  ["Roblox", '', "Roblox Logo 2022.svg"],
  ["League of Legends", '', "League of Legends 2019 vector.svg"],
  ["Call of Duty", '1938090'],
  ["Apex Legends", '1172470'],
  ["Rust", '252490'],
  ["Grand Theft Auto V", '271590'],
  ["Rocket League", '252950'],
  ["Dota 2", '570'],
  ["PUBG: BATTLEGROUNDS", '578080'],
  ["Marvel Rivals", '2767030'],
  ["Tom Clancy's Rainbow Six Siege", '359550'],
  ["Arma Reforger", '1874880'],
  ["Bodycam", '2406770'],
  ["Arma 3", '107410'],
  ["Ready or Not", '1144200'],
  ["Squad", '393380'],
  ["Hell Let Loose", '686810'],
  ["Terraria", '105600'],
  ["Stardew Valley", '413150'],
  ["ELDEN RING", '1245620'],
  ["Baldur's Gate 3", '1086940'],
  ["HELLDIVERS 2", '553850'],
  ["Lethal Company", '1966720'],
  ["R.E.P.O.", '3241660'],
  ["Among Us", '945360'],
  ["Phasmophobia", '739630'],
  ["Garry's Mod", '4000'],
  ["Team Fortress 2", '440'],
  ["Overwatch", '2357570'],
  ["Destiny 2", '1085660'],
  ["Warframe", '230410'],
  ["THE FINALS", '2073850'],
  ["Deadlock", '1422450'],
  ["Battlefield 6", '2807960'],
  ["Battlefield 2042", '1517290'],
  ["War Thunder", '236390'],
  ["Satisfactory", '526870'],
  ["Factorio", '427520'],
  ["Kerbal Space Program", '220200'],
  ["Besiege", '346010'],
  ["Portal 2", '620'],
  ["Hollow Knight", '367520'],
  ["Celeste", '504230'],
  ["Hades", '1145360'],
  ["Hades II", '1145350'],
  ["Subnautica", '264710'],
  ["Valheim", '892970'],
  ["RimWorld", '294100'],
  ["Red Dead Redemption 2", '1174180'],
  ["Cyberpunk 2077", '1091500'],
  ["Palworld", '1623730'],
  ["Sea of Thieves", '1172620'],
  ["Forza Horizon 5", '1551360'],
  ["Euro Truck Simulator 2", '227300'],
  ["Fall Guys", '1097150'],
  ["Dead by Daylight", '381210'],
  ["Halo Infinite", '1240440'],
  ["Sons Of The Forest", '1326470'],
  ["Monster Hunter Wilds", '2246340'],
  ["Path of Exile 2", '2694490'],
  ["ARC Raiders", '1808500'],
  ["Clair Obscur: Expedition 33", '1903340'],
  ["Age of Empires II: Definitive Edition", '813780'],
  ["Age of Empires IV", '1466860'],
  ["ARK: Survival Ascended", '2399830'],
  ["ARK: Survival Evolved", '346110'],
  ["Content Warning", '2881650'],
  ["Crusader Kings III", '1158310'],
  ["DAVE THE DIVER", '1868140'],
  ["Diablo IV", '2344520'],
  ["EA SPORTS FC 24", '2195250'],
  ["EA SPORTS FC 26", '3405690'],
  ["Far Cry 6", '2369390'],
  ["FINAL FANTASY XIV Online", '39210'],
  ["Football Manager 2024", '2252570'],
  ["God of War", '1593500'],
  ["Hogwarts Legacy", '990080'],
  ["Horizon Forbidden West", '2420110'],
  ["Hunt: Showdown 1896", '594650'],
  ["Left 4 Dead 2", '550'],
  ["Lost Ark", '1599340'],
  ["Mafia: Definitive Edition", '1030840'],
  ["Marvel’s Spider-Man Remastered", '1817070'],
  ["Mortal Kombat 1", '1971870'],
  ["NARAKA: BLADEPOINT", '1203220'],
  ["New World: Aeternum", '1063730'],
  ["Once Human", '2139460'],
  ["Resident Evil 4", '2050650'],
  ["Risk of Rain 2", '632360'],
  ["Sid Meier's Civilization VII", '1295660'],
  ["Sid Meier’s Civilization VI", '289070'],
  ["Starfield", '1716740'],
  ["Stellaris", '281990'],
  ["Street Fighter 6", '1364780'],
  ["The Last of Us Part I", '1888930'],
  ["The Sims 4", '1222670'],
  ["VRChat", '438100'],
  ["Yu-Gi-Oh! Master Duel", '1449850'],
].map(([n, s, l]) => (s ? { n, s } : { n, l }));
const plainName = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
export const sameGame = (a, b) => (a.s && b.s ? a.s === b.s : plainName(a.n) === plainName(b.n));
export function localGames(q) {
  const k = plainName(q); if (!k) return POPULAR.slice();
  return POPULAR.filter((g) => plainName(g.n).includes(k));
}
// any game, from Wikidata: things it calls a video game (or that have a Steam number), with their Steam number and logo
const WD = 'https://www.wikidata.org/w/api.php', asked = new Map();
async function wd(params) {
  const r = await fetch(WD + '?' + new URLSearchParams({ ...params, format: 'json', origin: '*' }),
    { headers: { 'Api-User-Agent': 'Fluentdat (https://trixwotel.github.io/Fluentdat/)' }, referrerPolicy: 'no-referrer', credentials: 'omit' });
  if (!r.ok) throw new Error('Wikidata didn’t answer (' + r.status + ').');
  return r.json();
}
const NOT_GAMES = /\b(film|movie|series|franchise|soundtrack|album|song|character|company|developer|publisher|tournament|championship|league season|esports|person|family name|given name|novel|book|comic|anime|manga|board game|card game)\b/i;
export function searchGames(q) {
  const key = plainName(q);
  if (key.length < 2) return Promise.resolve([]);
  if (!asked.has(key)) {
    const run = (async () => {
      const s = await wd({ action: 'wbsearchentities', search: q.trim(), language: 'en', uselang: 'en', type: 'item', limit: 15 });
      const hits = (s.search || []).filter((x) => !NOT_GAMES.test(x.description || ''));
      if (!hits.length) return [];
      const e = await wd({ action: 'wbgetentities', ids: hits.map((x) => x.id).join('|'), props: 'claims|labels', languages: 'en' });
      const out = [];
      for (const h of hits) {
        const it = (e.entities || {})[h.id]; if (!it) continue;
        const claims = it.claims || {}, val = (p) => (claims[p] || []).map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter((v) => v != null);
        const steam = val('P1733').find((v) => STEAM_ID.test(String(v)));
        const game = steam || val('P31').some((v) => v && v.id === 'Q7889') || /\bgame\b/i.test(h.description || '');
        const n = ((it.labels || {}).en || {}).value || h.label;
        if (!game || !n) continue;
        const logo = val('P154').find((v) => LOGO.test(String(v)));
        out.push({ ...cleanGame({ n, s: steam ? String(steam) : '', l: logo || '' }), d: String(h.description || '').slice(0, 80) });
      }
      return out;
    })();
    asked.set(key, run);
    run.catch(() => asked.delete(key));
  }
  return asked.get(key);
}
