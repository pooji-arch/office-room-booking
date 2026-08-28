import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { AuthUser } from "@/types"
import { authService } from "@/services/auth"
import { supabase } from "@/services/supabaseClient"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  loginWithGoogle: (redirectTo: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function hydrate() {
    try {
      const me = await authService.me()
      setUser(me)
      return me
    } catch (err) {
      setUser(null)
      // "Not signed in." is the expected result of every plain page load
      // before any login has happened — silent. Anything else means a
      // session genuinely exists (e.g. a Google OAuth exchange just
      // succeeded) but loading the account failed for a real reason
      // (inactive status, profile fetch error) — that deserves to be seen
      // instead of just silently bouncing back to the login page.
      if (err instanceof Error && err.message !== "Not signed in.") {
        setTimeout(() => toast.error(err.message), 0)
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    hydrate()
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
      } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // INITIAL_SESSION is what actually fires right after an OAuth
        // redirect (Google sign-in) — it's the "just loaded, here's the
        // session Supabase found" event, distinct from SIGNED_IN. Both
        // happen asynchronously after mount, so the one-time hydrate() call
        // above can easily have already run and found nothing yet.
        hydrate()
      }
    })
    return () => subscription.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email: string, password: string) {
    const result = await authService.login(email, password)
    setUser(result.user)
    return result.user
  }

  async function loginWithGoogle(redirectTo: string) {
    await authService.loginWithGoogle(redirectTo)
  }

  async function logout() {
    await authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout, refresh: hydrate }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
