# Fluentdat

A Discord style chat app that runs on GitHub Pages, with its data in Supabase.

Live: https://trixwotel.github.io/Fluentdat/

## What it does

* Servers with categories, text channels and voice channels, invites, Discover for public servers, roles, bans and banners
* Direct messages and group DMs (up to 10 people), with friend requests you accept or ignore
* Voice and video calls in DMs and groups (they ring), voice channels you just join, and screen sharing
* Voice messages, pictures and files (dragged in, pasted or picked, sent when you press Enter)
* Replies, @mentions, Discord's formatting (bold, italics, spoilers, code, quotes, headings, lists) and link previews for invites, GitHub and YouTube
* Unread counts, pings, muting and notification settings for every server, channel and DM, and desktop notifications
* A layout you can rearrange, themes you can edit, stickers you make, and profiles with banners and nameplates

Signed out, everything stays in your browser. Signed in (Discord, GitHub or email) it is shared and live.

## How it is built

Static HTML, CSS and JavaScript modules, with no build step. Supabase keeps the data and decides who sees what (supabase/setup.sql, row level security). Calls go straight between browsers (WebRTC), meeting in private Supabase Realtime channels.

To set up your own copy, follow supabase/SETUP.md. Run `python3 tools/stamp.py` before each update.

## License

Apache License 2.0, see LICENSE.
