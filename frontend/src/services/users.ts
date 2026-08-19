import { supabaseUsersService } from "./users.supabase"
import type { UsersService } from "./types"

export const usersService: UsersService = supabaseUsersService
