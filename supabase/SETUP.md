# Turning on sign-in (Supabase)

Fluentdat's **Continue with Discord**, **Continue with GitHub** and **email** sign-in run on a free Supabase project. You set it up once, in about 15 minutes. Until then the app works as before: everything stays in your browser, or you sign in with a GitHub token.

## 1. Make the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (Continue with GitHub works).
2. **New project**: name it `fluentdat` and pick a region near you. Set a database password and keep it in your password manager. Fluentdat never needs it.
3. Wait a minute or two while it sets up.

## 2. Make the database

1. In the project, open **SQL Editor** and click **New query**.
2. Paste all of [`setup.sql`](setup.sql) and click **Run**. It should finish with “Success. No rows returned”.

This makes the tables and the rules that decide who can read what. It's safe to run again after an update, because it replaces what it made before.

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

## If something goes wrong

1. **Discord says “Invalid OAuth2 redirect_uri”**: the redirect in Discord (step 4.3) must be the Supabase callback URL exactly.
2. **You come back from Discord and Fluentdat says “Sign-in didn't finish”**: check the Site URL and Redirect URL in step 3.
3. **The email never arrives**: see the limits in step 6.
4. **Messages only show up after a reload**: in Supabase open **Realtime → Settings** and make sure **Allow public access** is on. Who can read what is still decided by the rules above.
