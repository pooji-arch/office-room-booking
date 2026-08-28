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

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

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
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  // Google sign-in redirects the whole browser away and back — by the time
  // we're back, `user` populates from the normal session-hydration path.
  // This effect is what actually completes the login for that flow.
  useEffect(() => {
    if (user) {
      navigate(user.role === "ADMIN" ? "/admin/rooms" : "/", { replace: true })
    }
  }, [user, navigate])

  // A rejected Google sign-in (e.g. no matching account) comes back as an
  // error on the redirect URL rather than a normal promise rejection, since
  // the whole page reloads through Google and back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search)
    const description = params.get("error_description")
    if (description) {
      toast.error(decodeURIComponent(description.replace(/\+/g, " ")))
      window.history.replaceState(null, "", window.location.pathname)
    }
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
