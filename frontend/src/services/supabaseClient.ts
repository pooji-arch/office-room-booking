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
//
// flowType is forced to "pkce" because this library's own default is
// "implicit" — under implicit flow, Google hands back the session as
// #access_token=... in the URL hash fragment, never as a ?code= query
// param, so exchangeCodeForSession (which only ever looks for a code) would
// silently never fire on a real, successful sign-in. PKCE is what actually
// delivers the ?code= param LoginPage's redirect handler expects.
export const supabase = createClient(url, anonKey, {
  auth: { detectSessionInUrl: false, flowType: "pkce" },
})
