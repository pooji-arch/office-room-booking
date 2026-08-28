import { supabase } from "./supabaseClient"
import type { AuthUser } from "@/types"
import type { AuthService } from "./types"

interface ProfileRow {
  id: string
  name: string
  email: string
  role: "ADMIN" | "USER"
  status: "ACTIVE" | "INACTIVE"
  employee_id: string | null
  department: string | null
  phone: string | null
  must_change_password: boolean
  created_at: string
}

function mapProfile(row: ProfileRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    employeeId: row.employee_id ?? undefined,
    department: row.department ?? undefined,
    phone: row.phone ?? undefined,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
  }
}

async function fetchProfile(userId: string): Promise<AuthUser> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
  if (error || !data) throw new Error("Could not load your profile.")
  return mapProfile(data as ProfileRow)
}

export const supabaseAuthService: AuthService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session || !data.user) {
      throw new Error(
        error?.message === "Invalid login credentials"
          ? "Invalid email or password."
          : (error?.message ?? "Sign in failed.")
      )
    }
    const user = await fetchProfile(data.user.id)
    if (user.status === "INACTIVE") {
      await supabase.auth.signOut()
      throw new Error("Your account is inactive. Contact an administrator.")
    }
    return { token: data.session.access_token, user }
  },

  async loginWithGoogle(redirectTo) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) throw new Error(error.message)
  },

  async logout() {
    await supabase.auth.signOut()
  },

  async me() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error("Not signed in.")
    const user = await fetchProfile(session.user.id)
    if (user.status === "INACTIVE") {
      await supabase.auth.signOut()
      throw new Error("Your account is inactive. Contact an administrator.")
    }
    return user
  },

  async changePassword({ currentPassword, newPassword }) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user.email) throw new Error("Not signed in.")

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    })
    if (verifyError) throw new Error("Current password is incorrect.")

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)

    await supabase.from("profiles").update({ must_change_password: false }).eq("id", session.user.id)
  },
}
