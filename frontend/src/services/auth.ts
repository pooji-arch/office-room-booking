import { supabaseAuthService } from "./auth.supabase"
import type { AuthService } from "./types"

export const authService: AuthService = supabaseAuthService
