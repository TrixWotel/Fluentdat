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
16. A server's admins add, rename and remove its emoji (up to 50) and stickers (up to 30). Everyone signed in can see and use them.
17. Only the people who run Fluentdat make one-time links. Each link makes one account, then stops working. They also see what people report, and who reported it.
18. Anyone who may react where a message is can react to it (up to 20 different emoji a message), and anyone who can read it can join in with a reaction already there; only your own reactions come back off.
19. A server's admins give it a tag. Its members can wear it on their profile; nobody can wear a tag from a server they aren't in, and leaving takes it off.
20. Profile themes, name styles, banners and nameplates only take colours, pictures and names from Fluentdat's own lists, never web addresses.
21. A category can have its own permissions, like Discord's: for @everyone, for a role, or for one member, each allowed or denied (viewing its channels, sending, attaching, reacting, pinging @everyone, deleting others' messages, managing its channels or its permissions, making invites, joining its voice channels). A denial for @everyone gives way to a role that's allowed, and a member's own setting beats both. Owners and admins can always do everything. Making a category private (@everyone may not view it) hides its channels, their messages, files, unread counts and calls from everyone else. Whoever may manage a category's permissions can only allow or deny what they may do themselves.
22. A profile's Connections, Board widgets and recent games are seen by whoever can see the profile, and changed only by its owner. A connection is marked verified only when it's an account you sign in with (the database checks, and nobody can ask it about anyone else's). Game covers and logos are only ever a Steam number or the name of a picture on Wikimedia Commons, or a small picture of your own, never a web address. What you say you're playing is timed by the database.
23. A server's events are seen by its members and made by its admins (and by its members, when the server allows it in Server Settings → Server Sidebar); whoever made one, or an admin, can change or cancel it, and everyone says for themselves whether they're interested. The Server Guide, the list of game servers and which sidebar extras show are set by the server's admins, and only take words, channel numbers and game servers' addresses, never web addresses.
24. Avatar decorations and profile effects from the Shop are names from Fluentdat's own lists. Quests are counted in your browser and the ones you finish are kept on your profile; everything they unlock is free anyway.

## If something goes wrong

1. **Discord says “Invalid OAuth2 redirect_uri”**: the redirect in Discord (step 4.3) must be the Supabase callback URL exactly.
2. **You come back from Discord and Fluentdat says “Sign-in didn't finish”**: check the Site URL and Redirect URL in step 3.
3. **The email never arrives**: see the limits in step 6.
4. **Messages only show up after a reload**: in Supabase open **Realtime → Settings** and make sure **Allow public access** is on. Who can read what is still decided by the rules above.
5. **A call says it couldn't join its private channel**, or **files say they need the newest setup.sql**: run `setup.sql` again (step 2).
6. **Calls ring but never connect** for some people: their network needs a TURN server (step 8).
7. **“Invite Invalid” cards, or no Emoji and Stickers pages in Server Settings**: run `setup.sql` again (step 2).
8. **A username and password won't log in** although they're right: check that the Email provider is on (step 9).
