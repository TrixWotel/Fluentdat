# Turning on sign-in (Supabase)

Fluentdat's **Continue with Discord**, **Continue with GitHub** and **email** sign-in run on a free Supabase project. You set it up once, in about 15 minutes. Until then the app works as before: everything stays in your browser, or you sign in with a GitHub token.

> **Updating Fluentdat?** When a new version needs more from the database (like calls, voice messages, files, group DMs and friend requests did), the app shows a banner saying so. Run all of [`setup.sql`](setup.sql) again (step 2 below). It keeps everything that's already there.

## 1. Make the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (Continue with GitHub works).
2. **New project**: name it `fluentdat` and pick a region near you. Set a database password and keep it in your password manager. Fluentdat never needs it.
3. Wait a minute or two while it sets up.

## 2. Make the database

1. In the project, open **SQL Editor** and click **New query**.
2. Paste all of [`setup.sql`](setup.sql) and click **Run**. It should finish with “Success. No rows returned”.

This makes the tables and the rules that decide who can read what, the private **files** bucket for attachments and voice messages and the public **expressions** bucket for servers' emoji and stickers (Storage), and the rules for calls' private channels (Realtime). It's safe to run again after an update, because it replaces what it made before.

## 3. Tell Supabase where Fluentdat lives

**Authentication → URL Configuration**

1. **Site URL**: `https://trixwotel.github.io/Fluentdat/`
2. **Redirect URLs → Add URL**: `https://trixwotel.github.io/Fluentdat/`

## 4. Discord sign-in

1. First find your **callback URL** in Supabase: **Authentication → Sign In / Providers → Discord** (click it to open). It looks like `https://abcdefghijkl.supabase.co/auth/v1/callback`. Keep that tab open.
2. In a new tab open the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it `Fluentdat` → **Create**.
3. On the left, open **OAuth2**. Under **Redirects** click **Add Redirect**, paste the callback URL from step 1, and click **Save Changes**.
4. On the same page copy the **Client ID**. Click **Reset Secret** and copy the **Client Secret**.
5. Back in Supabase's Discord panel: turn **Enable Sign in with Discord** on, paste the Client ID and Client Secret, and click **Save**.

## 5. GitHub sign-in (optional)

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Application name** `Fluentdat`, **Homepage URL** `https://trixwotel.github.io/Fluentdat/`, **Authorization callback URL**: the same Supabase callback URL as in step 4.
3. **Register application**, copy the **Client ID**, then **Generate a new client secret** and copy it.
4. In Supabase: **Authentication → Sign In / Providers → GitHub**, turn it on, paste both and **Save**.

## 6. Email sign-in

Email is on from the start, but Supabase's built-in sender only delivers to the people on your Supabase team (so: you), and only about 2 emails an hour. That's fine for trying it with your own address. For your teammates:

1. Make a free account with an email sending service such as Resend or Brevo, and follow its guide for Supabase SMTP.
2. In Supabase: **Authentication → Emails → SMTP Settings**, turn on custom SMTP and fill in what the service gives you.

Worth doing too: put the sign-in **code** in the email, so someone who reads their email on their phone can still sign in on a school laptop. **Authentication → Emails → Templates → Magic Link**, and add this line to the message:

```html
<p>Or type this code in Fluentdat: <b>{{ .Token }}</b></p>
```

## 7. Connect Fluentdat

Click **Connect** at the top of your project (or open **Project Settings → API Keys**) and copy:

1. the **Project URL**, like `https://abcdefghijkl.supabase.co`
2. the **Publishable key**, which starts with `sb_publishable_` (the older “anon public” key works too)

Send both to Claude, or put them in [`config.js`](../config.js) yourself:

```js
export const SUPABASE = {
  url: 'https://abcdefghijkl.supabase.co',
  anonKey: 'sb_publishable_...',
};
```

Both are meant to be public, and anyone can see them in the page. The publishable key can only do what the rules in `setup.sql` allow. **Never** put the secret key (`sb_secret_...`), the old `service_role` key or the database password anywhere in Fluentdat.

## 8. Calls (nothing to do, usually)

Calls go straight between browsers, so Supabase only introduces them (through private Realtime channels that `setup.sql` sets up). Two public STUN servers help browsers find each other through home routers.

Some networks, like many schools and offices, block direct connections. There a call needs a **TURN server** to pass it along. If calls connect for some people but not others, get one (Metered, Twilio and Cloudflare have free tiers) and add it to `ICE_SERVERS` in [`config.js`](../config.js). Its login is visible to anyone, so use one meant for that.

## 9. One-time links: accounts with a username and password

Someone without Discord, GitHub or an email address you can reach can still join, from a link only you can make:

1. Sign in to Fluentdat as **@trixwotel**. `setup.sql` makes that account one of the people who run Fluentdat, so run it again (step 2) if you made the account after running it.
2. **User Settings → Invites & Reports → Create Link**, and send the link to one person. It works once.
3. They open it, pick a username and a password, and they're in. Next time they use **Log in with a username and password**.

There's no email to reset a forgotten password, so they should keep it safe (they can change it in **My Account**). The same page lists your links (take back one nobody has used) and anything people have reported.

To let someone else make links too, run this in the SQL Editor with their @handle:

```sql
insert into public.app_admins (user_id) select id from public.profiles where handle = 'their_handle' on conflict do nothing;
```

Password sign-in uses Supabase's **Email** provider, which is on from the start: leave **Authentication → Sign In / Providers → Email** turned on.

## 10. Boosts that renew while nobody's on (optional)

A boost gets its next day while the person boosting has Fluentdat open (in its last day). To renew boosts even when nobody has Fluentdat open:

1. In Supabase open **Database → Extensions**, search for **pg_cron** and turn it on.
2. Run `setup.sql` again (step 2). From then on the database renews boosts every hour, while each person's Datbux last.

## What the rules allow

The database checks these itself, so they hold even if someone changes the app:

1. Anyone can make an account, but a stranger sees nothing. You only see servers you belong to.
2. You join a server with an invite link that one of its admins made. Links can expire and have a limit on uses.
3. The owner picks admins. Admins make channels and invites, remove members, and delete messages. Only the owner can remove an admin or delete the server.
4. A DM is visible only to the two people in it. You can DM people you share a server with, or who have added you as a friend.
5. Friends are added by exact @handle. Nobody can browse a list of everyone.
6. Nobody can post as somebody else.
7. Only the owner can make a server public. Then anyone signed in can find it in Discover and join. Admins can ban people, and a banned person can't come back by invite or from Discover until the ban is lifted.
8. Admins can make roles (a name and a colour) and hand them out. Roles change how names look and group the member list. What someone may do still comes from owner, admin or member.
9. Profiles and servers only take real colours and pictures, never links to other websites, so nobody can track who looks at their profile.
10. A friend request is seen by the person you sent it to (who can accept or ignore it) and nobody else. You're friends once both of you have added each other.
11. Group DMs hold up to 10 people. You can only add your friends, the owner can remove people, and the last one out deletes the group.
12. Attachments and voice messages (up to 10 MB each) can only be fetched by the people in that DM, group or server, and only uploaded by their sender.
13. A call's private channel can only be joined by the people in that DM or group, or the members of that voice channel's server.
14. What you've read and what you've muted is yours alone.
15. Blocking someone stops them messaging you, calling you, starting a DM or sending a friend request, and ends your friendship. Only you can see who you blocked.
16. A server's admins add, rename and remove its emoji (up to 50) and stickers (up to 30, and more of both as the server's boost level goes up). Everyone signed in can see and use them.
17. Only the people who run Fluentdat make one-time links. Each link makes one account, then stops working. They also see what people report, and who reported it.
18. Anyone who may react where a message is can react to it (up to 20 different emoji a message), and anyone who can read it can join in with a reaction already there; only your own reactions come back off.
19. A server's admins give it a tag. Its members can wear it on their profile; nobody can wear a tag from a server they aren't in, and leaving takes it off.
20. Profile themes, name styles, banners and nameplates only take colours, pictures and names from Fluentdat's own lists, never web addresses.
21. A category can have its own permissions, like Discord's: for @everyone, for a role, or for one member, each allowed or denied (viewing its channels, sending, attaching, reacting, pinging @everyone, deleting others' messages, managing its channels or its permissions, making invites, joining its voice channels). A denial for @everyone gives way to a role that's allowed, and a member's own setting beats both. Owners and admins can always do everything. Making a category private (@everyone may not view it) hides its channels, their messages, files, unread counts and calls from everyone else. Whoever may manage a category's permissions can only allow or deny what they may do themselves.
22. A profile's Connections, Board widgets and recent games are seen by whoever can see the profile, and changed only by its owner. A connection is marked verified only when it's an account you sign in with (the database checks, and nobody can ask it about anyone else's). Game covers and logos are only ever the name of a picture on Wikipedia or Wikimedia Commons, a Steam number, or a small picture of your own, never a web address. What you say you're playing is timed by the database.
23. A server's events are seen by its members and made by its admins (and by its members, when the server allows it in Server Settings → Server Sidebar); whoever made one, or an admin, can change or cancel it, and everyone says for themselves whether they're interested. The Server Guide, the list of game servers and which sidebar extras show are set by the server's admins, and only take words, channel numbers and game servers' addresses, never web addresses.
24. Avatar decorations, name fonts, profile effects, frames and nameplates from the Shop are names from Fluentdat's own lists. Everything in the Shop costs Datbux (the database keeps the prices), and only someone who has a thing can wear it. What you already wore before there were prices stays yours. Quests are counted in your browser and the ones you finish are kept on your profile; a finished Quest's reward is yours without paying (the database checks the Quest is there). A nameplate you make yourself (a plain colour, two colours or your own picture) is free. A bundle costs what its things do one by one, less on the holiday it's made for (Valentine's Day, cherry blossom season, Halloween, the winter holidays: 25%) and on sale days (Black Friday to Cyber Monday, and December 26–31: 30% off every bundle), counted in UTC by the database; what you have already isn't paid for again, and only the database takes the Datbux.
25. Anyone who may send in a text channel can start a thread there, from a message (one thread a message) or on its own. A thread follows its channel's category permissions, so whoever can't see the channel can't see its threads, their messages or their files. Whoever started a thread, or whoever may manage the channel, renames, archives or deletes it, and a new message brings an archived thread back.
26. Whoever may delete others' messages in a channel (owners and admins always can) pins and unpins messages there. In a DM or a group, everyone in it can. A conversation holds up to 50 pinned messages, and everyone who can read it sees them.
27. Server Boosts cost 25 Datbux a day, paid ahead: 1 to 30 days at a time, up to 90 days ahead, and only the database takes the Datbux. A boost renews itself a day at a time while your Datbux last (you can turn that off), and one you stop ends at once, without the paid days back. Each member has one boost per server, and leaving the server stops it. Everyone in the server sees who boosts it. Two, seven and fourteen boosts make levels 1, 2 and 3, which hold more emoji (100, 150, 250) and stickers (45, 60, 90). A boost that ran out doesn't count.
28. You choose your own nickname in each server (up to 32 characters). Admins can change members' nicknames, and the owner anyone's.
29. In each server you choose whether its people can start a DM with you (Privacy Settings). Friends always can, and DMs you already have stay.
30. Search only finds messages you can read: in servers you're in, without private categories you can't see or their threads, and in your own DMs and groups.
31. A profile frame and a status bubble show to whoever can see your profile. A frame is a name from Fluentdat's own list, never a web address. A bubble is one line of up to 128 characters, and can end at a time you choose.
32. Badges (100, from Common to Legendary, and 10 secret ones) are counted by the database from what you've done: messages (not Flubot's), reactions, threads you started, friends, servers you're in, the biggest server you own, how long you've boosted, events, files you've sent, calls you've started, Quests, connections, games on your Board, Game Time, how much of your profile you've made your own, and your Datbux (tasks, the Shop, trades). Only people who can see your profile can ask for those counts. You choose the order your badges show in, and which to hide. Your profile keeps a log of when each badge came (the database writes the time a badge first shows up, and keeps it), which people who can see your profile see in its Collection, along with what you got from the Shop and when.
33. Game Time only grows when the database times a game you stopped or switched (up to 12 hours a game). Nobody can set it, not even you.
34. Datbux are kept by the database, and only it changes them: nobody can write to a wallet, what someone has, or a trade, not even their own. Everyone starts with 200. Tasks pay once a day, week (Monday to Sunday), month or year (in UTC), and only when the database counts that they're done. You see your own wallet, its history and your trades; whoever can see your profile sees what you have from the Shop.
35. You can send Datbux (1 to 100,000 at a time) or offer a trade only to someone you know, and not to someone either of you has blocked. A trade holds up to 100,000 Datbux and 10 things from the Shop each way, and you can only offer what you have. Nothing changes hands until they accept, and then everything swaps at once (it doesn't go through if either of you no longer has it). You can have up to 10 offers waiting.
36. A role can have an icon, chosen by the server's admins: an emoji, or a small picture of their own (never a web address). It shows beside the names of the people with that role.
37. Your settings (Customize: your theme, your themes, your layout and every part you changed) are kept with your account, so each device you sign in on has them. Only you can see or change yours, and they're at most 256 KB.
38. A server's rules (up to 25, a line each) are written by its admins in Server Guide, and everyone in the server can read them. Its admins can switch Boost, Shop and Rules in its sidebar on and off, as they can the rest.

## If something goes wrong

1. **Discord says “Invalid OAuth2 redirect_uri”**: the redirect in Discord (step 4.3) must be the Supabase callback URL exactly.
2. **You come back from Discord and Fluentdat says “Sign-in didn't finish”**: check the Site URL and Redirect URL in step 3.
3. **The email never arrives**: see the limits in step 6.
4. **Messages only show up after a reload**: in Supabase open **Realtime → Settings** and make sure **Allow public access** is on. Who can read what is still decided by the rules above.
5. **A call says it couldn't join its private channel**, or **files say they need the newest setup.sql**: run `setup.sql` again (step 2).
6. **Calls ring but never connect** for some people: their network needs a TURN server (step 8).
7. **“Invite Invalid” cards, or no Emoji and Stickers pages in Server Settings**: run `setup.sql` again (step 2).
8. **A username and password won't log in** although they're right: check that the Email provider is on (step 9).
9. **Customize says your settings follow your account “once supabase/setup.sql is run again”**, or a server's Rules can't be written: run `setup.sql` again (step 2).
10. **Boosting is still free, or the Shop has no nameplates or bundles**: run `setup.sql` again (step 2).
11. **Boosts run out while nobody's on**: turn on pg_cron (step 10).
12. **A profile's Collection has no times for badges**: run `setup.sql` again (step 2).
