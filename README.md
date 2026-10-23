# Fluentdat

A Discord style chat app that runs on GitHub Pages, with its data in Supabase.

Live: https://trixwotel.github.io/Fluentdat/

## What it does

* Fluentdat's own layout (from TrixWotel's drawings): a title bar across the top, your controls at the foot of the server rail, a server's banner under its name with Browse, Guide, Event, Boost, Shop, Rules and Servers above its channels, Browse, Friends, Bank, Collection, Shop and Quest in Direct Messages, a profile beside DMs, and full profiles that float over everything
* Customize, a site of its own (customize.html): the theme, the layout (a small copy of the screen to drag and resize), every element (shown or hidden, where it goes, what it's called), messages, profiles and animations. The open chat changes with it at once, and signed in, it all follows your account to every device
* Servers with categories, text channels and voice channels, invites, Discover for public servers, roles, bans and banners
* Commands for the people who run Fluentdat (type / in a server): ban someone from all of Fluentdat and let them back in, take someone out of a server, and give Datbux
* Accounts with as many ways in as you like (Discord, GitHub, email, a password), Transfer Ownership for servers, and deleting your account
* Profile privacy: choose who sees your mutual friends, Collection, Wishlist, Game Collection, Favorite Game, Activity, what you're playing, connections, member since, boosting since and badges (everyone, friends, or only you); your name, picture, decorations, banner and About are always shown
* Browse in Direct Messages: search the messages and files in all your DMs and group chats at once (Files, Images, Videos, Links, and from someone)
* Keyboard shortcuts you can change (User Settings → Keyboard Shortcuts, or Customize → Layout): hide the sidebar (⇧⌘S, Ctrl+Shift+S elsewhere), the member list or the server rail
* Category settings and permissions like Discord's: private categories, and what @everyone, each role and each member may do there
* Profile connections (GitHub, Steam, TikTok, YouTube, Twitch, Spotify, X and more; the accounts you sign in with show as verified; shown as the services' own logos, as tiles in your theme's colours, or as white tiles), a Board of game widgets, a Wishlist, a Collection that logs what they got from the Shop and the badges they earned (and when), and "Playing …" under your name; any game on Wikipedia, with its cover, by search or from Wikipedia's lists of PC games A–Z
* Datbux, Fluentdat's own money: earned with daily, weekly, monthly and yearly tasks, spent in the Shop and on Server Boosts, and sent or traded (with Shop things too) between people who know each other
* A Shop where everything costs Datbux: 10 bundles (2 to 5 things that go together, priced 10–25% under what they cost one by one, the bigger the bundle the more; 10% less again on the holiday a bundle is made for, like Halloween, and every bundle 10–15% less on sale days like Black Friday; what you have already isn't paid for again), 132 avatar decorations (about a week of tasks each: rings, ears and horns, hats, glasses, moods, flowers, critters, food, space, holidays, games and magic), 33 name fonts, 29 profile effects, 32 profile frames and 30 moving nameplates (designed ones; plain colours and your own pictures stay free). Quests give some of them for free
* Server extras like Discord's: Browse Channels, Game Servers (Minecraft ones say whether they're up), a Server Guide and Events, each switched on by the server's admins
* Threads, pinned messages, and search for a whole server or DM (words, from:, in:, has: links, files, pictures or videos)
* Linked channels: link a text channel with channels in other servers (up to 10), and what's said in one shows in the others under who said it, where and when, with a line between, or all on one line like “#build-log / Trix / 3:41 PM / motor mount is printed” (Customize → Messages picks the look, its parts and their order)
* Discord channels linked too (up to 10 a channel): what's said on Discord shows here with Discord's mark, and what's said here shows there under each person's name, like “TrixWotel (#sync)”, both read and written by the database every 2 seconds (a webhook in each Discord channel, and Fluentdat's own bot: supabase/SETUP.md, step 11)
* Text and code files shown in the chat (their first lines, which open out, wrap, or show the whole file)
* Discord's server menu: Server Boost (25 Datbux a day, paid ahead and renewing itself; levels hold more emoji and stickers), App Directory, Privacy Settings (DMs from a server's people), per-server nicknames, role icons (an emoji or a picture, beside names), and choosing which roles show separately in the member list
* Profiles like Discord's: a status bubble beside your picture, 100 badges to earn from Common to Legendary plus 10 secret ones (progress, and Customize to order and hide them), Profile Frames in the Shop, Game Collection and Wishlist rows, statuses for a while (15 minutes to 3 days), and an editor with a "Change …" window for every look
* Direct messages and group DMs (up to 10 people), with friend requests you accept or ignore
* Voice and video calls in DMs and groups (they ring), voice channels you just join, and screen sharing
* Voice messages, pictures and files (dragged in, pasted or picked, sent when you press Enter)
* Replies, @mentions, Discord's formatting (bold, italics, spoilers, code, quotes, headings, lists) and link previews for invites, GitHub and YouTube
* Unread counts, pings, muting and notification settings for every server, channel and DM, and desktop notifications
* Pictures you move and scale in their frame before using them: your avatar, banner and nameplate, server and group icons, server banners and role icons
* A layout you can rearrange (rounded panels or flat ones; the member list and DM profile flush beside the chat, as a card in it, or as a column of their own), themes you can edit, stickers you make, and profiles with banners and nameplates
* An emoji and sticker picker, and servers' own emoji and stickers (GIFs too), with :name: suggestions as you type
* Full profiles with mutual friends and servers, notes, blocking, ignoring and reports
* Discord's message menu: forward, bookmark, reminders, mark unread, message links and speak message
* Accounts with a username and a password (no email), from one-time links that only the people who run Fluentdat can make
* Reactions, server tags (up to four letters and a badge, worn beside your name), profile themes in any colours, and display name styles (33 fonts from the Shop, 8 effects)
* A profile editor of its own with a live preview, 31 looks for the logo (themes can bring their own), and animations everywhere, each with its own switch

Signed out, everything stays in your browser. Signed in (Discord, GitHub, email, or a username from a one-time link) it is shared and live.

## How it is built

Static HTML, CSS (app.css) and JavaScript modules, with no build step. Supabase keeps the data and decides who sees what (supabase/setup.sql, row level security). Calls go straight between browsers (WebRTC), meeting in private Supabase Realtime channels.

To set up your own copy, follow supabase/SETUP.md. Run `python3 tools/stamp.py` before each update (it also makes customize.html from index.html).

## License

Apache License 2.0, see LICENSE.
