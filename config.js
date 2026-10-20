// Fluentdat's Supabase project, for signing in with Discord, GitHub or email (see supabase/SETUP.md).
// Both values are meant to be public: the publishable key can only do what the database's row level security
// rules allow (supabase/setup.sql). Leave them empty and those sign-in buttons stay hidden.
// Never put the secret key (sb_secret_...), the service_role key or the database password here.
export const SUPABASE = {
  url: 'https://lzrqlcmpvpysvulmwyfe.supabase.co',              // Connect (top of the project) → Project URL
  anonKey: 'sb_publishable_adD0CBzLdeZGDYtAyVkomg_fRxfHlJ2',    // Connect → Publishable key (never a sb_secret_ one)
};
