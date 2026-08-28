import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
}

// detectSessionInUrl is off on purpose: its automatic handling of an OAuth
// redirect swallows failures silently (a rejected Google sign-in — e.g. no
// matching account — just leaves the page sitting there with no error ever
// surfaced anywhere in the app). LoginPage handles the redirect explicitly
// instead, via exchangeCodeForSession, so a failure is a real awaited error.
export const supabase = createClient(url, anonKey, {
  auth: { detectSessionInUrl: false },
})
