import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/services/supabaseClient"

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

// Read synchronously so the very first render already knows a Google
// redirect is being completed — without this, the page would render the
// full login form for one frame before the effect below has a chance to
// run, then jump straight to the signed-in app a moment later. That flash
// of the plain login form (right after what looked like a successful
// Google sign-in) reads as "did I just get logged out?" to a real user.
function hasOAuthCode() {
  return new URL(window.location.href).searchParams.has("code")
}

// Supabase Auth (GoTrue) never forwards a database trigger's actual
// RAISE EXCEPTION message to the client — any failure inserting a new
// auth.users row comes back as this same generic string regardless of what
// the trigger actually said. The only trigger that can reject an insert
// here is reject_unrecognized_oauth_signup() (see migration 0015), so this
// generic message always means exactly one thing in this app.
function friendlyOAuthError(message: string): string {
  if (message === "Database error saving new user") {
    return "No account found for this email. Contact your administrator."
  }
  return message
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.58-5.17 3.58-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}

export function LoginPage() {
  const { user, login, loginWithGoogle, refresh } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCompletingGoogleSignIn, setIsCompletingGoogleSignIn] = useState(hasOAuthCode)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  // Once `user` populates — either from a normal password login or from the
  // Google exchange below completing — send them where they belong.
  useEffect(() => {
    if (user) {
      navigate(user.role === "ADMIN" ? "/admin/rooms" : "/", { replace: true })
    }
  }, [user, navigate])

  // If someone starts the Google redirect and then hits the browser's Back
  // button before finishing (e.g. without picking an account), the browser
  // often restores this exact page from its back-forward cache instead of
  // reloading it — so isGoogleLoading is still stuck true from right before
  // they left, showing a permanent spinner with no way to retry. `pageshow`
  // with `persisted: true` is the signal that this happened.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setIsGoogleLoading(false)
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  // Google sign-in redirects the whole browser away and back with either a
  // `code` (success — still needs exchanging for a real session) or an
  // `error`/`error_description` (e.g. no matching account, rejected by the
  // database trigger). detectSessionInUrl is off specifically so this runs
  // explicitly and any failure is a real, awaited error we can show —
  // letting the SDK handle it silently was swallowing rejections with no
  // feedback at all.
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get("code")
    const errorDescription = url.searchParams.get("error_description") ?? url.searchParams.get("error")
    if (!code && !errorDescription) return

    window.history.replaceState(null, "", window.location.pathname)

    // This is the one place in the whole app where a toast fires on a
    // completely fresh page load, right as React is still mounting — every
    // other toast call happens later, from a user-initiated action, well
    // after Toaster has settled. Confirmed live: calling toast.error()
    // synchronously here was unreliable (sometimes it never appeared at
    // all), because it can race Toaster's own mount. Deferring to the next
    // tick reliably gives it time to be ready.
    if (errorDescription) {
      const message = decodeURIComponent(errorDescription.replace(/\+/g, " "))
      setTimeout(() => toast.error(friendlyOAuthError(message)), 0)
      return
    }

    setIsGoogleLoading(true)
    supabase.auth
      .exchangeCodeForSession(code!)
      .then(async ({ error }) => {
        if (error) {
          setIsCompletingGoogleSignIn(false)
          setTimeout(() => toast.error(error.message), 0)
          return
        }
        // The session is established here, but loading the account (profile
        // fetch, inactive-status check) happens inside refresh()/hydrate().
        // refresh() reports its own outcome so a failure there (which shows
        // its own toast) can drop back to the real form instead of leaving
        // "Signing you in…" on screen forever with no `user` ever arriving
        // to trigger the navigate-away effect above.
        const me = await refresh()
        if (!me) setIsCompletingGoogleSignIn(false)
      })
      .catch((err: unknown) => {
        setIsCompletingGoogleSignIn(false)
        setTimeout(
          () => toast.error(err instanceof Error ? err.message : "Google sign-in failed."),
          0
        )
      })
      .finally(() => setIsGoogleLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(values.email, values.password)
      toast.success(`Welcome back, ${loggedInUser.name.split(" ")[0]}`)
      navigate(loggedInUser.role === "ADMIN" ? "/admin/rooms" : "/", { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle(`${window.location.origin}/login`)
      // Browser navigates away to Google here — nothing else runs.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed")
      setIsGoogleLoading(false)
    }
  }

  if (isCompletingGoogleSignIn) {
    return (
      <Card className="shadow-xl shadow-black/5 ring-1 ring-foreground/10 dark:shadow-black/30">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl shadow-black/5 ring-1 ring-foreground/10 dark:shadow-black/30">
      <CardHeader>
        <CardTitle className="text-xl">Sign in to MMS</CardTitle>
        <CardDescription>
          Meetings, minutes, and action items — in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isGoogleLoading}
          onClick={handleGoogleSignIn}
        >
          {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@roombook.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
