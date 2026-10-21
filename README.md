# Fluentdat

A Discord style chat app that runs on GitHub Pages, with its data in Supabase.

Live: https://trixwotel.github.io/Fluentdat/

## What it does

* Servers with categories, text channels and voice channels, invites, Discover for public servers, roles, bans and banners
* Category settings and permissions like Discord's: private categories, and what @everyone, each role and each member may do there
* Profile connections (GitHub, Steam, TikTok, YouTube, Twitch, Spotify, X and more; the accounts you sign in with show as verified), a Board of game widgets with real covers, a Wishlist, and "Playing …" under your name
* Direct messages and group DMs (up to 10 people), with friend requests you accept or ignore
* Voice and video calls in DMs and groups (they ring), voice channels you just join, and screen sharing
* Voice messages, pictures and files (dragged in, pasted or picked, sent when you press Enter)
* Replies, @mentions, Discord's formatting (bold, italics, spoilers, code, quotes, headings, lists) and link previews for invites, GitHub and YouTube
* Unread counts, pings, muting and notification settings for every server, channel and DM, and desktop notifications
* A layout you can rearrange, themes you can edit, stickers you make, and profiles with banners and nameplates
* An emoji and sticker picker, and servers' own emoji and stickers (GIFs too), with :name: suggestions as you type
* Full profiles with mutual friends and servers, notes, blocking, ignoring and reports
* Discord's message menu: forward, bookmark, reminders, mark unread, message links and speak message
* Accounts with a username and a password (no email), from one-time links that only the people who run Fluentdat can make
* Reactions, server tags (up to four letters and a badge, worn beside your name), profile themes in any colours, and display name styles (14 fonts, 8 effects)
* A profile editor of its own with a live preview, 31 looks for the logo (themes can bring their own), and animations everywhere, each with its own switch

Signed out, everything stays in your browser. Signed in (Discord, GitHub, email, or a username from a one-time link) it is shared and live.

## How it is built

Static HTML, CSS and JavaScript modules, with no build step. Supabase keeps the data and decides who sees what (supabase/setup.sql, row level security). Calls go straight between browsers (WebRTC), meeting in private Supabase Realtime channels.

To set up your own copy, follow supabase/SETUP.md. Run `python3 tools/stamp.py` before each update.

## License

Apache License 2.0, see LICENSE.
