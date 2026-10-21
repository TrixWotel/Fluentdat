// Fluentdat's Supabase project, for signing in with Discord, GitHub or email (see supabase/SETUP.md).
// Both values are meant to be public: the publishable key can only do what the database's row level security
// rules allow (supabase/setup.sql). Leave them empty and those sign-in buttons stay hidden.
// Never put the secret key (sb_secret_...), the service_role key or the database password here.
export const SUPABASE = {
  url: 'https://lzrqlcmpvpysvulmwyfe.supabase.co',              // Connect (top of the project) → Project URL
  anonKey: 'sb_publishable_adD0CBzLdeZGDYtAyVkomg_fRxfHlJ2',    // Connect → Publishable key (never a sb_secret_ one)
};

// Calls go straight from browser to browser. These public STUN servers help two browsers find each other through home
// routers. Some networks (many schools and offices) also need a TURN server, which passes the call along: if calls
// connect for some people but not others, add one here, like
//   { urls: 'turn:turn.example.com:3478', username: '…', credential: '…' }
// (see supabase/SETUP.md, "Calls"). A TURN login here is public, so use one meant for that (most services limit it).
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
